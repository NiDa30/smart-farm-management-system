import copy
import json
from pathlib import Path
import unittest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT=Path(__file__).resolve().parents[2]/'contracts/iot/v2'
class WaterContractsTest(unittest.TestCase):
    def setUp(self):
        self.schema=Draft202012Validator(json.loads((ROOT/'water-telemetry.schema.json').read_text()),format_checker=FormatChecker())
        self.value=json.loads((ROOT/'examples/water-telemetry.json').read_text())
    def test_example_and_fault_null_and_false_zero(self):
        self.schema.validate(self.value)
        self.value['readings'][0].update(quality='SENSOR_FAULT',value=None)
        self.schema.validate(self.value)
    def test_no_type_coercion_metric_unit_or_fake_fault_value(self):
        for field,bad in [('value','false'),('value',0),('unit','L/min'),('quality','UNKNOWN'),('metric','SOIL_MOISTURE')]:
            v=copy.deepcopy(self.value);v['readings'][0][field]=bad
            with self.subTest(field=field,bad=bad),self.assertRaises(ValidationError):self.schema.validate(v)
        self.value['readings'][0]['quality']='SENSOR_FAULT'
        with self.assertRaises(ValidationError):self.schema.validate(self.value)
    def test_missing_fields_unsupported_version_or_negative_flow(self):
        for key in list(self.value):
            v=copy.deepcopy(self.value);del v[key]
            with self.subTest(key=key),self.assertRaises(ValidationError):self.schema.validate(v)
        for change in ('version','flow','readings','extra'):
            v=copy.deepcopy(self.value)
            if change=='version':v['schemaVersion']=1
            elif change=='flow':v['readings'][2]['value']=-1
            elif change=='readings':v['readings']=[]
            else:v['other']=1
            with self.subTest(change=change),self.assertRaises(ValidationError):self.schema.validate(v)
