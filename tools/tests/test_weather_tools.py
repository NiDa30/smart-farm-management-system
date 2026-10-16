"""Synthetic files/SDK only: weather contract, wiring, isolation and private project helpers."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from jsonschema import Draft202012Validator, FormatChecker, ValidationError
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/aws'));sys.path.insert(0,str(ROOT/'tools/tests'))
import provision_water_node as provision
from test_water_provisioning import FakeIoT, Session
spec=importlib.util.spec_from_file_location('prepare_weather',ROOT/'tools/water/prepare_local_node.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)

class WeatherContractTest(unittest.TestCase):
 def setUp(self):
  self.schema=Draft202012Validator(json.loads((ROOT/'contracts/iot/v2/weather-telemetry.schema.json').read_text()),format_checker=FormatChecker())
  self.packet=json.loads((ROOT/'backend/src/test/resources/weather-firmware-packet.json').read_text())
 def test_native_fixture_matches_public_example_and_contract(self):
  self.schema.validate(self.packet)
  self.assertEqual(self.packet,json.loads((ROOT/'contracts/iot/v2/examples/weather-telemetry.json').read_text()))
 def test_rain_is_boolean_not_mm_numeric_or_coerced_text(self):
  for field,value in [('value',0),('value','false'),('unit','mm'),('metric','WATER_PRESENT')]:
   p=copy.deepcopy(self.packet);p['readings'][0][field]=value
   with self.subTest(field=field,value=value),self.assertRaises(ValidationError):self.schema.validate(p)
 def test_lux_zero_valid_fault_null_and_bounded_values(self):
  for value in [0,200000]:
   p=copy.deepcopy(self.packet);p['readings'][1]['value']=value;self.schema.validate(p)
  for value in [-1,200001,True,'1']:
   p=copy.deepcopy(self.packet);p['readings'][1]['value']=value
   with self.assertRaises(ValidationError):self.schema.validate(p)
  p=copy.deepcopy(self.packet);p['readings'][0].update(quality='SENSOR_FAULT',value=None);self.schema.validate(p)
  p['readings'][0]['value']=False
  with self.assertRaises(ValidationError):self.schema.validate(p)
 def test_independent_adc1_rain_and_fault_inputs_no_actuator(self):
  diagram=json.loads((ROOT/'firmware/weather-node/diagram.json').read_text());edges={frozenset(c[:2]) for c in diagram['connections']}
  for a,b in [('light:SIG','esp:34'),('light:VCC','esp:3V3'),('light:GND','esp:GND.2'),('rain:2','esp:27'),('rainFault:2','esp:14'),('lightFault:2','esp:25')]:self.assertIn(frozenset((a,b)),edges)
  for name in ['rain','rainFault','lightFault']:self.assertIn(frozenset((name+':1','esp:GND.2')),edges)
  self.assertFalse(any('relay' in p['type'] for p in diagram['parts']))

class WeatherProvisionTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  self.output=self.root/'WEATHER01';provision.prepare_private_directory(self.output);self.iot=FakeIoT();self.iot.fail_attach=False
  self.policy,_=provision.policies('ap-southeast-1','123456789012','WEATHER01')
 def apply(self):provision.provision(Session(self.iot),'ap-southeast-1','123456789012','WEATHER01',self.output,self.policy,'WEATHER')
 def test_weather_type_and_own_publish_only_identity_reused_on_retry(self):
  self.apply();self.apply();self.assertEqual(self.iot.creates,1);self.assertEqual(self.iot.attrs['nodeType'],'WEATHER')
  self.assertEqual(self.policy['Statement'][1]['Resource'],'arn:aws:iot:ap-southeast-1:123456789012:topic/smartfarm/FARM001/WEATHER01/telemetry')
  self.assertEqual([x['Action'] for x in self.policy['Statement']],['iot:Connect','iot:Publish'])
 def test_another_node_type_is_not_relabelled(self):
  self.iot.attrs={'farmId':'FARM001','nodeType':'SOIL'}
  with self.assertRaises(ValueError):self.apply()
  self.assertEqual(self.iot.creates,0)

class WeatherProjectTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  for name in prepare.WEATHER_FILES:
   path=self.root/'firmware/weather-node'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text((ROOT/'firmware/weather-node'/name).read_text())
  origin=self.root/'.local/aws/WEATHER01';origin.mkdir(parents=True)
  (origin/'provisioning.json').write_text(json.dumps({'thingName':'WEATHER01','nodeType':'WEATHER','region':'ap-southeast-1'}))
  (origin/'endpoint.txt').write_text('example-ats.iot.ap-southeast-1.amazonaws.com')
  for name in ['device.pem.crt','private.pem.key']:(origin/name).write_text('SYNTHETIC TEST ONLY')
  self.ca=self.root/'root.pem';self.ca.write_text('SYNTHETIC CA')
  self.registry={'nodeId':'WEATHER01','nodeType':'WEATHER','telemetryVersion':2,'channels':[
   {'channelId':'RAIN','metric':'RAIN_DETECTED','unit':'boolean','calibrationVersion':None},
   {'channelId':'LIGHT','metric':'LIGHT_ILLUMINANCE','unit':'lux','calibrationVersion':'SIM_LUX_V1'}]}
 def make(self):
  with patch.object(prepare.ssl,'SSLContext',return_value=MagicMock()):return prepare.prepare(self.root,'WEATHER01',self.registry,self.ca,node_type='WEATHER')
 def test_weather_project_refresh_preserves_config_and_refuses_source_overwrite(self):
  project=self.make();self.assertEqual(project,self.root/'.local/weather-nodes/WEATHER01');config=project/'config/config.local.h';before=config.read_bytes();self.assertIn('WEATHER_NODE_ID "WEATHER01"',config.read_text())
  prepare.refresh(self.root,'WEATHER01','WEATHER');self.assertEqual(before,config.read_bytes())
  with self.assertRaises(ValueError):self.make()
  (project/'include/WeatherPacket.h').write_text('local edits')
  with self.assertRaises(ValueError):prepare.refresh(self.root,'WEATHER01','WEATHER')
 def test_wrong_unit_calibration_or_missing_channel_rejected_before_private_files(self):
  for field,value in [('unit','mm'),('calibrationVersion','PHYSICAL_V1')]:
   r=copy.deepcopy(self.registry);r['channels'][1][field]=value
   with patch.object(prepare.ssl,'SSLContext',return_value=MagicMock()),self.assertRaises(ValueError):prepare.prepare(self.root,'WEATHER01',r,self.ca,node_type='WEATHER')
  self.registry['channels'].pop()
  with self.assertRaises(ValueError):self.make()
  self.assertFalse((self.root/'.local/weather-nodes/WEATHER01').exists())
 def test_real_tls_key_pair_check_rejects_synthetic_material(self):
  with self.assertRaises(prepare.ssl.SSLError):prepare.prepare(self.root,'WEATHER01',self.registry,self.ca,node_type='WEATHER')
  self.assertFalse((self.root/'.local/weather-nodes/WEATHER01').exists())

if __name__=='__main__':unittest.main()
