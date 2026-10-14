# SOIL monitor — ba điểm đất độc lập

Prototype Wokwi riêng cho SOIL01: ADC1 GPIO34/35/32, fault injection GPIO27/14/25,
telemetry v2 SOIL1/SOIL2/SOIL3. Không có đầu ra bơm/van. Firmware chỉ cho
SIMULATOR; SIM_LINEAR_V1 là thang demo 0–4095, không phải hiệu chuẩn đất thật.

Khai báo bằng Sensor Realtime → Node & trạm nước → Khai báo node đất. Giữ
SIM_LINEAR_V1 ở ba kênh. Dùng certificate SOIL01 riêng, không dùng ENV01/WATER01.
Helper `tools/aws/provision_water_node.py --node-type SOIL` mặc định chỉ render;
`--apply` mới gọi AWS. `tools/water/prepare_local_node.py --node-type SOIL`
kiểm tra registry và tạo `.local/soil-nodes/SOIL01`, giữ config/cert local.

Đọc [chương 27](../../docs/book/CHAPTER_27_SOIL_MULTIPOINT.md) để biết lệnh Windows,
quyền, build/buildfs/merge, sơ đồ và sáu ca nghiệm thu còn **Chưa chạy**.
Source public build được khi endpoint rỗng; MQTT cần config/cert local. Không
commit `.local`, config.local.h, data PEM hoặc flash.bin đã merge.

Backend V18 thêm tab Trung tâm Cảnh báo → Đất nhiều điểm. Packet hiện có được
đánh giá theo kênh; không cần đổi certificate/nạp lại firmware chỉ để có alert.
Xem [chương28](../../docs/book/CHAPTER_28_SOIL_ALERTS.md). Không có lệnh bật bơm
hoặc soil-rule mới trong firmware này.
