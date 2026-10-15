# Nhật ký xây dựng Smart Farm

## 15/10/2026 (giờ Việt Nam) — Bảo vệ flow cục bộ opt-in

ENV thêm FLOW GPIO25, clock/gate Wokwi, FlowInterlock với mồi và hai cửa sổ
thấp, sensor-fault guards, timer callback ép GPIO OFF và latch. Phao/timer cũ
còn tác dụng; flow về không auto ON. Default tắt/legacy fallback0. Shared
status encoder, parser/schema OFF+locked và nhãn Control/Safety/Event Log.
144 backend, 12 Safety browser +10 Event browser, 6 Safety unit, 8 contract và
4 wiring tests, 3 native executable, firmware opt-in/legacy, lint/build đạt.
Full app read-only nhận fixture status local, command/run0; không AWS/Wokwi live.
Không migration mới. Xem [chương 26](CHAPTER_26_LOCAL_FLOW_GUARD.md) và
[báo cáo](../implementation/LOCAL_FLOW_GUARD_REPORT.md).


## 14/10/2026 — Lịch sử nước và CSV sau V16

Thêm read-only history theo node/channel/range/source/quality, cursor giờ đo/ID
và cap ID. Web có lịch sử từng kênh WATER, CSV đúng trang, giữ false/0/fault/null,
source, calibration và giờ gốc; chưa tổng lít/cost. Không migration/firmware/AWS mới.
141 backend, 18 browser node/history và 12 unit frontend đạt, lint/build đạt.
Full app dùng lại 4 packet V16, LOW/FLOW/filters/download CSV đạt, command/run=0.
Lỗi input native datetime-local và so sánh phút/giây được sửa, có ca hồi quy.
Xem [chương 25](CHAPTER_25_WATER_HISTORY.md) và [báo cáo](../implementation/WATER_HISTORY_REPORT.md).


## 14/10/2026 — A2: Trung tâm Cảnh báo trạm nước

V16 thêm cursor/state/episode cảnh báo nước, parser/router/store cập nhật cùng
transaction. Hai mẫu fresh liên tiếp theo boot/sequence/time/source mới mở hoặc
hết; duplicate/history/out-of-order/missing không tự đóng đợt. LOW/HIGH bất
nhất và SENSOR_FAULT tách riêng, flow 0 không bị gán lỗi bơm. Giữ nguồn mô phỏng
và vật lý riêng, ghi packet mở/hết và giờ nhận. Xác nhận đã xem idempotent,
giữ ghi chú đầu, API riêng và UI trong Trung tâm Cảnh báo → Trạm nước.

132 backend tests, 17 browser alerts (9 cũ + 8 nước), 4 unit frontend và
lint/build đạt; nâng V15→V16 giữ mẫu cũ và không backfill cảnh báo. Không sửa
firmware/provisioning hoặc gửi AWS. Xem [chương 24](CHAPTER_24_WATER_ALERTS.md)
và [báo cáo](../implementation/WATER_ALERTS_REPORT.md) cho smoke process/DB.


## 14/10/2026 — A2 monitoring: WATER firmware và nguồn dữ liệu

Thêm firmware/water-node độc lập: LOW/HIGH debounce và lỗi bất nhất, ISR đếm
xung FLOW, elapsed window/rate/calibration guard. Clock/gate Wokwi là tín hiệu
mô phỏng, không có random measurement hay pump output. Thêm helper certificate
monitor-only và private project riêng theo node; retry attach dùng cert cũ,
checkpoint chặn mint thêm khi CreateKeys chưa rõ kết quả. Không dùng lại ENV key.

V15/source optional giữ v2 cũ UNSPECIFIED; web nguồn đo thiết bị khai báo và
mức bồn chỉ từ phao fresh/cùng packet. 119 backend, 9 browser node, 6 unit node,
17 Python water + 2 flash regression, native model/packet và build/buildfs/merge
rỗng đạt. C++ packet được schema và Java parser/SQL kiểm tra. Full app/API/DB
fixture MID/fault/zero/stale đạt, command0/run0; MQTT/control tắt. Không AWS/
Wokwi live mới; A2 flow-based cutoff/central alert/NVS chưa làm. Xem
[chương23](CHAPTER_23_WATER_NODE_MONITOR.md) và
[báo cáo](../implementation/WATER_NODE_FIRMWARE_REPORT.md).


## 14/10/2026 — A1 node/kênh và telemetry nước riêng

Theo lộ trình18nhóm, V14 thêm physical node/channel/actuator mapping, giữ
ENV01/PUMP01v1. Sensor registration cũ tạo mapping cùng transaction. Router
v1/v2, water parser strict, declared channel/unit/calibration, atomic packet
và dedupe; không giả số môi trường để nhận nước. UI Sensor Realtime có Node
& trạm nước, null/fault/false/0/freshness30s, save uncertain có readback.

116backend,7browser node,4unit frontend,3Python contract v2, lint/build đạt.
Full app registry lưu rồi restart đọc lại đạt; SQL fixture sau restart thử
LOW=false/HIGH=fault/FLOW=0 nguồn cũ. Command0/run0 giữ nguyên, MQTT/control
tắt. Lỗi seed UNION NULL/type đã sửa bằng cast, không liên quan payload AWS.
Không firmware/diagram/AWS mới; A2 flow safety và nước live còn chờ. Xem
[chương22](CHAPTER_22_NODES_AND_WATER_CHANNELS.md) và
[báo cáo](../implementation/NODE_CHANNELS_REPORT.md).


## 14/10/2026 — Cập nhật ý tưởng các node nông nghiệp

Nguồn là bản ý tưởng người dùng gửi: 18 nhóm thiết bị, ví dụ 100 cây dừa / 4 dãy,
trạm nước trung tâm, môi trường, cho ăn/nước uống/chuồng và camera riêng.
Đã lập [lộ trình](../plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md), phân biệt nền
9730558 với ENV/SOIL/WATER/IRRIGATION/FEED mục tiêu. Mỗi dãy 3 điểm đất / 1 van /
1 flow là bố trí đề xuất, chưa có dữ liệu/Thing/board tương ứng.

Ưu tiên A0 nghiệm thu relay/phao → A1 model/channel/contracts → A2 trạm nước
→ A3 tưới từng dãy → A4 mưa/ánh sáng → chăn nuôi/camera/mở rộng. Giữ PUMP01,
contract v1 và fail-safe cũ; không đổi topic hoặc suy ra phao nhị phân thành
phần trăm bồn. Ghi rõ video đi qua media subsystem, không MQTT; flow/áp suất/
khẩu phần cần hiệu chuẩn. Context cũ có nhãn Production Ready/HiveMQ/topic
khác đã được thêm cảnh báo lịch sử và link mới. Chỉ tài liệu thay đổi; không
build/code, tạo Jira/AWS hoặc chạy nghiệm thu thiết bị trong lượt này.


## 14/10/2026 — Thiết bị simulator nông nghiệp và phao cạn

Người dùng chưa thấy thiết bị mới: lịch V13 trước đó chỉ đổi backend/web. Đợt
này thêm relay/LED tải NO và slide-switch phao vào sơ đồ chuẩn firmware/esp32,
phân biệt root wokwi legacy. Firmware opt-in GPIO27, cạn khóa OFF và chặn ON/
RESET, có nước không resume; backend/web nhận lý do WATER_LOW. Legacy config
được giữ nguyên, cần thêm flag và rebuild/merge ảnh flash để thử.

Cloud: 104 backend, 10 browser safety, 4 unit safety, 7 Python contracts đạt;
native RelaySafety và build ESP32 control=1/phao=1 + legacy thiếu flags mới,
3 kiểm tra sơ đồ tĩnh và smoke UI/API/DB reservoir_smoke GET-only đạt, command0/
run0/history1 giữ nguyên; lint/build đạt. Cache cả từ chối lúc cạn để duplicate
RESET sau thêm nước không tự mở khóa. Python lần
đầu thiếu format validator gây ca timestamp fail; cài pin requirements rồi
chạy lại, không đổi test để né lỗi. Không AWS/GPIO live mới; tiếp điểm relay có
mâu thuẫn trong tài liệu Wokwi, cần thử cực tính. NVS/flow/cảnh báo phao riêng
chưa làm. Xem [chương21](CHAPTER_21_RESERVOIR_INTERLOCK.md) và
[báo cáo](../implementation/RESERVOIR_INTERLOCK_REPORT.md).


## 14/10/2026 — Ưu tiên nông nghiệp: khung giờ tưới theo tuần

Người dùng ưu tiên chức năng IoT trong canh tác trước. Từ df0c923 thêm V13:
calendar ANY_TIME/TIME_WINDOWS, timezone VN, tối đa8 khung theo ngày ISO.
Không tạo dispatcher riêng tranh relay: rule đất khô dùng cùng mutex/gate,
source sample phải trong khung, kiểm tra lại trước publish. Hết khung yêu cầu
OFF, vẫn đợi ACK/status, không bỏ timer/cooldown/manual hold. Run ghi revision/
bounds lịch trước publish; legacy null. Mặc định giữ cả ngày, rule startup vẫn tắt.

UI chọn thứ/giờ, preview giờ VN, overnight và validation chồng sang ngày/tuần,
giữ draft và CAS revision. Sửa chỉ khi rule tắt/no active run; unknown response
không retry, không tự bật rule khi lưu. Có thể tưới nhiều đợt trong khung nếu
đất khô; không coi độ dài khung là runtime liên tục. Backend phải chạy.

103 backend tests cuối đạt không skip;33 browser automation và20 unit client,
lint/build đạt. Một fixture static mock lúc đầu làm helper validation trả
mặc định; sửa chỉ mock evaluate, giữ validation thật. Rà soát thêm nhãn chờ
mẫu trong khung và snapshot tại thời điểm kiểm tra ngay trước dispatch.
Smoke App/API/PostgreSQL lưu thứ2/4/6 05:30–05:45; browser NewYork vẫn hiển thị
VN. Mode/revision/windows giữ nguyên sau restart; rule/MQTT/control tắt và
command0. Không AWS/Wokwi/GPIO live mới. Chương20 và IRRIGATION_CALENDAR_REPORT
hướng dẫn thử trên Windows; không sửa IAM/firmware hoặc mở rộng đa thiết bị.


## 14/10/2026 — Xác nhận đã xem và ghi chú cảnh báo

Từ1138a75 thêm V12, GET alert theo ID và PUT acknowledgement. Transaction row
lock giữ ghi chú/timestamp đầu tiên; retry đúng note trả cùng kết quả, note
khác409. ACK không thay clear/state watermark/rule/relay. Incident tái phát
không kế thừa ACK. Không gán actor từ AppContext vì backend chưa authentication.

UI chi tiết độc lập list100, giữ draft qua polling, tách bộ lọc condition/seen.
Unknown outcome khóa gửi lại và yêu cầu GET đối chiếu. Cả note khác ở tab khác,
clear khi thao tác hoặc rơi khỏi100 đều có đường đọc lại; không success giả.
EventLog có ALERT_ACKNOWLEDGED dùng giờ backend, không giả timestamp/correlation
thiết bị. Dashboard/monitoring vẫn đếm tất cả incident active.

Lượt đầu88 tests có1 lỗi: Jackson ép123 thành String. Kiểm tra kiểu JSON trường
note sửa đúng lỗi, giữ validation unknown fields. Browser đầu trượt labelselect
và thứ tự event text; sửa aria-label/selector và chạy lại. Cuối88 backend,
9 browser alert+8events+8dashboard,17 unit frontend đạt không skip; lint/build đạt.
Smoke App/API/PostgreSQL lưu ACK, giữ active/count2/event, metadata còn nguyên sau
restart. MQTT/control tắt, không AWS command; Windows/Wokwi bản mới còn chờ.
Chương19 và ALERT_ACKNOWLEDGEMENT_REPORT ghi phạm vi, bằng chứng và cách cập nhật.


