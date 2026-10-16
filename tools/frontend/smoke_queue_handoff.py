"""GET-only full app check against retained queue_handoff_smoke. Never prepares or replays."""
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
 q=page.request.get(base+'/api/v1/irrigation-queue');assert q.ok
 items=q.json()['history'];assert len(items)==1 and items[0]['state']=='HANDED_OFF';item=items[0]
 r=page.request.get(base+'/api/v1/irrigation-queue/requests/'+item['requestId']+'/session-handoff');assert r.ok
 v=r.json();assert not v['enabled'] and not v['canPrepare'] and v['receipt']['session']['phase']=='RECOVERY_REQUIRED'
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Mở hàng chờ tưới diễn tập',exact=True).click()
 page.get_by_role('button',name='Xem bản chuyển phiên #'+str(item['ticket']),exact=True).click();expect(page.get_by_label('Điều kiện chuyển phiên')).to_contain_text('Lượt đã chuyển');expect(page.get_by_text('Phiên đã liên kết:',exact=False)).to_contain_text('RECOVERY_REQUIRED');expect(page.get_by_role('button',name='Xác nhận chuyển lượt sang phiên chuẩn bị',exact=True)).to_be_disabled()
 page.get_by_role('button',name='Mở phiên đã chuyển',exact=True).click();expect(page.get_by_role('heading',name='Phiên tưới PC1 có xác nhận',exact=True)).to_be_visible();expect(page.get_by_text('Cần kiểm tra và dừng, không chạy lại',exact=False).first).to_be_visible()
 page.screenshot(path='/tmp/queue-handoff-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại bản chuyển phiên',exact=True).click();expect(page.get_by_role('heading',name='Chuẩn bị phiên từ lượt hàng chờ',exact=True)).to_be_visible();page.get_by_role('button',name='Quay lại hàng chờ',exact=True).click();expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app queue->handoff->linked recovery session->back; GET-only, zero writes/external/pageerrors')
