# Bàn giao — Local flow guard cho ENV01/PUMP01

Ngày 15/10/2026, giờ Việt Nam (log cloud dùng UTC). Hướng dẫn cấu hình và ma
trận thử tại [chương 26](../book/CHAPTER_26_LOCAL_FLOW_GUARD.md).

## Thay đổi

FlowInterlock native model: cấu hình opt-in, đếm xung theo elapsed window,
mồi mặc định 5s, bỏ cửa sổ cuối mồi; hai cửa sổ >=1s dưới minimumLpm -> FLOW_LOW.
Overflow, rate>maximumHz, window>2500ms hoặc config invalid -> FLOW_SENSOR_FAULT.
Latch giữ đến reset mới, pulses trở lại không auto ON. Config source PHYSICAL
cần khai báo calibration version, không chứng minh calibration thực tế.

Adapter firmware GPIO25 rising-edge ISR và ESP timer250ms, model/counters giữ
cùng portMUX. Timer callback không network/JSON/Serial; lỗi ép GPIO OFF và
forcedOff ngay, loop-owned RelaySafety sau đó trip/lưu reason/stop timer/status.
Output gate kiểm tra latch. Timer hạn ON cũ và phao GPIO27 giữ tác dụng. ON
trùng không reset grace; RESET cũ không xóa latch mới. Khi đã OFF, guard ngừng
đánh giá flow; flow 0 lúc không chạy không sinh lockout. Reset chỉ mở lần thử mới.

Default guard0; config.local.h cũ thiếu macro vẫn tắt. Adapter giới hạn pin25
riêng và yêu cầu phao bật; cấu hình lỗi/pin conflict không được coi sẵn sàng.
Wokwi ENV thêm clock45Hz + gate clock/GND vào GPIO25, vẫn giữ relay NO/LED/phao.
Đây là xung mô phỏng, không có feedback nước/bơm vật lý hoặc binding WATER01.

Status encoder PumpStatusPacket.h được dùng chung main.cpp và native fixture.
PumpService + status schema nhận FLOW_LOW/FLOW_SENSOR_FAULT chỉ khi OFF/locked;
Safety parser cũng kiểm tra kết hợp này. Control/Safety/Event Log có nhãn Việt.
Không thêm migration sau V16, API command mới, telemetry flow v1 hoặc AWS policy.
Status chưa có capability/source/calibration để chứng minh guard đang bật;
chỉ reason thiết bị báo. RAW lpm diagnostic là local, không tạo WATER sample.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Maven verify / PostgreSQL riêng | 144 pass, 0 fail/error/skip |
| Trong đó PumpControlTest | 15 pass, gồm 3 ca flow mới |
| Browser Safety | 12 pass (2 flow mới) |
| Browser Event Log | 10 pass (2 flow mới) |
| Unit Safety | 6 pass (2 mới) |
| Python contract v1 | 8 pass |
| Python diagram ENV | 4 pass |
| Native FlowInterlock, RelaySafety, status encoder | 3 executable đạt |
| ESP32 opt-in build và legacy thiếu macro flow | Đạt cả hai |
| Lint/build | Đạt, warning Vite cũ |

Native thử grace/two-window/recovery, actual elapsed+jitter, overflow/too-fast,
stale window/config, rollover, OFF giữ không khóa, duplicate ON/RESET không
resume, fresh reset/new ON. Shared encoder phát flow-trip-status.json; schema
validate và Java test cập nhật timestamp rồi PumpService.receive/store/history.
Không gọi đó là MQTT/ESP timer/ISR runtime test. Fixture là mô phỏng local.

Cloud compile trong /tmp/smartfarm-flow-guard-build, chỉ public source/config
với endpoint rỗng và không PEM. Config opt-in bật control/flow mô phỏng; build
legacy bỏ các macro flow để xác nhận fallback0. Không đọc config/private image
của người dùng. Chưa chạy buildfs/merge lần này vì không thay filesystem/tool;
người dùng phải buildfs/merge trên máy có cert trước chạy Wokwi.

Log /tmp/flow-{backend-final,browser-final,events-browser,unit,contracts,
diagram-tests,firmware-final,firmware-legacy-final,lint,build,native}.log.
Giữ runner totals/skip riêng, không cộng assert native thành số test giả.

## Smoke toàn ứng dụng

tools/fixtures/FlowGuardSmokeFixture.java có guard trước khi mở Spring: URL
loopback55439/database smartfarm_test/schema flow_guard_smoke, MQTT/control=false.
Dùng native fixture LOW với timestamp mới, rồi local reason SENSOR_FAULT để
PumpService.receive nhận hai status. Không gọi create/publish/AWS. Không seed
schema demo; helper từ chối khi fixture đã có status.

Jar mới chạy cùng schema, Vite3000 proxy8080. tools/frontend/smoke_flow_guard.py
chỉ GET API, chặn external network/API write; Safety đọc stored OFF/locked và
history hai reason, Control history có nhãn, Event Log mở Chi tiết device của
FLOW_LOW. Nếu status nguồn đã quá 15s, không coi OFF cũ là trạng thái hiện tại.
Source timestamp fixture/SQL không chứng minh GPIO hoặc máy bơm thật.

Đã đạt smoke, SQL cuối: pump_status OFF/locked/FLOW_SENSOR_FAULT, 2 history,
command0/run0. Screenshot /tmp/flow-guard-safety.png, log /tmp/flow-smoke-app.log,
seed log /tmp/flow-smoke-seed.log. Các schema water_alert_smoke/water_a2_smoke
và demo DB không đổi. Read-only smoke có thể chạy lại, không seed lại fixture.

Lỗi trong đợt: native test bị -Werror misleading-indentation, đã tách dòng if;
script sửa encoder tìm nhầm chuỗi serializeJson có space nên dừng, đã sửa và
build lại source cuối. Smoke đầu gọi API trước backend ready (không phải lỗi
JSON nghiệp vụ), chờ readiness rồi thử lại. Event Log reason nằm ở chi tiết,
không nằm trên hàng tóm tắt; sửa locator mở đúng detail, thêm 2 browser tests.
Không bỏ kiểm tra hoặc vô hiệu TLS/cảnh báo để làm các lượt này đạt.

## Giới hạn và bàn giao Windows

Pull + restart backend với control enabled trước firmware mới; giữ config/DB.
Bật các define trong config.local.h hiện có (không overwrite endpoint/keys),
build/buildfs/merge ENV, mở firmware/esp32/diagram.json mới. Native/build không
thay nghiệm thu ma trận Wokwi chương 26, tất cả ca live mới còn Chưa chạy.

A2 là prototype partial: chưa binding WATER/zone, calibration vật lý, pulse
telemetry controller, hardwired cutoff/watchdog độc lập, NVS, total litres hay
chứng minh tiếp điểm/flow thật. Software timer có thể bị ảnh hưởng bởi lỗi CPU/
OS; không coi guard này là hệ bảo vệ phần cứng đã nghiệm thu hoặc auto resume.
