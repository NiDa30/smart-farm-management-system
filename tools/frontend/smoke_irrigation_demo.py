"""GET-only full-app valve view with native receive fixture, all dispatch flags off."""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=b.new_page(viewport={'width':1450,'height':1050});writes=[];errors=[];external=[]
 r=page.request.get(base+'/api/v1/irrigation-demo');assert r.ok;s=r.json();assert not s['demoEnabled'] and not s['connected'] and not s['readyToOpen'];assert s['binding']['zoneId']=='ZONE01' and s['latest']['zoneId']=='ZONE01' and s['latest']['gpioState']=='CLOSED' and not s['commands']
 r=page.request.get(base+'/api/v1/safety');assert r.ok;assert not r.json()['controlEnabled'] and r.json()['mqtt']['state']=='DISABLED'
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Mở controller van mô phỏng',exact=True).click()
 expect(page.get_by_role('heading',name='Van mô phỏng VALVE01 · IRRIGATION01',exact=True)).to_be_visible();expect(page.get_by_text('Backend demo: Chưa bật',exact=False)).to_be_visible();expect(page.get_by_role('button',name='Mở van có thời hạn',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='Đóng van',exact=True)).to_be_disabled();expect(page.get_by_text('Binding: ZONE01',exact=False)).to_be_visible();expect(page.get_by_role('region',name='Phản hồi vị trí van')).to_be_visible();page.screenshot(path='/tmp/irrigation-demo-full-app.png',full_page=True,animations='disabled');page.get_by_role('button',name='Quay lại PUMP01',exact=True).click();expect(page.get_by_role('heading',name='Điều khiển PUMP01',exact=True)).to_be_visible();assert not writes,writes;assert not errors,errors;assert not external,external;b.close();print('PASS full-app: pump -> valve -> pump, native receive/PostgreSQL, disabled dispatch, no AWS/Wokwi/GPIO')
