# Speech Script · 15-minute version

**HK Transport Federated Dataspace · CSC4240 Final Project**

Two speakers split half-and-half. ~15 minutes total + Q&A.

- **Dico** — slides 1 to 8 (problem framing → architecture → implementation summary → Pull demo)
- **Yuxuan** — slides 9 to 16 (S3 push → HKU dual-role → federated crawler → live credential issuance → custom Java constraints → retrospective → close)

Tips before you start:
- The bracketed `[...]` notes are stage directions, not lines to read.
- The italic asides at the end of each section can be skipped if you're tight on time.
- The hand-off between slide 8 and slide 9 is the only big speaker switch — half a second of silent eye contact reads better than "and now my partner will…"
- Dico's half is setup; Yuxuan's half is payoff. Dico, keep the pace moving — don't dwell. Yuxuan, slow down on slides 12 and 13 — those are the moments that earn the grade.

---

## Slide 1 · Cover  (~30s) — **Dico**

Hi everyone, thanks for having us. I'm Dico, this is Yuxuan, and our project is the Hong Kong Transport Federated Dataspace. We spent the semester forking Eclipse's Minimum Viable Dataspace and turning it into something that actually moves real Hong Kong bus data through a five-participant network — with policy enforcement, custom Java constraints, and live credential issuance. Quick roadmap: a couple of minutes on the problem, then what we built and how the architecture is laid out, then we'll walk through demo evidence in three parts, and we'll close with the limitations we identified mid-project and how we resolved them.

---

## Slide 2 · Why a HK Transport Dataspace  (~55s) — **Dico**

So why bother. Hong Kong has four big transport players. KMB on buses, MTR on rail, the Transport Department on the regulatory side, and a bunch of academic groups doing research. Each one sits on data that's genuinely useful — bus arrival times, ridership patterns, congestion records, equity studies.

The problem is, the data doesn't go anywhere. The way it works today: when KMB wants to share with HKTaxi, two engineers exchange an API key over email. There's no shared protocol, no audit trail, no way for KMB to say "you can use this for routing, but not for resale." And researchers — well, by the time the data-sharing agreement is signed, the data is already a year old. So you end up with a city that has incredible operational data and almost no policy research that uses it. *Three problems, all solvable, none of them solvable with another REST API.*

---

## Slide 3 · Why a Dataspace Runtime  (~55s) — **Dico**

You might be wondering — fine, but couldn't we just use plain HTTP and a key vault? Technically yes. But look at this table.

With HTTP, identity is a shared secret. With EDC, it's a Verifiable Credential, signed by an issuer, and it can't be impersonated. Contracts? Implicit terms of service versus an actual ODRL policy, negotiated through the Dataspace Protocol. Audit? Custom log lines versus a state machine that's built into the framework. Protocol? Vendor-specific REST conventions versus DSP, which is an open standard. So the point isn't that EDC is "another HTTP library." The point is that a dataspace becomes a first-class runtime — and a real policy engine ships in the box. We didn't have to invent these abstractions. We built on top of them.

---

## Slide 4 · What We Built  (~55s) — **Dico**

OK so here's our whole project in one slide. Three pieces.

Part 1: real Hong Kong data flowing through five independent participants. Pull mode and push mode, both working end to end. Part 2: we added HKU as a sixth identity that plays both consumer and provider, and a federated crawler that walks four catalogs in parallel. Part 3, which is our bonus, we extended the Java policy engine with two custom ODRL constraints — one for academic-tier permission, one for an attribution duty. The big number on the left, 1,611 routes pulled live from KMB, that's what we'll show you in a few slides. The bar across the bottom — Built on Eclipse MVD, runs locally on k3d, twenty-one pods across five participants — is the deployment story we'll get to next.

---

## Slide 5 · Federated Architecture  (~65s) — **Dico**

This is what's actually running on a laptop right now, twenty-one pods on a k3d cluster. The thing I want you to notice is what's *not* in the middle.

Every participant has its own four-piece stack. Control plane handles contracts and catalog. Data plane moves the bytes. Identity Hub presents Verifiable Credentials. Vault stores key material. *No participant can read another's vault.* The only thing in the centre is the issuer — which signs VCs — and the catalog server, which is purely an index. It doesn't host data. It just points at where the data lives.

