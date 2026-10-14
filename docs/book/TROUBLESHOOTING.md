# Sổ lỗi và cách giải quyết

## Tra cứu theo triệu chứng — cập nhật tài liệu 14/10/2026

Bảng này tổng hợp bằng chứng đã ghi trong [nhật ký](BUILD_JOURNAL.md).
Đây không phải lần tái hiện mới. Những mục lịch sử bên dưới có thể ghi “chưa
xác nhận” ở thời điểm cũ; đọc cùng kết quả tiếp theo trong bảng này.

| Lỗi / triệu chứng | Bằng chứng và bước xử lý | Kết luận có thể rút ra |
|---|---|---|
| Thiếu Python, Store alias hoặc `botocore` | Nhật ký ghi đã cài Python 3.12.10, venv `.local/day1-venv`; gọi đúng `Scripts/python.exe`, cài dependency qua chính interpreter đó. Người dùng xác nhận “AWS SDK OK”. `ensurepip` chỉ cài pip | Đã vượt qua lỗi dependency; không chứng minh quyền AWS hoặc thiết bị kết nối |
| IAM `AccessDenied` | Ghi nhận deny ở `AttachThingPrincipal`, `GetPolicy`, `AttachPolicy`; đối chiếu operation và resource, bổ sung quyền đúng Thing/certificate/policy. CLI attach và provisioning sau đó thành công | Đã có kết quả provisioning; nguyên nhân retry còn deny chưa xác định, không kết luận do propagation |
| LittleFS lỗi 261 / thiếu partition `spiffs` | Log boot không mount được; partition table đã có partition filesystem. Nhật ký tiếp theo ghi buildfs, ghép flash và serial `LittleFS mounted` | Đã có mốc mount thành công; không đổi tên partition hoặc auto-format theo suy đoán. Firmware build riêng không bảo đảm có `littlefs.bin` |
| MQTT retained LWT bị đóng trước CONNACK | Probe không LWT thành công, probe có LWT thất bại; device policy thiếu `iot:RetainPublish` cho `ENV01/status`. Sau cập nhật version active, probe có LWT được chấp nhận, tiếp theo có serial telemetry/PUBACK | Có bằng chứng sửa quyền cho phép thử này; không đồng nhất IoT device policy với IAM user policy |
| `CLOCK_SKEW`, age=-7 hoặc -9, GPIO OFF | Nhật ký ghi lệnh đến handler và bị từ chối vì thời gian; ghi thay đổi SNTP/dung sai mô phỏng, tests native và xác nhận ON/OFF, timer 3 giây sau bản sửa | Không xác định nguyên nhân clock chậm ở host hay simulator. Dung sai mô phỏng không chứng minh clock đúng hoặc phù hợp bơm thật |
| Docker/WSL hoặc executable Docker không tồn tại | Đã ghi hướng kiểm tra Windows feature, WSL, PATH và Client/Server. Kết quả sau đó là Compose chạy và PostgreSQL Healthy | Blocker đã vượt qua; chưa biết bước WSL/PATH cụ thể nào giải quyết lỗi. Không xóa envfile/volume |
| Vite/backend `ECONNREFUSED` ở cổng 8080 | Nhật ký ghi backend startup thất bại, người dùng sau đó xác nhận chạy thành công. Xem terminal backend trước; thử API trực tiếp để phân biệt lỗi API và proxy | Chưa có stack trace xác định nguyên nhân startup; không quy lỗi cho DB, migration, IAM hoặc frontend khi thiếu log |
| Gateway restart nhưng DNS/Wi-Fi Wokwi chưa phục hồi | Nhật ký ghi phải restart simulation; có serial `RELAY_OFF reason=CONNECTION_LOST`. Giữ gateway ở terminal riêng và quan sát lại Wi-Fi/NTP/MQTT | Chưa nghiệm thu toàn bộ network recovery. `errno=119` một mình không xác định lỗi DNS, policy hay TLS |

Restart simulator mất trạng thái RAM, gồm khóa an toàn và lý do chưa gửi.
**NVS chưa làm**; reboot không xác nhận lý do sự cố đã lưu hoặc được gửi sau
reconnect. Không dùng restart làm bằng chứng phục hồi kết nối không reboot.

