#!/bin/bash
# DUAL-ROLE DEMO: HKTaxi (alice) consumes HKU's published research asset.
# Combined with earlier HKU-as-consumer registration, this shows HKU acting
# in BOTH roles in the dataspace -- satisfying the Part 2 "dual role" requirement.

set -uo pipefail
API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
HKU_DSP="http://hku-controlplane:8082/api/dsp"
HKU_DID="did:web:hku-identityhub%3A7083:hku"

OUT=/Users/lichudikang/MVD/final/screenshots
bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "DUAL-1: HKTaxi (alice) requests catalog from HKU (HKU acting as PROVIDER)"
CAT=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$HKU_DSP\",
  \"counterPartyId\": \"$HKU_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
echo "$CAT" | jq '{participantId: .["dspace:participantId"], assets: [(.["dcat:dataset"] | if type=="array" then .[].["@id"] else .["@id"] end)]}' | tee "$OUT/13a-hku-as-provider-catalog.json"
PID=$(echo "$CAT" | jq -r '.["dcat:dataset"] | (if type=="array" then .[0] else . end) | .["@id"]')
OFFER=$(echo "$CAT" | jq -r '.["dcat:dataset"] | (if type=="array" then .[0] else . end) | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')
echo "Asset: $PID"
echo "Offer: $OFFER"

if [[ -z "$PID" || "$PID" == "null" ]]; then
  echo "ERROR: HKU catalog returned no assets - check seed-hku-as-provider.sh"
  echo "Raw response: $CAT" | head -c 800
  exit 2
fi

bold "DUAL-2: HKTaxi negotiates contract with HKU"
NEG=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$HKU_DSP\",
  \"counterPartyId\": \"$HKU_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\", \"@id\": \"$OFFER\",
    \"assigner\": \"$HKU_DID\", \"target\": \"$PID\",
    \"permission\": [{
      \"action\": \"use\",
      \"constraint\": {
        \"leftOperand\": \"MembershipCredential\",
        \"operator\": \"eq\",
        \"rightOperand\": \"active\"
      }
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
echo "Negotiation @id: $NEG_ID"

AGREEMENT=""
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  J=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "FINALIZED" ]]; then
    AGREEMENT=$(echo "$J" | jq -r '.contractAgreementId')
    echo "$J" | jq '{state, contractAgreementId}' | tee "$OUT/13b-alice-hku-negotiation.json"
    break
  fi
  if [[ "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}' | tee "$OUT/13b-alice-hku-negotiation.json"
    exit 3
  fi
  sleep 2
done

[[ -z "$AGREEMENT" ]] && { echo "did not finalize"; exit 4; }

bold "DUAL-3: Initiate transfer (PULL via EDR)"
TX=$(curl_mgmt -X POST "$CONSUMER_MGMT/transferprocesses" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"assetId\": \"$PID\",
  \"counterPartyAddress\": \"$HKU_DSP\",
  \"connectorId\": \"$HKU_DID\",
  \"contractId\": \"$AGREEMENT\",
  \"dataDestination\": {\"type\": \"HttpProxy\"},
  \"protocol\": \"dataspace-protocol-http\",
  \"transferType\": \"HttpData-PULL\"
}")
TX_ID=$(echo "$TX" | jq -r '.["@id"]')
echo "Transfer @id: $TX_ID"

for i in 1 2 3 4 5 6 7 8 9 10; do
  T=$(curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TX_ID")
  TS=$(echo "$T" | jq -r '.state')
  echo "  [$((i*2))s] state=$TS"
  [[ "$TS" == "STARTED" ]] && break
  sleep 2
done

bold "DUAL-4: Fetch EDR + pull HKU's research data"
EDR=$(curl_mgmt "$CONSUMER_MGMT/edrs/$TX_ID/dataaddress")
echo "$EDR" | jq | tee "$OUT/13c-alice-hku-edr.json"
EDR_EP=$(echo "$EDR" | jq -r '.endpoint')
EDR_TOK=$(echo "$EDR" | jq -r '.authorization')
PUB_URL=$(echo "$EDR_EP" | sed 's|http://hku-dataplane:11002|http://127.0.0.1/hku/public|')
echo "Pulling: $PUB_URL"
RES=$(curl -sS -H "Authorization: $EDR_TOK" "$PUB_URL")
echo "$RES" | jq '{url, headers: .headers, args: .args}' | tee "$OUT/13d-hku-research-data.json"

bold "DUAL DONE - HKU acted as PROVIDER successfully (alice consumed HKU asset)"
