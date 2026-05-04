#!/bin/bash
# Demonstrates live (DCP) credential issuance to HKU.
#
#   - Snapshot HKU's wallet (it already has 2 preloaded VCs from configmap)
#   - HKU sends a CredentialRequest to the dataspace issuer:
#       POST /api/identity/v1alpha/participants/<HKU>/credentials/request
#   - The HKU identityhub drives the DCP state machine
#       CREATED -> REQUESTING -> REQUESTED -> ISSUED
#   - The issuer evaluates an attestation source (Postgres lookup), signs
#     a fresh JWT VC, and pushes it to HKU's wallet
#   - HKU's wallet now contains a brand-new VC with today's issuanceDate
#
# This closes the "no live issuance" gap noted earlier: the new VC was
# never preloaded into a configmap, the issuer signed it on demand.

set -uo pipefail
SUPER="c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo="
HKU_DID="did:web:hku-identityhub%3A7083:hku"
HKU_B64=$(echo -n "$HKU_DID" | base64)
ISSUER_DID="did:web:dataspace-issuer-service%3A10016:issuer"
HOLDER_PID="hku-live-$(date +%s)"
OUT="/Users/lichudikang/MVD/final/screenshots"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }

bold "LIVE-1: HKU wallet BEFORE the request"
BEFORE=$(curl -sS -H "x-api-key: $SUPER" "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/$HKU_B64/credentials")
echo "$BEFORE" | jq '[.[] | {type: .verifiableCredential.credential.type, issuanceDate: .verifiableCredential.credential.issuanceDate}]'
BEFORE_COUNT=$(echo "$BEFORE" | jq 'length')
echo "wallet size BEFORE: $BEFORE_COUNT"

bold "LIVE-2: HKU initiates DCP credential request"
echo "POST .../participants/<HKU base64>/credentials/request"
echo "  issuer DID: $ISSUER_DID"
echo "  request id: $HOLDER_PID"
echo "  asking for: FoobarCredential (def: demo-credential-def-2)"
RESP=$(curl -sS -w "\nHTTP %{http_code}" -H "x-api-key: $SUPER" -H 'Content-Type: application/json' \
  -X POST "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/$HKU_B64/credentials/request" \
  -d "{\"issuerDid\":\"$ISSUER_DID\",\"holderPid\":\"$HOLDER_PID\",\"credentials\":[{\"format\":\"VC1_0_JWT\",\"type\":\"FoobarCredential\",\"id\":\"demo-credential-def-2\"}]}")
echo "$RESP"

bold "LIVE-3: DCP state machine on HKU's identityhub (live tail)"
HPOD=$(kubectl get pod -n mvd | grep hku-identityhub | awk '{print $1}')
for i in 1 2 3 4 5 6 7 8 9 10; do
  STATES=$(kubectl logs -n mvd "$HPOD" --since=30s 2>&1 | grep "$HOLDER_PID" | grep -oE 'state [A-Z]+' | sort -u | tr '\n' ',' )
  echo "  [$((i*2))s] states observed: $STATES"
  if echo "$STATES" | grep -q "ISSUED"; then break; fi
  sleep 2
done

bold "LIVE-4: HKU wallet AFTER the request"
AFTER=$(curl -sS -H "x-api-key: $SUPER" "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/$HKU_B64/credentials")
echo "$AFTER" | jq '[.[] | {type: .verifiableCredential.credential.type, issuanceDate: .verifiableCredential.credential.issuanceDate, holder: .holderId}]'
AFTER_COUNT=$(echo "$AFTER" | jq 'length')
echo "wallet size AFTER: $AFTER_COUNT  (delta: $((AFTER_COUNT - BEFORE_COUNT)))"

bold "LIVE-5: Decode the freshly-issued JWT to confirm it is signed NOW"
NEW_JWT=$(echo "$AFTER" | jq -r '[.[] | select(.verifiableCredential.credential.type|index("FoobarCredential"))][-1].verifiableCredential.rawVc')
PAYLOAD=$(echo "$NEW_JWT" | cut -d. -f2)
PAD=$(printf '%s' "$PAYLOAD" | awk '{n=length($0)%4; if(n>0) printf "%s%.*s", $0, 4-n, "===="; else print $0}')
PAYLOAD_NORM=$(echo "$PAD" | tr '_-' '/+')
echo "$PAYLOAD_NORM" | base64 -d 2>/dev/null | jq '{iss, sub, aud, iat, vc_type: .vc.type}'

bold "LIVE-6: Save evidence"
{
  echo "=== HKU wallet BEFORE ==="
  echo "$BEFORE" | jq '[.[] | {type: .verifiableCredential.credential.type, issuanceDate: .verifiableCredential.credential.issuanceDate}]'
  echo
  echo "=== HKU wallet AFTER ==="
  echo "$AFTER" | jq '[.[] | {type: .verifiableCredential.credential.type, issuanceDate: .verifiableCredential.credential.issuanceDate}]'
  echo
  echo "=== State machine (HKU identityhub log) ==="
  kubectl logs -n mvd "$HPOD" --since=2m 2>&1 | grep "$HOLDER_PID" | tail -10
  echo
  echo "=== Decoded fresh JWT payload ==="
  echo "$PAYLOAD_NORM" | base64 -d 2>/dev/null | jq '{iss, sub, aud, iat, vc_type: .vc.type, vc_credentialSubject: .vc.credentialSubject}'
} | tee "$OUT/24-live-credential-issuance.txt"

bold "LIVE DONE - HKU received a credential signed at $(date -Iseconds)"
echo "All preloaded VCs have issuanceDate=2023-12-12; this new one has today's date."
