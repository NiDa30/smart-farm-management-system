# Bàn giao — chốt nguồn nước theo nhánh V40

Ngày 17/10/2026, giờ Việt Nam. Nền f2af41d, nhánh feat/day1-iot-foundation.
[Chương54](../book/CHAPTER_54_CIRCUIT_WATER_ADMISSION.md).

## Thay đổi

- Policy opt-in circuit_water_gate, circuitRevision/calibration/enabled/revision;
  binding theo waterNodeId/lowChannelId và source có sẵn trong nhánh.
- WATER/v2/WATER_PRESENT boolean đúng nguồn/hiệu chuẩn, cả hai clock<30s mới
  qua nếu true. Missing/fault/stale/skew/mismatch/false/config drift chặn.
- Session create/OPEN và pump proof ON kiểm tra; ON reservation kiểm tra lại,
  lưu View trong pump_command.water_gate. WEATHER evidence field giữ riêng.
- Ingest WATER/WEATHER và reservation cùng gate, không giữ lock qua network.
  Generic/legacy ON không vượt enabled policy. Duplicate không replay/đổi
  bằng chứng; OFF độc lập, RESET giữ proof reset hiện có.
- UI Chốt nguồn nước trong Cấu hình nhánh, metadata/giờ gốc, expiry monotonic,
  draft/conflict/lost-save chỉ GET đối chiếu; review calibration rõ ràng.
- Không thêm firmware, IoT policy/topic/IAM, worker dừng nước hoặc auto resume.
  V39 chỉ dừng theo thời tiết, không tự áp dụng cho LOW. Chốt LOW không chứng
  minh lưu lượng hoặc phần trăm/thể tích bồn.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Full backend PostgreSQL | 592 đạt,25 mới,0 fail/error/skip |
| Browser nhánh/phiên/history | 84 đạt,9 mới;9 water gate recheck đạt |
| Browser node/vùng | 51 đạt |
| Browser pump | 17 đạt |
| Unit node/history/weather/zone/rain/stop/water gate | 36 đạt,5 mới |
| Lint/build | Đạt; __dirname/chunk warnings cũ |
| Upgrade V39→V40 | 13 bảng cũ không đổi, policy0; water_gate mới null |
| Native WaterPacket→router→DB | 4mẫu/12readings, missing/present/empty/fault/recovery đúng,0command |
| Full app và restart | GET-only, mẫu cũ vẫn STALE;14 bảng chọn không đổi |

Hai ca test đầu thao tác xóa kênh bị khóa ngoại ngăn và gán LOW trùng FLOW
bị constraint nhánh ngăn. Đã sửa harness mô phỏng registry đổi metric/unit
hợp lệ ở cùng channelID, không xóa/nới constraint production. Mapper Config
được mở public để tái dùng có kiểu từ module nodes. Full cuối592 đạt.

Log /tmp/water-gate-backend-full.log; /tmp/water-gate-targeted-final.log
67ca liên quan đạt. Browser /tmp/water-gate-browser.log (84) và
-browser-final.log (9 recheck), -nodes-browser.log (51), -pump-browser.log (17).
/tmp/water-gate-units.log (36), -build.log, -lint.log. Các file/tmp chưa tự
được publish lên Git hoặc phục hồi trong task mới.

## Cloud runtime được kiểm tra

JDK /workspace/toolchains/jdk-21.0.12.1, Maven wrapper/settings/cache/trustStore
như đợt trước. /tmp/run-weather-stop-tests.sh verify tiếp tục là wrapper test
đã dùng; SMARTFARM_TEST_DB_URL trỏ jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test,
user smartfarm_test, password rỗng chỉ local trust test. Suite không được
truncate fixture schemas hoặc demo5433.

Native tools/tests/water_gate_packet_fixture.cpp dùng production WaterPacket.h,
g++ include /tmp/smartfarm-soil-build/.pio/libdeps/esp32dev/ArduinoJson/src,
output /tmp/water-admission-packet. Bốn packet tạo một lần ở
/tmp/water-admission-packets.jsonl, không update timestamp hoặc replay để làm
mới. Helper tools/fixtures/CircuitWaterGateSmokeFixture.java chỉ cho schema
water_gate_smoke, MQTT=false/profilecontrol/fence/route/circuit=true lúc tạo
binding, không transport; refuse evidence/schema đã có. Evidence
/tmp/water-gate-evidence.json, log /tmp/water-gate-fixture.log. WC1/WCZONE,
WCSOIL/WATER01, policy bậtv1,4samples/12readings,0command/run/session.

Runtime8080 /tmp/start-water-gate-backend.py gọi
/tmp/run-water-gate-backend.sh, PID/log /tmp/water-gate-backend.pid/.log.
Schema water_gate_smoke; khi phục vụ UI cloud mọi flag MQTT/control/fence/
route/circuit-demo/session/rain-stop/legacy-demo/monitor=false. Readiness
GET /api/v1/irrigation-circuits/WC1/water-gate giữ WATER01/LOW/policyv1/seq4;
mẫu gốc true nay STALE/allowedfalse. /safety MQTT DISABLED/controlfalse.
Stop chỉ PID có JAR và đúng schema trước repackage. Snapshot14 bảng
/tmp/water-gate-before-restart.json và -after-restart.json bằng nhau.

Schema weather_stop_verified_smoke được migrate Flyway-only V39→V40,
13 bảng cũ so sánh bỏ field water_gate mới của pump_command; lệnh cũ có field
null, policy mới0. /tmp/water-gate-v39-before.json, -v40-after.json và
-v39-upgrade.log. Không chạy lại fixture cũ; giữ mọi evidence/schema trước.

Frontend3000 proxy8080. Smoke:
CHROMIUM_PATH=/usr/bin/chromium python tools/frontend/smoke_circuit_water_gate.py
Dùng Python cloud có Playwright, không day1-venv. Mở menu IoT→Điều khiển
Actuator→Cấu hình nhánh→Chốt nguồn nước WC1, binding/stale/refresh/back đúng,
GET-only, không external/page errors. /tmp/water-gate-full-app.png.

## Còn chờ

Sáu ca Windows/AWS/Wokwi chương54 **Chưa chạy**. Không AWS/broker/GPIO thật,
đọc private config/PEM/secrets hoặc build firmware đã provision. Chưa đo flow
xuyên controller hoặc stop khi LOW đổi sau ON; không thay edge timer/guard.
A3 coordinator/multi-route/queue và nghiệm thu nông nghiệp/phần cứng vẫn mở.

Đã kiểm tra 571 liên kết Markdown tương đối ngoài code trong docs/contracts:
không thiếu đích; git diff --check đạt. Lint/build cuối sau thay đổi guard UI
lưu ở /tmp/water-gate-lint-final.log và /tmp/water-gate-build-final.log.
