"""GET-only full-app WATER history/CSV against retained water_alert_smoke fixtures.
No seed, MQTT, AWS or API writes. Requires 4 known WATERALARM packets from V16 smoke.
"""
import csv, io, os, shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1500,'height':1050});errors=[];writes=[]
 health=page.request.get(base+'/api/v1/safety').json();assert health['mqtt']['state']=='DISABLED' and not health['controlEnabled']
 alerts=page.request.get(base+'/api/v1/water-alerts').json();assert len(alerts)==1 and alerts[0]['nodeId']=='WATERALARM' and alerts[0]['clearedAt'] is not None
 evidence=alerts[0]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=origin:route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append((r.method,r.url));route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Sensor Realtime',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click()
 for channel in ['LOW','FLOW']:
  page.get_by_role('button',name=f'Lịch sử WATERALARM {channel}',exact=True).click()
  # Fixed fixture range derived from persisted public evidence, even after 24h.
  inputs=page.evaluate("""e=>[Date.parse(e.openedAt)-60000,Date.parse(e.clearedAt)+60000].map(ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16)})""",evidence)
  page.get_by_label('Lịch sử từ',exact=True).fill(inputs[0]);page.get_by_label('Lịch sử đến',exact=True).fill(inputs[1]);page.get_by_role('button',name='Áp dụng lịch sử',exact=True).click()
  table=page.get_by_role('table',name='Mẫu lịch sử kênh nước',exact=True);expect(table.get_by_role('row')).to_have_count(5)
  expect(table).to_contain_text('Mô phỏng (thiết bị khai báo)')
  if channel=='LOW':expect(table).to_contain_text('Không có nước');expect(table).to_contain_text('Có nước')
  else:expect(table).to_contain_text('0 L/min')
  page.get_by_label('Nguồn lịch sử').select_option('PHYSICAL');page.get_by_role('button',name='Áp dụng lịch sử',exact=True).click()
  expect(page.get_by_text('Không có mẫu khớp bộ lọc trong khoảng này.',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Xuất CSV trang này',exact=True)).to_be_disabled()
  page.get_by_label('Nguồn lịch sử').select_option('SIMULATOR');page.get_by_label('Chất lượng lịch sử').select_option('VALID');page.get_by_role('button',name='Áp dụng lịch sử',exact=True).click();expect(table.get_by_role('row')).to_have_count(5)
  with page.expect_download() as downloaded:page.get_by_role('button',name='Xuất CSV trang này',exact=True).click()
  target=f'/tmp/water-history-{channel}.csv';downloaded.value.save_as(target)
  with open(target,encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
  assert len(rows)==4 and all(r['node_id']=='WATERALARM' and r['channel_id']==channel and r['data_source']=='SIMULATOR' and r['quality']=='VALID' for r in rows)
  assert [int(r['sample_id']) for r in rows]==[4,3,2,1]
  if channel=='LOW':assert [r['value'] for r in rows]==['true','true','false','false']
  else:assert all(float(r['value'])==0 for r in rows)
  page.screenshot(path=f'/tmp/water-history-{channel}.png',full_page=True,animations='disabled')
  page.get_by_role('button',name='Quay lại Node & trạm nước',exact=True).click()
 assert not errors,errors;assert not writes,writes
 browser.close();print('PASS full-app water history LOW/FLOW, filters and CSV: retained PostgreSQL data, GET-only, MQTT/control disabled')
