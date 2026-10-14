"""GET-only full-app agricultural overview using exact guarded local fixture. No AWS."""
import os,shutil,argparse
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['fresh','stale'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');parsed=urlparse(base)
assert parsed.scheme=='http' and parsed.hostname=='127.0.0.1' and parsed.port==3000
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1500,'height':1100});errors=[];writes=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok;s=r.json();assert s['mqtt']['state']=='DISABLED' and not s['controlEnabled']
 r=page.request.get(base+'/api/v1/dashboard/overview');assert r.ok;a=r.json()['agriculture'];assert a['waterActiveCount']==1 and a['soilActiveCount']==2
 assert {n['nodeId'] for n in a['inventory']['nodes'] if n['nodeType']!='ENVIRONMENT'}=={'AGSOIL','AGWATER'}
 assert [z['config']['zoneId'] for z in a['zones']['zones']]==['AGZONE']
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=parsed.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Tổng quan IoT',exact=True).click()
 expect(page.get_by_role('heading',name='Tổng quan IoT',exact=True)).to_be_visible();expect(page.get_by_role('article',name='Cảnh báo đang mở',exact=True)).to_contain_text('3')
 soil=page.get_by_role('article',name='Node AGSOIL',exact=True);expect(soil).to_contain_text('SOIL1 · Độ ẩm đất: 0 %');expect(soil).to_contain_text('Mô phỏng (thiết bị khai báo)')
 alerts=page.get_by_role('region',name='Cảnh báo đất và nước',exact=True);expect(alerts).to_contain_text('Hiển thị 3/3');expect(alerts).to_contain_text('Đã xem, vẫn đang mở')
 zone=page.get_by_role('region',name='Khảo sát vùng tưới',exact=True)
 if phase=='fresh':expect(soil).to_contain_text('3/3 kênh có dữ liệu mới');expect(zone).to_contain_text('2/3 điểm khô')
 else:expect(soil).to_contain_text('0/3 kênh có dữ liệu mới');expect(zone).to_contain_text('Chưa đủ dữ liệu để khảo sát');expect(zone).not_to_contain_text('2/3 điểm khô')
 page.screenshot(path='/tmp/agriculture-overview-'+phase+'.png',full_page=True,animations='disabled')
 page.get_by_role('button',name='Mở Trung tâm Cảnh báo',exact=True).click();page.get_by_role('button',name='Đất nhiều điểm',exact=True).click();expect(page.get_by_role('heading',name='Cảnh báo đất nhiều điểm',exact=True)).to_be_visible()
 page.get_by_role('button',name='Tổng quan IoT',exact=True).click();page.get_by_role('button',name='Mở Sensor Realtime để quản lý node và vùng',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click();page.get_by_role('button',name='Vùng tưới',exact=True).click();expect(page.get_by_role('article',name='Vùng AGZONE',exact=True)).to_be_visible()
 assert not errors,errors;assert not writes,writes;assert not external,external
 browser.close();print('PASS agriculture overview '+phase+': full-app/real API/PostgreSQL, GET-only navigation, disabled MQTT/control; no AWS/Wokwi')
