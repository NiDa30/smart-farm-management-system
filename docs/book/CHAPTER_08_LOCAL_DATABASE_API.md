# Chương 8 — Từ gói MQTT đến dữ liệu PostgreSQL và API

**Bản thảo thực hành, cập nhật 13/10/2026.** Code và kiểm tra PostgreSQL/API đã
đạt trong cloud. PostgreSQL trên Windows đã Healthy sau khi vượt qua lỗi Docker;
người dùng đã cung cấp response API có telemetry live lưu trong database.

## Vì sao cần bước này?

Trong phép thử trước, backend nhận 60 gói telemetry trong 300 giây qua AWS IoT.
Đây là bằng chứng kết nối, nhưng bộ đếm không lưu dữ liệu để xem lại. Khi tiến
trình kết thúc, ta không có lịch sử nhiệt độ hay độ ẩm đất. Chương này chuyển
backend từ probe ngắn sang ứng dụng nhận liên tục và lưu mỗi reading hợp lệ.

Luồng xử lý là MQTT callback → queue trong bộ nhớ → validation → PostgreSQL →
API đọc. Backend chỉ subscribe topic ENV01; không mở HTTP endpoint cho người
ngoài tự đẩy telemetry vào, và chưa cung cấp điều khiển pump.

## Các quyết định triển khai

PostgreSQL chạy local bằng Docker Compose để chưa phát sinh RDS/EC2. Port 5433
chỉ bind 127.0.0.1; API cũng chỉ bind 127.0.0.1:8080. Password được sinh ngẫu nhiên
trong ignored `.local/postgres/db.env`, không đưa vào Git hoặc sách. Volume giữ
dữ liệu khi container dừng. Không coi việc xóa container là xóa dữ liệu.

Flyway tạo bảng và constraints bằng migration V1. Khóa định danh gói là
`device_id + boot_id + sequence`: sequence có thể khởi động lại sau reboot,
nên chỉ dùng deviceId/sequence sẽ nhầm một gói mới là gói cũ. UNIQUE và
`INSERT ... ON CONFLICT DO NOTHING` xử lý cả hai callback trùng tới đồng thời.
Cùng identity nhưng nội dung khác giữ bản đầu, chưa có cơ chế phát hiện xung đột.

Lưu riêng timestamp từ thiết bị và receivedAt của database. Gói đến muộn được
lưu vào lịch sử nhưng không trở thành latest chỉ vì đến sau. Query latest sắp
xếp theo timestamp nguồn, rồi id làm tie-break. Validation giới hạn timestamp
tương lai 60 giây để một gói sai giờ không chiếm vị trí mới nhất quá lâu.

## Chuẩn bị Windows và hiểu lỗi Docker thực tế

JDK 21 đã được kiểm chứng bằng java và javac. Người dùng báo có Docker nhưng
installer sau đó báo Virtual Machine Platform chưa bật. “Có installer/CLI”
khác với “Docker engine đã chạy”: kiểm tra cuối phải thấy cả Client và Server.

Nếu Windows feature chưa bật, mở PowerShell **Run as administrator**, chạy
`wsl --install` và restart. Nếu WSL đã có nhưng feature vẫn thiếu, bật bằng:

```powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```

Sau restart, cập nhật WSL và dùng version 2:

```powershell
wsl --update
wsl --set-default-version 2
wsl --status
```

Hoàn tất Docker Desktop với backend WSL2. Nếu vẫn báo virtualization, kiểm tra
Task Manager → Performance → CPU → Virtualization. Chỉ hướng dẫn bật BIOS/UEFI
khi có bằng chứng virtualization đang disabled; không thay đổi BIOS mù.

Lỗi tiếp theo thực tế là Git Bash gọi executable trong đường dẫn cài per-user
đã không còn: `.../AppData/Local/Programs/DockerDesktop/resources/bin/docker`.
Hướng xử lý đầu tiên là mở Docker Desktop, đóng terminal/VS Code cũ rồi mở lại:

```bash
hash -r
where.exe docker
docker version
```

Nếu Docker thực sự được cài all-users ở Program Files, có thể thử PATH cho phiên
terminal hiện tại:

```bash
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
hash -r
docker version
```

Không đoán đường dẫn này luôn tồn tại. Nếu where.exe không tìm thấy executable,
kiểm tra installation hoàn tất. Nếu Client có nhưng Server không có, kiểm tra
engine/WSL trước, không chỉnh SQL hoặc thay password. **Các cách sửa Docker trên
máy người dùng đã được vượt qua:** output Compose sau đó xác nhận image pulled,
network/volume created và container Healthy. Người dùng không cung cấp bước sửa
cụ thể đã dùng, nên không kết luận WSL hay PATH là bản sửa cuối cùng.

## Chạy database và backend

