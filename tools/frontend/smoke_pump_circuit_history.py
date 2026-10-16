"""GET-only full-app/CSV proof of native history, with no replay or clock refresh."""
import json,os,shutil,csv,io
from pathlib import Path
from urllib.parse import urlparse,urlencode
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000';evidence=json.loads(Path('/tmp/pump-history-evidence.json').read_text());snapshot=evidence['history']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
 def guard(route):
  req=route.request
  if urlparse(req.url).netloc!='127.0.0.1:3000':external.append(req.url);route.abort();return
  if '/api/' in req.url and req.method!='GET':writes.append(req.url);route.abort();return
  route.continue_()
 page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
 def get(path):
  r=page.request.get(base+path);assert r.ok,(path,r.status);return r.json()
 q={'from':snapshot['from'],'to':snapshot['to'],'circuitId':'PC1','condition':'ALL','limit':50}
 data=get('/api/v1/pump-circuit-history?'+urlencode(q));assert data==snapshot,'Never rejuvenate historical data'
 ledger=get('/api/v1/pump-circuit-history/commands?'+urlencode(q));assert ledger['items']==evidence['ledger']['items'] and not ledger['hasMore']
 q['circuitId']='PC2';assert get('/api/v1/pump-circuit-history?'+urlencode(q))['items']==[]
 page.goto(base);page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click();page.get_by_role('button',name='Lịch sử bơm PC1',exact=True).click()
 expect(page.get_by_role('heading',name='Lịch sử bơm theo nhánh',exact=True)).to_be_visible();expect(page.get_by_text('Đã tải 3 bản tin.',exact=False)).to_be_visible();expect(page.get_by_text('Thiết bị ACK thực thi',exact=False)).to_be_visible()
 last=data['items'][0];page.get_by_role('button',name=f"Xem bản tin #{last['id']}",exact=True).click();detail=page.get_by_role('region',name='Chi tiết bản tin bơm');expect(detail).to_contain_text(last['observedAt']);expect(detail).to_contain_text(last['receivedAt']);expect(detail).to_contain_text(last['bootId']);expect(detail).to_contain_text('TIMER_EXPIRED')
 with page.expect_download() as event:page.get_by_role('button',name='CSV trạng thái đã tải',exact=True).click()
 text=event.value.path().read_text(encoding='utf-8-sig');rows=list(csv.DictReader(io.StringIO(text)));assert len(rows)==3 and rows[0]['observedAt']==last['observedAt'] and rows[0]['receivedAt']==last['receivedAt'] and [r['reportedState'] for r in rows]==['OFF','ON','OFF']
 with page.expect_download() as event:page.get_by_role('button',name='CSV lệnh đã tải',exact=True).click()
 rows=list(csv.DictReader(io.StringIO(event.value.path().read_text(encoding='utf-8-sig'))));assert len(rows)==1 and rows[0]['ledgerState']=='EXECUTED' and rows[0]['reportedStateInAck']=='ON'
 page.screenshot(path='/tmp/pump-history-full-app.png',full_page=True);page.get_by_role('button',name='Quay lại danh sách nhánh',exact=True).click();page.get_by_role('button',name='Lịch sử bơm PC2',exact=True).click();expect(page.get_by_text('Chưa có bản tin bơm theo bộ lọc.',exact=False)).to_be_visible()
 assert not writes and not external and not errors,(writes,external,errors);browser.close()
print('PASS full app selected route/history/source+receipt/details/CSV/status versus ACK/empty other branch; GET only')
