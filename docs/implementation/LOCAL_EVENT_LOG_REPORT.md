# Bàn giao Event Log — cloud tiếp quản 14/10/2026

## Phiên bản và phạm vi

Đồng bộ feature branch từ 943d22a đến commit người dùng push 3d8bcd9.
Working tree trước đồng bộ sạch. Giữ nguyên V10, firmware, cấu hình Wokwi,
package-lock và các file người dùng đã commit. Bản push chưa có Event Log thật;
đã thay mock tại `/iot/events`. Không thay đổi automation dispatch hoặc IAM.

## Thiết kế

- `GET /api/v1/events`: khoảng [from,to), mặc định 24h, tối đa 31 ngày;
  category ALERT/COMMAND/DEVICE/RULE; deviceId; limit 1..100 mặc định 50; cursor.
- Tổng hợp sensor_alert (open/clear), pump_command (create/ACK),
  pump_state_history và watering_run. Không migration mới, không backfill.
- Cursor timestamp+ID, SQL thứ tự giảm dần. Giữ from/to/filter khi tải tiếp;
  bản ghi cùng timestamp không mất/trùng. Lấy thêm1 để xác định nextCursor.
- Run/command chỉ liên kết qua foreign key đã lưu; nếu dữ liệu cũ có nhiều
  run cho một command thì chọn MIN(run.id), không suy đoán liên kết theo giờ.
- Alert chỉ có giờ nguồn; ACK chỉ có giờ backend nhận. Phần không lưu trả null.
  Trạng thái thiết bị có cả observed_at và received_at.
- API chỉ SELECT, không gọi PumpService.commands(), không expire pending hoặc
  dispatch. UI không dùng mock fallback; nguồn lỗi hiển thị lỗi rõ ràng.
- UI có bộ lọc, chi tiết, tải thêm và làm mới; hủy request cũ khi đổi lọc.
  Lỗi trang tiếp giữ dữ liệu đã tải. Không có automatic control khi mở nhật ký.

Đây là read model hiện tại, không phải append-only audit log. Kết quả command
và run hiển thị trạng thái hiện đang lưu, không tái dựng mọi lần chuyển trạng
thái. Không có source timestamp của ACK nếu schema chưa lưu. Cursor không tạo
snapshot xuyên nhiều HTTP request; ACK/alert đóng đến muộn có thể cần Làm mới.

## File chính

- backend/src/main/java/vn/smartfarm/iot/events/EventLog.java
- backend/src/main/java/vn/smartfarm/iot/events/EventController.java
- backend/src/test/java/vn/smartfarm/iot/telemetry/EventLogTest.java
- src/modules/iot/events/IoTEventLogger.tsx và eventApi.ts
- playwright.events.config.ts, tools/tests/events.browser.spec.ts,
  events-fixture-server.mjs và fixtures/events/{index.html,main.tsx}
- tools/frontend/smoke_events.py
- package.json: thêm script test:events, không thêm dependency runtime.
- playwright.automation.config.ts: CHROMIUM_PATH tùy chọn cho browser hệ thống;
  mặc định vẫn dùng Playwright cache trên Windows.
- Chương14, mục lục, ACCEPTANCE_STATUS, BUILD_JOURNAL, ghi chú xác nhận một phần
  trong WOKWI_AUTOMATION_TEST_LOG. Giữ báo cáo local cũ làm bằng chứng lịch sử.

## Môi trường và kiểm tra

Node24.19.0, JDK21.0.12.1, wrapper Maven, Chromium hệ thống. Database test là
container cloud riêng `smartfarm-cloud-test`, postgres:16-bookworm, host loopback
55439, DB/user smartfarm_test, trust auth chỉ cho môi trường test local. Không
đụng database demo 5433, không đọc credentials AWS hoặc files riêng.

Backend tests: schema telemetry_test; app smoke: schema event_smoke tách riêng.
Cả hai nằm trong container test, không dùng DB người dùng. Wrapper chạy với
maven settings proxy/trust riêng của máy cloud, không commit cấu hình đó.

