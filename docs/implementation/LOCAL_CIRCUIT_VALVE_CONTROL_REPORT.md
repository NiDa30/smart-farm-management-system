# Bàn giao — LED van theo nhánh, V32

Ngày16/10/2026. [Chương46](../book/CHAPTER_46_CIRCUIT_VALVE_LED_CONTROL.md).
Controller/van02–99, mỗi board một van, chỉ SIMULATOR. Backend và firmware
cùng opt-in mới CIRCUIT_LED_DEMO, mặc định tắt. Không điều khiển bơm chung.

## Phần đã triển khai

- CircuitValveControl/Controller/Transport: GET snapshot, POST command và GET
  lookup dưới /api/v1/irrigation-circuits/{id}/control. Mapping snapshot,
  intent UUID/revision/boot/requestedAt, expiry10s và ordinal bền trong DB.
- V32 thêm bốn bảng circuit_demo_command/status/boot/gate. Không backfill,
  xóa monitor/history hoặc đổi migration cũ. Mỗi lần gửi lưu PENDING trước
  publish; duplicate intent không republish, lỗi không rõ lưu UNCERTAIN.
- OPEN cần CURRENT, controller riêng, status/source/receipt15s, boot/mapping
  đúng, GPIO/vị trí CLOSED không fault, status đã thấy toàn bộ command.
  CLOSE dùng boot/mapping đã biết, vẫn cho phép khi status cũ hoặc fault;
  tạo close fence chặn HTTP OPEN cũ. ACK chỉ đổi ledger, không đổi status.
- Không nhận retained, nguồn PHYSICAL, profile/topic/identity/revision sai,
  ordinal lạ hoặc boot đã retire. Fault chỉ clear sau CLOSE mới hoặc boot mới.
- Sửa nhánh, tạo shared controller hoặc sửa vùng có control history cần
  CLOSED position mới sau mọi command. Zone edit dùng cùng config gate
  trước zone row để không vượt qua lệnh đang lưu; không phá khóa khi stale.
- TelemetryIngestion dùng worker riêng và exact /demo/status,ack; transport
  chỉ publish đúng /demo/command của van đã subscribe, QoS1, non-retained.
  Không chặn worker ACK/status PUMP01 khi receiver circuit bị treo.
- Firmware thêm macro IRRIGATION_CIRCUIT_CONTROL_ENABLED0. Profile control
  yêu cầu monitor0/demo1/simulator1/feedback1, đúng IDs02–99. Decoder riêng
  kiểm tra metadata, duplicate keys, boot cho cả CLOSE, timer/disconnect và
  ordinal. Monitor/legacy mặc định giữ đường cũ. Không command02–99 trên
  topic /status monitor hoặc legacy /command.
- Trang nhánh có nút Điều khiển LED từng hàng. Panel riêng parse chặt, clock
  freshness, GPIO khác feedback, ledger20lệnh, request UUID và GET đối chiếu
  khi mất phản hồi. Không tự gửi/retry/resume hoặc coi ACK là trạng thái mới.
- Renderer Python thêm --circuit-demo, policy exact riêng /demo/. Công cụ
  provisioning chương45 vẫn chỉ monitor; không tự cấp thêm quyền control.

## Kiểm chứng cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ, PostgreSQL test riêng |439 đạt,0 fail/error/skip;23 mới |
| Browser nhánh |35 đạt, gồm26 cũ +9 control mới |
| Unit parser control |4 đạt |
| Python monitor provisioning / policy |33 /7 đạt |
| Native model/feedback/monitor/control |4 chương trình đạt với warnings-as-errors |
| Firmware public legacy / monitor / circuit |Cả3 build đạt |
| Profile monitor+control sai |Compiler từ chối đúng; restored build đạt |
| Buildfs rỗng + merge4MiB |Đạt, chỉ .gitkeep, không PEM/key |
| Lint / production build |Đạt, cảnh báo Vite cũ vẫn còn |
| Native command/ACK/status/timer → receiver/PostgreSQL |Đạt, một van, board thứ hai trống |
| Full-app menu/selection/ledger/stale/isolated board |Đạt, GET-only |
| V31→V32 fixture monitor / default-off |Giữ nguyên mapping/source/receipt; monitor không mở control |
| Restart JVM fixture control |Giữ status/ledger/clocks, không replay lệnh |

