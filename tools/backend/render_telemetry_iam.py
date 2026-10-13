#!/usr/bin/env python3
"""Render a local backend IAM policy for registered multi-sensor ingestion; no AWS calls."""
import argparse
import json
from pathlib import Path
import re
import runpy

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--account-id', required=True)
parser.add_argument('--region', default='ap-southeast-1')
args = parser.parse_args()
if not re.fullmatch(r'\d{12}', args.account_id) or not re.fullmatch(r'[a-z]{2}(?:-[a-z]+)+-\d', args.region):
    parser.error('Invalid account/region')
prefix = f'arn:aws:iot:{args.region}:{args.account_id}:'
base = 'smartfarm/FARM001/'
def statement(action, kind, paths):
    return {'Effect':'Allow', 'Action':action, 'Resource':[prefix+kind+'/'+path for path in paths]}
policy = {'Version':'2012-10-17', 'Statement':[
    statement('iot:Connect','client',['smartfarm-backend-FARM001']),
    statement('iot:Subscribe','topicfilter',[base+'+/telemetry',base+'ENV01/telemetry',base+'backend/probe']),
    statement('iot:Receive','topic',[base+'*/telemetry',base+'backend/probe']),
    statement('iot:Publish','topic',[base+'backend/probe']),
]}
output = root/'.local/aws'
runpy.run_path(str(root/'tools/aws/provision_day1.py'))['prepare_private_directory'](output)
destination = output/'backend-telemetry-iam-policy.json'
destination.write_text(json.dumps(policy,indent=2)+'\n')
print('Rendered only; no AWS operation:',destination)
