# Báo cáo: màn hình IoT trực tiếp, năng lượng ước tính và phân tích IoT

Nhánh `feat/iot-live-views` (nền: `feat/iot-remote-config-ota`).

## Mục tiêu
Thay các màn hình IoT còn dùng dữ liệu giả (Topology, Digital Twin, Water & Energy) bằng màn hình đọc dữ liệu thật từ backend, đồng thời thêm năng lượng **ước tính từ thời gian chạy**, thống kê IoT và trạng thái edge.

## Backend
- **V21** `actuator_state_history`: mỗi lần trạng thái báo cáo của actuator đổi, trigger `record_actuator_state_change` ghi một dòng. Bảng `iot_actuator_binding` có thêm cột `rated_watts`, nhận giá trị 1–20000 hoặc để trống.
- `Runtime`: dựng các khoảng ON từ lịch sử trạng thái.
  - Một khoảng ON chưa đóng kết thúc ở lần thiết bị báo cáo gần nhất, không kéo tới hiện tại. Vì vậy thiết bị im lặng không bị cộng thêm giờ chạy.
  - Thời gian được chia theo ngày, tính theo giờ trang trại.
- `GET /api/v1/iot/energy?days=1..31` trả về `method: ESTIMATED_FROM_RUNTIME`, kWh tính bằng giây chạy × công suất định mức.
  - Thiết bị chưa khai công suất có `kilowattHours: null` và được liệt kê trong `unrated`. Hệ thống không đoán công suất.
- `PUT /api/v1/iot/actuators/{id}/rated-power` khai công suất định mức cho thiết bị.
- `GET /api/v1/iot/analytics` gồm:
  - tỉ lệ lệnh thành công và các mã lỗi, cho bơm và actuator;
  - số lần tưới, số chuỗi tưới theo zone;
  - cảnh báo mới theo loại;
  - thời gian chạy của từng thiết bị.

## Frontend (`src/modules/iot/live-views/`)
| Route | Màn hình |
|---|---|
| `/iot/topology` | Broker → node → actuator, trạng thái chỉ lấy từ báo cáo của thiết bị |
| `/iot/digital-twin` | Theo khu: cảm biến (dữ liệu cũ được đánh dấu), zone, chuỗi tưới đang chạy |
| `/iot/water` | Mực nước, khóa an toàn, lịch sử tưới |
| `/iot/energy` (`/iot/resources`) | kWh ước tính, khai công suất định mức |
| `/iot/analytics` | Lệnh, lỗi, cảnh báo, thời gian chạy |
| `/iot/edge` | Firmware, cấu hình, OTA, heartbeat từng node |

Ba component dùng dữ liệu giả `DigitalTwinView`, `IoTTopology` và `WaterEnergyMonitor` đã được xóa.

## Kiểm chứng
- Backend: `RuntimeTest` và `IotAnalyticsTest`. CI chạy toàn bộ `./mvnw -B verify` với PostgreSQL 16 và đạt.
- Frontend: `liveApi.test.ts`. `npm run test:live` (Playwright) đạt 6/6. Lint và build sạch.
- Firmware và Wokwi: không thay đổi, CI vẫn đạt.

## Giới hạn
- Năng lượng là **ước tính**, không phải số đo từ công tơ. Thiết bị chưa khai công suất không có số kWh.
