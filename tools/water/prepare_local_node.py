#!/usr/bin/env python3
"""Prepare a private per-node Wokwi project. Local API only; no AWS operations."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import runpy
import ssl
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
FILES = ('platformio.ini', 'diagram.json', 'wokwi.toml', 'src/main.cpp',
         'include/WaterMeasurements.h', 'include/WaterPacket.h', 'config/config.example.h')
SOIL_FILES = ('platformio.ini', 'diagram.json', 'wokwi.toml', 'src/main.cpp',
              'include/SoilMeasurements.h', 'include/SoilPacket.h', 'config/config.example.h')

def kind(node_type):
    if node_type not in ('WATER', 'SOIL'): raise ValueError('Unsupported monitor type')
    return node_type

def source_files(node_type): return SOIL_FILES if kind(node_type) == 'SOIL' else FILES

PRIVATE = runpy.run_path(str(ROOT / 'tools/aws/provision_day1.py'))


def identity(value):
    if not re.fullmatch('[A-Z][A-Z0-9_-]{1,31}', value or '') or value in ('ENV01', 'PUMP01'):
        raise ValueError('Use a separate monitor-node ID')
    return value


def public_sources(root, device, node_type="WATER"):
    result = {}
    for name in source_files(node_type):
        text = (root / ('firmware/soil-node' if node_type == 'SOIL' else 'firmware/water-node') / name).read_text()
        if name == 'diagram.json': text = text.replace('SOIL01' if node_type == 'SOIL' else 'WATER01', device)
        result[name] = text
    return result


def refresh(root, device, node_type="WATER"):
    device = identity(device)
    project = root / ('.local/soil-nodes' if kind(node_type) == 'SOIL' else '.local/water-nodes') / device
    marker = project / 'project.json'
    if not marker.is_file() or marker.is_symlink(): raise ValueError('Missing generated project marker')
    state = json.loads(marker.read_text())
    if state.get('nodeId') != device: raise ValueError('Project marker belongs to another node')
    sources = public_sources(root, device, node_type)
    for name in source_files(node_type):
        path = project / name
        if path.is_symlink() or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != state['sourceHashes'].get(name):
            raise ValueError('Generated source was edited; preserve local edits before refreshing')
    for name, text in sources.items(): (project / name).write_text(text)
    state['sourceHashes'] = {name: hashlib.sha256((project / name).read_bytes()).hexdigest() for name in source_files(node_type)}
    marker.write_text(json.dumps(state, indent=2) + '\n')
    print('Public sources refreshed; private config and certificates retained:', project)


def prepare(root, device, registry, ca_file, pulses_per_litre=450.0, node_type="WATER"):
    device = identity(device)
    if registry.get('nodeId') != device or registry.get('nodeType') != kind(node_type) or registry.get('telemetryVersion') != 2:
        raise ValueError('Register this monitor/v2 node in the local API first')
    channels = {c['channelId']: c for c in registry.get('channels', [])}
    if node_type == 'SOIL':
        if len(registry.get('channels', [])) != 3 or set(channels) != {'SOIL1','SOIL2','SOIL3'}:
            raise ValueError('SOIL simulator needs exactly SOIL1/SOIL2/SOIL3')
        for channel in channels.values():
            if channel.get('metric') != 'SOIL_MOISTURE' or channel.get('unit') != '%' or channel.get('calibrationVersion') != 'SIM_LINEAR_V1':
                raise ValueError('SOIL simulator needs SOIL_MOISTURE/% and SIM_LINEAR_V1 per point')
    else:
        for channel, metric, unit in [('LOW', 'WATER_PRESENT', 'boolean'), ('HIGH', 'WATER_PRESENT', 'boolean'), ('FLOW', 'FLOW_RATE', 'L/min')]:
            c = channels.get(channel, {})
            if c.get('metric') != metric or c.get('unit') != unit:
                raise ValueError('Registry needs LOW/HIGH/FLOW with matching metric/unit')
            if channel != 'FLOW' and c.get('calibrationVersion') is not None:
                raise ValueError('Float calibration must be null for this firmware')
        calibration = channels['FLOW'].get('calibrationVersion')
        if calibration is not None and (not isinstance(calibration, str) or not calibration.strip() or len(calibration) > 40):
            raise ValueError('Invalid registry flow calibration version')
        if not math.isfinite(pulses_per_litre) or pulses_per_litre <= 0: raise ValueError('Positive finite simulator factor required')
    origin = root / '.local/aws' / device
    state = json.loads((origin / 'provisioning.json').read_text())
    if state.get('thingName') != device or state.get('nodeType') != node_type:
        raise ValueError('Provision a separate matching monitor certificate; do not reuse ENV01 files')
    region = state.get('region', '')
    if not re.fullmatch('[a-z]{2}(?:-[a-z]+)+-[0-9]', region): raise ValueError('Invalid manifest region')
    endpoint = (origin / 'endpoint.txt').read_text().strip()
    if not re.fullmatch(r'[a-z0-9-]+\.iot\.' + re.escape(region) + r'\.amazonaws\.com', endpoint):
        raise ValueError('Endpoint/manifest region mismatch')
    project = root / ('.local/soil-nodes' if kind(node_type) == 'SOIL' else '.local/water-nodes') / device
    if project.exists(): raise ValueError('Project already exists; build it or use --refresh-source, not overwrite config')
    # Check pair/CA before writing a project. Only local files, no TLS/network call.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cafile=str(ca_file))
    context.load_cert_chain(certfile=str(origin / 'device.pem.crt'), keyfile=str(origin / 'private.pem.key'))
    PRIVATE['prepare_private_directory'](project)
    try:
        sources = public_sources(root, device, node_type)
        for name, text in sources.items():
            target = project / name; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
        data = project / 'data'; PRIVATE['prepare_private_directory'](data)
        for src, target in [(origin / 'device.pem.crt', 'device.pem.crt'), (origin / 'private.pem.key', 'private.pem.key'), (ca_file, 'AmazonRootCA1.pem')]:
            PRIVATE['write_private'](data / target, src.read_text())
        config = (project / 'config/config.example.h').read_text()
        overrides = {}
        if node_type == 'WATER': overrides = {'WATER_NODE_ID': json.dumps(device), 'WATER_AWS_ENDPOINT': json.dumps(endpoint),
                     'WATER_PULSES_PER_LITRE': repr(pulses_per_litre), 'WATER_FLOW_CALIBRATION_VERSION': json.dumps(calibration or '')}
        if node_type == 'SOIL': overrides = {'SOIL_NODE_ID': json.dumps(device), 'SOIL_AWS_ENDPOINT': json.dumps(endpoint)}
        for key, value in overrides.items():
            config, count = re.subn(r'^#define ' + key + r' .*$', lambda _: '#define ' + key + ' ' + value, config, flags=re.M)
            if count != 1: raise ValueError('Template configuration must define each setting exactly once')
        PRIVATE['write_private'](project / 'config/config.local.h', config)
        marker = {'nodeId': device, 'dataSource': 'SIMULATOR', 'sourceHashes': {
            name: hashlib.sha256((project / name).read_bytes()).hexdigest() for name in source_files(node_type)}}
        PRIVATE['write_private'](project / 'project.json', json.dumps(marker, indent=2) + '\n')
    except Exception:
        # Leave partial files private for inspection; never erase user material automatically.
        raise ValueError('Private project preparation incomplete; inspect its folder locally before retrying')
    print('Private Wokwi project prepared:', project)
    print('SIMULATOR only; demo input does not prove physical measurements. No AWS operation performed.')
    return project


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node-id')
    parser.add_argument('--node-type', choices=('WATER', 'SOIL'), default='WATER')
    parser.add_argument('--ca-file', type=Path, help='Public AmazonRootCA1.pem obtained over verified TLS')
    parser.add_argument('--pulses-per-litre', type=float, default=450.0)
    parser.add_argument('--refresh-source', action='store_true')
    args = parser.parse_args();device = identity(args.node_id or ("SOIL01" if args.node_type == "SOIL" else "WATER01"))
    if args.refresh_source: refresh(ROOT, device, args.node_type);return
    if not args.ca_file or not args.ca_file.is_file(): parser.error('--ca-file is required for initial preparation')
    try:
        with urllib.request.urlopen('http://127.0.0.1:8080/api/v1/nodes/' + device, timeout=8) as response:
            registry = json.load(response)
    except Exception: raise ValueError('Cannot read local node declaration; start backend and register the node first')
    prepare(ROOT, device, registry, args.ca_file, args.pulses_per_litre, args.node_type)


if __name__ == '__main__':
    try: main()
    except Exception as error:
        print('Monitor project preparation stopped:', type(error).__name__)
        if isinstance(error, ValueError): print(str(error))
        raise SystemExit(1)