Khi lỗi lặp lại, ghi môi trường, bước đang chạy, thời điểm và đoạn lỗi đã che
thông tin riêng. Với backend, cần stack trace startup để tiếp tục chẩn đoán;
không gửi envfile, token, key hoặc raw credentials. Xem
[quy trình terminal Windows](WINDOWS_RUNBOOK.md).

## 14/10/2026 — Các lỗi tìm thấy khi audit automation local

| Triệu chứng | Nguyên nhân | Sửa và bằng chứng local |
|---|---|---|
| Đếm hai mẫu khô dù có mẫu ướt ở giữa | Tick chỉ đọc latest, bỏ qua telemetry đã lưu giữa hai tick | Xét các mẫu chưa đọc theo thời gian, watermark boot/sequence V10; test mẫu 28→40→28 giữ count=1 |
| Run kết thúc khi OFF chưa xác nhận | So timestamp status với issuedAt không xác định thứ tự thực thi | OFF status cùng boot phải có sequence sau EXECUTED ACK; fallback OFF mới sau TTL+runtime; test OFF trước ACK/failed OFF không giải phóng run |
| Publish chưa rõ làm mất liên kết command/run | PumpService throw sau khi insert lệnh, rule không giữ ID | Exception mang commandId, giữ run và pause, OFF thử một lần; không retry ON |
| Boot với MQTT=false giữ quy tắc enabled trong DB | Startup pause nằm trong scheduler ConditionalOnProperty | RuleStartup độc lập MQTT; test hook và restart giữa run giữ tracking nhưng enabled=false |
| Status cũ đổi trạng thái hiện tại | Status boot khác được chấp nhận cả khi timestamp bằng nhau | Boot khác chỉ cập nhật khi timestamp lớn hơn; test same-boot sequence cũ và equal-time boot khác không rollback ON |
| mvnw.cmd báo Cannot index into a null array | PowerShell .Target có thể null với thư mục .m2 thường | Kiểm tra Target tồn tại trước index; Maven verify chạy được, 41 tests đạt/0 skip |

Docker/Maven lần đầu bị hạn chế quyền hoặc mạng trong sandbox; đã chạy lại
qua cơ chế cấp quyền của môi trường. DB kiểm tra dùng container riêng cổng
55439, không dùng dữ liệu demo. `git diff --check` mặc định báo CRLF của
mvnw.cmd là trailing whitespace; kiểm tra với `core.whitespace=cr-at-eol`
đạt cho source/tài liệu đã sửa. Git còn báo không đọc được firmware/esp32/data
do quyền local sẵn có; không đổi ACL và không mở thư mục chứa credentials.
Những bằng chứng này không xác nhận AWS/Wokwi live; NVS/network recovery chưa làm.

Các ghi nhận dưới đây dựa trên đầu ra trong cuộc trò chuyện và kiểm tra repository. Với lỗi chưa có xác nhận giải quyết, ghi rõ trạng thái thay vì đưa ra kết luận.

