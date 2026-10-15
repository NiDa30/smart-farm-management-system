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

Chương thực hành bổ sung: [17 — Cài đặt tưới có phiên bản](CHAPTER_17_WATERING_SETTINGS.md), lưu cấu hình, xung đột hai tab và giữ bằng chứng theo run.

Chương thực hành bổ sung: [18 — Quan sát an toàn](CHAPTER_18_SAFETY_OVERVIEW.md), phân biệt bản tin cũ, lệnh chưa rõ kết quả và khả năng kiểm chứng firmware.

Chương thực hành bổ sung: [19 — Đã xem cảnh báo](CHAPTER_19_ALERT_ACKNOWLEDGEMENT.md), metadata độc lập với ngưỡng, xử lý hai tab và kết quả chưa xác định.

Chương thực hành bổ sung: [20 — Lịch tưới kết hợp độ ẩm](CHAPTER_20_AGRICULTURAL_IRRIGATION_CALENDAR.md), ưu tiên canh tác, khung giờ Việt Nam, overnight và dữ liệu từng đợt.

21. [Relay và phao cạn nước](CHAPTER_21_RESERVOIR_INTERLOCK.md): sơ đồ mới, interlock cục bộ, khóa/khôi phục và cập nhật ảnh flash; Wokwi live còn chờ.

Chương dự kiến tiếp theo: từ ESP32 demo đến các node nông nghiệp độc lập;
tham chiếu [lộ trình 18 nhóm thiết bị](../plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md).
Chỉ viết thực hành đã chạy sau từng mốc, giữ phần kiến trúc mục tiêu riêng.

22. [Node vật lý và kênh nước](CHAPTER_22_NODES_AND_WATER_CHANNELS.md): A1 có code/tests; tiếp tục A2 firmware và nghiệm thu trạm nước.

23. [WATER monitor độc lập](CHAPTER_23_WATER_NODE_MONITOR.md): A2 monitoring có code/build/helpers, provenance và chẩn đoán; chưa hoàn thành pump no-flow protection.

24. [Cảnh báo trạm nước](CHAPTER_24_WATER_ALERTS.md): đợt LOW/fault, bằng chứng packet, source riêng và ghi chú idempotent.

25. [Lịch sử kênh nước](CHAPTER_25_WATER_HISTORY.md): dữ liệu gốc, phân trang và CSV có nguồn/hiệu chuẩn từng mẫu.

26. [Local flow guard](CHAPTER_26_LOCAL_FLOW_GUARD.md): ISR/xung, software timer độc lập loop, latch và kiểm thử prototype.

27. [Node đất ba điểm](CHAPTER_27_SOIL_MULTIPOINT.md) — nền A3: kênh độc lập,
    V17, firmware mô phỏng và project/certificate riêng; coordinator tưới còn sau.

28. [Cảnh báo đất nhiều điểm](CHAPTER_28_SOIL_ALERTS.md) — hysteresis, chất lượng,
    packet mới/nguồn, V18 và xác nhận đã xem; tách cảnh báo khỏi lệnh tưới.

29. [Vùng tưới và ba điểm đất](CHAPTER_29_IRRIGATION_ZONES.md) — registry V19,
    source/freshness/coherence và khảo sát hiện tại, nền cho controller A3.

30. [Tổng quan nông nghiệp](CHAPTER_30_AGRICULTURE_OVERVIEW.md) — snapshot nguồn/kênh/vùng và tổng
    cảnh báo môi trường/nước/đất, expiry và giới hạn read model.

31. [Ước tính lượng nước FLOW](CHAPTER_31_WATER_VOLUME.md) — hình thang,
    coverage/gap/source/calibration và bỏ số tiêu thụ mẫu khỏi màn Nước & Điện.

32. [Một controller van riêng](CHAPTER_32_IRRIGATION_VALVE_DEMO.md) — binding,
    boot/request/ordinal fences, ACK/status, LED timer độc lập và ranh giới pump.

33. [Hàng chờ nhiều vùng](CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md) — FIFO diễn tập, snapshot, TTL/cancel và restart.
34. [MQTT fence PUMP01](CHAPTER_34_PUMP_COMMAND_FENCING.md) — boot/ordinal và ACK/status.
35. [HTTP intent PUMP01](CHAPTER_35_PUMP_HTTP_INTENT.md) — review version/UUID và đối chiếu mất phản hồi.
36. [Quyền sử dụng bơm](CHAPTER_36_PUMP_OWNERSHIP.md) — claim bền vững, epoch quy tắc, chuyển quyền có bằng chứng OFF.

37. [Phản hồi vị trí van](CHAPTER_37_VALVE_POSITION_FEEDBACK.md) — hai end stop độc lập, debounce/travel/fault, GPIO khác vị trí và nước.

38. [Nhánh tưới và bản chụp hàng chờ](CHAPTER_38_IRRIGATION_CIRCUITS.md) — ánh xạ nhiều nhánh, revision, độc quyền và cấu hình chưa dispatch.

39. [Van giám sát theo nhánh](CHAPTER_39_CIRCUIT_VALVE_MONITOR.md) — ID riêng, packet/version/boot, GPIO tắt và dữ liệu không bị mượn giữa van.
