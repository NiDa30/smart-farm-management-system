"""GET-only full-app check of retained native status, never dispatches a command."""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=b.new_page(viewport={'width':1450,'height':1150});errors=[];writes=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok and r.json()['mqtt']['state']=='DISABLED' and not r.json()['controlEnabled']
 r=page.request.get(base+'/api/v1/actuators/PUMP01/status');assert r.ok;s=r.json();f=s['commandFence'];assert not s['controlEnabled'] and f=={'required':True,'deviceEnabled':True,'compatible':True,'restartRequired':False,'lastOrdinal':0}
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click()
 expect(page.get_by_role('heading',name='Điều khiển PUMP01',exact=True)).to_be_visible();expect(page.get_by_text('Bảo vệ lệnh đến muộn qua MQTT:',exact=False)).to_contain_text('Backend đã bật · Thiết bị: Đã bật')
 for name in ['Bật đèn','Gửi lệnh tắt','Reset khóa']:expect(page.get_by_role('button',name=name,exact=True)).to_be_disabled()
 page.get_by_role('button',name='Mở hàng chờ tưới diễn tập',exact=True).click();expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Diễn tập lượt đầu hàng',exact=True)).to_be_disabled();page.get_by_role('button',name='Quay lại điều khiển',exact=True).click();expect(page.get_by_text('Bảo vệ lệnh đến muộn qua MQTT:',exact=False)).to_be_visible();page.screenshot(path='/tmp/pump-fence-full-app.png',full_page=True,animations='disabled')
 assert not writes,writes;assert not errors,errors;assert not external,external;b.close();print('PASS full-app fenced metadata, disabled physical controls, pump -> preview queue -> pump, no API writes/external traffic')
