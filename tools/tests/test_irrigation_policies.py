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
if __name__=='__main__':unittest.main()
