"""Read-only full-app water volume on retained agriculture_overview_smoke fixture.
AGWATER has two historical SIMULATOR FLOW=0 packets, no new receive/seed/AWS.
"""
import os,shutil
from datetime import datetime,timedelta
from urllib.parse import urlparse,urlencode
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');parsed=urlparse(base);assert parsed.scheme=='http' and parsed.hostname=='127.0.0.1' and parsed.port==3000
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1500,'height':1100},timezone_id='Asia/Ho_Chi_Minh');errors=[];writes=[];external=[]
 r=page.request.get(base+'/api/v1/safety');assert r.ok;s=r.json();assert s['mqtt']['state']=='DISABLED' and not s['controlEnabled']
 r=page.request.get(base+'/api/v1/nodes/AGWATER');assert r.ok;n=r.json();assert n['name']=='Bồn tổng quan fixture' and n['nodeType']=='WATER'
 flow=next(c for c in n['channels'] if c['channelId']=='FLOW');assert flow['latest']['value']==0 and flow['latest']['dataSource']=='SIMULATOR'
 at=datetime.fromisoformat(flow['latest']['observedAt'].replace('Z','+00:00'));start=at.replace(microsecond=0)-timedelta(seconds=3);end=at.replace(microsecond=0)+timedelta(seconds=2)
 q={'from':start.isoformat(),'to':end.isoformat(),'dataSource':'SIMULATOR'};url=base+'/api/v1/nodes/AGWATER/channels/FLOW/water-volume?'+urlencode(q)
 r=page.request.get(url);assert r.ok;report=r.json();assert report['estimatedLitres']==0 and report['packetCount']==2 and report['acceptedIntervals']==1 and report['coveredSeconds']==1 and report['uncoveredSeconds']==4
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=parsed.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Tiêu thụ Nước & Điện',exact=True).click()
 expect(page.get_by_role('heading',name='Tiêu thụ Nước & Điện',exact=True)).to_be_visible()
 def local(dt):return (dt+timedelta(hours=7)).strftime('%Y-%m-%dT%H:%M:%S')
 page.get_by_label('Lượng nước từ',exact=True).fill(local(start));page.get_by_label('Lượng nước đến',exact=True).fill(local(end));page.get_by_role('button',name='Tính lượng nước',exact=True).click()
 result=page.get_by_role('region',name='Kết quả lượng nước',exact=True);expect(result).to_contain_text('Ước tính trong các đoạn hợp lệ: 0 lít');expect(result).to_contain_text('Độ phủ: 1 giây (20%)');expect(result).to_contain_text('chưa khai báo');page.screenshot(path='/tmp/water-volume-full-app.png',full_page=True,animations='disabled')
 page.get_by_label('Nguồn lượng nước',exact=True).select_option('PHYSICAL');expect(result).to_have_count(0);page.get_by_role('button',name='Tính lượng nước',exact=True).click();expect(result).to_contain_text('Chưa đủ khoảng đo hợp lệ');expect(result).to_contain_text('Mẫu khác nguồn đã chọn: 1');expect(result).not_to_contain_text('0 lít')
 page.get_by_role('button',name='Điện',exact=True).click();expect(page.get_by_role('heading',name='Chưa có dữ liệu đo điện',exact=True)).to_be_visible()
 assert not errors,errors;assert not writes,writes;assert not external,external
 browser.close();print('PASS full-app water volume: retained PostgreSQL history, canonical Java timestamps, timezone VN, measured0 vs absent-source, no mock kWh, GET-only, no AWS/Wokwi')
