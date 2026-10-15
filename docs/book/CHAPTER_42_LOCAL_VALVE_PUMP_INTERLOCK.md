# Chương 42 — Liên động phản hồi van tại board bơm

15/10/2026 (Asia/Ho_Chi_Minh), migration V30, prototype Wokwi opt-in.

## Mở van trước, bật bơm sau

Các chương trước phân biệt GPIO, ACK và vị trí van. V30 thêm một điều kiện
ngay tại ENV01/PUMP01: hai tiếp điểm độc lập xác nhận van mở trước khi đầu
ra bơm được bật. Mất phản hồi trong lúc chạy cắt GPIO và giữ khóa, không đợi
backend hoặc MQTT ra quyết định. Mục tiêu là thử một đường van bằng công tắc
mô phỏng; chưa điều khiển van02–99 hoặc điều phối hàng chờ nhiều vùng.

Đây là **tiếp điểm tại board bơm**, không lấy từ bản tin của IRRIGATION01,
không dùng GPIO bơm làm tín hiệu tự xác nhận. Metadata chưa mang valveId/
circuitId, nên chưa chứng minh phản hồi thuộc đúng nhánh mà coordinator chọn.
Cần giải quyết ánh xạ và liên động xuyên controller trước dispatch nhiều vùng.

## Sơ đồ và cách bật

Project `firmware/esp32/diagram.json` thêm hai slide-switch:

| Công tắc | Dây common số2 | Terminal1 | Ý nghĩa active LOW |
| --- | --- | --- | --- |
| pump_valve_closed | GPIO32 | GND | Tiếp điểm CLOSED đang đóng |
| pump_valve_open | GPIO33 | GND | Tiếp điểm OPEN đang đóng |

Hai tín hiệu độc lập với relay/LED GPIO26. Công tắc có nhãn riêng trên sơ đồ;
không nối ngược trạng thái LED vào chúng. Phao GPIO27 và clock flow GPIO25
giữ wiring cũ. Không đưa5V vào GPIO. Chỉ dùng tải LED mô phỏng của project.

Mặc định mới và private config cũ thiếu macro đều **tắt** tính năng. Thêm
vào private config trên máy của bạn sau khi cập nhật code:

```cpp
#define FARM_VALVE_PROOF_ENABLED 1
#define FARM_VALVE_PROOF_SIMULATOR 1
#define FARM_WATER_INTERLOCK_ENABLED 1
```

Giữ FARM_CONTROL_ENABLED=1 của demo ENV01 đang dùng. Macro không được định
nghĩa hai lần trong cùng config. Đây không phải config đầy đủ; endpoint,
Wi-Fi/certificate vẫn giữ riêng theo hướng dẫn cũ. Không gửi config/PEM vào
chat hoặc commit. Compile từ chối nguồn PHYSICAL, thiếu phao hoặc pin32/33
đụng relay/DHT/soil/phao/flow. Không có flag backend bật thay guard firmware.

Ở Git Bash tại gốc repo, dùng Python venv hiện có:

```bash
git pull --ff-only origin feat/day1-iot-foundation
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 --target buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py --project-dir firmware/esp32
```

Đây là quy trình Windows để người dùng chạy, chưa được thực hiện trong lượt
cloud này. Dừng nếu một lệnh lỗi; không chạy tiếp bằng firmware/FS cũ. Restart
simulator sau khi merge; flash chứa khóa phải giữ local. Không dùng flash
public kiểm tra cloud vì không có endpoint/chứng chỉ. Backend restart để áp
V30, không xóa volume. Nếu bật boot/ordinal fencing, giữ hai phía firmware/
SMARTFARM_PUMP_FENCING_ENABLED khớp như [chương34](CHAPTER_34_PUMP_COMMAND_FENCING.md).
V30 dùng cùng client/certificate/topic PUMP01, không cần quyền IAM mới.

## Điều kiện ở edge

OPEN active, CLOSED không active và giữ100ms mới sẵn sàng. Cả hai hở là
UNKNOWN; cả hai đóng là CONFLICT. Khởi động luôn GPIO OFF, không tự bật khi
OPEN xuất hiện. ON không đủ proof bị từ chối và khóa; RESET cũng cần OPEN
ổn định, phao đủ nước và các điều kiện khóa hiện hữu cho phép.

Khi đang chạy, mất tiếp điểm OPEN hoặc xuất hiện CLOSED cắt ngay ở lần kiểm
tra timer, không đợi debounce phục hồi. Timer ESP riêng kiểm tra mỗi25ms,
không cấp phát, gọi mạng hoặc Serial trong callback. Khoảng sample vượt250ms
khi đang theo dõi cũng giữ lỗi mất proof khi callback chạy lại. Đây là chu kỳ
phần mềm đã kiểm tra logic, chưa phải cam kết độ trễ GPIO trên phần cứng thật.
Vòng loop chỉ tiếp nhận lỗi, cập nhật RelaySafety/cache, dừng timer/flow và
publish trạng thái sau khi callback đã cắt đầu ra.
Trước cấp điện còn kiểm tra phiên giám sát chưa bị hủy trong lúc arm ON;
tiếp điểm OPEN đơn thuần không được bật một đầu ra đã mất watcher. Ca native
thứ13 kiểm tra riêng tình huống này.

| Mã lỗi | Ý nghĩa |
| --- | --- |
| VALVE_NOT_OPEN | Thử ON/reset khi chưa có OPEN ổn định |
| VALVE_PROOF_LOST | Mất proof đang chạy hoặc gián đoạn sampler |
| VALVE_SWITCH_CONFLICT | Hai công tắc cùng active khi thử chạy/đang chạy |

