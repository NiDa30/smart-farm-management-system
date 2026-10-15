# Hồ sơ xây dựng và bản thảo sách Smart Farm

Người mới nên đọc [hướng dẫn chạy trên Windows](WINDOWS_RUNBOOK.md) trước,
sau đó xem [trạng thái nghiệm thu](ACCEPTANCE_STATUS.md) để biết phần nào đã
được người dùng xác nhận và phần nào mới có kiểm tra giả lập.

Bản bàn giao tưới V10 có [mẫu nhật ký thử Wokwi](WOKWI_AUTOMATION_TEST_LOG.md)
để ghi thao tác, thời điểm, commandId/run ID và bằng chứng; chưa có kết quả live.

Đây là bộ nhớ bằng tài liệu của dự án, được lưu trong Git để sử dụng qua các phiên làm việc. Không dựa vào việc một cuộc trò chuyện luôn giữ được toàn bộ lịch sử.

- [Nhật ký xây dựng](BUILD_JOURNAL.md): công việc, quyết định, bằng chứng, trạng thái hiện tại.
- [Sổ lỗi và cách xử lý](TROUBLESHOOTING.md): triệu chứng, nguyên nhân đã xác định, giải pháp và giới hạn.
- [Dàn ý sách](BOOK_OUTLINE.md): tổ chức câu chuyện xây dựng thành các chương thực hành.
- [Chương 8 — PostgreSQL local và API](CHAPTER_08_LOCAL_DATABASE_API.md): bản thảo thực hành đang được cập nhật cùng triển khai.
- [Chương 9 — Telemetry trên React](CHAPTER_09_REALTIME_FRONTEND.md): API, proxy, polling, freshness và kiểm tra giao diện.
- [Chương 9B — Sensor theo khu vực](CHAPTER_09B_SENSOR_AREAS.md): registry, thêm sensor/khu vực, topic identity, migration và runtime IAM.
- [Chương 10 — Relay Wokwi](CHAPTER_10_WOKWI_RELAY_CONTROL.md): command/ACK, cutoff timer, flags, IAM và các gate còn chờ live.
- [Kế hoạch MVP](../implementation/ONE_WEEK_SMART_FARM_MVP_PLAN.md) và [checklist](../implementation/MVP_CHECKLIST.md).

## Cách duy trì

Sau mỗi mốc triển khai hoặc lỗi đáng kể, cập nhật nhật ký và sổ lỗi. Mỗi mục ghi ngày, môi trường, việc thay đổi, kết quả quan sát, nguồn bằng chứng, việc còn thiếu và commit liên quan nếu có. Nếu chỉ người dùng chạy trên máy họ, ghi rõ “người dùng cung cấp đầu ra”; không gọi đó là kiểm chứng trực tiếp trong cloud.

Khi tiếp tục ở phiên mới, đọc bộ hồ sơ này và kiểm tra Git trước khi làm. Nhật ký phải phản ánh trạng thái cuối, nhưng giữ các lần thử sai để sách giải thích được nguyên nhân và bài học.

Không lưu access key, secret key, token, private key, liên kết xác minh hoặc ảnh chứa bí mật. Trong sách dùng ACCOUNT_ID, CERTIFICATE_ID và endpoint mẫu; không sao chép thông tin nhận dạng tài khoản cá nhân. Chỉ dùng lệnh đã kiểm chứng hoặc đánh dấu rõ chưa chạy. Không biến suy đoán thành kết luận.

Đây là bản ghi hồi cứu từ lịch sử có sẵn ngày 11/10/2026, chưa phải bản ghi đầy đủ mọi thao tác ngoài cuộc trò chuyện. Bổ sung nếu có bằng chứng mới.

- [Lịch sử cảm biến và CSV](CHAPTER_11_SENSOR_HISTORY.md)

- [Cảnh báo cảm biến](CHAPTER_12_SENSOR_ALERTS.md)

- [Quy tắc tưới tự động](CHAPTER_13_AUTOMATIC_WATERING.md)

- [Nhật ký sự kiện thật](CHAPTER_14_EVENT_LOG.md)

- [Bàn giao Event Log cloud](../implementation/LOCAL_EVENT_LOG_REPORT.md)

- [Giám sát thiết bị thật](CHAPTER_15_DEVICE_MONITORING.md)

- [Tổng quan IoT thật](CHAPTER_16_IOT_OVERVIEW.md)

- [Cài đặt quy tắc tưới có phiên bản](CHAPTER_17_WATERING_SETTINGS.md)

- [Quan sát an toàn từ dữ liệu thật](CHAPTER_18_SAFETY_OVERVIEW.md)

- [Xác nhận đã xem cảnh báo và ghi chú](CHAPTER_19_ALERT_ACKNOWLEDGEMENT.md)

- [Lịch tưới nông nghiệp theo tuần](CHAPTER_20_AGRICULTURAL_IRRIGATION_CALENDAR.md)

- [Relay tưới và phao cạn nước trên simulator](CHAPTER_21_RESERVOIR_INTERLOCK.md)

- [Định hướng mở rộng thiết bị nông nghiệp](../plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md):
  ý tưởng người dùng và backlog sau demo; chưa phải chương nghiệm thu phần cứng.

- [Node vật lý và kênh nước v2](CHAPTER_22_NODES_AND_WATER_CHANNELS.md): nền A1, registry/UI và ngữ nghĩa dữ liệu, chưa có WATER firmware live.

- [Trạm nước độc lập trên Wokwi](CHAPTER_23_WATER_NODE_MONITOR.md): firmware/pulse flow, project và certificate riêng; live còn chờ.

- [Cảnh báo trạm nước](CHAPTER_24_WATER_ALERTS.md): hai mẫu mới, hồ sơ/nguồn và xác nhận đã xem; không điều khiển bơm.

- [Lịch sử kênh nước và CSV](CHAPTER_25_WATER_HISTORY.md): lọc range/source/quality, phân trang và xuất đúng trang; không tính tổng lít.

- [Bảo vệ flow cục bộ](CHAPTER_26_LOCAL_FLOW_GUARD.md): opt-in ENV GPIO25, thời gian mồi và OFF/khóa; Wokwi live còn chờ.

- [Node đất ba điểm](CHAPTER_27_SOIL_MULTIPOINT.md): SOIL/v2, UI/history và firmware Wokwi riêng; chưa điều khiển van hoặc nghiệm thu live.

- [Cảnh báo đất nhiều điểm](CHAPTER_28_SOIL_ALERTS.md): đất khô/lỗi theo kênh và nguồn, hai mẫu mới, ACK/ghi chú; chưa điều khiển tưới từ SOIL.

- [Vùng tưới và ba điểm đất](CHAPTER_29_IRRIGATION_ZONES.md): gán kênh độc quyền, khảo sát đa số/cùng packet, phiên bản cấu hình; controller nhiều vùng còn sau.

- [Tổng quan nông nghiệp: đất, nước và vùng tưới](CHAPTER_30_AGRICULTURE_OVERVIEW.md)

- [Ước tính lượng nước FLOW và độ phủ dữ liệu](CHAPTER_31_WATER_VOLUME.md)

- [Controller riêng cho một van mô phỏng](CHAPTER_32_IRRIGATION_VALVE_DEMO.md)

- [Hàng chờ tưới nhiều vùng ở chế độ diễn tập](CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md)

- [Chặn lệnh MQTT cũ tại PUMP01 bằng boot và ordinal](CHAPTER_34_PUMP_COMMAND_FENCING.md)