Two protocols layer on top. DSP, the Dataspace Protocol, carries catalog, negotiation, and transfer. DCP, Decentralized Claims Protocol, carries credential exchange. They're orthogonal — that separation matters because the trust model and the data flow can evolve independently. So when we say "federated", we mean it structurally. Trust comes from DID and Verifiable Credentials, not from a privileged server.

---

## Slide 6 · Actors & Datasets  (~60s) — **Dico**

Quick concrete grounding. On the left, the cast.

HK Transport Hub plays the provider — KMB, MTR, government feeds. HKTaxi is a commercial consumer, our stand-in for a routing app or fleet management platform. HKU is interesting because it's both consumer and provider — we'll come back to that on slide ten. And the issuer sits at the trust root, with its own DID and signing key.

On the right, the data. KMB Routes is live — we're literally hitting `data.etabus.gov.hk` during the demo. KMB ETA also live. HK Traffic Incidents and MTR Patronage round out the public side. And HKU contributes its own dataset, called Transit Equity 2026, which is gated. Only participants with an academic tier can negotiate for it. We'll demo that gate later, on slide thirteen.

---

## Slide 7 · Implementation Highlights  (~75s) — **Dico**

This slide is where the actual work lived. Eight concrete changes on top of upstream MVD.

We reskinned the actors so the demo isn't about alice and bob — it's about HKTaxi, HKU, and HK Transport Hub. We plugged in real KMB live data, which meant adding a real HTTP source to the data plane and seeding asset definitions. We built HKU from scratch as a new participant — that's twenty Kubernetes resources, separate identity hub, separate vault. We split policies by tier so commercial and academic flows actually diverge in the catalog. We added an S3 push backend with MinIO. We made the issuer issue credentials at runtime instead of just at boot. And we wrote two custom Java ODRL functions — Yuxuan will go deeper on those.

The dark strip at the bottom is engineering honesty. The k3d migration cost us a Traefik port conflict — we had to uninstall Traefik for ingress-nginx to bind. Our local DNS got hijacked by a corporate VPN; `host.docker.internal` was resolving to some 198 address until we forced 127.0.0.1. And the dataplane didn't like chunked transfer encoding when we first wired up the receiver. *Three days of debugging compressed into three lines* — but they're real, and they're worth flagging.

---

## Slide 8 · Live Pull from KMB  (~60s) — **Dico**

OK, demos start here. Part 1 working.

Headline: 1,611 KMB routes pulled in fourteen seconds, end to end. That's not a stub. Those are real Hong Kong bus routes — every K-MB number you've seen on a bus stop in town is in this dataset. The strip across the middle is the seven-step pipeline. Catalog discovery, where alice asks "what's available." Contract negotiation, where alice and the provider agree on terms. Agreement, the contract is signed. Transfer process. EDR — Endpoint Data Reference — that's a short-lived URL with a signed JWT. Public endpoint. Then the actual GET.

Bottom left: the negotiation finishing in FINALIZED state with a contract agreement ID. Bottom right: the JSON we got back. Chuk Yuen Estate to Star Ferry, route 1, in trilingual labels — exactly as KMB serves them. Real data, dataspace-mediated, no shortcuts.

[Hand off — turn to Yuxuan, half a second of silence, step back from the screen.]

---

## Slide 9 · Push Transfer to S3  (~60s) — **Yuxuan**

Same data, different transfer mode. In pull, the consumer fetches when ready. In push, the provider drops the bytes into a destination the consumer specifies up front. Both modes are part of the EDC dataplane spec, but pull is the default; push needs more setup.

We wired up `edc-dataplane-aws-s3` and ran it against MinIO, which is S3-compatible. 344 KB landed in the bucket. The transfer spec on the left is what alice submits — `AmazonS3-PUSH` transfer type, bucket name, object name, an endpoint override pointing at MinIO inside the cluster, and a region. On the right, the bucket listing taken straight from the MinIO pod. The file is there. Signed at 14:11. Contents readable. *This is what a production dataspace would actually wire to* — for big files you don't want sitting in a transit endpoint, push to your own storage is the right pattern.

