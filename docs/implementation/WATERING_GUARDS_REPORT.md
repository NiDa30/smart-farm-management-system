# Điều kiện bổ sung và mô phỏng quy tắc tưới (V18)

Gói 2 của việc hoàn thiện phân hệ IoT, phần dùng được ngay với phần cứng hiện có (ENV01 → PUMP01).
Không đổi hợp đồng MQTT, firmware hay cách quy tắc phát và theo dõi lệnh.

## Đã thêm

| Phần | Nội dung |
|---|---|
| V18 | Cột `guard_*` trên `watering_rule`, mặc định NULL (không kiểm tra). `guard_revision` riêng; `watering_run.guard_revision` ghi điều kiện mà lượt chạy đã qua. Kênh phao là khóa ngoại tới `iot_channel`. |
| Điều kiện trước khi bật | Khoảng nhiệt độ không khí, độ ẩm không khí tối đa (thay cảm biến mưa), phao `WATER_PRESENT` phải báo có nước trong 15 giây, số lượt tối đa mỗi ngày giờ Việt Nam. Kiểm tra ngay trước khi phát ON, sau khi đã đủ 2 mẫu khô và trong khung giờ. Bị chặn thì `last_result` ghi lý do và chuỗi mẫu khô bắt đầu lại. |
| Khi đang tưới | Có điều kiện phao mà phao không còn xác nhận có nước (mất dữ liệu cũng tính) thì quy tắc gửi OFF, giống khi dữ liệu đất cũ. Firmware vẫn giữ khóa cạn nước cục bộ của mình. |
| Sửa điều kiện | `PUT /api/v1/automation/watering/guards`: chỉ khi quy tắc tắt và không có lượt dở, so khớp `revision`; kênh phao phải là `WATER_PRESENT` đã khai báo. |
| Mô phỏng | `POST /api/v1/automation/watering/simulation {hours}` (1–168): chạy lại dữ liệu ENV01 đã lưu qua cài đặt, lịch và điều kiện đang lưu. Trả số lượt bật, tổng giây bơm chạy, lượt tắt sớm/hết giờ, số lần bị chặn theo lý do, số lượt theo ngày, tối đa 200 sự kiện. Không gửi lệnh. |
| Giao diện | Trang Quy tắc tưới: form "Điều kiện bổ sung" (bản nháp chặn nút Bật như cài đặt và lịch) và bảng "Mô phỏng trên dữ liệu đã lưu". Danh sách lượt chạy hiện phiên bản điều kiện. |

Lõi quyết định (`RuleGuards`, `RuleSimulator`) là Java thuần, không phụ thuộc Spring,
nên quy tắc thật và mô phỏng dùng chung một logic chặn.

Mô phỏng không tính độ trễ thiết bị/ACK, dữ liệu cũ, thao tác thủ công, khóa an toàn,
và không mô phỏng điều kiện phao (giả định có nước, giao diện ghi rõ).

## Chưa làm trong gói này

Van, quạt, đèn, phun sương và tưới lần lượt từng zone cần firmware điều khiển nhiều relay,
hợp đồng lệnh mới (hiện `deviceId` ghim `PUMP01`) và IAM policy mới. Môi trường làm việc không
biên dịch được firmware ESP32, và firmware relay viết sai là rủi ro an toàn, nên phần này để
thành gói riêng có thử trên Wokwi.

## Trạng thái kiểm chứng

- `RuleGuards` + `RuleSimulator` **được biên dịch và chạy thật**: 32 phép kiểm tra đạt (bản JUnit
  tương ứng: `RuleSimulatorTest`, không cần DB).
- V18 và các câu SQL mới (đọc phao trong 15 giây, đếm lượt theo ngày Việt Nam, lưu có so khớp
  revision, ghi `guard_revision`) chạy đúng trên PostgreSQL 16, kể cả các ràng buộc từ chối.
- Cú pháp Java toàn bộ `backend/src`; 4 unit test frontend mới (`guardsApi`), TS `--strict`.
- Fixture Playwright `automation` được bổ sung route `/guards` và `/nodes` để test cũ không coi là
  request lạ.

Chưa chạy: `./mvnw -B verify` (gồm `WateringGuardsTest` cần `SMARTFARM_TEST_DB_URL`),
`npm run lint`, `npm run build`, `npm run test:automation`; chưa thử trên AWS/Wokwi.