Lỗi đầu tiên giữ tới reset thành công. Khôi phục công tắc không tự xóa latch
hoặc ON; OFF và cutoff vẫn dừng đầu ra. ON trùng không gia hạn hoặc khôi phục
sau lỗi. Phao cạn được ưu tiên báo WATER_LOW; flow guard vẫn có grace/khóa
riêng. Reset phải qua tất cả guard. Các kiểm tra clock/duration/boot/ordinal
cũ vẫn chạy trước cấp điện, không được proof OPEN bỏ qua.

Latch hiện ở RAM, **chưa NVS**. Reboot trở về OFF, đọc lại công tắc; không
bảo toàn lỗi RAM. Profile boot/ordinal hiện hữu bảo vệ lệnh cũ theo boot khi
được bật đúng hai phía. V30 không bổ sung bảo đảm replay qua reboot cho legacy.

## Bằng chứng trên backend và web

Status thêm phần tùy chọn, ACK giữ hợp đồng cũ:

```json
{"valveInterlock":{"version":1,"enabled":true,"dataSource":"SIMULATOR","state":"OPEN","fault":null}}
```

Khi feature tắt, firmware không thêm phần này. V30 chỉ thêm JSONB nullable vào
pump_status; không suy enablement từ config backend, không backfill. Backend
kiểm tra trường/kiểu/source, ON phải OPEN không fault/khóa, fault phải OFF và
khóa. Cùng boot không cho capability biến mất; lỗi chỉ hết bằng status báo
LOCKOUT_RESET với OPEN không lỗi/khóa. Boot mới không báo capability thì trở
về chưa có bằng chứng, không mượn capability của boot cũ. Đây là xác nhận
tính nhất quán bản báo, không phải chứng thực phiên bản phần cứng.

Mở **IoT & Tự động hóa → An toàn Fail-Safe & Edge**, xem thẻ **Phản hồi van
cục bộ tại PUMP01**. Chỉ mẫu mới cả giờ nguồn/nhận trong15giây, API đọc được,
mới trình bày proof hiện tại. Cũ/mất API ghi chưa xác định và giữ bản lưu.
OPEN kèm fault vẫn là đã khóa. Giờ hiển thị theo trình duyệt; ISO UTC gốc
có trong API để đối chiếu. Điều khiển Actuator và chi tiết Event Log dịch ba
mã lỗi mới. Trang Safety chỉ GET; bản báo OPEN không tự gửi lệnh hoặc cấp quyền
cho coordinator. Backend có thể gửi yêu cầu ON và nhận từ chối ở edge; V30
không biến metadata hiển thị thành một quy tắc điều khiển cloud mới.

## Kiểm chứng cloud và lỗi đã gặp

384backend, không skip, gồm15ca mới;17Safety browser,15Pump browser,
11Event Log browser,9unit frontend,8contract Python đạt. Native có13ca guard,
encoder và hồi quy RelaySafety/FlowInterlock. Firmware public default, guard
guard+fence và guard+flow+fence build đạt; khai báo PHYSICAL bị compile từ chối đúng lý do,
sau đó khôi phục profile hợp lệ build lại đạt. EmptyFS chỉ .gitkeep và merge
4MiB đạt, không dùng private config/PEM hoặc endpoint.

Full-app dùng schema riêng pump_valve_proof_smoke/testDB55439, MQTT/control/
demo false. Packet từ encoder qua PumpService thật, PostgreSQL, React:
healthy proof rồi fault mới; restart giữ nguyên clocks/proof/history và web
báo mẫu cũ. Không API mock, phát command, AWS hoặc tác động GPIO. Nâng V29→30
giữ nguyên configs/queue/monitor/boot/episode/history của fixture cũ.

Smoke fault lần đầu đã kiểm tra thẻ fault mới nhưng tìm reason ở bảng Event
Log nên fail: bảng chỉ có loại/kết quả, reason ở chi tiết. Sửa selector mở
đúng event; giữ nguyên fault/clock, restart và chạy stored smoke đạt. Không
phát lại packet hay sửa thời gian để tạo một lượt fresh giả.

## Sáu ca Windows/AWS/Wokwi chưa chạy

| Ca | Kỳ vọng | Thực tế |
| --- | --- | --- |
| Không bật macro mới | Demo cũ giữ hành vi; web không tự nói có guard | Chưa chạy |
| CLOSED/UNKNOWN hoặc hai tiếp điểm cùng active, gửi ON | LED không bật, ACK thất bại, OFF/khóa đúng lỗi | Chưa chạy |
| OPEN ổn định, reset nếu cần, ON có hạn | LED bật; timer/OFF vẫn dừng, không gia hạn do lệnh trùng | Chưa chạy |
| Khi đang ON, mất OPEN hoặc tạo CONFLICT | LED OFF/khóa, status/chi tiết event đúng; thử cả khi backend đã dừng nhưng gateway còn chạy | Chưa chạy |
| Khôi phục OPEN, reset, gửi ON mới | Không tự resume; reset không bật; cần lệnh mới | Chưa chạy |
| Phối hợp phao/flow/fence và reboot | Không bypass guard khác; boot OFF, latch RAM không được coi là NVS | Chưa chạy |

Ghi boot/sequence, thời điểm thao tác/LED, ACK/status và cấu hình public đã
dùng; che secrets. Chưa GPIO/van/nước thật, coordinator đa van, ánh xạ proof
theo nhánh hoặc dispatch queue. A3 chưa hoàn tất.
[Bàn giao V30](../implementation/LOCAL_PUMP_VALVE_INTERLOCK_REPORT.md).
