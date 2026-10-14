"""Full-app water alert/ack smoke. Use only dedicated water_alert_smoke fixtures.
ack writes exactly one acknowledgement; read/cleared use GET only. No MQTT/AWS.
"""
import argparse, os, shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['ack','read','cleared'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
note='Đã kiểm tra phao mô phỏng'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1400,'height':1200});errors=[];writes=[]
 safety=page.request.get(base+'/api/v1/safety').json();assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled']
 alerts=page.request.get(base+'/api/v1/water-alerts').json();assert len(alerts)==1 and alerts[0]['nodeId']=='WATERALARM' and alerts[0]['dataSource']=='SIMULATOR'
 alert=alerts[0];path=f"/api/v1/water-alerts/{alert['id']}/acknowledgement"
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  request=route.request
  if urlparse(request.url).netloc!=origin:route.abort();return
  if '/api/' in request.url and request.method!='GET':
   writes.append((request.method,urlparse(request.url).path))
   if phase!='ack' or request.method!='PUT' or urlparse(request.url).path!=path or request.post_data_json!={'note':note}:route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Trung tâm Cảnh báo',exact=True).click()
 page.get_by_role('button',name='Trạm nước',exact=True).click()
 article=page.get_by_role('article');expect(article).to_have_count(1);expect(article).to_contain_text('WATERALARM');expect(article).to_contain_text('Mô phỏng (thiết bị khai báo)')
 page.get_by_role('button',name=f"Chi tiết cảnh báo nước #{alert['id']}",exact=True).click();detail=page.get_by_role('region',name='Xác nhận cảnh báo',exact=True)
 if phase=='ack':
  assert alert['acknowledgedAt'] is None and alert['clearedAt'] is None
  page.get_by_label('Ghi chú khi xác nhận',exact=True).fill(note);detail.get_by_role('button',name='Xác nhận đã xem',exact=True).click()
  expect(detail).to_contain_text('Đã lưu xác nhận đã xem.');expect(detail).to_contain_text('Điều kiện cảm biến: Đang cảnh báo');assert writes==[('PUT',path)]
 else:
  assert alert['acknowledgedAt'] is not None and alert['acknowledgementNote']==note
  expect(detail).to_contain_text('Ghi chú đã lưu: '+note);assert not writes
  if phase=='cleared':
   assert alert['clearedSampleId'] is not None;expect(detail).to_contain_text('Điều kiện cảm biến: Đã trở về bình thường');expect(article).to_contain_text('Hết điều kiện theo giờ đo')
  else:assert alert['clearedAt'] is None
 page.screenshot(path='/tmp/water-alert-'+phase+'.png',full_page=True,animations='disabled');assert not errors,errors
 browser.close();print('PASS full app water alerts '+phase+': real API/PostgreSQL, local router fixture, MQTT/control disabled')
