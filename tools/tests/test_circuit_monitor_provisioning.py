"""Offline package + synthetic SDK tests. No real AWS or existing private files."""
from contextlib import redirect_stdout, redirect_stderr
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/aws'))
import provision_circuit_monitor as tool
from botocore.exceptions import ClientError

ACCOUNT = '123456789012'
CERT_ID = 'b' * 64
ARN = f'arn:aws:iot:ap-southeast-1:{ACCOUNT}:cert/{CERT_ID}'


def error(operation, code='AccessDeniedException'):
    return ClientError({'Error': {'Code': code, 'Message': 'SYNTHETIC PRIVATE SDK MESSAGE'}}, operation)


class IoT:
    def __init__(self, cert, key, output):
        self.policy = self.attrs = None
        self.principals, self.things, self.attached = [], [], []
        self.status, self.creates, self.attempts = 'INACTIVE', 0, 0
        self.fail, self.fail_create, self.endpoint = None, None, 'example123-ats.iot.ap-southeast-1.amazonaws.com'
        self.calls, self.mutations, self.cert, self.key, self.output = [], [], cert, key, output
        self.extra_page = False
        self.groups = []
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def call(self, op, kw, mutate=False):
        self.calls.append((op, kw))
        if self.fail == op:
            self.fail = None
            raise error(op)
        if mutate: self.mutations.append(op)
    def get_policy(self, **kw):
        self.call('GetPolicy', kw)
        if self.policy is None: raise error('GetPolicy', 'ResourceNotFoundException')
        return {'policyDocument': json.dumps(self.policy)}
    def describe_thing(self, **kw):
        self.call('DescribeThing', kw)
        if self.attrs is None: raise error('DescribeThing', 'ResourceNotFoundException')
        return {'attributes': self.attrs}
    def list_thing_principals(self, **kw):
        self.call('ListThingPrincipals', kw)
        return {'principals': self.principals, **({'nextToken': 'next'} if self.extra_page else {})}
    def list_principal_things(self, **kw):
        self.call('ListPrincipalThings', kw)
        return {'things': self.things}
    def list_thing_groups_for_thing(self, **kw):
        self.call('ListThingGroupsForThing', kw)
        return {'thingGroups': self.groups}
    def list_attached_policies(self, **kw):
        self.call('ListAttachedPolicies', kw)
        return {'policies': [{'policyName': p} for p in self.attached]}
    def describe_endpoint(self, **kw):
        self.call('DescribeEndpoint', kw)
        return {'endpointAddress': self.endpoint}
    def create_policy(self, **kw):
        self.call('CreatePolicy', kw, True)
        self.policy = json.loads(kw['policyDocument'])
    def create_thing(self, **kw):
        self.call('CreateThing', kw, True)
        self.attrs = kw['attributePayload']['attributes']
    def create_keys_and_certificate(self, **kw):
        self.call('CreateKeysAndCertificate', kw, True)
        self.attempts += 1
        assert kw == {'setAsActive': False}
        assert (self.output / 'certificate-request.json').is_file()
        if self.fail_create:
            e = self.fail_create
            self.fail_create = None
            raise e
        self.creates += 1
        return {'certificateId': CERT_ID, 'certificateArn': ARN,
                'certificatePem': self.cert, 'keyPair': {'PrivateKey': self.key}}
    def describe_certificate(self, **kw):
        self.call('DescribeCertificate', kw)
        return {'certificateDescription': {'certificateArn': ARN, 'status': self.status, 'certificatePem': self.cert}}
    def attach_thing_principal(self, **kw):
        assert (self.output / 'provisioning.json').is_file()
        assert (self.output / 'private.pem.key').is_file()
        assert kw['thingPrincipalType'] == 'EXCLUSIVE_THING'
        self.call('AttachThingPrincipal', kw, True)
        self.principals = [kw['principal']]
        self.things = [kw['thingName']]
    def attach_policy(self, **kw):
        self.call('AttachPolicy', kw, True)
        self.attached = [kw['policyName']]
    def update_certificate(self, **kw):
        assert self.principals == [ARN] and self.things == ['IRRIGATION06']
        assert self.attached == ['SmartFarmMonitorIRRIGATION06VALVE06']
        self.call('UpdateCertificate', kw, True)
        self.status = kw['newStatus']


