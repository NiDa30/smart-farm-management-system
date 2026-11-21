"""Contract v3 (actuators), additive IAM and multi-relay wiring/scenario consistency."""
import copy
import json
from pathlib import Path
import re
import runpy
import unittest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[2]
V3 = ROOT / "contracts/iot/v3"
FIRMWARE = ROOT / "firmware/esp32"


def schema(name, version=V3):
    return json.loads((version / f"{name}.schema.json").read_text())


def example(name):
    return json.loads((V3 / "examples" / f"{name}.json").read_text())


def validate(name, value, version=V3):
    Draft202012Validator(schema(name, version), format_checker=FormatChecker()).validate(value)


class ActuatorContractTest(unittest.TestCase):
    def test_examples_validate(self):
        for name in ["command", "ack", "status"]:
            with self.subTest(name=name):
                validate(name, example(name))

    def test_pump_is_not_part_of_v3(self):
        for name in ["command", "ack", "status"]:
            value = example(name)
            value["deviceId"] = "PUMP01"
            with self.subTest(name=name), self.assertRaises(ValidationError):
                validate(name, value)

    def test_per_actuator_hard_caps(self):
        cases = [("VALVE03", 3600, 3601), ("FAN01", 14400, 14401), ("LIGHT01", 14400, 14401), ("MIST01", 600, 601)]
        for device, ok, too_long in cases:
            value = example("command")
            value.update(deviceId=device, durationSeconds=ok)
            validate("command", value)
            value["durationSeconds"] = too_long
            with self.subTest(device=device), self.assertRaises(ValidationError):
                validate("command", value)

    def test_on_needs_duration_and_off_has_none(self):
        value = example("command")
        del value["durationSeconds"]
        with self.assertRaises(ValidationError):
            validate("command", value)
        value["action"] = "OFF"
        validate("command", value)
        value["durationSeconds"] = 5
        with self.assertRaises(ValidationError):
            validate("command", value)

    def test_v1_status_accepts_valve_closed_for_pump(self):
        value = json.loads((ROOT / "contracts/iot/v1/examples/status.json").read_text())
        value.update(deviceId="PUMP01", reportedState="OFF", safetyLockout=False, activeCommandId=None, stateReason="VALVE_CLOSED")
        validate("status", value, ROOT / "contracts/iot/v1")

    def test_firmware_ids_match_contract(self):
        source = (FIRMWARE / "src/main.cpp").read_text()
        ids = schema("command")["properties"]["deviceId"]["enum"]
        for actuator in ids:
            self.assertIn(f'"{actuator}"', source)
        self.assertNotIn("PUMP01", ids)


class ActuatorPolicyTest(unittest.TestCase):
    def setUp(self):
        self.module = runpy.run_path(str(ROOT / "tools/aws/provision_actuators.py"))
        self.device, self.backend = self.module["policies"]("ap-southeast-1", "123456789012")

    def resources(self, policy, action):
        return [r for s in policy["Statement"] if s["Action"] == action for r in s["Resource"]]

    def test_device_never_publishes_commands_or_retains_or_wildcards(self):
        published = self.resources(self.device, "iot:Publish")
        self.assertTrue(published)
        self.assertFalse([r for r in published if r.endswith("/command")])
        self.assertFalse(self.resources(self.device, "iot:RetainPublish"))
        self.assertFalse(self.resources(self.device, "iot:Connect"))
        for statement in self.device["Statement"] + self.backend["Statement"]:
            for resource in statement["Resource"]:
                self.assertNotRegex(resource, r"[*+#]")
                self.assertIn("smartfarm/FARM001/", resource)

    def test_backend_commands_every_v3_actuator_but_not_pump(self):
        commands = self.resources(self.backend, "iot:Publish")
        ids = schema("command")["properties"]["deviceId"]["enum"]
        self.assertEqual(sorted(commands), sorted(f"arn:aws:iot:ap-southeast-1:123456789012:topic/smartfarm/FARM001/{i}/command" for i in ids))

    def test_original_env01_policy_is_unchanged(self):
        device, _ = runpy.run_path(str(ROOT / "tools/aws/provision_day1.py"))["policies"]("ap-southeast-1", "123456789012")
        flat = json.dumps(device)
        self.assertNotIn("VALVE", flat)
        self.assertNotIn("FAN01", flat)

    def test_rejects_bad_identity(self):
        for region, account in [("bad", "123456789012"), ("ap-southeast-1", "12")]:
            with self.assertRaises(ValueError):
                self.module["policies"](region, account)


class MultiRelayWiringTest(unittest.TestCase):
    PINS = {"26": "PUMP01", "25": "VALVE01", "33": "VALVE02", "32": "VALVE03", "13": "VALVE04", "18": "FAN01", "19": "LIGHT01", "21": "MIST01"}

    def edges(self, diagram):
        return {frozenset(c[:2]) for c in diagram["connections"]}

    def test_example_and_selftest_configs_agree_on_pins(self):
        for name in ["config.example.h", "config.selftest.h"]:
            text = (FIRMWARE / "config" / name).read_text()
            self.assertIn("#define FARM_VALVE_PINS {25, 33, 32, 13}", text)
            for macro, pin in [("FARM_FAN_PIN", 18), ("FARM_LIGHT_PIN", 19), ("FARM_MIST_PIN", 21), ("FARM_RELAY_PIN", 26)]:
                self.assertRegex(text, rf"#define {macro} {pin}\b")
        selftest = (FIRMWARE / "config/config.selftest.h").read_text()
        self.assertIn('#define FARM_AWS_ENDPOINT ""', selftest)
        self.assertNotRegex(selftest, r"BEGIN|PRIVATE|password\s*=\s*\"[^\"]")

    def test_every_actuator_pin_drives_a_load_in_both_diagrams(self):
        for path in [FIRMWARE / "diagram.json", FIRMWARE / "test/wokwi/diagram.json"]:
            diagram = json.loads(path.read_text())
            parts = {p["id"] for p in diagram["parts"]}
            for connection in diagram["connections"]:
                for endpoint in connection[:2]:
                    self.assertIn(endpoint.split(":")[0], parts | {"$serialMonitor"}, path)
            wired = {e for edge in self.edges(diagram) for e in edge if e.startswith("esp:")}
            for pin in self.PINS:
                with self.subTest(diagram=path.parent.name, pin=pin):
                    self.assertIn(f"esp:{pin}", wired)

    def test_selftest_scenario_checks_every_actuator_and_the_float(self):
        text = (FIRMWARE / "test/wokwi/scenario.yaml").read_text()
        for pin in self.PINS:
            self.assertRegex(text, rf"name: {pin}\n")
        for marker in range(1, 11):
            self.assertIn(f"SELFTEST_CHECK {marker} ", text)
        self.assertIn("part-id: float_btn", text)
        self.assertIn("reason=VALVE_CLOSED", text)
        source = (FIRMWARE / "src/main.cpp").read_text()
        for line in re.findall(r"wait-serial: '([^']+)'", text):
            head = line.split(" ")[0]
            self.assertTrue(head in source or line.split(" ")[0] + " " in source, line)
        toml = (FIRMWARE / "test/wokwi/wokwi.toml").read_text()
        self.assertIn(".pio/build/wokwi_selftest/firmware.bin", toml)
        self.assertIn("[env:wokwi_selftest]", (FIRMWARE / "platformio.ini").read_text())


if __name__ == "__main__":
    unittest.main()
