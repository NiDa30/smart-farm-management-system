#!/usr/bin/env python3
"""Render scoped policies; --apply provisions the device with existing AWS credentials.

Never prints certificate/private-key/API responses. The backend policy is a document
for an existing runtime role; this script does not invent role trust relationships.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess


def prepare_private_directory(output):
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "nt":
        # Windows chmod/stat do not describe NTFS access control. Replace the
        # directory ACL before writing secrets; new files inherit this ACL.
        script = r"""
$ErrorActionPreference = 'Stop'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$path = $env:SMARTFARM_PRIVATE_DIRECTORY
# Read and update only the DACL. Do not touch owner/group/SACL, which can
# require privileges unavailable to a normal Windows user.
$acl = [System.IO.Directory]::GetAccessControl($path, [System.Security.AccessControl.AccessControlSections]::Access)
$acl.SetAccessRuleProtection($true, $false)
foreach ($existing in @($acl.GetAccessRules($true, $false, [System.Security.Principal.SecurityIdentifier]))) {
    $acl.RemoveAccessRuleSpecific($existing)
}
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule)
[System.IO.Directory]::SetAccessControl($path, $acl)
"""
        subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            env={**os.environ, "SMARTFARM_PRIVATE_DIRECTORY": str(output)},
            check=True, capture_output=True,
        )
    elif output.stat().st_mode & 0o077:
        raise ValueError("Output directory must be private (chmod 700)")


def policies(region, account):
    if not re.fullmatch(r"[a-z]{2}(?:-[a-z]+)+-\d", region):
        raise ValueError("Invalid AWS region")
    if not re.fullmatch(r"\d{12}", account):
        raise ValueError("Account ID must contain 12 digits")
    prefix = f"arn:aws:iot:{region}:{account}:"
    def statement(action, kind, paths):
        return {"Effect": "Allow", "Action": action,
                "Resource": [prefix + kind + "/" + path for path in paths]}
    root = "smartfarm/FARM001/"
    device = {"Version": "2012-10-17", "Statement": [
        statement("iot:Connect", "client", ["ENV01"]),
        statement("iot:Publish", "topic", [root + p for p in [
            "ENV01/telemetry", "ENV01/status", "PUMP01/ack", "PUMP01/status", "PUMP01/event"]]),
        statement("iot:Subscribe", "topicfilter", [root + "PUMP01/command"]),
        statement("iot:Receive", "topic", [root + "PUMP01/command"]),
    ]}
    filters = [root + "+/" + suffix for suffix in ["telemetry", "status", "ack", "event"]]
    receive = [root + "*/" + suffix for suffix in ["telemetry", "status", "ack", "event"]]
    # An isolated backend echo tests publish/PUBACK without commanding the pump.
    backend = {"Version": "2012-10-17", "Statement": [
        statement("iot:Connect", "client", ["smartfarm-backend-FARM001"]),
        statement("iot:Publish", "topic", [root + "PUMP01/command", root + "backend/probe"]),
        statement("iot:Subscribe", "topicfilter", filters + [root + "backend/probe"]),
        statement("iot:Receive", "topic", receive + [root + "backend/probe"]),
    ]}
    return device, backend


def write_private(path, contents):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(contents)


def provision(session, region, account, output, device_policy):
    from botocore.exceptions import ClientError
    sts = session.create_client("sts", region_name=region)
    if sts.get_caller_identity()["Account"] != account:
        raise ValueError("Active AWS account differs from --account-id; no resources changed")
    iot = session.create_client("iot", region_name=region)
    name = "SmartFarmMvpENV01"
    try:
        existing = iot.get_policy(policyName=name)
        if json.loads(existing["policyDocument"]) != device_policy:
            raise ValueError("Existing policy differs; refusing to replace or broaden it")
    except ClientError as error:
        if error.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        iot.create_policy(policyName=name, policyDocument=json.dumps(device_policy))
    try:
        thing = iot.describe_thing(thingName="ENV01")
        if thing.get("attributes", {}).get("farmId") != "FARM001":
            raise ValueError("Existing ENV01 is not marked FARM001; refusing to attach a new principal")
    except ClientError as error:
        if error.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        iot.create_thing(thingName="ENV01", attributePayload={"attributes": {"farmId": "FARM001", "project": "smart-farm-mvp"}})
    state_path = output / "provisioning.json"
    if state_path.exists():
        state = json.loads(state_path.read_text())
        if state["accountId"] != account or state["region"] != region:
            raise ValueError("Output manifest belongs to a different AWS account/region")
        for filename in ["device.pem.crt", "private.pem.key"]:
            if not (output / filename).is_file():
                raise ValueError("Existing certificate manifest has missing local files; do not create a duplicate certificate")
        cert = iot.describe_certificate(certificateId=state["certificateId"])["certificateDescription"]
        if cert["status"] != "ACTIVE":
            raise ValueError("Existing certificate is not ACTIVE; review before reconnecting")
    else:
        if any((output / f).exists() for f in ["device.pem.crt", "private.pem.key"]):
            raise ValueError("Certificate files already exist without manifest; refusing overwrite")
        cert = iot.create_keys_and_certificate(setAsActive=True)
        state = {"accountId": account, "region": region, "thingName": "ENV01",
                 "certificateId": cert["certificateId"], "certificateArn": cert["certificateArn"]}
        # Record the new resource before attachments so retries can recover partial setup.
        write_private(state_path, json.dumps(state, indent=2) + "\n")
        write_private(output / "device.pem.crt", cert["certificatePem"])
        write_private(output / "private.pem.key", cert["keyPair"]["PrivateKey"])
    iot.attach_thing_principal(thingName="ENV01", principal=state["certificateArn"])
    iot.attach_policy(policyName=name, target=state["certificateArn"])
    endpoint = iot.describe_endpoint(endpointType="iot:Data-ATS")["endpointAddress"]
    (output / "endpoint.txt").write_text(endpoint + "\n")
    print("AWS Thing/certificate/policy provisioned. Private files and endpoint saved to", output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", default="ap-southeast-1")
    parser.add_argument("--account-id", required=True)
    parser.add_argument("--output", type=Path, default=Path(".local/aws"))
    parser.add_argument("--apply", action="store_true", help="Create/attach AWS IoT resources using an existing authenticated profile")
    args = parser.parse_args()
    output = args.output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if output.is_relative_to(repo) and not output.is_relative_to(repo / ".local"):
        parser.error("Inside repository, output must be under ignored .local/")
    prepare_private_directory(output)
    device, backend = policies(args.region, args.account_id)
    for name, doc in [("device-policy.json", device), ("backend-iam-policy.json", backend)]:
        (output / name).write_text(json.dumps(doc, indent=2) + "\n")
    if args.apply:
        import botocore.session
        provision(botocore.session.get_session(), args.region, args.account_id, output, device)
    else:
        print("Policies rendered only; no AWS operation performed. Use --apply after authentication.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Deliberately omit SDK exception content, responses and credential details.
        print("Provisioning stopped:", type(error).__name__, "— inspect authentication, scope or existing resources privately")
        if type(error).__name__ == "ClientError":
            code = error.response.get("Error", {}).get("Code", "Unknown")
            operation = getattr(error, "operation_name", "Unknown")
            # Only identifiers: never serialize the SDK response or message.
            if re.fullmatch(r"[A-Za-z0-9_.-]+", code) and re.fullmatch(r"[A-Za-z0-9_.-]+", operation):
                print("AWS operation:", operation, "| error code:", code)
        raise SystemExit(1)
