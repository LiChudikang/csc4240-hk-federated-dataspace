#!/bin/bash
# Demo: HKTaxi (alice) negotiates contract for asset-1-push, then PUSHES the data
# to the in-cluster push-receiver. We then read the receiver's log to prove
# the data arrived via PUSH (not pulled by the consumer).

set -uo pipefail
API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"
RECEIVER_URL_INCLUSTER="http://push-receiver/sink"
OUT="/Users/lichudikang/MVD/final/screenshots"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "PUSH-1: Reset receiver log"
kubectl --context k3d-edc-cluster exec -n mvd deploy/push-receiver -- sh -c 'rm -f /tmp/last.bin /tmp/log.txt && echo "cleared"' 2>&1 | tail -3

bold "PUSH-2: HKTaxi catalog from provider-qna"
CAT=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
PID=$(echo "$CAT" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="asset-1-push") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')
echo "Offer policy id: $PID"

bold "PUSH-3: Negotiate asset-1-push (KMB Bus Routes)"
NEG=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\", \"@id\": \"$PID\",
    \"assigner\": \"$PROVIDER_DID\", \"target\": \"asset-1-push\",
    \"obligation\": [{
      \"action\": \"use\",
      \"constraint\": {\"leftOperand\": \"DataAccess.level\", \"operator\": \"eq\", \"rightOperand\": \"processing\"}
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
AGREEMENT=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  J=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "FINALIZED" ]]; then
    AGREEMENT=$(echo "$J" | jq -r '.contractAgreementId')
    break
  fi
  sleep 2
done
echo "Agreement: $AGREEMENT"

bold "PUSH-4: Initiate PUSH transfer (HttpData-PUSH → push-receiver)"
TX=$(curl_mgmt -X POST "$CONSUMER_MGMT/transferprocesses" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"assetId\": \"asset-1-push\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"connectorId\": \"$PROVIDER_DID\",
  \"contractId\": \"$AGREEMENT\",
  \"dataDestination\": {
    \"type\": \"HttpData\",
    \"baseUrl\": \"$RECEIVER_URL_INCLUSTER\"
  },
  \"protocol\": \"dataspace-protocol-http\",
  \"transferType\": \"HttpData-PUSH\"
}")
TX_ID=$(echo "$TX" | jq -r '.["@id"]')
echo "Transfer process id: $TX_ID"

bold "PUSH-5: Poll transfer state (expect STARTED then COMPLETED)"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  J=$(curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TX_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "COMPLETED" || "$ST" == "STARTED" ]]; then
    sleep 2  # let the push actually happen
    break
  fi
  if [[ "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}'
    exit 2
  fi
  sleep 2
done

bold "PUSH-6: Check receiver - did data arrive?"
echo "Receiver log:"
RECV_LOG=$(curl -sS http://127.0.0.1/push-receiver/log)
echo "$RECV_LOG"
echo
echo "Receiver last body (first 800 chars):"
RECV_BODY=$(curl -sS http://127.0.0.1/push-receiver/last)
echo "$RECV_BODY" | head -c 800
echo

bold "PUSH-7: Save evidence to screenshots/"
{
  echo "=== Transfer state (consumer view) ==="
  curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TX_ID" | jq '{state, type, transferType: .type, contractId: .contractAgreementId}'
  echo
  echo "=== Receiver log ==="
  echo "$RECV_LOG"
  echo
  echo "=== Receiver last body (first 1500 chars) ==="
  echo "$RECV_BODY" | head -c 1500
  echo
  echo
  echo "=== Receiver content shape ==="
  echo "$RECV_BODY" | jq '{type, version, generated_timestamp, sample_count, sample_first_2: (.data[0:2])}' 2>/dev/null || echo "(non-JSON or truncated)"
} | tee "$OUT/11-push-transfer-evidence.txt"

bold "PUSH DONE"
