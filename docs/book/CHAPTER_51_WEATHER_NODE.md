# Chương 51 — Node thời tiết: phát hiện mưa và đo độ rọi

Ngày 16/10/2026, giờ Việt Nam. Đây là bước giám sát A4 trong
[lộ trình nông nghiệp](../plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md), giữ
nguyên các chốt và giới hạn điều phối A3.

## Từ cảm biến sang dữ liệu có nguồn

V37 thêm node WEATHER/v2 độc lập với ENVIRONMENT/v1, WATER và SOIL. Một
node có nhiều kênh, một khu vực có thể có nhiều node thời tiết. Hai kênh
ban đầu dùng cho thử nghiệm Wokwi:

| Kênh mặc định | Metric / đơn vị | Dữ liệu hợp lệ |
| --- | --- | --- |
| RAIN | RAIN_DETECTED / boolean | true phát hiện mưa, false không phát hiện mưa |
| LIGHT | LIGHT_ILLUMINANCE / lux | 0–200.000 lux, hữu hạn |

RAIN không phải mm mưa, cường độ hoặc dự báo. Lux là độ rọi, không phải
W/m², kWh hoặc lượng nước bốc thoát hơi. Các giới hạn là hợp đồng dữ liệu,
không phải khuyến nghị nông học hay chứng nhận dải đo của cảm biến cụ thể.
Quality SENSOR_FAULT bắt buộc value null; không đổi lỗi thành false/0.

V37 chỉ mở rộng constraint inventory/channel, không tạo node/kênh/mẫu,
không đổi dữ liệu hay checksum migration trước. ENV01/PUMP01, WATER/SOIL
và các contract v1 tiếp tục dùng như cũ. Topic là
`smartfarm/FARM001/{nodeId}/telemetry`, cùng envelope v2 hiện có.
Node, channel, metric, unit và calibration phải khớp registry; sai một
kênh từ chối cả packet. Tuple node/boot/sequence chống nhận trùng; packet
cũ/partial không làm mới kênh không được đo. Nguồn SIMULATOR/PHYSICAL là
thiết bị khai báo, không tự chứng minh phần cứng đã hiệu chuẩn.

## Giao diện

Mở **Sensor Realtime → Node & trạm nước → Khai báo node thời tiết**. Nhập
mã riêng, tên và khu vực; form tạo RAIN cùng LIGHT. RAIN calibration null,
LIGHT mặc định SIM_LUX_V1 để khớp firmware mô phỏng. Không thêm actuator.
Registry chỉ là khai báo, không provision certificate hay thêm board vào
simulator đang mở. Mất phản hồi lưu cần GET đối chiếu, không tự POST lại.

RAIN mới, hợp lệ hiện Có mưa/Không mưa. Mẫu thiếu, lỗi, lệch giờ, quá 30
giây hoặc API lỗi hiện **Chưa xác định**. Polling không làm mới timestamp
cảm biến. Clock hiển thị tiến theo đồng hồ monotonic; phản hồi có asOf cũ
không kéo mẫu cũ trở lại trạng thái mới. Tổng quan nông nghiệp cũng phân
biệt node thời tiết và không dùng nhãn phao Có nước cho kênh mưa.

Lịch sử từng kênh hỗ trợ khoảng giờ, nguồn, quality, phân trang và CSV như
WATER/SOIL. File có prefix weather-history, giữ false, 0, null, nguồn,
calibration, boot, sequence và hai timestamp. Nhãn trong lịch sử là giá trị
đã lưu, không khẳng định hiện đang mưa. CSV chỉ trang đang hiển thị.

**Chưa dùng RAIN/LIGHT để thay đổi quyết định tưới.** Rule ENV01, queue và
session giữ logic hiện tại. Thêm rain gate cần mapping theo vùng, freshness,
chính sách unknown và kiểm thử dispatch riêng; không chỉ đọc một boolean
rồi bật/tắt bơm. Không coi bước giám sát này là hoàn tất A3/A4.

## Board Wokwi riêng

[Project công khai](../../firmware/weather-node/README.md) gồm ESP32, một
switch RAIN GPIO27, núm LIGHT ADC1 GPIO34 và hai switch FAULT GPIO14/25.
Rain trái = có mưa; phải = không mưa. FAULT trái = lỗi, phải = bình thường.
LIGHT đặt 0–200.000 lux mô phỏng tuyến tính; không phải công thức hiệu chuẩn
LDR. Switch hở không chứng minh không bị đứt dây. Không có relay/van/bơm.

Firmware chỉ cho SIMULATOR, lấy mẫu khoảng 5 giây, giữ quality độc lập,
MQTT TLS/QoS1 không retained, không nhận command. Offline không tạo lại
mẫu cũ với timestamp mới. PUBACK chỉ xác nhận broker nhận, không xác nhận
dashboard hoặc sensor vật lý.

