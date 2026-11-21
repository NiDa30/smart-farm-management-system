"""Contract v4 (remote config + OTA), signing tool, additive IAM, firmware/test-vector agreement."""
import base64
import hashlib
import json
from pathlib import Path
import re
import runpy
import unittest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[2]
V4 = ROOT / "contracts/iot/v4"
NAMES = ["config", "config-ack", "config-state", "ota", "ota-status"]


def validate(name, value):
    schema = json.loads((V4 / f"{name}.schema.json").read_text())
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)


def example(name):
    return json.loads((V4 / "examples" / f"{name}.json").read_text())


class ContractTest(unittest.TestCase):
    def test_examples_validate(self):
        for name in NAMES:
            with self.subTest(name=name):
                validate(name, example(name))

    def test_config_bounds_match_firmware(self):
        header = (ROOT / "firmware/esp32/include/DeviceConfig.h").read_text()
        for field, low, high in [("telemetrySeconds", 5, 10), ("heartbeatSeconds", 5, 20), ("pumpMaxSeconds", 1, 3600)]:
            for value, ok in [(low, True), (high, True), (low - 1, False), (high + 1, False)]:
                config = example("config")
                config["settings"][field] = value
                with self.subTest(field=field, value=value):
                    if ok:
                        validate("config", config)
                    else:
                        with self.assertRaises(ValidationError):
                            validate("config", config)
        self.assertIn("s.telemetrySeconds < 5 || s.telemetrySeconds > 10", header)
        self.assertIn("s.heartbeatSeconds < 5 || s.heartbeatSeconds > 20", header)

    def test_ota_url_and_hash_rules(self):
        for url in ["http://x.amazonaws.com/a.bin", "https://evil.com/a.bin", "https://u@x.amazonaws.com/a.bin",
                    "https://x.amazonaws.com:444/a.bin", "https://amazonaws.com.evil.com/a.bin"]:
            ota = example("ota"); ota["url"] = url
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate("ota", ota)
        for field, value in [("sha256", "D" * 64), ("version", "v1.4.0"), ("version", "1.4.0-"), ("size", 1310721)]:
            ota = example("ota"); ota[field] = value
            with self.subTest(field=field), self.assertRaises(ValidationError):
                validate("ota", ota)

    def test_ack_error_code_matches_status(self):
        ack = example("config-ack"); ack["errorCode"] = "STALE_REVISION"
        with self.assertRaises(ValidationError):
            validate("config-ack", ack)
        ack["status"] = "REJECTED"
        validate("config-ack", ack)
        ack["errorCode"] = None
        with self.assertRaises(ValidationError):
            validate("config-ack", ack)


class SigningTest(unittest.TestCase):
    def setUp(self):
        self.tool = runpy.run_path(str(ROOT / "tools/ota/sign_firmware.py"))
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.image = bytes([0xE9]) + bytes(range(256)) * 20

    def test_manifest_verifies_like_the_device(self):
        manifest = self.tool["manifest"](self.image, "1.4.0", self.key)
        self.assertEqual(manifest["sha256"], hashlib.sha256(self.image).hexdigest())
        signature = base64.b64decode(manifest["signature"])
        self.key.public_key().verify(signature, self.image, ec.ECDSA(hashes.SHA256()))
        with self.assertRaises(InvalidSignature):
            self.key.public_key().verify(signature, self.image + b"x", ec.ECDSA(hashes.SHA256()))
        ota = example("ota"); ota.update(version="1.4.0", size=manifest["size"], sha256=manifest["sha256"], signature=manifest["signature"])
        validate("ota", ota)

    def test_rejects_bad_inputs(self):
        for image, version, key in [(self.image, "1.4", self.key), (b"\x00" * 2048, "1.4.0", self.key),
                                    (b"\xE9" * 100, "1.4.0", self.key), (self.image, "1.4.0", ec.generate_private_key(ec.SECP384R1()))]:
            with self.assertRaises(ValueError):
                self.tool["manifest"](image, version, key)

    def test_committed_test_vector_is_consistent(self):
        header = (ROOT / "firmware/esp32/include/testvectors/OtaTestVector.h").read_text()
        image = bytes((i * 31 + 7) & 0xFF for i in range(4096))
        digest = re.search(r'kSha256 = "([0-9a-f]{64})"', header).group(1)
        self.assertEqual(hashlib.sha256(image).hexdigest(), digest)
        signature = base64.b64decode(re.search(r'kSignature = "([^"]+)"', header).group(1))
        blocks = re.findall(r'kPublicKey =\n((?:  ".*";?\n)+)', header)[0]
        pem = "\n".join(re.findall(r'"(.*)\\n"', blocks)) + "\n"
        public = serialization.load_pem_public_key(pem.encode())
        public.verify(signature, image, ec.ECDSA(hashes.SHA256()))
        self.assertIn("NOT a release key", header)
        self.assertNotIn("PRIVATE", header)

    def test_keygen_refuses_repository_paths_and_overwrites(self):
        source = (ROOT / "tools/ota/ota_keys.py").read_text()
        self.assertIn("os.O_EXCL", source)
        self.assertIn("0o600", source)
        self.assertIn('repo / ".local"', source)


class PolicyTest(unittest.TestCase):
    def test_device_only_receives_config_and_ota(self):
        device, backend = runpy.run_path(str(ROOT / "tools/aws/provision_devmgmt.py"))["policies"]("ap-southeast-1", "123456789012")
        published = [r for s in device["Statement"] if s["Action"] == "iot:Publish" for r in s["Resource"]]
        self.assertEqual(sorted(r.rsplit("/", 1)[1] for r in published), ["config-ack", "config-state", "ota-status"])
        backend_published = [r for s in backend["Statement"] if s["Action"] == "iot:Publish" for r in s["Resource"]]
        self.assertEqual(sorted(r.rsplit("/", 1)[1] for r in backend_published), ["config", "ota"])
        for statement in device["Statement"] + backend["Statement"]:
            self.assertNotIn("iot:Connect", statement["Action"])
            for resource in statement["Resource"]:
                self.assertNotRegex(resource, r"[*+#]")
                self.assertIn("/smartfarm/FARM001/ENV01/", resource)


class FirmwareWiringTest(unittest.TestCase):
    def test_topics_and_rollback_hooks(self):
        source = (ROOT / "firmware/esp32/src/main.cpp").read_text()
        for topic in ['"/config"', '"/config-ack"', '"/config-state"', '"/ota"', '"/ota-status"']:
            self.assertIn(topic, source)
        for needle in ["esp_ota_mark_app_valid_cancel_rollback", "esp_ota_mark_app_invalid_rollback_and_reboot",
                       "verifyRollbackLater", 'bank.block("OTA_IN_PROGRESS")', "OtaVerify::check", "Update.abort()"]:
            self.assertIn(needle, source)
        # Boot partition changes only after verification.
        self.assertLess(source.index("OtaVerify::check(digest, sha256"), source.index("if (!Update.end())"))
        example_config = (ROOT / "firmware/esp32/config/config.example.h").read_text()
        self.assertIn('#define FARM_OTA_PUBLIC_KEY_PEM ""', example_config)
        self.assertIn("#define FARM_DEVMGMT_ENABLED 0", example_config)


if __name__ == "__main__":
    unittest.main()
