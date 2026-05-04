#!/usr/bin/env python3
"""
Re-sign HKU's Verifiable Credentials so that the embedded JWT's
sub/aud match HKU's DID. Uses the issuer's Ed25519 private key.

Without this, HKU presents an alice-signed VC and the provider's
verifier rejects with 401 "Unauthorized".
"""

import base64
import json
import sys
import time
import uuid
from pathlib import Path

import jwt as jose_jwt
from cryptography.hazmat.primitives import serialization

ROOT = Path("/Users/lichudikang/Projects/MinimumViableDataspace")
ISSUER_KEY = ROOT / "deployment/assets/issuer_private.pem"
HKU_DIR = ROOT / "deployment/assets/credentials/k8s/hku"
ALICE_DIR = ROOT / "deployment/assets/credentials/k8s/consumer"

HKU_DID = "did:web:hku-identityhub%3A7083:hku"
ALICE_DID = "did:web:consumer-identityhub%3A7083:consumer"
ISSUER_DID = "did:web:dataspace-issuer"

with open(ISSUER_KEY, "rb") as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)


def b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded)


def decode_jwt_payload(token: str) -> dict:
    payload_b64 = token.split(".")[1]
    return json.loads(b64url_decode(payload_b64))


def re_sign_for_hku(orig_jwt: str) -> str:
    """Take alice's signed JWT, swap alice→HKU everywhere, sign with issuer key."""
    payload = decode_jwt_payload(orig_jwt)

    # Replace any alice DID references with HKU DID
    def swap(s):
        if isinstance(s, str):
            return s.replace(ALICE_DID, HKU_DID)
        if isinstance(s, dict):
            return {k: swap(v) for k, v in s.items()}
        if isinstance(s, list):
            return [swap(x) for x in s]
        return s

    payload = swap(payload)

    # Force key fields explicitly
    payload["sub"] = HKU_DID
    payload["aud"] = HKU_DID
    payload["iss"] = ISSUER_DID
    payload["iat"] = int(time.time())
    payload["jti"] = str(uuid.uuid4())

    # Drop expirationDate so the VC is valid for demo
    if "vc" in payload and "expirationDate" in payload["vc"]:
        del payload["vc"]["expirationDate"]

    # Sign with EdDSA, kid in header so the verifier can resolve the key
    headers = {"kid": f"{ISSUER_DID}#key-1", "typ": "JWT"}
    token = jose_jwt.encode(payload, private_key, algorithm="EdDSA", headers=headers)
    return token


def patch_file(filename: str):
    src = ALICE_DIR / filename
    dst = HKU_DIR / filename

    print(f"--- {filename} ---")
    src_data = json.loads(src.read_text())
    orig_jwt = src_data["verifiableCredential"]["rawVc"]
    print(f"  alice payload sub: {decode_jwt_payload(orig_jwt).get('sub')}")

    new_jwt = re_sign_for_hku(orig_jwt)
    print(f"  new HKU payload sub: {decode_jwt_payload(new_jwt).get('sub')}")

    # Build the dst file: copy outer JSON from current HKU file (already has hku DIDs),
    # but overwrite rawVc with the new signed one
    dst_data = json.loads(dst.read_text())
    dst_data["verifiableCredential"]["rawVc"] = new_jwt
    dst.write_text(json.dumps(dst_data, indent=2) + "\n")
    print(f"  wrote {dst}")


for fname in ("membership-credential.json", "dataprocessor-credential.json"):
    patch_file(fname)

# Verify by re-decoding
print("\n=== Verify ===")
for fname in ("membership-credential.json", "dataprocessor-credential.json"):
    data = json.loads((HKU_DIR / fname).read_text())
    payload = decode_jwt_payload(data["verifiableCredential"]["rawVc"])
    print(f"  {fname}: sub={payload['sub']}, aud={payload['aud']}, iss={payload['iss']}")
