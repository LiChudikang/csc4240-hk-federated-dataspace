#!/bin/bash
# Make HKU dual-role: it now also PUBLISHES a research-output asset.
# Demonstrates the "some or all with dual role" requirement of Part 2.
#
# Asset:    "hku-transit-equity-2026" — HKU's published research output
# Policy:   require-membership (any registered dataspace participant)
# Consumer: anyone with a valid Membership credential (alice in our demo)

set -uo pipefail
HKU_MGMT="http://127.0.0.1/hku/cp/api/management/v3"
API_KEY="password"

post() {
  local path="$1" body="$2" label="$3"
  local code
  code=$(curl -sS -o /tmp/seed-hku-prov.out -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -H "X-Api-Key: $API_KEY" \
    -X POST "$HKU_MGMT/$path" -d "$body")
  echo "[$label] HTTP $code"
  if [[ "$code" != "200" && "$code" != "204" && "$code" != "409" ]]; then
    cat /tmp/seed-hku-prov.out; echo; exit 1
  fi
}

# Asset: HKU's "Transit Equity Index 2026" — published as a tiny synthetic dataset
# pointed at httpbin.org/json so the demo actually delivers bytes.
# In a real deployment this would point at HKU's research API.
post assets '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id": "hku-transit-equity-2026",
  "@type": "Asset",
  "properties": {
    "description": "HKU Transport Lab - Transit Equity Index 2026 (research output)",
    "publisher": "HKU Transport Lab",
    "license": "academic-share-with-attribution"
  },
  "dataAddress": {
    "@type": "DataAddress",
    "type": "HttpData",
    "baseUrl": "https://httpbin.org/anything/hku/transit-equity-2026"
  }
}' "Create HKU asset"

# Policy: simple Membership requirement (any dataspace participant)
post policydefinitions '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type": "PolicyDefinition",
  "@id": "hku-share-policy",
  "policy": {
    "@type": "Set",
    "permission": [{
      "action": "use",
      "constraint": {
        "leftOperand": "MembershipCredential",
        "operator": "eq",
        "rightOperand": "active"
      }
    }]
  }
}' "Create HKU share policy"

# ContractDefinition
post contractdefinitions '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id": "hku-share-def",
  "@type": "ContractDefinition",
  "accessPolicyId": "hku-share-policy",
  "contractPolicyId": "hku-share-policy",
  "assetsSelector": {
    "@type": "Criterion",
    "operandLeft": "https://w3id.org/edc/v0.0.1/ns/id",
    "operator": "=",
    "operandRight": "hku-transit-equity-2026"
  }
}' "Create HKU contract definition"

echo
echo "=== HKU as provider seeded ==="
echo "Verify assets list:"
curl -sS -X POST "$HKU_MGMT/assets/request" -H 'Content-Type: application/json' -H "X-Api-Key: $API_KEY" -d '{"@context":["https://w3id.org/edc/connector/management/v0.0.1"],"@type":"QuerySpec"}' | jq '[.[] | {asset_id: .["@id"], publisher: .properties.publisher}]'
