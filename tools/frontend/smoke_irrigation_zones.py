"""Full-app zone create/edit/read against IrrigationZonesSmokeFixture only.
write allows exact two POSTs/one PUT; read is GET-only. No AWS/MQTT/commands.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['write','read'],required=True);phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');parsed=urlparse(base);assert parsed.scheme=='http' and parsed.hostname=='127.0.0.1' and parsed.port==3000
origin=parsed.netloc;endpoint='/api/v1/irrigation-zones'
def body(zone):return {'zoneId':f'ZONE_{zone}','name':f'Vùng thử {zone}','areaId':'AREA001','soilNodeId':f'ZONESOIL_{zone}','channelIds':['SOIL1','SOIL2','SOIL3'],'expectedSource':'SIMULATOR','dryThreshold':30,'wetThreshold':35}
expected=[('POST',endpoint,body('A')),('POST',endpoint,body('B')),('PUT',endpoint+'/ZONE_A',{**body('A'),'name':'Vùng thử đã sửa','dryThreshold':40,'wetThreshold':45,'revision':1})]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1500,'height':1100});errors=[];writes=[];external=[]
 response=page.request.get(base+'/api/v1/safety');assert response.ok;safety=response.json();assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled']
 for node_id in ['ZONESOIL_A','ZONESOIL_B']:
  response=page.request.get(base+'/api/v1/nodes/'+node_id);assert response.ok;n=response.json();assert n['name']=='Zone soil fixture '+node_id[-1] and n['nodeType']=='SOIL' and len(n['channels'])==3
 response=page.request.get(base+endpoint);assert response.ok;before=response.json();assert len(before['zones'])==(0 if phase=='write' else 2)
 page.on('pageerror',lambda e:errors.append(str(e)))
 def guard(route):
  r=route.request
  if urlparse(r.url).netloc!=origin:external.append(r.url);route.abort();return
  if '/api/' in r.url and r.method!='GET':
   candidate=(r.method,urlparse(r.url).path,r.post_data_json)
   if phase!='write' or len(writes)>=len(expected) or candidate!=expected[len(writes)]:writes.append(candidate);route.abort();return
   writes.append(candidate)
  route.continue_()
 page.route('**/*',guard);page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Sensor Realtime',exact=True).click();page.get_by_role('button',name='Node & trạm nước',exact=True).click();page.get_by_role('button',name='Vùng tưới',exact=True).click()
 if phase=='write':
  for zone in ['A','B']:
   page.get_by_role('button',name='Thêm vùng tưới',exact=True).click();page.get_by_label('Mã vùng',exact=True).fill('ZONE_'+zone);page.get_by_label('Tên vùng',exact=True).fill('Vùng thử '+zone);page.get_by_label('Node đất của vùng',exact=True).select_option('ZONESOIL_'+zone)
   for channel in ['SOIL1','SOIL2','SOIL3']:page.get_by_role('checkbox',name=channel,exact=True).check()
   page.get_by_role('button',name='Lưu vùng',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu vùng ZONE_'+zone)
   expect(page.get_by_label('Khảo sát ZONE_'+zone,exact=True)).to_contain_text('2/3 khô' if zone=='A' else '2/3 đủ ẩm')
  page.get_by_role('button',name='Sửa vùng ZONE_A',exact=True).click();page.get_by_label('Tên vùng',exact=True).fill('Vùng thử đã sửa');page.get_by_label('Ngưỡng khô (%)',exact=True).fill('40');page.get_by_label('Ngưỡng đủ ẩm (%)',exact=True).fill('45');page.get_by_role('button',name='Lưu vùng',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Đã lưu vùng ZONE_A');assert writes==expected
 else:assert not writes
 for zone,revision in [('A',2),('B',1)]:
  article=page.get_by_role('article',name='Vùng ZONE_'+zone,exact=True);expect(article).to_contain_text('Phiên bản '+str(revision));expect(article).to_contain_text('ZONESOIL_'+zone)
 expect(page.get_by_role('article',name='Vùng ZONE_A',exact=True)).to_contain_text('Vùng thử đã sửa')
 page.screenshot(path='/tmp/irrigation-zones-'+phase+'.png',full_page=True,animations='disabled');assert not errors,errors;assert not external,external
 browser.close();print('PASS full-app irrigation zones '+phase+': guarded local configuration only, PostgreSQL test, no actuator or AWS commands')
