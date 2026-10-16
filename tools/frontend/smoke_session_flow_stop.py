"""GET-only full app check against retained synthetic flow_stop_verified_smoke. Never replays."""
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
 response=page.request.get(base+'/api/v1/irrigation-circuits/PC1/flow-guard/stops');assert response.ok
 history=response.json();assert not history['workerEnabled'] and len(history['items'])==1;item=history['items'][0]
 assert item['operationState']=='RETURNED' and item['commandState']=='EXECUTED' and item['evidence']['state']=='LOW_FLOW'
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Giám sát FLOW PC1',exact=True).click();page.get_by_role('button',name='Lịch sử dừng do FLOW',exact=True).click()
 expect(page.get_by_label('Chế độ giám sát FLOW',exact=True)).to_have_text('Backend chưa bật chế độ giám sát FLOW')
 article=page.get_by_role('article',name='Yêu cầu dừng '+item['requestId'],exact=True);expect(article).to_contain_text('EXECUTED');expect(article).to_contain_text('WATER01/FLOW');expect(article).to_contain_text(item['sessionId']);expect(article).not_to_contain_text('Đã tắt')
 page.screenshot(path='/tmp/session-flow-stop-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại giám sát FLOW',exact=True).click();expect(page.get_by_role('region',name='Giám sát FLOW PC1',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app flow stop history/evidence/disabled worker/back navigation; GET-only, no external or JS errors')