Lượt full đầu438 đạt; rà soát thêm đường sửa zone phát hiện cần khóa chung,
thêm guard/test rồi chạy lại toàn bộ439. Không cộng hai lượt thành tổng test.
Hai test targeted đầu fail do PostgreSQL làm tròn nanosecond sang microsecond
khi lưu requestedAt, khiến cùng intent bị409. Canonicalize microsecond trước
lưu và so sánh; targeted19 và toàn bộ cuối đạt. Compiler native phát hiện
API containsKey deprecated ở test; dùng kiểm tra variant hiện hành, không bỏ
warnings-as-errors. Không dùng log fail làm bằng chứng pass.

## Bằng chứng và runtime cloud

Fixture mới circuit_control_smoke, DB test loopback55439. Không chạm DB demo
5433 hoặc volume; giữ các schema/artifact cũ. Hai nhánh CC1/CC2, vùng CCZONE1/2,
controller08/09, van08/09, trạm CCWATER. Profile monitor tắt, circuit demo bật,
MQTT/control/PUMP01/legacy demo tắt. Không có AWS identity hoặc transport thật.

Helper CircuitValveControlSmokeFixture có guard schema/flags và từ chối
setup/exercise lại trên dữ liệu đã có. Native fixture seed CLOSED, service
lưu command trước fake publish, native decoder/model thực thi, trả ACK/OPEN/
timer CLOSED vào receiver thật. Timer tiến nhanh bằng millis mô hình; không
chờ thực5giây hoặc dùng GPIO/Wokwi. Ledger một OPEN EXECUTED; latest sequence3,
TIMER_EXPIRED/CLOSED, boot87000000-0000-4000-8000-000000000001, VALVE09 trống.
Source2026-10-15T18:07:42Z, receipt2026-10-15T18:07:42.653446Z giữ nguyên
qua restart; API hiện không có transport thật nên readyToOpen=false.
PUMP01/run/queue/legacy/monitor0. Evidence /tmp/circuit-control-evidence.json.
Không phát lại packets hoặc sửa timestamp để làm tươi UI.

Backend8080 khởi động từ /tmp/run-circuit-control-backend.sh, PID
/tmp/circuit-control-backend.pid, log /tmp/circuit-control-backend.log.
Starter /tmp/start-circuit-control-backend.py đợi đúng phần log của PID mới
và API chức năng; Vite3000 dùng như trước. Kiểm tra /proc/PID/cmdline/schema
trước dừng, không assume process còn sau restore. Stored smoke an toàn:

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_circuit_valve_control.py
```

Log /tmp/circuit-control-backend-final.log (439), -browser.log (35),
-api-unit.log, -provision-regression.log, -policies.log, -native-pipeline.log,
-v31-upgrade.log và -full-app.log. Public builds ở /tmp/circuit-control-build-*,
emptyFS không chứa khóa. Export monitor từ JAR mới vẫn15file/flag control0,
validator provisioning chấp nhận narrow policy. Source firmware trong JAR
mới thay đổi có chủ đích; không so core hash của JAR mới với artifact cũ
chương44 hoặc ghi đè baseline cũ để ép smoke qua.

## Giới hạn

Sáu ca Windows/AWS/Wokwi trong chương46 đều Chưa chạy. Chưa điều khiển van
cơ khí hoặc đọc proof theo nhánh tại bơm; không coordinator/dispatch queue.
Độc lập LED có thể cùng mở nên không được nối các van dùng chung bơm theo
đường demo này. Control latest chưa đưa vào lịch sử/cảnh báo monitor, không
mượn observation monitor để điền chỗ trống. Cột Van của danh sách vẫn là
monitor; trạng thái GPIO control nằm ở panel riêng. Không tự chuyển monitor
policy sang control hoặc tạo role/certificate mới trong cloud.
