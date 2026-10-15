#!/usr/bin/env python3
"""Render fixed IRRIGATION01/VALVE01 policies only. No SDK, network or provisioning."""
import argparse,json
from provision_day1 import policies as validate

def policies(region,account):
    validate(region,account)
    prefix=f'arn:aws:iot:{region}:{account}:'
    root='smartfarm/FARM001/VALVE01/'
    device={'Version':'2012-10-17','Statement':[
        {'Effect':'Allow','Action':'iot:Connect','Resource':prefix+'client/IRRIGATION01'},
        {'Effect':'Allow','Action':'iot:Subscribe','Resource':prefix+'topicfilter/'+root+'command'},
        {'Effect':'Allow','Action':'iot:Receive','Resource':prefix+'topic/'+root+'command'},
        {'Effect':'Allow','Action':'iot:Publish','Resource':[prefix+'topic/'+root+'ack',prefix+'topic/'+root+'status']},
    ]}
    backend={'Version':'2012-10-17','Statement':[
        {'Effect':'Allow','Action':'iot:Publish','Resource':prefix+'topic/'+root+'command'},
        {'Effect':'Allow','Action':'iot:Subscribe','Resource':[prefix+'topicfilter/'+root+'ack',prefix+'topicfilter/'+root+'status']},
        {'Effect':'Allow','Action':'iot:Receive','Resource':[prefix+'topic/'+root+'ack',prefix+'topic/'+root+'status']},
    ]}
    return {'devicePolicy':device,'backendAdditionalIdentityPolicy':backend}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--region',default='ap-southeast-1');p.add_argument('--account-id',required=True);a=p.parse_args();print(json.dumps(policies(a.region,a.account_id),indent=2))
