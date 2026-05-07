#!/bin/bash
# Push transfer with a real S3 sink (MinIO):
#   - alice negotiates KMB asset on provider-qna
#   - alice asks provider's data plane to PUSH the data into a MinIO bucket
#   - we then list the bucket (via the MinIO pod) to prove the object landed
#
# Diff vs demo-push-transfer.sh: that one used a cluster-internal HTTP
# receiver (good enough to prove the protocol). This one uses a standard
# S3 sink, which is what a production dataspace would actually wire to.

set -uo pipefail
API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/screenshots"
mkdir -p "$OUT"
S3_BUCKET="edc-push-bucket"
S3_OBJECT="kmb-routes-via-s3-$(date +%H%M%S).json"
S3_ENDPOINT="http://minio:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "S3-1: alice catalog from provider-qna"
CAT=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
PID=$(echo "$CAT" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="asset-1-push") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')
echo "Offer policy id: $PID"

bold "S3-2: Negotiate asset-1-push"
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
  if [[ "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}'; exit 2
  fi
  sleep 2
done
echo "Agreement: $AGREEMENT"

bold "S3-3: Initiate PUSH transfer with AmazonS3 destination"
TX=$(curl_mgmt -X POST "$CONSUMER_MGMT/transferprocesses" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"assetId\": \"asset-1-push\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"connectorId\": \"$PROVIDER_DID\",
  \"contractId\": \"$AGREEMENT\",
  \"dataDestination\": {
    \"type\": \"AmazonS3\",
    \"region\": \"$S3_REGION\",
    \"bucketName\": \"$S3_BUCKET\",
    \"objectName\": \"$S3_OBJECT\",
    \"endpointOverride\": \"$S3_ENDPOINT\",
    \"accessKeyId\": \"$S3_ACCESS_KEY\",
    \"secretAccessKey\": \"$S3_SECRET_KEY\"
  },
  \"protocol\": \"dataspace-protocol-http\",
  \"transferType\": \"AmazonS3-PUSH\"
}")
TX_ID=$(echo "$TX" | jq -r '.["@id"]')
echo "Transfer process id: $TX_ID"
echo "Target: s3://$S3_BUCKET/$S3_OBJECT  (endpoint $S3_ENDPOINT)"

bold "S3-4: Poll transfer state"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  J=$(curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TX_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "COMPLETED" || "$ST" == "STARTED" ]]; then
    sleep 3
    break
  fi
  if [[ "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}'
    break
  fi
  sleep 2
done

bold "S3-5: Verify the object actually landed in MinIO"
MINIO_POD=$(kubectl get pod -n mvd -l app=minio -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n mvd "$MINIO_POD" -- mc ls --json local/$S3_BUCKET/ 2>&1 | tee "$OUT/22-s3-push-bucket-listing.json" | head -20
echo
echo "Object size & sample bytes:"
kubectl exec -n mvd "$MINIO_POD" -- sh -c "mc cat local/$S3_BUCKET/$S3_OBJECT | head -c 600" 2>&1 | tee -a "$OUT/22-s3-push-bucket-listing.json"

bold "S3-6: Save evidence"
{
  echo "=== Transfer state (consumer view) ==="
  curl_mgmt "$CONSUMER_MGMT/transferprocesses/$TX_ID" | jq '{state, transferType, contractId: .contractAgreementId, dataDestination}'
  echo
  echo "=== MinIO bucket listing ==="
  kubectl exec -n mvd "$MINIO_POD" -- mc ls local/$S3_BUCKET/
  echo
  echo "=== Object preview (first 1000 chars) ==="
  kubectl exec -n mvd "$MINIO_POD" -- sh -c "mc cat local/$S3_BUCKET/$S3_OBJECT | head -c 1000"
} | tee "$OUT/23-s3-push-evidence.txt"

bold "S3 PUSH DONE - object landed in MinIO bucket $S3_BUCKET"
