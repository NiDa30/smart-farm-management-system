#!/usr/bin/env python3
"""Render legacy valve demo or read-only monitor policies. No SDK/network/provisioning."""
import argparse,json,re
from provision_day1 import policies as validate

def policies(region,account,controller_id='IRRIGATION01',valve_id='VALVE01',monitor_only=False):
    validate(region,account)
    prefix=f'arn:aws:iot:{region}:{account}:'
    if monitor_only:
        if not re.fullmatch(r'IRRIGATION(0[2-9]|[1-9][0-9])',controller_id) or not re.fullmatch(r'VALVE(0[2-9]|[1-9][0-9])',valve_id):
            raise ValueError('Monitor requires separate controller/valve IDs 02..99')
        root=f'smartfarm/FARM001/{valve_id}/'
        return {'devicePolicy':{'Version':'2012-10-17','Statement':[
            {'Effect':'Allow','Action':'iot:Connect','Resource':prefix+'client/'+controller_id},
            {'Effect':'Allow','Action':'iot:Publish','Resource':prefix+'topic/'+root+'status'}]},
            'backendAdditionalIdentityPolicy':{'Version':'2012-10-17','Statement':[
                {'Effect':'Allow','Action':'iot:Subscribe','Resource':prefix+'topicfilter/'+root+'status'},
                {'Effect':'Allow','Action':'iot:Receive','Resource':prefix+'topic/'+root+'status'}]}}
    if controller_id!='IRRIGATION01' or valve_id!='VALVE01':raise ValueError('New IDs support monitor-only mode; legacy demo stays fixed')
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
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--region',default='ap-southeast-1');p.add_argument('--account-id',required=True)
    p.add_argument('--controller-id',default='IRRIGATION01');p.add_argument('--valve-id',default='VALVE01');p.add_argument('--monitor-only',action='store_true')
    a=p.parse_args();print(json.dumps(policies(a.region,a.account_id,a.controller_id,a.valve_id,a.monitor_only),indent=2))
