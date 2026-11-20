#!/usr/bin/env python3
"""Create the OTA release-signing key pair (ECDSA P-256).

The private key is written with mode 600 under an ignored directory (default .local/ota) and
must never be committed, pasted into Jira or copied to the device/backend. Only the printed
public key goes into FARM_OTA_PUBLIC_KEY_PEM (firmware) and SMARTFARM_OTA_PUBLIC_KEY (backend).
"""
import argparse
import os
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(".local/ota"))
    args = parser.parse_args()
    out = args.output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if out.is_relative_to(repo) and not out.is_relative_to(repo / ".local"):
        parser.error("Inside the repository the key must live under ignored .local/")
    out.mkdir(parents=True, exist_ok=True)
    os.chmod(out, 0o700)
    private = out / "ota-signing-key.pem"
    if private.exists():
        parser.error(f"{private} exists; refusing to overwrite a release key")
    key = ec.generate_private_key(ec.SECP256R1())
    fd = os.open(private, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    (out / "ota-public-key.pem").write_text(public)
    print(public, end="")
    print("C string for config.local.h:\n#define FARM_OTA_PUBLIC_KEY_PEM " + " ".join(f'"{line}\\n"' for line in public.strip().splitlines()))


if __name__ == "__main__":
    main()
