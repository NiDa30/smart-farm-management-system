# Bàn giao cài đặt tưới V11 — 14/10/2026

Nền b9cc51b, nhánh feat/day1-iot-foundation. Đợt này thêm khả năng sửa quy tắc
ENV01 → PUMP01 trên giao diện. Không sửa IAM, firmware, dependency hoặc NVS;
không đọc secrets, chạy provisioning hay gửi lệnh AWS.

## Hành vi và file chính

- Migration V11 thêm dry_threshold/wet_threshold/duration_seconds/cooldown_seconds
  và settings_revision vào watering_rule. Mặc định 30/35/20/60, giữ hành vi cũ.
  watering_run có ảnh chụp nullable; lịch sử V10 không bị gán cấu hình phỏng đoán.
- WateringRule.saveSettings kiểm tra giới hạn và SQL compare-and-set revision:
  rule disabled, active_command null. Save reset chuỗi mẫu, giữ cooldown deadline.
  Khóa dùng chung với configure/tick/manual dispatch trong một process.
- GET/PUT /api/v1/automation/watering/settings tách khỏi PUT {enabled} hiện có.
  JSON dùng ObjectMapper strict của Spring: không nhận float/chuỗi thay integer.
  400 dữ liệu sai; 409 phiên bản đã đổi hoặc trạng thái rule/run không cho sửa.
- Tick dùng cấu hình đã lưu; khi tracking commit trước publish, run lưu kèm
  ngưỡng/thời gian/revision. Cả dispatch thất bại cũng ghi cấu hình đã thử.
  Finish chỉ bắt đầu khoảng nghỉ sau OFF được xác nhận như trước.
- AutomationManager/WateringSettingsEditor/wateringSettings: bốn trường số nguyên,
  polling không mất bản nháp, khóa sửa khi enabled/active run. Không bật rule khi
  còn bản nháp. Hai tab xung đột giữ bản nháp, cần tải lại từ backend.
- PUT mất phản hồi, 5xx hoặc body không hợp lệ không được coi thành công/auto retry.
  Nút Lưu và bật bị khóa cho đến khi tải lại đối chiếu. Phản hồi lưu hợp lệ phải
  khớp đủ trường và revision +1. GET cũ không ghi đè kết quả PUT mới.
- Cảnh báo cảm biến giữ ngưỡng riêng. Chỉ một rule/farm, chưa mở rộng nhiều thiết bị.
- Chương 17, chương 13, mục lục, runbook, acceptance, nhật ký và backend README
  được cập nhật; giữ các báo cáo LOCAL_CODEX/LOCAL_DOCS lịch sử.

## Kiểm tra

| Kiểm tra thực hiện trong đợt | Kết quả |
|---|---|
| Maven verify toàn bộ, PostgreSQL test riêng | 72/72, failure/error/skip=0 |
| WateringRuleTest trong tổng trên | 30 ca; tám ca mới settings/API/scheduler/migration |
| npm run test:automation, Chromium API fixtures | 24/24 |
| Node settings/overview/monitoring/telemetry | 11/11, không skip |
| npm run lint và npm run build | Đạt |
| smoke_watering_settings.py --phase save | Đạt App/menu/proxy/API/PostgreSQL; lưu 25/40/12/120, mở lại |
| Restart backend rồi smoke --phase read | Đạt; cấu hình còn nguyên, rule tắt |
| smoke_automation.py | Đạt full-app navigation với rule/settings API fixtures, không phải MQTT live |
| git diff --check và liên kết nội bộ sách | Đạt |

Tám backend tests mới bao gồm mặc định/lưu/API, dữ liệu ngoài giới hạn và JSON
không nguyên, stale revision 409, enabled/active run sau restart bị chặn, ngưỡng
mới chi phối ON-duration/OFF sớm, cooldown mới và run cũ bất biến, restart giữ
cấu hình nhưng rule tắt, V10 → V11 giữ run/boot/sequence và metadata cũ null.

Browser gồm 13 ca quy tắc cũ và 11 ca settings: bản nháp qua polling, lưu chờ
xác nhận, khóa enabled/active, validation, xung đột tab, 409 không bị che,
response bị mất, body sai/JSON hỏng/5xx, hiển thị metadata run mới/cũ. Đây là
API fixtures, không mô phỏng được toàn bộ mạng MQTT hay GPIO.

Maven dùng JDK21/wrapper và proxy settings riêng đã có trong /workspace/toolchains.
DB smartfarm-cloud-test cổng loopback 55439; integration chỉ schema telemetry_test.
Smoke dùng monitor_smoke trong DB test này, không chạm database demo cổng 5433.
MQTT/control đều false. Guard browser chỉ cho PUT settings trong phase save;
phase read chỉ GET. Không bật rule hay gửi command; không có pageerror.

Lệnh browser: `CHROMIUM_PATH=/usr/bin/chromium npm run test:automation`.
Lệnh unit:

```bash
node --import tsx --test src/modules/iot/automation/wateringSettings.test.ts src/modules/iot/dashboard/overviewApi.test.ts src/modules/iot/devices/monitoringApi.test.ts src/modules/iot/realtime/telemetryApi.test.ts
```

Các browser suites events/monitoring/dashboard trước đó không chạy lại trong
đợt này vì không đổi source của chúng. Toàn bộ backend regression đã chạy với
V11. Cảnh báo Vite __dirname và bundle >500 kB vẫn tồn tại, không làm fail build.

## Windows và nghiệm thu còn lại

1. Giữ dữ liệu/thay đổi local; pull feature branch bằng --ff-only sau push.
2. Ctrl+C backend cũ; mở Git Bash mới tránh biến DB test. PostgreSQL demo Healthy.
3. Từ gốc repo: `SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh`.
   Flyway tự áp dụng V11, không xóa volume. Frontend đang chạy có thể refresh.
4. IoT → Quy tắc Tự động hóa. Để rule tắt, chờ run cũ kết thúc, sửa và lưu cấu
   hình. Refresh/restart để kiểm tra giữ cấu hình. Không đổi IAM/build firmware.
5. Thử LED với cấu hình mới nếu cần, ghi mẫu/commandId/ACK/status/cooldown.
   Tắt rule và xác nhận OFF cuối thử. Giữ ngưỡng alert độc lập khi đối chiếu.

Chưa nghiệm thu AWS/Wokwi/GPIO với cấu hình mới; không đánh dấu từ các test trên.
Không có distributed scheduler, audit từng lần chỉnh cấu hình, NVS hay tự phục
hồi trạng thái ON sau restart. Runtime tự động tối đa 30 giây, cooldown tối thiểu
60 giây; thủ công vẫn theo tính năng riêng. Một deadline nghỉ đã có không ngắn
lại chỉ vì người dùng sửa cooldown.

Cấu hình cloud start_skill đã lưu dạng nháp với V11, 72 tests và suite settings;
không thay secret bindings/network policy. Lưu draft chưa publish môi trường.
