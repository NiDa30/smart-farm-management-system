#!/usr/bin/env python3
"""Plan/apply provisioning for a public per-circuit monitor package; never publish MQTT.

Plan is offline. Apply uses an existing AWS profile, stores a separate certificate,
and never grants command rights or modifies backend IAM. No automatic rotation.
"""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import stat
import sys

from provision_day1 import prepare_private_directory
from render_irrigation_policies import policies

ROOT = Path(__file__).resolve().parents[2]
REGION = 'ap-southeast-1'
PUBLIC_FILES = frozenset((
    'src/main.cpp', 'include/ValveModel.h', 'include/ValveFeedback.h',
    'include/ValveMonitor.h', 'include/ValvePacket.h', 'config/config.example.h',
    'platformio.ini', 'diagram.json', 'wokwi.toml', 'data/.gitkeep', '.gitignore',
    'device-policy.json', 'backend-additional-identity-policy.json', 'README_VI.md',
))
LOCAL_FILES = frozenset((
    'plan.json', 'device-policy.json', 'backend-additional-identity-policy.json',
    'provisioner-iam-policy.json', 'provisioning.json', 'certificate-request.json',
    'device.pem.crt', 'private.pem.key', 'endpoint.txt', '.provisioning.lock',
))


class Refusal(ValueError):
    """Only fixed, public diagnostics may be passed to this exception."""


def checked_path(path):
    """Reject symbolic links, NTFS junctions and other reparse points, including parents."""
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink() or (part.exists() and getattr(part.lstat(), 'st_file_attributes', 0) & 0x400):
            raise Refusal('Path contains a link or Windows reparse point; use a separate ordinary directory')
    return path


def read_file(path, limit=65536):
    path = checked_path(path)
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > limit:
        raise Refusal('Expected a bounded ordinary file, not a directory or hard link')
    return path.read_bytes()


