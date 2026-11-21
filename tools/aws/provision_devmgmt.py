#!/usr/bin/env python3
"""Additive AWS IoT/IAM policies for remote configuration and OTA on ENV01 (contract v4).

Same approach as provision_actuators.py: a separate device policy (SmartFarmMvpENV01DevMgmt)
attached to the ENV01 certificate and a separate backend IAM statement set; existing
policies are not modified. The image itself is fetched over HTTPS (e.g. an S3 presigned URL),
not through MQTT, so no S3 permission is granted to the device.
"""
import argparse
import json
from pathlib import Path
import re
import runpy

POLICY_NAME = "SmartFarmMvpENV01DevMgmt"
ROOT = "smartfarm/FARM001/ENV01/"
INBOUND = ["config", "ota"]                       # backend -> device
OUTBOUND = ["config-ack", "config-state", "ota-status"]  # device -> backend


def policies(region, account):
    if not re.fullmatch(r"[a-z]{2}(?:-[a-z]+)+-\d", region):
        raise ValueError("Invalid AWS region")
    if not re.fullmatch(r"\d{12}", account):
        raise ValueError("Account ID must contain 12 digits")
    prefix = f"arn:aws:iot:{region}:{account}:"

    def statement(action, kind, names):
        return {"Effect": "Allow", "Action": action, "Resource": [f"{prefix}{kind}/{ROOT}{n}" for n in names]}

    device = {"Version": "2012-10-17", "Statement": [
        statement("iot:Subscribe", "topicfilter", INBOUND), statement("iot:Receive", "topic", INBOUND),
        statement("iot:Publish", "topic", OUTBOUND)]}
    backend = {"Version": "2012-10-17", "Statement": [
        statement("iot:Publish", "topic", INBOUND), statement("iot:Subscribe", "topicfilter", OUTBOUND),
        statement("iot:Receive", "topic", OUTBOUND)]}
    return device, backend


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", default="ap-southeast-1")
    parser.add_argument("--account-id", required=True)
    parser.add_argument("--output", type=Path, default=Path(".local/aws"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    output = args.output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if output.is_relative_to(repo) and not output.is_relative_to(repo / ".local"):
        parser.error("Inside repository, output must be under ignored .local/")
    actuators = runpy.run_path(str(repo / "tools/aws/provision_actuators.py"))
    runpy.run_path(str(repo / "tools/aws/provision_day1.py"))["prepare_private_directory"](output)
    device, backend = policies(args.region, args.account_id)
    (output / "device-devmgmt-policy.json").write_text(json.dumps(device, indent=2) + "\n")
    (output / "backend-devmgmt-iam-policy.json").write_text(json.dumps(backend, indent=2) + "\n")
    if args.apply:
        import botocore.session
        actuators["apply"](botocore.session.get_session(), args.region, args.account_id, output, device, POLICY_NAME)
    else:
        print("Rendered only; attach backend-devmgmt-iam-policy.json as a separate inline IAM policy.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Device-management provisioning stopped:", type(error).__name__)
        raise SystemExit(1)
