"""GET-only actual React/backend/PostgreSQL ownership check on the retained isolated fixture."""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect

base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base)
assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
id='92000000-0000-4000-8000-000000000001';api='/api/v1/actuators/PUMP01'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=b.new_page(viewport={'width':1450,'height':1150});errors=[];writes=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok and not r.json()['controlEnabled'] and r.json()['mqtt']['state']=='DISABLED'
 r=page.request.get(base+api+'/status');assert r.ok;s=r.json();o=s['commandFence']['ownership']
 assert not s['controlEnabled'] and s['commandFence']['required'] and s['commandFence']['intent']['ready']
 assert o['blocked'] and o['unresolvedCount']==1 and o['holder']['commandId']==id and o['holder']['source']=='MANUAL' and not o['holder']['releasable']
 r=page.request.get(base+api+'/requests/'+id);assert r.ok and r.json()['command']['state'] in ['PUBLISH_UNCERTAIN','TIMED_OUT']
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click()
 panel=page.get_by_role('region',name='Quyền sử dụng bơm');expect(panel).to_contain_text('Điều khiển thủ công');expect(panel).to_contain_text('Chưa đủ bằng chứng OFF')
 for name in ['Bật đèn','Gửi lệnh tắt','Reset khóa']:expect(page.get_by_role('button',name=name,exact=True)).to_be_disabled()
 page.get_by_role('button',name='Mở hàng chờ tưới diễn tập',exact=True).click();expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible()
 page.get_by_role('button',name='Quay lại điều khiển',exact=True).click();expect(page.get_by_role('region',name='Quyền sử dụng bơm')).to_contain_text('Chưa đủ bằng chứng OFF')
 page.screenshot(path='/tmp/pump-ownership-full-app.png',full_page=True,animations='disabled')
 assert not writes,writes;assert not external,external;assert not errors,errors;b.close()
 print('PASS actual app unresolved owner survives navigation; no API writes, AWS or GPIO')
