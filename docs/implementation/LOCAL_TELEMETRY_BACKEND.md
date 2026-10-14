# PostgreSQL local và API telemetry

## Cập nhật nhiều sensor

Bản mới có registry khu vực/sensor, seed ENV01 trong AREA001, không xóa dữ liệu
cũ. Xem [hướng dẫn registry và IAM](../book/CHAPTER_09B_SENSOR_AREAS.md) trước
khi restart backend: subscription chuyển sang FARM001/+/telemetry và cần cập
nhật runtime policy. Các mô tả ENV01-only bên dưới là workflow baseline.
Đăng ký sensor không tự tạo certificate AWS; từng device phải có cấu hình riêng.

Mốc trước: người dùng đã cung cấp probe 300 giây nhận 60 gói, BUILD SUCCESS.
Mốc này thêm ingest → validate → PostgreSQL → read API; không tạo RDS/EC2.
API và PostgreSQL chỉ bind loopback. Đây là workflow phát triển local, chưa có
API auth/multi-farm; không đổi bind sang 0.0.0.0 để public ứng dụng.

## Windows Git Bash

Điều kiện: Docker Desktop đang chạy Linux containers, JDK21, profile smartfarm
với backend MQTT runtime policy đã dùng probe thành công. Dừng backend probe
trước khi chạy ứng dụng vì cùng client ID smartfarm-backend-FARM001. Wokwi và
private gateway vẫn chạy để cung cấp telemetry.

Tại repository root:

```bash
git pull --ff-only origin feat/day1-iot-foundation
./.local/day1-venv/Scripts/python.exe tools/backend/init_local_database.py
docker compose --env-file .local/postgres/db.env up -d --wait postgres
bash tools/backend/run_backend_windows.sh
```

Helper tạo password ngẫu nhiên trong ignored `.local/postgres/db.env`, không
in password, không đổi password nếu file đã có. Giữ file này cùng volume DB;
xóa file rồi tạo mới không đổi password của database đã khởi tạo. Dữ liệu DB
được giữ trong volume `smartfarm-mvp_postgres_data`. Chưa pin image digest:
Compose dùng postgres:16-bookworm để phát triển, cần pin trước release.

Log thành công: Flyway migration, `MQTT_TELEMETRY_SUBSCRIBED`, rồi
`TELEMETRY_SAVED device=ENV01 sequence=...`. Endpoint/region lấy từ cấu hình local;
khóa AWS không nằm trong application.yml. Backend dùng default credential chain.

Mở terminal khác:

```bash
curl --fail http://127.0.0.1:8080/api/v1/devices/ENV01/telemetry/latest
curl --fail 'http://127.0.0.1:8080/api/v1/devices/ENV01/telemetry?limit=10'
```

Latest trả 404 trước khi có reading hợp lệ; history trả [] nếu chưa có dữ liệu.
Response chứa id, farmId, telemetry (các trường hợp đồng v1), receivedAt (UTC).
History: tùy chọn from/to ISO8601 UTC, mặc định 24 giờ; khoảng [from,to), tối đa
31 ngày, limit 1..1000, thứ tự timestamp giảm dần. Latest cũng theo timestamp
nguồn, không để gói đến muộn ghi đè thành reading mới nhất. Giới hạn query không
thay thế phân trang đầy đủ trong tương lai.

## Validation và chống trùng

Chỉ nhận topic smartfarm/FARM001/ENV01/telemetry; deviceId ENV01, schemaVersion1,
đủ đúng 9 trường, không thêm trường, không ép string thành số. UUID đúng dạng,
timestamp có timezone; number/range theo telemetry v1; payload <=4096 bytes;
sequence/uptime là integer 0..Long.MAX_VALUE. Từ chối duplicate JSON keys và
trailing JSON. Bổ sung giới hạn timestamp tương lai tối đa 60 giây; dữ liệu cũ
được nhận cho truy vấn lịch sử. Giới hạn payload, int64 và future-skew là giới
hạn ingest bổ sung ngoài JSON Schema, không thay đổi hợp đồng gốc âm thầm.

Unique (device_id, boot_id, sequence) và INSERT ON CONFLICT DO NOTHING xử lý
redelivery đồng thời; cùng ID khác nội dung giữ bản đầu. Farm cố định FARM001;
không nhận tenant/farm từ payload. Database có CHECK cho phạm vi các số.

MQTT callback đưa vào queue có giới hạn 128; worker lưu DB, không block CRT
callback bằng JDBC. Khi queue đầy/DB lỗi, log nêu message chưa persisted.
**Chưa có durable queue/retry/replay:** MQTT PUBACK không đảm bảo DB đã commit.
DB outage có thể mất gói, không tuyên bố exactly-once end-to-end. Reconnect,
resubscribe và outage recovery cần nghiệm thu thêm. Đây là local MVP bước đầu.

## Kiểm tra database và API

Unit tests chạy bằng Maven verify. Integration tests thực sự dùng PostgreSQL,
không dùng H2, và chỉ chạy khi SMARTFARM_TEST_DB_URL được đặt. Schema riêng
telemetry_test; test truncate schema này, không truncate bảng ứng dụng public.

Windows Git Bash, tại repo root khi database đã healthy:

```bash
set -a
source .local/postgres/db.env
set +a
export SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:5433/smartfarm?currentSchema=telemetry_test'
cd backend
bash ./mvnw -B verify
unset SMARTFARM_TEST_DB_URL
```

Không đặt SMARTFARM_TEST_DB_URL đến database ngoài môi trường kiểm thử local.
Tests kiểm tra migration, insert đồng thời trùng, latest theo source time, query
range/limit và HTTP 404/400. Default verify bỏ qua integration tests nếu không
có URL; báo skipped không phải bằng chứng DB được kiểm tra.

## Dừng và tiếp tục

Ctrl+C backend, Stop Wokwi, đóng gateway/Disconnect Test Client khi không dùng.
Dừng PostgreSQL, vẫn giữ dữ liệu:

```bash
docker compose --env-file .local/postgres/db.env stop postgres
```

Không chạy down -v trừ khi cố ý xóa toàn bộ dữ liệu. Nếu port5433/8080 đã được
sử dụng, xử lý cổng hoặc dừng service đang dùng trước; không terminate máy khác.
