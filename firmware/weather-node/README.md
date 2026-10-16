# WEATHER — trạm mưa và ánh sáng mô phỏng

Project ESP32 độc lập, publish telemetry v2 cho WEATHER01, không có đầu ra
actuator và không subscribe command. Không thay diagram/firmware ENV01.

| Điều khiển Wokwi | GPIO | Ý nghĩa |
| --- | --- | --- |
| RAIN switch | 27 | Trái nối GND = có mưa; phải = không mưa |
| LIGHT dial | 34, ADC1 | Đặt độ rọi mô phỏng 0–200.000 lux |
| RAIN FAULT switch | 14 | Trái = lỗi cảm biến mưa, gửi null |
| LIGHT FAULT switch | 25 | Trái = lỗi kênh ánh sáng, gửi null |

Để hai FAULT ở bên phải khi thử bình thường. Switch RAIN không đo mm mưa
hoặc chẩn đoán đứt dây; núm LIGHT không phải cảm biến lux đã hiệu chuẩn.
SIM_LUX_V1 chỉ là thang mô phỏng. Firmware chặn build PHYSICAL. Mẫu lỗi có
quality SENSOR_FAULT/value null, không thay bằng không mưa hoặc độ rọi 0.

Web: Sensor Realtime → Node & trạm nước → Khai báo node thời tiết. Mặc định
RAIN/RAIN_DETECTED/boolean/calibration null và
LIGHT/LIGHT_ILLUMINANCE/lux/SIM_LUX_V1. Registry không tự tạo board hoặc key.

Dùng certificate riêng, helper `tools/aws/provision_water_node.py --node-type WEATHER`
và `tools/water/prepare_local_node.py --node-type WEATHER`. Project riêng
được tạo tại `.local/weather-nodes/WEATHER01`; không dùng chứng chỉ ENV01.
Build, buildfs và merge tại máy local theo
[chương 51](../../docs/book/CHAPTER_51_WEATHER_NODE.md). Source public có
endpoint rỗng và không chứa chứng chỉ; build public thành công không chứng
minh đã kết nối AWS/Wokwi. Không commit config.local.h, PEM hoặc flash đã gắn key.

Đợt này chỉ giám sát/lịch sử/CSV. Chưa weather gate, chưa tự dừng hoặc khởi
chạy tưới theo mưa/ánh sáng, chưa rain forecast hay radiation/energy model.
