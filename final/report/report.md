# A Federated Hong Kong Transport Dataspace Built on Eclipse Dataspace Components

**Course:** CSC4240 Data Spaces
**Instructor:** Prof. George Polyzos
**Institution:** The Chinese University of Hong Kong, Shenzhen
**Authors:** [Your Name] · [Partner Name]
**Date:** May 2026
**Code:** https://github.com/LiChudikang/csc4240-hk-federated-dataspace

---

## Abstract

> [TODO — write last, ~150–200 words]
>
> Sketch: HK transport data is fragmented across operators, regulators, and academia.
> We design and implement a federated dataspace based on the Eclipse Dataspace
> Components (EDC) Minimum Viable Dataspace (MVD), with three participants
> (a transport-data provider, a citizen consumer, and HKU acting in a dual role),
> a federated catalog node that crawls each provider, real-world data sources
> (KMB live ETA, KMB route master, HKU research data), policy enforcement via
> custom ODRL constraints and duties expressed as EDC `AtomicConstraintRuleFunction`s,
> and verifiable-credential-driven trust where every participant tier is asserted
> by the dataspace issuer rather than derived from identifiers. We demonstrate
> end-to-end pull and push transfers, federated catalog discovery, live DCP
> credential issuance, and policy rejection paths. All code is open-sourced.

---

## 1. Introduction

### 1.1 Motivation

Hong Kong transport data is unusually rich and unusually siloed. KMB, MTR, the
Transport Department, and the Observatory each publish open or paid feeds, but
each lives behind its own contract, its own rate limit, and its own access
discipline. Consumers — research groups, citizen-developer apps, regulators —
have to negotiate bilaterally with each one. There is no shared catalog, no
shared identity layer, and no enforceable usage policy beyond "you signed a
PDF". As traffic data grows in volume and as policy questions (privacy of
movement, attribution of derived analytics, downstream redistribution) get
sharper, this bilateral model does not scale.

A *dataspace* is the architectural answer the IDSA / Gaia-X / EDC community
have converged on: keep data sovereign at the producer, but standardise the
discovery, contracting, transfer, and enforcement layers so that a new
participant joins by speaking the protocol, not by signing N contracts.

### 1.2 Why a federated dataspace, and why EDC

We chose the Eclipse Dataspace Components (EDC) implementation because it is
the most actively-developed open-source stack today implementing the full IDSA
Reference Architecture in production-grade Java, including the Dataspace
Protocol (DSP) for negotiation/transfer and the Decentralised Claims Protocol
(DCP) for credential issuance. The Minimum Viable Dataspace (MVD) is the EDC team's
canonical example, and it ships with a Catalog Server, identity hubs, and a
standalone issuer service — exactly the building blocks our scenario needs.

### 1.3 Related dataspaces and applications

We position our work against three reference points:

- **Mobility Data Space (MDS), Germany** — a production federated mobility
  dataspace operated by DRM Datenraum Mobilität GmbH; closest to our domain
  but uses bilateral contract templates rather than fine-grained ODRL.
- **Catena-X** — automotive supply-chain dataspace; demonstrates the same
  EDC stack at much larger scale, with verifiable-credential-driven access.
- **Gaia-X / IDSA RAM 4.0** — the architectural reference our work conforms to.

We also briefly survey academic prototypes in transport-data sharing and
note that none of them implement IDSA-compliant policy enforcement.

> [TODO — find 3–5 citations: MDS site, Catena-X paper, IDSA RAM, EDC project page, one academic transport-data-sharing paper]

### 1.4 Contributions

This report describes the following concrete contributions:

1. A federated topology with three actors — `provider`, `consumer`, `hku` —
   where HKU plays a dual role (consumes KMB data, publishes its own research
   asset back into the dataspace).
2. A Federated Catalog node that periodically crawls every provider connector
   and exposes a unified catalog to consumers.
3. Real-world data integration: live KMB ETA JSON pulled from the public
   `data.etabus.gov.hk` endpoint, KMB route master, HKU traffic-volume CSV.
4. **VC-claim-driven access control**: a custom ODRL constraint
   (`participantTier`) backed by an EDC `AtomicConstraintRuleFunction` that
   reads tier from a *MembershipCredential* claim signed by the dataspace
   issuer, rather than substring-matching on the holder DID.
