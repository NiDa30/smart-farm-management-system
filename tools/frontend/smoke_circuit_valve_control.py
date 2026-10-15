"""GET-only full app check of the retained synthetic circuit command/ACK/timer fixture."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000';evidence=json.loads(Path('/tmp/circuit-control-evidence.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!='127.0.0.1:3000':external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 one=get('/api/v1/irrigation-circuits/CC1/control');two=get('/api/v1/irrigation-circuits/CC2/control');assert one['profile']=='CIRCUIT_LED_DEMO' and one['enabled'] and not one['connected'] and not one['readyToOpen']
 assert one['latest']==evidence['latest'] and one['commands']==evidence['commands'],'Never replay fixture packets or modify source/receipt/ledger clocks'
 assert one['latest']['reason']=='TIMER_EXPIRED' and one['latest']['sequence']==3 and one['commands'][0]['state']=='EXECUTED';assert two['latest'] is None and two['commands']==[]
 safety=get('/api/v1/safety');assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled']
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Điều khiển LED CC1',exact=True).click()
 expect(page.get_by_role('heading',name='Điều khiển LED nhánh CC1',exact=True)).to_be_visible();expect(page.get_by_text('GPIO thiết bị báo:',exact=False)).to_contain_text('Chưa có trạng thái mới');expect(page.get_by_text('Thiết bị đã ACK GPIO',exact=False)).to_be_visible();expect(page.get_by_role('button',name='Mở LED van có thời hạn',exact=True)).to_be_disabled();page.screenshot(path='/tmp/circuit-control-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại danh sách nhánh',exact=True).click();page.get_by_role('button',name='Điều khiển LED CC2',exact=True).click();expect(page.get_by_role('heading',name='Điều khiển LED nhánh CC2',exact=True)).to_be_visible();expect(page.get_by_text('Chưa có lệnh theo nhánh.',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Đóng LED van',exact=True)).to_be_disabled()
 assert writes==[] and external==[] and errors==[],(writes,external,errors);browser.close()
print('PASS actual full-app circuit selection/retained ledger/stale UI/isolation; GET only, zero AWS/MQTT/GPIO')
