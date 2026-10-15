"""Full-app local PostgreSQL preview only; phase restart must follow an actual backend restart."""
import json,os,shutil,sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base)
assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
phase=sys.argv[1] if len(sys.argv)==2 else '';assert phase in ('prepare','restart','inspect')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=b.new_page(viewport={'width':1450,'height':1100});errors=[];writes=[];external=[]
 safety=page.request.get(base+'/api/v1/safety');assert safety.ok and not safety.json()['controlEnabled'] and safety.json()['mqtt']['state']=='DISABLED'
 valve=page.request.get(base+'/api/v1/irrigation-demo');assert valve.ok and not valve.json()['demoEnabled'] and not valve.json()['connected']
 zones=page.request.get(base+'/api/v1/irrigation-zones');assert zones.ok and {z['config']['zoneId'] for z in zones.json()['zones']}=={'QDEMO01','QDEMO02'},'Exact dedicated fixture required'
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':
   assert phase!='inspect' and urlparse(r.url).path.startswith('/api/v1/irrigation-queue/requests'),r.url
   writes.append(r.url)
  route.continue_()
 page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',guard)
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Mở hàng chờ tưới diễn tập',exact=True).click()
 expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible()
 def snapshot():
  r=page.request.get(base+'/api/v1/irrigation-queue');assert r.ok;return r.json()
 if phase=='prepare':
  s=snapshot();assert s['mode']=='PREVIEW_ONLY' and not s['waiting'] and not s['history'] and s['active'] is None,'Refuse reseeding/repeating prepare'
  for zone,duration in [('QDEMO01',1),('QDEMO02',30),('QDEMO01',30)]:
   page.get_by_label('Vùng cho hàng chờ',exact=True).select_option(zone);page.get_by_label('Thời gian diễn tập',exact=True).fill(str(duration));page.get_by_role('button',name='Thêm lượt chờ',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu: Đang chờ');expect(page.get_by_role('button',name='Thêm lượt chờ',exact=True)).to_be_enabled()
  s=snapshot();ids=[x['requestId'] for x in s['waiting']];assert len(ids)==3
  page.get_by_role('button',name='Diễn tập lượt đầu hàng',exact=True).click();expect(page.get_by_role('heading',name='Đang chờ · 2',exact=True)).to_be_visible();expect(page.get_by_text('Đã diễn tập',exact=True)).to_be_visible(timeout=8000)
  assert snapshot()['active'] is None
  page.get_by_role('button',name='Diễn tập lượt đầu hàng',exact=True).click();expect(page.get_by_role('heading',name='Đang chờ · 1',exact=True)).to_be_visible();s=snapshot();assert s['active']['requestId']==ids[1] and s['active']['state']=='REHEARSING'
  Path('/tmp/queue-smoke-ids.json').write_text(json.dumps(ids));assert len(writes)==5
  print('PASS full-app FIFO: three explicit enqueues, first finished, second rehearsing, third still queued. Restart backend now; no device writes.')
 elif phase=='restart':
  ids=json.loads(Path('/tmp/queue-smoke-ids.json').read_text());s=snapshot();assert s['active'] is None
  results={x['requestId']:x for x in s['history']};assert results[ids[0]]['state']=='REHEARSED';assert results[ids[1]]['state']=='INTERRUPTED' and results[ids[1]]['reason']=='BACKEND_RESTARTED';assert [x['requestId'] for x in s['waiting']]==[ids[2]]
  expect(page.get_by_text('Backend khởi động lại; không tiếp tục lượt cũ.',exact=True)).to_be_visible();ticket=s['waiting'][0]['ticket'];page.get_by_role('button',name='Hủy lượt #'+str(ticket),exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu: Đã hủy');s=snapshot();assert not s['waiting'] and s['active'] is None;assert len(writes)==1
  page.screenshot(path='/tmp/irrigation-queue-full-app.png',full_page=True,animations='disabled');page.get_by_role('button',name='Quay lại điều khiển',exact=True).click();expect(page.get_by_role('heading',name='Điều khiển PUMP01',exact=True)).to_be_visible();print('PASS full-app real backend restart: retained history, active interrupted, no resume, cancel waiting, navigation back.')
 else:
  s=snapshot();assert s['active'] is None and not s['waiting'];assert len(s['history'])>=3 and {x['state'] for x in s['history']}=={'REHEARSED','INTERRUPTED','CANCELLED'}
  expect(page.get_by_text('Backend khởi động lại; không tiếp tục lượt cũ.',exact=True).first).to_be_visible();expect(page.get_by_role('button',name='Diễn tập lượt đầu hàng',exact=True)).to_be_disabled();assert not writes
  page.screenshot(path='/tmp/irrigation-queue-full-app.png',full_page=True,animations='disabled');page.get_by_role('button',name='Quay lại điều khiển',exact=True).click();expect(page.get_by_role('heading',name='Điều khiển PUMP01',exact=True)).to_be_visible();print('PASS retained full-app inspection: history persisted, no device or queue writes, navigation back.')
 assert not errors,errors;assert not external,external;b.close()