## 14/10/2026 — An toàn Fail-Safe & Edge bỏ dữ liệu mẫu

Từ 814f0a4, thay trang rules/gateway/OTA mẫu bằng GET /api/v1/safety. Không
báo OTA thành công bằng timer, không giả lưu lượng/mực nước hoặc flash usage.
Snapshot DB read-only REPEATABLE_READ, đọc rule/settings V11 và stateReason
đã nhận. Không gọi commands() có side effect expire, không pause/publish.

Tổng queue độc lập10 problems preview/20 commands cũ; overdue chỉ tính toán,
không đổi trạng thái DB. UI15s tách trạng thái hiện tại với bản cũ, thiếu status
không suy OFF/không khóa. API lỗi bỏ khẳng định current; polling không hồi sinh
mẫu cũ. Ba nút mở Control/Automation/Events chỉ navigate. Reason không được suy
ra từ nút bấm, không hứa MQTT/device online hoặc GPIO thực thi từ snapshot.

78 backend tests đạt, thêm6 safety integration;9 browser fixtures và14 unit client
đạt không skip; lint/build đạt. Smoke App/API/PostgreSQL thật trong safety_smoke,
MQTT/control tắt, seed mất kết nối cũ và run chưa OFF. Sau xem trang, DB vẫn giữ
PUBLISH_UNCERTAIN/STOP_UNCONFIRMED/active command. Không command phát ra cloud.
Chương18 và SAFETY_OVERVIEW_REPORT ghi kiểm tra, cách chạy Windows và giới hạn.
Không migration/IAM/firmware/dependency mới; AWS/Wokwi live còn chờ nghiệm thu.


## 14/10/2026 — Cài đặt tưới và bảo vệ bản nháp

Tiếp tục từ b9cc51b. Thêm V11 giữ mặc định 30/35/20/60 và cấu hình có phiên bản.
API chỉ cho sửa khi rule tắt và không có active run, không phát MQTT khi lưu.
Scheduler dùng ngưỡng/thời gian đã lưu; mỗi run ghi cấu hình trước publish.
Run cũ để metadata null, không gán dữ liệu không có bằng chứng. Khoảng nghỉ đang
có giữ nguyên deadline khi sửa; cấu hình mới dùng cho lần sau. Alert giữ ngưỡng riêng.

UI giữ bản nháp qua polling, chặn bật khi chưa lưu, phát hiện revision đổi từ
tab khác. PUT chưa rõ kết quả khóa gửi lại và yêu cầu GET đối chiếu; không suy
thành công từ HTTP 200 sai body. Thêm khóa sửa khi run chưa xác nhận OFF, kể cả
sau backend restart. Tận dụng Jackson strict sẵn có thay vì thêm parser riêng.

72 backend tests, 24 browser fixtures automation, 11 unit client đạt không skip;
lint/build đạt. Smoke App/API/PostgreSQL test lưu và đọc sau restart, MQTT/control
tắt, không gửi command hoặc bật rule. Migration V10 → V11 giữ run/boot/sequence,
không mất dữ liệu cũ. Chương 17 và WATERING_SETTINGS_REPORT mô tả kiểm tra và giới hạn.
Windows/AWS/Wokwi dùng ngưỡng mới chưa nghiệm thu; không đổi firmware/IAM/NVS.


## Tổng quan IoT dùng dữ liệu backend

Từ bbbd231, thay IoTDashboard mock bằng GET /api/v1/dashboard/overview, chỉ
đọc. Ghép monitoring, registry/areas, alert, rule state và Event Log. Read-only
REPEATABLE_READ giữ tổng/preview nhất quán trong DB. Không gọi command timeout,
không quick-toggle hoặc bật rule từ dashboard. PUMP01 không tính là cảm biến.
Trung bình khu vực chỉ dùng sensor có số đo mới trong 30 giây, mẫu cũ không làm sai trung bình,
không còn mẫu mới trả dấu —. Rule vẫn dùng 15 giây; không nới safety gate.

Preview 5 alert khác tổng tất cả alert, 8 sự kiện trong 24 giờ phân biệt giờ nguồn và
backend. API lỗi không giữ khẳng định trạng thái hiện tại. Không tạo số pin,
pH, van hoặc lưu lượng giả. Không đổi schema/firmware/IAM/dependency.
Cloud: 64 backend tests đạt không skip; 7 browser fixtures và 9 unit frontend đạt;
full-app smoke qua menu/proxy/Spring/PostgreSQL thật đạt, MQTT/control=false.
Nghiệm thu automation/GPIO vẫn tách riêng, không đánh dấu từ seed/fixtures.
Chương16 và báo cáo IOT_DASHBOARD_REPORT ghi cách chạy và giới hạn.

## Giám sát registry, dữ liệu và kết nối backend

Tiếp tục từ070e37d: thay DeviceMonitor mock bằng GET /api/v1/monitoring.
Không tự thêm IAM hoặc subscription heartbeat. Màn phân biệt MQTT backend,
độ mới sensor30s/relay15s, hoạt động bản tin đã lưu trong30s và cảnh báo mở.
Không suy luận mất Wi-Fi/nguồn từ thiếu số đo. Bản tin cũ đến muộn cập nhật
lastMessageAt nhưng không thay số đo nguồn mới hơn. UI dùng server time cộng
monotonic elapsed, API lỗi không được giữ nhãn connected hiện tại; relay cũ
chỉ hiển thị ON/OFF lần trước và trạng thái hiện tại Chưa xác định.

MqttHealth version tránh subscription cũ ghi đè disconnect; queue đã nhận
trước disconnect không được tự coi là reconnect. Không thay rule gate15s,
cutoff hoặc publish control. Không migration/dependency mới. Cloud61 Java
với DB test riêng đạt,7 browser fixtures giám sát và6 unit client đạt;
full-app smoke qua API/DB thật với MQTT/control=false đạt. Không có AWS/GPIO.
Selector fixture exact text ban đầu không khớp cell chứa timestamp; sửa và
chạy lại7/7. Chương15 ghi rõ giám sát bản tin khác chứng minh online/offline.

## Cloud tiếp quản commit 3d8bcd9 và triển khai nhật ký sự kiện

Người dùng push toàn bộ bàn giao local lên feature branch. Cloud fast-forward
từ 943d22a đến 3d8bcd9, giữ cấu hình Wokwi và các file người dùng đã commit.
Nhánh fetch chỉ cập nhật FETCH_HEAD do refspec checkout; merge FETCH_HEAD sau
khi đối chiếu SHA, không reset hoặc force. Event Log chưa nằm trong bản push,
vẫn dùng iotEventLogs mock, nên hoàn thiện trước các chức năng khác.

GET /api/v1/events tổng hợp alert mở/đóng, command tạo/ACK, pump state history
và watering run. Cursor theo timestamp+ID, range cố định, lọc category/device;
chỉ đọc DB, không gọi command timeout hoặc publish. Không cần migration mới.
Command/run hiển thị kết quả hiện đang lưu chứ không dựng lịch sử chuyển
trạng thái đã không được lưu. Alert chỉ có thời gian thiết bị; ACK chỉ có
thời gian backend nhận, không bịa timestamp hoặc liên kết theo giờ gần nhau.

Cloud: PostgreSQL test container riêng cổng 55439, không dùng DB demo 5433.
52 Java tests đạt không skip; 13 browser fixtures automation và 7 fixtures
Event Log đạt; 3 unit telemetry đạt; lint/build đạt. Smoke toàn app qua menu,
Vite proxy, Spring Boot và DB event_smoke riêng đạt với MQTT/control=false.
Không có lệnh AWS hoặc GPIO trong lượt kiểm tra. Mẫu UI test phải dùng type
IoTEvent để nullable fields đúng, lỗi typecheck ban đầu đã sửa rồi chạy lại.

Người dùng trước đó xác nhận bật tự động hoạt động, chưa có chi tiết cho sáu
ca nghiệm thu. Không đánh dấu OFF sớm/cooldown/restart là live PASS. Sách cập
nhật số liệu mới, giữ các báo cáo local cũ làm bằng chứng lịch sử.

## 14/10/2026, 00:49 +07 — Chuẩn bị phép thử tưới nhóm 1

Theo yêu cầu tiếp theo của người dùng, đã chạy backend bằng Git Bash mới,
loại biến DB test trước khi helper nạp cấu hình runtime. Flyway nâng DB demo
V9→V10, không xóa dữ liệu; backend subscribe AWS thành công. API rule trả
enabled=false, RESTART_PAUSED, không active command. Frontend chạy cổng 3000.
PUMP01 vẫn UNKNOWN/fresh=false, telemetry cuối đã cũ; gateway 9011 chưa chạy.
Agent không có công cụ thao tác Wokwi/quan sát LED, chưa bật rule hoặc gửi
control. Chỉ xác nhận quy tắc tắt sau startup ở API; ON/ACK/OFF sớm/cooldown
live vẫn chờ người dùng thực hiện. Helper verify ở môi trường live chạy 4
unit tests đạt, 37 integration tests skip; không thay thế lượt 41/41 local
trước đó. Chi tiết bổ sung ở cuối LOCAL_CODEX_REPORT.md. Chưa commit/push.

## 14/10/2026 — Rà soát sách và cập nhật xác nhận của người dùng

Người dùng xác nhận cảnh báo đất thấp và nhiệt độ cao mở/đóng đúng ngưỡng.
Quy tắc tưới tự động chưa nghiệm thu đầy đủ trên AWS/Wokwi thật. Phiên biên
tập này không chạy code/tests hoặc truy cập AWS/Wokwi; không lấy code đang
được agent khác sửa làm nguồn cập nhật hành vi trong sách.

Bổ sung [hướng dẫn Windows](WINDOWS_RUNBOOK.md),
[bảng bằng chứng](ACCEPTANCE_STATUS.md) và phần tổng hợp trong sổ lỗi.
Restart simulator mất trạng thái RAM; NVS chưa làm. Các mục chờ xác nhận
phía dưới phản ánh thời điểm lịch sử, cần đọc cùng bảng bằng chứng hiện tại.

## 14/10/2026 — Audit local quy tắc tưới và thứ tự ACK/status

Theo xác nhận người dùng: telemetry Wokwi lên Sensor Realtime, điều khiển thủ
công/timer/lịch sử trạng thái, lịch sử cảm biến, cảnh báo LOW_SOIL 30/35 và
HIGH_TEMPERATURE 35/33 hoạt động; firmware có `RELAY_OFF reason=CONNECTION_LOST`.
Đây là bằng chứng người dùng cung cấp, không phải lần kiểm tra live của audit này.

Phát hiện scheduler chỉ lấy latest có thể bỏ qua mẫu ướt giữa hai mẫu khô.
Sửa đọc các mẫu chưa xét theo thời gian, lưu boot/sequence bằng migration V10;
đổi boot làm đếm lại, timestamp/sequence cũ không tăng đếm. OFF heartbeat sau
thời điểm gửi chưa đủ chứng minh OFF đã thực thi. Nay cần status OFF cùng boot
có sequence lớn hơn ACK EXECUTED; khi thiếu ACK, chỉ chấp nhận OFF mới sau
`expiresAt + durationSeconds` của ON (TTL 10 giây cộng runtime 20 giây).
Khoảng nghỉ 60 giây bắt đầu khi backend xác nhận OFF, không bắt đầu từ PUBACK.

