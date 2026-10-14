"""Static wiring guards only: not a Wokwi electrical/polarity simulation."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class AgricultureWiringTest(unittest.TestCase):
    def setUp(self):
        self.diagram = json.loads((ROOT / 'firmware/esp32/diagram.json').read_text())
        self.parts = {part['id']: part for part in self.diagram['parts']}
        self.edges = {frozenset(connection[:2]) for connection in self.diagram['connections']}

    def edge(self, a, b):
        self.assertIn(frozenset((a, b)), self.edges)

    def test_all_wires_reference_existing_unique_parts(self):
        self.assertEqual(len(self.parts), len(self.diagram['parts']))
        for connection in self.diagram['connections']:
            for endpoint in connection[:2]:
                self.assertIn(endpoint.split(':')[0], set(self.parts) | {'$serialMonitor'})

    def test_open_float_circuit_cannot_be_mistaken_for_water_present(self):
        self.assertEqual(self.parts['water_float']['type'], 'wokwi-slide-switch')
        self.assertEqual(self.parts['water_float']['attrs']['value'], '')
        self.edge('water_float:2', 'esp:27')
        self.edge('water_float:1', 'esp:GND.2')
        self.assertFalse(any('water_float:3' in edge for edge in self.edges))
        self.assertEqual(sum('water_float:2' in edge for edge in self.edges), 1)

    def test_led_load_uses_normally_open_contact_instead_of_bypassing_relay(self):
        self.assertEqual(self.parts['pump_relay']['attrs']['transistor'], 'pnp')
        self.edge('esp:26', 'pump_relay:IN')
        self.edge('pump_relay:VCC', 'esp:5V')
        self.edge('pump_relay:GND', 'esp:GND.2')
        self.edge('pump_relay:COM', 'esp:3V3')
        self.edge('pump_relay:NO', 'relay_r:1')
        self.edge('relay_r:2', 'relay_led:A')
        self.edge('relay_led:C', 'esp:GND.1')
        self.assertFalse(any('pump_relay:NC' in edge for edge in self.edges))
        self.assertEqual(sum('relay_r:1' in edge for edge in self.edges), 1)


    def test_flow_gate_uses_separate_gpio_and_simulated_clock(self):
        self.assertEqual(self.parts['pump_flow_clock']['type'], 'wokwi-clock-generator')
        self.assertEqual(self.parts['pump_flow_clock']['attrs']['frequency'], '45')
        self.edge('pump_flow_clock:CLK', 'pump_flow_gate:1')
        self.edge('pump_flow_gate:2', 'esp:25')
        self.edge('pump_flow_gate:3', 'esp:GND.2')
        self.assertEqual(sum('esp:25' in edge for edge in self.edges), 1)
