#!/usr/bin/env python3
"""Render narrow WATER/SOIL/WEATHER monitor-node policies; --apply provisions one monitor-only client.
Uses existing AWS profile. Never prints SDK responses, PEMs or credentials.
"""
import argparse
import json
import os
import re
from pathlib import Path
from provision_day1 import prepare_private_directory, write_private, policies as legacy_policies

ROOT = Path(__file__).resolve().parents[2]


def node_id(value):
    if not re.fullmatch(r'[A-Z][A-Z0-9_-]{1,31}', value or '') or value in ('ENV01', 'PUMP01', 'IRRIGATION01', 'VALVE01'):
        raise ValueError('Use a separate monitor-node ID, not ENV01/PUMP01')
    return value


def policies(region, account, device):
    node_id(device)
    legacy_policies(region, account)  # Existing account/region validation, no calls.
    prefix = f'arn:aws:iot:{region}:{account}:'
    name = 'SmartFarmMvp' + device
    root = 'smartfarm/FARM001/' + device
    device_policy = {'Version': '2012-10-17', 'Statement': [
        {'Effect': 'Allow', 'Action': 'iot:Connect', 'Resource': prefix + 'client/' + device},
        {'Effect': 'Allow', 'Action': 'iot:Publish', 'Resource': prefix + 'topic/' + root + '/telemetry'},
    ]}
    provisioner = {'Version': '2012-10-17', 'Statement': [
        {'Effect': 'Allow', 'Action': ['iot:GetPolicy', 'iot:CreatePolicy'], 'Resource': prefix + 'policy/' + name},
        {'Effect': 'Allow', 'Action': ['iot:DescribeThing', 'iot:CreateThing'], 'Resource': prefix + 'thing/' + device},
        {'Effect': 'Allow', 'Action': 'iot:AttachThingPrincipal', 'Resource': [prefix + 'thing/' + device, prefix + 'cert/*']},
        {'Effect': 'Allow', 'Action': 'iot:AttachPolicy', 'Resource': [prefix + 'policy/' + name, prefix + 'cert/*']},
        {'Effect': 'Allow', 'Action': 'iot:DescribeCertificate', 'Resource': prefix + 'cert/*'},
        {'Effect': 'Allow', 'Action': ['iot:CreateKeysAndCertificate', 'iot:DescribeEndpoint'], 'Resource': '*'},
    ]}
    for item in provisioner['Statement']:
        item['Condition'] = {'StringEquals': {'aws:RequestedRegion': region}}
    return device_policy, provisioner


