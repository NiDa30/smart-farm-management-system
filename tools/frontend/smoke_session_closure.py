"""GET-only full app check against retained session_closure_verified_smoke, never re-arms."""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!='127.0.0.1:3000':external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
 r=page.request.get(base+'/api/v1/irrigation-circuits/PC1/session');assert r.ok
 v=r.json();assert v['active'] is None and len(v['recent'])==1;sid=v['recent'][0]['sessionId']
 r=page.request.get(base+'/api/v1/irrigation-circuits/PC1/session/'+sid+'/closure');assert r.ok
 c=r.json();assert not c['enabled'] and c['closure']['state']=='COMPLETE' and not c['canArm']
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Phiên tưới có xác nhận PC1',exact=True).click();page.get_by_role('button',name='Xem tự khép '+sid,exact=True).click()
 expect(page.get_by_label('Trạng thái tự khép')).to_have_text('Đã khép phiên với bằng chứng OFF/CLOSED');expect(page.get_by_role('button',name='Bật tự khép một lần cho phiên',exact=True)).to_be_disabled();expect(page.get_by_text('CLOSE '+c['closure']['closeId'],exact=False)).to_be_visible()
 page.screenshot(path='/tmp/session-closure-full-app.png',full_page=True);page.get_by_role('button',name='Quay lại phiên tưới',exact=True).click();expect(page.get_by_role('heading',name='Phiên tưới PC1 có xác nhận',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app completed closure/immutable IDs/disabled rearm/back navigation; GET-only, zero external/pageerrors')