Publish chưa rõ kết quả trước đây làm mất commandId trong rule/run. Nay giữ ID,
tạm dừng và chỉ thử OFF một lần; chưa xác nhận OFF vẫn giữ lần chạy. Startup
tạm dừng được tách khỏi scheduler có điều kiện MQTT: cả boot không bật MQTT
cũng không giữ enabled từ DB. ACK SUCCESS sai reportedState bị từ chối;
status khác boot có timestamp bằng nhau không được thay trạng thái hiện tại.
UI tiếng Việt bổ sung lý do nghỉ/chờ lệnh/thiết bị/khóa an toàn/mẫu mới và ACK
thực thi, đồng thời xóa thông báo lỗi cũ khi polling đã phục hồi.

Kiểm tra local Windows: PostgreSQL 16.15 container riêng cổng 55439, DB
watering_test, schema telemetry_test; transport mock, MQTT tắt. Maven verify
đạt 41 tests, 0 failures/errors/skip; frontend lint/build đạt. Lượt đầu 37 tests
đạt trước khi bổ sung các ca hồi quy cuối. Wrapper PowerShell lỗi Target[0]
trên thư mục thường được sửa. Không truy cập DB demo, không phát lệnh AWS,
không đổi IAM, không đọc secrets, không commit/push. Chưa nghiệm thu automation
AWS/Wokwi thật; NVS và phục hồi mạng simulator vẫn để sau. Báo cáo đầy đủ:
[LOCAL_CODEX_REPORT](../implementation/LOCAL_CODEX_REPORT.md).

## Quy tắc tưới Wokwi ENV01 → PUMP01

Người dùng xác nhận cảnh báo ngưỡng hoạt động và đồng ý làm automation.
Một template cố định: hai mẫu mới dưới 30%, cách nhau không quá 15 giây,
gửi ON 20 giây; đất đạt 35% gửi OFF sớm. Nghỉ 60 giây sau trạng thái OFF mới.
Migration V9 lưu state/run và commandId. Trang Quy tắc Tự động hóa dùng API
thay builder mock. Mặc định tắt; restart backend tạm dừng; thao tác thủ công
qua API tạm dừng trước dispatch. Scheduler chạy mỗi 2 giây khi MQTT enabled.

PumpService giữ kiểm tra ACK, pending, causal status và TTL. ON thất bại hoặc
không xác nhận thì tạm dừng, không tự thử lại ON. Theo dõi command trực tiếp
bằng ID, không phụ thuộc 20 lệnh mới nhất. OFF thử một lần rồi chờ status OFF
mới, không gửi dồn. Nếu OFF chưa xác nhận, operator kiểm tra Actuator; thiết
bị vẫn có cutoff 20 giây. Chỉ hỗ trợ một backend process, chưa nhiều instance.

Cloud: 28 Java tests với PostgreSQL đạt, gồm hai mẫu mới, pending, manual,
restart, thất bại gửi lệnh, đất đủ ẩm, khoảng nghỉ và dữ liệu cũ. Transport MQTT
được mock, chưa nghiệm thu live. Foreign key V9 yêu cầu fixture pump truncate
thêm watering state/run; chỉ sửa dữ liệu test. UI enable/disable, lint/build đạt.
Chờ Wokwi soil 45 → 28 → 35, GPIO, ACK và run history thật. NVS để sau.

## Cảnh báo đất thấp và nhiệt độ cao từ telemetry thật

Người dùng xác nhận trang lịch sử cảm biến hoạt động; chưa có bằng chứng CSV
live riêng. Tiếp tục cảnh báo, không tự điều khiển relay. V8 lưu state và incident
PostgreSQL; chỉ sample newly inserted, timestamp mới trong30s và không tương
lai>2s được evaluate trong transaction cùng insert telemetry. Duplicate không
trigger; timestamp <=watermark không cập nhật alert. Ngưỡng đất<30 mở, >=35
đóng; nhiệt>35 mở, <=33 đóng. Không backfill alert từ history cũ. Không có
email/SNS, ngưỡng cố định MVP, chưa có UI sửa ngưỡng hay acknowledge.

Row lock và unique active(device,type) ngăn incident trùng, state bền vững
qua restart. Không nhận telemetry không tự clear cảnh báo. UI poll API5s,
100 incident ưu tiên active; dữ liệu cũ báo lỗi nếu backend mất.
Test phát hiện precision timestamp Java nanoseconds/DB microseconds có thể
coi sample timestamp giống nhau là mới: normalize watermark milliseconds,
rerun đạt. Lần chạy lặp phát hiện test history cũ không xóa history khi reset
fixture nên chạm giới hạn50; thêm truncate bảng test history, không xóa dữ liệu
ứng dụng hoặc thay giới hạn API. Cloud: 23 Java tests PostgreSQL đạt, frontend lint/build và
Playwright active/cleared/filter/empty/error đạt. Không có live AWS trong test.
Chờ người dùng hạ soil<30 rồi tăng>=35 và thử nhiệt36→33 trên Wokwi.

## Chuyển lịch sử cảm biến từ mock sang dữ liệu PostgreSQL

Người dùng muốn chuyển chức năng khác; phần NVS/offline recovery để sau.
Bằng chứng trước: serial RELAY_OFF reason=CONNECTION_LOST xác nhận xử lý
mất mạng; gateway restart không phục hồi DNS/Wi-Fi của phiên Wokwi, phải
restart simulation. Chưa kiểm chứng gửi lý do sau reconnect không reboot.
Không ghi nhận hoàn tất kiểm tra toàn bộ network recovery.

Trang /iot/history nay dùng registry/API telemetry thay dữ liệu SM-01 mock.
Chọn sensor, 1h/24h, nhiệt độ/độ ẩm/đất; biểu đồ timestamp thực, thống kê mẫu
đã tải và CSV cùng mẫu. Không dùng parseHistory realtime vì hàm đó cắt 15 mẫu.
Giới hạn API1000: cảnh báo mẫu mới nhất có thể không bao phủ toàn khoảng24h,
không gọi thống kê toàn ngày. Khoảng trống >30s không nối đường, không nội suy.
Load/error/empty riêng; refresh thủ công, không thêm poll AWS hay quyền mới.
Cloud validation: frontend lint/build đạt; Playwright fixture kiểm tra query
range, chart, CSV có3 dòng mẫu, empty/error và disabled export đạt. Không
đọc dữ liệu AWS live trong phép thử này.
Chờ kiểm chứng live lịch sử và CSV trên Windows.

## Lý do trạng thái do firmware báo

Người dùng xác nhận có lịch sử trạng thái sau bản V6. Bổ sung stateReason
trên topic PUMP01/status hiện có; không thêm quyền AWS. BOOT, COMMAND_ON,
COMMAND_OFF, LOCKOUT_RESET, TIMER_EXPIRED, CONNECTION_LOST, DEVICE_FAULT.
Backend kiểm tra enum, V7 lưu lý do trong status/history. Firmware cũ không
có field vẫn được nhận, lịch sử cũ giữ null thay vì đoán lý do.

Timer callback cắt GPIO ngay, gửi nguyên nhân qua latch cho Arduino loop;
tách timer cutoff khỏi network fault để hết giờ không bị khóa an toàn.
Mất MQTT khi GPIO đang ON cắt ngay, loop khóa và giữ CONNECTION_LOST;
status sau reconnect mang lý do. Không có status trong lúc offline, không
cam kết nhật ký bền vững trên thiết bị: reboot lúc offline có thể mất lý do.
Nhiều thay đổi nhanh trước status có thể chỉ ghi được trạng thái cuối cùng;
chưa phải event outbox bảo đảm mọi sự kiện. Không thay TTL/dedup/cutoff.
Cloud checks: 19 Java tests với PostgreSQL đạt, native safety assertions đạt,
frontend lint/build và UI fixture hiển thị lý do đạt, ESP32 build SUCCESS.
Thời điểm status là lúc báo, không phải timestamp sự cố offline.
Chờ user kiểm tra live timer/manual/network sau build và merge lại firmware.

## Người dùng xác nhận công tắc/hẹn giờ; thêm lịch sử trạng thái

Người dùng báo kiểm tra công tắc và hẹn giờ thành công trên Windows/Wokwi.
Không có log chi tiết mới để chứng minh runtime 60 phút; ghi nhận là user-reported.
Backend khởi động thất bại từng gây Vite ECONNREFUSED 8080; người dùng sau đó
xác nhận chạy thành công, nguyên nhân lỗi startup chưa có stack trace.
MQTT từng ngắt errno119 rồi tự kết nối lại/PUBACK, chưa xác định nguyên nhân.

Migration V6 thêm lịch sử thay đổi status: lần đầu, ON/OFF/lockout đổi,
boot mới. Trigger PostgreSQL ghi cùng transaction với status đã được kiểm tra
thứ tự; heartbeat và packet trùng không tạo thêm sự kiện. API /history trả
50 thay đổi mới nhất, UI hiển thị; lỗi lịch sử không chặn nút OFF.
Cloud: 18 Java tests pass với PostgreSQL, trong đó test history kiểm tra
transition, heartbeat và packet trùng; frontend lint/build và UI fixture pass.
Chưa kiểm tra history live trên Windows.
Không suy luận nguyên nhân timer/mạng từ status. Sự kiện lý do trực tiếp từ
firmware vẫn là bước tiếp theo, chưa triển khai ở bản này.

## Công tắc từ xa và hẹn giờ tắt tối đa 60 phút

Người dùng xác nhận bật/tắt và timer 3 giây hoạt động trong Wokwi sau bản sửa
clock. Yêu cầu tiếp: công tắc từ xa và hẹn giờ tắt mở rộng. UI thêm switch
chỉ phản ánh reportedState mới; không đổi ON lạc quan khi POST thành công.
Hẹn giờ theo giây/phút, 1..3600 giây. Bỏ chọn hẹn giờ gửi ON 3600 giây:
có thể tắt thủ công và vẫn có cutoff an toàn 60 phút; không phải ON vô hạn.
Thay đổi cài đặt chỉ áp dụng lần bật tiếp theo, không gia hạn lệnh đang chạy.

Backend/schema/firmware nâng cùng giới hạn 3600; migration V5 thay constraint
DB, không sửa V3 đã triển khai. Runtime dùng monotonic/esp_timer; TTL nhận
lệnh vẫn 10 giây, không đồng nghĩa thời gian bật. Mất kết nối vẫn OFF/lockout.
Cloud validation: 17 Java tests pass với PostgreSQL (không skip), 10 Python
contract tests pass; native timer test kiểm tra cutoff 3600 giây; firmware
và frontend build pass. UI fixture kiểm tra switch, đổi phút và cutoff mặc định;
không publish AWS.
Firmware cũ từ chối thời gian trên 30 giây: phải build/merge/restart firmware
trước khi thử thời gian dài. Chưa xác nhận live tính năng mới này.

## Wokwi clock chậm 7–9 giây: NTP và dung sai mô phỏng

Người dùng ghi nhận age=-7 và -9, ON bị CLOCK_SKEW, GPIO vẫn OFF.
Backend và MQTT đã chuyển lệnh; chưa xác nhận nguyên nhân clock chậm do máy host
hay thời gian mô phỏng. Firmware yêu cầu SNTP cập nhật mỗi 15 giây thay vì
chỉ dựa vào lần sync đầu. Thêm FARM_WOKWI_CLOCK_TOLERANCE_SECONDS mặc định 2,
chỉ dùng khi SSID Wokwi-GUEST; có thể đặt 10 cho mô phỏng. Compile từ chối
ngoài 0..10; lớp safety cũng clamp tối đa 10. Đây là dung sai thử nghiệm,
không chứng minh clock đã đúng và không phải cấu hình cho bơm thật.

Kiểm tra native: mặc định từ chối tương lai 9 giây; cấu hình 10 cho phép 9,
từ chối 11; expiry vẫn bị kiểm tra; ON 3 giây tự OFF theo monotonic timer.
Timer độc lập và giới hạn duration không thay đổi. Chờ kiểm tra LED/ACK trực tiếp.