class Session:
    def __init__(self, iot, account=ACCOUNT): self.iot, self.account, self.configs = iot, account, []
    def create_client(self, name, **kw):
        self.configs.append(kw['config'])
        return self if name == 'sts' else self.iot
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def get_caller_identity(self): return {'Account': self.account}


class CircuitProvisionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Disposable self-signed pair belongs only to these offline tests.
        cls.crypto = tempfile.TemporaryDirectory()
        p = Path(cls.crypto.name)
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                        '-subj', '/CN=synthetic-test-only.invalid', '-keyout', str(p / 'key'),
                        '-out', str(p / 'cert')], check=True, capture_output=True)
        cls.cert, cls.key = (p / 'cert').read_text(), (p / 'key').read_text()
    @classmethod
    def tearDownClass(cls): cls.crypto.cleanup()
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.project = self.base / 'public-project'
        # Use the actual final public package from chapter44 when available;
        # otherwise render a public fixture from the same checked-in templates.
        c = {'circuitId': 'PKC1', 'zoneId': 'PKZONE1', 'controllerId': 'IRRIGATION06',
             'valveId': 'VALVE06', 'revision': 1, 'zoneRevision': 1,
             'expectedSource': 'SIMULATOR', 'pumpId': 'PUMP01'}
        expected = tool.policies(tool.REGION, ACCOUNT, c['controllerId'], c['valveId'], True)
        for name in tool.PUBLIC_FILES:
            dst = self.project / name
            dst.parent.mkdir(parents=True, exist_ok=True)
            source = ROOT / 'firmware/irrigation-node' / name
            dst.write_bytes(source.read_bytes() if source.exists() else b'public fixture\n')
        text = (self.project / 'config/config.example.h').read_text()
        changes = {'IRRIGATION_MONITOR_ONLY': '1', 'IRRIGATION_POSITION_FEEDBACK_ENABLED': '1',
                   **{'IRRIGATION_' + k: json.dumps(v) for k, v in
                      [('CONTROLLER_ID', c['controllerId']), ('VALVE_ID', c['valveId']),
                       ('CIRCUIT_ID', c['circuitId']), ('ZONE_ID', c['zoneId'])]}}
        import re
        for key, value in changes.items(): text = re.sub(r'^#define ' + key + r' .+$', '#define ' + key + ' ' + value, text, flags=re.M)
        (self.project / 'config/config.example.h').write_text(text)
        for filename, key in [('device-policy.json', 'devicePolicy'), ('backend-additional-identity-policy.json', 'backendAdditionalIdentityPolicy')]:
            (self.project / filename).write_text(tool.encode(expected[key]))
        self.manifest = {'packageVersion': 1, 'profile': 'IRRIGATION_MONITOR_ONLY', 'farmId': 'FARM001',
                         'region': tool.REGION, 'accountId': ACCOUNT, 'monitorOnly': True,
                         'outputEnabled': False, 'provisioned': False, 'circuit': c,
                         'statusTopic': 'smartfarm/FARM001/VALVE06/status'}
        self.rehash()
        self.scope, self.expected = tool.load_package(self.project, ACCOUNT)
        self.plan, self.documents = tool.plan_for(self.scope, self.expected)
        self.output = tool.prepare_output(self.base / 'private-output')
        self.iot = IoT(self.cert, self.key, self.output)
        self.session = Session(self.iot)
    def rehash(self):
        self.manifest['filesSha256'] = {name: tool.digest((self.project / name).read_bytes()) for name in tool.PUBLIC_FILES}
        (self.project / 'manifest.json').write_text(tool.encode(self.manifest))
    def apply(self):
        tool.prepare_output(self.output)
        with tool.exclusive(self.output):
            tool.render(self.output, self.documents)
            tool.provision(self.session, self.output, self.plan, self.expected['devicePolicy'])
    def test_plan_only_cli_has_no_sdk_client_and_does_not_touch_project(self):
        before = {name: (self.project / name).read_bytes() for name in tool.PUBLIC_FILES}
        with patch.object(tool, 'ROOT', self.base), patch('botocore.session.Session', side_effect=AssertionError('SDK forbidden')), redirect_stdout(io.StringIO()):
            tool.main(['--project-dir', str(self.project), '--account-id', ACCOUNT])
        out = self.base / '.local/aws/circuit-monitor' / ACCOUNT / 'IRRIGATION06'
        self.assertEqual(set(p.name for p in out.iterdir()), set(self.documents))
        self.assertEqual(before, {n: (self.project / n).read_bytes() for n in tool.PUBLIC_FILES})
    def test_offline_plan_runs_without_site_packages_or_sdk_installed(self):
        code = ('import sys; from pathlib import Path; '
                'sys.path.insert(0, sys.argv.pop(1)); '
                'import provision_circuit_monitor as t; '
                't.ROOT=Path(sys.argv.pop(1)); t.main(sys.argv[1:])')
        result = subprocess.run([sys.executable, '-S', '-c', code,
                                 str(ROOT / 'tools/aws'), str(self.base),
                                 '--project-dir', str(self.project), '--account-id', ACCOUNT,
                                 '--profile', 'profile-does-not-exist'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('PLAN ONLY; no AWS calls', result.stdout)
    def test_success_and_repeat_keep_one_identity_without_commands_or_backend_iam(self):
        self.apply()
        before = (self.output / 'private.pem.key').read_bytes()
        self.apply()
        self.assertEqual((self.iot.creates, self.iot.status), (1, 'ACTIVE'))
        self.assertEqual(before, (self.output / 'private.pem.key').read_bytes())
        self.assertNotIn('Publish', [operation for operation, _ in self.iot.calls])
        self.assertFalse((self.output / 'certificate-request.json').exists())
        self.assertEqual((self.output / 'endpoint.txt').read_text(), self.iot.endpoint + '\n')
        for c in self.session.configs: self.assertEqual(c.retries['total_max_attempts'], 1)
    def test_attachment_failure_resumes_inactive_certificate_without_rotation(self):
        self.iot.fail = 'AttachPolicy'
        with self.assertRaises(ClientError): self.apply()
        self.assertEqual((self.iot.creates, self.iot.status), (1, 'INACTIVE'))
        self.apply()
        self.assertEqual((self.iot.creates, self.iot.status), (1, 'ACTIVE'))
    def test_ambiguous_certificate_creation_keeps_pending_marker_and_never_retries(self):
        self.iot.fail_create = OSError('synthetic uncertain request')
        with self.assertRaises(OSError): self.apply()
        self.assertTrue((self.output / 'certificate-request.json').exists())
        count = len(self.iot.calls)
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual((len(self.iot.calls), self.iot.attempts), (count, 1))
    def test_definite_certificate_denial_allows_retry_after_permission_fix(self):
        self.iot.fail_create = error('CreateKeysAndCertificate')
        with self.assertRaises(ClientError): self.apply()
        self.assertFalse((self.output / 'certificate-request.json').exists())
        self.apply()
        self.assertEqual(self.iot.creates, 1)
    def test_wrong_account_stops_before_iot_operations(self):
        self.session.account = '999999999999'
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.calls, [])
    def test_foreign_policy_or_thing_fails_before_any_mutation(self):
        self.iot.policy = {'broad': True}
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
        self.iot.policy = None
        self.iot.attrs = {'farmId': 'OTHER'}
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_foreign_thing_principal_and_large_attachment_page_refused(self):
        self.iot.attrs = self.plan['thingAttributes']
        self.iot.principals = ['another-principal']
        with self.assertRaises(tool.Refusal): self.apply()
        self.iot.principals = []
        self.iot.extra_page = True
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_existing_thing_group_is_not_allowed_to_add_inherited_rights(self):
        self.iot.attrs = self.plan['thingAttributes']
        self.iot.groups = [{'groupName': 'ForeignGroup'}]
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_windows_acl_failure_blocks_before_sdk_or_private_file_creation(self):
        failure = subprocess.CalledProcessError(1, 'powershell.exe', stderr=b'SYNTHETIC PRIVATE ERROR')
        with patch.object(tool, 'prepare_private_directory', side_effect=failure), self.assertRaises(subprocess.CalledProcessError):
            tool.prepare_output(self.output)
        self.assertEqual(list(self.output.iterdir()), [])
    def test_foreign_certificate_policy_or_thing_refuses_resume(self):
        self.apply()
        self.iot.mutations.clear()
        self.iot.attached.append('ForeignPolicy')
        with self.assertRaises(tool.Refusal): self.apply()
        self.iot.attached = [self.plan['policyName']]
        self.iot.things.append('ForeignThing')
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_rejected_inactive_or_revoked_identity_does_not_rotate(self):
        self.apply()
        self.iot.status = 'REVOKED'
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.creates, 1)
    def test_endpoint_failure_happens_before_creating_resources(self):
        self.iot.endpoint = 'foreign.example.com'
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_denied_read_does_not_mean_resource_missing(self):
        self.iot.fail = 'GetPolicy'
        with self.assertRaises(ClientError): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_missing_or_modified_key_is_not_automatically_rotated(self):
        self.apply()
        self.iot.calls.clear()
        (self.output / 'private.pem.key').write_text('SYNTHETIC damaged key')
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.calls, [])
        (self.output / 'private.pem.key').unlink()
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.calls, [])
    def test_disk_failure_after_create_leaves_checkpoint_and_blocks_duplicate(self):
        original = tool.durable_write
        def fail(path, text):
            if path.name == 'private.pem.key': raise OSError('synthetic full disk')
            return original(path, text)
        with patch.object(tool, 'durable_write', side_effect=fail), self.assertRaises(OSError): self.apply()
        self.assertEqual((self.iot.creates, self.iot.status), (1, 'INACTIVE'))
        self.assertEqual(json.loads((self.output / 'provisioning.json').read_text())['certificateArn'], ARN)
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.creates, 1)
    def test_activation_timeout_can_read_back_and_resume_without_new_certificate(self):
        original = self.iot.update_certificate
        def timeout(**kw):
            original(**kw)
            raise OSError('synthetic timeout after activation')
        with patch.object(self.iot, 'update_certificate', side_effect=timeout), self.assertRaises(OSError): self.apply()
        self.apply()
        self.assertEqual((self.iot.creates, self.iot.status), (1, 'ACTIVE'))
    def test_unconfirmed_activation_is_not_reported_as_success(self):
        with patch.object(self.iot, 'update_certificate', return_value=None), self.assertRaises(tool.Refusal): self.apply()
        self.assertTrue((self.output / 'certificate-request.json').is_file())
        self.apply()
        self.assertEqual(self.iot.creates, 1)
    def test_remote_certificate_must_match_saved_local_certificate(self):
        self.apply()
        self.iot.cert = 'SYNTHETIC invalid remote PEM'
        self.iot.mutations.clear()
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.mutations, [])
    def test_attachment_eventual_consistency_never_activates_early(self):
        with patch.object(self.iot, 'attach_policy', return_value=None), self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.status, 'INACTIVE')
        self.apply()
        self.assertEqual(self.iot.status, 'ACTIVE')
    def test_exclusive_lock_prevents_parallel_aws_calls(self):
        tool.durable_write(self.output / '.provisioning.lock', 'synthetic active lock')
        with self.assertRaises(tool.Refusal): self.apply()
        self.assertEqual(self.iot.calls, [])
        self.assertTrue((self.output / '.provisioning.lock').exists())
    def test_mapping_change_does_not_overwrite_previous_plan_or_key(self):
        self.apply()
        scope = {**self.scope, 'revision': 2}
        _, documents = tool.plan_for(scope, self.expected)
        before = (self.output / 'private.pem.key').read_bytes()
        with self.assertRaises(tool.Refusal): tool.render(self.output, documents)
        self.assertEqual(before, (self.output / 'private.pem.key').read_bytes())
    def test_policy_scope_has_exact_names_and_no_data_plane_permissions(self):
        device = self.expected['devicePolicy']
        self.assertEqual([s['Action'] for s in device['Statement']], ['iot:Connect', 'iot:Publish'])
        self.assertNotIn('*', str(device))
        iam = self.documents['provisioner-iam-policy.json']
        self.assertNotIn('iot:Publish', str(iam))
        self.assertNotIn('iam:', str(iam))
        for s in iam['Statement']: self.assertEqual(s['Condition']['StringEquals']['aws:RequestedRegion'], tool.REGION)
    def test_package_hash_policy_macros_and_legacy_identity_are_checked(self):
        p = self.project / 'src/main.cpp'
        p.write_text('tampered')
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
        self.rehash()  # hashes alone do not permit broadening policy
        p = self.project / 'device-policy.json'
        p.write_text(tool.encode({'Statement': [{'Action': 'iot:*', 'Resource': '*'}]}))
        self.rehash()
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
        p.write_text(tool.encode(self.expected['devicePolicy']))
        p = self.project / 'config/config.example.h'
        p.write_text(p.read_text().replace('#define IRRIGATION_DEMO_ENABLED 0', '#define IRRIGATION_DEMO_ENABLED 1'))
        self.rehash()
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
        self.manifest['circuit']['controllerId'] = 'IRRIGATION01'
        self.rehash()
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
    def test_account_newline_unicode_and_manifest_boolean_versions_refused(self):
        for bad in [ACCOUNT + '\n', '１２３４５６７８９０１２', '123']:
            with self.assertRaises(tool.Refusal): tool.load_package(self.project, bad)
        self.manifest['packageVersion'] = True
        self.rehash()
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
    def test_duplicate_json_and_extra_manifest_path_refused(self):
        with self.assertRaises(tool.Refusal): tool.object_json('{"x":1,"x":2}')
        self.manifest['filesSha256']['../escape'] = '0' * 64
        (self.project / 'manifest.json').write_text(tool.encode(self.manifest))
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
    def test_both_aws_pagination_schemes_are_bounded(self):
        for marker in ('nextToken', 'nextMarker'):
            with self.assertRaises(tool.Refusal): tool.limited_list({marker: 'more', 'policies': []}, 'policies')
    def test_manifest_flags_must_be_boolean_and_not_numbers(self):
        for key in ('monitorOnly', 'outputEnabled', 'provisioned'):
            original = self.manifest[key]
            self.manifest[key] = int(original)
            self.rehash()
            with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
            self.manifest[key] = original
    def test_sdk_request_parameter_shapes_match_real_iot_model(self):
        from botocore.loaders import Loader
        from botocore.model import ServiceModel
        from botocore.validate import validate_parameters
        model = ServiceModel(Loader().load_service_model('iot', 'service-2'), service_name='iot')
        self.apply()
        self.apply()
        for operation, parameters in self.iot.calls:
            validate_parameters(parameters, model.operation_model(operation).input_shape)
    def test_links_hardlinks_and_parent_links_refused(self):
        p = self.project / 'src/main.cpp'
        link = self.base / 'linked-parent'
        link.symlink_to(self.project, target_is_directory=True)
        with self.assertRaises(tool.Refusal): tool.load_package(link, ACCOUNT)
        copy = self.base / 'public-copy'
        shutil.copyfile(p, copy)
        p.unlink()
        p.symlink_to(copy)
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
        p.unlink()
        os.link(copy, p)
        with self.assertRaises(tool.Refusal): tool.load_package(self.project, ACCOUNT)
    def test_private_permissions_and_unexpected_files_refused(self):
        p = self.output / 'private.pem.key'
        p.write_text('synthetic')
        p.chmod(0o644)
        with self.assertRaises(tool.Refusal): tool.prepare_output(self.output)
        p.unlink()
        (self.output / 'unrelated.txt').write_text('preserve')
        with self.assertRaises(tool.Refusal): tool.prepare_output(self.output)
    def test_cli_failure_does_not_expose_sdk_messages_or_traceback(self):
        with patch.object(tool, 'main', side_effect=error('AttachPolicy')), redirect_stderr(io.StringIO()) as out:
            self.assertEqual(tool.cli(), 1)
        self.assertIn('AttachPolicy', out.getvalue())
        self.assertNotIn('SYNTHETIC PRIVATE SDK MESSAGE', out.getvalue())
        self.assertNotIn('Traceback', out.getvalue())


if __name__ == '__main__': unittest.main()
