"""GET-only actual-app check of retained native monitor data; never renews timestamps."""
import argparse,json,os,shutil
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['fresh','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
saved=Path('/tmp/circuit-valve-monitor-evidence.json')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1500,'height':1200});writes=[];errors=[];external=[]
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 s=get('/api/v1/irrigation-circuits');assert s['valveMonitorEnabled'] and s['mode']=='CONFIGURATION_ONLY' and not s['dispatchAvailable']
 a=next(c for c in s['circuits'] if c['config']['valveId']=='VALVE02');b=next(c for c in s['circuits'] if c['config']['valveId']=='VALVE03');o=a['valveObservation']
 assert o['monitorOnly'] and o['dataSource']=='SIMULATOR' and o['gpioState']=='CLOSED' and o['positionFeedback']=={'version':1,'enabled':True,'state':'CLOSED','fault':None}
 assert b['valveObservation'] is None and b['valveState']=='NOT_CONNECTED'
 age=(datetime.now(timezone.utc)-datetime.fromisoformat(o['observedAt'].replace('Z','+00:00'))).total_seconds()
 assert (age<15 and a['valveState']=='CLOSED') if phase=='fresh' else (age>=15 and a['valveState']=='STALE')
 if phase=='fresh':assert not saved.exists();saved.write_text(json.dumps(o,ensure_ascii=False,indent=2))
 else:assert o==json.loads(saved.read_text()),'Restart must not change packet metadata or timestamps'
 safety=get('/api/v1/safety');assert not safety['controlEnabled'] and safety['mqtt']['state']=='DISABLED'
 legacy=get('/api/v1/irrigation-demo');assert not legacy['demoEnabled'] and not legacy['connected'] and not legacy['commands']
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click()
 card=page.get_by_role('listitem').filter(has=page.get_by_role('heading',name='Nhánh thử 1 · CIRCUIT01 · v1',exact=True))
 expect(card).to_contain_text('Phản hồi van đóng' if phase=='fresh' else 'Dữ liệu cũ');expect(card).to_contain_text('IRRIGATION02/VALVE02');expect(card).to_contain_text('GPIO trong mẫu: Tắt')
 expect(page.get_by_role('listitem').filter(has=page.get_by_role('heading',name='Nhánh thử 2 · CIRCUIT02 · v1',exact=True))).to_contain_text('Chưa có kết nối van này')
 page.screenshot(path=f'/tmp/circuit-valve-monitor-{phase}.png',full_page=True,animations='disabled')
 assert not writes,writes;assert not errors,errors;assert not external,external;browser.close()
 print('PASS actual app native monitor '+phase+'; independent valve, no device requests or timestamp refresh')
