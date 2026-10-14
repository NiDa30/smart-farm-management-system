"""Synthetic SDK/files only; no real AWS calls or user keys."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock,patch
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/aws'));sys.path.insert(0,str(ROOT/'tools/tests'))
import provision_water_node as provision
from test_water_provisioning import FakeIoT,Session
spec=importlib.util.spec_from_file_location('prepare_soil',ROOT/'tools/water/prepare_local_node.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
class SoilProvisionTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  self.output=self.root/'SOIL01';provision.prepare_private_directory(self.output);self.iot=FakeIoT();self.iot.fail_attach=False
  self.policy,_=provision.policies('ap-southeast-1','123456789012','SOIL01')
 def apply(self,kind='SOIL'):provision.provision(Session(self.iot),'ap-southeast-1','123456789012','SOIL01',self.output,self.policy,kind)
 def test_soil_type_checkpoint_resume_and_publish_scope(self):
  self.apply();self.apply();self.assertEqual(self.iot.creates,1)
  self.assertEqual(self.iot.attrs['nodeType'],'SOIL');self.assertEqual(json.loads((self.output/'provisioning.json').read_text())['nodeType'],'SOIL')
  self.assertEqual(self.policy['Statement'][1]['Resource'],'arn:aws:iot:ap-southeast-1:123456789012:topic/smartfarm/FARM001/SOIL01/telemetry')
  with self.assertRaises(ValueError):self.apply('WATER')
 def test_existing_water_thing_is_never_relabelled(self):
  self.iot.attrs={'farmId':'FARM001','nodeType':'WATER'}
  with self.assertRaises(ValueError):self.apply()
  self.assertEqual(self.iot.creates,0)
class SoilProjectTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  for name in prepare.SOIL_FILES:
   path=self.root/'firmware/soil-node'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text((ROOT/'firmware/soil-node'/name).read_text())
  self.origin=self.root/'.local/aws/SOIL01';self.origin.mkdir(parents=True)
  (self.origin/'provisioning.json').write_text(json.dumps({'thingName':'SOIL01','nodeType':'SOIL','region':'ap-southeast-1'}))
  for name in ('device.pem.crt','private.pem.key'):(self.origin/name).write_text('SYNTHETIC TEST ONLY')
  (self.origin/'endpoint.txt').write_text('example-ats.iot.ap-southeast-1.amazonaws.com');self.ca=self.root/'root.pem';self.ca.write_text('SYNTHETIC CA')
  self.registry={'nodeId':'SOIL01','nodeType':'SOIL','telemetryVersion':2,'channels':[{'channelId':f'SOIL{i}','metric':'SOIL_MOISTURE','unit':'%','calibrationVersion':'SIM_LINEAR_V1'}for i in range(1,4)]}
 def make(self):
  with patch.object(prepare.ssl,'SSLContext',return_value=MagicMock()):return prepare.prepare(self.root,'SOIL01',self.registry,self.ca,node_type='SOIL')
 def test_own_project_refresh_keeps_private_config_and_refuses_local_edits(self):
  project=self.make();self.assertEqual(project,self.root/'.local/soil-nodes/SOIL01');config=project/'config/config.local.h';before=config.read_bytes()
  self.assertIn('SOIL_NODE_ID "SOIL01"',config.read_text());prepare.refresh(self.root,'SOIL01','SOIL');self.assertEqual(config.read_bytes(),before)
  with self.assertRaises(ValueError):self.make()
  code=project/'include/SoilPacket.h';code.write_text(code.read_text()+'// local change\n')
  with self.assertRaises(ValueError):prepare.refresh(self.root,'SOIL01','SOIL')
 def test_wrong_type_calibration_and_channels_rejected_before_files(self):
  self.registry['channels'][0]['calibrationVersion']='PHYSICAL-V1'
  with self.assertRaises(ValueError):self.make()
  self.registry['channels'][0]['calibrationVersion']='SIM_LINEAR_V1';self.registry['channels'].pop()
  with self.assertRaises(ValueError):self.make()
  self.assertFalse((self.root/'.local/soil-nodes/SOIL01').exists())
 def test_real_ssl_check_rejects_synthetic_key_pair(self):
  with self.assertRaises(prepare.ssl.SSLError):prepare.prepare(self.root,'SOIL01',self.registry,self.ca,node_type='SOIL')
  self.assertFalse((self.root/'.local/soil-nodes/SOIL01').exists())
class SoilDiagramTest(unittest.TestCase):
 def test_three_adc1_points_and_fault_inputs_have_independent_wiring(self):
  diagram=json.loads((ROOT/'firmware/soil-node/diagram.json').read_text());edges={frozenset(c[:2]) for c in diagram['connections']}
  for i,pin,fault in [(1,34,27),(2,35,14),(3,32,25)]:
   for a,b in [(f'soil{i}:SIG',f'esp:{pin}'),(f'soil{i}:VCC','esp:3V3'),(f'soil{i}:GND','esp:GND.2'),(f'fault{i}:2',f'esp:{fault}'),(f'fault{i}:1','esp:GND.2')]:self.assertIn(frozenset((a,b)),edges)
class SoilContractsTest(unittest.TestCase):
 def test_schema_accepts_actual_native_encoder_and_rejects_fault_zero_and_water_metric(self):
  import copy
  from jsonschema import Draft202012Validator,FormatChecker,ValidationError
  schema=Draft202012Validator(json.loads((ROOT/'contracts/iot/v2/soil-telemetry.schema.json').read_text()),format_checker=FormatChecker())
  value=json.loads((ROOT/'backend/src/test/resources/soil-firmware-packet.json').read_text());schema.validate(value)
  self.assertEqual(value,json.loads((ROOT/'contracts/iot/v2/examples/soil-telemetry.json').read_text()))
  for field,bad in [('value',101),('value',-1),('value',False),('value','0'),('metric','FLOW_RATE'),('unit','L/min')]:
   v=copy.deepcopy(value);v['readings'][0][field]=bad
   with self.subTest(field=field,bad=bad),self.assertRaises(ValidationError):schema.validate(v)
  value['readings'][2]['value']=0
  with self.assertRaises(ValidationError):schema.validate(value)
