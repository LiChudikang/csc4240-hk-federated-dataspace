#!/bin/bash
# L2 demo: HKTaxi (alice) does the FULL EDC flow on KMB Bus Routes:
#   catalog -> negotiation -> contract agreement -> transfer -> EDR -> real data
#
# Outputs are saved to final/screenshots/ as text files for the PPT.

set -uo pipefail

API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/screenshots"
mkdir -p "$OUT_DIR"
mkdir -p "$OUT_DIR"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }

curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

#-------------------------------------------------------------------
bold "L2-Step 1: HKTaxi catalog from provider-qna"
#-------------------------------------------------------------------
CATALOG=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
echo "$CATALOG" | jq '{participantId: .["dspace:participantId"], dataset_count: (.["dcat:dataset"] | length), assets: [.["dcat:dataset"][] | .["@id"]]}' | tee "$OUT_DIR/01-catalog.json"

OFFER_PID=$(echo "$CATALOG" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="asset-1") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')
echo "Offer policy id for asset-1: $OFFER_PID"

#-------------------------------------------------------------------
bold "L2-Step 2: Negotiate contract for asset-1 (KMB Bus Routes)"
#-------------------------------------------------------------------
NEG=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\",
    \"@id\": \"$OFFER_PID\",
    \"assigner\": \"$PROVIDER_DID\",
    \"target\": \"asset-1\",
    \"obligation\": [{
      \"action\": \"use\",
      \"constraint\": {
        \"leftOperand\": \"DataAccess.level\",
        \"operator\": \"eq\",
        \"rightOperand\": \"processing\"
      }
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
echo "Negotiation id: $NEG_ID"

#-------------------------------------------------------------------
bold "L2-Step 3: Wait for negotiation FINALIZED, extract contractAgreementId"
#-------------------------------------------------------------------
AGREEMENT_ID=""
for i in $(seq 1 30); do
  STATUS_JSON=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_ID")
  STATE=$(echo "$STATUS_JSON" | jq -r '.state')
  printf "  [%2ds] state=%s\n" "$((i*2))" "$STATE"
  if [[ "$STATE" == "FINALIZED" ]]; then
    AGREEMENT_ID=$(echo "$STATUS_JSON" | jq -r '.contractAgreementId')
    echo "$STATUS_JSON" | jq '{state, contractAgreementId}' | tee "$OUT_DIR/02-negotiation-finalized.json"
    break
  fi
  if [[ "$STATE" == "TERMINATED" ]]; then
    echo "$STATUS_JSON" | jq '{state, errorDetail}'
    exit 2
  fi
  sleep 2
done

if [[ -z "$AGREEMENT_ID" || "$AGREEMENT_ID" == "null" ]]; then
  echo "ERROR: did not reach FINALIZED in 60s"; exit 3
fi
echo "Contract agreement id: $AGREEMENT_ID"

#-------------------------------------------------------------------
bold "L2-Step 4: Initiate transfer (HttpData-PULL)"
#-------------------------------------------------------------------
TRANSFER=$(curl_mgmt -X POST "$CONSUMER_MGMT/transferprocesses" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"assetId\": \"asset-1\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"connectorId\": \"$PROVIDER_DID\",
  \"contractId\": \"$AGREEMENT_ID\",
  \"dataDestination\": { \"type\": \"HttpProxy\" },
  \"protocol\": \"dataspace-protocol-http\",
  \"transferType\": \"HttpData-PULL\"
}")
TRANSFER_ID=$(echo "$TRANSFER" | jq -r '.["@id"]')
echo "Transfer process id: $TRANSFER_ID"

#-------------------------------------------------------------------
bold "L2-Step 5: Wait for transfer STARTED"
#-------------------------------------------------------------------
for i in $(seq 1 30); do
  T_STATUS=$(curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TRANSFER_ID")
  T_STATE=$(echo "$T_STATUS" | jq -r '.state')
  printf "  [%2ds] state=%s\n" "$((i*2))" "$T_STATE"
  if [[ "$T_STATE" == "STARTED" ]]; then
    echo "$T_STATUS" | jq '{state, type}' | tee "$OUT_DIR/03-transfer-started.json"
    break
  fi
  sleep 2
done

#-------------------------------------------------------------------
bold "L2-Step 6: Fetch EDR (Endpoint Data Reference)"
#-------------------------------------------------------------------
EDR=$(curl_mgmt "$CONSUMER_MGMT/edrs/$TRANSFER_ID/dataaddress")
echo "$EDR" | jq | tee "$OUT_DIR/04-edr.json"

EDR_ENDPOINT=$(echo "$EDR" | jq -r '.endpoint')
EDR_TOKEN=$(echo "$EDR" | jq -r '.authorization')

if [[ -z "$EDR_ENDPOINT" || "$EDR_ENDPOINT" == "null" ]]; then
  echo "ERROR: EDR has no endpoint"; exit 4
fi

#-------------------------------------------------------------------
bold "L2-Step 7: Pull real KMB Bus Route data through EDC dataplane"
#-------------------------------------------------------------------
# The EDR endpoint is dataplane public (e.g., http://provider-qna-dataplane:11002/...)
# but since we're calling from outside the cluster, route through the consumer's
# proxy (HttpProxy was the destination type) - the dataplane endpoint is what
# we GET, with the authorization header.
# In MVD this dataplane endpoint is exposed at provider-qna/public/...
# which the ingress already routes to the dataplane.
EDR_PUBLIC=$(echo "$EDR_ENDPOINT" | sed 's|http://provider-qna-dataplane:11002|http://127.0.0.1/provider-qna/public|')
echo "Pulling: $EDR_PUBLIC"
echo

DATA=$(curl -sS -H "Authorization: $EDR_TOKEN" "$EDR_PUBLIC")
# KMB returns JSON with data array; pretty-print the first 3 entries
echo "$DATA" | jq '{type, version, generated_timestamp, sample_count: (.data | length), sample_first_3: (.data[0:3])}' | tee "$OUT_DIR/05-real-kmb-data.json"

bold "L2 DONE - real Hong Kong KMB data fetched through 7-step EDC pipeline"
echo "Screenshots saved to: $OUT_DIR/"
ls -la "$OUT_DIR/"
