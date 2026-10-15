# Bàn giao hàng chờ tưới diễn tập V21

15/10/2026, giờ Việt Nam. Tiếp A3 bằng FIFO nhiều vùng và một suất diễn tập,
chưa dispatch bơm/van. Chế độ cố định PREVIEW_ONLY; PUMP01/ENV01/rule/VALVE01
độc lập, không có lease thật hoặc GPIO mới.

Đường vào: **IoT & Tự động hóa → Điều khiển Actuator → Mở hàng chờ tưới diễn tập**.
Backend/frontend restart sau pull; V21 tự migrate, không reset DB, không đổi
IAM/cert/firmware hoặc cài dependency mới. Chọn vùng SIMULATOR đã có ba kênh,
thêm lượt1–30giây rồi bấm diễn tập đầu hàng. 50 lượt mở, TTL chờ5phút. Mỗi
lượt sau cần thao tác mới. Restart ngắt active, không resume. Xem toàn bộ
thiết kế/API/Windows và giới hạn trong [chương33](../book/CHAPTER_33_IRRIGATION_QUEUE_PREVIEW.md).

| Kiểm tra cuối | Kết quả |
| --- | --- |
| Backend toàn bộ với PostgreSQL riêng | 229/229, không skip |
| Browser queue, fixture API | 12/12 |
| Unit parser queue | 5/5 |
| Browser van hồi quy | 9/9 |
| Lint/build | Đạt |
| Full-app PostgreSQL + restart process thật | Đạt; lịch sử REHEARSED/INTERRUPTED/CANCELLED |
| Migration V20→V21 fixture van | Dữ liệu cũ giữ nguyên |
| AWS/Wokwi/GPIO mới | Không chạy |
| Windows người dùng | 5 ca Chưa chạy |

File chính: `IrrigationQueue.java`, controller/scheduler, V21, test17ca;
`IrrigationQueuePanel.tsx`, `queueApi.ts`, App/PumpControl navigation;
Playwright config/fixture12ca và parser5ca; full-app fixture/script prepare/restart/inspect.
Test-only application.properties tắt tick nền, không thay scheduling production.

Cloud hiện backend8080 schema `irrigation_queue_smoke`, Vite3000, PostgreSQL
smartfarm-cloud-test55439. MQTT/control/valve-demo false. Node/zone fixture2,
4lượt giữ lịch sử (thêm một lượt kiểm tra lại restart trên jar cuối); pump_command0/watering_run0/valve_command0. Không reseed.
Demo DB5433 và các schema bằng chứng khác không reset. Schema van cũ chỉ
được nâng V21, snapshot node/zone/binding/status/commands/runs giữ nguyên.

Log cuối trong `/tmp`: queue-backend-final.log, queue-browser-final.log,
queue-unit.log, queue-valve-regression.log, queue-lint-final.log,
queue-build-final.log, queue-runtime-final-restart.log, queue-upgrade.log;
ảnh `/tmp/irrigation-queue-full-app.png`. Các file /tmp không được coi là
artifact đã push. Helper full-app lưu ID không chứa secret trong
`/tmp/queue-smoke-ids.json`; không chạy lại phase prepare trên schema giữ lại.

Lượt đơn lẻ đầu lỗi giả định singleton tồn tại; chuyển assertion sang snapshot
rỗng hợp lệ. Hồi quy đầu8 lỗi FK do fixture QZONE sót từ lượt đơn lẻ; thêm
cleanup sở hữu trong finally, kiểm tra0 vùng sót, chạy lại toàn bộ đạt. Không
bỏ test/skip, không xóa schema. Hai lỗi và cách giải quyết đã ghi trong sách.

Tiếp theo: chống lệnh muộn/boot ở PUMP01 và quyền sở hữu chung với manual/rule,
rồi mới nối coordinator với controller nhiều van và liên động nước. Ledger
này không chứng minh đã có tưới nhiều vùng thật hay vận hành không giám sát.
