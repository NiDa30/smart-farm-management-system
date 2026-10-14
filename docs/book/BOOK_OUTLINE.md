# Dàn ý sách — Xây dựng hệ thống quản lý trang trại IoT

Trạng thái: khung bản thảo và các chương thực hành đã có. Chỉ viết phần “đã
triển khai thành công” khi có bằng chứng tương ứng. Các trạng thái “Windows
live còn chờ” trong dàn ý bên dưới là mốc lịch sử; đọc
[bảng nghiệm thu ngày 14/10/2026](ACCEPTANCE_STATUS.md) trước khi kết luận.
Người dùng đã xác nhận cảnh báo mở/đóng đúng ngưỡng; automation chưa nghiệm
thu đầy đủ. Các chương 11–13 thực hành nằm trong [mục lục sách](README.md).

1. Bài toán trang trại và giới hạn MVP: người dùng, luồng nghiệp vụ, 7 ngày và tiêu chí nghiệm thu.
2. Đọc và kiểm tra repository: frontend mock, dependency, môi trường cloud/Windows, Git branch và bảo vệ thay đổi cục bộ.
3. Kiến trúc end-to-end: ESP32 → AWS IoT → backend → database → giao diện → command → ACK; giới hạn trách nhiệm và bảo mật.
4. Kiểm soát chi phí trước khi triển khai: credit vs payable, EC2/EBS/IPv4, cleanup an toàn, Budget và email verification.
5. AWS IoT Day 1: IAM identity, policy scoped, Thing/certificate, script có manifest, lỗi quyền và nguyên tắc không làm lộ khóa.
6. Firmware ESP32 và Wokwi: cảm biến, ADC, TLS/LittleFS, build, workflow private, telemetry và đo bằng chứng.
7. Hợp đồng dữ liệu và kết nối backend: schema, timestamp, bootId/sequence, QoS/PUBACK, WSS/SigV4 và phân biệt self-test/live test.
8. [PostgreSQL và API](CHAPTER_08_LOCAL_DATABASE_API.md): migration, validation, idempotency và query đã có code/tests cloud; Windows live còn chờ sửa Docker. Retention chưa triển khai.
9. [Giao diện realtime](CHAPTER_09_REALTIME_FRONTEND.md): polling API, freshness, cached/error và history có code/tests; Windows live còn chờ. WebSocket/chart dài hạn chưa triển khai.
   Phần mở rộng [9B — sensor theo khu vực](CHAPTER_09B_SENSOR_AREAS.md): registry và giao diện nhiều sensor đã kiểm tra trong cloud; multi-device live Windows cần cập nhật IAM/provisioning từng device.
10. [Điều khiển an toàn](CHAPTER_10_WOKWI_RELAY_CONTROL.md): command/ACK, timer, lockout có code/tests; Wokwi live, safety events và rule engine còn chờ.
11. Nghiệm thu hệ thống: test matrix, lỗi mạng/certificate/policy, độ trễ, dữ liệu thiếu, bằng chứng end-to-end.
12. Vận hành và bước tiếp theo: chi phí, observability, credential rotation, rollback, chuyển simulator sang phần cứng thật.

Phụ lục: sổ lỗi, lệnh Windows/Linux, glossary, mẫu schema/topic/policy đã ẩn thông tin tài khoản, checklist và bảng phiên bản được kiểm chứng.

Mỗi chương gồm mục tiêu, điều kiện đầu vào, lý do chọn giải pháp, thực hành, kết quả mong đợi, lỗi thật gặp trong dự án, cách giải quyết, và tiêu chí hoàn thành. Chuẩn hóa lệnh để người đọc sao chép được; giữ ảnh đã che thông tin riêng. Không đưa bí mật từ `.local/`, filesystem image hay credentials vào bản thảo.
