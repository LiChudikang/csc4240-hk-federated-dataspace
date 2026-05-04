# HK-Federated MVD Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the running MVD k3d cluster with (a) a second independent consumer (HKU Transport Lab) and (b) Hong Kong-specific data assets and policies, so that two distinct consumers negotiate two distinct policy regimes (commercial vs academic) against a Hong Kong transport data provider.

**Architecture:** Keep the K8s resource names (`alice`/`bob`/`consumer`/`provider-*`) untouched — this avoids re-signing the credential JWTs already loaded into IdentityHub. Add one new terraform-managed consumer cluster (`hku-*` pods) sharing the existing `mvd` namespace. Differentiate the two existing provider connectors so `provider-qna` exposes KMB live data and `provider-manufacturing` exposes HK Traffic / MTR static data. Layer a commercial-vs-academic policy split on top.

**Tech Stack:** Terraform (kubernetes + helm providers), k3d, kubectl, Newman/Postman, EDC Management API (REST/JSON-LD), bash.

**Companion spec:** `/Users/lichudikang/MVD/specs/2026-04-26-hk-federated-mvd-design.md`

**Working directory:** `/Users/lichudikang/Projects/MinimumViableDataspace`

**Repo state:** Modified working tree on the upstream `eclipse-edc/MinimumViableDataspace` clone. **Do NOT commit** — the user wants to keep upstream pristine; treat all changes as local-only.

---

## File Inventory

