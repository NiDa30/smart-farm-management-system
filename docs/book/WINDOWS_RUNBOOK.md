# Thực hành trên Windows: mở đúng terminal, chạy đúng thứ tự

**A2 monitoring/V15:** WATER có firmware riêng. Xem [chương23](CHAPTER_23_WATER_NODE_MONITOR.md)
để khai báo, render/apply quyền phù hợp, certificate riêng và chuẩn bị project
.local/water-nodes/WATER01. Không chỉ rebuild ENV hoặc copy key ENV sang WATER.
Backend restart migrate V15, v1 giữ nguyên; live mới còn chờ.


**A1/V14 node/kênh:** sau pull restart backend để migrate. Trong Sensor
Realtime chọn Node & trạm nước để khai báo; không phải thiết bị tự provision.
Đợt này không đổi firmware/diagram; hướng dẫn [chương22](CHAPTER_22_NODES_AND_WATER_CHANNELS.md).


**Cập nhật simulator nông nghiệp 14/10/2026:** xem
[chương21](CHAPTER_21_RESERVOIR_INTERLOCK.md). Có relay và phao mới, cần bổ
sung flag trong config local, build firmware/buildfs rồi merge lại ảnh flash;
không chỉ restart simulator. Mở firmware/esp32/diagram.json. Các đoạn V10 bên
dưới là lịch sử, không thay hướng dẫn cập nhật thiết bị này.


**Bản cloud mới có V11:** sau pull feature branch, restart backend để Flyway
thêm cài đặt quy tắc tưới, giữ database hiện có. Xem [chương 17](CHAPTER_17_WATERING_SETTINGS.md)
cho thao tác lưu/đối chiếu và giới hạn. Các đoạn V10 bên dưới là hướng dẫn của
bản bàn giao trước; không coi phiên bản migration đó là mới nhất.


Hướng dẫn này tổng hợp các lệnh đã ghi trong sách, không phải một lần chạy
nghiệm thu mới. Dùng bản code đã được người phụ trách hoàn tất và bàn giao.
Khi agent khác đang sửa code, không cập nhật nhánh hoặc restart để thử bản dở dang.

Với bản bàn giao V10 hiện tại, code mới đã nằm local: không yêu cầu pull/reset,
build firmware hoặc đổi IAM. Xem [chương tưới tự động](CHAPTER_13_AUTOMATIC_WATERING.md)
và [mẫu ghi kết quả](WOKWI_AUTOMATION_TEST_LOG.md). Đây là hướng dẫn thực hiện,
không phải xác nhận đã chạy demo.

## Phân biệt PowerShell và Git Bash

Mở terminal trong VS Code bằng Terminal → New Terminal và chọn đúng shell.
Mỗi terminal có thư mục làm việc riêng. Trước khi chạy, đưa terminal về thư mục
gốc repository:

```powershell
# PowerShell
Set-Location 'D:\IOT\Project\smart-farm-management-system'
```

```bash
# Git Bash
cd /d/IOT/Project/smart-farm-management-system
```

Khối `powershell` dùng cú pháp PowerShell; khối `bash` dùng Git Bash.
`export`, `source` và `hash -r` thuộc Bash; `$env:TEN_BIEN` thuộc PowerShell.
Script `.sh` của backend được chạy trong Git Bash, không dán nội dung script
vào PowerShell. Không cần mở terminal Administrator để chạy frontend/backend;
quyền đó chỉ cần cho bước bật Windows feature nếu máy yêu cầu.

## Chuẩn bị database

Mở Docker Desktop và chờ engine sẵn sàng. Trong Git Bash tại gốc repository:

Đợt demo hiện tại đã có database và cấu hình riêng theo báo cáo bàn giao;
không chạy lại helper khởi tạo database. Lệnh helper dưới đây chỉ dành cho
lần chuẩn bị đầu khi chưa có envfile. Với demo hiện tại, kiểm tra Docker và
Compose Healthy bằng các lệnh còn lại.

```bash
docker version
./.local/day1-venv/Scripts/python.exe tools/backend/init_local_database.py
docker compose --env-file .local/postgres/db.env up -d --wait postgres
```

`docker version` phải có cả Client và Server. Chờ Compose kết thúc và báo
PostgreSQL Healthy rồi mới chạy backend. Helper giữ envfile đã có; không đọc
hoặc gửi nội dung `db.env`. Không xóa volume để chữa lỗi Docker hay kết nối.
Xem [chương 8](CHAPTER_08_LOCAL_DATABASE_API.md) nếu WSL/PATH chưa sẵn sàng.