| Triệu chứng | Nguyên nhân / chẩn đoán | Xử lý và kết quả |
|---|---|---|
| `npm ci` xung đột peer dependencies | esbuild/Vite ở baseline | `npm ci --legacy-peer-deps` cài được, không sửa lockfile; cần xem lại dependency trước production |
| TS2345 toast `'error'` | API toast chỉ nhận info/success/warning | Đổi sang `warning`; lint đạt |
| Vite cảnh báo `__dirname`, bundle >500 kB | Config tương lai và bundle lớn | Build vẫn đạt; chưa làm code splitting hoặc sửa warning |
| Python not found / Store alias | Python chưa khả dụng trên Windows | Cài Python 3.12.10, tạo venv; dùng executable cụ thể trong Scripts |
| Không tìm thấy tools/backend trên main | Day 1 nằm ở nhánh feature | Fetch và switch `feat/day1-iot-foundation` |
| Checkout would overwrite SensorRealtime | File có sửa cục bộ | Stash riêng file, switch; không xóa thay đổi hoặc pop lại khi fix đã có |
| `Scripts/aws.exe` không tồn tại | Entry point không có ở đường dẫn dự kiến | Dùng `Scripts/python.exe -m awscli`; CLI từng báo version hoạt động |
| Unable to locate credentials | AWS profile chưa cấu hình | IAM user có scope, tạo key CLI và configure profile smartfarm trực tiếp trên máy; không gửi key vào chat |
| Output directory must be private (chmod 700) | POSIX mode check không phù hợp Python Windows | Thêm nhánh NTFS ACL, giữ POSIX kiểm tra mode trên Linux |
| CalledProcessError / SeSecurityPrivilege | Bản sửa ACL đầu dùng Set-Acl với security descriptor có phạm vi vượt DACL | Đọc Access section, chỉ sửa DACL bằng Directory.SetAccessControl; không đổi owner/group/SACL, không yêu cầu chạy Administrator; người dùng render thành công |
| ModuleNotFoundError botocore dù awscli installed | Cài awscli trong môi trường người dùng không cung cấp module botocore riêng; requirements thiếu dependency trực tiếp | Thêm `botocore==1.43.62`, cài bằng đúng venv python -m pip; người dùng xác nhận AWS SDK OK |
| ensurepip chạy nhưng botocore vẫn thiếu | ensurepip chỉ cung cấp pip | Cài dependency thật; notice update pip không phải bằng chứng cài SDK |
| Bash syntax error gần `(` khi chẩn đoán | Đoạn Python nhiều dòng có thể bị dán ngoài heredoc | Dùng CLI một dòng với Python chỉ lấy certificate ARN; tránh dán output như lệnh |
| Script chỉ báo ClientError | Catch-all che cả chẩn đoán hữu ích | In operation và error code, không in response/key; dùng CLI riêng để xem thông báo deny của thao tác attach |
| AttachThingPrincipal AccessDenied trên cert ARN | Policy trước chỉ cấp trên Thing, thiếu certificate | Cho phép action trên đúng Thing ENV01 và certificate đã tạo; giữ manifest |
| GetPolicy AccessDenied, chỉ thấy 1 inline policy | Policy tổng hợp bị thiếu quyền đọc; sửa đè policy trước là khả năng, chưa chứng minh | Khôi phục đầy đủ các action cần thiết trong cùng policy; không cấp AdministratorAccess |
| AttachPolicy AccessDenied | Policy cần quyền attach trên certificate; ban đầu thiếu | Bổ sung action trên đúng cert; lần retry vẫn deny chưa biết nguyên nhân, CLI sau đó thành công; không kết luận chắc chắn do propagation |
| Lo ngại credit giảm dù Bills $0 | Credit bù usage, payable không biểu thị usage bằng 0 | Đối chiếu Credits và Bills; $120 cấp, $20.74 dùng ước tính, $99.26 còn |
| Stop EC2 nhưng vẫn có phí | EBS lưu trữ và Elastic IP có thể còn tính phí | Kiểm tra data trước terminate/delete, kiểm tra Volumes/IP/Snapshots và region; người dùng xác nhận đã terminate hai máy và hết volumes/IP |
| Budget không có checkbox Credits ở Advanced | UI chuyển charge type sang Scope filters | Filter specific AWS cost dimensions → Charge type → exclude Credit, Refund |
| Budget email 0/1 verified | Địa chỉ Pending | Gửi/xác minh email mới; Notification center/AWS Health không phải bằng chứng Budget verified; người dùng sau đó xác nhận đã xác minh |
| Atlassian installed nhưng không tạo Jira được | Phiên không có tool Jira callable | Chuẩn bị backlog CSV/text; không báo tạo task thành công; tải CSV thất bại chưa được xác nhận xử lý |
| PlatformIO cloud CONNECT403 | Proxy/domain access chặn registry | Lưu domain cần thiết vào draft; chưa chứng minh runtime đã áp dụng, firmware cloud vẫn chưa build |
| Maven compiler không có javac | Cloud ban đầu chỉ có JRE | Cài JDK21, kiểm checksum chính thức, cấu hình proxy/trust hợp lệ; verify và native self-test đạt |

## Quy trình chẩn đoán cho sách

### Docker Desktop thiếu Windows feature / executable không tồn tại

**Kết quả tiếp theo:** người dùng chạy Compose thành công; image pulled và
container PostgreSQL Healthy. Blocker Docker đã vượt qua. Chưa có output xác
định thao tác WSL/PATH nào giải quyết lỗi, nên không coi một cách sửa cụ thể
đã được xác nhận. Database healthy chưa chứng minh backend đã lưu telemetry.

