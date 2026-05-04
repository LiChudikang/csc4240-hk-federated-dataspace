#!/usr/bin/env python3
"""
Adds a `participantTier` claim to each participant's MembershipCredential
and re-signs the embedded JWT with the issuer's Ed25519 private key.

This replaces the DID-substring hack inside ParticipantTierFunction.java
with a proper VC-claim lookup, so the dataspace's policy engine acts on
issuer-attested data, not on the syntactic shape of the DID string.

Tier assignment:
    consumer  -> COMMERCIAL
    hku       -> ACADEMIC
    provider  -> PROVIDER
"""

import base64
import json
import time
import uuid
from pathlib import Path

import jwt as jose_jwt
from cryptography.hazmat.primitives import serialization

ROOT = Path("/Users/lichudikang/Projects/MinimumViableDataspace")
ISSUER_KEY = ROOT / "deployment/assets/issuer_private.pem"
CRED_ROOT = ROOT / "deployment/assets/credentials/k8s"

ISSUER_DID = "did:web:dataspace-issuer"

PARTICIPANTS = {
    "consumer": "COMMERCIAL",
    "hku":      "ACADEMIC",
    "provider": "PROVIDER",
}

with open(ISSUER_KEY, "rb") as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)


def b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def decode_jwt_payload(token: str) -> dict:
    return json.loads(b64url_decode(token.split(".")[1]))


def add_tier_to_payload(payload: dict, tier: str) -> dict:
    vc = payload.get("vc")
    if vc is None:
        raise ValueError("JWT payload has no 'vc' claim")

    # Inject participantTier into the JSON-LD @context so the term is bound
    ctx = vc.get("@context")
    if isinstance(ctx, list):
        for entry in ctx:
            if isinstance(entry, dict) and "mvd-credentials" in entry:
                entry["participantTier"] = "mvd-credentials:participantTier"
                break
        else:
            ctx.append({"participantTier": "https://w3id.org/mvd/credentials/participantTier"})

    # Add the tier claim alongside `membership` on credentialSubject
    cs = vc["credentialSubject"]
    if isinstance(cs, list):
        for s in cs:
            s["participantTier"] = tier
    else:
        cs["participantTier"] = tier

    # Refresh standard JWT claims so the new token is unambiguously fresh
    payload["iat"] = int(time.time())
    payload["jti"] = str(uuid.uuid4())
    return payload


def patch_membership(participant: str, tier: str):
    fpath = CRED_ROOT / participant / "membership-credential.json"
    print(f"--- {participant}: tier={tier} ---")
    data = json.loads(fpath.read_text())
    raw = data["verifiableCredential"]["rawVc"]
    payload = decode_jwt_payload(raw)
    payload = add_tier_to_payload(payload, tier)

    headers = {"kid": f"{ISSUER_DID}#key-1", "typ": "JWT"}
    new_jwt = jose_jwt.encode(payload, private_key, algorithm="EdDSA", headers=headers)
    data["verifiableCredential"]["rawVc"] = new_jwt

    # Mirror the claim into the parsed `credential` block for human inspection
    cs = data["verifiableCredential"]["credential"]["credentialSubject"]
    if isinstance(cs, list):
        for s in cs:
            s.setdefault("claims", {})["participantTier"] = tier
    else:
        cs.setdefault("claims", {})["participantTier"] = tier

    fpath.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  rewrote {fpath}")
    redec = decode_jwt_payload(new_jwt)
    print(f"  verified: sub={redec.get('sub')}, "
          f"tier={redec['vc']['credentialSubject'].get('participantTier') if isinstance(redec['vc']['credentialSubject'], dict) else redec['vc']['credentialSubject'][0].get('participantTier')}")


def main():
    for participant, tier in PARTICIPANTS.items():
        patch_membership(participant, tier)


if __name__ == "__main__":
    main()