### Created
- `deployment/hku.tf` — HKU consumer terraform module (clones the shape of `consumer.tf`)
- `deployment/assets/credentials/k8s/hku/membership-credential.json` — HKU credential (copy of alice's, holder DID swapped)
- `deployment/assets/credentials/k8s/hku/dataprocessor-credential.json` — HKU dataprocessor credential (copy of alice's, holder DID swapped)
- `seed-hk-extra.sh` — POSTs the 2 additional HK assets (Traffic Incidents + MTR) and the academic policy + contract def to provider-manufacturing
- `seed-hku.sh` — registers HKU as a participant in its own identityhub and as a holder in the issuer service
- `demo-hk-flow.sh` — end-to-end demo: HKTaxi pulls KMB ETA, HKU pulls MTR data, HKTaxi gets rejected on MTR

### Modified
- `deployment/variables.tf` — add `hku-did` variable

### Untouched (intentionally)
- All Java code in `extensions/`, `launchers/`, `tests/`
- The 5 docker images already in cache
- `deployment/consumer.tf` and `deployment/provider.tf`
- The existing 6 credential JSON files (alice/bob — already user-modified)
- `deployment/assets/issuer/did.k8s.json` (already user-modified to single-line; functionally identical)

---

## Task 1: Add `hku-did` Terraform variable

**Files:**
- Modify: `/Users/lichudikang/Projects/MinimumViableDataspace/deployment/variables.tf`

- [ ] **Step 1: Append the variable to `variables.tf`**

Append to end of `deployment/variables.tf`:

```terraform
variable "hku-did" {
  default = "did:web:hku-identityhub%3A7083:hku"
}
```

- [ ] **Step 2: Verify terraform parses**

Run from `/Users/lichudikang/Projects/MinimumViableDataspace/deployment`:
```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

---

## Task 2: Create HKU credential files

**Files:**
- Create: `deployment/assets/credentials/k8s/hku/membership-credential.json`
- Create: `deployment/assets/credentials/k8s/hku/dataprocessor-credential.json`

These are byte-copies of alice's files with the outer-JSON `participantContextId` and `holderId` switched to HKU's DID. The embedded `rawVc` JWT is **left as-is**. Signature verification is not enforced for credentials loaded at startup from the credentials directory — they populate the wallet directly.

- [ ] **Step 1: Create the directory and copy alice's credentials**

```bash
mkdir -p /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/hku
cp /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/consumer/membership-credential.json \
   /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/hku/membership-credential.json
cp /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/consumer/dataprocessor-credential.json \
   /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/hku/dataprocessor-credential.json
```

- [ ] **Step 2: Patch the holder DIDs in both files**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/hku
for f in membership-credential.json dataprocessor-credential.json; do
  jq '
    .participantContextId = "did:web:hku-identityhub%3A7083:hku" |
    .holderId = "did:web:hku-identityhub%3A7083:hku" |
    .verifiableCredential.credential.credentialSubject[0].id = "did:web:hku-identityhub%3A7083:hku" |
    (.verifiableCredential.credential.credentialSubject[0].claims.id // empty) |= "did:web:hku-identityhub%3A7083:hku"
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

- [ ] **Step 3: Verify the swap**

```bash
jq '.participantContextId, .holderId' /Users/lichudikang/Projects/MinimumViableDataspace/deployment/assets/credentials/k8s/hku/membership-credential.json
```
Expected output: two lines, both `"did:web:hku-identityhub%3A7083:hku"`.

---

## Task 3: Create `hku.tf` (HKU consumer module)

**Files:**
- Create: `/Users/lichudikang/Projects/MinimumViableDataspace/deployment/hku.tf`

The structure mirrors `consumer.tf`. Differences from consumer.tf:
- All `consumer-*` resource names → `hku-*`
- `humanReadableName = "hku"` (and `"hku-identityhub"`)
- `participantId = var.hku-did`
- DB credentials `hku/hku`
- `vault-url = "http://hku-vault:8200"`
- `credentials-dir = dirname("./assets/credentials/k8s/hku/")`
- `service-name = "hku"`

- [ ] **Step 1: Create `deployment/hku.tf`**

```terraform
#
# HKU consumer (academic) — added for the HK federated MVD assignment.
# Resource layout mirrors consumer.tf so behaviour is identical;
# only DIDs, DB names, and vault names differ.
#

module "hku-connector" {
  source            = "./modules/connector"
  humanReadableName = "hku"
  participantId     = var.hku-did
  database = {
    user     = "hku"
    password = "hku"
    url      = "jdbc:postgresql://${module.hku-postgres.database-url}/hku"
  }
  vault-url     = "http://hku-vault:8200"
  namespace     = kubernetes_namespace.ns.metadata.0.name
  sts-token-url = "${module.hku-identityhub.sts-token-url}/token"
  useSVE        = var.useSVE
}

module "hku-identityhub" {
  depends_on        = [module.hku-vault]
  source            = "./modules/identity-hub"
  credentials-dir   = dirname("./assets/credentials/k8s/hku/")
  humanReadableName = "hku-identityhub"
  participantId     = var.hku-did
  vault-url         = "http://hku-vault:8200"
  service-name      = "hku"
  database = {
    user     = "hku"
    password = "hku"
    url      = "jdbc:postgresql://${module.hku-postgres.database-url}/hku"
  }
  namespace = kubernetes_namespace.ns.metadata.0.name
  useSVE    = var.useSVE
}

module "hku-vault" {
  source            = "./modules/vault"
  humanReadableName = "hku-vault"
  namespace         = kubernetes_namespace.ns.metadata.0.name
}

module "hku-postgres" {
  depends_on       = [kubernetes_config_map.postgres-initdb-config-hku]
  source           = "./modules/postgres"
  instance-name    = "hku"
  init-sql-configs = ["hku-initdb-config"]
  namespace        = kubernetes_namespace.ns.metadata.0.name
}

resource "kubernetes_config_map" "postgres-initdb-config-hku" {
  metadata {
    name      = "hku-initdb-config"
    namespace = kubernetes_namespace.ns.metadata.0.name
  }
  data = {
    "hku-initdb-config.sql" = <<-EOT
        CREATE USER hku WITH ENCRYPTED PASSWORD 'hku' SUPERUSER;
        CREATE DATABASE hku;
        \c hku hku


      EOT
  }
}
```

- [ ] **Step 2: Validate terraform**

Run from `/Users/lichudikang/Projects/MinimumViableDataspace/deployment`:
```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Plan to verify additions only (no destruction)**

```bash
terraform plan -var="useSVE=true" -out=hku.tfplan 2>&1 | tail -25
```
Expected: `Plan: N to add, 0 to change, 0 to destroy.` where N is roughly 11–14 (postgres svc/deploy, vault sts/svc/secret/cm/serviceaccount, identityhub deploy/svc/cm/ingress, connector deploy/svc/cm/ingress).

If destruction is reported on existing resources: STOP, show the user before proceeding.

---

## Task 4: Apply HKU and verify pods

**Files:** none modified — runs terraform.

- [ ] **Step 1: Apply**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace/deployment
terraform apply hku.tfplan 2>&1 | tail -10
```
Expected: `Apply complete! Resources: N added, 0 changed, 0 destroyed.`

- [ ] **Step 2: Wait for HKU pods to be Ready**

```bash
kubectl --context k3d-edc-cluster wait --for=condition=Ready --timeout=180s -n mvd \
  pod -l 'App in (hku-controlplane,hku-dataplane,hku-identityhub)' 2>&1
kubectl --context k3d-edc-cluster get pods -n mvd | grep hku
```
Expected: 3 lines showing `hku-controlplane-*`, `hku-dataplane-*`, `hku-identityhub-*` all `1/1 Running`. Plus `hku-postgres-*` and `hku-vault-0` should also be Running (vault may show 0/1 until init).

- [ ] **Step 3: Verify HKU's identityhub responds**

```bash
kubectl --context k3d-edc-cluster exec -n mvd deploy/hku-identityhub -- \
  wget -qO- http://localhost:7081/api/check/health 2>&1 || true
```
Expected: a `{"isSystemHealthy":true,...}`-shaped JSON response.

---

## Task 5: Differentiate provider data (add HK Traffic + MTR to provider-manufacturing)

**Files:**
- Create: `/Users/lichudikang/Projects/MinimumViableDataspace/seed-hk-extra.sh`

Currently both provider connectors are seeded with the same 2 KMB assets (Asset 1 = KMB Routes, Asset 2 = KMB ETA — already wired in the Postman collection by the user). This task adds 2 additional HK assets *only* to `provider-manufacturing` so the two providers carry distinct data:
- `hk-traffic-incidents` — HK Traffic Incident open data (data.gov.hk URL — kept simple as HttpData baseUrl pointing at the public dataset)
- `mtr-patronage` — MTR monthly patronage CSV

Plus an **academic-only** policy and matching contract definition (covers the proposal's "academic vs commercial" split).

- [ ] **Step 1: Create the seed script**

Create `/Users/lichudikang/Projects/MinimumViableDataspace/seed-hk-extra.sh`:

```bash
#!/bin/bash
# Adds HK Traffic + MTR assets and the academic policy+contract definition
# only to provider-manufacturing. Run AFTER seed-k8s.sh succeeds.

set -euo pipefail
HOST="http://127.0.0.1/provider-manufacturing/cp/api/management/v3"

post() {
  local path="$1" body="$2" label="$3"
  local code
  code=$(curl -sS -o /tmp/seed-hk.out -w '%{http_code}' \
    -H 'Content-Type: application/json' \
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

# Policy: academic-only (requires MembershipCredential AND attribution duty)
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
      },
      "duty": [{
        "action": "attribute",
        "constraint": {
          "leftOperand": "attribution",
          "operator": "eq",
          "rightOperand": "HK Transport Hub"
        }
      }]
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
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/lichudikang/Projects/MinimumViableDataspace/seed-hk-extra.sh
```

- [ ] **Step 3: Run it (after seed-k8s.sh has succeeded)**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace && ./seed-hk-extra.sh
```
Expected: 4 lines of `[label] HTTP 200` (or `204`/`409` if re-run), then `=== HK extra seed complete ===`.

- [ ] **Step 4: Verify the 4 assets are in provider-manufacturing's catalog**

```bash
curl -sS -X POST 'http://127.0.0.1/provider-manufacturing/cp/api/management/v3/assets/request' \
  -H 'Content-Type: application/json' -d '{}' | jq '.[] | .["@id"]'
```
Expected output (4 lines, order may vary):
```
"asset-1"
"asset-2"
"hk-traffic-incidents"
"mtr-patronage"
```

---

## Task 6: Register HKU as a dataspace participant

**Files:**
- Create: `/Users/lichudikang/Projects/MinimumViableDataspace/seed-hku.sh`

This is the HKU equivalent of the participant-creation steps in `seed-k8s.sh`. It POSTs HKU's identity to (a) HKU's own identityhub admin API and (b) the central issuer service as a known holder.

- [ ] **Step 1: Create the seed script**

Create `/Users/lichudikang/Projects/MinimumViableDataspace/seed-hku.sh`:

```bash
#!/bin/bash
# Registers HKU as a participant in its own IdentityHub and as a holder in the issuer.
# Prereq: seed-k8s.sh has succeeded and hku-* pods are Ready.

set -euo pipefail
API_KEY="c3VwZXItdXNlcg==.c3VwZXItc2VjcmV0LWtleQo="

HKU_DID="did:web:hku-identityhub%3A7083:hku"
HKU_CONTROLPLANE="http://hku-controlplane:8082"
HKU_IDENTITYHUB_INTERNAL="http://hku-identityhub:7082"

# Step 1: Create HKU participant in HKU's identityhub
echo "==> Creating HKU participant in hku-identityhub"
DATA_HKU=$(jq -n --arg did "$HKU_DID" --arg cp "$HKU_CONTROLPLANE" --arg ih "$HKU_IDENTITYHUB_INTERNAL" '{
  "roles": ["academic"],
  "serviceEndpoints": [
    {
      "type": "CredentialService",
      "serviceEndpoint": "\($ih)/api/credentials/v1/participants/aGt1LWlkZW50aXR5aHVi",
      "id": "hku-credentialservice-1"
    },
    {
      "type": "ProtocolEndpoint",
      "serviceEndpoint": "\($cp)/api/dsp",
      "id": "hku-dsp"
    }
  ],
  "active": true,
  "participantId": $did,
  "did": $did,
  "key": {
    "keyId": "\($did)#key-1",
    "privateKeyAlias": "\($did)#key-1",
    "keyGeneratorParams": { "algorithm": "EC" }
  }
}')
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST "http://127.0.0.1/hku/cs/api/identity/v1alpha/participants/" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -d "$DATA_HKU"

# Step 2: Register HKU as a holder in the central issuer
echo
echo "==> Registering HKU as holder in dataspace-issuer"
DATA_HOLDER=$(jq -n --arg did "$HKU_DID" '{
  "holderId": $did,
  "holderName": "HKU Transport Lab",
  "did": $did
}')
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST 'http://127.0.0.1/issuer/ad/api/admin/v1alpha/participants/ZGlkOndlYjpsb2NhbGhvc3QlM0ExMDEwMA==/holders' \
  -H 'Content-Type: application/json' \
  -d "$DATA_HOLDER"

echo
echo "=== HKU registration complete ==="
```

- [ ] **Step 2: Make executable and add ingress check**

The path `http://127.0.0.1/hku/cs/...` requires an ingress route. The HKU identityhub module's `ingress.tf` should auto-generate one keyed off `humanReadableName="hku"` — verify before running:

```bash
chmod +x /Users/lichudikang/Projects/MinimumViableDataspace/seed-hku.sh
kubectl --context k3d-edc-cluster get ingress -n mvd | grep -i hku
```
Expected: at least 2 entries (`hku-did-ingress`, `hku-identityhub-ingress`); if missing, the module auto-generation differs from consumer's — inspect `consumer.tf`'s identityhub module output and add an `ingress.tf` entry to `hku.tf`. (Defer this fix to Task 7 if the issue surfaces.)

- [ ] **Step 3: Run the script**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace && ./seed-hku.sh
```
Expected: two `HTTP 201` (or `409` if re-run) responses, ending in `=== HKU registration complete ===`.

If the first POST returns 404, the ingress route for HKU's credential service is missing — go to Task 7.

---

## Task 7 (conditional, only if Task 6 hits 404): Add HKU ingress routes

**Trigger:** Task 6 step 2 shows no `hku-*-ingress` entries, OR step 3 returns 404.

**Files:**
- Modify: `/Users/lichudikang/Projects/MinimumViableDataspace/deployment/hku.tf`

The `connector` and `identity-hub` modules build their ingress from `humanReadableName`. Compare what consumer's modules produce vs HKU's:

- [ ] **Step 1: Inspect consumer's ingress for path patterns**

```bash
kubectl --context k3d-edc-cluster get ingress -n mvd consumer-identityhub-ingress -o yaml | grep -E 'path:|pathType:' | head
```
Note the path patterns (e.g., `/consumer/cs(/|$)(.*)`).

- [ ] **Step 2: Inspect what HKU produced**

```bash
kubectl --context k3d-edc-cluster get ingress -n mvd | grep hku
```

If only some routes exist, the `service-name` field in `module "hku-identityhub"` (currently `"hku"`) drives the path. Verify it matches `/hku/cs/...`.

- [ ] **Step 3: If routes are wrong, override them**

The connector and identity-hub modules accept a `service-name` argument (string). Confirm by reading `deployment/modules/identity-hub/ingress.tf`:
```bash
cat /Users/lichudikang/Projects/MinimumViableDataspace/deployment/modules/identity-hub/ingress.tf
```
Adjust `service-name` in `hku.tf` if the path is wrong, then `terraform apply -var="useSVE=true" -auto-approve` and re-run Task 6 step 3.

---

## Task 8: End-to-end demo flow script

**Files:**
- Create: `/Users/lichudikang/Projects/MinimumViableDataspace/demo-hk-flow.sh`

Demonstrates the federated dataspace with both consumers exercising different policies. This is the artifact the user shows for the assignment.

- [ ] **Step 1: Create the demo script**

```bash
cat > /Users/lichudikang/Projects/MinimumViableDataspace/demo-hk-flow.sh <<'SCRIPT'
#!/bin/bash
# HK Federated Dataspace - end-to-end demo
# Shows: HKTaxi commercial pull (KMB ETA), HKU academic pull (MTR), HKTaxi rejection on MTR.
set -uo pipefail

CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
HKU_MGMT="http://127.0.0.1/hku/cp/api/management/v3"
PROVIDER_MFG_DSP="http://provider-manufacturing-controlplane:8082/api/dsp"
PROVIDER_QNA_DSP="http://provider-qna-controlplane:8082/api/dsp"
PROVIDER_DID="did:web:provider-identityhub%3A7083:provider"

bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }

bold "Step 1 - HKTaxi (alice) requests catalog from provider-qna (KMB ETA)"
curl -sS -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}" | jq '.["dcat:dataset"] | if type=="array" then .[].["@id"] else .["@id"] end'

bold "Step 2 - HKU requests catalog from provider-manufacturing (HK Traffic + MTR + KMB)"
curl -sS -X POST "$HKU_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"counterPartyId\": \"$PROVIDER_DID\",
  \"protocol\": \"dataspace-protocol-http\"
}" | jq '.["dcat:dataset"] | if type=="array" then .[].["@id"] else .["@id"] end'

