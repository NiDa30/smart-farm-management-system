# Trạng thái bằng chứng và nghiệm thu — 15/10/2026 (giờ Việt Nam)

## Vùng tưới V19 — mới nhất 15/10/2026

176 backend,29 browser node/history/zone,17 unit frontend,lint/build cuối đạt,
không skip. V18→V19 giữ dữ liệu alert cũ, không tự tạo vùng. Full-app test tạo/
sửa hai vùng từ hai SOIL node, khảo sát DRY/WET cùng packet, revision/binding
nguyên qua restart;command0/run0,MQTT/control tắt. [Chương29](CHAPTER_29_IRRIGATION_ZONES.md)
có năm ca Windows/AWS/Wokwi Chưa chạy. Không firmware/actuator/coordinator mới;
rule ENV01 hoạt động riêng, ngưỡng vùng không đổi alert30/35.


## Soil alerts V18 — mới nhất 15/10/2026

167 backend,24 browser alerts, 11 unit parser, lint/build đạt, không skip. V17→V18
bảo toàn3 packet/7 readings,không hồi tố. Full-app/API/PostgreSQL fixture mở đất
khô SOIL1/lỗi SOIL3,ACK→restart→đọc→phục hồi đóng giữ note;command0/run0,
MQTT/control tắt. Firmware không đổi, không AWS/Wokwi thật mới. Sáu ca trong
[chương28](CHAPTER_28_SOIL_ALERTS.md) còn Chưa chạy; rule vẫn ENV01, chưa van/
coordinator/soil-rule. Ngưỡng30/35 cố định demo, chưa calibration vật lý.


## SOIL nhiều điểm — 15/10/2026

V17 có SOIL/v2, UI/form/history/CSV, firmware Wokwi ba ADC và fault injection;
152 backend +22 browser node/history +13 unit frontend +17 Python WATER +7
Python SOIL, native/model/encoder và Pio/buildfs/merge public đạt, không skip.
Full-app/API/PostgreSQL test đọc ba packet/bảy readings, CSV/nguồn/fault riêng;
V16→V17 giữ flow status/history, command0/run0, MQTT/control tắt. Đây không phải
SOIL live hoặc phần cứng thật. Sáu ca AWS/Wokwi ở
[chương27](CHAPTER_27_SOIL_MULTIPOINT.md) vẫn Chưa chạy. Chưa có soil alerts,
IRRIGATION/valve/coordinator hay tưới từ SOIL01; rule hiện tại dùng ENV01.



Đợt flow guard trước V17 (15/10/2026 giờ Việt Nam): local flow guard opt-in có code/native và ESP32 build
cả enabled/legacy; **144 backend**, 12 Safety browser, 10 Event browser, 6 unit
Safety, 8 contract/4 wiring đạt; lint/build và full-app receive fixture đọc reason
OFF/locked đạt. Không AWS/Wokwi/flow vật lý mới, không thêm migration sau V16.
Guard chưa được chứng minh đang bật từ status. Xem [chương 26](CHAPTER_26_LOCAL_FLOW_GUARD.md).


Lịch sử WATER/CSV: **141 backend tests**, 18 browser node/history, 12 unit
node/history đạt; lint/build và smoke full app/CSV từ DB fixture giữ nguyên đạt.
Không migration mới sau V16 hoặc AWS/Wokwi mới; chưa tổng lít/no-flow cutoff.
Xem [chương 25](CHAPTER_25_WATER_HISTORY.md) và [báo cáo](../implementation/WATER_HISTORY_REPORT.md).


Cảnh báo nước V16: **132 backend tests**, 17 browser alerts và 4 unit frontend
nước đạt, không skip; lint/build đạt. Trung tâm Cảnh báo → Trạm nước lưu đợt,
nguồn, bằng chứng packet và đã xem; không phát lệnh bơm. Migration V15 giữ
mẫu cũ, không tạo đợt hồi tố. AWS/Wokwi mới vẫn **Chưa chạy**; xem
[chương 24](CHAPTER_24_WATER_ALERTS.md) và [báo cáo](../implementation/WATER_ALERTS_REPORT.md).


