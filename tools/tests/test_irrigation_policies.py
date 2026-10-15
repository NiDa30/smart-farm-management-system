import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'aws'))
from render_irrigation_policies import policies
from provision_water_node import node_id
class PoliciesTest(unittest.TestCase):
 def test_narrow_device_and_backend(self):
  p=policies('ap-southeast-1','123456789012');s=str(p)
  self.assertNotIn('PUMP01',s);self.assertNotIn('RetainPublish',s);self.assertNotIn('*',s)
  self.assertIn('client/IRRIGATION01',s);self.assertIn('topic/smartfarm/FARM001/VALVE01/command',s)
  device=p['devicePolicy']['Statement'];self.assertEqual(['iot:Connect','iot:Subscribe','iot:Receive','iot:Publish'],[x['Action'] for x in device])
 def test_reserved_monitor_ids(self):
  for v in ['IRRIGATION01','VALVE01','ENV01','PUMP01']:
   with self.assertRaises(ValueError):node_id(v)
 def test_invalid_account_rejected(self):
  with self.assertRaises(ValueError):policies('ap-southeast-1','bad')
 def test_monitor_can_only_publish_own_status(self):
  p=policies('ap-southeast-1','123456789012','IRRIGATION02','VALVE03',True);s=str(p)
  self.assertNotIn('*',s);self.assertNotIn('RetainPublish',s);self.assertNotIn('/command',s);self.assertNotIn('/ack',s);self.assertNotIn('PUMP01',s)
  self.assertEqual(['iot:Connect','iot:Publish'],[x['Action'] for x in p['devicePolicy']['Statement']]);self.assertEqual(['iot:Subscribe','iot:Receive'],[x['Action'] for x in p['backendAdditionalIdentityPolicy']['Statement']])
  self.assertIn('client/IRRIGATION02',s);self.assertIn('topic/smartfarm/FARM001/VALVE03/status',s)
 def test_monitor_ids_do_not_expand_legacy_command_rights(self):
  for controller,valve in [('IRRIGATION01','VALVE02'),('IRRIGATION02','VALVE01'),('IRRIGATION00','VALVE02'),('IRRIGATION02','VALVE100'),('IRRIGATION02','VALVE*')]:
   with self.assertRaises(ValueError):policies('ap-southeast-1','123456789012',controller,valve,True)
  with self.assertRaises(ValueError):policies('ap-southeast-1','123456789012','IRRIGATION02','VALVE02')
 def test_circuit_demo_uses_separate_exact_topics(self):
  p=policies('ap-southeast-1','123456789012','IRRIGATION08','VALVE08',circuit_demo=True);s=str(p)
  self.assertNotIn('*',s);self.assertNotIn('PUMP01',s);self.assertNotIn('RetainPublish',s)
  self.assertIn('VALVE08/demo/command',s);self.assertIn('VALVE08/demo/status',s);self.assertIn('VALVE08/demo/ack',s)
  self.assertNotIn('VALVE08/status',s);self.assertEqual(4,len(p['devicePolicy']['Statement']))
 def test_circuit_demo_cannot_be_combined_with_monitor_or_legacy_ids(self):
  with self.assertRaises(ValueError):policies('ap-southeast-1','123456789012','IRRIGATION08','VALVE08',True,True)
  with self.assertRaises(ValueError):policies('ap-southeast-1','123456789012',circuit_demo=True)
if __name__=='__main__':unittest.main()