Người dùng báo installer cần Virtual Machine Platform và admin. Hướng dẫn
PowerShell admin wsl --install; nếu feature vẫn thiếu dùng DISM bật VMP/WSL,
restart rồi updateWSL/version2. Đây là quyền trên máy người dùng, không phải
quyền cloud hay IAM. Chưa có xác nhận fix thành công.

Sau đó helper tạo db.env đạt, nhưng Git Bash trỏ docker vào AppData/Local/Programs
không tồn tại. Tách lỗi password/database khỏi lỗi executable: mở Docker Desktop,
reopen Git Bash/VS Code, hash-r, where.exe docker. Thử thêm Program Files Docker
bin vào PATH chỉ nếu đúng nơi cài. Nếu chỉ có Client mà không có Server, xử lý
engine/WSL. Không xóa envfile/volume để sửa PATH. Kết quả xử lý vẫn chờ người dùng.

### Test PostgreSQL Connection refused trong lúc image đang tải

Khi triển khai persistence, Maven integration tests ban đầu chạy trước khi
Compose đã healthy và bị Connection refused ở127.0.0.1:5433. Chờ
`docker compose ... up -d --wait postgres` kết thúc healthy rồi chạy lại:
7tests đạt, không skip. Không sửa assertions, không dùng H2 để thay bằng chứng
PostgreSQL. Với Windows envfile, ghi LF thay vì CRLF để Bash source cùng
password mà Docker đọc; đây là phòng ngừa trong code, chưa có lỗi CRLF thực tế
do người dùng báo. Không xóa volume hoặc thay password ngẫu nhiên để né lỗi.

### Backend echo đạt nhưng thiếu telemetry

Ngày 13/10/2026: Maven build và WSS_PUBACK_ECHO_PASS đạt, probe 30 giây báo
Insufficient device telemetry. Kiểm tra thiết bị/gateway đang chạy, Test Client
có gói mới trên đúng topic và số TELEMETRY_PACKETS trước exception. Lần retry
người dùng cung cấp TELEMETRY_PACKETS=5 và BUILD SUCCESS. Nguyên nhân lần đầu
chưa xác định; không gọi là lỗi build hoặc khẳng định policy sai khi echo đã
đạt. Threshold 30 giây là 4 gói; gate 300 giây là 58 gói. Chưa xác nhận gate dài.

### Retained Last Will cần iot:RetainPublish

**Kết quả xác nhận:** sau khi cập nhật active policy, người dùng chạy probe có
LWT và nhận MQTT CONNECT accepted. Bản sửa quyền giải quyết được phép thử tái
hiện trên Windows. Wokwi và telemetry vẫn cần kiểm chứng riêng.

**Bằng chứng tiếp theo:** người dùng cung cấp Wokwi serial có Telemetry queued
và PUBACK lặp lại. Lỗi kết nối simulator đã được giải quyết sau sửa quyền;
payload AWS, thay đổi sensor và backend vẫn chưa được nghiệm thu.

MQTT CONNECT không LWT được AWS chấp nhận trên Windows; cùng certificate/client
ID với QoS1 retained LWT bị server đóng trước CONNACK. Device policy ban đầu chỉ
có iot:Publish, thiếu iot:RetainPublish cho ENV01/status. Sửa renderer và thêm
statement vào version default của IoT policy (không phải IAM user policy), rồi
chạy lại probe và simulator để xác nhận. Không bỏ LWT để né quyền, không mở
wildcard publish/retain. Kết quả sau sửa còn chờ người dùng.

### Wokwi boot nhưng LittleFS không mount

Log người dùng ngày 13/10/2026: partition `spiffs` không tìm thấy; LittleFS lỗi
261, credentials không đọc được; relay OFF. Tên `spiffs` là tên partition được
LittleFS Arduino dùng mặc định, không chứng minh cần đổi sang filesystem SPIFFS.
Kiểm tra partition table và filesystem image đã thực sự nạp vào flash simulator.
Application firmware.bin riêng không chứng minh các phần flash khác đã được nạp.
Chưa xác nhận cách nạp image và chưa giải quyết xong. Không auto-format flash
hoặc vô hiệu hóa TLS; dữ liệu credentials chỉ đặt trong ignored private folders.

### 13/10/2026 — PlatformIO mirror TLS và tải bị ngắt