## Chuẩn bị trên Windows

1. Pull nhánh hiện tại; restart backend để Flyway áp V37, giữ database volume.
2. Khai báo WEATHER01 đúng form trên web. Các node tiếp theo dùng ID riêng.
3. Trong Git Bash từ gốc repo, dùng AWS profile local đã cấu hình. Thay
   `YOUR_12_DIGIT_ACCOUNT_ID` bằng account của bạn. Render policy để xem trước:

```bash
export AWS_PROFILE=smartfarm
./.local/day1-venv/Scripts/python.exe tools/aws/provision_water_node.py \
  --node-type WEATHER --node-id WEATHER01 --region ap-southeast-1 \
  --account-id YOUR_12_DIGIT_ACCOUNT_ID
```

Khi đã có đúng quyền provision, chạy lại với `--apply` để tạo tài nguyên
AWS thật. Device policy chỉ cho Connect đúng client và Publish telemetry
của chính node, không command/subscribe/cross-node. Không gửi key vào chat.
Helper dùng thư mục chứng chỉ riêng `.local/aws/WEATHER01`; manifest khác
node type/account hoặc kết quả tạo cert chưa rõ sẽ chặn việc tạo trùng.

Chuẩn bị CA công khai qua TLS có xác minh, rồi tạo project riêng:

```bash
curl --fail --show-error --location \
  https://www.amazontrust.com/repository/AmazonRootCA1.pem \
  --output .local/AmazonRootCA1.pem
./.local/day1-venv/Scripts/python.exe tools/water/prepare_local_node.py \
  --node-type WEATHER --node-id WEATHER01 --ca-file .local/AmazonRootCA1.pem
./.local/day1-venv/Scripts/python.exe -m platformio run \
  --project-dir .local/weather-nodes/WEATHER01
./.local/day1-venv/Scripts/python.exe -m platformio run \
  --project-dir .local/weather-nodes/WEATHER01 -t buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py \
  --project-dir .local/weather-nodes/WEATHER01
```

Mở project riêng bằng VS Code/Wokwi, bật gateway rồi Start Simulator. Không
dùng lẫn clientId/certificate với ENV01 hoặc chạy hai board cùng WEATHER01.
Helper kiểm tra registry và key pair trước khi ghi project; refresh-source
giữ cấu hình riêng và từ chối ghi đè source đã sửa. Không nạp PUBLIC build
cloud lên để mong TLS hoạt động: build đó có endpoint rỗng, FS không có key.
Dừng board/gateway khi không thử và theo dõi AWS Budget.

## Kiểm chứng

525 test backend, 37 browser node/history/zone, 17 browser dashboard,
75 browser nhánh hồi quy, 19 unit node/history/weather và 9 Python weather
+ 17 WATER + 7 SOIL đạt, không skip. Native model/serializer cùng header
firmware đạt; ESP32 build, empty-FS và merge 4 MiB đạt. Không gọi AWS.

Pipeline local dùng 5 packet native: không mưa/max lux, tối/0, mưa/max,
lỗi hai kênh, phục hồi mưa/ánh sáng. Receiver thật lưu 5 mẫu/10 readings
trong schema riêng, không command/run. Full app đi menu thật, hai lịch sử,
hai CSV và lọc PHYSICAL rỗng đạt. Restart JVM giữ 8 bảng dữ liệu như cũ;
GET không thay đổi 8 bảng. V36→V37 giữ 15 bảng fixture cũ và migrate lần
hai no-op. Chi tiết lỗi phát hiện/sửa trong
[bàn giao](../implementation/LOCAL_WEATHER_NODE_REPORT.md).

| Ca Windows/AWS/Wokwi mới | Kết quả |
| --- | --- |
| Registry → cert riêng → TLS/PUBACK → web đúng nguồn | Chưa chạy |
| Rain switch và LIGHT ở 0/max, không nhầm bool/null | Chưa chạy |
| Fault từng kênh và phục hồi, kênh kia không bị làm mới giả | Chưa chạy |
| Tắt gateway, mẫu cũ thành Unknown, nối lại nhận mẫu mới | Chưa chạy |
| Hai node cùng khu vực, ID/cert/history độc lập | Chưa chạy |

Chưa nghiệm thu rain/lux vật lý, hiệu chuẩn, weather gate hoặc AI/dự báo.

Bước tiếp theo đã triển khai ở [chương52](CHAPTER_52_ZONE_RAIN_GATE.md): V38
thêm chốt mưa opt-in theo vùng tại thời điểm bắt đầu; phần mô tả V37 ở trên
vẫn là bằng chứng của đợt giám sát, không phải nghiệm thu gate AWS/Wokwi.
