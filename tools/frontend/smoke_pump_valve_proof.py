"""GET-only actual-app checks of native local valve proof. Never refresh stored evidence."""
import argparse,json,os,shutil
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['fresh','fault','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
saved=Path('/tmp/pump-valve-proof-fault-evidence.json')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1550,'height':1400});writes=[];errors=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok;s=r.json();assert s['mqtt']['state']=='DISABLED' and not s['controlEnabled'] and not s['controlTransportConnected']
 relay=s['relay'];proof=relay['valveInterlock'];assert proof['version']==1 and proof['enabled'] and proof['dataSource']=='SIMULATOR' and relay['reportedState']=='OFF'
 age=(datetime.now(timezone.utc)-datetime.fromisoformat(relay['observedAt'].replace('Z','+00:00'))).total_seconds()
 if phase=='fresh':assert proof['state']=='OPEN' and proof['fault'] is None and not relay['safetyLockout'] and age<15
 else:
  assert proof['fault']=='VALVE_PROOF_LOST' and relay['safetyLockout'];evidence={'relay':relay,'history':s['stateHistory']}
  if phase=='fault':assert not saved.exists() and age<15;saved.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
  else:
   # V31 adds an optional null capability to old pump API rows; no backfill.
   expected=json.loads(saved.read_text());actual=json.loads(json.dumps(evidence))
   for value in [expected,actual]:
    if value['relay'].get('durableSafety') is None:value['relay'].pop('durableSafety',None)
   assert age>=15 and actual==expected,'Restart must preserve proof, clocks and history without treating them as current'
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='An toàn Fail-Safe & Edge',exact=True).click();section=page.get_by_role('region',name='Liên động van tại bơm');expect(section).to_contain_text('Mô phỏng')
 expect(section).to_contain_text('Thiết bị báo có phản hồi OPEN' if phase=='fresh' else 'Thiết bị báo đã khóa do liên động van' if phase=='fault' else 'Bằng chứng hiện tại: Chưa xác định')
 if phase!='fresh':expect(section).to_contain_text('Mất phản hồi van mở khi bơm đang bật')
 page.screenshot(path=f'/tmp/pump-valve-proof-{phase}.png',full_page=True,animations='disabled')
 if phase!='fresh':
  page.get_by_role('button',name='Mở Nhật ký sự kiện',exact=True).click();expect(page.get_by_role('heading',name='Nhật ký sự kiện IoT',exact=True)).to_be_visible()
  page.get_by_role('button',name='Chi tiết device:'+str(s['stateHistory'][0]['id']),exact=True).click();expect(page.get_by_role('region',name='Chi tiết sự kiện')).to_contain_text('Mất phản hồi van mở khi bơm đang bật')
 assert not writes,writes;assert not errors,errors;assert not external,external;browser.close()
 print('PASS actual-app local valve proof '+phase+'; native receiver/PostgreSQL/React, GET only, no MQTT or hardware actuation')
