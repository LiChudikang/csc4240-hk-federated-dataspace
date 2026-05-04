# Background Knowledge Refresher

**Use this the day before the presentation. ~30 minutes of reading total.**

The list below is filtered down to what you'll actually be saying out loud, plus what's most likely to come up in Q&A. Skip anything you already feel solid on.

---

## Tier 1 · Must-know (you'll be saying these)

### 1. Verifiable Credential (VC)

A VC is a tamper-proof, issuer-signed claim about a subject. In our project it's stored as a JWT, so the structure is:

```
header.payload.signature
```

The payload contains a `vc` object with these fields:
- `@context` — JSON-LD vocabulary references
- `type` — array, typically `["VerifiableCredential", "MembershipCredential"]`
- `credentialSubject` — the actual claims, e.g. `{ "id": "did:web:hku-...", "participantTier": "ACADEMIC" }`
- `issuer` — the issuer DID
- `issuanceDate`

Standard JWT claims (`iss`, `sub`, `iat`, `jti`) wrap this. The `iss` is the issuer DID, `sub` is the holder DID.

**Key point**: VCs are signed by the issuer with their private key. Anyone with the issuer's DID document can verify the signature without contacting the issuer. That's the "decentralized" in DCP.

### 2. DID and DID document

DID = Decentralized Identifier. Format: `did:method:identifier`. We use `did:web`.

For us:
- Issuer: `did:web:dataspace-issuer-service%3A10016:issuer`
  - `%3A` is URL-encoded `:` (port)
  - resolves to `http://dataspace-issuer-service:10016/issuer/.well-known/did.json`
- HKU: `did:web:hku-identityhub%3A7083:hku`

The DID document at `/.well-known/did.json` contains:
- `verificationMethod` — list of public keys with their `kid` (key id)
- `service` — endpoints (e.g. CredentialService for DCP)

When you receive a JWT signed by an issuer, you:
1. Read the `kid` from the JWT header
2. Resolve the DID document
3. Find the matching `verificationMethod`
4. Verify the signature with that public key

### 3. DSP vs DCP — they are different

| Protocol | Carries | State machines |
|---|---|---|
| **DSP** (Dataspace Protocol) | catalog requests, contract negotiation, transfer process | INITIAL → REQUESTED → AGREED → FINALIZED · STARTED → COMPLETED |
| **DCP** (Decentralized Claims Protocol) | credential issuance + presentation | CREATED → REQUESTING → REQUESTED → ISSUED |

They use the same HTTP transport but serve completely different purposes. DSP is the data-side conversation. DCP is the trust-side conversation. Mixing them up was the single biggest debugging cost in our project (week 6).

### 4. ODRL — Open Digital Rights Language

A W3C standard policy language. An ODRL rule has three parts:

- **Permission** — "you may do X if [constraint]"
- **Prohibition** — "you may NOT do X"
- **Duty** — "if you do X, you must also do Y"

A constraint has the form:

```json
{
  "leftOperand": "ParticipantTier",
  "operator": "eq",
  "rightOperand": "ACADEMIC"
}
```

In EDC, the policy engine evaluates this constraint by looking up a Java function registered for `leftOperand="ParticipantTier"`. That's exactly what `ParticipantTierFunction` does on slide 13.

### 5. EDR — Endpoint Data Reference

After contract negotiation finalizes, the consumer doesn't get the data directly. They get an EDR — a temporary URL plus a signed JWT — that authorizes a single fetch. Effectively:

```json
{
  "endpoint": "http://provider-qna-dataplane:11002/api/public",
  "authType": "bearer",
  "authorization": "eyJ...JWT...",
  "type": "https://w3id.org/idsa/v4.1/HTTP"
}
```

The JWT is short-lived, audience-bound (only valid for that consumer), and scoped to that one transfer. This is what makes pull mode secure — even if someone intercepts the URL, they can't replay it.

### 6. State machines you'll mention

**Contract negotiation** (DSP):
`INITIAL → REQUESTED → AGREED → FINALIZED` (or `TERMINATED` on policy failure)

**Transfer process** (DSP):
`STARTED → COMPLETED` (with intermediate REQUESTED, PROVISIONED, etc.)

**Credential request** (DCP):
`CREATED → REQUESTING → REQUESTED → ISSUED` (the slide 12 demo)

When asked "how do you know it worked", the answer is always "I polled the state until it hit the terminal state and saw FINALIZED / COMPLETED / ISSUED."

### 7. EDC participant components

Every participant in our cluster has four pods:
- **control plane** — REST API for catalog/contract/transfer management
- **data plane** — actually moves the bytes (HTTP source, S3 sink, etc.)
- **identity hub** — stores VCs, presents them on demand, runs DCP state machine
- **vault** — stores keys (HashiCorp Vault in our case)

Plus a postgres for persistent state. So 5 pods × 5 participants ≈ 25 (we have 21 because some share components).

### 8. Ed25519 / EdDSA

Edwards-curve Digital Signature Algorithm using curve 25519. It's what the issuer uses to sign all our VCs. Faster than RSA, smaller keys, modern. You don't need to know the math — just know:
- The issuer holds the Ed25519 private key
- The DID document publishes the corresponding public key
- Every VC is verifiable end-to-end without contacting the issuer