bold "Step 3 - HKTaxi negotiates contract for asset-2 (KMB ETA, commercial policy)"
NEG_HKTAXI=$(curl -sS -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_QNA_DSP\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\",
    \"@id\": \"member-and-dataprocessor-def\",
    \"target\": \"asset-2\",
    \"assigner\": \"$PROVIDER_DID\"
  }
}")
echo "$NEG_HKTAXI" | jq '{state: .state // .["@id"], id: .["@id"]}'

bold "Step 4 - HKU negotiates contract for mtr-patronage (academic policy)"
NEG_HKU=$(curl -sS -X POST "$HKU_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\",
    \"@id\": \"academic-hk-def\",
    \"target\": \"mtr-patronage\",
    \"assigner\": \"$PROVIDER_DID\"
  }
}")
echo "$NEG_HKU" | jq '{state: .state // .["@id"], id: .["@id"]}'

bold "Step 5 - Negative test: HKTaxi tries academic-only mtr-patronage (should be rejected/terminated)"
NEG_REJECT=$(curl -sS -X POST "$CONSUMER_MGMT/contractnegotiations" -H 'Content-Type: application/json' -d "{
  \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
  \"@type\": \"ContractRequest\",
  \"counterPartyAddress\": \"$PROVIDER_MFG_DSP\",
  \"protocol\": \"dataspace-protocol-http\",
  \"policy\": {
    \"@context\": \"http://www.w3.org/ns/odrl.jsonld\",
    \"@type\": \"Offer\",
    \"@id\": \"academic-hk-def\",
    \"target\": \"mtr-patronage\",
    \"assigner\": \"$PROVIDER_DID\"
  }
}")
NEG_ID=$(echo "$NEG_REJECT" | jq -r '.["@id"]')
sleep 5
bold "Step 5b - Polling HKTaxi negotiation $NEG_ID (expect TERMINATED)"
curl -sS "$CONSUMER_MGMT/contractnegotiations/$NEG_ID" | jq '{state, errorDetail}'

