# Nhiều relay và tưới lần lượt theo zone (V19, hợp đồng v3)

Gói 3a của phân hệ IoT. ENV01 điều khiển thêm 4 van zone, quạt, đèn và phun sương. PUMP01 giữ
nguyên hợp đồng v1 và mọi cơ chế an toàn cũ; các actuator mới là tùy chọn ở cả firmware
(`FARM_ACTUATORS_ENABLED`) lẫn backend (`SMARTFARM_ACTUATORS_ENABLED`), mặc định tắt.

## Firmware (`firmware/esp32`)

| Phần | Nội dung |
|---|---|
| `ActuatorBank.h` | C++ thuần, test native được. Mỗi kênh có một `RelaySafety` riêng (dedup 32 lệnh, thời hạn lệnh, giới hạn thời gian, khóa). Thêm khóa liên động giữa các kênh. |
| Bơm – van | Bơm bật khi không có van mở → `NO_VALVE_OPEN`. Van cuối cùng đóng (lệnh, hết giờ, mất mạng, lỗi) → bơm tắt ngay, lý do `VALVE_CLOSED`, không khóa. Ở mức chân GPIO, bơm chỉ có điện khi có van đang có điện, kể cả khi bộ hẹn giờ của van ngắt giữa vòng lặp. |
| Một zone một lúc | `FARM_MAX_OPEN_VALVES=1` → `VALVE_LIMIT`. |
| Giữ nguyên | Boot OFF (chốt mức trước `pinMode`, nay áp cho mọi chân), giới hạn cứng (PUMP01 3600 s; van 3600; quạt/đèn 14400; phun sương 600), `esp_timer` ngắt độc lập cho từng kênh, mất mạng → tắt hết + khóa, khóa cạn nước (bơm và phun sương), reset chỉ khi OFF và có nước. |
| Wokwi | Sơ đồ chính có thêm LED tải cho GPIO 25/33/32/13/18/19/21. Project tự kiểm riêng `test/wokwi` (env `wokwi_selftest`, `config.selftest.h`, không mạng, không bí mật) chạy kịch bản lệnh cố định; `scenario.yaml` kiểm mức chân sau từng bước và điều khiển phao bằng nút nhấn. |

## Hợp đồng và IAM

`contracts/iot/v3` (command/ack/status). PUMP01 status v1 thêm lý do `VALVE_CLOSED`. IAM theo
kiểu cộng thêm: `tools/aws/provision_actuators.py` tạo policy thiết bị thứ hai
`SmartFarmMvpENV01Actuators` gắn vào cùng chứng chỉ ENV01, cùng file IAM backend riêng; policy cũ
không bị sửa (script cũ vẫn từ chối thay đổi nó).

## Backend

| Phần | Nội dung |
|---|---|
| V19 | Binding v3 (`ACTUATOR_V3`, `max_seconds`, `zone_name`), `actuator_status`, `actuator_command`, `irrigation_sequence` (+ step), chỉ một lượt `RUNNING`. |
| `ActuatorService` | Cùng kỷ luật lệnh như PUMP01: PENDING → SENT → EXECUTED/FAILED/TIMED_OUT; cần trạng thái OFF mới (≤15 s) trước ON/RESET; ON bị chặn khi khóa hoặc còn lệnh chờ; ACK phải khớp hành động. |
| `IrrigationSequence` | Mỗi zone: mở van (thời gian bơm + 60 s) → chờ ACK + status ON → bơm ON đúng thời gian → chờ status OFF do bơm tự ngắt → đóng van → chờ ACK + status OFF → zone kế. Từ chối/hết giờ (15 s)/khóa/cạn nước/van đóng sớm/bơm không tự tắt → dừng cả lượt, gửi OFF cho bơm và van. Không chạy khi quy tắc tưới theo độ ẩm đang bật. Bộ lập lịch 1 s, chỉ khi MQTT bật. |
| REST | `GET /api/v1/actuators`, `GET /api/v1/actuators/v3/commands`, `POST /api/v1/actuators/v3/{id}/commands`, `GET/POST /api/v1/automation/zone-sequence`, `POST .../cancel`. |
| MQTT | Publish lệnh và subscribe status/ACK theo từng actuator (không wildcard), chỉ khi `SMARTFARM_ACTUATORS_ENABLED=true` và `SMARTFARM_CONTROL_ENABLED=true`. Topic realtime mới `actuators`. |

## Giao diện

`/iot/control`: dưới PumpControl có danh sách actuator v3 (trạng thái do thiết bị báo, dữ liệu
cũ = "Chưa xác định", Tắt luôn có, Mở khóa chỉ khi đang khóa) và form tưới theo zone (chọn 1–4
zone, số phút bơm, tiến trình, dừng, lượt gần đây).

## Kiểm chứng

| Bước | Kết quả |
|---|---|
| Test native `actuator_bank_test.cpp` (ASan/UBSan, cả với macro Arduino) + `relay_safety_test.cpp` | đạt |
| `pio run` env `esp32dev` (mặc định, actuator tắt) và `wokwi_selftest` | xem CI |
| `./mvnw -B verify` (PostgreSQL 16) | 176 test, thêm `ActuatorSequenceTest` 7 (thiết bị giả lập trả ACK/status) |
| Unit frontend / Playwright | 55/55; 8 bộ, `test:actuators` 4/4 |
| pytest `tools/tests` | 44 (thêm hợp đồng v3, IAM, đối chiếu sơ đồ/kịch bản) |
| Wokwi `scenario.yaml` | cần secret `WOKWI_CLI_TOKEN` trong repo; job CI ghi `WOKWI_SKIPPED` nếu thiếu |

Chưa làm: thử trên phần cứng thật, AWS live, lưu lượng theo zone, OTA/cấu hình từ xa (gói 3b).
Phần cứng thật cần relay và khóa liên động điện riêng; LED Wokwi chỉ là tải mô phỏng.