def _provision(session, region, account, device, output, policy, node_type="WATER"):
    if node_type not in ("WATER", "SOIL", "WEATHER"): raise ValueError("Unsupported monitor type")
    from botocore.exceptions import ClientError
    from botocore.config import Config
    device = node_id(device)
    if session.create_client('sts', region_name=region).get_caller_identity()['Account'] != account:
        raise ValueError('Active AWS account differs; no resources changed')
    iot = session.create_client('iot', region_name=region, config=Config(retries={'total_max_attempts': 1, 'mode': 'standard'}))
    name = 'SmartFarmMvp' + device
    try:
        existing = iot.get_policy(policyName=name)
        if json.loads(existing['policyDocument']) != policy:
            raise ValueError('Existing policy differs; refusing to change it')
    except ClientError as error:
        if error.response['Error']['Code'] != 'ResourceNotFoundException': raise
        iot.create_policy(policyName=name, policyDocument=json.dumps(policy))
    try:
        thing = iot.describe_thing(thingName=device)
        attrs = thing.get('attributes', {})
        if attrs.get('farmId') != 'FARM001' or attrs.get('nodeType') != node_type:
            raise ValueError('Existing Thing has another farm or monitor type')
    except ClientError as error:
        if error.response['Error']['Code'] != 'ResourceNotFoundException': raise
        iot.create_thing(thingName=device, attributePayload={'attributes': {
            'farmId': 'FARM001', 'nodeType': node_type, 'project': 'smart-farm-mvp'}})
    manifest = output / 'provisioning.json'
    checkpoint = output / 'certificate-request.json'
    if manifest.exists():
        state = json.loads(manifest.read_text())
        if any(state.get(k) != v for k, v in {'accountId': account, 'region': region, 'thingName': device, 'nodeType': node_type}.items()):
            raise ValueError('Manifest belongs to another node/account/region')
        certificate_id = state.get('certificateId', '')
        if not re.fullmatch('[a-f0-9]{64}', certificate_id) or state.get('certificateArn') != f'arn:aws:iot:{region}:{account}:cert/{certificate_id}':
            raise ValueError('Certificate manifest identity mismatch')
        if not all((output / f).is_file() for f in ('device.pem.crt', 'private.pem.key')):
            raise ValueError('Manifest has missing key/certificate; refusing duplicate certificate')
        if iot.describe_certificate(certificateId=certificate_id)['certificateDescription']['status'] != 'ACTIVE':
            raise ValueError('Certificate is not ACTIVE')
    else:
        if any((output / f).exists() for f in ('device.pem.crt', 'private.pem.key')):
            raise ValueError('Orphan files without manifest; refusing overwrite')
        if checkpoint.exists():
            raise ValueError('Previous certificate request interrupted; inspect AWS certificates privately before retrying')
        write_private(checkpoint, json.dumps({'thingName': device, 'phase': 'CREATE_CERTIFICATE_PENDING'}) + '\n')
        try:
            cert = iot.create_keys_and_certificate(setAsActive=True)
        except ClientError as error:
            # A definite authorization/input rejection did not create a certificate.
            # Leave the checkpoint for ambiguous transport/service failures.
            if error.response['Error']['Code'] in ('AccessDeniedException', 'UnauthorizedException', 'InvalidRequestException'):
                checkpoint.unlink()
            raise
        state = {'accountId': account, 'region': region, 'thingName': device, 'nodeType': node_type,
                 'certificateId': cert['certificateId'], 'certificateArn': cert['certificateArn']}
        # Persist recovery identity before attachment; do not create another cert on retry.
        write_private(manifest, json.dumps(state, indent=2) + '\n')
        write_private(output / 'device.pem.crt', cert['certificatePem'])
        write_private(output / 'private.pem.key', cert['keyPair']['PrivateKey'])
    if checkpoint.exists(): checkpoint.unlink()
    iot.attach_thing_principal(thingName=device, principal=state['certificateArn'])
    iot.attach_policy(policyName=name, target=state['certificateArn'])
    endpoint = iot.describe_endpoint(endpointType='iot:Data-ATS')['endpointAddress']
    if not re.fullmatch(r'[a-z0-9-]+\.iot\.' + re.escape(region) + r'\.amazonaws\.com', endpoint):
        raise ValueError('Unexpected endpoint format')
    (output / 'endpoint.txt').write_text(endpoint + '\n')
    print('Monitor Thing/certificate/policy provisioned. Private directory:', output)


def provision(session, region, account, device, output, policy, node_type="WATER"):
    if node_type not in ("WATER", "SOIL", "WEATHER"): raise ValueError("Unsupported monitor type")
    node_id(device)
    lock = output / '.provisioning.lock'
    try:
        fd = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        raise ValueError('Provisioning is running or interrupted; inspect the private lock and certificate state before retrying')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(json.dumps({'nodeId': device, 'pid': os.getpid()}) + '\n')
        return _provision(session, region, account, device, output, policy, node_type)
    finally:
        lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node-id')
    parser.add_argument('--node-type', choices=('WATER', 'SOIL', 'WEATHER'), default='WATER')
    parser.add_argument('--region', default='ap-southeast-1')
    parser.add_argument('--account-id', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    device = node_id(args.node_id or (args.node_type + "01"))
    device_policy, iam = policies(args.region, args.account_id, device)
    output = (ROOT / '.local/aws' / device).resolve()
    if output.name != device or not output.is_relative_to((ROOT / '.local').resolve()):
        raise ValueError('Private output must be isolated per node')
    for filename in ('provisioning.json', '.provisioning.lock', 'certificate-request.json', 'device.pem.crt', 'private.pem.key', 'endpoint.txt', 'device-policy.json', 'provisioner-iam-policy.json'):
        if (output / filename).is_symlink(): raise ValueError('Refusing a symlink in private output')
    prepare_private_directory(output)
    for filename, document in [('device-policy.json', device_policy), ('provisioner-iam-policy.json', iam)]:
        (output / filename).write_text(json.dumps(document, indent=2) + '\n')
    if args.apply:
        import botocore.session
        provision(botocore.session.get_session(), args.region, args.account_id, device, output, device_policy, args.node_type)
    else:
        print('Rendered only; no AWS operation. Review policies in:', output)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Monitor provisioning stopped:', type(error).__name__)
        if type(error).__name__ == 'ClientError':
            op = getattr(error, 'operation_name', 'Unknown')
            code = error.response.get('Error', {}).get('Code', 'Unknown')
            if re.fullmatch(r'[A-Za-z0-9_.-]+', op) and re.fullmatch(r'[A-Za-z0-9_.-]+', code):
                print('AWS operation:', op, '| error code:', code)
        elif isinstance(error, ValueError):
            # Every ValueError text above is controlled, not an SDK/private response.
            print(str(error))
        raise SystemExit(1)
