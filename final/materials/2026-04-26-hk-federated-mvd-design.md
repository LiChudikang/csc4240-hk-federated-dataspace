# HK-Federated MVD Extension — Design

**Date:** 2026-04-26
**Authors:** Li Chudikang, Zhao Yuxuan
**Related proposal:** `/Users/lichudikang/MVD/proposal.pdf`

## 1. Goal

Extend the running MVD k3d cluster to demonstrate the proposal's "Federated Dataspace" vision, **using Hong Kong open transport data** instead of the proposal's Shenzhen examples. The deliverable is a working dataspace where two distinct consumer participants negotiate two distinct policy regimes (commercial vs academic) with a Hong Kong transport data provider.

## 2. Scope

### In scope
- One additional **independent consumer** (HKU Transport Lab) with its own DID, identityhub, vault, postgres, controlplane, dataplane.
- Replacing all 4 demo assets with **Hong Kong open data** (KMB ETA is a real public API; the other three are realistic stand-ins from data.gov.hk).
- Two policy classes: **Commercial** (HKD/call, no resale) and **Academic** (free, must cite).
- Updated Postman seed collection covering the new assets, policies, and the HKU consumer flow.
- Demo script showing: catalog discovery → contract negotiation (×2 different contracts) → data transfer (pull + push) → policy enforcement.

