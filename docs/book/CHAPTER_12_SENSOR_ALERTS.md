# Cảnh báo ngưỡng từ dữ liệu thật

Lưu telemetry và evaluate alert cùng transaction. Sample trùng bị bỏ qua;
history cũ không phát cảnh báo. Chỉ sample trong30 giây và tương lai tối đa2s
được evaluate. Watermark per-device từ chối timestamp cũ/bằng timestamp đã
xử lý, row lock serialize; state persist trong PostgreSQL để restart không
mở incident trùng. Unique index đảm bảo một incident active mỗi device/type.

LOW_SOIL mở dưới30%, đóng khi>=35%; HIGH_TEMPERATURE mở trên35°C, đóng
khi<=33°C. Hai ngưỡng khác nhau là hysteresis để tránh flapping. Không phải
rule tưới, chưa publish command/email. Mất dữ liệu không tự close active.
API GET /api/v1/alerts trả100 incident ưu tiên active. UI Trung tâm Cảnh báo
poll5s và lọc active/cleared; báo lỗi khi backend không khả dụng.

Windows: pull nhánh, restart backend để chạy V8, frontend refresh. Giữ Wokwi
kết nối và giảm potentiometer để Sensor Realtime báo soil28. Chờ telemetry
đến, xem LOW_SOIL ở Trung tâm Cảnh báo. Tăng soil32 vẫn active; tăng35/40
phải chuyển đã bình thường và có thời điểm clear. DHT22 chỉnh36 mở alert,
chỉnh34 vẫn active, chỉnh33/30 clear. Đối chiếu giá trị source trong realtime,
không coi slider mô phỏng là số đo vật lý. Ngưỡng hiện cố định trong code.

Cảnh báo chưa được backfill cho telemetry đã tồn tại trước V8; không kết luận
đã bình thường chỉ vì danh sách trống. Không có incident OFFLINE riêng trong
bản này; heartbeat/presence alert là bước khác.
