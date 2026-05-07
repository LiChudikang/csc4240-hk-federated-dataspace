# A Federated Hong Kong Transport Dataspace

> CSC4240 Data Spaces — Final Project
> The Chinese University of Hong Kong, Shenzhen
> Spring 2026

A federated Hong Kong transport dataspace built on the Eclipse Dataspace
Components (EDC) Minimum Viable Dataspace (MVD). Three semantic
participants (a transport-data provider, a commercial consumer, and a
dual-role academic participant) share data over DSP under
verifiable-credential-driven ODRL policies, with live DCP credential
issuance and S3-compatible push transfers wired against real upstream
data from `data.etabus.gov.hk`.

**Authors.** Li Chudikang (122040057) · Zhao Yuxuan (124090921)
**Instructor.** Prof. George Polyzos
**Final report.** [`final/report/report.pdf`](final/report/report.pdf) · [LaTeX source](final/report/report.tex)

---

## What this repository contains

This is a fork of
[eclipse-edc/MinimumViableDataspace](https://github.com/eclipse-edc/MinimumViableDataspace)
extended for the course project. The upstream EDC code is unchanged
where possible; project-specific contributions live alongside.

### Project contributions

| Area | Path | What |
|---|---|---|
| Custom ODRL Permission | [`extensions/dcp-impl/.../ParticipantTierFunction.java`](extensions/dcp-impl/src/main/java/org/eclipse/edc/demo/dcp/policy/ParticipantTierFunction.java) | Reads a `participantTier` claim from the holder's MembershipCredential, replacing an unsafe DID-substring check |
| Custom ODRL Duty | [`extensions/dcp-impl/.../AttributionDutyFunction.java`](extensions/dcp-impl/src/main/java/org/eclipse/edc/demo/dcp/policy/AttributionDutyFunction.java) | Enforces an attribution declaration on every pull |
| Function registration | [`extensions/dcp-impl/.../PolicyEvaluationExtension.java`](extensions/dcp-impl/src/main/java/org/eclipse/edc/demo/dcp/policy/PolicyEvaluationExtension.java) | Wires the two functions above into EDC's `PolicyEngine` |
| Third participant | [`deployment/hku.tf`](deployment/hku.tf), [`deployment/assets/credentials/k8s/hku/`](deployment/assets/credentials/k8s/hku/) | HKU controlplane / dataplane / identityhub / vault / Postgres + VCs |
| S3-PUSH dataplane | [`gradle/libs.versions.toml`](gradle/libs.versions.toml), [`launchers/dataplane/build.gradle.kts`](launchers/dataplane/build.gradle.kts) | EDC Technology-AWS S3 module 0.7.0 |
| Re-signed VCs | [`deployment/assets/credentials/k8s/<role>/membership-credential.json`](deployment/assets/credentials/k8s/) | `participantTier` claim baked in, JWT re-signed with issuer's Ed25519 key |
| Seed scripts | [`seed-hku.sh`](seed-hku.sh), [`seed-hk-extra.sh`](seed-hk-extra.sh), [`demo-hk-flow.sh`](demo-hk-flow.sh) | Bootstrap for the HK scenario after a fresh `terraform apply` |

### Course deliverables under [`final/`](final/)

| Path | What |
|---|---|
| [`final/report/report.pdf`](final/report/report.pdf) | 15-page final report (compiled) |
| [`final/report/report.tex`](final/report/report.tex) | LaTeX source |
| [`final/slides/final-presentation.pptx`](final/slides/final-presentation.pptx) | Class presentation deck |
| [`final/scripts/`](final/scripts/) | 8 reproducible end-to-end demo scripts + MinIO manifest |
| [`final/screenshots/`](final/screenshots/) | 24 captured-evidence files |
| [`final/diagrams/`](final/diagrams/) | Mermaid sources + rendered PNGs (used as Figures 1–3 in the report) |

---

## Scenario in one paragraph

**HK Transport Hub** (the data provider, internally three connectors:
`provider-qna`, `provider-manufacturing`, `provider-catalog-server`)
publishes Hong Kong transport datasets including a live KMB ETA feed
and a KMB route master pulled from `data.etabus.gov.hk`, plus snapshots
of HK Transport Department incidents and MTR patronage.

**HKTaxi** (the commercial consumer, connector `consumer`) is a
route-optimisation app holding a `MembershipCredential` with
`participantTier=COMMERCIAL`.

**HKU Transport Lab** (the dual-role academic participant, connector
`hku`) consumes KMB and traffic data for transit-equity research and
publishes its own research archive back into the federation. Its
credential carries `participantTier=ACADEMIC`.

The **Dataspace Issuer Service** acts as the trust anchor and
demonstrates live DCP credential issuance in Demo 5.

A single **Federated Catalog Node** crawls every provider on a
configurable interval and exposes a unified catalog containing 12
datasets across 4 providers.

---

## Demonstrations

Each demo captures its evidence to `final/screenshots/`.

| # | Script | What it shows |
|---|---|---|
| 1 | `demo-l2-transfer.sh` | DSP negotiation + HTTP-PULL of live KMB ETA |
| 2 | `demo-push-s3.sh` | `AmazonS3-PUSH` transfer into in-cluster MinIO |
| 3 | `demo-hku-dual-role.sh` + `demo-hku-as-consumer.sh` | HKU as provider; HKU as consumer |
| 4 | `federated-crawler.sh` | Federated catalog crawl across 4 providers |
| 5 | `demo-live-issuance.sh` | DCP issuance of a fresh `FoobarCredential` to HKU |
| 6 | `demo-custom-constraint.sh` | `participantTier` permission: positive + negative case |
| 7 | `demo-attribution-duty.sh` | Attribution duty: positive + negative case |

The full evaluation walkthrough lives in §7 of the
[report](final/report/report.pdf).

---

## Running the cluster

Prerequisites: Docker, [K3d](https://k3d.io/), Terraform, Helm,
`kubectl`, `jq`, `curl`, Java 17, Newman (for the Postman seed
collection).

```bash
# 1. Build runtime images and bring up the cluster
cd deployment
terraform init
terraform apply

# 2. Seed identity / participants / data
cd ..
./seed-k8s.sh
./seed-hku.sh
./seed-hk-extra.sh

# 3. (For Demo 2) deploy MinIO inside the cluster
kubectl apply -f final/scripts/minio-deploy.yaml

# 4. Run any demo
./final/scripts/demo-l2-transfer.sh
./final/scripts/demo-push-s3.sh
./final/scripts/demo-live-issuance.sh
# ...
```

For development workflows (running connectors from IntelliJ, debugging
a specific runtime, etc.) the upstream EDC documentation in
[`docs/`](docs/) and the original MVD operational notes still apply.

---

## Repository layout

```
csc4240-hk-federated-dataspace/        # fork of eclipse-edc/MinimumViableDataspace
├── extensions/dcp-impl/               # custom Java: ParticipantTierFunction,
│                                      #   AttributionDutyFunction,
│                                      #   modified PolicyEvaluationExtension
├── deployment/
│   ├── hku.tf                         # HKU Terraform module (new)
│   └── assets/credentials/k8s/hku/    # HKU verifiable credentials (new)
├── launchers/dataplane/               # build.gradle.kts: + AWS S3 dataplane
├── gradle/libs.versions.toml          # + edc-aws version
├── seed-hku.sh, seed-hk-extra.sh,     # HK-scenario bootstrap scripts
│   demo-hk-flow.sh
└── final/                             # CSC4240 deliverables
    ├── scripts/                       # 7 demo scripts + federated-crawler.sh
    │                                  #   + minio-deploy.yaml
    ├── screenshots/                   # 24 captured evidence files
    ├── diagrams/                      # scenario / architecture / pipeline (.mmd + .png)
    ├── slides/                        # final-presentation.pptx
    └── report/                        # report.tex compiled to report.pdf
```

---

## Upstream

This repository was forked from
[`eclipse-edc/MinimumViableDataspace`](https://github.com/eclipse-edc/MinimumViableDataspace)
at commit `eceb7cc`. The original `main` is preserved on the `upstream`
remote so that the EDC commit history remains accessible.

To resync against upstream:

```bash
git remote add upstream https://github.com/eclipse-edc/MinimumViableDataspace.git
git fetch upstream
```

The upstream EDC project README, which covers the canonical 2-connector
demo, is available in the repository history (see commits prior to
`eceb7cc`).

---

## License

Apache License 2.0, inherited from the upstream Eclipse Dataspace
Components project. See [`LICENSE`](LICENSE).