5. An ODRL **Duty** (`AttributionDutyFunction`) that the consumer must satisfy
   on every pull, demonstrating obligation-style policies.
6. Live DCP credential issuance: HKU obtains a fresh `FoobarCredential`
   on-demand from the issuer service, exercising the
   `CREATED → REQUESTING → REQUESTED → ISSUED` state machine.
7. Push transfer to S3-compatible storage (MinIO deployed in-cluster),
   exercising the `AmazonS3-PUSH` transfer type.
8. Reproducible deployment: K3d + Terraform + Helm; six end-to-end demo
   scripts that exercise every claim made above.

### 1.5 Report outline

§2 surveys background concepts. §3 presents the design of the dataspace.
§4 describes the system architecture and deployment topology. §5 walks through
the implementation, focusing on the custom EDC extensions written for this
project. §6 documents the data sources. §7 evaluates the system through seven
end-to-end demonstrations. §8 discusses problems overcome and limitations.
§9 concludes and lists future work. §10 points to the public code repository.

---

## 2. Background

### 2.1 Dataspace concepts

A *dataspace* in the IDSA sense is a federation of independent participants
who share data under machine-enforceable usage policies. Three properties
distinguish it from a data platform:

- **Sovereignty.** Data stays at the producer; access is brokered, not copied.
- **Decentralised identity.** Participants prove who they are via DIDs and
  Verifiable Credentials issued by trusted authorities, not via central IAM.
- **Policy enforcement at the connector.** Usage policies travel with the
  data and are checked by the consumer's connector.

### 2.2 Eclipse Dataspace Components

EDC is a modular Java framework. The pieces relevant to this project:

- **Connector (Control Plane + Data Plane)** — speaks DSP, negotiates contracts,
  orchestrates transfers.
- **Catalog Server** — a connector specialised to act as a federated catalog.
- **Identity Hub** — stores Verifiable Credentials for a participant; speaks
  DCP to credential issuers and to verifiers.
- **Issuer Service** — a standalone service that issues VCs using the DCP
  state machine.

### 2.3 Protocols

- **DSP (Dataspace Protocol)** — HTTP-based; defines `CatalogRequest`,
  `ContractRequest`, `TransferRequest` and their state machines.
- **DCP (Decentralised Claims Protocol)** — used both for credential
  *issuance* (this project demonstrates it live) and for credential
  *presentation* during contract negotiation.
- **ODRL (Open Digital Rights Language)** — JSON-LD vocabulary used to
  express policies as a triple of `permission`, `prohibition`, `duty`,
  each with optional `constraint`s.

### 2.4 Trust model: DIDs and VCs

Every participant has a `did:web` identifier resolvable to a DID document
hosting the participant's public key. The dataspace issuer
(`did:web:dataspace-issuer-service%3A10016:issuer`) issues
`MembershipCredential`s naming the participant and a tier
(`COMMERCIAL`, `ACADEMIC`, `PROVIDER`); these credentials are presented
as JWT VPs during DSP negotiation.

> Figure 1: Trust chain — Issuer signs MembershipCredential → Holder presents
> VP at negotiation time → Provider's PolicyEngine evaluates ODRL constraints
> against VC claims. **[FIGURE TO PRODUCE]**

---

## 3. Design

### 3.1 Goals and non-goals

**Goals.** Show the full IDSA loop with real data and at least one of each
of: pull transfer, push transfer, dual-role participant, federated catalog
discovery, live credential issuance, custom permission constraint, custom
duty.

**Non-goals.** Production-grade hardening (HTTPS termination, KMS-backed
keys, persistent storage backups), high availability, large-scale
performance benchmarks. These are listed in §9.

### 3.2 Actors

