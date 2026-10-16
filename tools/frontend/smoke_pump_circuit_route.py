"""GET-only full-app check of retained native route/ACK/timer evidence; never refreshes it."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000';evidence=json.loads(Path('/tmp/pump-route-evidence.json').read_text())
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
 one=get('/api/v1/irrigation-circuits/PC1/pump-proof');two=get('/api/v1/irrigation-circuits/PC2/pump-proof');receipt=get('/api/v1/actuators/PUMP01/requests/'+evidence['receipt']['request']['requestId'])
 assert not one['connected'] and not one['readyToStart'] and not one['readyToReset'] and one['route']==evidence['proof']['route'];assert receipt==evidence['receipt']
 assert one['pump']['observedAt']==evidence['proof']['pump']['observedAt'] and one['pump']['commandFence']['lastOrdinal']==1
 assert get('/api/v1/irrigation-circuits/PC1/control')['latest']==evidence['valve']['latest'];assert get('/api/v1/irrigation-circuits/PC2/control')['latest']==evidence['other']['latest']
 assert two['route']['circuitId']=='PC2' and two['pump']['commandFence']['circuitRoute']['circuitId']=='PC1' and not two['readyToStart']
 safety=get('/api/v1/safety');assert safety['mqtt']['state']=='DISABLED' and not safety['controlTransportConnected'];assert safety['relay']['valveInterlock']['route']==one['route']
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();expect(page.get_by_role('button',name='Bật đèn',exact=True)).to_be_disabled();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Bơm theo nhánh PC1 (LED)',exact=True).click()
 expect(page.get_by_role('heading',name='Bơm theo nhánh PC1 (LED)',exact=True)).to_be_visible();expect(page.get_by_text('PZONE1 v1 → IRRIGATION18/VALVE18',exact=False)).to_be_visible();expect(page.get_by_role('button',name='Bật bơm LED đúng nhánh',exact=True)).to_be_disabled();expect(page.get_by_text('Trạng thái bơm:',exact=False)).to_contain_text('Chưa xác định');page.screenshot(path='/tmp/pump-route-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại danh sách nhánh',exact=True).click();page.get_by_role('button',name='Bơm theo nhánh PC2 (LED)',exact=True).click();expect(page.get_by_text('PZONE2 v1 → IRRIGATION19/VALVE19',exact=False)).to_be_visible();expect(page.get_by_text('Tín hiệu tại bơm gắn với:',exact=False)).to_contain_text('PC1 / VALVE18');expect(page.get_by_role('button',name='Bật bơm LED đúng nhánh',exact=True)).to_be_disabled()
 assert writes==[] and external==[] and errors==[],(writes,external,errors);browser.close()
print('PASS full app menu/branch route distinction/stale observation/read-only receipts; no writes or external traffic')