## Giữ ba terminal riêng khi chạy ứng dụng

| Terminal | Shell và lệnh tại gốc repository | Dấu hiệu cần kiểm tra |
|---|---|---|
| Backend | Git Bash: `bash tools/backend/run_backend_windows.sh` | Không có lỗi startup; API ở `127.0.0.1:8080` truy cập được; có `TELEMETRY_SAVED` khi nhận mẫu mới |
| Frontend | PowerShell hoặc Git Bash: `npm run dev` | Vite in địa chỉ local; mở đúng địa chỉ được in |
| Wokwi gateway | PowerShell hoặc Git Bash: `wokwigw` khi executable đã có trong PATH | Tiến trình gateway tiếp tục chạy; dùng với cấu hình private gateway đã bàn giao |

Gateway không thay thế backend hay frontend. Wokwi simulator chạy qua extension
VS Code, là một phiên riêng với terminal gateway. Theo workflow đã ghi nhận,
private gateway dùng `ws://localhost:9011`; hướng dẫn này không sửa `wokwi.toml`.
Nếu shell không tìm thấy `wokwigw`, kiểm tra nơi cài công cụ, không đoán executable.

Khởi động gateway trước simulator. Dừng probe MQTT cũ trước khi chạy backend;
không chạy probe dùng client `ENV01` cùng simulator vì hai phiên có thể ngắt nhau.
Giữ từng terminal mở, không dùng terminal đang chạy server để nhập lệnh khác.

## Backend demo tưới V10: dùng Git Bash mới

Dừng backend cũ bằng Ctrl+C, giữ database demo và cấu hình riêng. Mở một
terminal Git Bash mới từ VS Code hoặc cửa sổ mới, không mở từ terminal tests
có biến môi trường DB test. Không sao chép các biến `SMARTFARM_TEST_DB_URL`,
`SMARTFARM_DB_USER`, `SMARTFARM_DB_PASSWORD` của phiên kiểm tra vào demo.
Không dùng DB test cổng 55439/schema `telemetry_test` thay database demo.

Báo cáo bàn giao ghi backend/frontend đã được giữ chạy ở cuối lượt theo dõi;
đây là trạng thái tại thời điểm báo cáo. Kiểm tra terminal hiện có trước,
không mở thêm backend cùng cổng hoặc cùng MQTT client. Chỉ restart khi thực
hiện bước khởi động hoặc ca restart đã chọn trong nhật ký.

Từ gốc repository, sau khi database demo Healthy:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Lệnh này bật khả năng điều khiển của backend để thử LED mô phỏng; quy tắc vẫn
phải tắt sau startup. Flyway áp dụng V10, giữ dữ liệu demo. Nếu có run đang
theo dõi, chờ bằng chứng OFF mới; không bật lại khi run chưa được xác nhận dừng.
Frontend và gateway tiếp tục ở terminal riêng, simulator tiếp tục chạy.

## Kiểm tra từng lớp trước khi xem giao diện

Mở terminal thứ tư để kiểm tra API. Lệnh này dùng được trong PowerShell hoặc
Git Bash trên Windows khi `curl.exe` có trong PATH:

```text
curl.exe --fail http://127.0.0.1:8080/api/v1/devices/ENV01/telemetry/latest
```

HTTP 404 nghĩa là API đã phản hồi nhưng chưa có reading; lỗi connection refused
nghĩa là chưa kết nối được đến API. Một response có reading chưa chứng minh mọi
gói đều được lưu. Sau đó mở Sensor Realtime, đổi cảm biến Wokwi và đối chiếu
giá trị API với màn hình. Ghi kết quả thực tế, không đánh dấu đạt chỉ từ kỳ vọng.

## Dừng và khởi động lại

Sau demo tưới, **tắt quy tắc và xác nhận GPIO OFF trước khi dừng**. Không dùng
`docker compose down -v`: lệnh đó xóa volume, không phải bước kết thúc demo.

Dừng frontend/backend/gateway bằng Ctrl+C tại terminal tương ứng; Stop Wokwi
bằng extension. Muốn giữ dữ liệu database, dùng Git Bash:

```bash
docker compose --env-file .local/postgres/db.env stop postgres
```

