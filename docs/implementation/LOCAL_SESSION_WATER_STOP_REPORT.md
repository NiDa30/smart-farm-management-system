# Bàn giao — giám sát LOW và dừng phiên tưới V41

Ngày 17/10/2026, giờ Việt Nam. Nền 05c9fbb, nhánh feat/day1-iot-foundation.
[Chương55](../book/CHAPTER_55_SESSION_WATER_STOP.md).

## Thay đổi

- Policy stopOnUnavailable và flag SMARTFARM_IRRIGATION_WATER_STOP_ENABLED
  đều defaultfalse; chỉ chọn khi gate/session/profile đã bật. V40 không tự đổi.
- LOW false/missing/fault/stale/skew/source/calibration/config mismatch trong
  DISPATCHING_ON/WAIT_ON yêu cầu một OFF có identity/evidence trước IO.
- stopForWeather/stopForWater dùng chung claim/stop latch/guarded dispatch.
  Hai điều kiện đồng thời chỉ một event và OFF tự động tổng; nguồn giữ quyền
  trước lưu lý do của chính nó. Không ghi đè manual OFF hoặc replay/resume.
- History20 GET-only theo nhánh, join operation/command riêng, UI opt-in,
  disable clear mode, uncertain-save so khớp cả field mới.
- Không direct ON/ENV01 supervision, flow proof, auto CLOSE/FINISH, firmware/
  topic/IAM/cert mới. Backend/network down vẫn cần timer/edge interlock.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Full backend PostgreSQL | 615 đạt,23 mới,0 fail/error/skip |
| Targeted water/weather/session | 110 đạt |
| Browser nhánh/phiên/history | 91 đạt,7 mới |
| Browser node/vùng | 51 đạt |
| Browser pump | 17 đạt |
| Unit parser tổng nhóm node/history/gates/stops | 39 đạt,3 mới |
| Lint/build | Đạt; cảnh báo Vite __dirname/bundle cũ |
| Upgrade V40→V41 | 14 bảng cũ không đổi; field mới false, event0 |
| Real scheduler + native/template packet, fake IO | Một OFF có ACK/status, không auto CLOSE/ON |
| Full app/API/DB/restart | GET-only;14 bảng không đổi, RECOVERY session chỉ revision+1 |

Khởi đầu lint bắt lỗi tên parser sau bước tạo file mới; đã sửa trước build và
kiểm thử cuối. Không nới kiểm tra, bỏ ca hoặc sửa kết quả để nhận mẫu sai.
Log /tmp/session-water-stop-backend-full.log, -targeted.log, -browser.log,
-nodes-browser.log, -pump-browser.log, -units.log, -lint.log và -build.log.

## Runtime và evidence

DB test riêng smartfarm-cloud-test loopback55439 database/user smartfarm_test,
password rỗng chỉ local trust. Suite chỉ telemetry_test, không truncate demo
5433 hoặc fixture schemas. JDK/Maven settings/cache/trustStore giữ như đợt
trước; /tmp/run-weather-stop-tests.sh verify là wrapper đã chạy.

Fixture tools/fixtures/WaterSessionStopSmokeFixture.java biên dịch cùng
IrrigationSessionSmokeFixture.java vào/tmp, classpath target/classes và
/tmp/water-alert-smoke-libs/*. Schema water_stop_verified_smoke, MQTTfalse,
control/fence/route/circuit/session/water-stop=true, rain-stop/legacy/monitor=false
lúc thử. Scheduler100ms chỉ trong fixture; mặc định app1000ms. Không transport
thật, chỉ singleton fake đăng ký sau kiểm tra transport thật vắng mặt.
Native /tmp/water-admission-packet và /tmp/pump-route-packet đọc packet công
khai. Ca nhận WaterPacket seq1(true),seq2(false), native ACK/ON trước timer
logical và OFF template đúng UUID/ordinal.0firmware builds/physical IO mới.
Evidence /tmp/water-session-stop-evidence.json, log /tmp/water-session-stop-fixture.log. Không replay
helper hoặc sửa giờ để làm mới. PC1/PZONE1/PSOIL1/WATER01;2pump commands ON/OFF,
1valve OPEN,1water stop,1session WAIT_OFF trước startup,0watering_run.

Runtime8080 /tmp/start-session-water-stop-backend.py gọi
/tmp/run-session-water-stop-backend.sh, PID/log /tmp/session-water-stop-backend.pid/.log.
Khi phục vụ UI cloud mọi flag MQTT/control/fence/route/circuit-demo/session/
rain-stop/water-stop/legacy-demo/monitor=false. GET PC1/water-gate/stops:
workerEnabledfalse,1item evidenceEMPTY,RETURNED/EXECUTED; /safety MQTT DISABLED/
controlfalse; /PC1/session activeRECOVERY_REQUIRED/stopRequestedtrue.
Stop chỉ PID có đúng app JAR và schema. Startup đầu WAIT_OFF→RECOVERY; restart
sau chỉ tăng revision+1,14 bảng khác trong15 bảng đối chiếu giữ nguyên:
/tmp/session-water-before-restart.json và -after-restart.json.

Schema water_gate_smoke được Flyway-only nâng V40→V41,14 bảng cũ so sánh bỏ
field stop_on_unavailable mới trên circuit_water_gate; false mặc định và
irrigation_water_stop0. /tmp/session-water-v40-before.json, -v41-after.json,
-v40-upgrade.log. Các fixture/evidence cũ nguyên vẹn, không reseed.

Frontend3000 proxy8080. Smoke GET-only trước/sau restart:
CHROMIUM_PATH=/usr/bin/chromium python tools/frontend/smoke_session_water_stop.py
Dùng Python cloud có Playwright, không day1-venv. Menu Điều khiển→Cấu hình
nhánh→Chốt nguồn nước PC1→Lịch sử dừng do nguồn nước. Evidence/ledger/worker
flagfalse/back navigation đúng; không API writes/external/JS errors.
Screenshot /tmp/session-water-stop-full-app.png. Artifact/tmp không tự publish
vào Git hoặc phục hồi ở task mới.

## Còn chờ

Sáu ca AWS/Wokwi chương55 **Chưa chạy**. Không AWS/MQTT broker/GPIO thật,
đọc secrets/PEM/config private hoặc cấp tài nguyên cloud. LOW không chứng minh
flow/phần trăm bồn; worker cần backend/mạng, không thay bảo vệ edge. A3 còn
flow proof xuyên controller, coordinator/multi-route/queue và nghiệm thu thật.

Đã kiểm tra 586 liên kết Markdown tương đối ngoài code trong docs/contracts:
không thiếu đích; git diff --check đạt. Lint/build cuối sau cập nhật chữ UI
ở /tmp/session-water-stop-lint-final.log và -build-final.log.
