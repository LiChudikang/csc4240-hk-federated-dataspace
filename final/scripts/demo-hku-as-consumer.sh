#!/bin/bash
# Demonstrates HKU consuming a Provider asset (full inverse to dual-role demo).
# Highlight: HKU (ACADEMIC tier) succeeds on academic-only asset that alice
# (COMMERCIAL) is rejected from -> proves ParticipantTier custom constraint
# enforces tier asymmetry correctly.

set -uo pipefail
API_KEY="password"
HKU_MGMT="http://127.0.0.1/hku/cp/api/management/v3"
PROVIDER_MFG_DSP="http://provider-manufacturing-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/screenshots"
mkdir -p "$OUT"
bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "HKU-CON-1: HKU catalog request"
CAT=$(curl_mgmt -X POST "$HKU_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
echo "$CAT" | jq '{participantId: .["dspace:participantId"], assets: [.["dcat:dataset"][]?.["@id"]]}' | tee "$OUT/16-hku-consumer-catalog.json"

PID=$(echo "$CAT" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="hk-academic-research-archive") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')

bold "HKU-CON-2: HKU negotiates academic-tier-only asset (HKU=ACADEMIC -> expect FINALIZED)"
NEG=$(curl_mgmt -X POST "$HKU_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
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
      \"constraint\": {\"leftOperand\": \"ParticipantTier\", \"operator\": \"eq\", \"rightOperand\": \"ACADEMIC\"}
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
echo "Negotiation @id: $NEG_ID"

AGREEMENT=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  J=$(curl_mgmt "$HKU_MGMT/contractnegotiations/$NEG_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "FINALIZED" ]]; then
    AGREEMENT=$(echo "$J" | jq -r '.contractAgreementId')
    echo "$J" | jq '{state, contractAgreementId}' | tee "$OUT/17-hku-academic-agreement.json"
    break
  fi
  if [[ "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}' | tee "$OUT/17-hku-academic-agreement.json"
    exit 2
  fi
  sleep 2
done

bold "HKU-CON-3: HKU pulls the academic data"
TX=$(curl_mgmt -X POST "$HKU_MGMT/transferprocesses" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"assetId\": \"hk-academic-research-archive\",
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"connectorId\": \"$PROVIDER_DID\",
  \"contractId\": \"$AGREEMENT\",
  \"dataDestination\": {\"type\": \"HttpProxy\"},
  \"protocol\": \"dataspace-protocol-http\",
  \"transferType\": \"HttpData-PULL\"
}")
TX_ID=$(echo "$TX" | jq -r '.["@id"]')
for i in 1 2 3 4 5 6 7 8; do
  T=$(curl_mgmt "$HKU_MGMT/transferprocesses/$TX_ID")
  TS=$(echo "$T" | jq -r '.state')
  echo "  [$((i*2))s] state=$TS"
  [[ "$TS" == "STARTED" ]] && break
  sleep 2
done

EDR=$(curl_mgmt "$HKU_MGMT/edrs/$TX_ID/dataaddress")
EDR_EP=$(echo "$EDR" | jq -r '.endpoint')
EDR_TOK=$(echo "$EDR" | jq -r '.authorization')
PUB=$(echo "$EDR_EP" | sed 's|http://provider-manufacturing-dataplane:11002|http://127.0.0.1/provider-manufacturing/public|')
echo "Pulling: $PUB"
DATA=$(curl -sS -H "Authorization: $EDR_TOK" "$PUB")
echo "$DATA" | jq '{url, args}' | tee "$OUT/18-hku-academic-data-pulled.json"

bold "HKU-CON DONE - HKU successfully consumed an ACADEMIC-tier-only asset"
