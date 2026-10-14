import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch,MagicMock

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('prepare_water',ROOT/'tools/water/prepare_local_node.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ProjectTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
        for name in module.FILES:
            p=self.root/'firmware/water-node'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text((ROOT/'firmware/water-node'/name).read_text())
        origin=self.root/'.local/aws/WATER01';origin.mkdir(parents=True)
        (origin/'provisioning.json').write_text(json.dumps({'thingName':'WATER01','nodeType':'WATER','region':'ap-southeast-1'}))
        for name in ('device.pem.crt','private.pem.key'):(origin/name).write_text('SYNTHETIC TEST ONLY')
        (origin/'endpoint.txt').write_text('example-ats.iot.ap-southeast-1.amazonaws.com')
        self.ca=self.root/'root.pem';self.ca.write_text('SYNTHETIC CA')
        self.registry={'nodeId':'WATER01','nodeType':'WATER','telemetryVersion':2,'channels':[
            {'channelId':i,'metric':m,'unit':u,'calibrationVersion':None} for i,m,u in [('LOW','WATER_PRESENT','boolean'),('HIGH','WATER_PRESENT','boolean'),('FLOW','FLOW_RATE','L/min')]]}
    def prepare(self):
        with patch.object(module.ssl,'SSLContext',return_value=MagicMock()):return module.prepare(self.root,'WATER01',self.registry,self.ca,450)
    def test_isolated_project_matches_registry_and_escapes_c_string(self):
        version='FLOW\\path"一';self.registry['channels'][2]['calibrationVersion']=version
        project=self.prepare();config=(project/'config/config.local.h').read_text()
        line=re.search(r'^#define WATER_FLOW_CALIBRATION_VERSION (.*)$',config,re.M).group(1)
        self.assertEqual(json.loads(line),version)
        self.assertTrue((project/'data/private.pem.key').is_file())
        self.assertEqual(json.loads((project/'project.json').read_text())['nodeId'],'WATER01')
        self.assertFalse((self.root/'firmware/water-node/config/config.local.h').exists())
        with self.assertRaises(ValueError):self.prepare()
    def test_refresh_preserves_private_files_and_refuses_edited_generated_source(self):
        project=self.prepare();config=project/'config/config.local.h';before=config.read_bytes()
        template=self.root/'firmware/water-node/src/main.cpp';template.write_text(template.read_text()+'\n// upgraded source\n')
        module.refresh(self.root,'WATER01');self.assertEqual(config.read_bytes(),before)
        code=project/'src/main.cpp';code.write_text(code.read_text()+'\n// user edits\n')
        with self.assertRaises(ValueError):module.refresh(self.root,'WATER01')
        self.assertIn('// user edits',code.read_text())
    def test_wrong_identity_registry_or_manifest_is_rejected_before_project(self):
        for device in ('ENV01','PUMP01'):
            with self.assertRaises(ValueError):module.prepare(self.root,device,self.registry,self.ca,450)
        self.registry['channels'][0]['unit']='L/min'
        with self.assertRaises(ValueError):self.prepare()
        self.registry['channels'][0]['unit']='boolean'
        p=self.root/'.local/aws/WATER01/provisioning.json';p.write_text(json.dumps({'thingName':'ENV01','nodeType':'ENVIRONMENT'}))
        with self.assertRaises(ValueError):self.prepare()
        self.assertFalse((self.root/'.local/water-nodes/WATER01').exists())
    def test_invalid_certificate_ca_prevents_writing_project(self):
        with self.assertRaises(module.ssl.SSLError):module.prepare(self.root,'WATER01',self.registry,self.ca,450)
        self.assertFalse((self.root/'.local/water-nodes/WATER01').exists())
