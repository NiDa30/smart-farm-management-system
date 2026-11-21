#!/usr/bin/env python3
"""Sign a firmware image and print the OTA release manifest (contract v4 fields).

signature = base64(DER ECDSA P-256 over SHA-256(image)). The device recomputes the SHA-256 while
streaming the download and verifies the signature with its compiled-in public key before the
boot partition changes; the backend verifies the same signature when the release is registered.
"""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

VERSION = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]{1,8})?$")
PARTITION_SIZE = 1310720  # app0/app1 in the default ESP32 4 MB partition table


def manifest(image: bytes, version: str, key) -> dict:
    if not VERSION.match(version) or len(version) > 23:
        raise ValueError("version must be MAJOR.MINOR.PATCH[-tag]")
    if not 1024 <= len(image) <= PARTITION_SIZE:
        raise ValueError("image size outside the OTA partition")
    if image[0] != 0xE9:
        raise ValueError("not an ESP32 application image (magic 0xE9)")
    if not isinstance(key, ec.EllipticCurvePrivateKey) or key.curve.name != "secp256r1":
        raise ValueError("signing key must be ECDSA P-256")
    signature = key.sign(image, ec.ECDSA(hashes.SHA256()))
    return {"version": version, "size": len(image), "sha256": hashlib.sha256(image).hexdigest(),
            "signature": base64.b64encode(signature).decode()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path, help=".pio/build/esp32dev/firmware.bin")
    parser.add_argument("--version", required=True)
    parser.add_argument("--key", type=Path, default=Path(".local/ota/ota-signing-key.pem"))
    args = parser.parse_args()
    key = serialization.load_pem_private_key(args.key.read_bytes(), password=None)
    print(json.dumps(manifest(args.image.read_bytes(), args.version, key), indent=2))


if __name__ == "__main__":
    main()
