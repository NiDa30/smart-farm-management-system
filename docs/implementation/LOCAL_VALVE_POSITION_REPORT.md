# Bàn giao phản hồi vị trí van V25

15/10/2026, giờ Việt Nam. IRRIGATION01/VALVE01 riêng, trước bước coordinator.

Đã thêm hai công tắc độc lập trên sơ đồ Wokwi: closedStop GPIO32/contact1GND,
openStop GPIO33/contact3GND, activeLOW. GPIO26 LED không tự đổi hai đầu vào.
Firmware feedback opt-in mặc định0; debounce100ms/travel3s, fault giữ đến
CLOSED ổn định + CLOSE mới. Conflict/lost/timeout đưa GPIO LOW; rung liên tục
không kéo dài hạn vô tận. CLOSE/boot/ordinal/timer/mất mạng cũ giữ nguyên.

Packet status/ACK mở rộng positionFeedback khi opt-in, vẫn SIMULATOR. Backend
V25 lưu capability/state/fault, giữ legacy UNKNOWN; kiểm tra shape, source,
time, sequence/ordinal, không downgrade cùng boot hoặc xóa fault thiếu CLOSE
mới. ACK không đổi status vị trí. Policy backend yêu cầu feedback mặc định
false; nếu policytrue hoặc device đã advertise thì OPEN/rebind cần CLOSED
không fault. CLOSE vẫn có đường gửi; lỗi hiện ở panel van, chưa global alerts.

Vào **Điều khiển Actuator → Mở controller van mô phỏng → Phản hồi vị trí van**.
UI trình bày GPIO, công tắc, fault và policy riêng; dữ liệu cũ không hiện thành
vị trí mới. Firmware không bật tự động sau reconnect/reboot. Queue vẫn
PREVIEW_ONLY, chưa pump-owner mapping/van–bơm/flow interlock hoặc SOIL dispatch.

| Kiểm tra | Kết quả |
| --- | --- |
| Backend đầy đủ, PostgreSQL test riêng | **300/300**, 14 mới, không skip |
| Browser valve/API fixtures | **13/13**, 5 mới |
| Parser unit | **4/4**, 2 mới |
| Native feedback/model/parser/encoder | Đạt; compiler warning là lỗi |
| Public default và opt-in ESP32 | Build đạt với source cuối |
| Empty FS + flash merge | Đạt; 4MiB, LittleFS offset0x290000 |
| Lint/build | Đạt; cảnh báo Vite cũ |
| V24→25 | Status cũ giữ boot/sequence; false/UNKNOWN/null |
| Full-app backend/PostgreSQL + restart JVM | Fresh CLOSED rồi stale; metadata/time giữ nguyên; command0 |
| Windows/AWS/Wokwi/GPIO mới | Sáu ca Chưa chạy |

Lượt full đầu lỗi FK vì targeted fixtures để lại zone tham chiếu SOIL. Đã
thêm cleanup đúng IRRZONE/IRRSOIL và VFZONE/VFSOIL sau test, không sửa assertion
hoặc reset DB/demo. Full cuối300/300. Merge flash ban đầu tìm core mặc định
/home/agent/.platformio, sửa lệnh với --core-dir /workspace/.platformio. Không
đổi tool/script để bỏ kiểm tra. Native bổ sung ca loss/bounce sau khi đạt OPEN:
tính hạn từ lần mất đầu tiên, không reset theo candidate debounce. Test quan
sát đủ3s sau lần mất450ms, không nới giới hạn sản phẩm.

Runtime an toàn: backend8080 schema **valve_position_smoke**, Vite3000,
smartfarm-cloud-test loopback55439 DB/user smartfarm_test. MQTT/control/valve-demo
false, pump-fencingfalse, feedback-requiredtrue. Harness native encoder → Java
receive → PostgreSQL tạo1status CLOSED độc lập, bindingZONE01. Chỉ refresh
timestamp một lần lúc nhận fixture; không reseed hoặc làm mới để trông ready.
Runtime không có CommandTransport/IrrigationTransport, pump/run/queue/valve
command0. Fresh full-app GET-only đạt; sau restart JVM, feedback/boot/sequence/
source/receipt/binding giữ nguyên, stale được UI báo không có dữ liệu mới.
DBdemo5433/volumes và mọi fixture schema cũ giữ nguyên; không đọc private keys.

Public PlatformIO workspace /tmp/smartfarm-valve-position-build chỉ copy
src/include/config.example và config opt-in công khai endpoint trống; data
chỉ .gitkeep. Thông báo helper merge chung “contains private key” không có
nghĩa image thử chứa khóa. Không push flash hoặc artifact /tmp.

File chính: ValveFeedback/ValveModel/ValvePacket/main/diagram, IrrigationDemo,
ValvePositionFeedback, V25, valveApi/ValveDemoPanel và tests/fixtures/smoke.
Logs /tmp/valve-position-backend-verified.log, valve-position-browser.log,
valve-position-unit.log, valve-position-native.log, valve-position-lint-final.log,
valve-position-build.log, valve-position-pio-default-final.log,
valve-position-pio-opted-final.log, valve-position-fs.log,
valve-position-merge-final.log, valve-position-fixture.log,
valve-position-runtime-restart.log, valve-position-smoke-fresh.log,
valve-position-smoke-stored.log; ảnh valve-position-fresh.png/stored.png.
Artifact tạm không đảm bảo được restore ở task mới.

Sách [chương37](../book/CHAPTER_37_VALVE_POSITION_FEEDBACK.md). Pull và restart
backend/frontend; update backend trước khi bật feedback firmware. Khi opt-in
IRRIGATION_POSITION_FEEDBACK_ENABLED1 phải build app/FS/merge, restart controller
riêng; backend SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED=true cho policy
bắt buộc. Không cần IAM/topic/certificate mới. Không gọi V25 là coordinator
hoặc nghiệm thu van cơ khí/nước thật; bước tiếp là phối hợp van–bơm/owner.
