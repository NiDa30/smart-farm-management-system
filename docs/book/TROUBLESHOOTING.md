# Sổ lỗi và cách giải quyết

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
