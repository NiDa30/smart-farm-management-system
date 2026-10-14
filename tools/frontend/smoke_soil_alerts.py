"""Full-app soil alert smoke on the dedicated SoilAlertSmokeFixture only.
ack permits one exact PUT; read/cleared are GET-only. No MQTT/AWS commands.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['ack','read','cleared'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');parsed=urlparse(base);origin=parsed.netloc
assert parsed.scheme=='http' and parsed.hostname=='127.0.0.1' and parsed.port==3000
note='Đã kiểm tra điểm đất mô phỏng SOIL1'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1500,'height':1100});errors=[];writes=[];external=[]
 response=page.request.get(base+'/api/v1/safety');assert response.ok
 safety=response.json();assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled']
 response=page.request.get(base+'/api/v1/nodes/SOILWARN');assert response.ok
 node=response.json();assert node['name']=='Soil alert fixture' and node['nodeType']=='SOIL'
 assert all(c['latest']['bootId']=='43000000-0000-4000-8000-000000000001' for c in node['channels'])
 response=page.request.get(base+'/api/v1/soil-alerts');assert response.ok
 alerts=response.json();assert len(alerts)==2 and all(a['nodeId']=='SOILWARN' and a['dataSource']=='SIMULATOR' for a in alerts)
 dry=next(a for a in alerts if a['type']=='DRY_SOIL');fault=next(a for a in alerts if a['type']=='SENSOR_FAULT')
 assert dry['channelId']=='SOIL1' and dry['openedValue']==0 and fault['channelId']=='SOIL3' and fault['openedValue'] is None
 path=f"/api/v1/soil-alerts/{dry['id']}/acknowledgement"
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=origin:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':
   writes.append((r.method,urlparse(r.url).path))
   if phase!='ack' or r.method!='PUT' or urlparse(r.url).path!=path or r.post_data_json!={'note':note}:route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Trung tâm Cảnh báo',exact=True).click();page.get_by_role('button',name='Đất nhiều điểm',exact=True).click()
 expect(page.get_by_role('article')).to_have_count(2)
 page.get_by_role('button',name=f"Chi tiết cảnh báo đất #{dry['id']}",exact=True).click();detail=page.get_by_role('region',name='Xác nhận cảnh báo',exact=True)
 if phase=='ack':
  assert dry['acknowledgedAt'] is None and dry['clearedAt'] is None
  page.get_by_label('Ghi chú khi xác nhận',exact=True).fill(note);detail.get_by_role('button',name='Xác nhận đã xem',exact=True).click()
  expect(detail).to_contain_text('Đã lưu xác nhận đã xem.');expect(detail).to_contain_text('Điều kiện cảm biến: Đang cảnh báo');assert writes==[('PUT',path)]
 else:
  assert dry['acknowledgedAt'] is not None and dry['acknowledgementNote']==note and fault['acknowledgedAt'] is None
  expect(detail).to_contain_text('Ghi chú đã lưu: '+note);assert not writes
  if phase=='cleared':
   assert dry['clearedValue']==40 and fault['clearedValue']==50 and all(a['clearedAt'] is not None for a in alerts)
   expect(detail).to_contain_text('Điều kiện cảm biến: Đã trở về bình thường')
  else:assert all(a['clearedAt'] is None for a in alerts)
 page.get_by_label('Nguồn cảnh báo đất').select_option('PHYSICAL');expect(page.get_by_role('article')).to_have_count(0)
 page.get_by_label('Nguồn cảnh báo đất').select_option('SIMULATOR');expect(page.get_by_role('article')).to_have_count(2)
 page.screenshot(path='/tmp/soil-alert-'+phase+'.png',full_page=True,animations='disabled')
 assert not errors,errors;assert not external,external
 browser.close();print('PASS full-app SOIL alerts '+phase+': real API/PostgreSQL, local receive fixtures, no MQTT/AWS commands')
