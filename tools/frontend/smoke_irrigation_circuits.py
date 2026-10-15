"""Opt-in local fixture only: configuration/rehearsal, then GET-only restart proof.

Requires a dedicated irrigation_circuit_smoke database schema and all live transports off.
Never run the create phase against a user's demo database; no reset/delete is provided.
"""
import argparse,json,os,shutil
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['create','stored'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base)
assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
evidence=Path('/tmp/irrigation-circuit-smoke.json')
if phase=='create':assert os.environ.get('SMARTFARM_CIRCUIT_SMOKE')=='LOCAL_FIXTURE_ONLY','Explicit local fixture opt-in required'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 page=browser.new_page(viewport={'width':1500,'height':1100});errors=[];writes=[];external=[]
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 def post(path,body):
  assert phase=='create' and path in ['/api/v1/nodes','/api/v1/nodes/soil','/api/v1/irrigation-zones']
  r=page.request.post(base+path,data=body);assert r.status==201,(path,r.status,r.text());return r.json()
 safety=get('/api/v1/safety');assert not safety['controlEnabled'] and safety['mqtt']['state']=='DISABLED'
 valve=get('/api/v1/irrigation-demo');assert not valve['demoEnabled'] and not valve['connected'] and not valve['commands']
 if phase=='create':
  assert not evidence.exists(),'Retained evidence already exists; do not reseed'
  assert not get('/api/v1/irrigation-circuits')['circuits']
  q=get('/api/v1/irrigation-queue');assert not q['waiting'] and not q['history'] and q['active'] is None
  post('/api/v1/nodes',{'nodeId':'CWATER01','name':'Trạm nước cấu hình thử','areaId':'AREA001','channels':[{'channelId':'LOW','metric':'WATER_PRESENT','unit':'boolean','calibrationVersion':None},{'channelId':'FLOW','metric':'FLOW_RATE','unit':'L/min','calibrationVersion':'SIM_V1'}]})
  for i in [1,2]:
   post('/api/v1/nodes/soil',{'nodeId':f'CSOIL0{i}','name':f'Đất thử {i}','areaId':'AREA001','channels':[{'channelId':f'SOIL{c}','metric':'SOIL_MOISTURE','unit':'%','calibrationVersion':None} for c in [1,2,3]]})
   post('/api/v1/irrigation-zones',{'zoneId':f'CZONE0{i}','name':f'Vùng thử {i}','areaId':'AREA001','soilNodeId':f'CSOIL0{i}','channelIds':['SOIL1','SOIL2','SOIL3'],'expectedSource':'SIMULATOR','dryThreshold':30,'wetThreshold':35})
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=u.netloc:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':
   writes.append((r.method,urlparse(r.url).path))
   allowed=phase=='create' and r.method=='POST' and (urlparse(r.url).path=='/api/v1/irrigation-circuits' or urlparse(r.url).path.startswith('/api/v1/irrigation-queue/requests'))
   if not allowed:route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click()
 expect(page.get_by_role('heading',name='Nhánh tưới theo vùng và trạm nước',exact=True)).to_be_visible()
 if phase=='create':
  for i in [1,2]:
   page.get_by_role('button',name='Thêm nhánh mới',exact=True).click()
   for label,value in [('Mã nhánh',f'CIRCUIT0{i}'),('Tên nhánh',f'Nhánh thử {i}'),('Mã controller dự kiến','IRRIGATION02'),('Mã van dự kiến',f'VALVE0{i+1}')]:page.get_by_label(label,exact=True).fill(value)
   for label,value in [('Vùng của nhánh',f'CZONE0{i}'),('Trạm nước của nhánh','CWATER01'),('Kênh phao của nhánh','LOW'),('Kênh lưu lượng của nhánh','FLOW')]:page.get_by_label(label,exact=True).select_option(value)
   page.get_by_role('button',name='Tạo nhánh',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu cấu hình nhánh')
 else:
  saved=json.loads(evidence.read_text());assert get('/api/v1/irrigation-circuits')['circuits']==saved['circuits']
 expect(page.get_by_text('Van:',exact=False)).to_have_count(2)
 page.screenshot(path=f'/tmp/irrigation-circuits-{phase}.png',full_page=True,animations='disabled')
 page.get_by_role('button',name='Mở hàng chờ diễn tập',exact=True).click()
 expect(page.get_by_role('heading',name='Hàng chờ tưới nhiều vùng',exact=True)).to_be_visible()
 if phase=='create':
  def enqueue(zone):
   page.get_by_label('Vùng cho hàng chờ',exact=True).select_option(zone);page.get_by_label('Thời gian diễn tập',exact=True).fill('30');page.get_by_role('button',name='Thêm lượt chờ',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu:')
  enqueue('CZONE01');q=get('/api/v1/irrigation-queue');page.get_by_role('button',name=f"Hủy lượt #{q['waiting'][0]['ticket']}",exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã hủy')
  enqueue('CZONE01');enqueue('CZONE02');page.get_by_role('button',name='Diễn tập lượt đầu hàng',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đang diễn tập')
  q=get('/api/v1/irrigation-queue');assert q['active'] and len(q['waiting'])==1 and len(q['history'])==1
  all_items=[q['active'],*q['waiting'],*q['history']]
  assert all(x['circuitSnapshot']['controllerId']=='IRRIGATION02' for x in all_items)
  evidence.write_text(json.dumps({'circuits':get('/api/v1/irrigation-circuits')['circuits'],'items':all_items,'activeId':q['active']['requestId']},ensure_ascii=False,indent=2))
 else:
  for old in saved['items']:
   current=get('/api/v1/irrigation-queue/requests/'+old['requestId']);assert current['circuitSnapshot']==old['circuitSnapshot']
   if old['requestId']==saved['activeId']:assert current['state']=='INTERRUPTED' and current['reason']=='BACKEND_RESTARTED'
   elif old['state']=='QUEUED' and current['state']=='EXPIRED':
    assert current['reason']=='WAIT_EXPIRED' and datetime.now(timezone.utc)>=datetime.fromisoformat(old['expiresAt'].replace('Z','+00:00'))
    assert datetime.fromisoformat(current['finishedAt'].replace('Z','+00:00'))>=datetime.fromisoformat(old['expiresAt'].replace('Z','+00:00'))
   else:assert current['state']==old['state']
  assert get('/api/v1/irrigation-queue')['active'] is None;assert not writes
 page.screenshot(path=f'/tmp/irrigation-circuit-queue-{phase}.png',full_page=True,animations='disabled')
 assert not errors,errors;assert not external,external
 assert all('/irrigation-circuits' in path or '/irrigation-queue/' in path for _,path in writes),writes
 browser.close();print(f'PASS actual app/PostgreSQL circuits {phase}; configuration only, no device requests')
