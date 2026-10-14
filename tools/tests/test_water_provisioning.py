"""Synthetic SDK mocks only; these tests never contact AWS."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from botocore.exceptions import ClientError

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/aws'))
import provision_water_node as water


def missing(operation):return ClientError({'Error':{'Code':'ResourceNotFoundException'}},operation)
class FakeIoT:
    def __init__(self):self.policy=None;self.attrs=None;self.creates=0;self.fail_attach=True;self.active=True;self.fail_create=None;self.attempts=0
    def get_policy(self,**kw):
        if self.policy is None:raise missing('GetPolicy')
        return {'policyDocument':json.dumps(self.policy)}
    def create_policy(self,**kw):self.policy=json.loads(kw['policyDocument'])
    def describe_thing(self,**kw):
        if self.attrs is None:raise missing('DescribeThing')
        return {'attributes':self.attrs}
    def create_thing(self,**kw):self.attrs=kw['attributePayload']['attributes']
    def create_keys_and_certificate(self,**kw):
        self.attempts+=1
        if self.fail_create:
            error=self.fail_create;self.fail_create=None;raise error
        self.creates+=1
        return {'certificateId':'a'*64,'certificateArn':'arn:aws:iot:ap-southeast-1:123456789012:cert/'+'a'*64,
                'certificatePem':'SYNTHETIC CERTIFICATE','keyPair':{'PrivateKey':'SYNTHETIC TEST KEY'}}
    def describe_certificate(self,**kw):return {'certificateDescription':{'status':'ACTIVE' if self.active else 'INACTIVE'}}
    def attach_thing_principal(self,**kw):pass
    def attach_policy(self,**kw):
        if self.fail_attach:self.fail_attach=False;raise ClientError({'Error':{'Code':'AccessDeniedException'}},'AttachPolicy')
    def describe_endpoint(self,**kw):return {'endpointAddress':'example-ats.iot.ap-southeast-1.amazonaws.com'}
class Session:
    def __init__(self,iot,account='123456789012'):self.iot=iot;self.account=account
    def create_client(self,name,**kw):return self if name=='sts' else self.iot
    def get_caller_identity(self):return {'Account':self.account}
class ProvisionTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.output=Path(self.tmp.name)/'WATER01';water.prepare_private_directory(self.output)
        self.policy,_=water.policies('ap-southeast-1','123456789012','WATER01')
        self.iot=FakeIoT()
    def apply(self,account='123456789012'):
        water.provision(Session(self.iot,account),'ap-southeast-1','123456789012','WATER01',self.output,self.policy)
    def test_monitor_policy_has_no_command_retain_cross_node_or_wildcard_publish(self):
        self.assertEqual(len(self.policy['Statement']),2)
        publish=self.policy['Statement'][1]
        self.assertEqual(publish['Action'],'iot:Publish')
        self.assertEqual(publish['Resource'],'arn:aws:iot:ap-southeast-1:123456789012:topic/smartfarm/FARM001/WATER01/telemetry')
        _,iam=water.policies('ap-southeast-1','123456789012','WATER01')
        attach=next(s for s in iam['Statement'] if s['Action']=='iot:AttachThingPrincipal')
        self.assertEqual(len(attach['Resource']),2)
        for bad in ('ENV01','PUMP01','WATER/01','a'):
            with self.assertRaises(ValueError):water.policies('ap-southeast-1','123456789012',bad)
    def test_partial_attachment_retry_keeps_original_certificate(self):
        with self.assertRaises(ClientError):self.apply()
        before=(self.output/'private.pem.key').read_bytes()
        self.apply();self.assertEqual(self.iot.creates,1)
        self.assertEqual(before,(self.output/'private.pem.key').read_bytes())
        self.assertTrue((self.output/'endpoint.txt').is_file())
    def test_account_mismatch_does_not_create_resources(self):
        with self.assertRaises(ValueError):self.apply('999999999999')
        self.assertIsNone(self.iot.policy);self.assertIsNone(self.iot.attrs);self.assertEqual(self.iot.creates,0)
    def test_refuses_policy_ownership_or_orphan_files(self):
        self.iot.policy={'Version':'DIFFERENT'}
        with self.assertRaises(ValueError):self.apply()
        self.iot.policy=self.policy;self.iot.attrs={'farmId':'FARM999','nodeType':'WATER'}
        with self.assertRaises(ValueError):self.apply()
        self.iot.attrs={'farmId':'FARM001','nodeType':'WATER'}
        (self.output/'private.pem.key').write_text('SYNTHETIC ORPHAN')
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(self.iot.creates,0)
    def test_manifest_wrong_node_missing_files_or_inactive_cert_never_rotates(self):
        with self.assertRaises(ClientError):self.apply()
        self.iot.active=False
        with self.assertRaises(ValueError):self.apply()
        self.iot.active=True
        manifest=self.output/'provisioning.json';state=json.loads(manifest.read_text());state['thingName']='WATER02';manifest.write_text(json.dumps(state))
        with self.assertRaises(ValueError):self.apply()
        state['thingName']='WATER01';manifest.write_text(json.dumps(state));(self.output/'private.pem.key').unlink()
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(self.iot.creates,1)

    def test_uncertain_create_request_never_automatically_creates_a_second_certificate(self):
        self.iot.fail_create=OSError('synthetic transport interruption')
        with self.assertRaises(OSError):self.apply()
        self.assertTrue((self.output/'certificate-request.json').exists())
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(self.iot.attempts,1)
    def test_definite_authorization_failure_can_be_retried_after_permissions_fixed(self):
        self.iot.fail_create=ClientError({'Error':{'Code':'AccessDeniedException'}},'CreateKeysAndCertificate')
        with self.assertRaises(ClientError):self.apply()
        self.assertFalse((self.output/'certificate-request.json').exists())
        self.iot.fail_attach=False;self.apply();self.assertEqual(self.iot.creates,1)

    def test_exclusive_node_lock_blocks_parallel_provisioning_before_any_aws_call(self):
        marker=self.output/'.provisioning.lock';marker.write_text('SYNTHETIC active lock')
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(self.iot.attempts,0);self.assertIsNone(self.iot.policy)
        self.assertTrue(marker.exists())
