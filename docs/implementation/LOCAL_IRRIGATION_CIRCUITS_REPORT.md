# Bàn giao V26 — cấu hình nhánh tưới

Ngày: 15/10/2026 (Asia/Ho_Chi_Minh). Nhánh: feat/day1-iot-foundation.

Đã thêm GET/POST/PUT cấu hình nhiều nhánh theo vùng, controller/van dự kiến,
PUMP01 và trạm nước. Mỗi vùng/van độc quyền; controller/trạm dùng chung.
Optimistic revision, kiểm tra nguồn/kênh/identity, snapshot khảo sát nước và
phân biệt van chưa kết nối. Không tạo thiết bị hoặc dispatch.

Hàng chờ PREVIEW_ONLY giữ cấu hình nhánh nguyên vẹn tại lúc tạo. Client phải
gửi circuitId/circuitRevision đã duyệt. Đổi nhánh làm INVALIDATED/INTERRUPTED;
không tự đổi đích, giữ FIFO và yêu cầu bấm bắt đầu lượt kế tiếp. Legacy null
không được tự gán đích. Không thay pump ownership, firmware hoặc IAM.

File chính:

- backend: IrrigationCircuits / IrrigationCircuitController / IrrigationQueue,
  migration V26, IrrigationCircuitsTest.
- web: IrrigationCircuitPanel / circuitApi / queueApi / IrrigationQueuePanel,
  điều hướng từ PumpControl và App.
- browser: suite test:circuits và cập nhật test:queue; full-app script
  tools/frontend/smoke_irrigation_circuits.py.
- sách: [chương38](../book/CHAPTER_38_IRRIGATION_CIRCUITS.md), mục lục,
  acceptance, Windows runbook, journal, troubleshooting và roadmap.

| Kiểm tra đã chạy | Kết quả |
| --- | --- |
| Backend verify toàn bộ, PostgreSQL riêng |315/315, không skip |
| Browser nhánh cấu hình |11/11 |
| Browser hàng chờ, gồm bản chụp nhánh |16/16 |
| TypeScript lint / production build |Đạt |
| Migration V25→26 bảo toàn lượt cũ |Đạt trong backend suite |
| Full-app API/UI/PostgreSQL, không mock |Đạt |
| Restart tiến trình JVM thật, snapshot giữ nguyên |Đạt |
| 291 liên kết Markdown tương đối / git diff --check |Đạt |

Log cloud: /tmp/circuits-backend-full.log, /tmp/circuits-browser.log,
/tmp/circuits-queue-browser.log, /tmp/circuits-lint.log,
/tmp/circuits-build.log, /tmp/circuits-app-create.log,
/tmp/circuits-app-stored.log. Screenshot /tmp/irrigation-circuits-stored.png
và /tmp/irrigation-circuit-queue-stored.png. Đây là artifact tạm, không phải
file secret hoặc bằng chứng Wokwi mới.

Runtime cloud8080 dùng schema irrigation_circuit_smoke trong PostgreSQL test
55439, MQTT/control/valve-demo false. Có2nhánh,3lượt: hủy, ngắt do restart,
một lượt chờ có thể hết TTL tự nhiên sau phép thử. Snapshot không đổi dù
trạng thái theo thời gian thay đổi. Ledger lệnh bơm/van và watering_run0.
Giữ nguyên schema fixture V25 và DB demo5433; không refresh telemetry cũ.

Lỗi trong lượt kiểm thử tập trung đầu: thiếu singleton irrigation_demo_binding
do suite cũ từng TRUNCATE CASCADE. Thêm INSERT ON CONFLICT DO NOTHING trong
setup của test mới; lượt toàn bộ cuối đạt315ca. Không sửa invariant ứng dụng
để che dữ liệu fixture không hợp lệ, không reset DB demo.

Giới hạn: mã dự kiến chưa giữ chỗ trong registry hoặc provision AWS; phát
hiện xung đột hiện tại và về sau bằng health. Chỉ IRRIGATION01/VALVE01 có
adapter status hiện hữu, không mượn phản hồi đó cho van dự kiến khác. Không
flow proof/volume theo nhánh, dispatch queue, multi-pump, SOIL rule hoặc NVS.
Windows/AWS/Wokwi các ca mới vẫn Chưa chạy. Không claim coordinator A3 xong.
