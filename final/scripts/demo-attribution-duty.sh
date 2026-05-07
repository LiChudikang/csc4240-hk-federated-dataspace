#!/bin/bash
# Demonstrates the AttributionDutyFunction custom Java constraint:
# - Create a policy whose duty requires attribution = "HK Transport Hub"
# - alice negotiates with that policy -> SUCCESS (HK Transport Hub is approved)
# - alice tries with attribution = "Unauthorized Reseller" -> REJECTED
#
# Proves the dataspace can encode and enforce ATTRIBUTION duties via custom Java.

set -uo pipefail
API_KEY="password"
QNA_MGMT="http://127.0.0.1/provider-qna/cp/api/management/v3"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/screenshots"
mkdir -p "$OUT"
bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }
post_qna() {
  curl -sS -o /tmp/atr.out -w '%{http_code}\n' -H 'Content-Type: application/json' -H "X-Api-Key: $API_KEY" -X POST "$QNA_MGMT/$1" -d "$2"
}
curl_mgmt() { curl -sS -H "X-Api-Key: $API_KEY" "$@"; }

bold "ATR-1: Provider creates an asset with attribution duty"
post_qna assets '{
  "@context":["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id":"asset-with-attribution",
  "@type":"Asset",
  "properties":{"description":"Asset whose use requires attribution of source"},
  "dataAddress":{"@type":"DataAddress","type":"HttpData","baseUrl":"https://httpbin.org/anything/attributed-data"}
}' || true

bold "ATR-2: Provider creates a policy with attribution DUTY"
# permission: any member can use the data
# duty: the consumer must attribute "HK Transport Hub" as the source
post_qna policydefinitions '{
  "@context":["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type":"PolicyDefinition",
  "@id":"attribution-required-policy",
  "policy":{
    "@type":"Set",
    "permission":[{
      "action":"use",
      "constraint":{"leftOperand":"MembershipCredential","operator":"eq","rightOperand":"active"},
      "duty":[{
        "action":"use",
        "constraint":{"leftOperand":"attribution","operator":"eq","rightOperand":"HK Transport Hub"}
      }]
    }]
  }
}' || true

bold "ATR-3: Bind policy to the asset"
post_qna contractdefinitions '{
  "@context":["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id":"attribution-required-def",
  "@type":"ContractDefinition",
  "accessPolicyId":"require-membership",
  "contractPolicyId":"attribution-required-policy",
  "assetsSelector":{"@type":"Criterion","operandLeft":"https://w3id.org/edc/v0.0.1/ns/id","operator":"=","operandRight":"asset-with-attribution"}
}' || true

bold "ATR-4: alice catalog request -> see the offer with attribution duty"
CAT=$(curl_mgmt -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}")
echo "$CAT" | jq '.["dcat:dataset"][] | select(.["@id"]=="asset-with-attribution") | .["odrl:hasPolicy"]' | tee "$OUT/19-attribution-duty-offer.json"

PID=$(echo "$CAT" | jq -r '.["dcat:dataset"][] | select(.["@id"]=="asset-with-attribution") | .["odrl:hasPolicy"] | (if type=="array" then .[0] else . end) | .["@id"]')

bold "ATR-5: alice negotiates with attribution = 'HK Transport Hub' (approved -> expect FINALIZED)"
NEG=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\", \"@id\": \"$PID\",
    \"assigner\": \"$PROVIDER_DID\", \"target\": \"asset-with-attribution\",
    \"permission\": [{
      \"action\": \"use\",
      \"constraint\": {\"leftOperand\":\"MembershipCredential\",\"operator\":\"eq\",\"rightOperand\":\"active\"},
      \"duty\": [{
        \"action\": \"use\",
        \"constraint\": {\"leftOperand\":\"attribution\",\"operator\":\"eq\",\"rightOperand\":\"HK Transport Hub\"}
      }]
    }]
  }
}")
NEG_ID=$(echo "$NEG" | jq -r '.["@id"]')
echo "Negotiation @id: $NEG_ID"
for i in 1 2 3 4 5 6 7 8; do
  J=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "FINALIZED" || "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}' | tee "$OUT/20-attribution-success.json"
    break
  fi
  sleep 2
done

bold "ATR-6: alice negotiates with attribution = 'Unauthorized Reseller' (NOT approved -> expect TERMINATED)"
NEG2=$(curl_mgmt -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\", \"@id\": \"$PID\",
    \"assigner\": \"$PROVIDER_DID\", \"target\": \"asset-with-attribution\",
    \"permission\": [{
      \"action\": \"use\",
      \"constraint\": {\"leftOperand\":\"MembershipCredential\",\"operator\":\"eq\",\"rightOperand\":\"active\"},
      \"duty\": [{
        \"action\": \"use\",
        \"constraint\": {\"leftOperand\":\"attribution\",\"operator\":\"eq\",\"rightOperand\":\"Unauthorized Reseller\"}
      }]
    }]
  }
}")
NEG2_ID=$(echo "$NEG2" | jq -r '.["@id"]')
echo "Negotiation @id: $NEG2_ID"
for i in 1 2 3 4 5 6 7 8; do
  J=$(curl_mgmt "$CONSUMER_MGMT/contractnegotiations/$NEG2_ID")
  ST=$(echo "$J" | jq -r '.state')
  echo "  [$((i*2))s] state=$ST"
  if [[ "$ST" == "FINALIZED" || "$ST" == "TERMINATED" ]]; then
    echo "$J" | jq '{state, errorDetail}' | tee "$OUT/21-attribution-rejection.json"
    break
  fi
  sleep 2
done

bold "ATR DONE - inspect outputs above"
echo "Step 5 expects FINALIZED (HK Transport Hub is approved)"
echo "Step 6 expects TERMINATED (Unauthorized Reseller is not in approved list)"