A2 monitoring: **119 backend tests**, 9 browser node, 6 unit node, 17 Python water
helpers/contracts/SDK mocks/diagram + 2 flash regression đạt; native model và
packet, ESP32 build/FS rỗng/merge và lint/build đạt. Full app/API/PostgreSQL
MID/source/fault/zero/stale fixture đạt, command0/run0, MQTT/control tắt.
**Chưa AWS/Wokwi live mới hoặc bảo vệ bơm dựa flow.** Firmware monitor không
có actuator output. Xem [chương23](CHAPTER_23_WATER_NODE_MONITOR.md).


Đợt nền A1/V14: **116 backend tests** không skip,7browser node,4unit node và
3Python water contract đạt; lint/build đạt. Full app/API/PostgreSQL registry
save→restart→read đạt, v2 measurement là SQL fixture sau restart, không AWS;
command0/run0. Chưa có WATER firmware/node mới hoặc flow safety. Xem
[chương22](CHAPTER_22_NODES_AND_WATER_CHANNELS.md).


Trang này phân biệt xác nhận của người dùng, kiểm tra giả lập và phần còn chờ.
Nguồn là [nhật ký](BUILD_JOURNAL.md), [sổ lỗi](TROUBLESHOOTING.md) và xác nhận
trực tiếp của người dùng trong nhiệm vụ rà soát tài liệu. Không kiểm tra AWS,
Wokwi hoặc code đang được agent khác sửa trong phiên biên tập này.

Bản local chốt tại commit `3d8bcd9` ghi 47 kiểm tra backend và 13 browser
fixtures automation đạt, không skip. Cloud tiếp quản đã chạy lại nền đó cùng
5 kiểm tra Event Log mới: 52 backend tests đạt trong đợt trước, 13 browser fixtures
quy tắc và 7 browser fixtures nhật ký đạt, 3 test telemetry đạt.

Đợt giám sát tiếp theo đạt **61 backend tests**, 7 browser fixtures giám sát
và 6 frontend unit tests, không skip; lint/build đạt. Smoke toàn app giám sát
qua API/DB thật với MQTT tắt đạt.

Cloud còn chạy smoke trên ứng dụng thật: menu → Vite proxy → Spring Boot →
PostgreSQL trong schema test riêng; MQTT/control tắt. Đây là bằng chứng tích
hợp API/UI Event Log, không phải bằng chứng AWS hoặc GPIO.

Đợt cài đặt tưới V11 đạt **72 backend tests**, 24 browser fixtures quy tắc,
11 frontend unit tests và lint/build, không skip. Smoke UI/API/PostgreSQL test
đã lưu cấu hình và đọc lại sau restart backend; MQTT/control tắt. Ngưỡng mới
trên Windows/AWS/Wokwi vẫn cần xác nhận, không thay bằng chứng V10.

Đợt trang an toàn đạt **78 backend tests**, 9 browser fixtures safety, 14 unit
frontend và lint/build, không skip. Smoke App/API/PostgreSQL chỉ GET và đối chiếu
DB giữ nguyên lệnh/run đạt. Không có kiểm chứng GPIO hay sự cố AWS/Wokwi live mới.

Đợt xác nhận đã xem V12 đạt **88 backend tests**, 9 browser cảnh báo, 8 Event
Log và 8 Dashboard, 17 unit frontend và lint/build. Smoke lưu/đọc sau restart
trên App/API/PostgreSQL giữ timestamp/note/điều kiện active đạt; MQTT/control
tắt. Không có phép thử AWS/Wokwi live mới trong đợt metadata này.

Đợt lịch tưới V13 đạt **103 backend tests**, 33 browser automation và 20 unit
frontend, lint/build không skip. Smoke App/API/PostgreSQL lưu/đọc sau restart
lịch tuần giờ VN, command0 và rule/MQTT/control tắt. Calendar gate/ACK dùng
transport fixtures; chưa thử lịch trên AWS/Wokwi live Windows.

