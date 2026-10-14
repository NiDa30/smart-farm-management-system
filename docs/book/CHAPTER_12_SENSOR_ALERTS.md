# Cảnh báo ngưỡng từ dữ liệu thật

**Người dùng đã xác nhận cảnh báo đất thấp và nhiệt độ cao mở, đóng đúng
ngưỡng.** Đây là xác nhận của người dùng, không phải lần kiểm tra live của
phiên biên tập. Quy tắc tưới tự động chưa nghiệm thu đầy đủ.

| Cảnh báo | Mở khi | Đóng khi |
|---|---|---|
| `LOW_SOIL` | Độ ẩm đất dưới 30% | Độ ẩm đất từ 35% trở lên |
| `HIGH_TEMPERATURE` | Nhiệt độ trên 35°C | Nhiệt độ từ 33°C trở xuống |

Đọc [hướng dẫn terminal Windows](WINDOWS_RUNBOOK.md) trước khi thực hành.
Chỉ dùng bản code đã bàn giao; không pull hoặc chạy bản đang được agent khác
sửa. State trong PostgreSQL khác với RAM thiết bị: restart simulator mất RAM;
**NVS chưa làm**. Xem [phạm vi nghiệm thu](ACCEPTANCE_STATUS.md).

Lưu telemetry và evaluate alert cùng transaction. Sample trùng bị bỏ qua;
history cũ không phát cảnh báo. Chỉ sample trong 30 giây và tương lai tối đa 2s
được evaluate. Watermark per-device từ chối timestamp cũ/bằng timestamp đã
xử lý, row lock serialize; state persist trong PostgreSQL để restart không
mở incident trùng. Unique index đảm bảo một incident active mỗi device/type.

LOW_SOIL mở dưới 30%, đóng khi>=35%; HIGH_TEMPERATURE mở trên 35°C, đóng
khi<=33°C. Hai ngưỡng khác nhau là hysteresis để tránh flapping. Không phải
rule tưới, chưa publish command/email. Mất dữ liệu không tự close active.
API GET /api/v1/alerts trả 100 incident ưu tiên active. UI Trung tâm Cảnh báo
poll 5s và lọc active/cleared; báo lỗi khi backend không khả dụng.

Các bước kiểm tra lại trên Windows/Wokwi:

1. Giữ database, backend, frontend, gateway và simulator chạy. Mở Sensor
   Realtime để đối chiếu giá trị đã nhận từ telemetry.
2. Chỉnh potentiometer đến khi màn hình báo độ ẩm đất khoảng 28%. Chờ mẫu
   mới rồi mở Trung tâm Cảnh báo: `LOW_SOIL` phải đang hoạt động.
3. Tăng đất lên 32%: cảnh báo vẫn mở. Tăng lên 35% hoặc 40%: cảnh báo chuyển
   sang đã bình thường và có thời điểm đóng.
4. Chỉnh DHT22 lên 36°C để mở cảnh báo nhiệt độ cao. Giảm còn 34°C: cảnh báo
   vẫn mở. Giảm còn 33°C hoặc 30°C: cảnh báo đóng.
5. Ghi thời điểm, giá trị nguồn và trạng thái quan sát được. Không coi slider
   mô phỏng là số đo đất vật lý đã hiệu chuẩn. Ngưỡng hiện cố định trong code.

Cảnh báo chưa được backfill cho telemetry đã tồn tại trước V8; không kết luận
đã bình thường chỉ vì danh sách trống. Không có incident OFFLINE riêng trong
bản này; heartbeat/presence alert là bước khác.
