# Bàn giao — dừng phiên tưới theo thời tiết V39

Ngày 17/10/2026, giờ Việt Nam; nền 18698d7, nhánh feat/day1-iot-foundation.
[Chương53](../book/CHAPTER_53_SESSION_WEATHER_STOP.md).

## Phần đã triển khai

- zone_rain_gate.stop_on_rain defaultfalse, chỉ chọn khi admission gate và
  profile session/rain-stop được bật. Policy cũ giữ hành vi; migration không
  seed event/lệnh. Các API revision/source/calibration của V38 giữ nguyên.
- Worker chỉ opt-in qua SMARTFARM_IRRIGATION_RAIN_STOP_ENABLED=false mặc định.
  Poll1s danh định, chỉ phiên DISPATCHING_ON/WAIT_ON có on_id và chưa stop.
  Mọi state không cho phép của gate đang bật yêu cầu OFF; không điều khiển
  direct ON/rule ENV01, không tự CLOSE/FINISH/resume.
- Một event và OFF request/session, commit stop latch/evidence trước IO;
  callback dưới pump gate ngăn dispatch muộn khi đã bị manual OFF thay thế.
  Dùng chung dispatchReserved của session, không sửa contract MQTT/firmware.
- Mất mạng/publish chưa rõ hoặc thiếu intent vẫn giữ yêu cầu; không replay.
  RETURNED không đồng nghĩa gửi thành công: history join command FAILED/
  PUBLISH_UNCERTAIN/EXECUTED tách riêng. Proof OFF vẫn bắt buộc trước CLOSE.
- UI chọn chế độ, lịch sử20 yêu cầu/vùng GET-only, lỗi API không giữ nhãn
  backend mới. Tắt gate đồng thời tắt stop mode; lost-save đối chiếu cả field.

## Kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Full backend PostgreSQL | 567 đạt,23 mới,0 fail/error/skip |
| Browser node/vùng/rain/stop | 51 đạt,6 mới |
| Browser nhánh/phiên/history | 75 đạt |
| Browser pump | 17 đạt |
| Unit parser node/history/weather/zone/rain/stop | 31 đạt,3 mới |
| Lint/build | Đạt, cảnh báo Vite __dirname/chunk cũ |
| Upgrade V38→V39 | 12 bảng cũ giữ nguyên; field mới false; event0 |
| Scheduler thật/native packets/DB | Một OFF giả lập có ACK/status, không auto CLOSE/ON |
| Full app và restart | GET-only;12 bảng không đổi, phiên RECOVERY chỉ revision+1 |

Lượt test đầu kỳ vọng sai kết quả khi MQTT offline: API hiện có trả command
FAILED/MQTT_UNAVAILABLE và operation RETURNED, không tự thành UNRESOLVED.
Đã sửa assertion cho đúng contract và hiển thị cả hai kết quả, không nới chốt.
Hai test spy ban đầu cần unwrap Spring proxy trước khi spy; đã sửa harness.
Full cuối567 đạt, không skip. Log /tmp/weather-stop-backend-full.log.

Fixture scheduler đầu nhận cả sự kiện timer OFF nhanh của native helper nên
không còn ON để test thời tiết. Lượt kế tiếp ACK OFF chưa đổi metadata fence
sang ordinal nên bị từ chối. Đã sửa harness và chạy schema mới, giữ nguyên
hai schema lỗi weather_stop_smoke và weather_stop_scheduler_smoke để đối
chiếu, không reseed/xóa/sửa timestamp. Bản đạt weather_stop_verified_smoke
chỉ nhận ACK/ON native trước timer; OFF ACK/status dựng từ template native
với metadata lệnh fake. Không tính thành test firmware OFF vật lý mới.

## Runtime và tái lập cloud

Test DB loopback55439 smartfarm_test/user smartfarm_test/password rỗng chỉ
container local trust. Suite chỉ dùng telemetry_test, không truncate schema
fixture hoặc volume demo5433. JDK /workspace/toolchains/jdk-21.0.12.1,
wrapper backend/mvnw, Maven settings /workspace/toolchains/maven-settings.xml,
cache /workspace/.m2/repository, trustStore /etc/ssl/certs/java/cacerts.
/tmp/run-weather-stop-tests.sh verify là wrapper đã kiểm tra; export
SMARTFARM_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test.

Fixture source tools/fixtures/WeatherSessionStopSmokeFixture.java biên dịch
cùng IrrigationSessionSmokeFixture.java vào /tmp, classpath target/classes
và /tmp/water-alert-smoke-libs/*. Nó yêu cầu đúng weather_stop_verified_smoke,
MQTT=false, profile control/fence/route/circuit/session/rain-stop=true, legacy
và monitor=false; refuse reseed/evidence tồn tại. Chỉ fake transports đăng ký
sau khi kiểm tra không có transport thật. Native /tmp/weather-packet và
/tmp/pump-route-packet đều packet công khai; không chạy lại fixture đã lưu.
Evidence /tmp/weather-session-stop-evidence.json; log thành công
/tmp/weather-session-stop-verified.log. Hiện2pump commands ON/OFF và1valve
OPEN,1weather event,1session dừng; không watering run hoặc auto CLOSE.

Runtime8080 /tmp/start-weather-stop-backend.py gọi
/tmp/run-weather-stop-backend.sh, PID/log /tmp/weather-stop-backend.pid/.log.
Schema weather_stop_verified_smoke. Khi phục vụ UI cloud mọi flag MQTT,
control,fence,route,circuit-demo,session,rain-stop,legacy-demo,monitor=false;
GET lịch sử giữ event và workerEnabled=false. /safety MQTT DISABLED/control
false; /PC1/session active RECOVERY_REQUIRED, stopRequested=true. Startup
đầu chuyển WAIT_OFF→RECOVERY theo contract; không so sánh phase trước/sau
lần startup đó như dữ liệu bất biến. Snapshot sau startup và sau restart kế
tiếp đối chiếu13 bảng:12 bảng không đổi; irrigation_session chỉ tăng revision
thêm một, giữ phase RECOVERY_REQUIRED/stop_requested/IDs và mọi field khác.
Snapshot /tmp/weather-stop-before-restart.json và -after-restart.json.
Stop chỉ PID có cmdline JAR và đúng schema trước repackage; không kill PID cũ.

Frontend3000, smoke GET-only:
CHROMIUM_PATH=/usr/bin/chromium python tools/frontend/smoke_weather_session_stop.py
Dùng Python cloud có Playwright, không day1-venv. Screenshot
/tmp/weather-session-stop-full-app.png. Không API writes/external/page errors.
Log browser /tmp/weather-stop-browser.log, -circuits-browser.log,
-pump-browser.log; /tmp/weather-stop-units.log và -build.log. Các artifact/tmp
không tự được publish vào Git hoặc phục hồi ở task mới.

## Còn chờ

Sáu ca AWS/Wokwi chương53 **Chưa chạy**. Không AWS operation, broker/GPIO
thật, đọc secrets/PEM/config private, firmware build hoặc cấp cert mới.
Cần backend và mạng hoạt động, không bảo đảm stop khi backend chết; timer/
interlock cục bộ còn thiết yếu. Chỉ một phiên operator, chưa nhiều route,
flow xuyên controller, queue dispatch, forecast/ET/hiệu chuẩn nông học.

Kiểm tra 556 liên kết Markdown tương đối ngoài code trong docs/contracts:
không thiếu đích; git diff --check đạt. Snapshot restart đối chiếu từng field,
không coi revision recovery tăng đúng một là dữ liệu bị mất hoặc replay.