| Kiểm tra cuối | Kết quả |
|---|---|
| Maven verify với SMARTFARM_TEST_DB_URL ở55439 | 52/52, failures/errors/skipped=0: 47 nền +5 Event Log |
| 5 Event Log integration tests | tổng hợp nguồn/thời gian/liên kết, cursor cùng timestamp, bộ lọc/range, HTTP400, GET không làm thay đổi command/rule |
| CHROMIUM_PATH=/usr/bin/chromium npm run test:automation | 13/13 đạt, API fixtures |
| CHROMIUM_PATH=/usr/bin/chromium npm run test:events | 7/7 đạt, API fixtures |
| node --import tsx --test src/modules/iot/realtime/telemetryApi.test.ts | 3/3 đạt, không skip |
| npm run lint và npm run build | Đạt; cảnh báo Vite __dirname và bundle lớn vẫn có |
| python tools/frontend/smoke_events.py | Đạt trên full app, API thật/DB seed test; MQTT/control=false |
| git diff --check và liên kết sách | Đạt; kiểm tra đích file, không kiểm tra nội dung website ngoài |

7 browser tests gồm hiển thị SENT/chi tiết/liên kết, lọc API, pagination,
empty/error/recovery, invalid body, lỗi tải trang tiếp và phản hồi bộ lọc cũ.
Fixture Vite cổng 4178 không có proxy backend, chặn request ngoài origin.
Automation fixtures 4177 cũng không đến API live. Không dùng tests để tuyên bố
GPIO/AWS đã chạy. Typecheck ban đầu tìm lỗi type nullable trong fixture; sửa
fixture dùng interface IoTEvent rồi chạy lại lint/browser thành công.

Full app smoke: backend thật trên 8080 với MQTT/control tắt; Vite 3000 có proxy.
Seed đúng 6 bản ghi nhật ký trong schema event_smoke: alert open+clear,
command create+ACK, state OFF và run. Đi từ menu IoT vào Event Log, lọc COMMAND,
xem chi tiết ACK. Script chặn API không phải GET và request ngoài origin.
Không có pageerror. Đây là kiểm tra UI/API/DB, không phải test với AWS/Wokwi.
Script có fixture assumptions cụ thể: DB phải chứa đúng 6 event nói trên,
commandId ab6cfc5e-18ff-4a01-852b-03604df6b52f. Không chạy script đó trên demo
và coi thiếu fixture là lỗi ứng dụng. Các bộ browser API fixtures không cần seed.

Khởi động lại backend từ jar cuối rồi chạy lại app smoke đạt. Backend và Vite
cloud giữ ở chế độ chỉ đọc phát triển; snapshot không giữ process. Hướng dẫn
start_skill đã lưu vào cloud environment draft; chưa phải publication.

## Chưa kiểm chứng

- Event Log với dữ liệu AWS/Windows live của người dùng.
- Toàn bộ các ca automation OFF sớm/cooldown/timer/manual/restart trên GPIO.
  Người dùng chỉ xác nhận bước bật tự động hoạt động, chưa có log đầy đủ.
- NVS, phục hồi mạng không reboot, nhiều backend instance, bơm vật lý.
- Hiệu năng trên lịch sử rất lớn hoặc nhất quán snapshot qua nhiều trang.

## Windows: tối đa 5 bước kiểm tra

1. Giữ thay đổi riêng; khi bản cloud được push, git pull --ff-only origin
   feat/day1-iot-foundation. Nếu Git báo có local changes xung đột, không reset.
2. Dừng/restart backend bằng Git Bash mới:
   SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
   Chỉ cần control flag nếu tiếp tục demo điều khiển. Event Log không cần flag.
3. Chạy frontend npm run dev và mở IoT → Nhật ký sự kiện Event Log.
4. Lọc Cảnh báo/ENV01 và Lệnh và ACK/PUMP01. Mở chi tiết; đối chiếu ID/thời gian
   với trang Actuator và Quy tắc Tự động hóa, không bật rule chỉ để có dữ liệu.
5. Kiểm tra Tải thêm nếu có, Làm mới, dữ liệu rỗng và lỗi backend. Không cần
   build firmware, sửa IAM hoặc migration mới. Tắt rule khi kết thúc demo.

## Tóm tắt

Cloud đã tiếp quản3d8bcd9, hoàn thiện Event Log chỉ đọc và viết tiếp chương14.
52 backend + 13 automation browser + 7 events browser + 3 telemetry tests đạt;
full-app smoke API/DB thật đạt, MQTT tắt. Chưa có nghiệm thu Event Log AWS live.