Đợt relay/phao cạn nước đạt **104 backend tests**, 10 browser safety, 4 unit
safety và 7 Python contract, native RelaySafety + build ESP32 control/phao bật,
lint/build. Legacy thiếu flags mới build đạt, 3 ca sơ đồ tĩnh và smoke toàn
app/API/PostgreSQL GET-only cũng đạt (command0/run0). Chỉ sơ đồ/firmware/SQL/API fixtures được kiểm tra cloud; tất cả ca
relay-contact/phao/AWS/Wokwi mới ở chương21 vẫn **Chưa chạy**. Config local cũ
cần opt-in và ghép lại flash.bin. Chưa có NVS/flow/mức nước phần trăm.

Người dùng đã nói “đã hoạt động” sau bước đất khô bật tự động; ghi nhận là
user-reported một phần, chưa có timestamp/commandId/ACK/sequence để nghiệm thu
trọn sáu ca. OFF sớm, cooldown, timer và restart giữa run vẫn chờ xác nhận.
Lượt helper cũ 4 đạt/37 skip là lịch sử, không thay kết quả kiểm tra cuối.

| Hạng mục | Bằng chứng đã có | Giới hạn / việc còn chờ |
|---|---|---|
| Provisioning và MQTT | Nhật ký ghi người dùng cung cấp kết quả provisioning, probe CONNECT/LWT, serial telemetry/PUBACK và backend nhận dữ liệu | Từng mốc chỉ chứng minh phép thử tương ứng; không phải nghiệm thu toàn bộ AWS/Wokwi |
| PostgreSQL/API và Sensor Realtime | Response API live và xác nhận chạy thành công của người dùng đã ghi trong chương 8–9 | Chưa có xác nhận riêng cho mọi tình huống stale/outage/recovery, chống trùng và giữ dữ liệu sau restart |
| Điều khiển thủ công, timer, lịch sử trạng thái | Nhật ký ghi xác nhận của người dùng; có serial `RELAY_OFF reason=CONNECTION_LOST` | Chưa chứng minh runtime 60 phút, bơm vật lý hoặc toàn bộ phục hồi mạng |
| Lịch sử cảm biến | Người dùng xác nhận trang hoạt động | CSV live và phạm vi dữ liệu xuất vẫn cần xác nhận riêng |
| Cảnh báo đất thấp / nhiệt độ cao | Người dùng xác nhận mở và đóng đúng ngưỡng: đất `<30%` / `>=35%`; nhiệt độ `>35°C` / `<=33°C` | Xác nhận này không nghiệm thu quy tắc tưới hoặc mọi tình huống restart/mất dữ liệu |
| Quy tắc tưới tự động | Tests transport giả lập/PostgreSQL và 13 browser fixtures đạt; người dùng xác nhận bước bật tự động hoạt động | **Chưa nghiệm thu đầy đủ AWS/Wokwi** cho OFF sớm, cooldown, timer và restart giữa run |
| Nhật ký sự kiện | API/UI, 5 backend tests, 7 browser fixtures và smoke toàn ứng dụng với PostgreSQL test đạt | Chưa kiểm tra Event Log trên dữ liệu Windows/AWS của người dùng; không phải immutable audit log |
| Giám sát thiết bị | API/UI đọc registry, số đo, status, cảnh báo và lifecycle MQTT backend; cloud unit/integration/browser/smoke đạt | Chưa subscribe heartbeat mọi sensor; không chứng minh online/offline vật lý. Windows/AWS live còn chờ |
| Tổng quan IoT | Snapshot registry/monitoring/alert/rule/events thật; cloud 64 backend, 7 dashboard browser và 9 unit frontend đạt; full-app smoke đạt | MQTT/control tắt trong cloud; chưa nghiệm thu Windows/AWS live cho dashboard |
| Cài đặt tưới V11 | API phiên bản, giới hạn, khóa sửa khi active, snapshot run; backend/browser và smoke lưu/đọc sau restart đạt | Một rule, một backend process; không cấu hình ngưỡng alert; chưa nghiệm thu ngưỡng mới trên AWS/Wokwi |
| An toàn Fail-Safe & Edge | API/UI chỉ đọc, bản cũ/current tách biệt, queue toàn bộ và reason/history thật; cloud integration/browser/smoke đạt | Không xác minh firmware thực nạp, GPIO, dry-run, OTA, NVS; chưa thử live Windows/AWS |
| Xác nhận đã xem cảnh báo V12 | ACK/note idempotent riêng condition, Event Log người xem, row-lock/concurrency/migration/browser và restart smoke đạt | Chưa actor/auth, edit/unack/email; list100, GET theo ID; Windows/Wokwi mới chưa thử |
| Lịch tưới nông nghiệp V13 | Window VN/overnight/overlap, gate source/tick, OFF/chờ xác nhận, snapshot run, API/UI và restart persistence đạt | Một rule; backend phải chạy; default Cả ngày; chưa lịch độc lập ESP32/multi-area hoặc nghiệm thu lịch AWS/Wokwi |
| Tổng quan nông nghiệp (15/10/2026) |179 backend/15 browser dashboard/6unit/lintbuild đạt; full-app PostgreSQL fresh/stale đọc node, zone, count3 nhóm và menu thật |MQTT/control tắt, no AWS/Wokwi/GPIO mới;5ca live chưa chạy; header/EventLog/Safety/DeviceMonitoring vẫn phạm vi cũ |
| Ước tính lượng nước FLOW (15/10/2026) |194 backend/16 browser/5unit/lintbuild đạt; full-app lịch sử giữ lại, GET-only,0 khác unknown và có coverage |MQTT/control tắt;5ca live chưa chạy; chưa đo volume/kWh/chi phí thực địa hoặc cấp nước từng cây |
| Controller van LED riêng V20 |212backend/9browser/2unit/Python/native/ESPbuild+FSmerge/fullappGET-only đạt |Tất cả flags cloudfalse;6ca live chưa chạy; chưa van/pump/coordinator/soilrule/NVS vật lý |
| NVS và phục hồi mạng | Restart simulation từng cần thiết khi gateway restart không phục hồi phiên | **NVS chưa làm**; restart mất RAM, không phải bằng chứng reconnect thành công |

