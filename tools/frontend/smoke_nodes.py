"""Full-app node registry smoke, dedicated nodes_smoke schema only.
MQTT/control must be disabled. save creates WATERDEMO metadata; read never writes.
SQL sample fixtures (not MQTT/hardware) can be added between phases; see report.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
args=argparse.ArgumentParser();args.add_argument('--phase',choices=['save','read'],required=True);phase=args.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1380,'height':1100});errors=[];writes=[]
 health=page.request.get(base+'/api/v1/safety').json()
 assert health['mqtt']['state']=='DISABLED' and not health['controlEnabled']
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request;path=urlparse(r.url).path
  if urlparse(r.url).netloc!=origin:route.abort();return
  if '/api/' in path and r.method!='GET':
   writes.append((r.method,path))
   if phase!='save' or r.method!='POST' or path!='/api/v1/nodes':route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
 page.get_by_role('button',name='Sensor Realtime',exact=True).click()
 page.get_by_role('button',name='Node & trạm nước',exact=True).click()
 expect(page.get_by_role('heading',name='Node & trạm nước',exact=True)).to_be_visible()
 expect(page.get_by_role('region',name='Node ENV01',exact=True)).to_contain_text('PUMP01 (PUMP_V1)')
 if phase=='save':
  page.get_by_role('button',name='Khai báo trạm nước',exact=True).click()
  page.get_by_label('Mã node',exact=True).fill('WATERDEMO')
  page.get_by_label('Tên trạm',exact=True).fill('Trạm nước demo')
  page.get_by_role('button',name='Lưu khai báo',exact=True).click()
  expect(page.get_by_role('status')).to_contain_text('Đã khai báo WATERDEMO')
  assert writes==[('POST','/api/v1/nodes')],writes
 else:assert not writes,writes
 expect(page.get_by_role('region',name='Node WATERDEMO',exact=True)).to_contain_text('Hợp đồng v2')
 if phase=='save':expect(page.get_by_role('article',name='WATERDEMO FLOW')).to_contain_text('Chưa có dữ liệu')
 else:
  expect(page.get_by_role('article',name='WATERDEMO LOW')).to_contain_text('Không có nước')
  expect(page.get_by_role('article',name='WATERDEMO HIGH')).to_contain_text('Mẫu đã lưu báo lỗi cảm biến')
  expect(page.get_by_role('article',name='WATERDEMO FLOW')).to_contain_text('0 L/min')
  expect(page.get_by_role('article',name='WATERDEMO FLOW')).to_contain_text('Dữ liệu cũ')
 page.screenshot(path='/tmp/nodes-fullapp-'+phase+'.png',full_page=True)
 assert not errors,errors
 browser.close();print('PASS node full app '+phase+': menu -> Sensor Realtime -> Node & trạm nước; real API/PostgreSQL, MQTT/control disabled')
