"""Read-only actual app check of an interrupted prepared session; never advances/replays it."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000';e=json.loads(Path('/tmp/irrigation-session-evidence.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!='127.0.0.1:3000':external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda x:errors.append(str(x)))
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 one=get('/api/v1/irrigation-circuits/PC1/session');assert one['active']['sessionId']==e['prepared']['sessionId'] and one['active']['phase']=='RECOVERY_REQUIRED' and one['active']['stopRequested'] and not one['canOpen'] and not one['canOn']
 for op in e['viewBeforeRestart']['recent']:
  if op['sessionId']==e['completed']['sessionId']:assert get('/api/v1/irrigation-circuits/PC1/session/'+op['sessionId'])==e['completed']
 for request in ['openId','onId','offId','closeId']:
  o=get('/api/v1/irrigation-circuits/PC1/session/actions/'+e['completed'][request]);assert o['state']=='RETURNED' and o['sessionId']==e['completed']['sessionId']
 two=get('/api/v1/irrigation-circuits/PC2/session');assert two['active']['sessionId']==one['active']['sessionId'] and not two['canStart'] and not two['canOff']
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Phiên tưới có xác nhận PC1',exact=True).click()
 expect(page.get_by_role('heading',name='Phiên tưới PC1 có xác nhận',exact=True)).to_be_visible();expect(page.get_by_text('Backend vừa restart;',exact=False)).to_be_visible();expect(page.get_by_role('button',name='Xác nhận mở van 30 giây',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='Xác nhận bật bơm',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='Yêu cầu tắt khẩn PUMP01',exact=True)).to_be_enabled();expect(page.get_by_text('Đã khép phiên với OFF/CLOSED xác nhận',exact=False)).to_be_visible();page.screenshot(path='/tmp/irrigation-session-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại danh sách nhánh',exact=True).click();page.get_by_role('button',name='Phiên tưới có xác nhận PC2',exact=True).click();expect(page.get_by_text('Phiên thuộc nhánh khác.',exact=False)).to_be_visible();expect(page.get_by_role('button',name='Xác nhận bật bơm',exact=True)).to_have_count(0)
 assert not writes and not external and not errors,(writes,external,errors);browser.close()
print('PASS actual app recovery/current versus completed session/operation lookup/other branch exclusion; GET only')