Restart simulator là reboot thiết bị mô phỏng: **trạng thái RAM mất**, gồm khóa
an toàn và lý do sự cố chưa gửi. Firmware khởi động OFF; restart không chứng minh
luồng reconnect đã phục hồi hoặc lý do offline đã được lưu. **Lưu NVS chưa làm.**
Lịch sử đã nhận và lưu PostgreSQL khác với trạng thái RAM trên ESP32; không suy
ra rằng dữ liệu chưa gửi sẽ tự xuất hiện sau reboot.


## Trang An toàn Fail-Safe & Edge mới

Sau khi pull và restart backend, mở IoT → An toàn Fail-Safe & Edge. Trang dùng
API thật và chỉ đọc; không tạo lệnh reset/ON/OFF khi xem. Không cần đổi IAM,
build firmware hoặc migration mới sau V11 cho trang này. Giữ backend/frontend
ở các terminal riêng như trên. Trạng thái đã cũ hiện Chưa xác định, không tự
coi OFF hoặc không khóa. Chi tiết ở [chương 18](CHAPTER_18_SAFETY_OVERVIEW.md).


## Xác nhận đã xem cảnh báo V12

Sau pull/restart backend, Flyway thêm metadata V12, giữ incident/state cũ.
Không cần đổi IAM/build firmware hoặc tạo lại database. Trung tâm Cảnh báo
→ Chi tiết → ghi chú tùy chọn → Xác nhận đã xem. ACK không clear, không gửi
lệnh. Nếu kết quả chưa rõ, dùng Đối chiếu trạng thái. Xem [chương 19](CHAPTER_19_ALERT_ACKNOWLEDGEMENT.md).


## Lịch tưới theo tuần V13

Pull và restart backend như trên để Flyway thêm calendar V13. Không đổi IAM/
firmware. Quy tắc Tự động hóa → Lịch tưới theo tuần, sửa khi rule tắt và không
còn run. Lưu không bật rule; muốn thử phải bật rule có chủ đích. Giờ VN cố định,
hai mẫu đất khô mới trong khung mới được tính; backend phải chạy. Sau restart
rule lại tạm dừng. Xem [chương20](CHAPTER_20_AGRICULTURAL_IRRIGATION_CALENDAR.md).


### Trung tâm Cảnh báo trạm nước (V16)

Sau khi pull, restart backend để Flyway áp dụng V16, giữ PostgreSQL/config cũ.
Chỉ thử nước có thể dùng `SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh`.
Mở Trung tâm Cảnh báo → Trạm nước, đợi hai packet mới; flow 0 không tự báo mất
dòng. Không cần flash lại cho thay đổi backend/UI này. Đối chiếu
[chương 24](CHAPTER_24_WATER_ALERTS.md) trước thử phao/lỗi/đã xem.


### Lịch sử WATER và CSV (sau V16)

Pull/restart backend, mở Sensor Realtime → Node & trạm nước → nút Lịch sử của
kênh WATER. Chọn giờ máy/range tối đa 31 ngày, nguồn và quality, bấm Áp dụng.
CSV chỉ chứa trang hiện tại; thay bộ lọc/API lỗi sẽ khóa export. Không có
migration/flash mới. Xem [chương 25](CHAPTER_25_WATER_HISTORY.md).


### Local flow guard ENV GPIO25 — opt-in

Theo [chương 26](CHAPTER_26_LOCAL_FLOW_GUARD.md). Restart backend mới với
`SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh` khi thử
điều khiển. Giữ config.local.h/private data đang có, bật flow+phao interlock,
build/buildfs/merge ENV và mở đúng firmware/esp32/diagram.json. Mặc định flag mới
là 0, pull không tự bật. Chưa nghiệm thu Wokwi/flow vật lý; không coi status là
bằng chứng calibration/guard enabled. Không tạo lại DB hoặc cert cho bước này.

## SOIL01 ba điểm — nền A3 (15/10/2026)

Đọc [chương27](CHAPTER_27_SOIL_MULTIPOINT.md) trước khi chạy: pull/restart
backend để Flyway V17 nâng cấp, giữ PostgreSQL/config hiện có; frontend và
gateway ở terminal riêng. Mở Sensor Realtime → Node & trạm nước → Khai báo
node đất, giữ ba SIM_LINEAR_V1 cho mô phỏng. Chuẩn bị danh tính/cert **SOIL01
riêng**, dùng hai helper hiện có với --node-type SOIL. Project sinh trong
.local/soil-nodes/SOIL01; build/buildfs/merge theo project đó và mở đúng diagram.