---

## Slide 10 · HKU Dual-Role  (~65s) — **Yuxuan**

This is the slide I find most interesting. Same identity, two roles.

As a consumer, HKU pulls the academic-tier-only research archive from manufacturing — that's the right card. Negotiation finalized, `tier_required` ACADEMIC, data flows. As a provider, HKU publishes its own dataset and HKTaxi pulls from it — that's the left card. Same DID, different direction, no contradiction.

The reason this matters: in a real dataspace, organizations aren't producers *or* consumers. They're both, depending on the dataset. A research lab publishes its findings and consumes KMB feeds at the same time. A bus operator publishes timetable data and consumes weather feeds. The protocol has to handle that without contradiction, and it does — because contracts in EDC are *per-asset*, not per-party. Each contract carries its own policy, its own role, its own counterparty.

---

## Slide 11 · Federated Catalog Aggregation  (~55s) — **Yuxuan**

Discovery. In a real dataspace, no single party knows what's out there. So we wrote a crawler that hits four provider catalogs in parallel and aggregates the result.

Twelve assets across four providers. The table shows ten because two are push-test variants we hid for clarity. Look at row four and row five — `asset-1` appears on `qna` and on `manufacturing`. Same name, different data, different policies. The federated index correctly disambiguates by provider, not by name. Without that, you'd accidentally pull the wrong asset. And the `hk-academic-research-archive` row marked ACADEMIC tier — that's exactly the asset we're about to see alice get denied for, in two slides.

---

## Slide 12 · Live Credential Issuance  (~80s) — **Yuxuan**

This was honestly one of the more satisfying things we got working.

The issuer is supposed to sign credentials at runtime, not just at deployment. That sounds obvious but it's actually one of the harder parts of DCP — the state machine has to coordinate the requesting wallet, the issuer, and the back-and-forth challenge.

We snapshotted HKU's wallet first — three credentials sitting there. Two are preloaded from boot, one is from an earlier test run. Then HKU sends a CredentialRequest. The state machine on top drives it through CREATED, REQUESTING, REQUESTED, ISSUED — each transition is an asynchronous step, each logged on the identityhub. The issuer signs a fresh JWT — Ed25519, like all our credentials — pushes it back to HKU's wallet over DCP, and now HKU has four credentials. The newest one was signed seconds before we took the screenshot.

The right side shows the decoded payload — issuer DID, HKU as the subject, and an `iat` timestamp matching real time. Not the boot-time placeholder, the actual moment of signing. *Trust root is alive at runtime — not just a static signer baked into a config map at deploy time.*

---

## Slide 13 · Custom Permission Constraint  (~85s) — **Yuxuan**

Right, Part 3. We had a constraint called `ParticipantTier` — only academic-tier participants can negotiate for the academic asset.

Honest story — our first version was a hack. We string-matched the DID. If the DID contained "hku", we returned ACADEMIC. If it contained "consumer", COMMERCIAL. That worked for the demo but it was, frankly, embarrassing. It assumed the DID syntax would always reveal the tier — which is exactly the kind of coupling a dataspace is supposed to eliminate. A new participant would need a magic substring in its DID just to be classified.

So mid-project we re-signed every membership credential with a `participantTier` claim, using a Python script and the issuer's Ed25519 private key. Then we rewrote the function to read that claim out of the credential.

The code on the left is the real evaluator. We pull the credential list from the participant agent, filter for `MembershipCredential`, walk into `credentialSubject`, grab the `participantTier` claim, and compare it to the right operand of the constraint. On the right, alice — a commercial consumer — getting cleanly rejected, with an explicit policy reason embedded in the negotiation error. *Issuer-attested, no DID syntax assumed.* That's the right way to do it.

---

## Slide 14 · Custom Duty Constraint  (~55s) — **Yuxuan**

Permission says "you may." Duty says "if you do, you must also." They live side by side in an ODRL rule, and the policy engine evaluates both before signing the agreement.

We added an attribution duty. If you want this asset, you have to declare where it came from, and your declaration has to match a whitelist of approved sources. Left card: alice declares "HK Transport Hub" — that's whitelisted, the function returns true, negotiation goes FINALIZED. Right card: alice tries "Unauthorized Reseller" — not whitelisted, function returns false, negotiation gets TERMINATED.

