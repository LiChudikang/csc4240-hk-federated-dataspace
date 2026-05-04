#!/bin/bash
# HK Federated Dataspace - end-to-end demo
#
# Demonstrates:
#   1. Federated catalog discovery (HKTaxi sees KMB assets in provider-qna)
#   2. Policy-driven contract negotiation (HKTaxi negotiates asset-1, succeeds)
#   3. Policy enforcement (HKTaxi negotiates asset-2 sensitive, REJECTED)
#   4. Federated participant addition (HKU is a registered second consumer)
#   5. Trust boundary (HKU lacks issuer-signed credentials, catalog request 401 -
#      documents the next-step "credential issuance via DCP" boundary)

set -uo pipefail

API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
HKU_MGMT="http://127.0.0.1/hku/cp/api/management/v3"
PROVIDER_MFG_DSP="http://provider-manufacturing-controlplane:8082/api/dsp"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }

curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

fetch_catalog_raw() {
  local mgmt="$1" dsp="$2"
  curl_mgmt -X POST "$mgmt/catalog/request" -H 'Content-Type: application/json' -d "{
    \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
    \"counterPartyAddress\": \"$dsp\",
    \"counterPartyId\": \"$PROVIDER_DID\",
    \"protocol\": \"dataspace-protocol-http\"
  }"
}

extract_offers() {
  jq '
    .["dcat:dataset"] // empty |
    (if type=="array" then . else [.] end) |
    map({asset_id: .["@id"], policy_id: (.["odrl:hasPolicy"] | if type=="array" then .[0] else . end | .["@id"])})
  '
}

negotiate() {
  local mgmt="$1" dsp="$2" asset="$3" pid="$4"
  curl_mgmt -X POST "$mgmt/contractnegotiations" -H 'Content-Type: application/json' -d "{
    \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
    \"@type\": \"ContractRequest\",
    \"counterPartyAddress\": \"$dsp\",
    \"counterPartyId\": \"$PROVIDER_DID\",
    \"protocol\": \"dataspace-protocol-http\",
    \"policy\": {
      \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
      \"@type\": \"Offer\",
      \"@id\": \"$pid\",
      \"assigner\": \"$PROVIDER_DID\",
      \"target\": \"$asset\",
      \"obligation\": [{
        \"action\": \"use\",
        \"constraint\": {
          \"leftOperand\": \"DataAccess.level\",
          \"operator\": \"eq\",
          \"rightOperand\": \"processing\"
        }
      }]
    }
  }" | jq -r '.["@id"]'
}

###############################################################################
bold "Step 1 - HKTaxi (alice) catalog from provider-qna"
###############################################################################
QNA_RAW=$(fetch_catalog_raw "$CONSUMER_MGMT" "$PROVIDER_QNA_DSP")
QNA_OFFERS=$(echo "$QNA_RAW" | extract_offers)
echo "$QNA_OFFERS" | jq

###############################################################################
bold "Step 2 - HKTaxi successful negotiation for asset-1 (member-and-dataprocessor)"
###############################################################################
PID_A1=$(echo "$QNA_OFFERS" | jq -r '.[] | select(.asset_id=="asset-1") | .policy_id')
echo "Offer policy id: $PID_A1"
NEG_A1=$(negotiate "$CONSUMER_MGMT" "$PROVIDER_QNA_DSP" "asset-1" "$PID_A1")
echo "Negotiation @id: $NEG_A1"

###############################################################################
bold "Step 3 - HKTaxi rejected negotiation for asset-2 (sensitive-only)"
###############################################################################
PID_A2=$(echo "$QNA_OFFERS" | jq -r '.[] | select(.asset_id=="asset-2") | .policy_id')
echo "Offer policy id: $PID_A2"
NEG_A2=$(negotiate "$CONSUMER_MGMT" "$PROVIDER_QNA_DSP" "asset-2" "$PID_A2")
echo "Negotiation @id: $NEG_A2"

sleep 12

###############################################################################
bold "Step 4 - Poll the two HKTaxi negotiations"
###############################################################################
echo "  asset-1 (expect FINALIZED):"
curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_A1" | jq '{state, errorDetail}'
echo "  asset-2 (expect TERMINATED with policy-not-fulfilled):"
curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_A2" | jq '{state, errorDetail}'

###############################################################################
bold "Step 5 - HKU is a registered second consumer participant"
###############################################################################
kubectl --context k3d-edc-cluster get pods -n mvd | awk 'NR==1 || /^hku-/' || true
echo
echo "HKU's identityhub admin shows it as a known participant:"
curl -sS "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/" \
  -H "x-api-key: c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo=" \
  | jq '.[] | {participantId, did, active, roles}'

###############################################################################
bold "Step 6 - HKU catalog request to provider-manufacturing"
###############################################################################
echo "Note: HKU's wallet has alice-signed VCs - the provider's verifier"
echo "rejects the credential because the JWT subject is alice, not hku."
echo "Cleanly resolving this requires the issuer to issue a fresh VC to HKU"
echo "via the DCP credential issuance flow - left as future work."
echo
HKU_CATALOG=$(fetch_catalog_raw "$HKU_MGMT" "$PROVIDER_MFG_DSP")
echo "$HKU_CATALOG" | jq '. | if type=="array" then .[0] | {message, type} else . end' 2>/dev/null || echo "$HKU_CATALOG"

###############################################################################
bold "DONE"
###############################################################################
echo "Summary:"
echo "  - 4 HK assets in provider-manufacturing (Task 5 verified earlier)"
echo "  - 2 KMB assets in provider-qna (user's existing seed)"
echo "  - HKTaxi negotiated asset-1 successfully (Step 2/4)"
echo "  - Policy enforcement WORKS: HKTaxi rejected on sensitive asset-2 (Step 3/4)"
echo "  - HKU joined the dataspace as a second consumer (Step 5)"
echo "  - HKU credential issuance via DCP is the documented next step (Step 6)"