Không copy config.local.h hoặc PEM ENV01/WATER01 vào SOIL01. Source public không
có endpoint/key, chỉ firmware build thành công không làm xuất hiện node live.
Giữ sáu ca Wokwi trong chương27 là Chưa chạy đến khi có dữ liệu. Quy tắc tưới
cũ vẫn ENV01; SOIL01 không có đầu ra bơm/van hoặc soil alerts trong lượt này.

## SOIL alerts V18 — 15/10/2026

Pull/restart backend để Flyway V18 nâng cấp, giữ database/config hiện có.
Frontend ở terminal riêng: `npm run dev`. Mở Trung tâm Cảnh báo → **Đất nhiều
điểm**. Không cần build/provision lại SOIL01 nếu packet v2 đang phát đúng;
chỉ khai báo registry chưa có dữ liệu thì chưa có alert. Hai mẫu dưới30% mới
mở, hai mẫu từ35% mới đóng; fault/null khác đất0, mất dữ liệu không tự hết.
ACK/ghi chú không điều khiển relay. Xem [chương28](CHAPTER_28_SOIL_ALERTS.md)
để đọc ngữ nghĩa, timeout/readback và sáu ca AWS/Wokwi còn Chưa chạy.

## Vùng tưới V19 — 15/10/2026

Pull/restart backend để Flyway V19 thêm hai bảng, không xóa PostgreSQL volume.
Frontend terminal riêng npm run dev. Mở **Sensor Realtime → Node & trạm nước
→ Vùng tưới** để gán ba kênh SOIL cùng node/khu vực, chọn source và ngưỡng.
Khai báo vùng chưa provision hoặc điều khiển; rule ENV01/PUMP01 vẫn độc lập.
Khi chỉ thử registry, tắt rule cũ và dùng backend control=false như
[chương29](CHAPTER_29_IRRIGATION_ZONES.md). Không cần flash/provision lại chỉ
để lưu vùng. Mẫu đúng source/cùng packet mới tính đa số; chờ năm ca live.

## Tổng quan nông nghiệp — 15/10/2026

Pull/restart backend và frontend đúng branch, giữ DB/cert/config. Mở
**IoT & Tự động hóa → Tổng quan IoT**: node đất, trạm nước, vùng tưới và tổng
cảnh báo ba nhóm. Không cần flash/provision lại cho thay đổi read model này.
Các card môi trường vẫn ENV/v1; source từng kênh do thiết bị khai báo.
Nếu UI mới thiếu agriculture, restart backend cũ; không xóa PostgreSQL volume.
Chi tiết và5 ca live Chưa chạy ở [chương30](CHAPTER_30_AGRICULTURE_OVERVIEW.md).

## Lượng nước từ FLOW — 15/10/2026

Pull/restart backend/frontend, giữ PostgreSQL/cert/config. Vào **IoT & Tự động
hóa → Tiêu thụ Nước & Điện → Nước**. Cần node WATER đã khai báo FLOW và phát
packet; chọn đúng source, range giờ máy≤24h rồi Tính lượng nước. Không cần
flash/provision lại chỉ để thêm API này. Nếu chỉ ENV01 hoặc registry chưa có
FLOW, không có ước tính; không lấy timer relay thay số đo. Đọc coverage và
nhóm hiệu chuẩn, không xem phần chưa có dữ liệu là0lít. Tab Điện chưa có kWh.
Xem [chương31](CHAPTER_31_WATER_VOLUME.md),5ca live mới vẫn Chưa chạy.

## Controller van LED riêng — 15/10/2026

Pull/restart backend/frontend để V20 chạy, giữ DB và certificate. Mở Điều khiển
Actuator → Mở controller van mô phỏng; tạo vùng SIMULATOR và lưu binding.
Đây là board IRRIGATION01 riêng: cần cert/policy riêng, config.local.h đúng
zone, IRRIGATION_DEMO_ENABLED1/SIMULATOR1, build/buildfs/merge và diagram mới.
Backend dùng SMARTFARM_IRRIGATION_DEMO_ENABLED=true độc lập cờ PUMP01.
Helper render_irrigation_policies.py chỉ render, không provision AWS. Làm theo
[chương32](CHAPTER_32_IRRIGATION_VALVE_DEMO.md); sáu ca live mới Chưa chạy.

## Hàng chờ tưới diễn tập V21 — 15/10/2026

