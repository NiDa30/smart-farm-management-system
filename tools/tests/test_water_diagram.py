"""Static pin guards, not execution of the Wokwi simulator."""
import json
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[2]
class WaterDiagramTest(unittest.TestCase):
    def setUp(self):
        self.diagram=json.loads((ROOT/'firmware/water-node/diagram.json').read_text())
        self.edges={frozenset(c[:2]) for c in self.diagram['connections']}
    def edge(self,a,b):self.assertIn(frozenset((a,b)),self.edges)
    def test_float_wiring_is_closed_wet_open_dry_and_no_pump_output(self):
        self.edge('float_low:2','esp:27');self.edge('float_high:2','esp:14')
        for sensor in ('float_low','float_high'):
            self.edge(sensor+':1','esp:GND.2')
            self.assertFalse(any(sensor+':3' in edge for edge in self.edges))
        self.assertFalse(any('esp:26' in edge for edge in self.edges))
        self.assertFalse(any(p['type']=='wokwi-relay-module' for p in self.diagram['parts']))
    def test_flow_uses_real_gpio_edges_with_explicit_zero_gate(self):
        self.edge('flow_clock:CLK','flow_gate:1');self.edge('flow_gate:2','esp:25');self.edge('flow_gate:3','esp:GND.2')
        clock=next(p for p in self.diagram['parts'] if p['id']=='flow_clock')
        self.assertEqual(clock['attrs']['frequency'],'45')
        pins=re.findall(r'^#define WATER_(?:LOW|HIGH|FLOW|FAULT_LED)_PIN (\d+)$',(ROOT/'firmware/water-node/config/config.example.h').read_text(),re.M)
        self.assertEqual(len(set(pins)),4)
        ids={p['id'] for p in self.diagram['parts']}
        for c in self.diagram['connections']:
            for endpoint in c[:2]:self.assertIn(endpoint.split(':')[0],ids|{'$serialMonitor'})
