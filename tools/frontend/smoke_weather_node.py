"""GET-only weather UI/history/CSV against retained native-packet fixture; no reseed or cloud IO."""
import csv, json, os, shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base='http://127.0.0.1:3000'
evidence=json.loads(Path('/tmp/weather-node-evidence.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!='127.0.0.1:3000':external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda x:errors.append(str(x)))
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 safety=get('/api/v1/safety');assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled']
 node=get('/api/v1/nodes/WEATHER01');assert node==evidence['node'];assert not node['actuators']
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
 page.get_by_role('button',name='Sensor Realtime',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click()
 expect(page.get_by_role('region',name='Node WEATHER01',exact=True)).to_contain_text('Node thời tiết')
 rain=page.get_by_role('article',name='WEATHER01 RAIN',exact=True)
 observed=datetime.fromisoformat(evidence['node']['channels'][1]['latest']['observedAt'].replace('Z','+00:00'))
 if (datetime.now(timezone.utc)-observed).total_seconds()>=30:expect(rain).to_contain_text('Chưa xác định')
 else:expect(rain).to_contain_text('Có mưa')
 expect(rain).not_to_contain_text('Có nước')
 expect(page.get_by_role('article',name='WEATHER01 LIGHT',exact=True)).to_contain_text('SIM_LUX_V1')
 page.screenshot(path='/tmp/weather-node-inventory.png',full_page=True)
 for channel,expected in [('RAIN',evidence['rain']),('LIGHT',evidence['light'])]:
  page.get_by_role('button',name='Lịch sử WEATHER01 '+channel,exact=True).click()
  bounds=page.evaluate("""times=>times.map(ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,19)})""",[(observed-timedelta(minutes=1)).timestamp()*1000,(observed+timedelta(minutes=1)).timestamp()*1000])
  page.get_by_label('Lịch sử từ',exact=True).fill(bounds[0]);page.get_by_label('Lịch sử đến',exact=True).fill(bounds[1]);page.get_by_role('button',name='Áp dụng lịch sử',exact=True).click()
  table=page.get_by_role('table',name='Mẫu lịch sử kênh thời tiết',exact=True);expect(table.get_by_role('row')).to_have_count(6);expect(table).to_contain_text('Lỗi cảm biến')
  if channel=='RAIN':expect(table).to_contain_text('Có mưa');expect(table).to_contain_text('Không mưa')
  else:expect(table).to_contain_text('0 lux');expect(table).to_contain_text('200.000 lux')
  with page.expect_download() as d:page.get_by_role('button',name='Xuất CSV trang này',exact=True).click()
  assert d.value.suggested_filename=='weather-history-WEATHER01-'+channel+'.csv'
  target='/tmp/weather-node-history-'+channel+'.csv';d.value.save_as(target)
  with open(target,encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
  assert len(rows)==5 and [int(r['sequence']) for r in rows]==[x['sequence'] for x in expected['items']]
  assert all(r['data_source']=='SIMULATOR' and r['channel_id']==channel for r in rows)
  assert any(r['quality']=='SENSOR_FAULT' and r['value']=='' for r in rows)
  if channel=='RAIN':assert {r['value'] for r in rows}=={'true','false',''}
  else:assert any(r['value']=='0' for r in rows)
  page.get_by_label('Nguồn lịch sử').select_option('PHYSICAL');page.get_by_role('button',name='Áp dụng lịch sử').click();expect(page.get_by_text('Không có mẫu khớp bộ lọc trong khoảng này.',exact=True)).to_be_visible()
  page.get_by_role('button',name='Quay lại danh sách node',exact=True).click()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS actual weather inventory/rain+light history/two CSVs/physical-source empty; GET-only, no external or page errors')