Pull nhánh, restart backend/frontend để V21 chạy; giữ DB/volume. Vào Điều
khiển Actuator → Mở hàng chờ tưới diễn tập. Cần vùng SIMULATOR đã gán ba kênh,
không cần gateway/AWS/firmware mới. Thêm lượt1–30giây, bấm diễn tập đầu hàng;
không tự chạy lượt sau và không bật LED/bơm/van. Restart ngắt lượt đang diễn
tập. Xem [chương33](CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md);5ca Windows chưa chạy.

## PUMP01 chống MQTT cũ V22 — 15/10/2026

Mặc định giữ chế độ cũ. Muốn thử mới: tắt rule/OFF có xác nhận, pull/restart
backend để V22 migrate; private firmware FARM_PUMP_FENCING_ENABLED1/control1,
rebuild app/FS/merge và reboot. Backend export SMARTFARM_PUMP_FENCING_ENABLED=true
và SMARTFARM_CONTROL_ENABLED=true trước helper. Không đổi IAM/cert/Thing.
Lệch profile chặn ON/reset; legacy OFF ở firmware mới khóa đến reboot.
[Chương34](CHAPTER_34_PUMP_COMMAND_FENCING.md) có lệnh và6ca Chưa chạy. Queue
vẫn chỉ diễn tập; HTTP đến server muộn chưa có intent fence.

## HTTP intent PUMP01 V23 — 15/10/2026

Pull/restart backend và frontend cùng lúc, giữ DB để V23 migrate. Không flash
lại nếu đã dùng firmware V22 với hai phía opt-in; legacy mặc định vẫn cũ.
Web dùng UUID/context cho ON/reset và lưu mục chưa rõ qua reload cùng tab.
Đọc theo ID, không tự retry. OFF offline có thể đã lưu failed/barrier; phải
đối chiếu lịch sử, không coi503 là chưa lưu ý định tắt.
[Chương35](CHAPTER_35_PUMP_HTTP_INTENT.md) có6ca Windows Chưa chạy.


## Cập nhật V24: quyền sử dụng PUMP01

Pull và restart backend/frontend để migrate V24. Nếu V22 đã opt-in backend
và firmware, không rebuild firmware hoặc sửa IAM vì V24. Không chạy lẫn
binary backend cũ/mới trên cùng DB. Trong Điều khiển Actuator xem panel
Quyền sử dụng bơm: claim chưa khép thì ON/reset bị chặn; OFF thủ công vẫn
ưu tiên khi control đã bật. Rule đang bị manual hold phải được người dùng
bật lại; restart không tự resume. Không xóa volume hoặc sửa DB để ép nhả quyền.
Sáu ca thử và bằng chứng cần ghi trong [chương36](CHAPTER_36_PUMP_OWNERSHIP.md);
tất cả ca Windows/Wokwi của V24 hiện Chưa chạy. Queue chưa điều phối thật.


## Cập nhật V25: hai công tắc vị trí VALVE01

Update backend/frontend trước, rồi mới opt-in firmware vì backend cũ strict
chưa nhận positionFeedback. Vào Điều khiển Actuator → Mở controller van mô
phỏng; mở project Wokwi firmware/irrigation-node, không phải ENV01.
Private config controller: IRRIGATION_POSITION_FEEDBACK_ENABLED1, giữ demo1/
simulator1 và zone/cert riêng đã có; build app/FS/merge và restart simulator.
Backend SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED=true để bắt buộc phản
hồi trước OPEN. Mặc địnhfalse giữ demo cũ; config cũ thiếu macro mới mặc định0.
Không thêm IAM/topic/cert cho V25.
Lệnh Git Bash cho ca thử (Windows/Wokwi mới vẫn chưa nghiệm thu):

```bash
SMARTFARM_IRRIGATION_DEMO_ENABLED=true \
SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED=true \
bash tools/backend/run_backend_windows.sh
```

closedStop GPIO32/contact1GND, openStop GPIO33/contact3GND, activeLOW. Khi đi
tới mở, nhả closedStop rồi tác động openStop trong3s, tránh cả hai cùng tác
động. Fault cần CLOSED ổn định và CLOSE mới; restart không tự mở. Sáu ca
[chương37](CHAPTER_37_VALVE_POSITION_FEEDBACK.md) đều Chưa chạy trên Windows/Wokwi.
Không nối bơm chung trong các ca này; coordinator chưa làm.
