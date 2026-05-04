#!/bin/bash
# Captures all PPT-grade screenshots into final/screenshots/
# Run order: ./demo-l2-transfer.sh first, then this script for the rest.

set -uo pipefail

API_KEY="password"
SUPER_KEY="c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo="
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
HKU_MGMT="http://127.0.0.1/hku/cp/api/management/v3"
PROVIDER_MFG_DSP="http://provider-manufacturing-controlplane:8082/api/dsp"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"

OUT="/Users/lichudikang/MVD/final/screenshots"
mkdir -p "$OUT"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

#-------------------------------------------------------------------
bold "Capture 06: Cluster pod inventory (21 pods)"
#-------------------------------------------------------------------
kubectl --context k3d-edc-cluster get pods -n mvd \
  -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[*].ready,STATUS:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount,AGE:.metadata.creationTimestamp \
  | tee "$OUT/06-cluster-pods.txt"

#-------------------------------------------------------------------
bold "Capture 07: 4 HK assets in provider-manufacturing"
#-------------------------------------------------------------------
curl -sS -X POST 'http://127.0.0.1/provider-manufacturing/cp/api/management/v3/assets/request' \
  -H 'Content-Type: application/json' -H "X-Api-Key: $API_KEY" \
  -d '{"@context":["https://w3id.org/edc/connector/management/v0.0.1"],"@type":"QuerySpec"}' \
  | jq '[.[] | {asset_id: .["@id"], description: .properties.description, baseUrl: .dataAddress.baseUrl}]' \
  | tee "$OUT/07-hk-assets.json"

#-------------------------------------------------------------------
bold "Capture 08: Policy enforcement - HKTaxi rejected on sensitive asset-2"
#-------------------------------------------------------------------
CATALOG=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
PID2=$(echo "$CATALOG" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="asset-2") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')

NEG2=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\",
    \"@id\": \"$PID2\",
    \"assigner\": \"$PROVIDER_DID\",
    \"target\": \"asset-2\",
    \"obligation\": [{
      \"action\": \"use\",
      \"constraint\": {\"leftOperand\": \"DataAccess.level\", \"operator\": \"eq\", \"rightOperand\": \"processing\"}
    }]
  }
}")
NEG2_ID=$(echo "$NEG2" | jq -r '.["@id"]')
echo "Waiting 8s for negotiation to settle..."
sleep 8

curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG2_ID" \
  | jq '{negotiationId: .["@id"], state, errorDetail}' \
  | tee "$OUT/08-policy-rejection.json"

#-------------------------------------------------------------------
bold "Capture 09: HKU as registered participant"
#-------------------------------------------------------------------
echo "HKU pods (subset):"
kubectl --context k3d-edc-cluster get pods -n mvd | awk 'NR==1 || /^hku-/' | tee "$OUT/09a-hku-pods.txt"

echo
echo "HKU identityhub registered participants:"
curl -sS "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/" \
  -H "x-api-key: $SUPER_KEY" \
  | jq '[.[] | {participantContextId, did, roles}]' \
  | tee "$OUT/09b-hku-identityhub-participants.json"

#-------------------------------------------------------------------
bold "Capture 10: HKU known to issuer as a holder"
#-------------------------------------------------------------------
curl -sS 'http://127.0.0.1/issuer/ad/api/admin/v1alpha/participants/ZGlkOndlYjpsb2NhbGhvc3QlM0ExMDEwMA==/holders/query' \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $SUPER_KEY" \
  -d '{}' \
  | jq '[.[] | {holderId, did, holderName: (.holderName // .name)}]' \
  | tee "$OUT/10-issuer-holders.json"

#-------------------------------------------------------------------
bold "DONE"
#-------------------------------------------------------------------
ls -la "$OUT/"
