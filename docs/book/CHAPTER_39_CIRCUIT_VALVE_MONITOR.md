# Chương 39 — Nhận phản hồi riêng cho từng van giám sát

15/10/2026 (Asia/Ho_Chi_Minh), migration V27, sau cấu hình nhánh V26.

## Từ mã dự kiến đến dữ liệu của đúng van

V26 có cấu hình nhiều nhánh nhưng chỉ IRRIGATION01/VALVE01 có đường phản hồi
demo. V27 thêm chế độ giám sát cho controller/van02–99. Packet của VALVE02
được lưu và hiển thị trên nhánh VALVE02; VALVE03 không dùng lại trạng thái đó.

Đường đi trên web giữ nguyên: **IoT & Tự động hóa → Điều khiển Actuator →
Cấu hình nhánh tưới**. Thẻ nhánh hiển thị trạng thái vị trí, nguồn mô phỏng,
thời gian báo và lỗi lưu gần nhất. GPIO tắt được trình bày riêng với phản hồi
công tắc; công tắc CLOSED không chứng minh nước đã tới vùng.

Firmware giám sát hiện là **một board / một van**, mỗi board chạy đồng thời
phải có controller ID khác nhau để không đá kết nối MQTT của nhau. Ví dụ:

| Board | Van | Nhánh | Vùng |
| --- | --- | --- | --- |
| IRRIGATION02 | VALVE02 | CIRCUIT01 | ZONE01 |
| IRRIGATION03 | VALVE03 | CIRCUIT02 | ZONE02 |

Registry V26 vẫn cho phép một controller dự kiến có nhiều van; firmware V27
chưa thực hiện nhiều đầu ra trên cùng board. Chế độ giám sát không subscribe
command, không publish ACK, GPIO26 giữ LOW và không bật PUMP01. Demo điều
khiển IRRIGATION01/VALVE01 giữ đường cũ; không đổi hợp đồng command của nó.

## Khai báo và firmware

Tạo SOIL/WATER/zone theo các chương trước, rồi tạo nhánh với đúng controller,
van, source SIMULATOR và phiên bản vùng. Trong private config của project
`firmware/irrigation-node`, đặt thông số theo nhánh đang có, ví dụ:

```cpp
#define IRRIGATION_MONITOR_ONLY 1
#define IRRIGATION_CONTROLLER_ID "IRRIGATION02"
#define IRRIGATION_VALVE_ID "VALVE02"
#define IRRIGATION_CIRCUIT_ID "CIRCUIT01"
#define IRRIGATION_CIRCUIT_REVISION 1
#define IRRIGATION_ZONE_ID "ZONE01"
#define IRRIGATION_ZONE_REVISION 1
#define IRRIGATION_DEMO_ENABLED 0
#define IRRIGATION_SIMULATOR 1
#define IRRIGATION_POSITION_FEEDBACK_ENABLED 1
```

Đây chỉ là đoạn cấu hình bổ sung; vẫn cần endpoint/Wi-Fi và certificate riêng
đã thiết lập theo [chương32](CHAPTER_32_IRRIGATION_VALVE_DEMO.md). Không gửi
private config/PEM qua chat hoặc commit. Mã/phiên bản trong ví dụ không được
dùng thay cho các giá trị thực trên web. Controller/van01 dành cho demo cũ;
monitor mới chỉ nhận02–99. Config cũ thiếu macro mới giữ mặc định demo legacy.

Hai công tắc mô phỏng vẫn GPIO32=CLOSED, GPIO33=OPEN, activeLOW. Feedback
debounce100ms; guard yêu cầu vị trí CLOSED khi đầu ra tắt và có timeout3giây.
Không gắn chuyển động công tắc vào LED để giả lập đã xác minh. Nếu công tắc
mở/mâu thuẫn kéo dài, fault được giữ. Board giám sát không có CLOSE/reset
command; chỉ khởi động lại với đầu vào đã sửa mới bắt đầu boot mới, không tự
mở đầu ra. Không gọi đây là thiết bị điều khiển van vật lý.

