# Bàn giao — chốt mưa theo vùng V38

Ngày 16/10/2026, giờ Việt Nam. Nền 9d4f589, nhánh feat/day1-iot-foundation.
[Chương 52](../book/CHAPTER_52_ZONE_RAIN_GATE.md).

## Kết quả

- Policy opt-in theo vùng, revision vùng/policy, WEATHER/v2/RAIN_DETECTED cùng
  area, đúng nguồn/calibration. GET view và PUT optimistic; không seed policy.
- Missing/stale/fault/skew/source/calibration/config không qua gate. Cả hai
  timestamp dưới30s; partial ánh sáng/packet trùng không làm mới mưa.
- Chặn bắt đầu phiên/OPEN/ON theo nhánh; kiểm tra lại lúc giữ chỗ fenced ON,
  lưu policy/mẫu trong pump_command.weather_gate. Duplicate giữ bằng chứng
  và không publish lại; generic/legacy ON không vượt enabled gate.
- OFF không qua gate; RESET giữ proof reset cũ. Không worker tự OFF khi mưa
  xuất hiện sau admission, không auto-resume, không suy ra tưới từ lux.
- UI từ Vùng tưới hoặc Cấu hình nhánh; nhãn tiếng Việt, expiry monotonic,
  giữ draft, conflict/reread, lost response chỉ GET so khớp, không tự PUT lại.
- Sách/chương52/runbook/acceptance/roadmap/checklist cập nhật; A3/A4 còn mở.

## Kiểm tra hoàn tất

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ backend PostgreSQL | 544 đạt, 19 mới, 0 fail/error/skip |
| Browser node/history/vùng | 45 đạt, 8 mới |
| Browser nhánh/phiên/history | 75 đạt |
| Browser pump hồi quy | 17 đạt |
| Unit node/history/weather/zone/rain parser | 28 đạt, 5 mới rain |
| Lint/build | Đạt; cảnh báo Vite __dirname/bundle vốn có |
| V37→V38 schema WEATHER cũ | 10 bảng không đổi, policy mới rỗng |
| Native packet→receiver→PostgreSQL | 5 mẫu/10 readings, missing/dry/rain/fault/recovery đúng |
| Full app/API/DB và restart | GET-only, binding/mẫu cũ hiển thị đúng, 12 bảng giữ nguyên |

Lượt full đầu có lỗi SQL trong fixture ca area (nhầm tên bảng farm_area).
Đã sửa dùng sensor_area và cleanup đúng; lượt full cuối 544/544 đạt. Không
đổi logic production để nới điều kiện hoặc bỏ qua ca lỗi. Helper Python UI
phải dùng Python cloud có Playwright, không day1-venv chỉ dành công cụ khác.

## Tái lập cloud và dữ liệu giữ lại

JDK /workspace/toolchains/jdk-21.0.12.1; Maven wrapper với
/workspace/toolchains/maven-settings.xml, cache /workspace/.m2/repository,
trustStore /etc/ssl/certs/java/cacerts. Suite dùng SMARTFARM_TEST_DB_URL
jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test,
user smartfarm_test, password rỗng chỉ trong container loopback test riêng.
Không dùng demo5433 hoặc schema fixture để chạy suite truncate.

Log /tmp/rain-backend-final.log; browser /tmp/rain-browser.log,
/tmp/rain-circuits-browser.log, /tmp/rain-pump-browser.log; unit
/tmp/rain-units-final.log. Không xem các log tạm là đã publish vào Git.

Fixture source tools/fixtures/ZoneRainGateSmokeFixture.java chỉ cho schema
rain_gate_smoke, MQTT=false, không CommandTransport/CircuitValveTransport;
refuse replay khi có /tmp/rain-gate-evidence.json. Native executable
/tmp/weather-packet sinh 5 packet một lần vào /tmp/rain-gate-native-packets.jsonl.
Không refresh fixture để biến mẫu cũ thành mới. WEATHER schema cũ và evidence
cũ nguyên vẹn. Schema mới có RZONE01, RSOIL01, WEATHER01, policy bật v1 và mẫu
cuối có mưa, nay cũ; không actuator/circuit/session/command/run mới.

JVM8080: /tmp/start-rain-gate-backend.py gọi /tmp/run-rain-gate-backend.sh,
PID/log /tmp/rain-gate-backend.pid và .log. MQTT/control/fence/route/session/
circuit-demo/legacy-demo/monitor đều false khi phục vụ UI cloud. Functional
readiness GET weather: binding đúng, enabled=true, sample rain=true, state
STALE/RAIN, allowed=false; /safety phải MQTT DISABLED/control false.
Restart chỉ PID có cmdline đúng JAR và schema. Hai snapshot
/tmp/rain-gate-before-restart.json và /tmp/rain-gate-after-restart.json bằng
nhau cho 12 bảng được chọn; startup counters khác không nằm trong kết luận.

Smoke UI: CHROMIUM_PATH=/usr/bin/chromium python tools/frontend/smoke_rain_gate.py,
frontend3000 proxy8080. GET-only, không request ngoài loopback; screenshot
/tmp/rain-gate-full-app.png. Không có link preview localhost dùng cho người dùng.

## Phạm vi chưa nghiệm thu

Sáu ca Windows/AWS/Wokwi chương52 đều **Chưa chạy**. Không chạy AWS operation,
MQTT broker thật, thiết bị/đường nước thật, không đọc secrets/PEM/config private.
Không sửa firmware trong đợt này nên không tính lại firmware build cũ thành
kiểm tra mới. Gate là admission point, không continuous rain interlock; không
forecast/physical calibration/auto-resume/multi-route coordinator/queue dispatch.

Đã kiểm tra 541 liên kết Markdown tương đối ngoài code trong docs/contracts:
không thiếu đích; git diff --check đạt. Kiểm tra link không tính code fences
hoặc inline code thành liên kết tài liệu.