Kết quả sau đó: người dùng chạy lại build và báo SUCCESS sau 97.88 giây,
esptool 4.9.0 tạo image ESP32 thành công. Retry đủ để hoàn tất build; không có
bằng chứng cần tắt TLS hoặc sửa source. Nguyên nhân lần abort vẫn chưa xác định.

Windows: mirror sin1.contabostorage.com báo SSL WRONG_VERSION_NUMBER. Framework
vẫn cài thành công sau khi PlatformIO chọn mirror khác. tool-esptoolpy đang tải
59% rồi báo Aborted; nguyên nhân abort chưa xác định. Không phải bằng chứng lỗi
source code, và chưa có kết quả compile. Hướng xử lý đầu tiên: chạy lại build,
không xóa venv/package đã cài và không tắt xác minh TLS. Nếu còn thất bại, thu
log cuối đầy đủ trước khi thay đổi proxy/mạng. Chưa xác nhận retry thành công.

Ghi lỗi nguyên văn đã làm sạch, xác định môi trường và bước thất bại, chạy kiểm tra nhỏ có thể phân biệt nguyên nhân, sửa tối thiểu, rồi chạy lại bước đó. Không bỏ TLS verification, không mở toàn bộ IAM để chữa lỗi, không xóa certificate/manifest khi chưa hiểu trạng thái provisioning. Phân biệt lỗi đã tái hiện với giả thuyết; giữ cả bản sửa sai và bản sửa cuối để giải thích bài học.

## CLOCK_SKEW trong Wokwi

Nếu COMMAND_TIME có age âm, đồng hồ ESP32 đang chậm hơn issuedAt. Ví dụ
age=-9 giải thích vì sao ON bị từ chối và LED vẫn OFF. Đồng bộ Windows time,
khởi động lại Wokwi; firmware mới yêu cầu NTP cập nhật mỗi 15 giây.
Để thử mô phỏng, đặt trong config/config.local.h (sau include config.example.h):

```cpp
#undef FARM_WOKWI_CLOCK_TOLERANCE_SECONDS
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 10
```

Build lại firmware, merge lại private flash rồi restart simulation. Mặc định
vẫn 2 giây; dung sai 10 chỉ áp dụng SSID Wokwi-GUEST. Expiry kiểm tra theo
clock thiết bị nên clock chậm vẫn tạo bất định về độ mới của lệnh; không dùng
cách này cho bơm thật. Nếu lệch quá 10 giây vẫn từ chối, cần sửa nguồn giờ.
Thử ON 3 giây một lần: yêu cầu ACK SUCCESS, LED sáng rồi tự tắt. Chưa có
kết quả live xác nhận bản sửa này.


## Cài đặt tưới V11: từ chối lưu hoặc chưa biết đã lưu chưa

Đây là hướng dẫn xử lý các tình huống đã kiểm tra giả lập trong cloud, không
phải báo cáo lỗi AWS của người dùng.

- HTTP 409: tắt rule, chờ run có OFF xác nhận; nếu phiên bản đã đổi ở tab khác,
  chọn Tải lại cài đặt rồi nhập lại. Không tự tăng revision để ép ghi đè.
- Số không hợp lệ: thời gian tự động 1–30 giây, nghỉ 60–3600 giây, ngưỡng tắt
  cao hơn ngưỡng đất khô ít nhất 5 điểm %. Dùng số nguyên.
- Mất response/5xx/body sai: chưa biết PUT đã áp dụng hay chưa. Không bấm gửi
  lại tự động; Tải lại đọc server để đối chiếu. Polling không xóa bản nháp.
- Đã sửa cooldown nhưng vẫn nghỉ đến giờ cũ: đây là chủ đích giữ deadline đã
  xác nhận. Cấu hình mới dùng cho lần chạy sau, không rút ngắn mốc đang có.
- Alert và tưới khác ngưỡng: hai tính năng độc lập. Xem [chương 17](CHAPTER_17_WATERING_SETTINGS.md).


## V12: note dạng số vẫn được nhận dù nghĩ đã bật JSON strict

Kiểm tra API ban đầu gửi note123 và nhận200 vì Jackson tự ép số sang String.
Không dùng String DTO rồi mặc định mọi coercion đã bị tắt; trường note được
kiểm tra kiểu JSON rõ ràng, chỉ nhận chuỗi/null. Unknown fields vẫn bị chặn
bằng request record. Rerun toàn bộ88 tests backend đạt, không skip.

