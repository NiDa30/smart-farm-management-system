import json,unittest
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker,ValidationError
ROOT=Path(__file__).resolve().parents[2]/'contracts/iot/v1'
class PumpFenceContractTest(unittest.TestCase):
 def validate(self,name,v):Draft202012Validator(json.loads((ROOT/f'{name}.schema.json').read_text()),format_checker=FormatChecker()).validate(v)
 def example(self,name):return json.loads((ROOT/'examples'/f'{name}.json').read_text())
 def test_legacy_examples_still_validate(self):
  for name in ['command','status','ack']:self.validate(name,self.example(name))
 def test_fenced_command_bounds_and_target_boot(self):
  c=self.example('command');c['commandFence']={'version':1,'ordinal':1,'targetBootId':'71000000-0000-4000-8000-000000000001'};self.validate('command',c)
  for key,value in [('ordinal',0),('ordinal',9007199254740992),('ordinal',True),('version',2),('targetBootId','bad')]:
   v=json.loads(json.dumps(c));v['commandFence'][key]=value
   with self.subTest(key=key,value=value),self.assertRaises(ValidationError):self.validate('command',v)
 def test_fenced_ack_has_exact_metadata(self):
  a=self.example('ack');a['commandFence']={'version':1,'ordinal':5};self.validate('ack',a)
  for f in [{'version':1},{'version':1,'ordinal':0},{'version':1,'ordinal':2,'extra':0}]:
   a['commandFence']=f
   with self.assertRaises(ValidationError):self.validate('ack',a)
 def test_native_status_encoder_matches_contract(self):
  p=Path(__file__).resolve().parents[2]/'backend/src/test/resources/pump-fence-status.json';self.validate('status',json.loads(p.read_text()))
 def test_halted_status_requires_locked_off_and_not_env(self):
  s=self.example('status');s.update(deviceId='PUMP01',reportedState='OFF',safetyLockout=True,activeCommandId=None,commandFence={'version':1,'lastOrdinal':0,'restartRequired':True});self.validate('status',s)
  for key,value in [('reportedState','ON'),('safetyLockout',False),('deviceId','ENV01')]:
   v=json.loads(json.dumps(s));v[key]=value
   with self.subTest(key=key),self.assertRaises(ValidationError):self.validate('status',v)
 def test_zero_ordinal_cannot_report_on(self):
  s=self.example('status');s.update(deviceId='PUMP01',reportedState='ON',safetyLockout=False,activeCommandId=None,commandFence={'version':1,'lastOrdinal':0,'restartRequired':False})
  with self.assertRaises(ValidationError):self.validate('status',s)
if __name__=='__main__':unittest.main()
