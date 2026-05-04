#!/bin/bash
# Re-creates HKU's participant context with the correct base64-encoded
# DID in the CredentialService URL (was wrongly set to base64("hku-identityhub")).
set -uo pipefail
SUPER="c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo="
HKU_DID="did:web:hku-identityhub%3A7083:hku"
HKU_DID_B64=$(echo -n "$HKU_DID" | base64)
HKU_DID_B64_URL="${HKU_DID_B64//+/-}"; HKU_DID_B64_URL="${HKU_DID_B64_URL//\//_}"; HKU_DID_B64_URL="${HKU_DID_B64_URL//=/}"

# Delete existing participant (if any)
echo "==> DELETE old HKU participant context"
curl -sS -w '\nHTTP %{http_code}\n' \
  -X DELETE "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/$HKU_DID_B64_URL" \
  -H "x-api-key: $SUPER" || true

sleep 2

# Recreate with correct serviceEndpoint base64
echo
echo "==> POST new HKU participant context with correct CredentialService URL"
DATA=$(jq -n --arg did "$HKU_DID" --arg b64 "$HKU_DID_B64" '{
  "roles": ["academic"],
  "serviceEndpoints": [
    {
      "type": "CredentialService",
      "serviceEndpoint": "http://hku-identityhub:7082/api/credentials/v1/participants/\($b64)",
      "id": "hku-credentialservice-1"
    },
    {
      "type": "ProtocolEndpoint",
      "serviceEndpoint": "http://hku-controlplane:8082/api/dsp",
      "id": "hku-dsp"
    }
  ],
  "active": true,
  "participantId": $did,
  "did": $did,
  "key": {
    "keyId": "\($did)#key-1",
    "privateKeyAlias": "\($did)#key-1",
    "keyGeneratorParams": { "algorithm": "EC" }
  }
}')
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $SUPER" \
  -d "$DATA"