Tests với MQTT mock, API fixture, dữ liệu SQL thử hoặc native safety assertions
chỉ xác nhận hành vi trong môi trường kiểm tra. PostgreSQL thật trong tests
không biến MQTT giả lập thành kết nối AWS thật. PUBACK không chứng minh GPIO
đã thực thi hoặc transaction database đã commit; GPIO cũng không chứng minh
bơm vật lý đã chạy.

Các mục “chờ người dùng” trong nhật ký là trạng thái tại thời điểm ghi. Khi
có xác nhận mới, đối chiếu bảng này; giữ mục cũ để hiểu lịch sử. Phần audit
automation ngày 14/10 đã được đối chiếu với báo cáo bàn giao V10. Chỉ cập nhật
từ báo cáo đó; không suy luận thêm từ working tree đang được agent khác sửa.

Để nghiệm thu automation sau khi code được bàn giao, cần ghi lại phiên bản,
môi trường, giá trị cảm biến theo thời gian, commandId, ACK thực thi, status mới,
GPIO và run history. Đối chiếu riêng ca đất khô, đất đủ ẩm/tắt sớm, cutoff,
khoảng nghỉ, thao tác thủ công, thiếu ACK và restart. Kịch bản này là danh sách
cần xác nhận, không phải kết quả đã đạt.
Ghi kết quả vào [mẫu nhật ký Wokwi](WOKWI_AUTOMATION_TEST_LOG.md); các ca chưa có bằng chứng chi tiết vẫn để “Chưa chạy”.

## Hàng chờ V21 — 15/10/2026

229backend/12queue browser/5unit/9valve browser/lintbuild đạt, không skip.
Full-app PostgreSQL + restart tiến trình thật giữ REHEARSED/INTERRUPTED/
CANCELLED, không tự resume; pump/valve commands và watering_run0. Migration
V20→V21 giữ fixture van. Đây là PREVIEW_ONLY, chưa lease hoặc điều phối bơm
van thật. Windows5ca Chưa chạy, không có AWS/Wokwi/GPIO mới.
[Chương33](CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md).

## MQTT command fence V22 — 15/10/2026

