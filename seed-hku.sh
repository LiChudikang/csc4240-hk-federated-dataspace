#!/bin/bash
# Registers HKU as a participant in its own IdentityHub and as a holder in the issuer.
# Prereq: seed-k8s.sh has succeeded and hku-* pods are Ready.

set -uo pipefail
API_KEY="c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo="

HKU_DID="did:web:hku-identityhub%3A7083:hku"
HKU_CONTROLPLANE="http://hku-controlplane:8082"
HKU_IDENTITYHUB_INTERNAL="http://hku-identityhub:7082"

# Step 1: Create HKU participant in HKU's identityhub
echo "==> Creating HKU participant in hku-identityhub"
DATA_HKU=$(jq -n --arg did "$HKU_DID" --arg cp "$HKU_CONTROLPLANE" --arg ih "$HKU_IDENTITYHUB_INTERNAL" '{
  "roles": ["academic"],
  "serviceEndpoints": [
    {
      "type": "CredentialService",
      "serviceEndpoint": "\($ih)/api/credentials/v1/participants/aGt1LWlkZW50aXR5aHVi",
      "id": "hku-credentialservice-1"
    },
    {
      "type": "ProtocolEndpoint",
      "serviceEndpoint": "\($cp)/api/dsp",
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
  -H "x-api-key: $API_KEY" \
  -d "$DATA_HKU"

# Step 2: Register HKU as a holder in the central issuer
echo
echo "==> Registering HKU as holder in dataspace-issuer"
DATA_HOLDER=$(jq -n --arg did "$HKU_DID" '{
  "holderId": $did,
  "name": "HKU Transport Lab",
  "did": $did
}')
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST 'http://127.0.0.1/issuer/ad/api/admin/v1alpha/participants/ZGlkOndlYjpsb2NhbGhvc3QlM0ExMDEwMA==/holders' \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -d "$DATA_HOLDER"


# Step 3: Seed HKU into the issuer Postgres' membership_attestations table.
# Without this row, AttestationPipelineImpl.evaluate() returns null when HKU
# requests a credential, NPE-ing inside the issuer. The upstream issuer.tf
# only seeds consumer (membership_type=1) and provider (=2); we add HKU as 3.
echo
echo "==> Seeding HKU into issuer-postgres membership_attestations"
ISSUER_PG_POD=$(kubectl get pod -n mvd 2>/dev/null | awk '/issuer-postgres/ {print $1; exit}')
if [[ -z "$ISSUER_PG_POD" ]]; then
  echo "WARNING: issuer-postgres pod not found in namespace mvd; skipping HKU attestation seed."
else
  kubectl exec -n mvd "$ISSUER_PG_POD" -- psql -U issuer -d issuer -c \
    "INSERT INTO membership_attestations (membership_type, holder_id) VALUES (3, 'did:web:hku-identityhub%3A7083:hku') ON CONFLICT (holder_id) DO NOTHING;"
fi

echo
echo "=== HKU registration complete ==="
