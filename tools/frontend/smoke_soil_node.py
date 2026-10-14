"""GET-only full app SOIL inventory/history/CSV against SoilNodeSmokeFixture.
No seeding or API writes; all evidence is synthetic local receive, not AWS/Wokwi.
"""
import csv,os,shutil
from datetime import datetime,timedelta
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1500,'height':1100});errors=[];writes=[];external=[]
 safety=page.request.get(base+'/api/v1/safety');assert safety.ok
 health=safety.json();assert health['mqtt']['state']=='DISABLED' and not health['controlEnabled']
 response=page.request.get(base+'/api/v1/nodes/SOIL01');assert response.ok
 node=response.json();assert node['nodeType']=='SOIL';assert len(node['channels'])==3
 readings={c['channelId']:c['latest'] for c in node['channels']};assert readings['SOIL1']['value']==0 and readings['SOIL2']['value']==100 and readings['SOIL3']['value'] is None
 assert readings['SOIL2']['sequence']==1 and readings['SOIL1']['sequence']==3
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=origin:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append((r.method,r.url));route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Sensor Realtime',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click()
 expect(page.get_by_role('region',name='Node SOIL01',exact=True)).to_contain_text('Node đất nhiều điểm')
 expect(page.get_by_role('article',name='SOIL01 SOIL1',exact=True)).to_contain_text('0 %')
 expect(page.get_by_role('article',name='SOIL01 SOIL2',exact=True)).to_contain_text('Dữ liệu cũ')
 expect(page.get_by_role('article',name='SOIL01 SOIL3',exact=True)).to_contain_text('—')
 expect(page.get_by_label('Mức bồn SOIL01')).to_have_count(0)
 page.screenshot(path='/tmp/soil-node-inventory.png',full_page=True)
 page.get_by_role('button',name='Lịch sử SOIL01 SOIL1',exact=True).click()
 # Anchor to persisted sample time: this smoke remains valid after 24h too.
 observed=datetime.fromisoformat(readings['SOIL1']['observedAt'].replace('Z','+00:00'))
 bounds=page.evaluate("""times=>times.map(ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,19)})""",[(observed-timedelta(minutes=5)).timestamp()*1000,(observed+timedelta(minutes=1)).timestamp()*1000])
 page.get_by_label('Lịch sử từ',exact=True).fill(bounds[0]);page.get_by_label('Lịch sử đến',exact=True).fill(bounds[1]);page.get_by_role('button',name='Áp dụng lịch sử',exact=True).click()
 table=page.get_by_role('table',name='Mẫu lịch sử kênh đất',exact=True);expect(table.get_by_role('row')).to_have_count(4);expect(table).to_contain_text('Lỗi cảm biến');expect(table).to_contain_text('0 %')
 with page.expect_download() as downloaded:page.get_by_role('button',name='Xuất CSV trang này').click()
 assert downloaded.value.suggested_filename=='soil-history-SOIL01-SOIL1.csv';target='/tmp/soil-node-history.csv';downloaded.value.save_as(target)
 with open(target,encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
 assert len(rows)==3 and [r['quality'] for r in rows]==['VALID','SENSOR_FAULT','VALID']
 assert [r['value'] for r in rows]==['0','','0'];assert all(r['data_source']=='SIMULATOR' and r['channel_id']=='SOIL1' for r in rows)
 page.get_by_label('Nguồn lịch sử').select_option('PHYSICAL');page.get_by_role('button',name='Áp dụng lịch sử').click()
 expect(page.get_by_text('Không có mẫu khớp bộ lọc trong khoảng này.',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Xuất CSV trang này')).to_be_disabled()
 assert not errors,errors;assert not writes,writes;assert not external,external
 browser.close();print('PASS SOIL full-app navigation, independent points, history/filter/CSV; GET-only PostgreSQL fixture, no AWS/Wokwi evidence')
