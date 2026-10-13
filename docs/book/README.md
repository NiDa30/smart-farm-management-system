# Hồ sơ xây dựng và bản thảo sách Smart Farm

Đây là bộ nhớ bằng tài liệu của dự án, được lưu trong Git để sử dụng qua các phiên làm việc. Không dựa vào việc một cuộc trò chuyện luôn giữ được toàn bộ lịch sử.

- [Nhật ký xây dựng](BUILD_JOURNAL.md): công việc, quyết định, bằng chứng, trạng thái hiện tại.
- [Sổ lỗi và cách xử lý](TROUBLESHOOTING.md): triệu chứng, nguyên nhân đã xác định, giải pháp và giới hạn.
- [Dàn ý sách](BOOK_OUTLINE.md): tổ chức câu chuyện xây dựng thành các chương thực hành.
- [Chương 8 — PostgreSQL local và API](CHAPTER_08_LOCAL_DATABASE_API.md): bản thảo thực hành đang được cập nhật cùng triển khai.
- [Chương 9 — Telemetry trên React](CHAPTER_09_REALTIME_FRONTEND.md): API, proxy, polling, freshness và kiểm tra giao diện.
- [Chương 9B — Sensor theo khu vực](CHAPTER_09B_SENSOR_AREAS.md): registry, thêm sensor/khu vực, topic identity, migration và runtime IAM.
- [Kế hoạch MVP](../implementation/ONE_WEEK_SMART_FARM_MVP_PLAN.md) và [checklist](../implementation/MVP_CHECKLIST.md).

## Cách duy trì

Sau mỗi mốc triển khai hoặc lỗi đáng kể, cập nhật nhật ký và sổ lỗi. Mỗi mục ghi ngày, môi trường, việc thay đổi, kết quả quan sát, nguồn bằng chứng, việc còn thiếu và commit liên quan nếu có. Nếu chỉ người dùng chạy trên máy họ, ghi rõ “người dùng cung cấp đầu ra”; không gọi đó là kiểm chứng trực tiếp trong cloud.

Khi tiếp tục ở phiên mới, đọc bộ hồ sơ này và kiểm tra Git trước khi làm. Nhật ký phải phản ánh trạng thái cuối, nhưng giữ các lần thử sai để sách giải thích được nguyên nhân và bài học.

Không lưu access key, secret key, token, private key, liên kết xác minh hoặc ảnh chứa bí mật. Trong sách dùng ACCOUNT_ID, CERTIFICATE_ID và endpoint mẫu; không sao chép thông tin nhận dạng tài khoản cá nhân. Chỉ dùng lệnh đã kiểm chứng hoặc đánh dấu rõ chưa chạy. Không biến suy đoán thành kết luận.

Đây là bản ghi hồi cứu từ lịch sử có sẵn ngày 11/10/2026, chưa phải bản ghi đầy đủ mọi thao tác ngoài cuộc trò chuyện. Bổ sung nếu có bằng chứng mới.
