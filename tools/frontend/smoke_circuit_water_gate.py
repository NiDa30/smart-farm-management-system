"""GET-only real app check against retained water_gate_smoke, no packet replay or writes."""
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
 r=page.request.get(base+'/api/v1/irrigation-circuits/WC1/water-gate');assert r.ok
 v=r.json();assert v['state']=='STALE' and not v['allowed'] and v['policy']['enabled'] and v['sample']['sequence']==4 and v['sample']['value'] is True
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Chốt nguồn nước WC1',exact=True).click()
 expect(page.get_by_role('region',name='Chốt nguồn nước WC1',exact=True)).to_be_visible();expect(page.get_by_label('Kết quả chốt nguồn nước',exact=True)).to_have_text('Mẫu phao LOW đã cũ');expect(page.get_by_label('Bật chốt nguồn nước cho nhánh',exact=True)).to_be_checked();expect(page.get_by_role('button',name='Lưu chốt nguồn nước',exact=True)).to_be_disabled()
 page.get_by_role('button',name='Làm mới chốt nguồn nước',exact=True).click();expect(page.get_by_label('Kết quả chốt nguồn nước',exact=True)).to_have_text('Mẫu phao LOW đã cũ');page.screenshot(path='/tmp/water-gate-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại danh sách nhánh',exact=True).click();expect(page.get_by_role('heading',name='Nhánh tưới theo vùng và trạm nước',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app water gate binding/stale/refresh/back navigation; GET-only, no external or JS errors')
