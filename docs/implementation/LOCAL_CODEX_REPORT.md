# Báo cáo Codex local — quy tắc tưới ENV01 → PUMP01

**Đợt chốt hiện tại:** 47 backend tests (4 unit/self-test + 43 PostgreSQL
integration) đạt; 13 browser API-fixture tests cho giao diện automation đạt;
lint/build đạt, không test skip. Chi tiết và phạm vi file của đợt chốt ở
[mục 10](#10-chốt-đợt-hiện-tại--14102026). Các mục trước đó giữ lịch sử từng
lượt, gồm kết quả 41 tests và bước khởi động runtime 00:49; không cộng dồn
các lượt chạy thành số test khác nhau. AWS/Wokwi automation thật chưa nghiệm thu.

Ngày: 14/10/2026, Windows, múi giờ Asia/Saigon. Repository:
`D:\IOT\Project\smart-farm-management-system`. Không commit/push.

## 1. Nhánh, commit nền và working tree ban đầu

- Nhánh thực tế và dự kiến: `feat/day1-iot-foundation`.
- HEAD nền: `943d22a2f1d7d56a84ca6fd6a0a8287af2554b50`.
- Git ban đầu: `D firmware/esp32/data/.gitkeep`, `M firmware/esp32/wokwi.toml`,
  `?? react-example@0.0.0`, `?? tsc`.
- Git/rg không đọc được `firmware/esp32/data` do quyền local; ký hiệu D không
  đủ để kết luận người dùng đã xóa file. Không mở thư mục, đổi ACL hoặc phục hồi file.
- Bảo toàn các thay đổi/file trên. Không reset/clean/stash, không chuyển nhánh.
- Không tìm thấy AGENTS.md ở root, các thư mục cha đã kiểm tra hoặc các cây
  backend/src/tools/docs đã tìm kiếm; Git không có AGENTS.md tracked. Quét toàn
  workspace bị giới hạn ở thư mục firmware riêng tư nêu trên.
- Đã đọc kế hoạch MVP, checklist, BUILD_JOURNAL và chương 13. Checklist live
  không được đánh dấu thành công từ kết quả local.

## 2. Vấn đề, nguyên nhân và cách sửa

| Vấn đề | Nguyên nhân | Cách sửa |
|---|---|---|
| Hai mẫu khô bị tính liên tiếp dù có mẫu ướt ở giữa | Tick chỉ đọc latest | Duyệt các mẫu chưa xử lý theo timestamp; mẫu ướt reset count; hai mẫu mới giữa hai tick được đọc cả hai |
| Mẫu sai thứ tự/đổi boot có thể nối count | Chỉ có watermark timestamp | V10 lưu boot/sequence; sequence cũ bị bỏ qua, boot mới bắt đầu count=1; timestamp chuẩn hóa milliseconds |
| OFF chưa ACK có thể kết thúc run | So status timestamp với issuedAt không chứng minh GPIO đã thực thi | OFF mới phải cùng boot, sequence lớn hơn ACK EXECUTED của ON/OFF; thiếu ACK chỉ reconcile OFF mới sau expiresAt+runtime |
| Mốc chờ thiếu ACK trước đây quá sớm | Mốc issuedAt+22 không tính lệnh đến sát TTL | Mốc bảo thủ expiresAt+20, tức issuedAt+30 với rule này; vẫn cần status OFF mới |
| Publish ON chưa rõ mất liên kết command/run | PumpService insert rồi throw, rule không biết commandId | Exception mang commandId; lưu active run, pause; OFF thử đúng một lần, giữ tracking cả khi publish OFF chưa rõ |
| Restart với MQTT tắt có thể giữ enabled | Hook startup nằm trong scheduler có điều kiện MQTT | RuleStartup độc lập MQTT, luôn safeStartup; giữ active command để reconcile, không replay ON |
| ACK SUCCESS sai trạng thái được chấp nhận | Không đối chiếu reportedState với action | ON chỉ nhận SUCCESS/ON, OFF và RESET_LOCKOUT chỉ nhận SUCCESS/OFF |
| Boot khác timestamp bằng nhau có thể thay status | SQL cho phép boot khác với timestamp bằng | Boot khác phải có timestamp lớn hơn; cùng boot vẫn cần sequence tăng và timestamp không giảm |
| Safety lockout trong run chỉ pause, chưa yêu cầu stop | manualHold không đặt stop_requested | Khóa an toàn đặt stop_requested, dùng luồng OFF một lần |
| UI không giải thích cooldown/pending/readiness | Tick return mà giữ kết quả cũ | Thêm lý do tiếng Việt, ACK thực thi riêng với SENT; polling phục hồi xóa lỗi cũ |
| Maven wrapper Windows không chạy | .Target null nhưng truy cập [0] | Kiểm tra Target trước index, giữ nguyên phiên bản/checksum Maven |

Khoảng nghỉ bắt đầu từ lúc backend xác nhận OFF và kéo dài ít nhất 60 giây.
SENT/PUBACK không được dùng làm bằng chứng GPIO ON. Runtime rule luôn 20 giây,
không sửa timer thủ công 1 giờ đang có hoặc mở rộng chức năng firmware/NVS.

## 3. File thay đổi và hành vi trước/sau

| File | Thay đổi chính |
|---|---|
| backend/src/main/java/vn/smartfarm/iot/automation/WateringRule.java | Latest-only → các mẫu chưa xét; bổ sung boot/sequence, lý do blocked, xác nhận OFF theo ACK/sequence hoặc deadline, giữ uncertain command |
| backend/src/main/resources/db/migration/V10__watering_sample_identity.sql (mới) | Thêm hai cột nullable, không xóa dữ liệu hoặc sửa checksum V9 |
| backend/src/main/java/vn/smartfarm/iot/automation/RuleStartup.java (mới) | Pause persisted rule ở mọi lần startup, độc lập MQTT |
| backend/src/main/java/vn/smartfarm/iot/automation/RuleScheduler.java | Bỏ hook startup có điều kiện; lịch tick giữ nguyên |
| backend/src/main/java/vn/smartfarm/iot/control/PumpService.java | UncertainPublish có commandId, kiểm tra ACK đúng action, status boot khác timestamp tăng |
| backend/src/test/java/vn/smartfarm/iot/telemetry/WateringRuleTest.java | Fixture sensor cùng boot; thêm ca mẫu trung gian, hai mẫu giữa tick, restart, pending/lockout, ACK/status, OFF failed, mất transport, gap>15s |
| backend/src/test/java/vn/smartfarm/iot/telemetry/PumpControlTest.java | ACK SUCCESS sai relay state và status đến sai thứ tự/boot bằng timestamp |
| backend/mvnw.cmd | Sửa truy cập null Target trên PowerShell |
| src/modules/iot/automation/AutomationManager.tsx | Nhãn trạng thái/lý do tiếng Việt; xóa lỗi sau polling phục hồi |
| docs/book/BUILD_JOURNAL.md, CHAPTER_13_AUTOMATIC_WATERING.md, TROUBLESHOOTING.md | Bằng chứng local và giải thích lỗi/cách thử |
| docs/implementation/LOCAL_CODEX_REPORT.md (mới) | Báo cáo này |

Không chỉnh firmware hoặc thay đổi local wokwi.toml của người dùng.
Trong lúc audit, một phiên biên tập khác cập nhật thêm README sách, phần mở
đầu journal/chương 13/troubleshooting và tạo ACCEPTANCE_STATUS.md,
WINDOWS_RUNBOOK.md. Đã giữ nguyên các phần này; không nhận chúng là thay đổi
code hoặc bằng chứng kiểm tra của lượt Codex này.

## 4. Lệnh kiểm tra và kết quả

PostgreSQL test tách biệt hoàn toàn demo: container
`smartfarm-codex-watering-test`, image `postgres:16-alpine`, PostgreSQL 16.15,
cổng loopback 55439, database/user `watering_test`, schema `telemetry_test`.
Test container dùng trust auth để không cần secret; không gắn volume demo.
MQTT=false trong test, CommandTransport mock. Chỉ truncate schema test theo
fixture repository; test migration tạo/xóa schema upgrade riêng trong DB test.

Lệnh tạo container local đã chạy qua cơ chế cấp quyền Docker:

```powershell
docker run --name smartfarm-codex-watering-test -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=watering_test -e POSTGRES_DB=watering_test -p 127.0.0.1:55439:5432 -d postgres:16-alpine
```

Maven từ thư mục backend, biến chỉ dùng trong tiến trình kiểm tra:

```powershell
$env:SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/watering_test?currentSchema=telemetry_test'
$env:SMARTFARM_DB_USER='watering_test'
$env:SMARTFARM_DB_PASSWORD=''
./mvnw.cmd -B verify
```

| Kiểm tra | Kết quả |
|---|---|
| npm.cmd run lint | PASS; TypeScript --noEmit, không phải test runner |
| npm.cmd run build | PASS, 1746 modules; cảnh báo sẵn có __dirname và bundle >500 kB |
| Maven verify lượt đầu | PASS 37 tests; failures/errors/skipped=0 |
| Maven verify lượt cuối sau sửa/bổ sung test | BUILD SUCCESS 41 tests; failures/errors/skipped=0; kết thúc 00:37:49 +07 ngày 14/10 |
| node --import tsx --test src/modules/iot/realtime/telemetryApi.test.ts | PASS 3 tests, 0 skip sau chạy ngoài sandbox |
| git -c core.whitespace=cr-at-eol diff --check -- backend src docs | PASS |

Phân bố Java lượt cuối: MqttConnectivityProbeTest 1 (self-test, không AWS),
PumpControlTest 11, SensorAlertsTest 4, TelemetryDatabaseTest 6,
TelemetryValidatorTest 3, WateringRuleTest 16. Báo cáo JUnit XML ở
backend/target/surefire-reports (artifact local, không commit).

Các lần lỗi môi trường: Docker bị sandbox chặn trước khi cấp quyền; wrapper
ban đầu lỗi Target null, sau sửa bị mạng sandbox chặn tải Maven; chạy lại qua
quyền môi trường đạt. Test tsx trong sandbox báo uv_os_get_passwd ENOMEM trước
khi thực thi 3 test; chạy lại ngoài sandbox đạt. Không tính lỗi khởi động runner
đó thành test ứng dụng đã chạy. git diff --check mặc định nhận CRLF của wrapper
là trailing whitespace; kiểm tra cr-at-eol giữ đúng định dạng Windows hiện có.

## 5. Chưa kiểm chứng và giới hạn

- Người dùng cung cấp: telemetry trên Sensor Realtime; manual/timer/history;
  firmware CONNECTION_LOST; sensor history và LOW_SOIL/HIGH_TEMPERATURE.
- Local đã kiểm tra: persistence/migration, rule/control với transport giả lập,
  ACK trước PUBACK, OFF/status trước ACK, thứ tự sequence, mẫu trung gian,
  uncertain dispatch, cooldown, startup hook và state persisted trong test DB.
- **AWS/Wokwi automation thật: UNRUN trong lượt này.** Không quan sát GPIO,
  không đo runtime/timing qua AWS, không gửi control hoặc thay IAM/resources.
- Restart giữa run được thử bằng gọi startup hook trên state DB test; chưa
  kill/restart tiến trình backend giữa lần chạy GPIO/AWS thật.
- Tại lượt 41 tests chưa có browser test UI automation; đợt chốt mục 10 đã
  bổ sung 13 ca browser fixtures. Chưa build firmware; firmware không sửa.
- Thiếu status OFF mới thì run giữ unresolved, không tự thử lại ON. Khi ACK mất,
  OFF trước mốc TTL+runtime chưa đủ để tự giải phóng run.
- Một backend process; không thêm điều phối nhiều instance hoặc giao dịch
  nguyên tử DB/MQTT. Khoảng trống publish trước ghi rule/run được phát hiện
  tại lượt đầu và đã sửa ở mục 10 bằng commit tracking trước publish;
  startup luôn tắt rule, không replay ON. Không tuyên bố exactly-once DB/MQTT.
- NVS và phục hồi mạng Wokwi để sau; restart simulator vẫn mất state RAM như
  người dùng đã nêu. LED/GPIO không chứng minh bơm vật lý cấp nước.
- Không đọc secret configs/.local/aws/private key hoặc đưa chúng vào báo cáo.

## 6. Cập nhật/chạy trên Windows

1. Các thay đổi đã nằm trong workspace hiện tại; không cần pull/checkout/reset.
   Xem git status và diff, giữ nguyên các file local của người dùng. Chưa có commit mới.
2. JDK21 và Docker Desktop Linux containers đang dùng được. Không cần cài lại
   dependency frontend vì lint/build đã chạy. Wrapper mvnw.cmd nay chạy PowerShell được.
3. Nếu muốn chạy lại tests, dùng DB test nêu trên: `docker start smartfarm-codex-watering-test`
   rồi chạy Maven với đúng URL cổng 55439 và currentSchema=telemetry_test. Không
   thay URL test sang DB demo. Container test được dừng sau audit; không xóa dữ liệu test.
4. Mở terminal Git Bash mới cho backend demo, tránh kế thừa biến database test.
   Dừng backend cũ, giữ database demo và file cấu hình riêng đang có. Sau khi
   người dùng chủ động bắt đầu phép thử có điều khiển, chạy từ root:

   ```bash
   SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
   ```

   Helper hiện có đọc cấu hình riêng tại máy người dùng; không in hoặc gửi nội
   dung config. Flyway áp dụng V10 trên DB demo, không truncate. Quy tắc phải tắt
   sau restart; nếu có run cũ, chờ OFF được xác nhận trước khi bật lại.
5. Terminal frontend: `npm.cmd run dev` từ root (PowerShell), mở cổng 3000.
   Kiểm tra Actuator có OFF fresh, control enabled, không lockout; cảm biến fresh.
6. Test xong tắt quy tắc, xác nhận OFF rồi dừng backend/simulator theo runbook.
   Không dùng docker compose down -v. Chưa cần đổi firmware, IAM hay resource AWS.

## 7. Kịch bản Wokwi do người dùng thực hiện

Chỉ dùng LED mô phỏng. Mở Sensor Realtime, Quy tắc Tự động hóa và Điều khiển
Actuator; giữ gateway/Wokwi. Ghi thời điểm UTC, bootId, sequence, commandId,
run ID, ACK stage/status và GPIO/serial đã làm sạch; không gửi config riêng.

| Bước | Thao tác | Mong đợi / bằng chứng |
|---|---|---|
| A — Khởi động | Soil 45%, restart backend | Rule tắt, không có ON mới. Cảm biến và pump OFF fresh trước khi bật rule |
| B — Một mẫu | Bật rule ở 45%; đổi soil 28% và quan sát mẫu mới đầu | Count 1/2, chưa ON; không tính mẫu trước lúc enable |
| C — Hai mẫu | Giữ 28% đến mẫu kế tiếp trong ≤15 giây | Đúng một ON durationSeconds=20, một run; SENT chưa chứng minh ON; cần EXECUTED SUCCESS/ON và GPIO/LED |
| D — Đất đủ ẩm | Khi LED ON, tăng soil đến 35% trước 20 giây | Một OFF sớm; status OFF có sequence sau ACK thực thi, run kết thúc; GPIO/LED tắt |
| E — Cooldown | Ngay sau OFF đưa soil về 28% | Không ON trong ít nhất 60 giây tính từ backend xác nhận OFF; UI báo đang nghỉ. Sau nghỉ, hai mẫu fresh đủ điều kiện có thể tạo run tiếp |
| F — Timer | Sau cooldown giữ đất 28% suốt run | Firmware tự OFF khoảng 20 giây từ thực thi ON; status/ACK/history đúng, không dùng SENT để suy ra GPIO |
| G — Manual | Trong run gửi OFF bằng trang Actuator | Rule tạm dừng, không ON tiếp khi soil còn thấp; phải bật lại chủ động |
| H — Restart backend | Trong run ON, dừng/restart backend, giữ simulator chạy | Rule tắt, không replay ON, active run vẫn theo dõi; GPIO hết timer; OFF mới kết thúc run và tạo cooldown; chưa OFF thì không bật rule lại |
| I — Dữ liệu cũ/mạng mất | Dừng simulator để telemetry/status hết fresh | Không tự ON, UI lý do chặn/cũ. Network-loss GPIO OFF là kết quả người dùng đã có; phục hồi không reboot cần test riêng, chưa giả định đạt |
| J — Mẫu trung gian | Trong môi trường test riêng đưa 28→40→28 trước một tick | Không coi hai mẫu khô liên tiếp. Đã PASS local; không cần publish telemetry giả vào luồng live |
| K — ACK/status bất thường | Dùng transport test: OFF trước ACK, ACK ON sai state, OFF thất bại, publish chưa rõ | Đã PASS local: chưa giải phóng run/cooldown, không retry ON, OFF không flood. Không sửa IAM hoặc inject command AWS thật để ép lỗi |

Các bước A–I hiện là kế hoạch kiểm chứng, chưa ghi PASS live. Nếu simulator
restart làm mất dedupe/timer RAM, giữ rule tắt và coi đó là boot mới; không
đánh giá NVS thành công. Sau demo tắt rule và xác nhận GPIO OFF.

## 8. Tài liệu sách đã cập nhật

- BUILD_JOURNAL.md: phân biệt xác nhận người dùng/local/live, lỗi và 41 tests.
- CHAPTER_13_AUTOMATIC_WATERING.md: mẫu liên tiếp, OFF/ACK/cooldown, startup,
  migration V10 và liên kết kịch bản Windows/Wokwi.
- TROUBLESHOOTING.md: latest-only, causal OFF, uncertain publish, boot/status,
  wrapper PowerShell, giới hạn sandbox/CRLF và thư mục firmware riêng tư.

## 9. git diff --stat cuối cùng

`git diff --stat` (không stage, nên không bao gồm file untracked):

```text
 backend/mvnw.cmd                                   |  5 +-
 .../vn/smartfarm/iot/automation/RuleScheduler.java |  1 -
 .../vn/smartfarm/iot/automation/WateringRule.java  | 76 ++++++++++++++-----
 .../java/vn/smartfarm/iot/control/PumpService.java | 14 +++-
 .../smartfarm/iot/telemetry/PumpControlTest.java   | 17 +++++
 .../smartfarm/iot/telemetry/WateringRuleTest.java  | 88 +++++++++++++++++++++-
 docs/book/BUILD_JOURNAL.md                         | 44 +++++++++++
 docs/book/CHAPTER_13_AUTOMATIC_WATERING.md         | 50 +++++++++++-
 docs/book/README.md                                |  4 +
 docs/book/TROUBLESHOOTING.md                       | 45 +++++++++++
 firmware/esp32/wokwi.toml                          |  2 +
 src/modules/iot/automation/AutomationManager.tsx   |  3 +-
 12 files changed, 319 insertions(+), 30 deletions(-)
```

Git còn cảnh báo permission denied ở firmware/esp32/data/.gitkeep nên stat
không đầy đủ cho mục local đó. Hai dòng thêm trong wokwi.toml là thay đổi đã
có trước audit, không phải sửa của Codex. File mới chưa stage: RuleStartup.java,
V10__watering_sample_identity.sql và báo cáo này. `react-example@0.0.0`, `tsc`
vẫn là file riêng của người dùng. File sách mới ACCEPTANCE_STATUS.md và
WINDOWS_RUNBOOK.md cùng các phần biên tập đồng thời cũng chưa stage; stat bao
gồm các sửa tracked của phiên đó. Không stage để giữ nguyên trạng thái Git local.

Tóm tắt chuyển tiếp: đã sửa lỗi mẫu trung gian, OFF chưa xác nhận, uncertain
publish và startup phụ thuộc MQTT; V10 và UI tiếng Việt đã cập nhật. Local
Windows đạt 41 backend tests +3 frontend tests, 0 skip, lint/build PASS. Chưa
commit/push, không gửi lệnh AWS; chờ người dùng chạy các bước Wokwi A–I trước
khi nghiệm thu quy tắc tưới thật. NVS/network recovery vẫn để sau.

## Theo dõi phép thử nhóm 1 — 14/10/2026, 00:49 +07

Người dùng yêu cầu bắt đầu nhóm thử live và cho phép chạy helper backend.
Không thấy backend cũ lắng nghe 8080. Đã chạy helper bằng Git Bash mới, loại
bỏ biến DB test trong tiến trình trước khi helper nạp cấu hình runtime hiện có;
không in nội dung cấu hình. Sandbox không truy cập được envfile, chạy lại qua
cơ chế cấp quyền thành công. Không chạy helper khởi tạo lại database.

- Backend khởi động trên 8080, Flyway áp dụng V9→V10 vào schema public của DB
  demo đang có, không truncate/xóa dữ liệu. Đây là bước runtime được người dùng
  yêu cầu sau audit local ở trên.
- Log `MQTT_TELEMETRY_SUBSCRIBED` xác nhận subscription AWS; chưa có telemetry
  mới hoặc GPIO làm bằng chứng cho phép thử tưới.
- GET rule: enabled=false, lowCount=0, activeCommand=null,
  lastResult=RESTART_PAUSED. Bước quy tắc tắt sau khởi động: đạt ở API, chưa
  quan sát trực tiếp trang automation.
- GET PUMP01: UNKNOWN, fresh=false, safetyLockout=false, controlEnabled=true.
  Telemetry/status cuối có timestamp 2026-10-13T16:03:26Z, đã cũ.
- Frontend Vite đang chạy cổng 3000. Chưa thấy gateway lắng nghe 9011;
  wokwigw không có trên PATH của shell này. Phiên agent không có công cụ điều
  khiển Wokwi extension hoặc quan sát LED.
- Không bật rule hoặc gửi ON/OFF trong lượt này. Các bước đất 28%→ON,
  SUCCESS/ON, đất 40%→OFF sớm và cooldown 60 giây: chưa thực hiện.
- Helper tự chạy verify: 41 test được liệt kê, **4 chạy đạt, 37 skip**, vì
  SMARTFARM_TEST_DB_URL đã bỏ khỏi môi trường live. Đây không phải lượt 41/41
  PostgreSQL test ở mục 4. Surefire artifacts hiện đã được lượt helper ghi lại;
  số liệu 41/41 trước đó được ghi từ output kiểm tra trước khi khởi động live.
- Giữ backend/frontend chạy để người dùng mở gateway, Start Wokwi, chỉnh đất
  45%, chờ OFF fresh rồi thực hiện nhóm thử. Rule hiện vẫn tắt. Không commit/push.

## 10. Chốt đợt hiện tại — 14/10/2026

### Phạm vi và phần tái sử dụng

Đọc báo cáo và diff đang có trước khi sửa, không audit lại repository. HEAD
vẫn `943d22a2f1d7d56a84ca6fd6a0a8287af2554b50`, nhánh
`feat/day1-iot-foundation`; mọi thay đổi local/agent khác giữ nguyên. Đợt này
**không sửa docs/book/**, không khởi động lại backend demo, không gọi API live
để bật/tắt và không gửi lệnh AWS. Chỉ file báo cáo này được cập nhật trong docs.

Giữ nguyên V10 đã áp dụng, không sửa checksum hoặc thêm migration mới. Tái
sử dụng các kiểm tra ACK/status, OFF/cooldown/restart và 3 unit tests telemetry
frontend đã đạt. Không chạy lại 3 test telemetry vì phần đó không đổi; chúng
không được tính vào browser automation. Không làm NVS hoặc chức năng tiếp theo.

### Lỗi còn lại đã sửa

| Lỗi / ảnh hưởng | Trước | Sau |
|---|---|---|
| Backend dừng ngay lúc publish có thể mất liên kết run | Chỉ ghi active_command/run sau PumpService.create trả về | Hook trước publish commit active_command và watering_run trong một transaction; test kết nối DB thứ hai thấy tracking đã commit trước transport, rồi mô phỏng dừng tiến trình |
| Uncertain publish có thể tạo hai bản ghi lịch sử khi thêm tracking sớm | Catch luôn insert run mới | Cập nhật run đã có, chỉ insert khi chưa có; vẫn pause và không retry ON |
| Mẫu đầu đã quá 15 giây vẫn được nối vào mẫu thứ hai | lowCount lưu từ tick trước, chỉ kiểm tra khoảng cách timestamp | Reset count cũ nếu mẫu trước không còn fresh; mẫu mới bắt đầu count=1 |
| Pending ngoài 20 lệnh lịch sử bị bỏ sót ở bước chờ | Rule dùng danh sách history LIMIT 20 | Đếm tất cả command đang pending sau xử lý timeout; giữ rule chờ, không chuyển thành dispatch failure do lịch sử bị cắt |
| Lý do/history chưa phản ánh OFF thất bại | stop_command đã có thì return; lastResult có thể còn STOP_SENT hoặc bị ghi đè bởi lỗi ON | Đọc state OFF theo ID, cập nhật STOP_UNCONFIRMED cả state và run history, không gửi lại OFF |
| Manual hold và dispatch không cùng khóa với tick/configure | Controller gọi manualHold rồi create riêng | manualCommand giữ khóa rule xuyên suốt pause và dispatch; test controller xác nhận disabled trước transport và không tự resume |
| Polling cũ và PUT tranh nhau cập nhật UI | GET đang bay có thể trả lỗi/state cũ trong lúc cấu hình | Dừng polling khi PUT đang chờ, hủy GET cũ và kiểm tra phiên request trước khi áp dụng |
| Lỗi PUT 409 bị GET thành công che mất | Dùng chung một error; mọi GET thành công đều xóa | Tách lỗi tải và lỗi thao tác; 409 giữ lý do để người dùng xử lý, lần thử thành công xóa lỗi |
| PUT mất phản hồi, lỗi vẫn tồn tại dù GET đã xác nhận | Chưa phân biệt thay đổi chưa rõ với bị từ chối | Theo dõi trạng thái cần xác nhận; GET đúng trạng thái mới xóa lỗi chưa xác nhận, không retry PUT |
| Body PUT sai vẫn có thể được coi là state hợp lệ | setRule trực tiếp từ JSON | Kiểm tra cấu trúc rule cho cả GET và PUT; lỗi mạng/timeout hiển thị tiếng Việt |

### File của riêng đợt chốt này

- `backend/src/main/java/vn/smartfarm/iot/automation/WateringRule.java`:
  tracking trước publish, count freshness, pending đầy đủ, OFF/history và manualCommand.
- `backend/src/main/java/vn/smartfarm/iot/control/PumpService.java`:
  overload create nhận hook sau khi lưu command và trước transport.
- `backend/src/main/java/vn/smartfarm/iot/control/PumpController.java`:
  dùng manualCommand để giữ thứ tự pause/dispatch.
- `backend/src/test/java/vn/smartfarm/iot/telemetry/WateringRuleTest.java`:
  thêm 6 ca hồi quy, kiểm tra ngưỡng OFF chính xác 35%, run uncertain không trùng
  và trạng thái OFF thất bại. V9→V10 giữ active run/history và thêm cột nullable.
- `src/modules/iot/automation/AutomationManager.tsx`: sửa race, validation và lỗi UI.
- `package.json`, `package-lock.json`: pin devDependency `@playwright/test=1.64.0`
  và script `test:automation`; không đổi dependency runtime khác.
- `playwright.automation.config.ts`, `tools/tests/automation.browser.spec.ts`,
  `tools/tests/automation-fixture-server.mjs`,
  `tools/tests/fixtures/automation/index.html`,
  `tools/tests/fixtures/automation/main.tsx`: browser fixture runner mới.
- `docs/implementation/LOCAL_CODEX_REPORT.md`: báo cáo này.

Các thay đổi RuleStartup, RuleScheduler, PumpControlTest, mvnw.cmd và V10 từ
lượt trước được giữ, không làm lại. Thay đổi sách của terminal khác vẫn ngoài
phạm vi sở hữu của đợt này, kể cả WOKWI_AUTOMATION_TEST_LOG.md xuất hiện đồng thời.

### Kiểm tra cuối và bằng chứng

PostgreSQL test vẫn là container `smartfarm-codex-watering-test`, cổng 55439,
DB/user watering_test, schema telemetry_test. Test migration dùng thêm schema
watering_upgrade_<uuid> riêng trong DB test, xóa đúng schema đó sau test.
Không có thao tác test hoặc truncate trên DB demo.

| Nhóm | Lệnh / kết quả | Skip / giới hạn |
|---|---|---|
| Integration liên quan trước lượt toàn bộ | `./mvnw.cmd -B '-Dtest=WateringRuleTest,PumpControlTest' test`: 33/33 đạt | 0 skip; transport mock |
| Backend cuối, chạy toàn bộ đúng một lần trong đợt chốt | `./mvnw.cmd -B verify`: **47/47**, BUILD SUCCESS, kết thúc 01:02:29 +07 | 0 failures/errors/skip |
| Backend unit/self-test trong 47 | TelemetryValidatorTest 3, MqttConnectivityProbeTest 1 | 4/4; không kết nối AWS |
| Backend PostgreSQL integration trong 47 | WateringRuleTest 22, PumpControlTest 11, SensorAlertsTest 4, TelemetryDatabaseTest 6 | 43/43; DB riêng và MQTT tắt |
| Browser automation fixtures | `npm.cmd run test:automation`: **13/13 đạt**, Chromium | 0 fail/flaky/skip; component AutomationManager thật, API giả lập |
| Frontend unit telemetry | 3/3 từ lượt trước, tái sử dụng | Không chạy lại; không tính là test giao diện automation |
| Frontend lint | `npm.cmd run lint`: PASS | Typecheck cả test/config mới |
| Frontend build | `npm.cmd run build`: PASS, 1746 modules | Cảnh báo __dirname và bundle >500 kB vẫn là debt cũ |
| Diff whitespace | `git -c core.whitespace=cr-at-eol diff --check -- backend src tools/tests package.json package-lock.json playwright.automation.config.ts docs/implementation/LOCAL_CODEX_REPORT.md`: PASS | Giữ CRLF của wrapper Windows |
| Live AWS/Wokwi trong đợt này | Không chạy | Không có bằng chứng GPIO hoặc timing mới |

Biến môi trường Maven giống mục 4, URL luôn là cổng 55439/currentSchema=telemetry_test.
Sau khi sửa backend xong, lượt toàn bộ chạy một lần; không chạy lại vì chỉ có
điều chỉnh frontend sau đó. Browser/lint/build chạy lại sau sửa thông báo lỗi
mạng PUT sang tiếng Việt. JUnit XML cuối ở backend/target/surefire-reports;
browser JSON ở coverage/automation-browser/results.json (13 expected,
0 unexpected/flaky/skipped). Artifacts thuộc đường dẫn đã ignore, không stage.

Browser fixture mount trực tiếp component production trong Vite test cổng
127.0.0.1:4177. Không nạp vite.config ứng dụng/envfiles, không có backend proxy;
mọi /api/** được intercept, API không được định nghĩa bị abort. Request ngoài
origin fixture bị chặn. Vì vậy click bật/tắt chỉ cập nhật fixture trong test,
không tới backend đang phục vụ demo. Không dùng lại Vite cổng 3000.

13 ca browser gồm: mặc định tắt và loading khóa nút; bật/tắt chờ phản hồi;
5 trạng thái tiếng Việt SAFETY_LOCKOUT/DEVICE_NOT_READY/COMMAND_PENDING/
COMMAND_UNCONFIRMED/STOP_UNCONFIRMED cùng run history; cooldown;
GET lỗi→phục hồi; PUT 409 không bị polling che lỗi→thử lại thành công;
GET cũ lỗi trong lúc PUT; body PUT không hợp lệ; PUT mất phản hồi→GET xác nhận.

Lỗi môi trường: npm trong sandbox không tải được package (EACCES), chạy lại
qua cấp quyền đạt, chỉ thêm 3 package. Browser cache Chromium revision 1248
đã có, không tải browser mới. Lượt browser đầu 12 ca đạt nhưng cleanup bị kẹt
trong sandbox; xác định và kết thúc đúng fixture PID, không đụng backend hay
gateway. Stop-Process báo lỗi; taskkill theo đúng PID fixture thành công.
Lượt cuối ngoài sandbox chạy 13 ca và tự kết thúc bình thường. Không coi lỗi
cleanup là test UI thất bại hoặc bỏ qua nó để báo runner đã hoàn tất.

### Phần chưa kiểm chứng và vận hành

Chưa chạy full app navigation, kiểm tra hình thức giao diện hoặc browser khác
ngoài Chromium. Fixture không chứng minh Java API và UI hoạt động cùng nhau
qua mạng thật, không chứng minh GPIO bật/tắt. Test restart tại transport boundary
dùng lỗi mô phỏng và startup hook với DB thật riêng; chưa kill/restart backend
live giữa lần tưới. Không kiểm chứng NVS/network recovery hoặc nhiều backend
instance, không tuyên bố giao dịch nguyên tử DB/MQTT/exactly-once.

Backend demo đang chạy từ lượt 00:49 không được restart trong đợt test này;
người dùng cần restart để nạp code backend mới trước nghiệm thu. Không cần
pull, build firmware hay sửa IAM. Test DB được dừng sau khi hoàn tất, giữ dữ
liệu test. Fixture server/browser được dọn; không dừng tiến trình của người dùng.

Nếu cần lặp lại browser ở máy khác: cài dependency bằng
`npm.cmd ci --legacy-peer-deps`, cài Chromium bằng
`npx.cmd playwright install chromium` nếu chưa có cache, rồi
`npm.cmd run test:automation`. Trên máy hiện tại dependency/browser đã sẵn.
Không chạy lại helper backend live chỉ để lấy kết quả integration test; helper
không có TEST_DB_URL sẽ skip integration và ghi đè Surefire report cuối.

### Diff chốt trong phạm vi code/test

Diff cuối trong phạm vi code/test (so với HEAD, gồm cả sửa từ lượt trước):

```text
 backend/mvnw.cmd                                   |   5 +-
 .../vn/smartfarm/iot/automation/RuleScheduler.java |   1 -
 .../vn/smartfarm/iot/automation/WateringRule.java  | 113 ++++++++++----
 .../vn/smartfarm/iot/control/PumpController.java   |   2 +-
 .../java/vn/smartfarm/iot/control/PumpService.java |  19 ++-
 .../smartfarm/iot/telemetry/PumpControlTest.java   |  17 +++
 .../smartfarm/iot/telemetry/WateringRuleTest.java  | 163 ++++++++++++++++++++-
 package-lock.json                                  |  46 ++++++
 package.json                                       |   4 +-
 src/modules/iot/automation/AutomationManager.tsx   |  50 +++++--
 10 files changed, 371 insertions(+), 49 deletions(-)
```

Lệnh dùng pathspec backend/src/tools/tests, package/config và báo cáo, không
gom phần sách do agent khác quản lý. Stat Git chưa gồm các file mới chưa
stage: RuleStartup, V10, báo cáo, config Playwright và fixture files đã liệt
kê ở trên. Kiểm tra cuối browser report: 13 expected, 0 unexpected/flaky/skip;
không còn listener fixture 4177.

### Năm bước nghiệm thu Wokwi còn lại

1. Restart backend bằng Git Bash mới với helper và control enabled; giữ gateway,
   simulator, frontend. Soil 45%, chờ OFF fresh không khóa; rule phải tắt.
2. Bật rule, soil 28%: mẫu đầu chưa ON, mẫu thứ hai trong ≤15 giây tạo một
   ON/20 giây; đối chiếu LED và ACK EXECUTED SUCCESS/ON, không chỉ SENT.
3. Khi LED ON, tăng soil 40%: OFF sớm; đưa lại 28%, không bật lại ít nhất
   60 giây kể từ backend xác nhận OFF. Sau nghỉ quan sát một run giữ khô đủ
   20 giây để kiểm tra timer tự OFF.
4. Trong run tiếp theo dùng OFF thủ công: LED OFF, rule pause; tiếp tục giữ
   28% không được tự resume, chỉ bật lại khi người dùng chủ động.
5. Bật lại có chủ đích, restart backend giữa run: không replay ON, rule tắt,
   giữ run để reconcile OFF/cooldown. Kết thúc phép thử bằng tắt rule và xác
   nhận LED OFF. Ghi kết quả thực tế, commandId/run ID và thời điểm đã làm sạch.

Đợt này kết thúc ở phạm vi ENV01→PUMP01, không tự bắt đầu chức năng tiếp theo.
Không commit/push và không sửa docs/book/**.

## 11. Trạng thái bàn giao để tiếp tục ở phiên sau

### Mục tiêu và giới hạn được giao

Hoàn thiện đợt tưới tự động duy nhất ENV01→PUMP01: mẫu soil mới liên tiếp,
ACK/status đúng thứ tự, OFF có xác nhận, cooldown, manual hold và startup;
browser fixtures kiểm tra UI automation; chạy PostgreSQL test riêng, lint/build
và backend toàn bộ một lần sau sửa. Không làm NVS, không nghiệm thu AWS/Wokwi
thay người dùng, không sửa sách, không dùng DB demo cho test, không commit/push.
Đợt code và kiểm tra local đã hoàn tất. Việc còn lại là người dùng nghiệm thu
Wokwi theo năm bước mục 10; không tự khởi đầu chức năng mới.

### Git và file

- Branch: `feat/day1-iot-foundation`; HEAD nền/hiện tại:
  `943d22a2f1d7d56a84ca6fd6a0a8287af2554b50`.
- Chưa tạo commit hoặc push. Tất cả thay đổi tiếp tục ở working tree.
- Code của đợt này còn sửa: backend/mvnw.cmd, RuleScheduler.java,
  WateringRule.java, PumpController.java, PumpService.java,
  PumpControlTest.java, WateringRuleTest.java, package.json,
  package-lock.json, AutomationManager.tsx.
- File mới của đợt code/test: RuleStartup.java, migration V10,
  playwright.automation.config.ts, tools/tests/automation.browser.spec.ts,
  tools/tests/automation-fixture-server.mjs và fixtures/automation/*.
- Báo cáo hiện tại là file implementation duy nhất đợt này có cập nhật.
  Diff backend/src/package/config/test trong mục 10 ghi 371 insertions,
  49 deletions cho 10 tracked files; stat không gồm untracked.
- Terminal khác đã sửa docs/book/BOOK_OUTLINE.md, BUILD_JOURNAL.md,
  CHAPTER_08_LOCAL_DATABASE_API.md, CHAPTER_09B_SENSOR_AREAS.md,
  CHAPTER_09_REALTIME_FRONTEND.md, CHAPTER_10_WOKWI_RELAY_CONTROL.md,
  CHAPTER_11_SENSOR_HISTORY.md, CHAPTER_12_SENSOR_ALERTS.md,
  CHAPTER_13_AUTOMATIC_WATERING.md, README.md, TROUBLESHOOTING.md; tạo
  ACCEPTANCE_STATUS.md, WINDOWS_RUNBOOK.md và WOKWI_AUTOMATION_TEST_LOG.md.
  Không sửa/hoàn tác các file đó. docs/implementation/LOCAL_DOCS_REPORT.md
  cũng là untracked bên terminal kia, không được ghi đè.
- Còn thấy thay đổi local từ trước: firmware/esp32/wokwi.toml đã sửa,
  firmware/esp32/data/.gitkeep hiển thị D nhưng thư mục bị permission denied,
  và untracked `react-example@0.0.0`, `tsc`. Không kết luận file firmware đã
  bị người dùng xóa; không restore hoặc đổi ACL.
- Các file `backend/target/**`, `coverage/automation-browser/**`,
  `node_modules/**` đang bị ignore. PostgreSQL test riêng đã dừng và giữ data.

### Việc đã xong và bằng chứng kiểm tra

- V10 giữ nguyên, backend test upgrade chứng minh active run/history V9 được
  bảo toàn và cột identity mới nullable.
- Backend toàn bộ: `./mvnw.cmd -B verify`, đúng một lần sau khi sửa xong:
  47 đạt, 0 fail/error/skip, PostgreSQL integration dùng DB watering_test,
  schema telemetry_test trên container riêng cổng 55439; MQTT tắt/transport giả.
- Test liên quan trước đó: `./mvnw.cmd -B '-Dtest=WateringRuleTest,PumpControlTest' test`:
  33 đạt, 0 skip. Không tính là test lượt cuối.
- Browser: `npm.cmd run test:automation`: 13 Chromium fixtures đạt,
  0 fail/flaky/skip. Component AutomationManager thật; mọi API bị fixture
  intercept ở cổng 4177, không proxy/backend/AWS. Bao gồm PUT mất phản hồi rồi
  GET xác nhận và dọn lỗi tiếng Việt.
- Frontend unit telemetry 3 test đạt từ lượt trước; không chạy lại và không
  gọi chúng là UI automation.
- `npm.cmd run lint`, `npm.cmd run build` đạt. Build vẫn cảnh báo __dirname
  và bundle >500 kB; chưa sửa vì ngoài phạm vi.
- Whitespace check của code/test đạt với `core.whitespace=cr-at-eol`.
- Lần chạy helper backend live trước đợt này ghi 4 unit đạt/37 integration
  skip do không có SMARTFARM_TEST_DB_URL. Đây là bằng chứng lịch sử riêng,
  không cộng hoặc thay thế 47 test lượt cuối.

### Việc dở, lỗi và bước tiếp theo

- Automation AWS/Wokwi, GPIO LED, command ACK thật, OFF sớm và cooldown live
  chưa được kiểm chứng. Wokwi/gateway không được thao tác trong đợt code này.
- Bước tiếp theo cụ thể: restart backend để nạp class mới; giữ rule tắt cho tới
  khi ENV01 telemetry và PUMP01 OFF đều fresh. Chạy đúng năm bước Wokwi trong
  mục 10, ghi PASS/FAIL và commandId/run ID thực tế. Không pull vì working
  tree đã có thay đổi; không chạy backend helper verify không có test DB trong
  khi cần giữ JUnit cuối (helper sẽ skip integration và ghi đè report test).
- Quan sát lịch sử ở 00:49 trước đợt code: helper đã áp dụng V10 lên DB demo,
  API rule trả `RESTART_PAUSED`; PUMP01 khi đó UNKNOWN/fresh=false, telemetry
  cũ, gateway 9011 chưa lắng nghe. Đó không phải trạng thái live vừa đo sau
  đợt code; đọc API hiện tại sau khi người dùng khởi động môi trường.
- NVS và khôi phục network Wokwi vẫn để sau. Chưa làm multi-backend
  coordination hoặc xác nhận exactly-once giữa PostgreSQL/MQTT.
- Vướng môi trường đã xử lý: sandbox chặn npm install/cleanup Playwright;
  chạy lại qua quyền môi trường thành công và cleanup đúng fixture PID.
  Không còn lỗi kiểm tra mở. Warnings build nêu trên và hạn chế thư mục
  firmware là các mục còn hiện diện.

### Ràng buộc giữ cho phiên sau

Không đọc/in .local/aws, credentials hay cấu hình bí mật; không thay IAM/AWS
resources, không tự phát lệnh điều khiển thật. Không dùng DB demo cho tests,
không truncate volume, không chạy git clean/reset/stash/restore, không commit
hoặc push. Chỉ sửa LOCAL_CODEX_REPORT.md trong lần ghi bàn giao này. Giữ nguyên
các thay đổi sách của terminal khác; không ghi báo cáo code đè lên báo cáo
LOCAL_DOCS_REPORT.md. Khi người dùng cung cấp kết quả Wokwi, cập nhật trạng thái
nghiệm thu dựa đúng evidence và không đánh dấu phần chưa quan sát là đạt.
