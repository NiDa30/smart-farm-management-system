"""GET-only actual app observation. Native memory-store reports do not prove NVS/GPIO."""
import argparse,json,os,shutil
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['boot','fault','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
saved=Path('/tmp/pump-durable-safety-fault-evidence.json')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1550,'height':1400});writes=[];errors=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok;s=r.json();assert s['mqtt']['state']=='DISABLED' and not s['controlEnabled'] and not s['controlTransportConnected']
 relay=s['relay'];journal=relay['durableSafety'];assert journal['version']==1 and journal['enabled'] and journal['storage']=='NVS' and relay['reportedState']=='OFF' and relay['safetyLockout']
 age=(datetime.now(timezone.utc)-datetime.fromisoformat(relay['observedAt'].replace('Z','+00:00'))).total_seconds()
 assert journal['state']==('LOCKED' if phase=='boot' else 'STORAGE_FAULT')
 evidence={'relay':relay,'history':s['stateHistory']}
 if phase=='stored':assert age>=15 and evidence==json.loads(saved.read_text()),'Restart must preserve clocks and journal without refreshing evidence'
 else:
  assert age<15
  if phase=='fault':assert not saved.exists();saved.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='An toàn Fail-Safe & Edge',exact=True).click()
 section=page.get_by_role('region',name='Khóa qua khởi động lại')
 expect(section).to_contain_text('Bằng chứng hiện tại: '+('Chưa xác định' if phase=='stored' else 'Thiết bị báo đang khóa, cần reset' if phase=='boot' else 'Thiết bị báo lỗi lưu trữ, giữ OFF và khóa'))
 expect(section).to_contain_text('Không khôi phục lệnh bật');expect(section.get_by_role('button')).to_have_count(0)
 page.get_by_role('button',name='Mở Nhật ký sự kiện',exact=True).click();page.get_by_role('button',name='Chi tiết device:'+str(s['stateHistory'][0]['id']),exact=True).click()
 expect(page.get_by_role('region',name='Chi tiết sự kiện')).to_contain_text('Khóa sau khởi động lại' if phase=='boot' else 'Lỗi đọc/ghi khóa NVS')
 page.screenshot(path=f'/tmp/pump-durable-safety-{phase}.png',full_page=True,animations='disabled')
 assert not writes,writes;assert not errors,errors;assert not external,external;browser.close()
 print('PASS actual-app durable journal '+phase+'; native memory model -> real receiver/PostgreSQL/React, GET only, no MQTT/AWS/flash/GPIO actuation')
