"""Actual-app public ZIP and native-observation checks, GET only; no AWS or GPIO."""
import argparse,hashlib,json,os,re,shutil,sys,zipfile
from datetime import datetime,timezone
from pathlib import Path,PurePosixPath
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'aws'))
from render_irrigation_policies import policies
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['download','observed','stored'],required=True);parser.add_argument('--artifact-dir',default='/tmp/circuit-monitor-packages-final');args=parser.parse_args();phase=args.phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');u=urlparse(base);assert u.scheme=='http' and u.hostname=='127.0.0.1' and u.port==3000
output=Path(args.artifact_dir).resolve();assert output.is_relative_to('/tmp');output.mkdir(exist_ok=True);saved=Path('/tmp/circuit-package-observation-evidence.json')
expected_files={'src/main.cpp','include/ValveModel.h','include/ValveFeedback.h','include/ValveMonitor.h','include/ValvePacket.h','config/config.example.h','platformio.ini','diagram.json','wokwi.toml','data/.gitkeep','.gitignore','device-policy.json','backend-additional-identity-policy.json','README_VI.md','manifest.json'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1650,'height':1400},accept_downloads=True);writes=[];errors=[];external=[]
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 s=get('/api/v1/irrigation-circuits');assert s['mode']=='CONFIGURATION_ONLY' and not s['dispatchAvailable'] and s['valveMonitorEnabled'];assert len(s['circuits'])==2
 a=next(v for v in s['circuits'] if v['config']['circuitId']=='PKC1');b=next(v for v in s['circuits'] if v['config']['circuitId']=='PKC2');assert b['valveObservation'] is None and b['valveState']=='NOT_CONNECTED'
 safety=get('/api/v1/safety');assert safety['mqtt']['state']=='DISABLED' and not safety['controlEnabled'] and not get('/api/v1/irrigation-demo')['demoEnabled']
 if phase!='download':
  observation=a['valveObservation'];assert observation['controllerId']=='IRRIGATION06' and observation['actuatorId']=='VALVE06' and observation['monitorOnly'] and observation['gpioState']=='CLOSED';assert observation['positionFeedback']['state']=='CLOSED'
  evidence={'configs':[v['config'] for v in s['circuits']],'observation':observation};age=(datetime.now(timezone.utc)-datetime.fromisoformat(observation['observedAt'].replace('Z','+00:00'))).total_seconds()
  if phase=='observed':assert age<15 and a['valveState']=='CLOSED' and not saved.exists();saved.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
  else:assert age>=15 and a['valveState']=='STALE' and evidence==json.loads(saved.read_text()),'Restart must preserve per-valve observation and both clocks'
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!=u.netloc:external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.method+' '+req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base)
 page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click()
 expect(page.get_by_role('region',name='Gói Wokwi theo nhánh')).to_contain_text('GPIO giữ tắt')
 if phase in ['download','stored']:
  page.get_by_label('AWS Account ID cho gói Wokwi',exact=True).fill('123456789012')
  for view in (s['circuits'] if phase=='download' else [a]):
   c=view['config'];filename=f"FARM001-{c['circuitId']}-r{c['revision']}-{c['controllerId']}-{c['valveId']}-monitor.zip";target=output/filename if phase=='download' else output/'restart'/filename;target.parent.mkdir(exist_ok=True);assert phase=='stored' or not target.exists(),'Never overwrite a baseline artifact'
   with page.expect_download() as event:page.get_by_role('button',name='Tải gói Wokwi '+c['circuitId'],exact=True).click()
   download=event.value;assert download.suggested_filename==filename
   if not target.exists():download.save_as(target)
   # Repeated stored checks inspect the new browser temp download, retaining the
   # first saved archive and never touching device timestamps or the baseline.
   with zipfile.ZipFile(download.path()) as z:
    root=filename[:-4];names=z.namelist();assert len(names)==15 and set(names)=={root+'/'+x for x in expected_files};assert sum(i.file_size for i in z.infolist())<1048576
    assert all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts and '\\' not in n for n in names)
    manifest=json.loads(z.read(root+'/manifest.json'));assert manifest['profile']=='IRRIGATION_MONITOR_ONLY' and manifest['packageVersion']==1 and manifest['monitorOnly'] and not manifest['outputEnabled'] and not manifest['provisioned'];assert manifest['circuit']==c and manifest['accountId']=='123456789012' and manifest['region']=='ap-southeast-1'
    assert set(manifest['filesSha256'])==expected_files-{'manifest.json'}
    for name,digest in manifest['filesSha256'].items():assert hashlib.sha256(z.read(root+'/'+name)).hexdigest()==digest
    rendered=policies('ap-southeast-1','123456789012',c['controllerId'],c['valveId'],True);assert json.loads(z.read(root+'/device-policy.json'))==rendered['devicePolicy'];assert json.loads(z.read(root+'/backend-additional-identity-policy.json'))==rendered['backendAdditionalIdentityPolicy']
    config=z.read(root+'/config/config.example.h').decode();assert '#define IRRIGATION_AWS_ENDPOINT ""' in config and '#define IRRIGATION_WIFI_PASSWORD ""' in config
    for key,value in {'IRRIGATION_MONITOR_ONLY':'1','IRRIGATION_DEMO_ENABLED':'0','IRRIGATION_SIMULATOR':'1','IRRIGATION_POSITION_FEEDBACK_ENABLED':'1','IRRIGATION_CONTROLLER_ID':json.dumps(c['controllerId']),'IRRIGATION_VALVE_ID':json.dumps(c['valveId']),'IRRIGATION_CIRCUIT_ID':json.dumps(c['circuitId']),'IRRIGATION_CIRCUIT_REVISION':str(c['revision']),'IRRIGATION_ZONE_ID':json.dumps(c['zoneId']),'IRRIGATION_ZONE_REVISION':str(c['zoneRevision'])}.items():assert re.findall(r'^#define '+key+r' (.+)$',config,re.M)==[value]
    if phase=='download':assert not (output/root).exists();z.extractall(output)
    else:
     original=json.loads((output/root/'manifest.json').read_text());assert {k:v for k,v in manifest.items() if k not in ['generatedAt','filesSha256']}=={k:v for k,v in original.items() if k not in ['generatedAt','filesSha256']}
     assert {k:v for k,v in manifest['filesSha256'].items() if k!='README_VI.md'}=={k:v for k,v in original['filesSha256'].items() if k!='README_VI.md'},'Re-export may change generation time, never firmware/config/policy content'
 else:
  rows=page.get_by_role('region',name='Cấu hình nhánh tưới').locator('li');first=rows.filter(has=page.get_by_role('heading',name='Nhánh thử gói 1 · PKC1 · v1',exact=True));expect(first).to_contain_text('Phản hồi van đóng');expect(rows.filter(has=page.get_by_role('heading',name='Nhánh thử gói 2 · PKC2 · v1',exact=True))).to_contain_text('Chưa có kết nối van này')
 after=get('/api/v1/irrigation-circuits');assert [v['config'] for v in after['circuits']]==[v['config'] for v in s['circuits']];assert [v['valveObservation'] for v in after['circuits']]==[v['valveObservation'] for v in s['circuits']],'Downloading must not refresh device evidence'
 page.screenshot(path=f'/tmp/circuit-package-app-{phase}.png',full_page=True,animations='disabled');assert not writes,writes;assert not errors,errors;assert not external,external;browser.close()
 print('PASS actual-app monitor package '+phase+'; GET only, explicit public ZIP/config/policy checks; no provisioning/MQTT/AWS/GPIO')
