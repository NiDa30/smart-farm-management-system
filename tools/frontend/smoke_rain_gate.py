"""GET-only real app/API/DB smoke against retained rain_gate_smoke; never freshens packets."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!='127.0.0.1:3000':external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda x:errors.append(str(x)))
 r=page.request.get(base+'/api/v1/irrigation-zones/RZONE01/weather');assert r.ok
 v=r.json();assert v['state']=='STALE' and not v['allowed'] and v['policy']['revision']==1
 assert v['sample']['value'] is True and v['sample']['dataSource']=='SIMULATOR'
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Sensor Realtime',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click();page.get_by_role('button',name='Vùng tưới',exact=True).click();page.get_by_role('button',name='Chốt mưa RZONE01',exact=True).click()
 expect(page.get_by_role('region',name='Chốt mưa RZONE01',exact=True)).to_be_visible();expect(page.get_by_label('Kết quả chốt mưa',exact=True)).to_have_text('Mẫu mưa đã cũ')
 expect(page.get_by_label('Node mưa',exact=True)).to_have_value('WEATHER01');expect(page.get_by_label('Kênh mưa',exact=True)).to_have_value('RAIN');expect(page.get_by_label('Bật chốt mưa cho vùng',exact=True)).to_be_checked()
 expect(page.get_by_role('button',name='Lưu chốt mưa',exact=True)).to_be_disabled();page.get_by_role('button',name='Làm mới chốt mưa',exact=True).click();expect(page.get_by_label('Kết quả chốt mưa',exact=True)).to_have_text('Mẫu mưa đã cũ')
 page.screenshot(path='/tmp/rain-gate-full-app.png',full_page=True)
 page.get_by_role('button',name='Quay lại vùng tưới',exact=True).click();expect(page.get_by_role('region',name='Quản lý vùng tưới',exact=True)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors)
 browser.close()
print('PASS full app rain mapping/stale gate/back navigation, GET-only, no external or page errors')