## Wokwi nhận ON nhưng từ chối thời gian

Người dùng cung cấp serial COMMAND_EXECUTED action=ON state=OFF result=EXPIRED.
Xác nhận packet đến command handler và output không bật. Code trước gộp lỗi
clock chưa sẵn sàng, issuedAt tương lai, lifetime sai và expiry thực vào EXPIRED;
chưa thể kết luận packet đến muộn. Tách CLOCK_NOT_READY/CLOCK_SKEW/
INVALID_LIFETIME/EXPIRED và thêm log epoch UTC đã parse, age/remaining; không
in keys hoặc raw payload. Giữ TTL và giới hạn relay, chờ log runtime mới.

## Windows control build đạt, merge thiếu LittleFS image

Người dùng gửi log firmware SUCCESS sau67.20s; RAM15.0%, flash74.2%. Merge
FileNotFoundError cho .pio/build/esp32dev/littlefs.bin. Không biết chính xác
vì sao artifact mất; firmware build không bảo đảm giữ filesystem output.
Hướng xử lý: buildfs từ data/certificate hiện có rồi merge; không tạo cert mới.
Warning FARM_CONTROL_ENABLED redefined do fallback trước include local config;
dời fallback xuống sau include. ArduinoJson containsKey deprecated được đổi
sang isUnbound để vẫn từ chối durationSeconds=null trên OFF/RESET. Chưa control
live và chưa có output buildfs/merge sau sửa của người dùng.

## Relay Wokwi — code/tests; chưa control live

Người dùng hoãn provisioning sensor mới và đồng ý tiếp tục command/ACK cho
ENV01/PUMP01. Thêm API command/status/history, V3 persistence, bounded ON1..30s,
TTL10s, fresh-OFF gate, ACK correlation, PUBLISH_UNCERTAIN và timeout không tự
suy ra trạng thái relay. Backend mặc định control disabled; telemetry vẫn dùng
policy đọc hiện có nếu không bật flag. Khi control enabled, thêm status/ACK
subscriptions, publish command non-retained và resubscribe sau reconnect.

Firmware control mặc định disabled, chỉ ENV01/FARM001. LED GPIO26, queue trong
loop, retained/expired command rejection, dedup cache và esp_timer cutoff độc
lập, mất link đang ON→OFF/lockout, RESET khi OFF. Cache đầy vẫn cho OFF. Lockout
RAM không persist reboot; boot OFF. Chưa safety event publisher hoặc rule engine.

PlatformIO Linux compile đạt (variant enabled cũng đạt); native C++ assertions
đạt, 16 Java tests PostgreSQL đạt (transport mock), lint/build/browser UI fixtures
đạt. Local HTTP pump status disabled trảUNKNOWN. Mirror proxy403 được fallback
thành công, không tắtTLS. Chưa có AWS publish control hoặc Wokwi GPIO runtime
evidence. Viết chương10 với hướng dẫn managed IAM policy để tránh inline quota,
flags/rebuild và nghiệm thu3s. Không provision thêm device/certificate.

## Sensor theo khu vực — implementation và cloud verification

Người dùng yêu cầu thêm sensor và quản lý nhiệt độ theo khu vực, rồi đồng ý
triển khai. Migration V2 tạo registry area/device, gắn ENV01 vào AREA001,
giữ readings cũ và thêm foreign key. API hỗ trợ list/create/metadata; summaries
lấy latest bằng lateral join. Validator mở deviceId theo pattern; ingest
subscribe +/telemetry, đối chiếu topic/payload với registry và từ chối thiết bị
chưa đăng ký hoặc sai farm. Schema telemetry v1 giữ tương thích payload ENV01.

UI thêm khu vực/sensor, lọc khu vực, chọn sensor để xem chi tiết/lịch sử và các
trạng thái pending/error/freshness. Panel remount theo deviceId để tránh giữ
số đo của sensor trước. ENVIRONMENT v1 vẫn yêu cầu cả ba chỉ số; chưa hỗ trợ
sensor loại khác, edit/delete hoặc nhiều farm. Registry backend chưa đồng bộ
với các khu vực mock cũ. Form đăng ký không provision certificate AWS.

Cloud: 10 Java tests trên PostgreSQL 16.15 đạt, gồm migration V1→V2 giữ sample
cũ, tách reading từng device và validation registry/topic. 10 Python tests,
3 Node tests, lint/build đạt. Browser dùng API/database thật trong schema riêng:
tạo khu vực/sensor, pending, lọc, reading từ fixture SQL, đổi sensor không lẫn
số, lỗi mã trùng; không có page errors. Freshness smoke cũng đạt. Locator trong
harness được sửa để scope history và select; không kết luận đó là lỗi AWS.

