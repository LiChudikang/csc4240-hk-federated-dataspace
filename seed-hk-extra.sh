#!/bin/bash
# Adds HK Traffic + MTR assets and the academic policy+contract definition
# only to provider-manufacturing. Run AFTER seed-k8s.sh succeeds.

set -euo pipefail
HOST="http://127.0.0.1/provider-manufacturing/cp/api/management/v3"

API_KEY="password"

post() {
  local path="$1" body="$2" label="$3"
  local code
  code=$(curl -sS -o /tmp/seed-hk.out -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -H "X-Api-Key: $API_KEY" \
    -X POST "$HOST/$path" -d "$body")
  echo "[$label] HTTP $code"
  if [[ "$code" != "200" && "$code" != "204" && "$code" != "409" ]]; then
    cat /tmp/seed-hk.out; echo; exit 1
  fi
}

# Asset: HK Traffic Incidents (open data)
post assets '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id": "hk-traffic-incidents",
  "@type": "Asset",
  "properties": {
    "description": "HK Traffic Incident reports - academic use only.",
    "publisher": "HK Transport Department"
  },
  "dataAddress": {
    "@type": "DataAddress",
    "type": "HttpData",
    "baseUrl": "https://resource.data.one.gov.hk/td/journey-time-incident.xml",
    "proxyPath": "true",
    "proxyQueryParams": "true"
  }
}' "Create asset hk-traffic-incidents"

# Asset: MTR Patronage (monthly CSV)
post assets '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id": "mtr-patronage",
  "@type": "Asset",
  "properties": {
    "description": "MTR monthly station patronage - academic use only.",
    "publisher": "MTR Corporation"
  },
  "dataAddress": {
    "@type": "DataAddress",
    "type": "HttpData",
    "baseUrl": "https://opendata.mtr.com.hk/data/patronage_enquiry.csv",
    "proxyPath": "true",
    "proxyQueryParams": "true"
  }
}' "Create asset mtr-patronage"

# Policy: academic-only (Membership required; semantic is "academic" via contract def below)
post policydefinitions '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type": "PolicyDefinition",
  "@id": "academic-only-policy",
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
}' "Create academic-only policy"

# ContractDefinition: ties academic policy to the 2 HK academic assets
post contractdefinitions '{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@id": "academic-hk-def",
  "@type": "ContractDefinition",
  "accessPolicyId": "require-membership",
  "contractPolicyId": "academic-only-policy",
  "assetsSelector": [
    {
      "@type": "Criterion",
      "operandLeft": "https://w3id.org/edc/v0.0.1/ns/id",
      "operator": "in",
      "operandRight": ["hk-traffic-incidents", "mtr-patronage"]
    }
  ]
}' "Create academic-hk-def contract definition"

echo
echo "=== HK extra seed complete ==="