247backend skip0,6pump browser,12queue browser hồi quy,17contracts, native
và firmware public default/opt-in/FS/merge/lintbuild đạt. Full-app GET-only
nhận native status quaJava/Postgres, giữ metadata qua restart thật; physical
control/MQTT tắt, command/run/queue0. V21→22 giữ4queue records/revision.
Chưa AWS/Wokwi/GPIO thật,6ca Windows Chưa chạy. MQTT fence chưa phải HTTP
intent fence/lease hay coordinator. [Chương34](CHAPTER_34_PUMP_COMMAND_FENCING.md).

## HTTP intent V23 — 15/10/2026

262backend skip0/11pump browser/4unit/lintbuild đạt; full app native status và
1OFF offline failed, replay đúngUUID/controlfalse không publish, UI GET-only
đối chiếu và restart process giữ record/tăng phiên. Queue migration giữ4lượt.
6ca Windows/AWS/Wokwi Chưa chạy; legacy mặc định chưa HTTP fence; ownership/
coordinator/dispatch queue chưa làm. [Chương35](CHAPTER_35_PUMP_HTTP_INTENT.md).


## Quyền sử dụng bơm V24 — 15/10/2026

286backend skip0 (24 ownership mới),15pump browser,5parserunit,lint/build đạt.
Full-app React/backend/PostgreSQL riêng + restart JVM giữ claim MANUAL từ
capture-only local transport; runtime MQTT/control/valve-demo false. Migration
V23→24 giữ command/run/active reference; không dùng timer để nhả quyền.
Sáu ca Windows/AWS/Wokwi mới Chưa chạy. Chỉ profile fencing opt-in; legacy
mặc định chưa ownership. Queue chưa dispatch, chưa sequencing van–bơm/lease
tự hết hạn/HA scheduler. [Chương36](CHAPTER_36_PUMP_OWNERSHIP.md).


## Phản hồi vị trí van V25 — 15/10/2026

300backend skip0 (14mới),13valve browser,4unit,native/public firmware default
và opt-in/emptyFS/merge/lintbuild đạt. Full-app encoder native→Java/PostgreSQL
fresh CLOSED rồi stale qua restart thật, metadata/time/binding giữ nguyên;
MQTT/control/valve-demofalse, command0. Migration V24→25 giữ status legacy
UNKNOWN. Sáu ca Windows/AWS/Wokwi mới Chưa chạy. Chỉ công tắc mô phỏng, chưa
van cơ khí/nước, global incident hoặc coordinator/dispatch queue.
[Chương37](CHAPTER_37_VALVE_POSITION_FEEDBACK.md).


## Nhánh tưới V26 — 15/10/2026

315backend skip0 (15mới),11browser cấu hình,16queue browser (4mới),lint/build
đạt. Migration V25→26 giữ lượt cũ/circuit_snapshot null. Full-app HTTP/UI/
PostgreSQL riêng tạo2nhánh chung controller/trạm, bản chụp hàng chờ giữ qua
restart JVM thật; active INTERRUPTED/BACKEND_RESTARTED, không resume/dispatch.
MQTT/control/valve-demo false, command/run0. Firmware không đổi;5ca Windows
mới Chưa chạy. Cấu hình dự kiến chưa provision/giữ chỗ registry, chưa multi-
valve transport/coordinator/flow proof hoặc tự tưới SOIL.
[Chương38](CHAPTER_38_IRRIGATION_CIRCUITS.md).


## Giám sát van theo nhánh V27 — 15/10/2026

333backend skip0 (17receiver+1worker isolation mới),18browser nhánh,16queue
browser,5policy/native/default+monitor firmware/emptyFSmerge/lintbuild đạt.
Config monitor+control bị compile từ chối đúng lý do (expected failure).
Full-app native encoder→receiver→PostgreSQL→React fresh rồi stale sau restart
JVM thật; metadata seq1 giữ nguyên, VALVE03 không mượn statusVALVE02, command/
run0. V26→27 giữ đúng2circuit/3queue records. Fresh thử đầu quá15s: dùng một
heartbeat native mới sequence1, không sửa timestamp0 hoặc resetDB.
5ca Windows/AWS/Wokwi mới Chưa chạy. Monitor chỉ SIMULATOR, một van/board;
chưa command nhiều van, coordinator hoặc dispatch queue.
[Chương39](CHAPTER_39_CIRCUIT_VALVE_MONITOR.md).