Người dùng cần cập nhật SmartFarmBackendRuntime trước startup: Subscribe
FARM001/+/telemetry và Receive FARM001/*/telemetry. Helper render_telemetry_iam.py
chỉ tạo policy offline; không mở wildcard cho certificate ENV01. Chưa cập nhật
IAM trên AWS, chưa provision ENV02 hoặc xác nhận nhiều thiết bị live trên
Windows. Chương 9B có hướng dẫn rollout, giữ volume/db.env/certificate hiện có.

## Windows frontend — người dùng xác nhận chạy thành công

Sau cập nhật Sensor Realtime dùng API, người dùng báo “đã chạy thành công”.
Ghi nhận frontend local hoạt động theo xác nhận này; API live đã có bằng chứng
ở mốc trước. Chưa có kết quả riêng cho sensor variation, Stop Wokwi→stale,
backend outage→error và recovery trên Windows; không coi tất cả đã nghiệm thu.
Các trạng thái đó đã được kiểm tra bằng browser fixtures trong cloud. Tiếp theo
là command/ACK/an toàn relay theo kế hoạch; chưa có điều khiển actuator live.

## 13/10/2026 — React Sensor Realtime dùng API backend

Thay màn hình HiveMQ trực tiếp bằng latest/history API PostgreSQL; ba card
nhiệt độ/độ ẩm/đất, timestamp nguồn/receivedAt, trạng tháifresh/stale/empty/error
và history15 readings. Bỏ controls browser publish mock và guide HiveMQ cũ
trong màn hình này; không thay đổi dependency declarations/lockfile ở bước này.
Vite proxy/api→127.0.0.1:8080. Poll5 giây sau request, timeout8 giây, abort
unmount; clock freshness30 giây; không đồng nhất freshness với LWT/online.

Lint/build đạt,3 Node/tsx tests đạt. Browser fixture scenarios fresh/stale/503
cached/invalid/empty/recovery/dedup đạt, không page errors. Lỗi smoke glob đầu
không bắt /latest được sửa trong harness rồi chạy lại. Proxy thật đến app/DB
trống trả history[]/latest404 đúng. Cloud MQTT disabled, frontend live Windows
chưa xác nhận. Thêm chương9; các màn hình/topbar khác vẫn có mock. Không claim
WebSocket push hoặc full dashboard đã chuyển sang dữ liệu thật.

## 13/10/2026 — Windows live AWS → PostgreSQL → API xác nhận

Người dùng gọi GET /api/v1/devices/ENV01/telemetry/latest bằng curl --fail và
nhận reading id5, farmIdFARM001, deviceIdENV01, schemaVersion1, sequence15,
timestamp2026-10-13T09:06:14Z, temperature24, humidity40, soilMoisture100,
uptimeMs64419; receivedAt2026-10-13T09:06:19.775305Z. bootId có dạng UUID.
Đây là bằng chứng dữ liệu live qua ingest/storage/read API trên Windows theo
đầu ra người dùng; không phải fixture cloud. Chênh timestamp nguồn và receivedAt
khoảng5.775 giây trong sample, không coi là đo độ trễ mạng chuẩn vì clock và
simulation timing chưa được đối chiếu. Chưa có sample sau đổi sensor, history,
restart persistence hoặc frontend API integration từ người dùng.

## Windows PostgreSQL Healthy — Docker không còn chặn triển khai

Người dùng cung cấp output `docker compose --env-file .local/postgres/db.env
up -d --wait postgres`: image postgres:16-bookworm pulled, network và volume
được tạo, container smartfarm-mvp-postgres-1 Healthy. Xác nhận engine/Compose
hoạt động và database sẵn sàng trên Windows. Không có bằng chứng chính xác
người dùng đã dùng cách sửa WSL/PATH nào; không suy ra cách sửa cụ thể.
Tiếp theo chạy run_backend_windows.sh với Wokwi/gateway đang chạy và probe cũ
đã dừng, quan sát migration/subscription/TELEMETRY_SAVED, rồi gọi API latest.
Chưa có bằng chứng ingest hoặc API có dữ liệu trên Windows trong mốc này.

## 13/10/2026 — Docker Windows đang chặn triển khai; viết sách song song

Người dùng yêu cầu vừa làm vừa viết sách. Đã bắt đầu bản thảo chương8, dẫn chiếu
runbook, ghi lý do kiến trúc và các lỗi thực tế thay vì chỉ lưu checklist.
Docker installer báo thiếu Virtual Machine Platform, per-user installation
không bật được vì cần admin; đã hướng dẫn WSL/features/restart, chưa có output
xác nhận fix. Sau đó init database helper tạo private db.env thành công nhưng
Git Bash gọi docker ở đường dẫn per-user không tồn tại. Hướng dẫn reopen terminal,
hash-r, where.exe docker, thử Program Files PATH nếu đúng vị trí. Chưa xác nhận
Docker Client/Server hoặc container healthy trên Windows. Không cần tạo lại
db.env; chưa chạy được ingestion DB/API live ở máy người dùng.

## 13/10/2026 — PostgreSQL local, ingestion và read API

Người dùng xác nhận có Docker và cho phép tiếp tục implementation. Thêm
Compose PostgreSQL16 (loopback5433, volume giữ dữ liệu), password ngẫu nhiên
trong ignored private .local/postgres/db.env, Flyway V1, telemetry validator,
MQTT subscription liên tục, JDBC INSERT ON CONFLICT chống trùng và API
latest/history trên loopback8080. API chưa có authentication, chỉ cho local.
Validator từ chối trường lạ/thiếu, numeric coercion, UUID/time sai, số vượt range,
duplicate JSON keys và timestamp tương lai quá60 giây. History tối đa 31 ngày,
limit 1..1000, source-time ordering; device cố địnhENV01/FARM001.

Cloud Docker đã chạy PostgreSQL thật. Lần kiểm tra đầu tiên chạy khi image còn
đang tải nên test context lỗi Connection refused; chờ Compose healthy rồi chạy
lại đạt7 Java tests (0skip): 3validator, 3DB/API và 1probe config. Test DB ở schema
telemetry_test, gồm8 insert đồng thời cùng identity chỉ có1 reading. 10 Python
tests đạt sau bổ sung exact-topic subscribe trong renderer. App jar khởi động,
Flyway public migration đạt, HTTP history[] và latest404 đúng khi chưa có dữ
liệu. MQTT disabled trong cloud smoke vì không có credentials live tại đây.

Hướng dẫn Windows: docs/implementation/LOCAL_TELEMETRY_BACKEND.md; init helper
ghi LF để Git Bash source password không dính CR. Chạy DB healthy rồi
run_backend_windows.sh, không chạy song song probe cùng clientID. Người dùng
chưa chạy bản persistence trên Windows; AWS→PostgreSQL→HTTP live chưa xác nhận.
Queue128 là volatile, DB error/queuefull có thể mất gói và được log; PUBACK không
đảm bảo DB commit. Chưa claim durable replay/exactly-once, reconnect-outage
recovery, frontend realtime hoặc actuator ACK.

## 13/10/2026 15:27:46 (Việt Nam) — Gate kết nối 5 phút đạt

Người dùng cung cấp toàn bộ output Windows: PROBE_SECONDS=300, Maven verify
BUILD SUCCESS và 1 test đạt, WSS_PUBACK_ECHO_PASS, TELEMETRY_PACKETS=60,
exec BUILD SUCCESS sau khoảng 5:02 phút. Gate số lượng gói đạt ngưỡng 58.
Luồng simulator → AWS IoT → backend local được quan sát 5 phút. Probe hiện
đếm callback, không kiểm chứng uniqueness/schema hoặc tính tỷ lệ mất gói.
Không suy ra độ ổn định production hoặc full Day1 security-deny tests đã đạt.
Chưa có payload/biến thiên sensor được gửi lại. Bước kế tiếp: persistence
PostgreSQL local, validation/idempotency và API đọc telemetry, giữ cloud cost
thấp; chưa triển khai DB/API trong mốc này.

## 13/10/2026 15:20 (Việt Nam) — Backend nhận telemetry, probe ngắn đạt

Người dùng xác nhận JDK/javac Temurin 21.0.12.1. Khi tạo backend IAM inline
policy, UI báo exceeding limit với bản đầy đủ; hướng dẫn dùng policy tối thiểu
cho Connect backend client, Subscribe/Receive đúng ENV01 telemetry và echo,
Publish echo. Cần giữ quyền subscribe exact topic: dấu + trong IAM resource
không thay thế wildcard IAM để khớp subscription exact của probe. Runtime
quyền điều khiển pump chưa được xác nhận cấp trong policy tối thiểu.

Lần probe trước WSS echo đạt nhưng kết thúc Insufficient device telemetry;
không có số gói được gửi lại, nguyên nhân thiếu chưa xác định. Sau hướng dẫn
giữ Wokwi/gateway chạy và kiểm tra live data, người dùng chạy lại: build/test
backend đạt (1 test), WSS_PUBACK_ECHO_PASS, TELEMETRY_PACKETS=5 trong 30 giây,
Maven BUILD SUCCESS; kết thúc 15:20:54 GMT+7, runtime 32.966 giây. Không kết luận
chắc chắn lần lỗi trước do simulator dừng vì chưa có bằng chứng.

Mốc đã có bằng chứng: Wokwi → AWS IoT → backend local nhận gói. Chưa có
300-second observation, schema validation/unique counting trong Java probe,
persistence/UI/control/ACK end-to-end. Tiếp theo chạy probe default 300 giây,
threshold 58 gói; đếm packet không phải đầy đủ nghiệm thu dữ liệu.

## Chuyển sang backend — người dùng báo test đã hoàn tất

Người dùng nói đã test xong Wokwi/AWS và yêu cầu tiếp tục. Ghi nhận hoàn tất theo
lời người dùng; chưa có JSON hoặc số gói/5 phút được gửi, không tự điền bằng
chứng còn thiếu. Tiếp tục gate backend WSS/SigV4 đã có code. Chuẩn bị helper
Windows Git Bash kiểm tra JDK21, profile/account, endpoint rồi build và chạy
probe. Backend runtime IAM policy phải gắn riêng, không thay provisioning policy;
không tạo EC2/RDS. Chưa chạy live backend bằng credentials của người dùng.
Người dùng cho biết chưa cài/chưa biết JDK21; cần hướng dẫn cài và xác nhận
java/javac trước khi chạy helper Windows.

## Wokwi telemetry được broker xác nhận QoS1

Người dùng cung cấp serial log Wokwi lặp `Telemetry queued; wait for PUBACK`
và `MQTT QoS1 PUBACK received` sau sửa RetainPublish. Đây là bằng chứng runtime
publish và QoS1 acknowledgement; callback hiện không phân biệt ACK telemetry với
ACK status, nên không dùng tổng số PUBACK làm số telemetry. Chưa có payload từ
MQTT Test Client, thời gian phiên 5 phút, biến thiên sensor hoặc backend receive.
Tiếp theo subscribe ENV01/telemetry trên AWS, ghi sample đã làm sạch và quan sát
sensor thay đổi. Không tuyên bố toàn bộ Day 1/end-to-end đã hoàn thành.

## Xác nhận sửa RetainPublish thành công trên Windows

Sau khi thêm iot:RetainPublish cho ENV01/status và lưu policy version mới làm
active, người dùng chạy check_device_connection.py --with-will: endpoint/client
ID match, certificate pair loaded, TLS verified, MQTT CONNECT accepted (ENV01).
Lỗi CONNECT với retained LWT đã được giải quyết trong phép thử Windows; chưa có
log Wokwi sau sửa hoặc telemetry được quan sát ở AWS. Tiếp theo chạy lại
simulator, giữ gateway đang cấu hình nếu dùng private gateway, kiểm tra connected,
PUBACK và MQTT Test Client trong 5 phút. Không cần rebuild firmware cho policy.

## Last Will retained tái hiện lỗi, policy thiếu RetainPublish

Người dùng chạy probe --with-will trên Windows: TLS verified, rồi server đóng
trước CONNACK; probe không có will trước đó thành công. Device policy renderer
thiếu iot:RetainPublish trong khi firmware dùng retained LWT và retained status.
Bổ sung action giới hạn đúng topic smartfarm/FARM001/ENV01/status; kiểm tra
scope bằng test. Cần tạo version mới của IoT device policy và đặt default trên
AWS; đây không phải IAM policy smartfarm-dev. Script không tự sửa policy có sẵn
khác nội dung, nên cần cập nhật AWS trước khi retry provisioning. Chưa có kết quả
live sau sửa; chỉ kết luận lỗi retained CONNECT đã tái hiện và thiếu quyền được
xác định trong code, không tuyên bố Wokwi đã kết nối.

## MQTT lỗi vẫn còn sau thử gateway

Người dùng gửi log sau bước private gateway: Wi-Fi/NTP wait rồi MQTT receive
errno=119, connect failed lặp lại. Không xác nhận gateway là nguyên nhân hay
giải pháp. Probe Windows trước không có LWT; firmware có retained QoS1 LWT
trên ENV01/status. Bổ sung --with-will vào probe để đối chiếu CONNECT với LWT,
không publish telemetry/control; graceful DISCONNECT để tránh phát will khi
thành công. Nếu mạng ngắt bất thường sau CONNECT, AWS có thể phát OFFLINE will.
Chưa có kết quả chạy chế độ này; không kết luận lỗi authorization LWT.

## Chẩn đoán Windows TLS/MQTT thành công

Người dùng cung cấp output check_device_connection.py: endpoint/client ID match,
certificate/private key loaded, TLS handshake verified, MQTT CONNECT accepted
(ENV01), không publish. Xác nhận authentication CONNECT từ Windows bằng các
file hiện tại; không chứng minh quyền publish/LWT hoặc Wokwi TLS đã đúng.
Hướng chẩn đoán tiếp: dùng private Wokwi gateway qua mạng Windows đã hoạt động,
so sánh với đường mạng simulator hiện tại. Đây là phép thử, chưa kết luận public
gateway là nguyên nhân. README chính thức wokwi/wokwigw xác nhận chạy wokwigw
và cấu hình [net] gateway="ws://localhost:9011" cho VS Code. Không cần bridge
mode/TAP driver. Nếu vẫn lỗi, kiểm tra sự khác biệt MQTT CONNECT/LWT trong
firmware so với probe không có LWT.

## Wokwi mount/ready, MQTT connect bị ngắt

Người dùng cung cấp log: LittleFS mounted, AWS endpoint configured, Wi-Fi and
time ready, sau đó MQTT transport_read errno=119 và connect failed. Certificate
Active được xác nhận qua ảnh; người dùng báo client ID/policy đầy đủ, chưa có
bằng chứng JSON đối chiếu trực tiếp. Chưa kết luận lỗi policy/TLS/network.
Thêm check_device_connection.py dùng Python stdlib TLS xác minh CA/hostname,
certificate pair và MQTT CONNECT ENV01 trên Windows để phân biệt simulator với
AWS/authentication. Không publish/control. Dừng simulator trước vì trùng client
ID có thể ngắt phiên cũ. Chưa có kết quả live của phép thử này.

## 13/10/2026 — Image ghép boot, chờ chẩn đoán Wi-Fi/NTP/MQTT

Người dùng gửi log Wokwi mới chỉ có bootloader đến entry; không thấy lỗi
partition cũ trong đoạn gửi, nhưng chưa có bằng chứng mount/TLS/telemetry.
Firmware trước thiếu log cho trạng thái chờ Wi-Fi/NTP/endpoint. Thêm log boot,
mount result, endpoint presence (không in giá trị), và trạng thái chờ mỗi 10 giây
trước khi MQTT client khởi tạo. Cần rebuild firmware, ghép image lại và quan sát
serial 30–60 giây. Chưa kết luận nguyên nhân im lặng hoặc gate Day 1 đạt.

## 13/10/2026 — LittleFS build và công cụ ghép flash

Người dùng cung cấp buildfs SUCCESS sau 9.12 giây; danh sách image có .gitkeep,
AmazonRootCA1.pem, device.pem.crt, private.pem.key. Trước đó đã giới hạn quyền
data directory và tải Root CA qua HTTPS chính thức. Không lưu nội dung key.
Thêm tools/wokwi/merge_flash.py đọc layout từ partitions.bin, kiểm tra size và
overlap, ghép bootloader/partition table/OTA init/app/LittleFS thành flash 4 MiB.
Output trong .pio/build/esp32dev/wokwi-private, quyền thư mục riêng tư; Wokwi
config chuyển từ application-only sang image ghép. Cloud chạy 10 tests đạt,
gồm kiểm tra offsets, gaps, overlap và quá kích thước bằng dữ liệu giả.
Chưa chạy merge trên artifact thật của người dùng hoặc xác nhận Wokwi nạp
image ghép/TLS; cần người dùng chạy helper và gửi serial log tiếp theo.

## 13/10/2026 — Wokwi khởi động firmware, thiếu partition LittleFS

Kiểm tra tiếp theo do người dùng cung cấp: partitions.bin có nvs 0x9000/0x5000,
otadata 0xe000/0x2000, app0 0x10000/0x140000, app1 0x150000/0x140000,
spiffs 0x290000/0x160000 và coredump 0x3f0000/0x10000. Partition filesystem
đã tồn tại trong build output; không cần đổi tên hoặc layout để chữa log.
Simulator chưa được xác nhận đã nạp partition table/image này. Bước tiếp theo
là tạo LittleFS riêng tư, rồi ghép flash tại offsets đã kiểm tra.

Người dùng cài Wokwi extension VS Code, kích hoạt license và cung cấp boot log
ESP32. Firmware khởi động, báo `partition "spiffs" could not be found`,
`Mounting LittleFS failed! Error: 261`, rồi giữ relay OFF vì không đọc được
credentials. `wokwi.toml` hiện trỏ vào application firmware.bin, chưa có bằng
chứng partition table và filesystem riêng tư đã được nạp vào simulator.
Không đổi tên partition hoặc bật auto-format để che lỗi. Cần tạo filesystem
image, kiểm tra partition table và chuẩn bị image phù hợp simulator trước khi
nghiệm thu TLS. Chưa có kết nối MQTT. Không lưu key/image vào Git.

## 13/10/2026 — Tải toolchain firmware trên Windows (chưa build xong)

**Cập nhật sau retry:** người dùng cung cấp đầu ra build thành công:
`esptool.py v4.9.0`, `Successfully created esp32 image`,
`[SUCCESS] Took 97.88 seconds`. Firmware ELF/bin đã được tạo trên Windows.
Mốc này xác nhận compile/package, không xác nhận LittleFS, Wokwi runtime hoặc
MQTT TLS/telemetry. Bước tiếp theo chuyển sang Wokwi local/private và kiểm tra
filesystem provisioning; giữ phần lỗi tải bên dưới làm lịch sử.

Người dùng cung cấp đầu ra PlatformIO: toolchain-xtensa-esp32 8.4.0+2021r2-patch5
đã cài. Mirror sin1.contabostorage.com gặp SSL WRONG_VERSION_NUMBER; PlatformIO
tự chuyển mirror và cài framework-arduinoespressif32 3.20017.241212+sha.dcc1105b
thành công. Khi tải tool-esptoolpy từ mirror thay thế, tiến trình báo Aborted ở
59%. Chưa xác định nguyên nhân abort (không kết luận người dùng hủy hoặc TLS
gây ra). Chưa có bằng chứng biên dịch firmware thành công. Bước tiếp theo:
chạy lại đúng lệnh build để tận dụng package đã cài; giữ TLS verification.

## 11/10/2026 — Trạng thái hiện tại

- Repository: NiDa30/smart-farm-management-system; nhánh làm việc `feat/day1-iot-foundation`. Không merge vào main.
- Cloud: Linux dưới `/workspace`; máy người dùng: Windows 11, Git Bash UCRT64, repository tại `D:/IOT/Project/smart-farm-management-system`.
- Người dùng dùng Wokwi, chưa có ESP32 vật lý. AWS IoT chọn Singapore (`ap-southeast-1`) vì gần Việt Nam; không tuyên bố đây là region rẻ nhất.
- **AWS provisioning thành công trên máy người dùng**. Đầu ra người dùng cung cấp: `AWS Thing/certificate/policy provisioned. Private files and endpoint saved to .../.local/aws`.
- Thing `ENV01`, policy `SmartFarmMvpENV01`, certificate và endpoint được script tạo/lưu. Thành công của script không chứng minh thiết bị đã kết nối.
- **Bước kế tiếp:** cấu hình `firmware/esp32/config/config.local.h`, chạy PlatformIO build trên Windows; sau đó xác nhận Wokwi local có thể nạp LittleFS riêng tư, rồi thu telemetry AWS.
- Chưa có kết quả build firmware trên Windows; chưa có MQTT live, PUBACK, phiên quan sát 5 phút, backend nhận telemetry hoặc điều khiển relay/ACK end-to-end.

## 1. Khảo sát và chuẩn bị môi trường

Frontend có React 19, TypeScript, Vite 8, Tailwind 4; nhiều luồng còn dùng mock. Baseline chưa có backend/database cho vertical slice IoT. `npm ci --legacy-peer-deps` cài được; `npm run build` đạt với cảnh báo kích thước bundle và cấu hình Vite. Lint phát hiện loại toast không hợp lệ; sửa sang `warning`. Cloud từng chạy smoke dashboard và danh sách cây bằng browser tự động.

Môi trường cloud được chuẩn bị bằng skill cloud-environment-onboarding:setup; hướng dẫn install/start và yêu cầu domain mạng đã lưu vào draft. Draft không đồng nghĩa cấu hình đã được áp dụng cho runtime. Không lưu bí mật vào draft.

## 2. Kế hoạch MVP và quản lý công việc

Kế hoạch 7 ngày cho 2 kỹ sư, khoảng 84 giờ, có điều kiện: ESP32/Wokwi → AWS IoT → Spring Boot → PostgreSQL → WebSocket → React → rule/command → GPIO → ACK → logs. Có schemas, tests, rủi ro và gate nghiệm thu trong tài liệu implementation. Đây là kế hoạch, không phải cam kết hệ thống đã hoàn thành.

Người dùng muốn tạo 7 task trong Jira project ISP. Plugin Atlassian hiển thị tài khoản kết nối nhưng phiên làm việc không có công cụ Jira callable. Đã chuẩn bị CSV và mô tả task; link tải CSV trong ứng dụng thất bại. **Không có bằng chứng task Jira nào được tạo bởi trợ lý.** Không coi cài plugin là quyền API đã dùng được.

## 3. Code nền tảng Day 1

- JSON Schema và ví dụ telemetry, command, ACK, status, event; farm FARM001, ENV01/PUMP01, bootId, sequence, timestamp và giới hạn thời gian ON.
- Script render/provision IoT với kiểm tra account, policy có scope, manifest để dùng lại certificate và từ chối ghi đè tài nguyên không khớp.
- Backend Java 21, Spring Boot 3.5.16, Maven wrapper 3.9.11, AWS IoT SDK 1.34.0. Probe WSS/SigV4 chỉ gửi echo riêng của backend ở bước chẩn đoán, không bật pump.
- Firmware ESP32 Arduino/ESP-MQTT TLS/QoS1, DHT22 GPIO15, ADC đất GPIO34, relay GPIO26 giữ OFF. LittleFS chứa credentials riêng tư. Không dùng sketch HiveMQ cũ làm bằng chứng AWS.
- Cloud đã kiểm chứng frontend lint/build, 6 tests schema/policy ban đầu, Maven verify 1 test, Spring context và probe native self-test. Self-test không kết nối AWS.
- Firmware build cloud bị proxy CONNECT403 tới registry PlatformIO; chưa được xác nhận hoàn tất.

## 4. Đồng bộ máy Windows

Commit nền tảng `31eeaae` được push lên nhánh feature. Checkout bị chặn do người dùng có sửa `SensorRealtime.tsx` trên main. Đã stash riêng file, rồi switch theo remote branch; các file tools/backend xuất hiện và lint đạt. Không pop stash vì bản sửa toast đã có trên nhánh mới.

Python ban đầu không có; sau đó người dùng cài Python 3.12.10 và venv `.local/day1-venv`. AWS CLI gọi bằng `Scripts/python.exe -m awscli`, không dựa vào `Scripts/aws.exe`. Thiết lập profile `smartfarm` trên máy người dùng; IAM user `smartfarm-dev`, không cấp AdministratorAccess.

## 5. Điều tra chi phí AWS trước khi tiếp tục

Credits có lúc hiển thị $79.26, sau đó $99.26. Trang Credits giải thích rõ tổng cấp $120: $100 Free Tier + $20 thưởng “Explore AWS: Launch an instance using EC2” ngày 11/10/2026. Tổng sử dụng ước tính $20.74 = $12.86 tháng 9 + $7.88 tháng 10; còn ước tính $99.26. Xóa tài nguyên không tự hoàn lại credit; mức tăng $20 là khoản thưởng, không suy luận là refund.

Hóa đơn tháng 10 người dùng cung cấp: t3.micro 483.596 giờ $5.03, EBS gp3 $0.41, IPv4 public 488 giờ $2.44; tổng $7.88 được credit bù nên payable $0. Data transfer $0. Hai volume gp3 8 GiB gắn với các instance DevOps/Test ở us-east-1. Stop không ngừng phí ổ EBS/Elastic IP. Người dùng cung cấp ảnh cả hai instance Terminated, sau đó báo không còn Volumes/Elastic IPs. Chưa có bằng chứng xác nhận Snapshots Owned by me hoặc tất cả region đều trống.

Budget `SmartFarm-Monthly`: $5 recurring/tháng, Unblended costs, loại trừ Credit/Refund, không có end date. Cảnh báo Actual 20%, 80%, 100% và Forecasted 100%; người dùng xác nhận email đã verified. Budget không tự dừng tài nguyên. Chi phí billing cập nhật có độ trễ; cần đối chiếu lại sau 24–48 giờ. Tháng hiện tại vẫn hiển thị chi phí đã phát sinh dù đã xóa máy.

## 6. Sửa lỗi provisioning và bằng chứng thành công

Các lỗi Windows ACL, dependency botocore và IAM được ghi ở [sổ lỗi](TROUBLESHOOTING.md). Các commit đã push: `fd0cb97` ACL Windows ban đầu, `dfd97a1` chỉ sửa DACL, `eaa75fc` khai báo botocore, `fd335b1` hiển thị operation/error code an toàn.

Tests trên cloud sau sửa: 8 đạt. Người dùng Windows cung cấp kết quả 8 tests tổng, 7 đạt và 1 skip vì POSIX mode không áp dụng Windows. Đây không phải test AWS live.

Sau điều chỉnh IAM, lệnh CLI attach-policy không lỗi. Lần chạy script tiếp theo người dùng xác nhận provisioning thành công. Cần giữ `.local/aws/` và manifest; không tạo lại certificate để né lỗi quyền.

## Việc còn lại trước khi viết chương triển khai thành công

1. Biên dịch firmware thật, ghi tool versions và kết quả.
2. Xác nhận workflow Wokwi local/private và filesystem image, không đăng private key lên Wokwi public.
3. Thu MQTT TLS/PUBACK và khoảng 60 telemetry hợp lệ trong 5 phút, thay đổi sensor ảo.
4. Chạy backend probe với quyền runtime riêng, lưu bằng chứng đã làm sạch.
5. Tiếp tục persistence/UI/control/safety/ACK theo kế hoạch sau khi gate Day 1 đạt.

## 15/10/2026 — SOIL nhiều điểm, nền đầu A3

- Thêm SOIL/v2 bằng V17; form khai báo ba điểm SOIL1/SOIL2/SOIL3, hiển thị và
  history/CSV riêng. Partial packet không làm mới điểm thiếu, lỗi null khác 0.
- Firmware/sơ đồ SOIL riêng ADC1 34/35/32, ba fault switches, SIMULATOR-only.
  Helper provisioning/prepare thêm --node-type SOIL, giữ default WATER và
  config/cert riêng. Không chuyển rule hiện tại khỏi ENV01 hoặc tạo command.
- 152 backend, 22 browser node/history, 13 unit frontend, 17 Python WATER,
  7 Python SOIL, native và Pio/buildfs/merge public đạt, không skip.
- V16→V17 giữ flow status/history; smoke toàn app/API/PostgreSQL test có ba
  packet/bảy readings, filter/CSV đúng, command0/run0. MQTT/control tắt.
- Query xác minh ban đầu nhầm cột state; đọc V3 sửa thành reported_state.
  Không có lỗi migration hoặc reset dữ liệu. Source/back button history được
  cập nhật đồng bộ với smoke cũ.
- [Chương27](CHAPTER_27_SOIL_MULTIPOINT.md) và [báo cáo](../implementation/LOCAL_SOIL_NODE_REPORT.md)
  có Windows runbook/sáu ca còn Chưa chạy. Chưa nghiệm thu SOIL AWS/Wokwi thật.

## 15/10/2026 — Cảnh báo SOIL theo từng điểm và nguồn

- V18 thêm soil_alert_cursor/state/episodes. Dưới30% mở DRY_SOIL, từ35% phục
  hồi; SENSOR_FAULT/null khác0. Hai packet fresh/liền seq/boot/source, gap≤15s.
  Band30–<35/fault/missing giữ active và reset pending, không đóng vì im lặng.
- Tab Đất nhiều điểm có lọc nguồn/điều kiện/đã xem, packet/giá trị bằng chứng và
  ACK note. Tách ChannelAlertCenter dùng chung với WATER, giữ parser từng nhóm;
  ACK phản hồi không rõ dùng GET đối chiếu, không tự PUT lại.
- 167 backend (15 SoilAlertsTest), 24 browser alerts, 11 unit parser, lint/build đạt,
  không skip. Bao gồm rollback/concurrency, stale/duplicate/order/source,
  zero/null, strict note body và polling trả chậm. Không sửa firmware.
- soil_node_smoke V17→V18 giữ3 packet/7 readings và không sinh alert hồi tố.
  soil_alert_smoke thật qua router/API/PostgreSQL:2 packet mở SOIL1 khô/SOIL3 lỗi,
  UI ACK→restart backend→đọc lại→2 packet phục hồi→hai đợt đóng giữ note. Sau cùng
  4 packet/12 readings,command0/run0; MQTT/control tắt, không AWS/Wokwi mới.
- Không gặp test/build failure trong đợt này; các ca lỗi API là test chủ động,
  không ghi thành sự cố live. [Chương28](CHAPTER_28_SOIL_ALERTS.md) và
  [báo cáo](../implementation/LOCAL_SOIL_ALERTS_REPORT.md) có sáu ca Wokwi Chưa chạy.

## 15/10/2026 — Registry vùng tưới và khảo sát ba điểm

- V19 thêm irrigation_zone/channel: ba kênh SOIL/v2 cùng node/area, source và
  ngưỡng riêng, revision; unique node/channel không gán hai vùng. Rebind atomic,
  conflict rollback giữ binding/revision cũ, hai người sửa chỉ một người thắng.
- Cả ba VALID/mới/đúng source và cùng packet mới tính2/3 DRY/WET; mixed/partial/
  fault/missing/stale/clock/source mismatch không biến thành đủ điều kiện tưới.
  Khảo sát một packet khác với alert hai packet; không phát command.
- UI Node & trạm nước → Vùng tưới có create/edit/readback/conflict, monotonic
  expiry khi form mở dừng poll. 176 backend,29 browser node/history/zone,17 unit,
  lint/build cuối đạt, không skip. Firmware không đổi.
- Lint đầu nullable validUntil trong callback: giữ guard date và sửa kiểu.
  Browser đầu28 pass/1 timeout label select; thêm aria-label rõ ràng, rerun29 pass.
  Không tăng timeout hoặc bỏ assertion. Ghi chi tiết ở
  [chương29](CHAPTER_29_IRRIGATION_ZONES.md).
- V18→V19 giữ4packet/12readings,2soilalert/1ACK,command0/run0 và không tự tạo vùng.
  Full app test hai node → POST hai vùng → PUT ngưỡng40/45 → restart → config/
  revision/binding giống trước. Cuối2zone/6binding/2packet/6readings,command0/run0,
  MQTT/control tắt; không AWS/Wokwi live mới. Năm ca live còn Chưa chạy.

## 15/10/2026 — tổng quan nông nghiệp (giờ Việt Nam)

- Sửa khoảng trống dashboard chỉ đếm sensor_alert: agriculture đọc inventory,
  zone survey cùng inventory/asOf, count đất/nước và preview5. Card cộng ba
  nhóm, ACK/mẫu cũ không giảm episode mở; source/freshness tách theo kênh.
- Read-only RR, GET không dispatch/expire/pause. No migration/firmware/IAM mới.
  Rule ENV01 độc lập; EventLog/Safety/header/DeviceMonitoring vẫn phạm vi cũ.
- 179 backend/15 browser dashboard/6unit/lint/build đạt, skip0. Full app receive
  fixture local fresh/stale + menu navigation đạt,4packet/12readings/1zone,
  soil2/water1 mở/ACK1/command0/run0; MQTT/control tắt.
- Setup thêm Vite tự chuyển3001 vì3000 đã có; dừng đúng tiến trình mới, giữ
  Vite3000. Không lỗi test trong lượt này; không biến setup thành lỗi AWS.
- [Chương30](CHAPTER_30_AGRICULTURE_OVERVIEW.md) và [bàn giao](../implementation/LOCAL_AGRICULTURE_OVERVIEW_REPORT.md).
  Năm ca Windows/AWS/Wokwi mới Chưa chạy; controller/van/coordinator còn sau.

## 15/10/2026 — ước tính lượng nước từ lịch sử FLOW (giờ Việt Nam)

- WaterVolume read-only RR hình thang theo đoạn hợp lệ; packet thiếu kênh/
  khác nguồn giữ trong LEFT JOIN, không bridge qua. Source/boot/seq/calibration/
  quality/gap≤15s và receipt guards; coverage, null/0 và groups tách rõ.
- Range [from,to)≤24h,25k packet cap422, không truncated total hoặc ngoại suy
  biên; BigDecimal/finite guard. No migration/firmware/IAM/command mới.
- Tiêu thụ Nước & Điện dùng API thật, bỏ mock nước/kWh/cost/leak. Tab Điện
  chưa có đo. Scope so instant thay chuỗiJavaZ/JS.000Z, date rỗng có guard;
  test tương ứng đạt. Đây là phát hiện khi rà code, không báo sự cố Windows.
- 194 backend/16browser cuối/5unit cuối/lintbuild đạt, skip0. Browser đầu14,
  unit đầu4 cũng đạt; thêm ca canonical và metadata refresh trước lượt cuối. Full-app GET-only
  dùng lại AGWATER lịch sử0: phủ1/5s20%, thiếu4s; PHYSICAL unknown, không0.
- Không seed/thay timestamps. Schema agriculture_overview_smoke/counters giữ,
  command0/run0, MQTT/controlfalse.5ca Windows/AWS/Wokwi chưa chạy; năng lượng/
  chi phí/coordinator/volume thực địa chưa nghiệm thu.
- [Chương31](CHAPTER_31_WATER_VOLUME.md), [bàn giao](../implementation/LOCAL_WATER_VOLUME_REPORT.md).

## 15/10/2026 — controller van mô phỏng A3 (giờ Việt Nam)

- V20 thêm IRRIGATION01/VALVE01 cố định, binding vùng SIMULATOR, ledger/status,
  API và transport riêng. Cờ mặc định tắt; không đổi ENV01/PUMP01. Tracking
  commit trước publish, request UUID idempotent, GET ID ngoài preview20.
- OPEN1–30s cần boot/CLOSED mới và status theo kịp mọi ordinal. HTTP có thời
  điểm yêu cầu và mốc chặn CLOSE+2s; MQTT có ordinal và boot để chặn OPEN muộn.
  Không tự mở khi reboot/reconnect; ACK và status được giữ riêng.
- Firmware/diagram ESP32 riêng với LED26, timer25ms và kiểm tra lỗi queue,
  TTL/JSON. Chỉ SIMULATOR, feedback UNKNOWN. Helper chỉ render policy, không
  provision AWS. Controller này chưa điều khiển bơm chung hoặc van thực tế.
- 212 backend,9 browser,2 unit,3 Python policy+17 WATER+7 SOIL đạt, skip0.
  Native/public ESP32 mặc định và opt-in/buildfs/merge4MiB/lint/build đạt.
- Lỗi đã sửa: helper test status che matcher (đổi reportStatus), native
  indentation dưới -Werror, driver Python dùng cú pháp JS (đổi exact=False).
  Browser cuối còn phát hiện expiry bị kéo dài qua polling asOf cũ (8/1);
  sửa đồng hồ monotonic không lùi và rerun9/9. Giữ lượt fail trong báo cáo;
  full-app cuối đạt với GET-only và các cờ false.
- V20 được sửa trước phát hành: chỉ dựng lại các bảng/constraint V20 mới tạo
  trong telemetry_test. Upgrade V19→V20 trên fixture agriculture giữ4packet/
  12readings/zone1/alerts và command0/run0. Runtime irrigation_demo_smoke nhận
  native packet đã chỉnh giờ, binding ZONE01 revision2, status CLOSED, không lệnh.
- [Chương32](CHAPTER_32_IRRIGATION_VALVE_DEMO.md),
  [bàn giao](../implementation/LOCAL_IRRIGATION_VALVE_REPORT.md).
  Sáu ca AWS/Wokwi mới Chưa chạy; coordinator/van thật/rule SOIL/NVS còn sau.

## 15/10/2026 — FIFO nhiều vùng, chỉ diễn tập

V21 thêm queue ledger/version/zone snapshot, FIFO một suất DB-locked,50lượt/
TTL5phút,1–30giây, hủy/idempotency/lookup ngoài20; restart interrupted không
resume. UI vào từ Actuator, không gửi MQTT, không sửa rule/cert/firmware.
229backend/12queue browser/5unit/9valve browser/lintbuild đạt. Full-app thật
qua proxy/PostgreSQL giữ lịch sử sau restart process; command/run0. Nâng
V20→V21 giữ dữ liệu fixture van. Lỗi singleton rỗng và FK fixture sót đã xử
lý, ghi tại [chương33](CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md). Windows5ca
Chưa chạy; coordinator phần cứng/lease PUMP01 vẫn chưa làm.

## 15/10/2026 — MQTT PUMP01 chống boot/lệnh cũ, opt-in

V22+firmware ENV thêm ordinal/target boot, reservation DB trước publish,
ACK/status validation, toàn lịch sử và legacy OFF latch đến reboot. Hai cờ
mặc định tắt; UI hiển thị profile và khóa ON/reset khi lệch mode.247backend/
6pump browser/12queue browser/17contracts/native/public Pio hai chế độ/FS/
merge/lintbuild/full-app native status và restart thật đạt. Queue fixture
V21→22 bảo toàn4lượt. Không AWS/Wokwi/GPIO,6ca Windows Chưa chạy. Lỗi và cách
sửa được ghi tại [chương34](CHAPTER_34_PUMP_COMMAND_FENCING.md). Chưa HTTP
intent fence/lease/dispatch queue hoặc coordinator thật.

## 15/10/2026 — HTTP intent V23

Thêm UUID/review version/boot/deadline, startup invalidation và GET receipt.
OFF offline giữ failed/barrier; duplicate không pause rule mới. UI giữ ID
qua reload, GET đối chiếu, không auto POST.262backend skip0/11browser/4unit/
lintbuild và full-app native/offline fixture trước-sau restart đạt. Queue
V22→23 giữ4lượt; không AWS/Wokwi/GPIO,6ca Chưa chạy.
[Chương35](CHAPTER_35_PUMP_HTTP_INTENT.md) ghi lỗi/cách sửa. Chưa ownership/
lease hoặc dispatch queue.


## 15/10/2026 — V24 quyền sử dụng PUMP01

Lưu nguồn MANUAL/AUTOMATION/LEGACY, owner của OFF tự động và thời điểm khép
claim trên command. Khóa PostgreSQL chung cho claim + manual hold hoặc
tracking run; epoch/settings/calendar và mẫu đánh giá được kiểm tra lúc reserve.
Worker cũ không được dùng OFF của run cũ để dừng lượt thủ công mới. Không
nhả quyền vì timer/ACK/timeout/restart; cần status OFF mới bao phủ command.
Run LEGACY chỉ có đường dừng khi có cả watering_run và active reference.

286 backend (24 mới),15pump browser,5parserunit,lint/build đạt, không skip.
Full-app local capture-only uncertain claim giữ qua restart JVM và navigation,
không AWS/GPIO. Migration23→24 giữ claim/run. Full suite đầu lỗi quá nhiều
connection; giới hạn Hikari ở cấu hình test4/idle1 rồi chạy lại đầy đủ đạt.
Không sửa production pool, không reset dữ liệu để vượt test.
Sách [chương36](CHAPTER_36_PUMP_OWNERSHIP.md),
[bàn giao](../implementation/LOCAL_PUMP_OWNERSHIP_REPORT.md). Queue vẫn diễn tập;
sáu ca Windows/Wokwi mới Chưa chạy. Firmware/wire không đổi.


## 15/10/2026 — V25 phản hồi vị trí VALVE01

Trước khi nối van với bơm, thêm hai công tắc mô phỏng độc lập GPIO32/33,
debounce100ms/travel3s/fault giữ và CLOSE ổn định để xóa. GPIO/ACK không được
coi là vị trí. Packet extension opt-in, V25 status storage, policy required
mặc địnhfalse; capability đã báo vẫn được kiểm tra. UI panel ở controller
van, stale không được gọi CLOSED mới; chưa tạo global alert hoặc dispatch queue.

300backend (14mới),13valve browser,4unit,native model/parser/encoder,public
firmware default/opt-in,emptyFS/merge4MiB,lintbuild đạt. Full-app native→Java→
PostgreSQL fresh và stale sau restart JVM giữ metadata/binding, command0.
Full đầu lỗi FK fixture test van còn giữ zone/SOIL; sửa cleanup đúng ID rồi
chạy lại300/300, không reset DB. Merge cần đúng --core-dir cache cloud.
Không dùng private config/PEM. Sáu ca Windows/Wokwi mới Chưa chạy.
[Chương37](CHAPTER_37_VALVE_POSITION_FEEDBACK.md),
[bàn giao](../implementation/LOCAL_VALVE_POSITION_REPORT.md). Coordinator vẫn còn sau.


## 15/10/2026 — V26 cấu hình nhiều nhánh tưới

Thêm nhánh gắn vùng/revision, controller/van dự kiến, PUMP01 và trạm nước/kênh
phao-flow. Vùng/van độc quyền; controller/trạm được dùng chung. UI tạo/sửa
và đối chiếu mất phản hồi; không tạo AWS hoặc dispatch. Hàng chờ giữ snapshot
nhánh đã duyệt, thay đổi làm invalidated/interrupted, không tự chuyển đích.
315backend (15mới)/11browser nhánh/16queue browser/lintbuild đạt. Full-app
PostgreSQL/restart thật giữ2nhánh và snapshot3lượt, command/run0;5ca Windows
mới Chưa chạy. Đợt test đầu thấy binding singleton fixture bị suite cũ
TRUNCATE CASCADE; thêm setup nếu thiếu, không sửa/reset DB demo.
[Chương38](CHAPTER_38_IRRIGATION_CIRCUITS.md),
[bàn giao](../implementation/LOCAL_IRRIGATION_CIRCUITS_REPORT.md).


## 15/10/2026 — V27 trạng thái riêng cho van02–99

Sau cấu hình nhánh, thêm profile firmware chỉ giám sát, policy render hẹp
và receiver theo từng van/phiên bản. Sequence/retired boot/capability/fault
được kiểm tra, không mượn dữ liệu giữa nhánh. Worker riêng không chặn ACK/
status bơm; GPIO monitor giữ tắt, không thêm command mới.
333backend/18browser nhánh/16queue browser/5policy/native/public firmware
default+monitor/emptyFSmerge/lintbuild đạt. Static_assert reject cấu hình
monitor+control là expected failure. Full-app native→Java/PostgreSQL→web mới
và cũ sau restart thật, metadata giữ nguyên và V26 rows bảo toàn, command0.
Fresh thử đầu quá hạn; một heartbeat native mới tăngseq1, không sửa timestamp
seq0 để qua test. Policy assertion ack nhầm backend được sửa sang /ack.
Sách [chương39](CHAPTER_39_CIRCUIT_VALVE_MONITOR.md),
[bàn giao](../implementation/LOCAL_CIRCUIT_VALVE_MONITOR_REPORT.md).
5ca Windows/Wokwi mới Chưa chạy; chưa coordinator/dispatch queue.

## 15/10/2026 — V28 cảnh báo lỗi van/controller theo nhánh

Lưu đợt POSITION_FAULT/DEVICE_FAULT ngay từ packet monitor mới, cùng transaction
status/boot. Phục hồi cần hai mẫu khỏe liên tiếp; restart ngắt chuỗi dở.
Bản chụp cấu hình và bằng chứng mở không đổi, ACK/ghi chú đầu tiên chỉ đã xem.
Web thêm tab Van theo nhánh và Event Log có ba lifecycle event đúng source/
receipt time. Không thêm transport, email, reset hoặc quét cảnh báo offline.
352backend skip0/13browser van/24browser cảnh báo/11browser Event Log/native
encoder/lintbuild đạt. Full-app local ghi chú qua web, restart thật, phục hồi
và Event Log đạt; nâng V27 giữ2nhánh/3queue/status/boot. Không mock API, không
AWS, commands/run/queue mới0, không sửa demo5433. Sáu ca Windows/Wokwi mới
Chưa chạy; A3 còn coordinator/interlock/dispatch queue.
[Chương40](CHAPTER_40_VALVE_ALERTS.md),
[bàn giao](../implementation/LOCAL_VALVE_ALERTS_REPORT.md).

## 15/10/2026 — V29 lịch sử quan sát van

Lưu từng packet monitor được chấp nhận cùng transaction status/boot/episode.
Giữ snapshot cấu hình và hai giờ; API theo receivedAt, range31ngày, cursor
gắn scope và mốc ID, tuần tự cấp ID tới commit để tránh mẫu pending chen trang.
Web thêm lịch sử từ cấu hình nhánh, lọc theo nhánh/van/vị trí/lỗi, CSV đúng
dòng đã tải và không thực thi công thức tên nhánh. Không backfill/command mới.
369backend skip0/11browser mới/18browser nhánh/3unit precision/lintbuild đạt.
Full-app native nhận3mẫu, đổi cấu hình không đổi snapshot cũ, restart và CSV
đạt; V28 rows nguyên vẹn. Fixture test đầu so JSON LongNode với IntNode cho
sequence nên đổi sang so record typed; cursor browser fixture lặp token che
ca ceiling đổi nên sửa fixture về token cuối null, không nới validation.
Năm ca Windows/Wokwi mới Chưa chạy. Retention/coordinator/dispatch còn sau.
[Chương41](CHAPTER_41_VALVE_HISTORY.md),
[bàn giao](../implementation/LOCAL_VALVE_HISTORY_REPORT.md).

## 15/10/2026 — V30 liên động van cục bộ tại bơm

ENV01 có guard opt-in, GPIO32 CLOSED/GPIO33 OPEN độc lập, OPEN ổn định100ms
trước ON/reset; mất proof/conflict khi chạy cắt đầu ra ở timer25ms và latch.
Không dùng MQTT van làm proof, chưa ánh xạ nhánh. Mẫu status khai báo source
SIMULATOR và metadata nullable V30; backend kiểm tra nhất quán/sticky capability/
reset, web Safety tách dữ liệu mới/cũ/thiếu. Mặc định0 giữ private config cũ.
384backend/43browser/9unit frontend/8contract/13nativeguard, encoder và hồi quy
relay/flow/default+opt-in+fence/all-guards firmware/lintbuild/emptyFSmerge đạt. Khai báo
PHYSICAL compile reject đúng; restore profile build đạt. Full-app receive,
proof mới/fault, restart metadata và V29 upgrade đạt, không AWS/commands.
Smoke fault tìm reason ở bảng Event Log sai vì reason nằm trong chi tiết;
giữ fault/clock cũ, sửa selector, rerun stored đạt. Không reseed để qua fresh.
Sáu ca Windows/Wokwi mới Chưa chạy; latch RAM/NVS và coordinator còn sau.
[Chương42](CHAPTER_42_LOCAL_VALVE_PUMP_INTERLOCK.md),
[bàn giao](../implementation/LOCAL_PUMP_VALVE_INTERLOCK_REPORT.md).

## 15/10/2026 — V31 khóa an toàn bền qua reboot

Thêm journal NVS opt-in cho ENV01/PUMP01, default/fallback0; cần fence1.
Boot luôn OFF/khóa; ghi/readback trước ON, reset có điều kiện, không resume
lệnh/timer. Flash IO ở loop khi đầu ra OFF, không ở ISR/timer/mutex; kiểm
tra expiry và thời gian còn lại sau commit. V31 metadata JSONB nullable,
Safety phân biệt mới/cũ/thiếu, Control/Event Log dịch reason. Schema status
đồng bộ cả proof V30. Không đổi private config, IAM hoặc topic.

398 backend/50browser/12unit/12contract đạt,0skip; native17nhóm/19biến thể
journal và relay/flow/13valve hồi quy đạt. Ba public profile firmware,
expected reject thiếu fence, restored build/emptyFSmerge/lintbuild đạt.
Full-app native memory model boot/fault mới→PostgreSQL/React/Event Log, JVM
restart giữ clocks/latch report và hiện cũ.37bảng V30 giữ nguyên ngoài
execution_epoch rule tăng1 đúng startup; cap NVS null, không backfill.

So sánh ban đầu fail do API thêm null và rule epoch tăng đúng thiết kế;
chuẩn hóa duy nhất null mới, assert chính xác epoch+1, không bỏ kiểm tra
lịch sử. Python hệ thống thiếu format checker, đổi về venv dự án đạt12ca.
Sáu ca live vẫn Chưa chạy: memory-store không chứng minh NVS/flash/brownout.
Xem [chương43](CHAPTER_43_DURABLE_PUMP_SAFETY.md) và
[bàn giao V31](../implementation/LOCAL_DURABLE_PUMP_SAFETY_REPORT.md).

## 15/10/2026 — xuất project Wokwi theo nhánh sau V31

Thêm API GET tải ZIP, field Account ID tạm và nút từng hàng trong Cấu hình
nhánh tưới. Current/SIMULATOR, controller/van02–99, client ID riêng và
reviewed circuit/zone revision; không đổi schemaV31. JAR có9template công
khai theo allowlist; ZIP15file không key/endpoint, monitor1/demo0/feedback1,
policy status-only, manifest14hash và README Windows. Không provision/dispatch.

416backend (18mới),26browser nhánh/16queue/6unit/5policy/12contract/lintbuild
đạt,0skip. Full-app tải hai gói, build hai project xuất ra, native encoder
đọc config/include từ gói→receiver→PostgreSQL/React đúng van; van thứ hai
trống. Restart giữ source/receipt/history, packet stale và export core hash
ổn định. EmptyFSmerge4MiB và compiler reject monitor+demo rồi restored đạt.

Lượt đầu2testfixture dùng loại node/metric không đúng DB, sửa fixture không
nới constraint. Restart smoke phát hiện Map.of thay thứ tự JSON khiến
checksum policy đổi; sort map keys, thêm test và chạy lại toàn bộ backend.
Giữ artifact trước sửa riêng, baseline cuối ở /tmp/circuit-monitor-packages-final;
không refresh observation để làm test qua. NVS V31 stored compatibility đạt.

Năm ca Windows/AWS/Wokwi Chưa chạy; gói monitor không điều khiển02–99 hoặc
coordinator. [Chương44](CHAPTER_44_CIRCUIT_MONITOR_PACKAGE.md),
[bàn giao](../implementation/LOCAL_CIRCUIT_MONITOR_PACKAGE_REPORT.md).

## 16/10/2026 — công cụ đăng ký board monitor theo gói

Thêm provision_circuit_monitor.py: plan không SDK, apply rõ ràng bằng profile
local, kiểm tra14hash/identity/macros/policy và STS account. Thing/policy đúng
tên, cert tạo INACTIVE; lưu/fsync/kiểm tra cặp key trước attach độc quyền,
đọc lại attachments/group và ACTIVE/PEM. Output riêng theo account/controller,
khóa local; không ghi project, sửa IAM backend hoặc publish MQTT.

33test mới/8provisioning cũ/5policy/2ACL đạt, không skip; model SDK xác nhận
tham số, không xác nhận IAM thật. Hai public project chương44 plan lặp giữ
nguyên file. Test đầu bắt nhầm chữ Publish trong policy, sửa assertion tên
API; pagination nextMarker/nextToken đều chặn. Cài botocore đúng pin vào
venv cloud đang thiếu; tài liệu IAM ngoài cloud bị proxy403, không báo đã
nghiệm thu quyền thật. Java/React/firmware/V31 không đổi nên không chạy lại
416backend/42browser của đợt trước như bằng chứng mới.

Năm ca Windows/AWS/Wokwi Chưa chạy; mapping cũ/chuyển key/rotation không tự
xử lý. [Chương45](CHAPTER_45_CIRCUIT_MONITOR_PROVISIONING.md),
[bàn giao](../implementation/LOCAL_CIRCUIT_MONITOR_PROVISIONING_REPORT.md).