Nếu ACK trả409 hoặc mất response, mở Đối chiếu trạng thái để đọc theo ID.
Không ghi đè note đầu hoặc coi đã xem là đã bình thường. Chi tiết ở
[chương19](CHAPTER_19_ALERT_ACKNOWLEDGEMENT.md).

## SOIL nhiều điểm — 15/10/2026

- **Query xác minh migration báo cột state không tồn tại:** schema pump_status
  dùng reported_state (V3). Đã đọc migration, sửa query thành reported_state,
  xác nhận V17 giữ OFF/FLOW_SENSOR_FAULT/history2/command0; không sửa dữ liệu.
- **Điểm lỗi và giá trị 0:** 0% VALID vẫn hiển thị 0. SENSOR_FAULT phải null/—;
  không chữa bằng thay null thành 0 hoặc dựa đó bật bơm. Demo fault switch
  SOIL1/2/3 trái=lỗi, phải=bình thường. Đây là kịch bản, không phải ca live đã chạy.
- **Đã pull nhưng sơ đồ không có ba núm:** SOIL dùng project riêng
  .local/soil-nodes/SOIL01. Khai báo registry, chuẩn bị project đúng loại, build/
  buildfs/merge và mở diagram ở đó. Không thay certificate ENV01 bằng cert SOIL.
  Xem [chương27](CHAPTER_27_SOIL_MULTIPOINT.md); live còn Chưa chạy.

## Cảnh báo đất nhiều điểm V18 — hướng dẫn chẩn đoán

Đợt cloud 15/10/2026 không gặp test/build failure. Các tình huống dưới đây là
hành vi và kịch bản đã kiểm thử bằng fixture, chưa phải sự cố AWS/Wokwi live.

- Đã chỉnh núm ENV01 nhưng không thấy SOIL alert: hai loại node dùng collection
  riêng. Tab Đất nhiều điểm đánh giá SOIL/v2; ENV/v1 ở Cảm biến môi trường.
- Một mẫu khô rồi chưa có cảnh báo: cần hai packet mới liền seq/cùng boot/nguồn,
  gap≤15s. Hai lần reload trang không phải hai mẫu. Packet một phần thiếu kênh,
  reboot hoặc mẫu giữa band30–<35 làm lại pending streak.
- Alert vẫn mở khi dữ liệu stale/fault: cố ý giữ điều kiện chưa chứng minh hồi
  phục. Không ép null thành0 hoặc bấm ACK để đóng. Đối chiếu Realtime/history.
- ACK timeout/409: đọc Đối chiếu trạng thái, không tự gửi lại để đổi note đầu.
  Note/condition ở người khác hoặc điều kiện đã đóng được giữ nguyên.
- Không thấy tab mới: pull và restart frontend/backend đúng repo; V18 chỉ thêm
  bảng, không cần xóa PostgreSQL volume/nạp lại SOIL firmware. Xem
  [chương28](CHAPTER_28_SOIL_ALERTS.md).

## Vùng tưới V19 — lỗi dev và cách đối chiếu

- Lint TS nullable validUntil trong callback: guard date ở biểu thức trước
  không được TypeScript giữ trong callback. Đã giữ guard runtime, xác nhận kiểu
  sau guard; lint/build cuối đạt. Không bỏ kiểm tra ngày để ép compiler qua.
- Browser tạo vùng timeout ở select nhưng snapshot đã có SOIL01: nhãn select
  chứa option gây locator getByLabel exact không khớp. Thêm aria-label cụ thể
  cho area/node/source; chạy lại29 browser tests đạt. Không phải mất node/AWS.
- Các điểm đều mới mà chưa có đa số: đối chiếu boot/sequence/observedAt/receivedAt
  và nguồn. Packet một phần không làm ba điểm thành cùng mẫu. Xem
  [chương29](CHAPTER_29_IRRIGATION_ZONES.md); đây là ca fixture đã test, live còn chờ.
- Lưu vùng409: mã/kênh đã dùng hoặc revision thay đổi. Đọc cấu hình mới nhất,
  không ghi đè bản người khác hoặc tự PUT lại. Đổi binding thất bại giữ ba
  binding cũ nhờ rollback; nguồn/node phải đúng khu vực.