def object_json(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise Refusal('Duplicate JSON key')
            result[key] = value
        return result
    try:
        return json.loads(data, object_pairs_hook=unique,
                          parse_constant=lambda _: (_ for _ in ()).throw(Refusal('Non-finite JSON value')))
    except (ValueError, UnicodeError):
        raise Refusal('Invalid JSON document') from None


def encode(value):
    return json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True) + '\n'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load_package(project, account):
    project = checked_path(project)
    if not re.fullmatch(r'[0-9]{12}', account):
        raise Refusal('Account ID must be 12 ASCII digits')
    m = object_json(read_file(project / 'manifest.json'))
    if not isinstance(m, dict) or any(m.get(k) != v for k, v in {
        'packageVersion': 1, 'profile': 'IRRIGATION_MONITOR_ONLY', 'farmId': 'FARM001',
        'region': REGION, 'accountId': account, 'monitorOnly': True,
        'outputEnabled': False, 'provisioned': False,
    }.items()) or type(m.get('packageVersion')) is not int or any(
        type(m.get(key)) is not bool for key in ('monitorOnly', 'outputEnabled', 'provisioned')
    ):
        raise Refusal('Use the public monitor package for the explicitly selected account and Singapore region')
    c = m.get('circuit')
    if not isinstance(c, dict):
        raise Refusal('Missing circuit snapshot')
    for field in ('circuitId', 'zoneId'):
        if not isinstance(c.get(field), str) or not re.fullmatch(r'[A-Z][A-Z0-9_-]{1,31}', c[field]):
            raise Refusal('Invalid circuit/zone identity')
    for field, prefix in (('controllerId', 'IRRIGATION'), ('valveId', 'VALVE')):
        if not isinstance(c.get(field), str) or not re.fullmatch(prefix + r'(0[2-9]|[1-9][0-9])', c[field]):
            raise Refusal('Only separate controller/valve IDs 02..99 are supported')
    for field in ('revision', 'zoneRevision'):
        if type(c.get(field)) is not int or not 1 <= c[field] <= 2147483647:
            raise Refusal('Invalid circuit/zone revision')
    if c.get('expectedSource') != 'SIMULATOR' or c.get('pumpId') != 'PUMP01':
        raise Refusal('Only simulator monitor packages with the existing planned pump are supported')
    if m.get('statusTopic') != f"smartfarm/FARM001/{c['valveId']}/status":
        raise Refusal('Status topic differs from the circuit')
    hashes = m.get('filesSha256')
    if not isinstance(hashes, dict) or hashes.keys() != PUBLIC_FILES:
        raise Refusal('Package must contain the reviewed public file allowlist')
    files = {}
    for name in sorted(PUBLIC_FILES):
        data = read_file(project / name)
        if not isinstance(hashes[name], str) or digest(data) != hashes[name]:
            raise Refusal('Public package checksum differs; download a clean package again')
        files[name] = data
    expected = policies(REGION, account, c['controllerId'], c['valveId'], True)
    for filename, key in (('device-policy.json', 'devicePolicy'),
                          ('backend-additional-identity-policy.json', 'backendAdditionalIdentityPolicy')):
        if object_json(files[filename]) != expected[key]:
            raise Refusal('Package policy differs from the generated status-only policy')
    try:
        config = files['config/config.example.h'].decode('utf-8')
    except UnicodeError:
        raise Refusal('Invalid public configuration') from None
    macros = {'IRRIGATION_MONITOR_ONLY': '1', 'IRRIGATION_DEMO_ENABLED': '0',
              'IRRIGATION_SIMULATOR': '1', 'IRRIGATION_POSITION_FEEDBACK_ENABLED': '1',
              'IRRIGATION_CONTROLLER_ID': '"' + c['controllerId'] + '"',
              'IRRIGATION_VALVE_ID': '"' + c['valveId'] + '"',
              'IRRIGATION_CIRCUIT_ID': '"' + c['circuitId'] + '"',
              'IRRIGATION_ZONE_ID': '"' + c['zoneId'] + '"',
              'IRRIGATION_CIRCUIT_REVISION': str(c['revision']),
              'IRRIGATION_ZONE_REVISION': str(c['zoneRevision']),
              'IRRIGATION_AWS_ENDPOINT': '""', 'IRRIGATION_WIFI_PASSWORD': '""'}
    for key, value in macros.items():
        definitions = re.findall(r'^#define ' + key + r' ([^\r\n]+)$', config, re.M)
        if definitions != [value]:
            raise Refusal('Public profile macros differ from the monitor snapshot')
    scope = {'accountId': account, 'region': REGION, 'farmId': 'FARM001',
             **{key: c[key] for key in ('circuitId', 'revision', 'zoneId', 'zoneRevision', 'controllerId', 'valveId')}}
    return scope, expected


def plan_for(scope, expected):
    prefix = f"arn:aws:iot:{REGION}:{scope['accountId']}:"
    name = 'SmartFarmMonitor' + scope['controllerId'] + scope['valveId']
    def statement(actions, resources):
        return {'Effect': 'Allow', 'Action': actions, 'Resource': resources,
                'Condition': {'StringEquals': {'aws:RequestedRegion': REGION}}}
    # Certificate ID does not exist before CreateKeysAndCertificate; cert/* is
    # limited to this account/region, while Thing and policy names are exact.
    iam = {'Version': '2012-10-17', 'Statement': [
        statement(['iot:GetPolicy', 'iot:CreatePolicy'], prefix + 'policy/' + name),
        statement(['iot:DescribeThing', 'iot:CreateThing', 'iot:ListThingPrincipals', 'iot:ListThingGroupsForThing'], prefix + 'thing/' + scope['controllerId']),
        statement('iot:AttachThingPrincipal', [prefix + 'thing/' + scope['controllerId'], prefix + 'cert/*']),
        statement('iot:AttachPolicy', [prefix + 'policy/' + name, prefix + 'cert/*']),
        statement(['iot:DescribeCertificate', 'iot:UpdateCertificate', 'iot:ListPrincipalThings', 'iot:ListAttachedPolicies'], prefix + 'cert/*'),
        statement(['iot:CreateKeysAndCertificate', 'iot:DescribeEndpoint'], '*'),
    ]}
    plan = {'planVersion': 1, 'scope': scope, 'policyName': name,
            'thingAttributes': {'farmId': 'FARM001', 'profile': 'CIRCUIT_MONITOR', 'bindingHash': digest(encode(scope).encode())},
            'creates': ['one Thing', 'one status-only IoT policy', 'one dedicated certificate/private key'],
            'backendIamModified': False, 'mqttPublished': False, 'deviceOutputEnabled': False,
            'mappingCheckedOfflineOnly': True}
    return plan, {'device-policy.json': expected['devicePolicy'],
                  'backend-additional-identity-policy.json': expected['backendAdditionalIdentityPolicy'],
                  'provisioner-iam-policy.json': iam, 'plan.json': plan}


