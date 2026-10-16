# Bàn giao V42 — Giám sát FLOW trong phiên tưới

Ngày17/10/2026, giờ Việt Nam. Nhánh feat/day1-iot-foundation.

## Kết quả

Thêm giám sát lưu lượng tại trạm cho OPERATOR_STEPS, policy và flag mặc định
tắt. Trong Điều khiển Actuator → Cấu hình nhánh tưới có nút **Giám sát FLOW**
cho từng nhánh: calibration, minimumLpm, graceSeconds và lịch sử dừng.
Worker chỉ đánh giá phiên đã giữ ON/chưa stop; config sai có thể dừng ngay,
còn sample FLOW đánh giá sau grace. Mẫu phải đo và nhận sau server ON intent,
fresh<10s; LOW-only/duplicate/trạm khác không freshen FLOW. Session duration
phải dài hơn grace, không thay hard limit phiên1–10s/van30s.

Một OFF tự động chung với LOW/mưa, identity+evidence commit trước IO; manual
OFF đã yêu cầu chặn auto stop. Mất intent/transport/uncertain giữ ledger,
không retry/resume; callback muộn không thay stop mới. Không auto CLOSE hoặc
FINISH. FLOW tại trạm không chứng minh nước tới từng luống, không có
hysteresis hoặc bộ lọc nhiều mẫu. Chưa hardware dry-run protection.

## File chính

- backend: CircuitFlowGuard, CircuitFlowGuardController, FlowStopWorker,
  FlowStopHistory, IrrigationSession và migrationV42.
- frontend: CircuitFlowGuardPanel, FlowStopsPanel, flowGuardApi và nút trong
  IrrigationCircuitPanel. Water panels giải thích ba nguồn dùng chung claim.
- fixture: tools/fixtures/FlowSessionStopSmokeFixture.java,
  tools/frontend/smoke_session_flow_stop.py.
- Sách: [chương56](../book/CHAPTER_56_SESSION_FLOW_SUPERVISION.md), runbook,
  troubleshooting, trạng thái nghiệm thu, journal và roadmap đã cập nhật.

## Kiểm tra đã hoàn tất

| Kiểm tra | Kết quả |
| --- | --- |
| Maven verify toàn bộ, PostgreSQL schema telemetry_test | 643đạt,28mới;0fail/error/skip |
| Browser nhánh/phiên/history API fixtures | 98đạt,7mới;0fail/skip |
| Browser riêng FLOW sau chỉnh min của form | 7đạt; là recheck, không cộng thêm vào98 |
| Unit parser node/zone/rain/LOW/FLOW/history | 46đạt,7mới;0fail/skip |
| TypeScript lint và Vite build | Đạt; còn cảnh báo chunk lớn/__dirname cũ |
| Scheduler thật100ms + native packet + fake transport + DB | Một OFF/event, ACK/status; không auto CLOSE/ON |
| Flyway-only V41→V42 trên fixture LOW trước đó | 15bảng cũ không đổi; policy/event FLOW mới rỗng; migrate lần2 no-op |
| Full app Vite/backend/DB, GET-only trước/sau restart | Đạt, không write/external/JS error |
| Snapshot17bảng trước/sau restart | 16bảng không đổi; phiên RECOVERY chỉ revision+1; không thêm command/event |

Các lượt backend từng chạy chồng schema gây xung đột đã bị dừng/loại kết quả;
643 là một lượt verify tuần tự sau đó. Lượt grep browser ban đầu không tìm
thấy test do anchor regex ở đầu full title, không tính; đã sửa grep FLOW và
7test thực thi đạt. Không lấy zero-test làm bằng chứng.

## Môi trường và bằng chứng giữ lại

Test DB loopback55439/schema telemetry_test, không chạm volume demo5433.
Fixture mới flow_stop_verified_smoke; không reseed/refresh timestamp khi mở
lại. Native WaterPacket FLOW=0 được nhận sau ON; template native pump/valve
qua receiver thật, OFF transport giả. Có2pump command,1valve OPEN,1flow event,
1session; không watering_run. Main app runtime giữ toàn bộ MQTT/control/
fence/route/circuit/session/rain-stop/water-stop/flow-stop/legacy/monitor=false,
trình bày dữ liệu lịch sử và recovery, không giả live/safety.

Log trong /tmp: flow-stop-backend-full.log, flow-stop-browser.log,
flow-stop-browser-final.log, flow-stop-units-all.log, flow-stop-lint-final.log,
flow-stop-build-final.log, flow-session-stop-fixture.log,
flow-stop-full-app.log, flow-stop-full-app-after-restart.log,
flow-stop-v41-upgrade.log. Evidence JSON: flow-session-stop-evidence.json,
flow-upgrade-v41-before.json/flow-upgrade-v42-after.json,
flow-before-restart.json/flow-after-restart.json. Đây là artifact cloud hiện
tại, không phải tệp bí mật cần đưa lên Git hoặc bằng chứng restoration máy mới.

## Windows tiếp theo

Giữ DB/volume và private files. Pull nhánh, dừng backend cũ, restart bằng
profile LED theo nhánh/session đã dùng; thêm trong Git Bash terminal backend:

```bash
export SMARTFARM_IRRIGATION_FLOW_STOP_ENABLED=true
bash tools/backend/run_backend_windows.sh
```

Các flag control/fence/route/circuit/session vẫn cần bật đúng profile trước;
legacy demo=false. Chưa lưu policyenabled thì worker không có quyền mới.
Khép phiên, xác nhận idle → Giám sát FLOW → chọn ngưỡng và grace theo chu kỳ
telemetry/calibration thực tế → lưu. Với grace5s có thể chọn phiên10s để có
cửa sổ quan sát, không thay hard limit. Form gợi ý2L/phút chưa hiệu chuẩn.

Sáu ca AWS/Wokwi ở chương56 **Chưa chạy**. Chưa physical flow proof riêng
nhánh/luống, multi-sample/hysteresis, coordinator tự chuyển nhiều route,
queue dispatch, NVS acceptance hoặc production. Không chạy lệnh AWS/MQTT
thật, không đọc private key/config.local.h hoặc thay IAM/firmware/certificate.

Đã lưu hướng dẫn runtime V42 vào start_skill của environment draft, giữ nguyên
các cấu hình khác; cần Review/Save rồi Publish trong Environment settings.
Runtime hiện tại đã kiểm tra; chưa xác nhận restoration trong task mới.
Kiểm tra601liên kết Markdown tương đối không thiếu đích; git diff --check đạt.
