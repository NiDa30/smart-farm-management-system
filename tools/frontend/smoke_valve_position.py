"""Actual native-feedback fixture with physical dispatch disabled. No timestamp refresh."""
import argparse,os,shutil
from urllib.parse import urlparse
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['fresh','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=b.new_page(viewport={'width':1450,'height':1100});writes=[];errors=[];external=[]
 r=page.request.get(base+'/api/v1/irrigation-demo');assert r.ok;s=r.json()
 assert s['feedbackRequired'] and not s['demoEnabled'] and not s['connected'] and not s['readyToOpen'] and not s['commands']
 assert s['latest']['positionFeedback']=={'version':1,'enabled':True,'state':'CLOSED','fault':None}
 age=(datetime.now(timezone.utc)-datetime.fromisoformat(s['latest']['observedAt'].replace('Z','+00:00'))).total_seconds()
 assert (age<15 if phase=='fresh' else age>=15),'Fixture age must match phase, never refresh retained timestamp'
 r=page.request.get(base+'/api/v1/safety');assert r.ok and not r.json()['controlEnabled'] and r.json()['mqtt']['state']=='DISABLED'
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Mở controller van mô phỏng',exact=True).click()
 panel=page.get_by_role('region',name='Phản hồi vị trí van');expect(panel).to_contain_text('Backend yêu cầu công tắc hành trình: Có')
 expect(panel).to_contain_text('Đã chạm công tắc đóng' if phase=='fresh' else 'Chưa có dữ liệu mới')
 for name in ['Mở van có thời hạn','Đóng van']:expect(page.get_by_role('button',name=name,exact=True)).to_be_disabled()
 page.screenshot(path='/tmp/valve-position-'+phase+'.png',full_page=True,animations='disabled')
 page.get_by_role('button',name='Quay lại PUMP01',exact=True).click();expect(page.get_by_role('heading',name='Điều khiển PUMP01',exact=True)).to_be_visible()
 assert not writes,writes;assert not external,external;assert not errors,errors;b.close()
 print('PASS actual native/PostgreSQL position '+phase+'; GPIO distinct, no dispatch or external traffic')
