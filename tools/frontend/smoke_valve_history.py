"""GET-only real app history/CSV checks. Uses retained isolated fixture, never renews timestamps."""
import argparse,json,os,shutil
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlparse,urlencode
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['first','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
saved=Path('/tmp/valve-history-app-evidence.json')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1300});writes=[];errors=[];external=[]
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 configs=get('/api/v1/irrigation-circuits');assert configs['valveMonitorEnabled'] and not configs['dispatchAvailable'];assert len(configs['circuits'])==2
 c=next(x for x in configs['circuits'] if x['config']['circuitId']=='ALERTC1');assert c['config']['revision']==2 and c['valveState']=='CONFIG_CHANGED'
 safety=get('/api/v1/safety');assert not safety['controlEnabled'] and safety['mqtt']['state']=='DISABLED';assert not get('/api/v1/irrigation-demo')['demoEnabled']
 if phase=='first':
  assert not saved.exists();now=datetime.now(timezone.utc);query={'from':(now-timedelta(hours=1)).isoformat(),'to':(now+timedelta(seconds=1)).isoformat(),'circuitId':'ALERTC1','valveId':'VALVE04','condition':'ALL','limit':200}
 else:query=json.loads(saved.read_text())['query']
 data=get('/api/v1/valve-history?'+urlencode(query));assert len(data['items'])==3 and data['nextCursor'] is None
 assert all(x['circuitSnapshot']['revision']==1 and x['circuitSnapshot']['name']=='Nhánh lịch sử 1' for x in data['items'])
 assert [x['observation']['sequence'] for x in data['items']]==[1,0,0] and [x['observation']['positionFeedback']['state'] for x in data['items']]==['CLOSED','CLOSED','CONFLICT']
 assert all(x['observation']['dataSource']=='SIMULATOR' and x['observation']['monitorOnly'] and x['observation']['gpioState']=='CLOSED' for x in data['items'])
 evidence={'query':query,'page':data}
 if phase=='first':saved.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 else:assert evidence==json.loads(saved.read_text()),'Restart must preserve complete historical packet/configuration/clock metadata'
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.method+' '+r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Lịch sử trạng thái van',exact=True).click()
 expect(page.locator('tbody tr')).to_have_count(3);latest=data['items'][0];page.get_by_role('button',name=f"Xem mẫu #{latest['id']}",exact=True).click();detail=page.get_by_role('region',name='Chi tiết mẫu van');expect(detail).to_contain_text('Nhánh lịch sử 1');expect(detail).to_contain_text('Nhánh ALERTC1 v1');expect(detail).to_contain_text(latest['observation']['receivedAt']);expect(detail).to_contain_text(latest['observation']['bootId'])
 with page.expect_download() as download_info:page.get_by_role('button',name='Xuất CSV đã tải',exact=True).click()
 csv=Path(download_info.value.path()).read_text();assert csv.startswith('\ufeff') and '"receivedAt"' in csv and '"Nhánh lịch sử 1"' in csv and 'Nhánh đã đổi tên' not in csv and '"SWITCH_CONFLICT"' in csv
 page.screenshot(path=f'/tmp/valve-history-app-{phase}.png',full_page=True,animations='disabled')
 page.get_by_label('Lọc điều kiện van',exact=True).select_option('FAULT');page.get_by_role('button',name='Đọc lịch sử van',exact=True).click();expect(page.locator('tbody tr')).to_have_count(1);expect(page.locator('tbody')).to_contain_text('SWITCH_CONFLICT')
 page.get_by_label('Lọc điều kiện van',exact=True).select_option('ALL');page.get_by_label('Lọc mã van',exact=True).fill('VALVE05');page.get_by_role('button',name='Đọc lịch sử van',exact=True).click();expect(page.get_by_text('Chưa có bản tin trong bộ lọc này.',exact=True)).to_be_visible();expect(page.locator('tbody tr')).to_have_count(0)
 assert not writes,writes;assert not external,external;assert not errors,errors;browser.close()
 print('PASS actual-app valve history '+phase+'; real navigation, filters, historical snapshots/clocks, CSV; no mocks, writes, commands or AWS')
