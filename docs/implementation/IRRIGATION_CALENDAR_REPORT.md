# Bàn giao lịch tưới nông nghiệp V13 — 14/10/2026

Nền df0c923, feature branch. Theo yêu cầu ưu tiên chức năng nông nghiệp, thêm
khung giờ theo tuần cho rule đất khô ENV01 → PUMP01. Không tạo scheduler ON
thứ hai, không sửa firmware/IAM/TTL/max runtime hoặc gửi AWS command.

## Hành vi và file

- IrrigationCalendar + V13: ANY_TIME mặc định hoặc TIME_WINDOWS, zone cố định
  Asia/Ho_Chi_Minh, tối đa 8 windows gồm days ISO 1..7 và HH:mm. Kiểm tra đầy đủ,
  normalize ngày và chặn overlap, kể cả Sunday overnight → Monday. Cho adjacent.
- GET/PUT /api/v1/automation/watering/calendar trả Settings/View: asOf, withinWindow,
  current/next bounds UTC. ANY_TIME bounds null. Lưu dùng CAS revision + rule off,
  active run null dưới khóa WateringRule. Lưu lịch không enable/publish.
- WateringRule.tick gate hiện tại, gate từng timestamp nguồn và kiểm tra lại
  trước dispatch. Ngoài khung không ON/reset low_count; mẫu ngoài khung không
  tăng đếm. Trạng thái WAITING_SCHEDULE_SAMPLE tránh nhãn đất chưa khô sai.
- Run ra ngoài khung dùng sendStop hiện có, một OFF, chờ causal ACK/status OFF.
  Không thay thời hạn/hysteresis/cooldown/lockout/manual hold. Manual có chủ đích
  không bị calendar chặn nhưng vẫn qua toàn bộ kiểm tra PumpService.
- Run mới lưu calendar revision/mode/window bounds trước publish; legacy null.
  recordRun dùng chung và tránh nhân đôi run khi publish chưa rõ kết quả.
- CalendarEditor/calendarApi trong trang Automation: mode, tối đa 8 khung, chọn
  ngày, start/end, overnight note và preview giờ VN. Giữ draft, conflict/unknown
  response không tự retry, khóa bật khi chưa lưu. Global sending phối hợp với
  settings/enable để GET cũ không rollback PUT mới. Tải lại đọc xác nhận server.
- Nhãn ngoài khung/chờ mẫu cũng được thêm cho Dashboard và Safety. Không đổi
  cấu trúc API của hai trang này. Probe/firmware không sửa.
- Chương20, runbook/acceptance/journal, chương13/17 và backend README cập nhật.

## Kết quả cuối

| Kiểm tra | Kết quả |
|---|---|
| Maven verify toàn bộ | 103/103, failure/error/skip=0 |
| IrrigationCalendarTest | 6 pure unit: VN/time boundaries, overnight, next week, overlap, malformed, ANY_TIME |
| WateringRuleTest trong tổng trên | 39 ca, thêm9 integration cho calendar |
| npm run test:automation | 33/33 Chromium fixtures, gồm24 cũ và 9 calendar |
| Node calendar/alert/safety/settings/overview/monitoring/telemetry | 20/20, không skip |
| npm run lint/build | Đạt |
| smoke_irrigation_calendar.py --phase save/read sau restart | Đạt App/menu/proxy/API/PostgreSQL thật, rule/MQTT/control tắt |
| SQL so cấu hình trước/sau restart | Mode/zone/revision/windows giống hệt; command count0 |
| smoke_automation.py đã bổ sung calendar fixture | Đạt, không phải AWS live |
| git diff --check và liên kết tài liệu nội bộ | Đạt |

Chín integration kiểm tra outside không ON/reset count; inside tracking/snapshot;
đóng window chỉ OFF một lần/chờ bằng chứng OFF; enabled/active/stale revision
không sửa; reset streak/manual hold; API preview/400; upgrade V12 → V13; timestamp
nguồn nằm ngoài cửa sổ không được tính; manualON ngoài lịch vẫn pause auto.
Test mẫu nguồn dùng biên evaluate được kiểm soát, còn phép toán thời gian dùng
mã thật trong 6 unit cases. Không suy thành phép đo scheduler/GPIO vật lý.

Fixture static mock đầu tiên vô tình mock cả helper validation, tạo1 lỗi trong
lượt103. Đã thu hẹp mock vào evaluate, giữ mã validation và assertion, rerun
103/103 đạt. Rà soát sửa metadata lấy khung ngay trước dispatch ở sát biên và
nhãn chờ mẫu khi latest nằm trước khung. Không giảm assertion/skip để qua kiểm tra.

DB cloud smartfarm-cloud-test loopback 55439, user/database smartfarm_test.
Integration telemetry_test, smoke calendar_smoke rỗng lúc khởi tạo. Không đụng
DB demo 5433. Backend 8080 với MQTT/control=false; Vite 3000. Smoke chỉ cho một PUT
calendar, không bật rule, không tạo telemetry/pump status/command. Lịch đã lưu
Mon/Wed/Fri 05:30–05:45, browser timezone America/New_York; preview vẫn giờ VN.
Sau restart rule vẫn off, cấu hình giữ nguyên, không pageerror/command.

Các browser suites alerts/events/monitoring/dashboard/safety không chạy lại
trong đợt; source chính của chúng không đổi, chỉ thêm hai nhãn read-only cho
Dashboard/Safety. Backend regression bao gồm các module này. Cảnh báo Vite
__dirname/bundle lớn còn, không làm fail build.

## Windows và giới hạn

1. Dừng backend cũ, pull --ff-only origin feat/day1-iot-foundation.
2. Mở Git Bash mới tại repo, giữ PostgreSQL demo và tránh biến DB test.
3. SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh.
4. Flyway tự thêm V13; refresh → Quy tắc Tự động hóa → Lịch tưới theo tuần.
5. Rule tắt/no active run mới sửa. Chọn mode, ngày, khung giờ VN và lưu; lưu
   không bật rule. Khi muốn demo, bật rule có chủ đích với sensor/relay sẵn sàng.
6. Đất khô hai mẫu mới trong khung mới tưới. Trong khung có thể lặp nhiều đợt
   sau cooldown; không coi15 phút là runtime liên tục. Hết khung yêu cầuOFF,
   chờ status xác nhận. Tắt rule cuối thử.

Không đổi IAM hoặc build firmware. Backend cần chạy để đánh giá; sau restart
rule tạm dừng, không tự resume/tưới bù. Chưa có schedule lưu/chạy độc lập trên
ESP32, ngày lễ/monthly, per-area/multi-actuator, actor/audit lịch hoặc đo nước.
Một backend process, một rule. Thời điểm kết thúc là gate theo nhịp2s và mạng,
không deadline GPIO chính xác; firmware timer vẫn độc lập. Chưa nghiệm thu lịch
trên AWS/Wokwi live Windows hoặc bơm vật lý.

start_skill cloud lưu dạng nháp với V13/API/tests và ưu tiên nông nghiệp; chưa
publish cấu hình. Không thay network/secret bindings hoặc install_script.
