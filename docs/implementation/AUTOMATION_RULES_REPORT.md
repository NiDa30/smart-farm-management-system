# Báo cáo: bộ quy tắc tự động hóa tổng quát

Nhánh `feat/iot-rule-builder` (nền: `feat/iot-live-views`).

## Mục tiêu
Cho người dùng tự dựng quy tắc dạng "**Khi** (nhiều điều kiện AND/OR) **thì** (một chuỗi hành động)". Quy tắc dùng chung toàn bộ kỷ luật lệnh và an toàn hiện có; quy tắc tưới theo độ ẩm có sẵn vẫn giữ nguyên.

## Định nghĩa quy tắc (`RuleDefinition`, kiểm tra chặt ở backend, frontend kiểm tra lại cùng giới hạn)
- **Điều kiện:** gồm nhóm `ALL`/`ANY`, lồng tối đa một cấp, tổng cộng 1–8 điều kiện lá.
  - `SENSOR`: so sánh `>`, `≥`, `<`, `≤` trên kênh số. Kênh `WATER_PRESENT` chỉ cho phép `=` có nước hoặc cạn. Có thể yêu cầu điều kiện giữ liên tục `forSeconds` từ 0 đến 3600 giây.
  - `TIME`: khung giờ HH:MM theo ngày trong tuần, được phép vắt qua nửa đêm.
  - `ACTUATOR_STATE`: thiết bị đang ON hoặc OFF.
- **Hành động:** 1–4 hành động, thực hiện theo thứ tự.
  - `ACTUATOR`: bật một thiết bị v3, thời gian không vượt giới hạn của thiết bị, hoặc tắt thiết bị.
  - `ZONE_SEQUENCE`: chỉ được đặt cuối cùng, gồm 1–4 zone, mỗi zone bơm 1–1800 giây. Đây là **cách duy nhất** để quy tắc chạy bơm PUMP01, nên bơm luôn có van mở.
- **Giới hạn:**
  - thời gian nghỉ 60–86400 giây, và không ngắn hơn hành động dài nhất;
  - tối đa 1–48 lần chạy mỗi ngày;
  - tạm dừng 0–7200 giây sau khi có người điều khiển tay.

## Đánh giá (`RuleEvaluator`, `RuleEngineScheduler`)
- Logic ba giá trị: Đúng, Sai, hoặc Chưa đủ dữ liệu (dữ liệu thiếu hoặc cũ hơn 30 giây). Quy tắc **chỉ** chạy khi kết quả chắc chắn là Đúng.
- Trạng thái actuator phải được thiết bị báo cáo trong vòng 15 giây gần nhất.
- Bộ máy đánh giá mỗi 5 giây và chỉ chạy khi điều khiển MQTT được bật.
- Quy tắc bị bỏ qua, có ghi lý do, trong các trường hợp:
  - `COOLDOWN`: đang trong thời gian nghỉ;
  - `MAX_RUNS_TODAY`: đã đủ số lần hôm nay;
  - `ZONE_SEQUENCE_RUNNING`: đang có chuỗi tưới theo zone;
  - `MANUAL_HOLD`: vừa có điều khiển tay.
- Lệnh do quy tắc gửi có `source = 'RULE'` và đi qua đúng `ActuatorService` / `IrrigationSequence` như lệnh tay: PENDING → SENT → EXECUTED/FAILED/TIMED_OUT, yêu cầu trạng thái OFF mới, firmware vẫn là bên quyết định an toàn.
- Nếu một hành động bị từ chối, các hành động sau không chạy. Lượt chạy được ghi `PARTIAL` hoặc `FAILED`, và thời gian nghỉ vẫn tính, để không gửi lệnh liên tục.
- **Xung đột:** hai quy tắc đang bật không được điều khiển cùng một thiết bị. Quy tắc dùng PUMP01 cũng không được bật khi quy tắc tưới có sẵn đang bật. Lỗi 409 trả về lý do, giao diện hiển thị nguyên văn lý do này.
- Quy tắc mới luôn được tạo ở trạng thái **tắt**. Mỗi lần sửa thì `revision` tăng lên, và lịch sử chạy ghi lại revision đã dùng.

## Mô phỏng
`POST /api/v1/automation/rules/simulation` chạy lại định nghĩa trên dữ liệu đã lưu trong 1–72 giờ qua, bước 60 giây, ghi tối đa 200 lần chạy. Kết quả gồm số phút Đúng, Sai và Chưa đủ dữ liệu, cùng các thời điểm quy tắc sẽ chạy. Mô phỏng **không gửi lệnh**.

## API (`/api/v1/automation/rules`)
`GET`, `POST`, `GET /{id}`, `PUT /{id}`, `PUT /{id}/enabled`, `DELETE /{id}`, `GET /runs?ruleId=`, `POST /simulation`.

Lỗi trả về dạng `{status, message}`.

## Giao diện (`/iot/rules`)
- Danh sách quy tắc, gồm cả quy tắc tưới có sẵn. Mỗi quy tắc có công tắc bật/tắt, kết quả lần đánh giá gần nhất kèm lý do không chạy, và số lần đã chạy hôm nay so với giới hạn.
- Bộ dựng quy tắc: nhóm AND/OR, ba loại điều kiện, các hành động theo thứ tự, các giới hạn. Nút Lưu bị khóa khi định nghĩa không hợp lệ và hiển thị lỗi đầu tiên.
- Mô phỏng 6, 24 hoặc 72 giờ, và lịch sử chạy.

## Kiểm chứng
- Backend: `RuleLogicTest` (phân tích và đánh giá thuần) và `AutomationRulesTest` (trên DB: chạy, bỏ qua, xung đột, mô phỏng). CI đạt toàn bộ 195 test.
- Frontend: `ruleApi.test.ts` đạt 3/3. `npm run test:rules` (Playwright) đạt 4/4, kiểm tra danh sách, bộ dựng → mô phỏng → lưu, lý do xung đột, và kênh mực nước. Lint và build sạch.

## Giới hạn
- Trạng thái thời gian nghỉ và tạm dừng nằm trong DB. Nếu backend khởi động lại, việc đánh giá tiếp tục đúng, nhưng một điều kiện có `forSeconds` sẽ được tính lại từ dữ liệu đã lưu.
- Chưa thử với phần cứng thật: quy tắc chỉ gửi lệnh qua MQTT như điều khiển tay đã được kiểm chứng trên Wokwi.