bold "DONE - inspect output above for each demo step's outcome."
SCRIPT
chmod +x /Users/lichudikang/Projects/MinimumViableDataspace/demo-hk-flow.sh
```

- [ ] **Step 2: Run the demo**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace && ./demo-hk-flow.sh
```

- [ ] **Step 3: Interpret the output**

Expected outcomes:
- Step 1 catalog from provider-qna lists at least `asset-1` and `asset-2` (KMB).
- Step 2 catalog from provider-manufacturing lists those PLUS `hk-traffic-incidents` and `mtr-patronage`.
- Step 3 returns a negotiation `@id` (state usually `REQUESTING` or `REQUESTED` immediately).
- Step 4 likewise returns an HKU negotiation `@id`.
- Step 5b returns a state — `FINALIZED` would be a policy-engine miss (real assignment risk). `TERMINATED` with `errorDetail` mentioning policy denial is the demonstrably-correct outcome.

If Step 5b is `FINALIZED`, the access policy on `academic-hk-def` is too permissive — flag this as the only known weak spot for the demo writeup.

---

## Task 9: Capture demo output for the assignment writeup

**Files:**
- Create: `/Users/lichudikang/MVD/specs/demo-output-2026-04-26.txt`

- [ ] **Step 1: Capture full output**

```bash
cd /Users/lichudikang/Projects/MinimumViableDataspace && ./demo-hk-flow.sh 2>&1 | tee /Users/lichudikang/MVD/specs/demo-output-2026-04-26.txt
```