Từ thư mục gốc repository, khi Docker Client/Server hoạt động:

```bash
./.local/day1-venv/Scripts/python.exe tools/backend/init_local_database.py
docker compose --env-file .local/postgres/db.env up -d --wait postgres
```

Helper giữ nguyên envfile nếu đã có. Trong tình huống hiện tại envfile đã tạo
thành công nên không cần tạo lại để chữa Docker. File dùng LF để Git Bash không
đưa ký tự CR vào password. Không tự đổi password khi volume đã khởi tạo vì
POSTGRES_PASSWORD mới không tự đổi password trong database cũ.

Giữ Wokwi và gateway chạy; dừng probe backend cũ vì cùng MQTT client ID.
Sau khi container healthy:

```bash
bash tools/backend/run_backend_windows.sh
```

Ứng dụng chạy Flyway, subscribe rồi log `TELEMETRY_SAVED` cho các gói mới.
Backend dùng profile AWS đã có quyền runtime; không copy certificate ESP32 vào
Java hoặc đặt AWS secret vào application.yml. Xem
[runbook chi tiết](../implementation/LOCAL_TELEMETRY_BACKEND.md) để kiểm tra env.

## Kiểm tra dữ liệu qua API

Trong terminal thứ hai:

```bash
curl --fail http://127.0.0.1:8080/api/v1/devices/ENV01/telemetry/latest
curl --fail 'http://127.0.0.1:8080/api/v1/devices/ENV01/telemetry?limit=10'
```

Latest trả 404 nếu chưa có reading. History trả[] khi chưa có dữ liệu; response
reading chứa id, farmId, telemetry và receivedAt. Không mô tả response có dữ
liệu thật cho đến khi đã quan sát được trên máy triển khai.

### Kết quả thực tế trên Windows

Sau khi chạy backend, người dùng gọi latest và nhận response thành công:

```json
{
  "id": 5,
  "farmId": "FARM001",
  "telemetry": {
    "schemaVersion": 1,
    "deviceId": "ENV01",
    "bootId": "ab6cfc5e-18ff-4a01-852b-03604df6b52f",
    "sequence": 15,
    "timestamp": "2026-10-13T09:06:14Z",
    "temperature": 24.0,
    "humidity": 40.0,
    "soilMoisture": 100.0,
    "uptimeMs": 64419
  },
  "receivedAt": "2026-10-13T09:06:19.775305Z"
}
```

Sample chứng minh ingest và read API có reading; không chứng minh mọi gói đều
được lưu, restart vẫn giữ dữ liệu hoặc frontend đã dùng API. Soil 100% phù hợp
công thức potentiometer low=wet; không coi là phép đo đất vật lý đã hiệu chuẩn.
timestamp và receivedAt dùng UTC; không suy ra SLA độ trễ từ một sample.

Đổi sensor trong Wokwi, chờ telemetry mới, gọi API để đối chiếu. Sau restart
backend/database, history phải còn reading cũ. Kiểm tra cùng identity đến lại
không tăng số row. Những bước nghiệm thu live này vẫn đang chờ thực hiện.

## Bằng chứng đã có và giới hạn

Cloud đã chạy 7 Java tests trên PostgreSQL thật, gồm validation, migration,
8 insert đồng thời cùng identity chỉ tạo 1 reading, latest với gói đến muộn,
history/limit và API 400/404. Thêm 10 Python tests đạt. Jar khởi động, migration
public đạt; HTTP history[] và latest 404 đúng khi database chưa có telemetry.
Cloud smoke tắt MQTT vì không có credentials live trong runtime.

Lần test đầu chạy trong khi Docker đang tải image nên bị Connection refused.
Chờ Compose healthy rồi chạy lại đạt; không cần thay PostgreSQL bằng H2 hoặc
giảm yêu cầu test. Đây là bài học về kiểm tra dependency đã sẵn sàng trước khi
kết luận lỗi ứng dụng.

Queue 128 là bộ nhớ tạm, không phải hàng đợi bền vững. Khi DB lỗi hoặc queue đầy,
ứng dụng log gói chưa persisted; hiện chưa retry/replay. MQTT PUBACK là xác nhận
ở lớp MQTT, không đảm bảo PostgreSQL commit. Chống trùng ở DB không đồng nghĩa
exactly-once end-to-end. Phục hồi mất kết nối cần triển khai và kiểm chứng thêm.

## Dừng mà giữ dữ liệu

Ctrl+C backend, Stop Wokwi, đóng gateway và Disconnect Test Client khi không dùng.
Dừng database:

```bash
docker compose --env-file .local/postgres/db.env stop postgres
```

Giữ volume và envfile để tiếp tục lần sau. `down -v` xóa volume: chỉ dùng khi
cố ý xóa toàn bộ dữ liệu, không dùng làm cách sửa lỗi khởi động thông thường.