def prepare_output(output):
    output = checked_path(output)
    prepare_private_directory(output)
    for path in output.iterdir():
        if path.name not in LOCAL_FILES:
            raise Refusal('Unexpected file in isolated provisioning directory')
        read_file(path)
        if os.name != 'nt' and path.stat().st_mode & 0o077:
            raise Refusal('Private provisioning files must be chmod 600')
    return output


def durable_write(path, text):
    # Exclusive creation prevents overwriting a board key; fsync commits the
    # pending marker before the certificate request can leave this process.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream:
        stream.write(text)
        stream.flush()
        os.fsync(stream.fileno())
    if os.name != 'nt':
        fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


@contextmanager
def exclusive(output):
    lock = output / '.provisioning.lock'
    try:
        durable_write(lock, encode({'pid': os.getpid(), 'operation': 'CIRCUIT_MONITOR_PROVISION'}))
    except FileExistsError:
        raise Refusal('Provisioning lock exists; inspect the original process and recovery files before retrying') from None
    try:
        yield
    finally:
        lock.unlink()


def render(output, documents):
    for filename, document in documents.items():
        path = output / filename
        text = encode(document)
        if path.exists():
            if read_file(path) != text.encode():
                raise Refusal('Existing plan belongs to a different mapping; do not overwrite its keys or recovery state')
        else:
            durable_write(path, text)


def saved_state(output, scope, name):
    path = output / 'provisioning.json'
    if not path.exists():
        if any((output / x).exists() for x in ('certificate-request.json', 'device.pem.crt', 'private.pem.key')):
            raise Refusal('Interrupted certificate request or orphan key: inspect AWS privately; automatic certificate creation is blocked')
        return None
    state = object_json(read_file(path))
    if not isinstance(state, dict) or state.get('scope') != scope or state.get('policyName') != name:
        raise Refusal('Saved certificate belongs to another mapping/account')
    cid = state.get('certificateId', '')
    if not isinstance(cid, str) or not re.fullmatch('[a-f0-9]{64}', cid) or state.get('certificateArn') != f"arn:aws:iot:{REGION}:{scope['accountId']}:cert/{cid}":
        raise Refusal('Saved certificate identity is invalid')
    for filename, field in (('device.pem.crt', 'certificateSha256'), ('private.pem.key', 'privateKeySha256')):
        try:
            if digest(read_file(output / filename)) != state.get(field):
                raise Refusal('Saved key/certificate checksum differs; no automatic rotation')
        except FileNotFoundError:
            raise Refusal('Saved certificate has missing private files; no automatic rotation') from None
    validate_pair(output)
    return state


def validate_pair(output):
    try:
        ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT).load_cert_chain(str(output / 'device.pem.crt'), str(output / 'private.pem.key'))
    except (ssl.SSLError, OSError):
        raise Refusal('Local certificate/private key pair cannot be loaded') from None


def limited_list(response, field):
    # IoT list APIs use two different pagination names.
    if response.get('nextToken') or response.get('nextMarker'):
        raise Refusal('Remote attachments exceed one bounded page; inspect privately')
    return response.get(field, [])


def certificate_status(iot, output, state):
    cert = iot.describe_certificate(certificateId=state['certificateId'])['certificateDescription']
    status = cert.get('status')
    if cert.get('certificateArn') != state['certificateArn'] or status not in ('ACTIVE', 'INACTIVE'):
        raise Refusal('Existing certificate identity/status requires manual review')
    try:
        local = ssl.PEM_cert_to_DER_cert(read_file(output / 'device.pem.crt').decode('ascii'))
        remote = ssl.PEM_cert_to_DER_cert(cert.get('certificatePem', ''))
    except (ValueError, UnicodeError):
        raise Refusal('Remote certificate cannot be matched to the local certificate') from None
    if local != remote:
        raise Refusal('Remote certificate differs from the local certificate')
    return status


