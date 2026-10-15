"""Retained, dedicated offline receipt: replay same UUID with control disabled, UI GET-only."""
import json,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
id='82000000-0000-4000-8000-000000000001';api='/api/v1/actuators/PUMP01'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=b.new_page(viewport={'width':1450,'height':1150});errors=[];writes=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok and not r.json()['controlEnabled'] and r.json()['mqtt']['state']=='DISABLED'
 r=page.request.get(base+api+'/status');assert r.ok;s=r.json();assert not s['controlEnabled'] and s['commandFence']['required'] and s['commandFence']['intent']['ready']
 r=page.request.get(base+api+'/requests/'+id);assert r.ok;receipt=r.json();assert receipt['command']['state']=='FAILED' and receipt['command']['errorCode']=='MQTT_UNAVAILABLE' and receipt['request']['action']=='OFF'
 replay=page.request.post(base+api+'/requests',data=receipt['request']);assert replay.status==202 and replay.json()==receipt,'Stored UUID must reconcile even with control disabled'
 page.add_init_script('sessionStorage.setItem("smartfarm:PUMP01:http-intents:v1",'+json.dumps(json.dumps([receipt['request']]))+');')
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();expect(page.get_by_text('Chưa đối chiếu OFF',exact=False)).to_be_visible()
 page.get_by_role('button',name='Đọc yêu cầu '+id,exact=True).click();expect(page.get_by_text('Đã đối chiếu bản lưu:',exact=False)).to_contain_text('Chưa gửi: MQTT chưa sẵn sàng');expect(page.get_by_text('Chưa đối chiếu OFF',exact=False)).to_have_count(0)
 for name in ['Bật đèn','Gửi lệnh tắt','Reset khóa']:expect(page.get_by_role('button',name=name,exact=True)).to_be_disabled()
 page.screenshot(path='/tmp/pump-http-full-app.png',full_page=True,animations='disabled');assert not writes,writes;assert not errors,errors;assert not external,external;b.close();print('PASS persisted offline OFF identity/replay with control disabled, UI rehydrates and GET-reconciles, no UI writes or MQTT/GPIO')