| Actor | Role | DID |
|---|---|---|
| `provider` | Publishes KMB live ETA + route master | `did:web:provider-identityhub%3A7083:provider` |
| `consumer` | Citizen-app developer; pulls KMB data | `did:web:consumer-identityhub%3A7083:consumer` |
| `hku` | Dual role: consumes KMB data, publishes HKU traffic-volume research asset | `did:web:hku-identityhub%3A7083:hku` |
| `provider-catalog-server` | Federated Catalog Node; crawls each provider | (catalog-server's own DID) |
| `dataspace-issuer-service` | Trust anchor; issues MembershipCredentials | `did:web:dataspace-issuer-service%3A10016:issuer` |

> Figure 2: Actor map with arrows for catalog crawl / negotiation / transfer
> directions. **[FIGURE TO PRODUCE]**

### 3.3 Data sources

| Asset | Owner | Source | Format | Size |
|---|---|---|---|---|
| KMB live ETA | provider | `data.etabus.gov.hk/v1/transport/kmb/eta/...` | JSON | ~350 KB / poll |
| KMB route master | provider | `data.etabus.gov.hk/v1/transport/kmb/route/` | JSON | ~250 KB |
| HKU traffic-volume study | hku | local CSV (synthetic but realistic) | CSV | ~few KB |
| > [TODO: confirm exact list — we have 10 assets total per crawler output] | | | | |

### 3.4 Trust architecture

Three credential types drive policy decisions:

- **`DataProcessorCredential`** (preloaded) — gates whether a holder may even
  participate in the dataspace.
- **`MembershipCredential`** (preloaded; carries `participantTier` claim) —
  drives the custom permission constraint.
- **`FoobarCredential`** (issued live during the demo) — exercises the DCP
  issuance flow.

### 3.5 Federated topology

A single Catalog Server crawls both `provider-qna` (KMB feeds) and the HKU
provider-side connector on a periodic schedule, indexing their offers. A
consumer queries the Catalog Server once and sees the union.

> Figure 3: Federated topology with crawl arrows and refresh interval.
> **[FIGURE TO PRODUCE]**

---

## 4. System Architecture

### 4.1 Component view

> Figure 4: Component diagram — Control Planes, Data Planes, Identity Hubs,
> Issuer Service, Catalog Server, Postgres, MinIO, Vault — with their port
> numbers and the protocols on each edge. **[FIGURE TO PRODUCE — adapt from
> existing slides/architecture asset]**

### 4.2 Deployment topology

The dataspace runs on a local K3d cluster (single node), provisioned via
Terraform + Helm. Each participant gets:

- a Control Plane pod (DSP HTTP, management API)
- a Data Plane pod (HTTP-PULL, HTTP-PUSH, S3-PUSH dataplane)
- an Identity Hub pod (DCP, VC storage)
- a Postgres backing store (shared per role for simplicity)

Cluster-internal DNS (`hku-identityhub`, `dataspace-issuer-service`, …)
resolves the `did:web` identifiers; an `ingress-nginx` exposes selected
endpoints at `http://127.0.0.1/<actor>/<role>/...` for the demo scripts.

### 4.3 Flows

> Figure 5: Sequence — Catalog discovery → Contract negotiation
> (with VP presentation) → Transfer (pull) → EDR exchange → Data fetch.
> **[FIGURE TO PRODUCE]**

> Figure 6: Sequence — DCP credential issuance:
> Holder POST /credentials/request → IdentityHub state machine
> CREATED → REQUESTING → REQUESTED → ISSUED → VC stored in wallet.
> **[FIGURE TO PRODUCE]**

---

## 5. Implementation

We deliberately *describe* code in this section rather than reproduce it;
the public repository (§10) contains the full sources.

### 5.1 Stock MVD baseline (Part 1 of the assignment)

Before extending the MVD, we ran the canonical 2-connector setup
(`provider-qna`, `consumer`) end-to-end: catalog discovery →
contract negotiation → HTTP-PULL transfer → and a separate HTTP-PUSH
transfer. This validated our local toolchain and gave us reference logs
to compare our extensions against.

### 5.2 Custom EDC extensions

Our policy contributions live under `extensions/dcp-impl` as **two new
`AtomicConstraintRuleFunction` implementations plus the registration glue**
that hooks them into EDC's `PolicyEngine`:

- **`ParticipantTierFunction`** — an `AtomicConstraintRuleFunction<Permission>`
  bound to the ODRL property `participantTier`. On each policy evaluation it
  receives the `ParticipantAgent` (built from the presented VP), looks up
  *MembershipCredential* VCs in the agent's claims, extracts the
  `participantTier` field, and matches it against the rightOperand. Replaces
  the original DID-substring-match approach (see §8 problem 1).
- **`AttributionDutyFunction`** — an `AtomicConstraintRuleFunction<Duty>`. Bound
  to a duty whose left operand is `attribution`; the consumer is required to
  declare an attribution string before each pull, and the function verifies
  the required marker is present. Demonstrates obligation-style ODRL.
- **`PolicyEvaluationExtension` (modified)** — the existing dcp-impl
  registration extension was extended to register the two functions above
  with the appropriate policy scopes.

For DCP issuance, we did *not* write a new attestation source: EDC ships a
`demo` attestation factory (`DemoAttestationSource`/`DemoAttestationsExtension`,
upstream Cofinity-X code) that we leverage as-is. Our contribution there is a
data-side fix — inserting a row in `membership_attestations` for HKU so the
attestation pipeline does not NPE when HKU requests a credential (see §8
problem 4).

> Figure 7: Class diagram of the custom policy functions and where they plug
> into EDC's `PolicyEngine`. **[FIGURE TO PRODUCE]**

### 5.3 Verifiable Credential lifecycle

Two paths coexist:

- **Preloaded VCs** (used for routine demos): each participant's identity hub
  is seeded at deploy time from a Helm configmap containing
  `DataProcessorCredential` and `MembershipCredential` JWTs signed by the
  issuer.
- **Live issuance** (Demo 5): HKU sends a `CredentialRequestMessage` via DCP;
  the issuer service evaluates an attestation pipeline (Postgres lookup +
  the `demo` source), signs a fresh `FoobarCredential` JWT, and pushes it
  back to HKU's identity hub.

The preloaded MembershipCredential JWTs were re-signed with the issuer's
Ed25519 private key to inject the `participantTier` claim; the resulting
tokens are checked into `deployment/assets/credentials/k8s/<role>/membership-credential.json`
for each participant.

### 5.4 Federated Catalog crawler

The Catalog Server is configured (via `edc.catalog.cache.execution.period.seconds`)
to crawl each provider connector at a fixed interval. Targeted DSP endpoints are
listed in a configmap; the server materialises a unified catalog and exposes it
to consumers via the same DSP catalog endpoint.

### 5.5 Push transfer to S3 (MinIO)

We deployed a MinIO stateful service in-cluster with a single bucket
(`edc-push-bucket`) and added the `data-plane-aws-s3` EDC extension
(version 0.7.0; see §8 problem 5) to the dataplane build. The demo script
issues a transfer with `transferType: "AmazonS3-PUSH"` and a
`dataDestination` that includes `endpointOverride`, `accessKeyId`,
and `secretAccessKey`. The provider's dataplane fetches the upstream
KMB JSON and writes it to the MinIO bucket.

### 5.6 ODRL policy expressions

Two non-trivial policies were authored:

- A *Permission* with an ODRL `Constraint` bound to `participantTier == COMMERCIAL`
  (or `ACADEMIC`), evaluated by `ParticipantTierFunction`.
- A *Duty* requiring an `attribution` declaration, evaluated by
  `AttributionDutyFunction` on every contract use.

Both are attached to assets at offer-creation time via the management API.

---

## 6. Data

> [TODO — flesh this section out with: exact KMB endpoints, polling cadence,
> sample fields, licence, and a small table of "10 assets currently visible
> in the federated catalog" pulled from `screenshots/14-federated-crawler.txt`.]

| # | Asset name | Owner connector | Source | Format |
|---|---|---|---|---|
| 1 | kmb-eta-live | provider-qna | data.etabus.gov.hk | JSON |
| 2 | kmb-route-master | provider-qna | data.etabus.gov.hk | JSON |
| … | | | | |

---

## 7. Evaluation

We exercise the system through seven scripted demonstrations, all under
`final/scripts/`. Each captures evidence to `final/screenshots/` so results
are reproducible after the fact.

### 7.1 Demo 1 — Negotiation and HTTP-PULL transfer

`demo-l2-transfer.sh`. Consumer fetches the catalog from the Catalog Server,
selects the KMB live-ETA offer, negotiates a contract, requests a transfer
in pull mode, exchanges an EDR, and finally pulls live KMB JSON from the
provider's data plane.
**Evidence:** `01-catalog.json`, `02-negotiation-finalized.json`,
`03-transfer-started.json`, `04-edr.json`, `05-real-kmb-data.json`.

### 7.2 Demo 2 — Push transfer to S3 (MinIO)

`demo-push-s3.sh`. Same negotiation but `transferType: AmazonS3-PUSH`. The
provider's dataplane writes a 352 KB KMB JSON object into the MinIO bucket.
**Evidence:** `22-s3-push-bucket-listing.json`, `23-s3-push-evidence.txt`.

### 7.3 Demo 3 — HKU dual role

`demo-hku-dual-role.sh` + `demo-hku-as-consumer.sh`. HKU first publishes
its research asset, then a different consumer (`alice`) negotiates with
HKU, gets an EDR, and pulls the data; then HKU itself acts as a consumer
and pulls KMB data from `provider-qna`.
**Evidence:** `13a–d-*.json`, `16-*-catalog.json`, `17-*-agreement.json`,
`18-*-data-pulled.json`.

### 7.4 Demo 4 — Federated catalog crawl

`federated-crawler.sh`. The Catalog Server's unified catalog is queried
once; the result lists offers from both `provider-qna` and `hku`,
demonstrating that the crawler ran and merged.
**Evidence:** `14-federated-crawler.txt`.

### 7.5 Demo 5 — Live DCP credential issuance

`demo-live-issuance.sh`. HKU's identity hub initiates a credential request
to the issuer; the DCP state machine progresses
`CREATED → REQUESTING → REQUESTED → ISSUED` (verified by tailing
identityhub logs); the resulting JWT is decoded to confirm `iss=issuer DID`,
`sub=hku DID`, `iat=today`, `vc.type` includes `FoobarCredential`.
**Evidence:** `24-live-credential-issuance.txt`.

### 7.6 Demo 6 — Custom Permission constraint (`participantTier`)

`demo-custom-constraint.sh`. Two flows:

- A consumer with `MembershipCredential` carrying `participantTier=COMMERCIAL`
  succeeds in pulling a `commercial-only` asset.
- HKU (carrying `participantTier=ACADEMIC`) is rejected with an explicit
  policy-violation message when trying the same asset.

This proves the rule is reading the VC claim, not the DID.
**Evidence:** `08-policy-rejection.json`, `15-custom-constraint-rejection.json`,
`17-hku-academic-agreement.json` (positive case for ACADEMIC asset).

### 7.7 Demo 7 — Attribution Duty

`demo-attribution-duty.sh`. The asset's policy carries a duty:
"on use, log attribution to the audit endpoint". When the consumer
satisfies the duty, the pull succeeds; when it does not, the pull is
rejected.
**Evidence:** `19-attribution-duty-offer.json`,
`20-attribution-success.json`, `21-attribution-rejection.json`.

> Figure 8: Screenshot grid of the seven demos' terminal outputs.
> **[FIGURE TO PRODUCE — already have raw screenshots, just compose grid.]**

---

## 8. Discussion

### 8.1 Problems overcome

1. **Tier-from-DID was not real policy enforcement.** Our first version
   matched on substrings of the holder DID. This worked but was a lie — the
   provider was trusting the *name* of the participant, not a credential
   issued about it. Replaced with a VC-claim lookup (§5.2,
   `ParticipantTierFunction`), which required injecting the tier claim into
   the preloaded MembershipCredentials and re-signing them.
2. **DCP credential request body schema.** First attempts using
   `credentialType` returned HTTP 400. Reading the EDC end-to-end test
   (`CredentialIssuanceEndToEndTest.java`) revealed the correct shape uses
   `type` plus `id` referencing a credential definition.
3. **Issuer participant context stuck in `CREATED`.** The seeded issuer
   participant context started inactive; credential requests failed with
   500 until activated via `POST /participants/{ctx}/state?isActive=true`.
4. **`AttestationPipelineImpl.evaluate` NPE for HKU.** The default seed
   only registered the consumer in `membership_attestations`; the attestation
   source returned null for HKU, NPEing inside the pipeline. Inserted an
   HKU row with `membership_type=3`.
5. **EDC AWS S3 module versioning.** `data-plane-aws-s3:0.14.1` does not
   exist; EDC Technology-AWS modules are versioned independently. Pinned
   to 0.7.0 and added a `edc-aws` version line in `libs.versions.toml`.
6. **`participant_context_id` is a legacy DID.** The issuer's Postgres still
   keys some tables on `did:web:localhost%3A10100` from a pre-k8s seed,
   not on the current `did:web:dataspace-issuer-service%3A10016:issuer`.
   Demos that touch the issuer admin API have to base64 the legacy DID.
7. **Custom ODRL constraints cannot be pure JSON.** Out of the box, EDC
   only ships a couple of built-in constraint functions; a property like
   `participantTier` requires a Java extension that registers the function
   with `PolicyEngine.registerFunction(...)`. This is documented in EDC
   but worth flagging as a real limitation for adopters who hoped policy
   was config-only.

### 8.2 Limitations

- All endpoints are plain HTTP; no TLS termination, no mTLS, no
  certificate-based DID verification.
- Single-region, single-node K3d. No HA, no backups.
- All keys live in plain configmaps and Vault dev mode.
- Only one "real" upstream is wired (KMB); MTR/HKO weather were planned
  but stayed at the design stage.
- The Duty (§5.6 attribution) is checked synchronously by the consumer
  connector; real deployments would want an audit log on a separate trust
  domain.

### 8.3 Lessons learned

- **EDC's E2E tests are the most reliable spec.** When the docs and the
  code disagreed, the tests (`tests/end2end/...`) were always right.
- **Credential plumbing is the time sink.** Policy logic took hours;
  getting the right VC into the right hub at the right time took days.
- **`did:web` works locally if your DNS does.** Cluster-internal DNS plus
  consistent `did:web:<service>%3A<port>:<id>` resolution lets us drop
  `did:key` entirely.

---

## 9. Conclusion and Future Work

### 9.1 Conclusion

We have built and demonstrated a federated Hong Kong transport dataspace
that exercises every capability the assignment lists for Part 2 — three
participants with a dual-role actor, real data, federated catalog,
advanced policy enforcement — plus elements of the optional Part 3
(custom contracts via custom ODRL constraints and duties). All claims
are backed by reproducible scripts and captured evidence.

### 9.2 Future work

- **Production hardening** — TLS / mTLS everywhere, KMS-backed keys,
  Postgres backups, Helm chart values for prod.
- **More providers** — wire HKO weather, MTR (or a synthetic MTR feed if
  no API is available), and a citizen-reporting feed.
- **Marketplace layer** — pricing, settlement, and a UI on top of the
  catalog (Part 3 of the assignment).
- **Consent revocation** — surface a revocation flow for VCs and verify
  that connectors honour it.
- **Observability** — Prometheus + Grafana dashboards on the connector
  and dataplane metrics already exposed by EDC.
- **More VC types** — KYC, operating-licence, region-of-incorporation;
  let policies stack constraints on multiple VCs.

---

## 10. Code repository

The full source is at:

**https://github.com/LiChudikang/csc4240-hk-federated-dataspace**

The repository is a fork of `eclipse-edc/MinimumViableDataspace` on `main`
(originally pushed as `csc4240-final`); the upstream remains accessible as
the `upstream` remote for traceability. Layout:

```
csc4240-hk-federated-dataspace/      # fork of eclipse-edc/MinimumViableDataspace
├── extensions/dcp-impl/             # custom Java: ParticipantTierFunction,
│                                    #   AttributionDutyFunction,
│                                    #   modified PolicyEvaluationExtension
├── deployment/
│   ├── hku.tf                       # HKU Terraform module (new)
│   └── assets/credentials/k8s/hku/  # HKU VCs (new)
├── launchers/dataplane/             # build.gradle.kts: + AWS S3 dataplane
├── gradle/libs.versions.toml        # + edc-aws version
└── final/                           # CSC4240 deliverables
    ├── scripts/                     # 8 demo scripts + federated-crawler.sh
    │                                #   + minio-deploy.yaml
    ├── screenshots/                 # 24 captured evidence files
    ├── diagrams/                    # scenario / architecture / pipeline (mmd + png)
    ├── slides/                      # final-presentation.pptx
    └── report/                      # this report + figures
```

---

## References

> [TODO — fill in once we lock the citation style. Candidates:]
>
> 1. IDSA Reference Architecture Model 4.0
> 2. Eclipse Dataspace Components project page
> 3. EDC MVD repo
> 4. Mobility Data Space (MDS), Germany — public website
> 5. Catena-X technical paper / whitepaper
> 6. Gaia-X Trust Framework
> 7. ODRL Information Model 2.2 — W3C Recommendation
> 8. Decentralized Identifiers (DIDs) v1.0 — W3C Recommendation
> 9. KMB ETA open-data documentation (data.gov.hk)
