#!/usr/bin/env python3
"""Check device MQTT authentication locally without publishing or exposing keys."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
import json
import re
import socket
import ssl
import uuid

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--with-will", action="store_true", help="Match firmware retained QoS1 Last Will on ENV01/status")
    args = parser.parse_args()
    config = (ROOT / "firmware/esp32/config/config.local.h").read_text()
    endpoint = (ROOT / ".local/aws/endpoint.txt").read_text().strip()
    configured = re.search(r'^\s*#define\s+FARM_AWS_ENDPOINT\s+"([^"]*)"', config, re.M)
    device = re.search(r'^\s*#define\s+FARM_DEVICE_ID\s+"([^"]*)"', config, re.M)
    if not configured or configured.group(1) != endpoint:
        raise ValueError("Firmware endpoint differs from provisioned endpoint.txt; fix config and rebuild/merge")
    if not device or device.group(1) != "ENV01":
        raise ValueError("Firmware client ID must be ENV01 for this policy")
    print("Endpoint and client ID match provisioning", flush=True)
    data = ROOT / "firmware/esp32/data"
    context = ssl.create_default_context(cafile=str(data / "AmazonRootCA1.pem"))
    context.load_cert_chain(str(data / "device.pem.crt"), str(data / "private.pem.key"))
    print("Local certificate/private key pair loaded", flush=True)
    # MQTT 3.1.1, clean session, keepalive 30s, client ID ENV01; no password.
    flags = 0x2e if args.with_will else 0x02
    body = b"\x00\x04MQTT\x04" + bytes([flags]) + b"\x00\x1e\x00\x05ENV01"
    if args.with_will:
        topic = b"smartfarm/FARM001/ENV01/status"
        payload = json.dumps({
            "schemaVersion": 1, "deviceId": "ENV01", "bootId": str(uuid.uuid4()),
            "sequence": 0, "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "connection": "OFFLINE", "reason": "CONNECTION_LOST",
        }, separators=(",", ":")).encode()
        body += len(topic).to_bytes(2, "big") + topic
        body += len(payload).to_bytes(2, "big") + payload
        print("Testing firmware-style retained QoS1 Last Will", flush=True)
    remaining = len(body)
    encoded_length = bytearray()
    while True:
        digit = remaining % 128
        remaining //= 128
        encoded_length.append(digit | (0x80 if remaining else 0))
        if not remaining:
            break
    with socket.create_connection((endpoint, 8883), timeout=15) as raw:
        with context.wrap_socket(raw, server_hostname=endpoint) as connection:
            print("TLS handshake verified", flush=True)
            connection.sendall(b"\x10" + encoded_length + body)
            reply = b""
            while len(reply) < 4:
                chunk = connection.recv(4 - len(reply))
                if not chunk:
                    raise ConnectionError("Server closed connection before MQTT CONNACK")
                reply += chunk
            if reply[:2] != b"\x20\x02" or reply[2] != 0:
                raise ConnectionError("Unexpected MQTT CONNACK")
            if reply[3] != 0:
                raise ConnectionError("MQTT connection refused; return code " + str(reply[3]))
            print("MQTT CONNECT accepted (ENV01); no messages published", flush=True)
            connection.sendall(b"\xe0\x00")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Device check failed:", type(error).__name__, "-", str(error))
        raise SystemExit(1)
