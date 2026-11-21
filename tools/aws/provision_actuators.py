#!/usr/bin/env python3
"""Additive AWS IoT/IAM policies for the contract v3 actuators on ENV01.

The original ENV01 device policy (PUMP01 only) is left untouched: a second device policy,
SmartFarmMvpENV01Actuators, is attached to the same certificate, and the backend gets a
separate inline IAM statement set. Without --apply nothing is sent to AWS.
"""
import argparse
import json
from pathlib import Path
import re
import runpy

ACTUATORS = ["VALVE01", "VALVE02", "VALVE03", "VALVE04", "FAN01", "LIGHT01", "MIST01"]
POLICY_NAME = "SmartFarmMvpENV01Actuators"
ROOT = "smartfarm/FARM001/"


def policies(region, account):
    if not re.fullmatch(r"[a-z]{2}(?:-[a-z]+)+-\d", region):
        raise ValueError("Invalid AWS region")
    if not re.fullmatch(r"\d{12}", account):
        raise ValueError("Account ID must contain 12 digits")
    prefix = f"arn:aws:iot:{region}:{account}:"

    def statement(action, kind, paths):
        return {"Effect": "Allow", "Action": action, "Resource": [prefix + kind + "/" + p for p in paths]}

    def topics(suffix):
        return [ROOT + actuator + "/" + suffix for actuator in ACTUATORS]

    # Device: receives only its own actuator commands; publishes ACK/status, never commands,
    # never retained, never another farm. No Connect statement: the original policy has it.
    device = {"Version": "2012-10-17", "Statement": [
        statement("iot:Subscribe", "topicfilter", topics("command")),
        statement("iot:Receive", "topic", topics("command")),
        statement("iot:Publish", "topic", topics("ack") + topics("status")),
    ]}
    # Backend runtime (inline IAM on the backend principal): publishes commands, reads ACK/status.
    backend = {"Version": "2012-10-17", "Statement": [
        statement("iot:Publish", "topic", topics("command")),
        statement("iot:Subscribe", "topicfilter", topics("ack") + topics("status")),
        statement("iot:Receive", "topic", topics("ack") + topics("status")),
    ]}
    return device, backend


def apply(session, region, account, output, device_policy, policy_name=POLICY_NAME):
    from botocore.exceptions import ClientError
    if session.create_client("sts", region_name=region).get_caller_identity()["Account"] != account:
        raise ValueError("Active AWS account differs from --account-id; no resources changed")
    state = json.loads((output / "provisioning.json").read_text())
    if state.get("accountId") != account or state.get("region") != region or state.get("thingName") != "ENV01":
        raise ValueError("provisioning.json does not belong to ENV01 in this account/region")
    iot = session.create_client("iot", region_name=region)
    try:
        existing = iot.get_policy(policyName=policy_name)
        if json.loads(existing["policyDocument"]) != device_policy:
            raise ValueError("Existing policy differs; refusing to replace or broaden it")
    except ClientError as error:
        if error.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        iot.create_policy(policyName=policy_name, policyDocument=json.dumps(device_policy))
    iot.attach_policy(policyName=policy_name, target=state["certificateArn"])
    print(f"{policy_name} attached to the ENV01 certificate; existing policies unchanged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", default="ap-southeast-1")
    parser.add_argument("--account-id", required=True)
    parser.add_argument("--output", type=Path, default=Path(".local/aws"))
    parser.add_argument("--apply", action="store_true", help="Create/attach the device policy with an authenticated profile")
    args = parser.parse_args()
    output = args.output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if output.is_relative_to(repo) and not output.is_relative_to(repo / ".local"):
        parser.error("Inside repository, output must be under ignored .local/")
    runpy.run_path(str(repo / "tools/aws/provision_day1.py"))["prepare_private_directory"](output)
    device, backend = policies(args.region, args.account_id)
    (output / "device-actuators-policy.json").write_text(json.dumps(device, indent=2) + "\n")
    (output / "backend-actuators-iam-policy.json").write_text(json.dumps(backend, indent=2) + "\n")
    if args.apply:
        import botocore.session
        apply(botocore.session.get_session(), args.region, args.account_id, output, device)
    else:
        print("Rendered only; attach backend-actuators-iam-policy.json as a separate inline IAM policy.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Actuator provisioning stopped:", type(error).__name__)
        raise SystemExit(1)