---

## Tier 2 · Likely Q&A (be ready to defend)

### Why participantTier on the membership credential, instead of a separate credential?

Two reasons. First, every participant already has a MembershipCredential for the dataspace, so we don't add a new credential type. Second, tier is conceptually a *property of membership* — you're an academic member or a commercial member. It's not a separate fact about you.

### Why string-matching DIDs was wrong

It assumed DID syntax would always carry semantic information. But DIDs are supposed to be opaque identifiers. A new participant joining the dataspace shouldn't need to negotiate a magic substring just to be classified. Reading an issuer-signed claim is the standards-aligned way.

### How is the federated crawler different from a centralized catalog?

A centralized catalog would dump everyone's assets into one database and serve queries from there. Our crawler doesn't store anything — it queries each provider's catalog endpoint live, in parallel, and assembles a view. The actual data still lives at each provider. That distinction is the difference between Google (federated index) and a centralized data lake.

### What's the difference between Push and Pull at the dataplane level?

In **Pull**, the provider's data plane exposes a public endpoint (with token-bound auth via the EDR), and the consumer makes the GET. In **Push**, the provider's data plane makes an outbound request to a destination the consumer specified (S3 bucket, HTTP sink). The data flow direction is reversed. EDC supports both because some workloads (large files, bulk transfer) are easier to push to object storage than to expose as endpoints.

### Why MinIO and not real S3?

MinIO is S3-compatible — same API, same protocols. It runs in our k3d cluster as a single pod. Using it lets us prove the S3 transferType works without depending on AWS credentials or network access. The same dataplane code would work against real S3 by changing one config value.

### What does the AtomicConstraintRuleFunction interface look like?

```java
public interface AtomicConstraintRuleFunction<R extends Rule, C extends PolicyContext> {
    boolean evaluate(Operator operator, Object rightOperand, R rule, C context);
}
```

You implement `evaluate`. The `context` gives you the participant agent (claims, DID, credentials). The `rightOperand` is what the policy author wrote in the ODRL rule. You return true to permit, false to deny.

### Where exactly is the participantTier claim read from?

`context.participantAgent().getClaims()` returns a Map. We don't trust that directly because the structure is loose. Instead we walk the credential list — that's `getCredentialList(pa)` in our code — filter for the right credential type, then read `credentialSubject.getClaim(MVD_NAMESPACE, "participantTier")`. Going through the credential list means we get type-checking and signature verification implicitly.

### Why didn't HKU work end-to-end at first?

Mid-project we hit a JWT validation failure: the `sub` and `aud` of the credential didn't match what the provider expected when HKU presented it. The fix involved (a) activating the issuer participant context, which had been stuck in CREATED state, (b) seeding `membership_attestations` rows in the issuer's postgres so HKU's holder-credential request would succeed, and (c) running the live issuance flow to mint a fresh, properly-bound VC. Slide 12 is that whole story.

---

## Tier 3 · Bonus (only if challenged hard)

### How does did:web actually resolve?

`did:web:foo.example:bar` resolves to `https://foo.example/bar/did.json` (the path component becomes the URL path). In our cluster we don't have HTTPS so it falls back to HTTP, and the `:` in the port is URL-encoded as `%3A`. That's why our DIDs look like `did:web:dataspace-issuer-service%3A10016:issuer` — `dataspace-issuer-service:10016` is the host:port, and `issuer` is the path.

### Why k3d over KinD?

Both are Docker-in-Docker Kubernetes distributions. K3d is built on k3s (lighter), uses less memory, and on macOS the LoadBalancer story is more reliable. KinD's port mapping was fighting our local DNS setup. After the third "why doesn't this work" session we switched.

### Why not run the issuer locally on each participant?

Could you? Yes — a participant could be its own issuer. But then there's no shared trust root: each participant's VCs would only be trustworthy to themselves. The whole point of an issuer is to be a *common* trusted party that all participants accept.

### What's the relationship between the catalog server and the catalog-server participant?

The catalog-server in our setup is itself a participant — it has its own control plane and identity. Its job is to mirror catalog entries from other providers, so a consumer can hit one endpoint and get a federated view. It doesn't host data; it's an index.

### What is the policy "scope" in the negotiation error?

EDC evaluates policies in different scopes — `contract.negotiation`, `transfer.process`, `request.catalog`, etc. When you see `Policy in scope contract.negotiation not fulfilled`, it means the rejection happened during negotiation, before any data touched the wire. That's the safest place for it to fail.

---

## Quick recall before going on stage

If you only re-read three things on the morning of:

1. **The DSP / DCP distinction** — slide 5, slide 12. This is the one that separates "I read about dataspaces" from "I built one".
2. **The participantTier story** — why DID-substring was wrong, how the VC claim version works. Slide 13.
3. **The seven-step pull pipeline names**: catalog → negotiation → agreement → transfer process → EDR → public endpoint → data. Slide 8.

Everything else, you can recover from the slides themselves.
