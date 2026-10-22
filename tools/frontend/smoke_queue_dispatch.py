"""GET-only full-app journey over a retained auto-dispatched completed native-model session."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000'
evidence=json.loads(Path('/tmp/queue-dispatch-evidence.json').read_text());request=evidence['request']['requestId']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!='127.0.0.1:3000':external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Mở hàng chờ tưới diễn tập',exact=True).click()
 page.get_by_role('button',name='Tự nhận lượt mới theo route',exact=True).click();expect(page.get_by_label('Trạng thái tự nhận')).to_have_text('Đã ngừng nhận lượt mới');expect(page.get_by_role('button',name='Bật tự nhận lượt mới',exact=True)).to_be_disabled()
 page.get_by_role('button',name='Xem chu trình tự nhận '+request,exact=True).click();expect(page.get_by_label('Trạng thái chu trình')).to_have_text('Đã khép phiên với OFF/CLOSED xác nhận');expect(page.get_by_role('button',name='Duyệt chạy một phiên',exact=True)).to_be_disabled()
 page.screenshot(path='/tmp/queue-dispatch-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại tự nhận hàng chờ',exact=True).click();expect(page.get_by_role('heading',name='Tự nhận lượt tưới mới',exact=True)).to_be_visible();page.get_by_role('button',name='Quay lại hàng chờ',exact=True).click();expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app queue -> disabled future dispatch -> retained COMPLETE cycle -> back; zero writes/external/pageerrors')