- [ ] **Step 2: Sanity-check the output file**

```bash
wc -l /Users/lichudikang/MVD/specs/demo-output-2026-04-26.txt
grep -c '=====' /Users/lichudikang/MVD/specs/demo-output-2026-04-26.txt
```
Expected: at least 5 `=====` separator lines (one per demo step).

---

## Verification Checklist (run after all tasks)

- [ ] `kubectl --context k3d-edc-cluster get pods -n mvd` shows the original 16 pods + 5 new HKU pods, all `1/1 Running`.
- [ ] `curl -sS -X POST http://127.0.0.1/provider-manufacturing/cp/api/management/v3/assets/request -H 'Content-Type: application/json' -d '{}' | jq 'length'` returns 4.
- [ ] `kubectl --context k3d-edc-cluster get ingress -n mvd | grep -c hku` ≥ 2.
- [ ] `demo-hk-flow.sh` runs end-to-end without any 5xx error in the console.
- [ ] Output file `demo-output-2026-04-26.txt` exists and contains 5 `=====` markers.

---

## Known Risks (carry from spec §9)

1. **HKU credential JWT signature is stale** (we copied alice's signed JWT but switched the holder field in the outer JSON). If the runtime later validates the JWT signature against the holder DID, HKU contract negotiation will fail at the credential-presentation step. Mitigation if it bites: write a small Java utility using the issuer's private key (it's checked into `deployment/assets/issuer/`) to re-sign with HKU as `aud`/`sub`. Out of scope unless Task 8 step 5 fails for HKU.

2. **MTR/HK Traffic open-data URLs are HTTPS endpoints.** The EDC dataplane will forward them; if the public endpoint changes path or requires headers, the *transfer* step will fail (catalog/negotiation still work). For the demo, the live API call is incidental; the negotiation is the graded mechanic.

3. **Demo Step 5b might show `FINALIZED` instead of `TERMINATED`.** That means the academic-only policy isn't actually evaluated server-side — the assignment writeup should then note "policy-engine improvements left as future work" rather than claim a working enforcement.