def check_attachments(iot, plan, state, thing_exists=True):
    arn = state['certificateArn'] if state else None
    if thing_exists:
        principals = limited_list(iot.list_thing_principals(thingName=plan['scope']['controllerId'], maxResults=250), 'principals')
        if any(p != arn for p in principals):
            raise Refusal('Thing already has another principal; refusing to share or replace its identity')
        if limited_list(iot.list_thing_groups_for_thing(thingName=plan['scope']['controllerId'], maxResults=250), 'thingGroups'):
            raise Refusal('Thing belongs to a group that may add policy rights; use an isolated monitor Thing')
    if state:
        things = limited_list(iot.list_principal_things(principal=arn, maxResults=250), 'things')
        attached = limited_list(iot.list_attached_policies(target=arn, pageSize=250), 'policies')
        if any(t != plan['scope']['controllerId'] for t in things) or any(p.get('policyName') != plan['policyName'] for p in attached):
            raise Refusal('Certificate is attached to another Thing or policy; no automatic changes')


def provision(session, output, plan, device_policy):
    from botocore.config import Config
    from botocore.exceptions import ClientError
    scope = plan['scope']
    state = saved_state(output, scope, plan['policyName'])  # before any AWS call
    config = Config(retries={'total_max_attempts': 1, 'mode': 'standard'}, connect_timeout=10, read_timeout=20)
    with session.create_client('sts', region_name=REGION, config=config) as sts:
        if sts.get_caller_identity()['Account'] != scope['accountId']:
            raise Refusal('Active AWS account differs; no resources changed')
    with session.create_client('iot', region_name=REGION, config=config) as iot:
        # All existing-resource checks precede mutation. Missing does not mean denied.
        try:
            p = iot.get_policy(policyName=plan['policyName'])
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
            p = None
        if p is not None and object_json(p['policyDocument']) != device_policy:
            raise Refusal('Existing IoT policy differs; refusing to replace or broaden it')
        try:
            thing = iot.describe_thing(thingName=scope['controllerId'])
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
            thing = None
        if thing is not None and thing.get('attributes') != plan['thingAttributes']:
            raise Refusal('Existing Thing belongs to another mapping or profile')
        status = None
        if state:
            status = certificate_status(iot, output, state)
        check_attachments(iot, plan, state, thing is not None)
        endpoint = iot.describe_endpoint(endpointType='iot:Data-ATS')['endpointAddress']
        if not isinstance(endpoint, str) or not re.fullmatch(r'[a-z0-9]+-ats\.iot\.ap-southeast-1\.amazonaws\.com', endpoint):
            raise Refusal('Unexpected Data-ATS endpoint')
        if (output / 'endpoint.txt').exists() and read_file(output / 'endpoint.txt') != (endpoint + '\n').encode():
            raise Refusal('Saved endpoint differs; inspect before retrying')
        if p is None:
            iot.create_policy(policyName=plan['policyName'], policyDocument=encode(device_policy))
        if thing is None:
            iot.create_thing(thingName=scope['controllerId'], attributePayload={'attributes': plan['thingAttributes']})
        if state is None:
            checkpoint = output / 'certificate-request.json'
            durable_write(checkpoint, encode({'scope': scope, 'phase': 'CREATE_CERTIFICATE_PENDING'}))
            try:
                cert = iot.create_keys_and_certificate(setAsActive=False)
            except ClientError as e:
                if e.response['Error']['Code'] in ('AccessDeniedException', 'UnauthorizedException', 'InvalidRequestException'):
                    checkpoint.unlink()  # definite rejection, not a timeout/unknown outcome
                raise
            cid = cert.get('certificateId', '')
            if not isinstance(cid, str) or not re.fullmatch('[a-f0-9]{64}', cid) or cert.get('certificateArn') != f"arn:aws:iot:{REGION}:{scope['accountId']}:cert/{cid}":
                raise Refusal('Unexpected new certificate identity; pending marker retained')
            state = {'scope': scope, 'policyName': plan['policyName'], 'certificateId': cid,
                     'certificateArn': cert['certificateArn'],
                     'certificateSha256': digest(cert['certificatePem'].encode('utf-8')),
                     'privateKeySha256': digest(cert['keyPair']['PrivateKey'].encode('utf-8'))}
            # Preserve the known ARN before writing key material, so a full disk
            # cannot hide which inactive resource needs manual recovery.
            durable_write(output / 'provisioning.json', encode(state))
            durable_write(output / 'device.pem.crt', cert['certificatePem'])
            durable_write(output / 'private.pem.key', cert['keyPair']['PrivateKey'])
            validate_pair(output)
            status = 'INACTIVE'
        check_attachments(iot, plan, state)
        iot.attach_thing_principal(thingName=scope['controllerId'], principal=state['certificateArn'], thingPrincipalType='EXCLUSIVE_THING')
        iot.attach_policy(policyName=plan['policyName'], target=state['certificateArn'])
        # Exact equality, not just absence of another name, before activation.
        principals = limited_list(iot.list_thing_principals(thingName=scope['controllerId'], maxResults=250), 'principals')
        things = limited_list(iot.list_principal_things(principal=state['certificateArn'], maxResults=250), 'things')
        attached = limited_list(iot.list_attached_policies(target=state['certificateArn'], pageSize=250), 'policies')
        if set(principals) != {state['certificateArn']} or set(things) != {scope['controllerId']} or [p.get('policyName') for p in attached] != [plan['policyName']]:
            raise Refusal('Attachments not confirmed; retain state and retry later without creating another certificate')
        if limited_list(iot.list_thing_groups_for_thing(thingName=scope['controllerId'], maxResults=250), 'thingGroups'):
            raise Refusal('Thing group membership changed before activation; inspect privately')
        if status == 'INACTIVE':
            iot.update_certificate(certificateId=state['certificateId'], newStatus='ACTIVE')
        if certificate_status(iot, output, state) != 'ACTIVE':
            raise Refusal('Certificate activation not confirmed; retain state and retry later')
        if not (output / 'endpoint.txt').exists():
            durable_write(output / 'endpoint.txt', endpoint + '\n')
        if (output / 'certificate-request.json').exists():
            (output / 'certificate-request.json').unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-dir', type=Path, required=True, help='Extracted public package, not ZIP; never execute package scripts')
    parser.add_argument('--account-id', required=True, help='Must match manifest and authenticated STS account on apply')
    parser.add_argument('--profile', help='Existing local AWS profile, e.g. smartfarm; credentials never entered here')
    parser.add_argument('--apply', action='store_true', help='Create/attach one dedicated monitor identity, then activate its certificate')
    args = parser.parse_args(argv)
    scope, expected = load_package(args.project_dir, args.account_id)
    plan, documents = plan_for(scope, expected)
    output = prepare_output(ROOT / '.local/aws/circuit-monitor' / args.account_id / scope['controllerId'])
    with exclusive(output):
        render(output, documents)
        if args.apply:
            import botocore.session
            session = botocore.session.Session(profile=args.profile)
            provision(session, output, plan, expected['devicePolicy'])
    print('Monitor identity provisioned; private files saved in:' if args.apply else 'PLAN ONLY; no AWS calls. Review plan and IAM in:', output)
    print('Backend IAM unchanged; simulator not started; GPIO remains OFF. Re-check current web mapping before use.')


def cli():
    try:
        main()
        return 0
    except Exception as error:
        print('Circuit monitor provisioning stopped:', type(error).__name__, file=sys.stderr)
        if isinstance(error, Refusal):
            print(str(error), file=sys.stderr)
        elif type(error).__name__ == 'ClientError':
            op = getattr(error, 'operation_name', 'Unknown')
            code = error.response.get('Error', {}).get('Code', 'Unknown')
            if re.fullmatch(r'[A-Za-z0-9_.-]+', op) and re.fullmatch(r'[A-Za-z0-9_.-]+', code):
                print('AWS operation:', op, '| error code:', code, file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(cli())
