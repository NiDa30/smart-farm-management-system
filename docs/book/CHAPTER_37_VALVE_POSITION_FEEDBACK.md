# Chương 37 — Phản hồi vị trí van bằng hai công tắc độc lập

15/10/2026, giờ Việt Nam. Sau [quyền sử dụng bơm V24](CHAPTER_36_PUMP_OWNERSHIP.md),
điều kiện còn thiếu trước khi nối van–bơm là bằng chứng van đạt vị trí. V25
thêm công tắc hành trình mô phỏng cho controller IRRIGATION01/VALVE01 riêng.
Không nối PUMP01, không dispatch queue và chưa có điều phối van–bơm.

## GPIO, vị trí và nước là ba thông tin khác nhau

GPIO26 bật chỉ là đầu ra điều khiển LED. ACK EXECUTED xác nhận firmware đã
áp dụng đầu ra. Hai công tắc GPIO32/33 cung cấp tín hiệu vị trí riêng, không
được code tự đổi theo GPIO26. Cũng chưa có cảm biến dòng nước xác nhận nước
đã đến vùng. Mọi packet của prototype vẫn có `dataSource=SIMULATOR`.

Không tự gán feedback OPEN khi gửi OPEN, hoặc CLOSED khi gửi CLOSE. Trường
hợp GPIO CLOSED nhưng công tắc OPEN vẫn là tình huống cần phát hiện. Vì chưa
có van cơ khí, không gọi các tín hiệu Wokwi này là nghiệm thu phần cứng thật.

## Sơ đồ Wokwi mới

Mở **firmware/irrigation-node/diagram.json**, không phải project ENV01/PUMP01.
LED xanh vẫn dùng GPIO26. Có thêm hai slide switch:

| Switch | Đầu giữa | Đầu nối GND | Ý nghĩa khi đầu giữa nối GND |
| --- | --- | --- | --- |
| closedStop | GPIO32 | Chân1 | Đã chạm vị trí đóng |
| openStop | GPIO33 | Chân3 | Đã chạm vị trí mở |

GPIO dùng INPUT_PULLUP, tác động mức LOW. Gạt sang đầu còn lại là không tác
động. Chỉ closedStop tác động → CLOSED; chỉ openStop → OPEN; cả hai không
tác động → UNKNOWN; cả hai tác động → CONFLICT. Kiểm tra trạng thái trên web
để xác định hướng gạt, không chỉ nhìn LED.

Firmware public mặc định `IRRIGATION_POSITION_FEEDBACK_ENABLED=0`, giữ gói
legacy `feedbackState=UNKNOWN`. Để thử tính năng mới, trong private config
của **controller van** đặt flag này1, giữ SIMULATOR1 và DEMO_ENABLED1 theo
[hướng dẫn van cũ](CHAPTER_32_IRRIGATION_VALVE_DEMO.md). Build lại app, filesystem,
merge flash và restart simulator theo runbook; chỉ reload web không thay firmware.
Config cũ không khai báo flag mới vẫn chạy chế độ cũ nhờ giá trị dự phòng0.

Backend có `SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED=true` để yêu cầu
phản hồi trước OPEN. Mặc định false giữ demo LED cũ. Dù chưa bắt buộc, nếu
thiết bị đã báo capability phản hồi thì backend vẫn kiểm tra công tắc CLOSED
và không lỗi trước OPEN/rebind. Cập nhật backend trước khi bật firmware mới:
backend cũ có parser strict sẽ từ chối trường mở rộng. Không đổi IAM, topic,
client, Thing hoặc certificate cho V25.

## Kiểm tra lỗi cục bộ

`ValveFeedback` chạy trong đường safety 25ms, độc lập với vòng publish và
không cần backend để đưa GPIO LOW khi lỗi. Tín hiệu phải ổn định100ms; trong
khi debounce, vị trí được báo UNKNOWN và không cho OPEN.

OPEN mới chỉ được nhận khi CLOSED ổn định và chưa có fault. Một lần bị từ
chối vẫn tiêu thụ ordinal mới, không được tự chạy sau khi công tắc đổi.
Sau khi ý định đầu ra đổi, guard cho tối đa3giây đạt công tắc tương ứng.
Không đạt mở → OPEN_TIMEOUT; không đạt đóng → CLOSE_TIMEOUT. Khi đã đạt vị
trí rồi mất tín hiệu ổn định → POSITION_LOST; cả hai công tắc → SWITCH_CONFLICT.
Rung liên tục cũng có hạn3giây, không reset bộ đếm theo từng lần rung.
Tất cả thời gian dùng millis với phép trừ uint32 chống wrap.

Fault đưa model về CLOSED và `reason=POSITION_FAULT`; nó không chứng minh
công tắc đã CLOSED. Fault giữ nguyên kể cả khi đầu vào tự trở về bình thường.
Chỉ lệnh **CLOSE mới** được chấp nhận lúc công tắc CLOSED ổn định mới xóa lỗi.
CLOSE luôn có đường de-energize, kể cả khi vị trí chưa biết hoặc đang fault.
ACK CLOSE khi fault chưa xóa vẫn chỉ xác nhận GPIO; tiếp tục báo lỗi vị trí.

Timer mở1–30giây, boot target, ordinal và đóng khi mất kết nối của V20 giữ
nguyên. Reboot không tự mở lại; guard khởi tạo lại và đánh giá đầu vào thực
tế của simulator. Chưa NVS, chưa điều khiển van công nghiệp hoặc bơm.

## Packet và lưu trữ

Khi bật feedback, status/ACK có phần mở rộng:

```json
{
  "feedbackState": "CLOSED",
  "positionFeedback": {
    "version": 1,
    "enabled": true,
    "state": "CLOSED",
    "fault": null
  }
}
```

`state` phải khớp `feedbackState`, chỉ nhận UNKNOWN/OPEN/CLOSED/CONFLICT.
CONFLICT phải kèm SWITCH_CONFLICT. Fault bắt buộc GPIO CLOSED và lý do
POSITION_FAULT. Không có extension thì feedback chỉ được UNKNOWN. Không
nhận nhãn PHYSICAL hoặc tự suy ra cảm biến vị trí từ legacy GPIO.

Migration V25 thêm feedback_enabled/state/fault vào irrigation_demo_status.
Status cũ giữ dữ liệu, được đánh dấu chưa xác minh: false/UNKNOWN/null.
Snapshot API thêm `feedbackRequired`; latest thêm `positionFeedback`, null
cho legacy. API không diễn dịch ACK thành status hoặc tự nhận vị trí đã đổi.

Trong cùng boot, status mới không được bỏ capability đã báo. Fault không
được biến mất chỉ nhờ packet healthy sequence cao hơn: phải có ordinal CLOSE
mới đã lưu. Sequence/ordinal không được lùi và vẫn kiểm tra source/receipt
freshness15giây cùng nguồn SIMULATOR. Boot mới có thể khác capability, nhưng
policy required tiếp tục chặn OPEN nếu không còn feedback.

## Xem trên web

Vào **Điều khiển Actuator → Mở controller van mô phỏng**. Panel **Phản hồi
vị trí van** hiển thị policy backend, công tắc đang tác động và fault gần
nhất. GPIO được trình bày riêng. UNKNOWN/OPEN/CONFLICT/fault không cấp quyền
OPEN khi feedback đã bật; CLOSE vẫn theo cờ demo/kết nối hiện có.

Mẫu hết độ mới chuyển thành “Chưa có dữ liệu mới”, không giữ màu CLOSED như
trạng thái hiện tại. Metadata mâu thuẫn với `readyToOpen` bị parser web từ chối.
Web không tự xóa fault hoặc tự gửi OPEN khi mở trang/reconnect. Fault hiện
ở trang van; chưa tạo episode trong Trung tâm Cảnh báo/Event Log chung.

## Bằng chứng và lỗi gặp trong cloud

**300 backend**, không skip, gồm14ca mới; **13 browser** (5mới), **4 unit parser**
(2mới), lint/build đạt. Native guard/model/parser/generator đạt với warning
được coi là lỗi. Firmware public default và opt-in đều build; empty-FS và merge
flash4MiB đạt. Không copy private config/PEM; image thử chỉ có `.gitkeep` trong
filesystem. Cảnh báo “contains private key” của helper merge là thông báo
chung, không có nghĩa image empty-FS thử này chứa khóa.

Full-app dùng schema riêng valve_position_smoke trên DB test55439. Packet
CLOSED do encoder native tạo đi qua Java receive/PostgreSQL; timestamp chỉ
được cập nhật một lần cho kiểm tra ban đầu. Runtime MQTT/control/valve-demo
false, policy feedback requiredtrue, không có transport thực. Web đọc CLOSED
mới rồi, sau restart process thật và mẫu cũ tự hết hạn, hiển thị không có
dữ liệu mới. Boot/sequence/timestamps/binding/feedback giữ nguyên, command0.

Lượt full đầu lỗi FK khi fixture van còn giữ zone tham chiếu SOIL, làm test
SOIL sau không dọn được. Sửa cleanup sau mỗi test cho đúng ID của cả fixture
van cũ và mới; không reset DB hay xóa dữ liệu demo để làm test qua. Lượt full
cuối300/300. Merge flash lúc đầu tìm sai core-dir mặc định; truyền đúng
`--core-dir /workspace/.platformio` của cloud thì đạt.

Native còn bổ sung ca rung sau khi đã đạt OPEN: bộ đếm mất vị trí phải tính
từ lần mất đầu tiên, không dùng timestamp debounce luôn bị reset. Khi kiểm
tra ca này, lần mất đầu tiên ở450ms nên phải quan sát đủ đến3450ms; giữ nguyên
hạn3giây, không nới hạn để làm assertion qua.

Xem [bàn giao V25](../implementation/LOCAL_VALVE_POSITION_REPORT.md) cho file/log.

## Sáu ca Windows/Wokwi chưa chạy

| Ca | Thao tác/kỳ vọng | Thực tế |
| --- | --- | --- |
| Closed ban đầu | Chỉ closedStop tác động; đợi100ms, thấy CLOSED riêng với GPIO | Chưa chạy |
| Đi đến mở | OPEN5–10s; nhả closedStop rồi tác động openStop trong3s, không để cả hai cùng tác động | Chưa chạy |
| Kẹt mở/đóng | Không đưa tới công tắc đích trong3s; thấy timeout và GPIO LOW | Chưa chạy |
| Mâu thuẫn | Tác động cả hai công tắc; CONFLICT/SWITCH_CONFLICT, không nhận OPEN | Chưa chạy |
| Xóa lỗi | Đưa closedStop tác động một mình, chờ ổn định; fault chưa tự mất; CLOSE mới để xác nhận | Chưa chạy |
| Mất mạng/restart | Không tự mở; mẫu cũ không thành CLOSED mới; policy required chặn legacy | Chưa chạy |

Không bật PUMP01 cùng các ca này. Bước tiếp theo vẫn là thiết kế coordinator
với feedback/interlock xuyên van–bơm và gắn queue vào owner; V25 chưa thực
hiện chuỗi dispatch đó hoặc tưới từ vùng SOIL.