Same alice, same asset, only the attribution string changed. Different outcome. The policy engine treats permission and duty symmetrically, and our Java function plugs into both through the same `AtomicConstraintRuleFunction` interface.

---

## Slide 15 · Closing the Loop  (~60s) — **Yuxuan**

Mid-project we wrote down three things we hadn't finished. Live credential issuance flow. S3 push to a real destination. And the ParticipantTier DID-substring hack.

By the end, all three were closed. Issuer participant context activated, attestations seeded in postgres, wallet grew at runtime — that's slide 12. S3 push works against MinIO with `edc-dataplane-aws-s3` — that's slide 9. And the DID hack is gone, replaced with a proper VC claim lookup — that's slide 13. Each fix has a specific file or script behind it, listed on the cards.

The chips at the bottom are what we took away from the whole project. The one I'd actually flag is the second one — DCP and DSP are orthogonal. Treating them as separate layers, instead of one big bucket of "credential stuff", is the difference between a demo that works and a demo that quietly leaks state. We learned that the hard way around week six.

---

## Slide 16 · Summary & Q&A  (~70s) — **Yuxuan**

So the bigger picture, before I close. We showed that a five-participant dataspace running on a laptop can move real city-scale transit data, with policy enforcement that actually fires when it should. That's the proof point we wanted — *dataspaces aren't just an architectural ideal, they run.*

To summarize the three concrete pieces. We extended MVD into a five-participant Hong Kong dataspace running real KMB live data. HKU joined as a dual-role academic participant, exercising both consumer and provider flows in the same DID. And the two custom Java ODRL constraints proved the policy engine is genuinely extensible — you can add new policy semantics without forking EDC core.

Future work, since we know we're not done. Three things on our list. The official EDC FederatedCatalog component instead of our hand-rolled crawler. mTLS on the dataplane, so transfers are encrypted hop-to-hop. And a real multi-cluster deployment instead of a single k3d. The most interesting next step, though, would be plugging this into a real Hong Kong public-data initiative — opening up KMB's API behind a DCP issuer. The infrastructure is here; what's missing is the policy framework on the regulatory side.

That's it from us. Thanks for watching, and we'd love your questions.

[Both speakers stay on screen for Q&A.]

---

## Speaker tips

- **Don't read the slide.** The audience can read. Tell the story *around* the slide.
- **Pause after key numbers.** "1,611 routes." Pause. Let it land.
- **The honest moments are where you get points.** When Yuxuan says "our first version was a hack" on slide 13, don't rush past it. That sentence shows the maturity that distinguishes a B from an A.
- **Hand-off**: between slide 8 and slide 9, half a second of silent eye contact reads better than "and now my partner will…"

## Q&A defense pre-loaded

- *"Why didn't you use the official FederatedCatalog component?"*
  → "We started before it was stable enough; our crawler is configurable to swap in once we adopt the official one. It's on the future-work list."

- *"How does the issuer trust the participantTier claim from the membership credential?"*
  → "Every membership credential is signed by the same Ed25519 issuer key. Re-signing happens through `add-tier-claim.py`. The provider's policy engine verifies the JWT signature before evaluating the claim."

- *"Are the same-id assets across qna and manufacturing actually different?"*
  → "Yes — same asset ID, different provider, different policy, different data. That's exactly what the federated index has to disambiguate."

- *"What part broke the most during development?"*
  → Pick whichever caveat from slide 7 you remember best. The chunked-transfer-encoding one is short and specific, which makes it sound credible.

- *"What's the deal with HKU being both consumer and provider?"*
  → "Same DID, two contract roles. In a real dataspace, organizations aren't pure consumers or pure producers. A research lab publishes findings and consumes operational data simultaneously. EDC handles that natively because the contract is per-asset, not per-party."

- *"How exactly does DCP differ from DSP?"*
  → "DSP carries catalog, contract negotiation, and transfer process — basically the data-side conversation. DCP carries credential issuance and presentation — the trust-side conversation. They run on the same HTTP transport but they're separate state machines and serve different purposes."
