"""Full app WATER monitor smoke: dedicated water_a2_smoke SQL fixtures, no AWS.
--phase declare writes one registry node; mid/fault/stale use only GET.
Seed instructions are in WATER_NODE_FIRMWARE_REPORT.md.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
args=argparse.ArgumentParser();args.add_argument('--phase',choices=['declare','mid','fault','stale'],required=True);phase=args.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1380,'height':1100});errors=[];writes=[]
 health=page.request.get(base+'/api/v1/safety').json();assert health['mqtt']['state']=='DISABLED' and not health['controlEnabled']
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request;path=urlparse(r.url).path
  if urlparse(r.url).netloc!=origin:route.abort();return
  if '/api/' in path and r.method!='GET':
   writes.append((r.method,path))
   if phase!='declare' or r.method!='POST' or path!='/api/v1/nodes':route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Sensor Realtime',exact=True).click()
 page.get_by_role('button',name='Node & trạm nước',exact=True).click()
 if phase=='declare':
  page.get_by_role('button',name='Khai báo trạm nước',exact=True).click();page.get_by_label('Mã node',exact=True).fill('WATER01');page.get_by_label('Tên trạm',exact=True).fill('Trạm nước mô phỏng')
  page.get_by_role('button',name='Lưu khai báo',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã khai báo WATER01')
  assert writes==[('POST','/api/v1/nodes')],writes
 else:
  assert not writes,writes
  expect(page.get_by_role('article',name='WATER01 LOW')).to_contain_text('Mô phỏng (thiết bị khai báo)')
  level=page.get_by_label('Mức bồn WATER01')
  if phase=='mid':
   expect(level).to_contain_text('Có nước ở LOW, chưa đạt HIGH');expect(page.get_by_role('article',name='WATER01 FLOW')).to_contain_text('6 L/min')
  elif phase=='fault':
   expect(level).to_contain_text('Tín hiệu phao lỗi hoặc không nhất quán');expect(page.get_by_role('article',name='WATER01 LOW')).to_contain_text('Cảm biến báo lỗi');expect(page.get_by_role('article',name='WATER01 FLOW')).to_contain_text('0 L/min')
  else:
   expect(level).to_contain_text('Chưa xác định mức bồn');expect(page.get_by_role('article',name='WATER01 LOW')).to_contain_text('Dữ liệu cũ')
 page.screenshot(path='/tmp/water-monitor-'+phase+'.png',full_page=True)
 assert not errors,errors
 browser.close();print('PASS water monitor full app '+phase+': real API/PostgreSQL, SQL samples, MQTT/control disabled')