Build app, filesystem riêng và merge flash bằng quy trình hiện hữu. Firmware
từ chối compile nếu đồng thời bật MONITOR_ONLY và DEMO_ENABLED. Mã không hợp
lệ không được bắt đầu MQTT. Thay controller/van cần certificate/policy khớp;
đổi phiên bản nhánh/vùng cần cập nhật config và reboot trước khi có status
mới được công nhận. Không có đồng bộ config tự động xuống board.

## Policy và subscribe

Helper chỉ render JSON, không gọi SDK, không provision hoặc gắn policy:

```bash
./.local/day1-venv/Scripts/python.exe tools/aws/render_irrigation_policies.py \
  --region ap-southeast-1 --account-id 110035681534 \
  --controller-id IRRIGATION02 --valve-id VALVE02 --monitor-only
```

Device policy chỉ cho Connect bằng client IRRIGATION02 và Publish vào
`smartfarm/FARM001/VALVE02/status`. Không wildcard, command, ACK, RetainPublish
hoặc quyền PUMP01. Dùng certificate riêng cho board; không lấy certificate
của ENV01 hoặc controller demo để nhân bản nhiều client.

Phần backendAdditionalIdentityPolicy chỉ bổ sung Subscribe/Receive đúng topic
status này cho danh tính backend. Nó không thay policy kết nối/telemetry cũ.
Đối với nhiều van, gộp các ARN status cần dùng vào policy có phạm vi cụ thể.
Nếu gặp giới hạn inline policy đã gặp trước đây, dùng customer managed policy
riêng thay vì mở AdministratorAccess. Thing/cert/policy mới vẫn cần được
người triển khai tạo/gắn; helper này chưa tự làm bước đó.

Thêm `SMARTFARM_IRRIGATION_MONITOR_ENABLED=true` vào lệnh khởi động backend
đang dùng. Mặc địnhfalse. Backend subscribe danh sách topic chính xác từ các
nhánh SIMULATOR hiện hợp lệ tại startup/reconnect; không subscribe wildcard
toàn bộ status. Thêm nhánh/van mới sau startup cần restart backend để đăng ký
topic mới. Cấu hình đã đổi vẫn được kiểm tra lại khi từng packet đến.

Backend có hàng đợi ghi giám sát riêng, giới hạn64 packet, tách khỏi ACK/status
PUMP01. Quá tải bị từ chối và ghi log, không tăng bộ nhớ vô hạn. Chưa có
benchmark tải nhiều controller hoặc retry storage bền vững.

## Hợp đồng nhận trạng thái

Vẫn dùng schemaVersion1 và phần positionFeedback đã có, thêm:

```json
{
  "controllerId": "IRRIGATION02",
  "actuatorId": "VALVE02",
  "monitorOnly": true,
  "circuitId": "CIRCUIT01",
  "circuitRevision": 1,
  "zoneId": "ZONE01",
  "zoneRevision": 1,
  "demoEnabled": false,
  "gpioState": "CLOSED",
  "lastOrdinal": 0,
  "dataSource": "SIMULATOR"
}
```

Đây là phần trích, không phải packet đầy đủ để publish thủ công: còn UUID
boot, sequence, timestamp, reason, feedbackState và extension vị trí. Backend
không nhận retained, quá4096byte, key lặp, trường lạ, sai topic/van/controller,
nguồn PHYSICAL, mode điều khiển hoặc phiên bản cấu hình không khớp. Chỉ nhận
mẫu dưới15giây và không quá2giây tương lai.

`circuit_valve_status` lưu latest theo mã van; `circuit_valve_boot` giữ các
boot đã nghỉ. Trong cùng boot, sequence phải tăng và observedAt không lùi;
packet trùng không làm mới receivedAt. Boot mới phải có timestamp mới hơn;
boot đã nghỉ không được quay lại dù mang sequence lớn hơn. Capability không
được biến mất, fault không được tự mất trong cùng boot. Đây là kiểm tra dữ
liệu nhận, không phải chứng thực phần cứng hoặc xác thực operator.

Sửa cấu hình làm quan sát cũ hiển thị CONFIG_CHANGED. Cập nhật phiên bản trong
packet nhưng giữ boot cũ cũng không được làm mới; cần boot mới. Tắt monitor
giữ dữ liệu nhưng ghi MONITOR_DISABLED. Mẫu cũ thành STALE trên backend và
web tự kiểm tra thời gian, không giữ nhãn CLOSED hiện tại sau khi mất cập nhật.
DEVICE_FAULT hiển thị lỗi ngay cả khi công tắc vẫn báo CLOSED. Dữ liệu không
có positionFeedback là UNVERIFIED; GPIO không thay cho phản hồi vị trí.

