# Bàn giao An toàn Fail-Safe & Edge — 14/10/2026

Nền 814f0a4, nhánh feat/day1-iot-foundation. Đợt này thay trang safety dùng
failsafeRules/iotDevices/OTA timer mẫu bằng dữ liệu thật từ backend/PostgreSQL.
Không sửa logic control/rule, firmware, IAM, dependency hoặc migration V11.
Không đọc secrets, chạy provisioning, bật rule hay gửi lệnh AWS.

## Thay đổi

- SafetyOverview/SafetyController: GET /api/v1/safety, snapshot DB read-only
  REPEATABLE_READ; MQTT runtime tách riêng. Đọc ENV01 latest, PUMP01 status,
  rule/settings, queue, tối đa 10 lệnh cần đối chiếu và 50 stateHistory.
- Queue đếm mọi PENDING/SENT/PUBLISH_UNCERTAIN, overdue khi expires_at < asOf-5s.
  Recent problems gồm FAILED/TIMED_OUT/PUBLISH_UNCERTAIN và pending/sent overdue.
  Không gọi PumpService.commands() vì nó expire DB. Không retry/publish/hold rule.
- SafetyAndEdge xuất SafetyPanel có thể kiểm thử độc lập. Tải 3s, abort 5s,
  timer UI 1s, kiểm tra schema trước render. Cả sensor và relay dùng freshness15s.
  Trạng thái mới tách bản báo đã lưu, mất API không giữ khẳng định kết nối/khóa.
  Snapshot runtime quá10s không được coi mới; response cũ không ghi đè refresh.
- Hiển thị stateReason gốc, source/receipt times, unknown reason cho legacy,
  kết quả rule/cấu hình V11, active command và deadline nghỉ hiện có.
- Bỏ OTA completion giả, gateway/flash/rule counts và bảo vệ dry-run mẫu khỏi
  trang này. Ba nút liên quan chỉ navigate sang Control/Automation/Events.
- Không sửa shell/topbar hoặc các module còn prototype ngoài trang safety.
- Thêm npm test:safety, fixture server4181, browser/unit/backend tests, smoke.
  package-lock giữ nguyên vì chỉ thêm npm script, không dependency.
- Viết chương18, thêm mục lục/dàn ý, journal/acceptance/runbook và backend README.

## Kiểm tra thực hiện

| Kiểm tra | Kết quả |
|---|---|
| Maven verify toàn bộ backend | 78/78, failure/error/skip=0 |
| SafetyOverviewTest trong tổng trên | 6 integration/API tests với PostgreSQL |
| npm run test:safety | 9/9 Chromium API fixtures |
| Node safety/settings/overview/monitoring/telemetry units | 14/14, không skip |
| npm run lint/build | Đạt |
| tools/frontend/smoke_safety.py | Đạt App/menu/proxy/Spring/PostgreSQL, chỉ GET |
| Đối chiếu DB sau smoke | ON vẫn PUBLISH_UNCERTAIN, run vẫn STOP_UNCONFIRMED và active command còn nguyên |
| Liên kết tài liệu nội bộ và git diff --check | Đạt |

Backend tests: API trống không giả OFF; timestamps/reason nguồn giữ nguyên;
GET không expire/pause/dispatch và đếm ngoài20 dòng; preview10 độc lập tổng12;
đọc settings/cooldown hiện tại; history50 đúng thứ tự, reason cũ null. @AfterEach
xác nhận mock transport không publish. Test transport giả không phải AWS live.

Browser tests: fresh/current và không OTA, stale ON/lockout, empty, queue so
preview và mã lỗi CLOCK_SKEW, outage/recovery, age15s không có response mới,
response cũ sau refresh, body sai và ba navigation không API write. Unit kiểm
tra freshness source/receipt, validation/identity/counts và thiếu dữ liệu.
Các suites browser automation/events/monitoring/dashboard trước không chạy lại
vì source của chúng không đổi. Toàn bộ backend có regression được chạy lại.

Môi trường: JDK21/Maven wrapper/proxy settings có sẵn, DB smartfarm-cloud-test
loopback55439, user/database smartfarm_test. Integration telemetry_test, smoke
safety_smoke. Không đụng database demo5433. Frontend3000, backend8080 MQTT/control
false. Seed safety_smoke: sensor đất28% đã cũ; relay OFF/locked CONNECTION_LOST
đã cũ, history ON rồi OFF; ON PUBLISH_UNCERTAIN, OFF FAILED/CLOCK_SKEW; rule tắt
với active_command của ON và result STOP_UNCONFIRMED, settings mặc định V11.
Seed chỉ mô phỏng sự cố, không lấy từ AWS/người dùng.

Smoke mở App → Safety → Event Log, guard chặn external origin và API không GET,
không có pageerror. Screenshot local đã được xem để kiểm tra bố cục. Không
đưa ảnh/file chứa credentials vào repository. Script cần seed tương ứng, không
chạy assertions này trên dữ liệu demo tùy ý rồi kết luận lỗi ứng dụng.

Lệnh browser: `CHROMIUM_PATH=/usr/bin/chromium npm run test:safety`.
Lệnh units:

```bash
node --import tsx --test src/modules/iot/safety/safetyApi.test.ts src/modules/iot/automation/wateringSettings.test.ts src/modules/iot/dashboard/overviewApi.test.ts src/modules/iot/devices/monitoringApi.test.ts src/modules/iot/realtime/telemetryApi.test.ts
```

Cảnh báo Vite __dirname và bundle lớn vẫn tồn tại. Backend startup/HTTP kiểm tra
trực tiếp; không coi PID hoặc port mở là đủ. Hướng dẫn cloud start_skill lưu dạng
nháp, cập nhật API/test safety và số78; lưu draft chưa publish môi trường.

## Windows

1. Dừng backend cũ; `git pull --ff-only origin feat/day1-iot-foundation`.
2. Giữ PostgreSQL demo; mở Git Bash mới tại gốc repository, tránh biến DB test.
3. Chạy helper backend với chế độ điều khiển LED như trước:
   `SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh`.
4. Refresh frontend, IoT → An toàn Fail-Safe & Edge. Đối chiếu trạng thái với
   Actuator và history; trang chỉ đọc, không cần gửi command để thử hiển thị.
5. Nếu muốn nghiệm thu mất mạng, ghi serial/status trước và sau reconnect;
   không coi restart simulator là bằng chứng phục hồi trạng thái/NVS.

Không đổi IAM, tạo certificate, build firmware hoặc migration mới cho trang này.
Chưa nghiệm thu trang safety với AWS/Wokwi live của người dùng hoặc GPIO vật lý.
Không xác minh firmware thực nạp, sensor dòng/nước, chống chạy khô, OTA, NVS,
đăng nhập/phân quyền hoặc điều phối nhiều backend. Lý do CONNECTION_LOST có thể
chỉ được lưu sau reconnect; thiếu sự kiện không chứng minh chưa từng mất mạng.
