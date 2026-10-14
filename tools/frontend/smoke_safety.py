"""Read-only full-app smoke against the dedicated safety_smoke test schema.
Seed: stale OFF/locked CONNECTION_LOST, pending-uncertain ON, failed OFF,
active tracked run STOP_UNCONFIRMED. MQTT and control must be disabled.
Never run these fixture assertions against a user/demo database.
"""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1380,'height':1200});errors=[];writes=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request
        if urlparse(request.url).netloc!=origin:route.abort();return
        if '/api/' in request.url and request.method!='GET':writes.append(request.url);route.abort();return
        route.continue_()
    page.route('**/*',guard);page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
    page.get_by_role('button',name='An toàn Fail-Safe & Edge',exact=True).click()
    expect(page.get_by_role('heading',name='An toàn Fail-Safe & Edge',exact=True)).to_be_visible()
    expect(page.get_by_role('status')).to_have_text('Backend chưa bật MQTT')
    relay=page.get_by_role('region',name='Relay và khóa an toàn',exact=True)
    expect(relay).to_contain_text('Trạng thái hiện tại: Chưa xác định')
    expect(relay).to_contain_text('Khóa an toàn hiện tại: Chưa xác định')
    expect(relay).to_contain_text('Bản báo đã lưu: OFF · Khóa: Có')
    expect(relay).to_contain_text('Lý do thiết bị báo: Mất kết nối')
    expect(page.get_by_role('region',name='Quy tắc và lệnh đang theo dõi')).to_contain_text('Chưa xác nhận tắt')
    expect(page.get_by_role('region',name='Quy tắc và lệnh đang theo dõi')).to_contain_text('Lệnh chưa rõ kết quả đã lưu: 1 · Đã quá hạn đối chiếu: 1')
    expect(page.get_by_role('region',name='Lệnh cần đối chiếu').get_by_role('article')).to_have_count(2)
    expect(page.get_by_role('region',name='Lệnh cần đối chiếu')).to_contain_text('CLOCK_SKEW')
    expect(page.get_by_role('region',name='Lịch sử relay')).to_contain_text('Mất kết nối')
    page.screenshot(path='/tmp/safety-panel.png',full_page=True)
    page.get_by_role('button',name='Mở Nhật ký sự kiện',exact=True).click()
    expect(page.get_by_role('heading',name='Nhật ký sự kiện IoT',exact=True)).to_be_visible()
    assert not errors,errors
    assert not writes,writes
    browser.close();print('PASS safety full app: menu -> Safety -> Event Log, real API/PostgreSQL; GET only, MQTT/control disabled')