### Out of scope
- Splitting Bob into multiple provider DIDs (kept as one "HK Transport Hub" entity that aggregates several agencies — matches data.gov.hk's real architecture).
- Renaming K8s resource names. K8s objects keep `alice`/`bob`/`consumer`/`provider-*` names. Only **business identity** (DIDs, displayed names, credentials, postman) switches to HK.
- Real S3 push transfer (push-mode demo can use HTTP destination; S3 setup adds infra dependency without changing the demo's pedagogical value).
- Privacy mechanisms (k-anonymity, differential privacy) from the proposal — these are data-prep concerns, not dataspace concerns.

## 3. Participants

| Business name | Role | Connector(s) | DID |
|---|---|---|---|
| **HK Transport Hub** | Provider | bob: catalog-server + qna + manufacturing | `did:web:provider-identityhub%3A7083:hk-transport` |
| **HKTaxi** | Consumer (commercial) | alice (renamed at DID layer) | `did:web:consumer-identityhub%3A7083:hktaxi` |
| **HKU Transport Lab** | Consumer (academic) | **NEW**: `hku-*` cluster of pods | `did:web:hku-identityhub%3A7083:hku` |
| **HK Dataspace Issuer** | Identity issuer | dataspace-issuer (unchanged) | `did:web:dataspace-issuer-service%3A10016:issuer` |

## 4. The 4 Hong Kong Assets

Published by the HK Transport Hub (Bob) — split across the existing 3 provider connectors:

| # | Asset | Hosted on connector | Real HK data source | Format | Notes |
|---|---|---|---|---|---|
| 1 | HK Traffic Incidents | provider-qna | data.gov.hk: `td_tis_jt_traffic_incident` | CSV | Stand-in via static fixture |
| 2 | HK Real-Time Journey Time | provider-qna | data.gov.hk: HKeMobility journey-time XML | JSON Stream | Stand-in via static fixture |
| 3 | **KMB Bus Real-Time ETA** | provider-manufacturing | `https://data.etabus.gov.hk/v1/transport/kmb/eta/{stop}/{route}/{service_type}` | REST API | **Live public API, no auth** — the demo's hero asset |
| 4 | MTR Station Patronage | provider-manufacturing | data.gov.hk: MTR monthly traffic | Parquet (delivered as CSV in demo) | Stand-in via static fixture |

The provider-catalog-server publishes a federated catalog that links to all 4.

## 5. The 2 Policy Classes

| Policy | Applied to assets | Constraints encoded in ODRL |
|---|---|---|
| **Commercial** | 1, 2, 3 (when consumed by HKTaxi) | `permission`: USE; `duty`: pay HKD 0.05/call (documented, not enforced on-chain); `prohibition`: resale; `constraint`: data retention ≤ 7 days |
| **Academic** | 1, 4 (when consumed by HKU) | `permission`: USE, ANALYZE; `duty`: cite source `attribution=HK Transport Hub`; `constraint`: aggregate-only `n>=30` |

In MVD/EDC, this is implemented as 2 PolicyDefinitions referenced by 2 ContractDefinitions, with consumer-side selection driven by membership credentials issued by the dataspace issuer.

## 6. Demo Flow

1. **Issuer pre-seeds 2 holders**: HKTaxi (commercial-tier credential), HKU (academic-tier credential).
2. **HKTaxi** fetches the federated catalog from `provider-catalog-server`, sees Asset 3 (KMB ETA), negotiates a Commercial contract, then pulls real KMB ETA data via HTTP.
3. **HKU** fetches the same catalog, sees Asset 1 (Traffic Incidents) and Asset 4 (MTR Patronage), negotiates an Academic contract, then receives a push transfer of Asset 4 to a target HTTP endpoint.
4. **Negative test**: HKTaxi tries to negotiate Asset 4 → policy rejects (academic-only).

## 7. Files Changed / Added

### Modified (in `Projects/MinimumViableDataspace/`)
- `deployment/assets/credentials/k8s/consumer/membership-credential.json` — change holder to HKTaxi.
- `deployment/assets/credentials/k8s/consumer/dataprocessor-credential.json` — same.
- `deployment/assets/credentials/k8s/provider/membership-credential.json` — change holder to HK Transport Hub.
- `deployment/assets/credentials/k8s/provider/dataprocessor-credential.json` — same.
- `deployment/assets/issuer/did.k8s.json` — issuer service endpoint metadata (HK branding only).
- `deployment/postman/MVD K8S.postman_environment.json` — add `HKU_CS_URL`, `KMB_LIVE_API_URL`.
- `deployment/postman/MVD.postman_collection.json` — replace Shenzhen Seed requests with HK requests (4 new assets, 2 new policies, 2 new contract definitions).

### New
- `deployment/hku.tf` — terraform module instantiation for HKU consumer (clones `consumer.tf`'s shape; resource name prefix `hku-`, new vault/postgres/identityhub). Internal Service ports stay at 7083/8082 etc. (different ClusterIP per Service — no in-cluster collision). Only ingress paths and the optional NodePorts need new values.
- `deployment/postman/hku-seed.json` — HKU-specific seed steps (create participant in HKU's identityhub, request credential from issuer, store credential).
- `seed-hku.sh` — wrapper that runs the existing `seed-k8s.sh` then the HKU additions.

### Untouched
- All Java code in `extensions/`, `launchers/`, `tests/` — no rebuild needed.
- The 5 docker images currently in the local cache.
- Cluster-level resources (k3d, ingress-nginx).

## 8. Verification Checklist

- [ ] `kubectl get pods -n mvd` shows existing 16 pods + 5 new `hku-*` pods (controlplane, dataplane, identityhub, postgres, vault), all Ready.
- [ ] `seed-k8s.sh` and `seed-hku.sh` complete without 4xx/5xx errors.
- [ ] HKTaxi can pull KMB ETA via the catalog→negotiation→transfer flow, and the response body contains real KMB stop/route data.
- [ ] HKU can negotiate an academic contract for MTR patronage; the resulting transfer succeeds.
- [ ] HKTaxi attempting to negotiate Asset 4 (MTR patronage, academic-only) is rejected by the policy engine.

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| HKU ingress paths colliding with existing routes | Reserve `/hku/cs/...` (consumer-services), `/hku-identityhub/...`, `/hku-did/...` paths in advance. Documented in `hku.tf`. |
| KMB live API rate-limits or goes down during demo | Cache one canned KMB response in `deployment/postman/fixtures/kmb-eta-canned.json` as fallback for the assignment demo. |
| Adding an HKU identityhub means a new DID-web entry in CoreDNS | k3d's CoreDNS is configurable via the existing host-aliases mechanism the project already uses for `consumer-identityhub` etc.; extending it is one terraform line. |
| Seed-script execution order: HKU steps need the issuer to already exist | `seed-hku.sh` calls `seed-k8s.sh` first (composition, not parallel). |
