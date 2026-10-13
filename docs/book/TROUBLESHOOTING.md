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

### Retained Last Will cần iot:RetainPublish

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
