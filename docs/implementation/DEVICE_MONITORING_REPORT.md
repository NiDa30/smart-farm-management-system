# Bàn giao giám sát thiết bị — 14/10/2026

## Phạm vi

Nền070e37d, feature branch, working tree sạch trước đợt. Thay DeviceMonitor
mock bằng API/UI thật. Không làm heartbeat subscription mới, OTA, firmware,
NVS hoặc thay IAM. Phân biệt độ mới dữ liệu, hoạt động nhận bản tin và kết nối
MQTT backend; không suy luận chắc chắn online/offline vật lý.

## Thay đổi

- MqttHealth theo dõi lifecycle backend với AtomicReference và version kết
  nối. Subscription hoàn tất muộn không ghi đè ngắt kết nối mới; xử lý queue
  sau disconnect không coi là đã reconnect. Theo dõi lastProcessedAt riêng.
- TelemetryIngestion cập nhật health sau subscription, callback ngắt/nối lại,
  bản tin hợp lệ đã xử lý và shutdown. Topic/IAM/control flow giữ nguyên.
- GET /api/v1/monitoring tổng hợp registry/khu vực, telemetry, cảnh báo mở và
  pump_status. API không expire commands, đóng alerts hoặc gửi MQTT.
- lastMessageAt lấy MAX(received_at), khác receivedAt của số đo nguồn mới nhất.
  Bản tin cũ đến muộn tăng hoạt động nhận nhưng không thay số đo mới hơn.
- DeviceMonitor thật có tìm kiếm/khu vực/loại, xem chi tiết, dữ liệu mới/cũ/chưa
  có/lệch giờ. Ngưỡng sensor30s, relay15s; rule gate vẫn15s, không đổi.
- UI dựa vào server asOf + performance.now(), giữ dữ liệu cũ khi lỗi nhưng
  bỏ khẳng định kết nối hiện tại. Relay cũ hiển thị UNKNOWN, ON/OFF cũ chỉ là
  lần báo trước. Không có pin, OTA, firmware version giả hoặc thay config giả.
- Không migration mới, không thêm dependency. Thêm script test:monitoring và
  fixture browser4179 không có backend proxy, mọi API intercept và GET-only.

## Kiểm tra

| Kiểm tra | Kết quả / phạm vi |
|---|---|
| Maven verify cuối | 61/61, không fail/error/skip, PostgreSQL test riêng55439 |
| MqttHealthTest | 5 unit: lifecycle, disabled, queued message, phiên subscription cũ và boundary thời gian |
| DeviceMonitoringTest | 4 integration: unseen registry, alert/stale receipt, mẫu cũ đến muộn, stale pump và GET không expire command |
| npm run test:monitoring với Chromium hệ thống | 7/7 browser API fixtures |
| Node monitoringApi.test.ts + telemetryApi.test.ts | 6/6 unit đạt |
| npm run lint và npm run build | Đạt; Vite __dirname/bundle warnings vẫn có |
| Smoke toàn ứng dụng | Menu → proxy → Spring Boot → PostgreSQL monitor_smoke đạt; MQTT/control=false |

Test browser gồm registry/unseen, lọc, stale relay, MQTT disabled, API lỗi/phục
hồi, body sai và phản hồi cũ sau refresh. Lượt đầu fixture dùng exact text
cho cell có thêm timestamp nên selector không khớp; sửa locator theo text chứa,
không đổi assertion nghiệp vụ. Lượt cuối7/7 hoàn tất, không bỏ qua lỗi runner.

Container DB riêng smartfarm-cloud-test, cổng loopback55439; integration schema
telemetry_test. Không truncate schema demo hoặc đổi database người dùng.
Full-app smoke dùng monitor_smoke riêng, seed ENV01 soil28 với alert, PUMP01
ON cũ/khóa để chứng minh UI không gọi ON là trạng thái hiện tại. Script
smoke_monitoring.py chỉ dùng fixture đó, chặn request ngoài origin và API write.
Không chạy script với DB demo rồi coi thiếu fixture là lỗi ứng dụng.

Các tests automation/Event Log từ đợt trước không chạy lại vì UI nguồn không
đổi; bộ backend61 vẫn bao gồm các tests rule/control/Event Log hiện có.
Chưa có test MQTT SDK qua AWS thật; các callback health kiểm tra bằng unit,
không coi cloud smoke là xác nhận kết nối AWS của người dùng.

## File chính

- backend/src/main/java/vn/smartfarm/iot/monitoring/{MqttHealth,DeviceMonitoring,MonitoringController}.java
- backend/src/main/java/vn/smartfarm/iot/telemetry/TelemetryIngestion.java
- backend/src/test/java/vn/smartfarm/iot/monitoring/MqttHealthTest.java
- backend/src/test/java/vn/smartfarm/iot/telemetry/DeviceMonitoringTest.java
- src/modules/iot/devices/{DeviceMonitor.tsx,monitoringApi.ts,monitoringApi.test.ts}
- playwright.monitoring.config.ts, tools/tests/monitoring.browser.spec.ts,
  monitoring-fixture-server.mjs và fixtures/monitoring
- tools/frontend/smoke_monitoring.py, package.json
- Sách chương15, mục lục, acceptance và journal.

## Năm bước Windows

1. Pull feature branch sau khi cloud push, giữ thay đổi local; không reset/clean.
2. Restart backend trong Git Bash mới bằng helper hiện có; frontend npm run dev.
3. Mở IoT → Giám sát thiết bị, kiểm tra MQTT backend và thời điểm của ENV01.
4. Giữ Wokwi chạy, xem chi tiết sensor/relay và bộ lọc. Ngừng simulation để
   quan sát stale, không gọi đó là bằng chứng chắc chắn mất Wi-Fi/nguồn.
5. Khi backend tắt, UI phải báo lỗi backend; chạy lại thì cập nhật trở lại.
   Không cần sửa IAM hoặc build firmware. Không bật rule chỉ để thử màn giám sát.

## Giới hạn

Chưa theo dõi heartbeat/LWT của mọi sensor, không có alert OFFLINE mới. Không
đo CPU/pin/firmware version hoặc OTA. MQTT state không bền vững qua restart,
được tạo lại theo SDK. Chỉ phản ánh một backend process. Cần kiểm tra Windows
với dữ liệu AWS thật; không thay thế nghiệm thu automation hoặc bơm vật lý.
