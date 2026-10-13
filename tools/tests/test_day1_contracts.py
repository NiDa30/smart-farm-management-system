import importlib.util
import json
from pathlib import Path
import unittest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "contracts/iot/v1"


class ContractsTest(unittest.TestCase):
    def validate(self, name, value):
        schema = json.loads((CONTRACTS / f"{name}.schema.json").read_text())
        Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)

    def example(self, name):
        return json.loads((CONTRACTS / "examples" / f"{name}.json").read_text())

    def test_examples(self):
        for name in ["telemetry", "command", "ack", "status", "event"]:
            with self.subTest(name=name):
                self.validate(name, self.example(name))

    def test_invalid_telemetry_identity_values_and_time(self):
        for field, invalid in [("deviceId", "bad/device"), ("soilMoisture", -1), ("humidity", 101),
                               ("temperature", "31"), ("bootId", "invalid"), ("timestamp", "yesterday")]:
            value = self.example("telemetry")
            value[field] = invalid
            with self.subTest(field=field), self.assertRaises(ValidationError):
                self.validate("telemetry", value)

    def test_on_requires_bounded_duration(self):
        for duration in [None, 0, 3601]:
            value = self.example("command")
            if duration is None: del value["durationSeconds"]
            else: value["durationSeconds"] = duration
            with self.subTest(duration=duration), self.assertRaises(ValidationError):
                self.validate("command", value)

    def test_off_and_reset_have_no_runtime(self):
        for action in ["OFF", "RESET_LOCKOUT"]:
            value = self.example("command")
            value["action"] = action
            with self.assertRaises(ValidationError): self.validate("command", value)
            del value["durationSeconds"]
            self.validate("command", value)

    def test_failed_ack_requires_error_code(self):
        value = self.example("ack")
        value["status"] = "FAILED"
        with self.assertRaises(ValidationError): self.validate("ack", value)
        value["errorCode"] = "EXPIRED"
        self.validate("ack", value)

    def test_device_policy_cannot_publish_command_or_cross_farm(self):
        spec = importlib.util.spec_from_file_location("provision", ROOT / "tools/aws/provision_day1.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        device, backend = module.policies("ap-southeast-1", "123456789012")
        publish = next(s for s in device["Statement"] if s["Action"] == "iot:Publish")["Resource"]
        self.assertFalse(any("command" in r or "*" in r or "FARM002" in r for r in publish))
        self.assertTrue(all("FARM001" in r for r in publish))
        self.assertEqual(len(publish), 5)
        retain = next(s for s in device["Statement"] if s["Action"] == "iot:RetainPublish")["Resource"]
        self.assertEqual(retain, ["arn:aws:iot:ap-southeast-1:123456789012:topic/smartfarm/FARM001/ENV01/status"])
        subscribe = next(s for s in device["Statement"] if s["Action"] == "iot:Subscribe")["Resource"]
        self.assertEqual(subscribe, ["arn:aws:iot:ap-southeast-1:123456789012:topicfilter/smartfarm/FARM001/PUMP01/command"])


if __name__ == "__main__": unittest.main()
