import copy,json,unittest
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker,ValidationError
ROOT=Path(__file__).resolve().parents[2]/'contracts/iot/v1'
ROUTE=dict(circuitId='CIRCUIT08',circuitRevision=1,zoneId='ZONE08',zoneRevision=1,controllerId='IRRIGATION08',valveId='VALVE08')
class PumpCircuitContractTest(unittest.TestCase):
 def validate(self,name,value):Draft202012Validator(json.loads((ROOT/f'{name}.schema.json').read_text()),format_checker=FormatChecker()).validate(value)
 def command(self):
  v=json.loads((ROOT/'examples/command.json').read_text());v.update(deviceId='PUMP01',durationSeconds=5,commandFence=dict(version=1,ordinal=1,targetBootId='89000000-0000-4000-8000-000000000002',route=copy.deepcopy(ROUTE)));return v
 def test_bound_command_and_reset(self):
  v=self.command();self.validate('command',v);v['action']='RESET_LOCKOUT';del v['durationSeconds'];self.validate('command',v)
 def test_off_cannot_carry_route_or_long_on(self):
  v=self.command();v['durationSeconds']=31
  with self.assertRaises(ValidationError):self.validate('command',v)
  v['action']='OFF';del v['durationSeconds']
  with self.assertRaises(ValidationError):self.validate('command',v)
 def test_route_exact_identity_and_revision(self):
  for k,x in [('circuitRevision',True),('zoneRevision',0),('valveId','VALVE01'),('controllerId','IRRIGATION01'),('zoneId','lower'),('extra',1)]:
   v=self.command();v['commandFence']['route'][k]=x
   with self.subTest(k=k),self.assertRaises(ValidationError):self.validate('command',v)
 def test_route_status_requires_fencing_and_local_proof(self):
  v=json.loads((ROOT/'examples/status.json').read_text());v.update(deviceId='PUMP01',reportedState='OFF',safetyLockout=False,activeCommandId=None,commandFence=dict(version=1,lastOrdinal=0,restartRequired=False),valveInterlock=dict(version=1,enabled=True,dataSource='SIMULATOR',state='OPEN',fault=None,route=ROUTE));self.validate('status',v);del v['commandFence']
  with self.assertRaises(ValidationError):self.validate('status',v)
if __name__=='__main__':unittest.main()
