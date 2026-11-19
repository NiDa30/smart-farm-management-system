# Realtime và sức khỏe thiết bị (V17)

Gói 1 của việc hoàn thiện phân hệ IoT: kênh WebSocket báo thay đổi cho mọi màn hình IoT,
cảnh báo sức khỏe thiết bị và bảng chất lượng dữ liệu. Không đổi hợp đồng MQTT v1/v2,
không đổi firmware, không thêm lệnh điều khiển.

## Đã thêm

| Phần | Nội dung |
|---|---|
| `/ws/iot` | Backend chỉ gửi `{type, version, topics}` sau khi transaction commit; không gửi số đo hay lệnh. Trình duyệt tải lại qua REST hiện có. Chỉ nhận origin trong `smartfarm.realtime.allowed-origins`; client gửi dữ liệu lên thì bị đóng; tối đa 64 kết nối; heartbeat 25 giây. |
| Frontend | Một kết nối dùng chung (`src/modules/iot/live`). Có thay đổi thì tải lại ngay; đang tải thì tải lại ngay sau đó, không chạy song song. Socket khỏe: dự phòng 30 giây. Mất socket hoặc không có socket: giữ chu kỳ cũ (2/3/5 giây). Kết nối lại hoặc lệch version: mọi màn hình tải lại một lần. Chỉ báo trạng thái ở góc trên các trang `/iot`. |
| V17 `device_health_alert` | `DEVICE_OFFLINE` (im lặng quá 60 giây, hết khi có gói trong 30 giây), `STUCK_VALUE` (kênh môi trường giữ đúng một giá trị 30 phút, cần ít nhất nửa số mẫu), `PUMP_NO_FLOW` (PUMP01 báo ON quá 20 giây mà kênh lưu lượng cấu hình dưới 0,5 L/min). Mỗi loại một đợt mở duy nhất; xác nhận đã xem như cảnh báo nước. |
| Điều kiện đánh giá | Chỉ khi MQTT backend `CONNECTED` đã ổn định ít nhất `offline-seconds`; nếu không thì không mở, không đóng đợt nào. Thiết bị chưa từng gửi dữ liệu không bị tính mất tín hiệu. Bộ lập lịch chỉ chạy khi `smartfarm.mqtt.enabled=true`. |
| `/api/v1/monitoring/statistics` | Theo từng node trong 1–24 giờ: tỷ lệ đủ mẫu so với chu kỳ 5 giây, số lần đứt quãng (>15 giây), khoảng trống dài nhất, số lần khởi động lại, số lần giá trị nhảy (nhiệt độ >5°C, độ ẩm đất >20 điểm), uptime gần nhất. |
| Giao diện | Tab "Sức khỏe thiết bị" trong Trung tâm cảnh báo; bảng "Chất lượng dữ liệu" trong Giám sát thiết bị. |

`PUMP_NO_FLOW` chỉ là cảnh báo: backend không tự tắt bơm. Bảo vệ cục bộ theo lưu lượng
trên firmware vẫn là việc của A2. Pin và RSSI chưa có trong hợp đồng dữ liệu nên không hiển thị.

## Cấu hình

| Thuộc tính | Biến môi trường | Mặc định |
|---|---|---|
| `smartfarm.realtime.allowed-origins` | `SMARTFARM_REALTIME_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |
| `smartfarm.health.offline-seconds` | `SMARTFARM_HEALTH_OFFLINE_SECONDS` | 60 (30–3600) |
| `smartfarm.health.stuck-minutes` | `SMARTFARM_HEALTH_STUCK_MINUTES` | 30 (0 = tắt, 5–1440) |
| `smartfarm.health.pump-flow-channel` | `SMARTFARM_HEALTH_PUMP_FLOW_CHANNEL` | trống = tắt; dạng `WATER01/FLOW` |
| `smartfarm.health.minimum-flow-lpm` | `SMARTFARM_HEALTH_MINIMUM_FLOW_LPM` | 0.5 |
| `smartfarm.health.flow-grace-seconds` | `SMARTFARM_HEALTH_FLOW_GRACE_SECONDS` | 20 (5–300) |

Mở web qua IP LAN (Vite `--host`) thì thêm origin đó vào `SMARTFARM_REALTIME_ORIGINS`;
nếu không, chỉ báo hiện "đang kết nối lại" và màn hình vẫn tải theo chu kỳ.

## Trạng thái kiểm chứng

Môi trường làm việc không tải được Maven/npm, nên **chưa build và chưa chạy test Java,
Vite hay Playwright**. Đã kiểm chứng được:

- Migration V1–V17 chạy sạch trên PostgreSQL 16; các câu SQL mới (thống kê, giá trị đứng,
  mất tín hiệu, mở/đóng đợt, khóa advisory) chạy trên dữ liệu mẫu và cho kết quả đúng.
- Cú pháp Java của toàn bộ `backend/src` (javac, bước phân tích cú pháp).
- 9 unit test frontend (`node:test`, TypeScript `--strict`): kết nối, backoff, watchdog, đồng bộ
  lại, vòng tải không chạy song song, kiểm tra phản hồi cảnh báo sức khỏe và thống kê.
- So sánh lỗi kiểu giữa `main` và nhánh này với bản khai báo React tối giản: không có lỗi mới
  ngoài loại lỗi do bản khai báo đó (giống hệt các file sẵn có).

Cần chạy trên máy có mạng trước khi merge:

```bash
cd backend && ./mvnw -B verify      # gồm IotRealtimeTest; DeviceHealthTest cần SMARTFARM_TEST_DB_URL
npm run lint && npm run build
npm run test:alerts && npm run test:monitoring && npm run test:dashboard && npm run test:safety
```

Chưa thử trên Windows/AWS/Wokwi: độ trễ từ gói MQTT đến giao diện, hành vi khi mất mạng thật.
