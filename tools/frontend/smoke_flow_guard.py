"""GET-only full-app flow reason smoke, dedicated flow_guard_smoke receive fixture.
No command, MQTT or hardware operation. Safely treats old source status as unknown.
"""
import os,shutil
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1400,'height':1150});errors=[];writes=[]
 response=page.request.get(base+'/api/v1/safety');assert response.ok, 'Start backend and wait for Safety API readiness before smoke'
 status=response.json()
 assert status['mqtt']['state']=='DISABLED' and not status['controlEnabled']
 assert status['relay']['stateReason']=='FLOW_SENSOR_FAULT' and status['relay']['safetyLockout'] and status['relay']['reportedState']=='OFF'
 assert {r['stateReason'] for r in status['stateHistory']}=={'FLOW_LOW','FLOW_SENSOR_FAULT'}
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=origin:route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='An toàn Fail-Safe & Edge',exact=True).click()
 relay=page.get_by_role('region',name='Relay và khóa an toàn',exact=True)
 expect(relay).to_contain_text('Bản báo đã lưu: OFF · Khóa: Có');expect(relay).to_contain_text('Tín hiệu lưu lượng tại bộ điều khiển lỗi (thiết bị báo)')
 expect(page.get_by_role('region',name='Lịch sử relay',exact=True)).to_contain_text('Thiếu lưu lượng tại bộ điều khiển (thiết bị báo)')
 age=(datetime.fromisoformat(status['asOf'].replace('Z','+00:00'))-datetime.fromisoformat(status['relay']['observedAt'].replace('Z','+00:00'))).total_seconds()
 if age>=15:expect(relay).to_contain_text('Trạng thái hiện tại: Chưa xác định')
 page.screenshot(path='/tmp/flow-guard-safety.png',full_page=True,animations='disabled')
 page.get_by_role('button',name='Mở Điều khiển Actuator',exact=True).click()
 expect(page.get_by_text('Tín hiệu lưu lượng tại bộ điều khiển lỗi (thiết bị báo)',exact=True)).to_be_visible()
 page.get_by_role('button',name='Nhật ký sự kiện Event Log',exact=True).click()
 low_event=next(r['id'] for r in status['stateHistory'] if r['stateReason']=='FLOW_LOW')
 page.get_by_role('button',name=f'Chi tiết device:{low_event}',exact=True).click()
 expect(page.get_by_role('region',name='Chi tiết sự kiện',exact=True)).to_contain_text('Thiếu lưu lượng tại bộ điều khiển (thiết bị báo)')
 assert not errors,errors;assert not writes,writes
 browser.close();print('PASS full app Safety -> Control -> Event Log with stored flow reasons, GET only; no live hardware')
