#!/bin/bash
# Demo of custom Java-implemented ODRL constraint: ParticipantTier
#
# Asset:  hk-academic-research-archive (on provider-manufacturing)
# Policy: ParticipantTier eq ACADEMIC
# Test:   HKTaxi (alice DID -> COMMERCIAL tier) tries to negotiate -> expect TERMINATED
#         (proves the custom Java constraint is in the policy-engine path)

set -uo pipefail
API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_MFG_DSP="http://provider-manufacturing-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/screenshots"
mkdir -p "$OUT"
bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "CC-1: Catalog request from HKTaxi (alice, tier=COMMERCIAL)"
CAT=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
echo "$CAT" | jq '[.["dcat:dataset"][] | select(.["@id"]=="hk-academic-research-archive")] | .[0] | {asset_id: .["@id"], description: .description, policy_id: (.["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]), constraint: (.["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["odrl:permission"] | (if type=="array" then .[0] else . end) | .["odrl:constraint"])}'

PID=$(echo "$CAT" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="hk-academic-research-archive") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')

bold "CC-2: Initiate negotiation (expect TERMINATED via ParticipantTier rejection)"
NEG=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\", \"@id\": \"$PID\",
    \"assigner\": \"$PROVIDER_DID\", \"target\": \"hk-academic-research-archive\",
    \"permission\": [{
      \"action\": \"use\",
      \"constraint\": {
        \"leftOperand\": \"ParticipantTier\",
        \"operator\": \"eq\",
        \"rightOperand\": \"ACADEMIC\"
      }
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
echo "Negotiation @id: $NEG_ID"

bold "CC-3: Poll negotiation state"
for i in 1 2 3 4 5 6 7 8 9 10; do
  J=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "TERMINATED" || "$ST" == "FINALIZED" ]]; then
    echo "$J" | jq '{state, errorDetail}' | tee "$OUT/15-custom-constraint-rejection.json"
    break
  fi
  sleep 2
done

bold "CC DONE - inspect Step CC-3 output above"
echo "Expected:    state=TERMINATED with errorDetail mentioning ParticipantTier or policy not fulfilled"
echo "Source code: extensions/dcp-impl/src/main/java/.../ParticipantTierFunction.java"
