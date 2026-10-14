# Thực hành trên Windows: mở đúng terminal, chạy đúng thứ tự

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