## Bằng chứng cloud và những lỗi đã gặp

333 test backend đạt, không skip:17ca receiver mới và1ca dùng callback broker
giả kiểm tra hàng đợi giám sát bị chặn không chặn pump status.18browser nhánh
(7mới),16queue browser,5policy tests, native monitor/legacy model/feedback và
encoder đạt. Firmware public default và monitor build đạt; cấu hình monitor
kèm control bị compile từ chối đúng lý do (expected failure). Empty filesystem
chỉ có .gitkeep, merge flash4MiB đạt. Không dùng private config/PEM để build.

Full-app dùng lại schema fixture `irrigation_circuit_smoke` trên PostgreSQL
test55439. V26→27 giữ nguyên từng trường của2nhánh và3lượt queue, kể cả bản
chụp. Encoder C++ tạo packet → receiver Java thật → PostgreSQL → React, không
mock API và không có transport AWS. Monitor true, MQTT/control/valve-demo false.
VALVE02 hiển thị CLOSED độc lập; VALVE03 chưa có dữ liệu. Restart JVM thật giữ
boot/sequence/timestamps/feedback; sau đó web ghi mẫu cũ. Commands/run đều0.

Phép thử fresh đầu tiên chạy quá hạn15giây trước khi mở web nên bị từ chối
đúng. Giữ ghi nhận sequence0 đã cũ; tạo đúng một heartbeat native mới với
sequence1 và timestamp do encoder sinh, chạy receive và browser liền mạch.
Không sửa timestamp sequence0 hoặc reset DB để qua kiểm tra. Sau khi fresh
đạt, không tạo heartbeat mới; phép thử stored sau restart so sánh nguyên vẹn
metadata sequence1. Helper từ chối phát lại bước seed/heartbeat này.

Một policy test đầu dùng phép tìm chuỗi `ack` nên nhầm vào từ `backend`.
Sửa assertion kiểm tra đuôi topic `/ack`, vẫn kiểm tra cụ thể actions/resources.
Khi rà soát còn bổ sung DEVICE_FAULT ưu tiên hiển thị lỗi và tách worker để
monitor không làm nghẽn ACK/status bơm. Các số đếm trên là lượt cuối, không
cộng các lượt chạy lại. Script lưu bằng chứng V26 giờ so sánh cấu hình nhánh,
không so toàn bộ view chứa dữ liệu quan sát thay đổi theo thời gian. Khi xem
screenshot mẫu cũ, nhãn GPIO cũng đổi thành “GPIO trong mẫu: Tắt”, tránh
khẳng định đầu ra hiện tại từ một packet đã hết độ mới.

## Năm ca Windows/AWS/Wokwi còn chờ

| Ca | Kỳ vọng | Thực tế |
| --- | --- | --- |
| Board02 theo nhánh | Status đúng ID, GPIO LOW, phản hồi CLOSED riêng | Chưa chạy |
| Board03 riêng client | Hai nhánh nhận đúng status, không mượn dữ liệu | Chưa chạy |
| Ngắt gateway | Sau15giây mẫu cũ, reconnect không mở GPIO | Chưa chạy |
| Sửa phiên bản nhánh | CONFIG_CHANGED; firmware mới/boot mới mới được nhận | Chưa chạy |
| Công tắc lỗi/reboot | Fault giữ, sửa đầu vào và boot mới, không tự mở | Chưa chạy |

Chưa nghiệm thu MQTT/AWS/Wokwi/GPIO live mới, van cơ khí hoặc flow proof.
Chưa có HTTP command cho van mới, multi-output board, global incident vị trí,
coordinator van–bơm, dispatch queue hoặc rule từ SOIL. Hàng chờ vẫn PREVIEW_ONLY;
đây chưa phải hoàn tất A3. Xem [bàn giao V27](../implementation/LOCAL_CIRCUIT_VALVE_MONITOR_REPORT.md).
