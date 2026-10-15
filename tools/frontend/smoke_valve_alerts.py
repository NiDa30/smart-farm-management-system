"""Actual app + isolated PostgreSQL fixture. Only the first human acknowledgement may write."""
import argparse,json,os,shutil
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlparse,urlencode
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['open','stored','recovered'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
saved=Path('/tmp/valve-alert-app-evidence.json');note='Đã xem lỗi công tắc trong fixture local; chưa điều khiển van.'
recovery_saved=Path('/tmp/valve-alert-app-recovery-evidence.json')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1300});writes=[];errors=[];external=[]
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 circuits=get('/api/v1/irrigation-circuits');assert circuits['valveMonitorEnabled'] and not circuits['dispatchAvailable']
 assert len(circuits['circuits'])==1 and circuits['circuits'][0]['config']['circuitId']=='ALERTC1'
 safety=get('/api/v1/safety');assert not safety['controlEnabled'] and safety['mqtt']['state']=='DISABLED'
 assert not get('/api/v1/irrigation-demo')['demoEnabled']
 items=get('/api/v1/valve-alerts');assert len(items)==1;a=items[0];assert a['type']=='POSITION_FAULT' and a['context']=='CURRENT' and a['circuitSnapshot']['valveId']=='VALVE04'
 if phase=='open':assert not saved.exists() and a['clearedAt'] is None and a['acknowledgedAt'] is None
 else:
  previous=json.loads(saved.read_text());assert all(a[k]==previous[k] for k in ['id','circuitSnapshot','openedAt','openedSourceAt','openedEvidence','acknowledgedAt','acknowledgementNote'])
  assert (a['clearedAt'] is not None)==(phase=='recovered')
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':
   writes.append((r.method,urlparse(r.url).path));allowed=phase=='open' and r.method=='PUT' and urlparse(r.url).path==f"/api/v1/valve-alerts/{a['id']}/acknowledgement"
   if not allowed:route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Trung tâm Cảnh báo',exact=True).click();page.get_by_role('button',name='Van theo nhánh',exact=True).click()
 center=page.get_by_role('region',name='Cảnh báo van theo nhánh');expect(center.get_by_role('article')).to_have_count(1)
 expect(center).to_contain_text('IRRIGATION04/VALVE04');expect(center).to_contain_text('SWITCH_CONFLICT')
 page.get_by_role('button',name=f"Chi tiết cảnh báo van #{a['id']}",exact=True).click();detail=page.get_by_role('region',name='Xác nhận cảnh báo')
 if phase=='open':
  detail.get_by_label('Ghi chú khi xác nhận',exact=True).fill(note);detail.get_by_role('button',name='Xác nhận đã xem',exact=True).click();expect(detail.get_by_text('Đã lưu xác nhận đã xem.',exact=True)).to_be_visible()
  a=get(f"/api/v1/valve-alerts/{a['id']}");assert a['acknowledgementNote']==note and a['acknowledgedAt'] and a['clearedAt'] is None;saved.write_text(json.dumps(a,ensure_ascii=False,indent=2))
 else:expect(detail).to_contain_text(note)
 expect(detail).to_contain_text('Điều kiện van: '+('Đã trở về bình thường' if phase=='recovered' else 'Đang cảnh báo'))
 page.screenshot(path=f'/tmp/valve-alert-app-{phase}.png',full_page=True,animations='disabled')
 detail.get_by_role('button',name='Đóng chi tiết',exact=True).click();page.get_by_role('button',name='Nhật ký sự kiện Event Log',exact=True).click()
 expect(page.get_by_text('Phát sinh cảnh báo van',exact=True)).to_be_visible();expect(page.get_by_text('Xác nhận đã xem cảnh báo van',exact=True)).to_be_visible()
 if phase=='recovered':expect(page.get_by_text('Cảnh báo van trở về bình thường',exact=True)).to_be_visible()
 now=datetime.now(timezone.utc);query=urlencode({'from':(now-timedelta(hours=1)).isoformat(),'to':(now+timedelta(seconds=1)).isoformat(),'category':'ALERT','deviceId':'VALVE04','limit':100});events=get('/api/v1/events?'+query)['items']
 assert len(events)==(3 if phase=='recovered' else 2) and all(e['commandId'] is None and e['runId'] is None for e in events)
 opened=next(e for e in events if e['type']=='VALVE_ALERT_OPENED');assert opened['sourceAt']==a['openedSourceAt'] and opened['recordedAt']==a['openedAt']
 ack=next(e for e in events if e['type']=='VALVE_ALERT_ACKNOWLEDGED');assert ack['sourceAt'] is None and ack['eventAt']==a['acknowledgedAt']
 if phase=='recovered':
  clear=next(e for e in events if e['type']=='VALVE_ALERT_CLEARED');assert clear['sourceAt']==a['clearedSourceAt'] and clear['recordedAt']==a['clearedAt']
  evidence={'alert':a,'events':events}
  if recovery_saved.exists():assert evidence==json.loads(recovery_saved.read_text()),'Restart must preserve the complete closed episode and event metadata'
  else:recovery_saved.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 assert len(writes)==(1 if phase=='open' else 0),writes;assert not errors,errors;assert not external,external;browser.close()
 print('PASS actual-app valve alert '+phase+'; native receiver/PostgreSQL, real navigation/ACK/Event Log; no commands or AWS')
