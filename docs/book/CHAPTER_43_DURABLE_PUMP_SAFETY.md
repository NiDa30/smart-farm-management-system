# Chương 43 — Giữ khóa an toàn qua lần khởi động lại

15/10/2026, migration V31, ENV01/PUMP01, mặc định tắt.

## Nhớ khóa, không nhớ lệnh bật

Trước đây relay khởi động OFF nhưng khóa chỉ ở RAM. V31 thêm nhật ký NVS
opt-in, ghi một record 32 bit trong namespace `sf-pump-safety`, key `journal`.
Không lưu lệnh, thời hạn bật, commandId, bootId, endpoint hoặc certificate.
Mọi lần boot đều OFF/khóa, kể cả lần trước dừng bình thường. Người vận hành
kiểm tra điều kiện rồi gửi RESET_LOCKOUT mới nhắm đúng boot; reset không bật
đầu ra. Không khôi phục phần còn lại của lịch tưới 600 giây sau reset/mất điện.

Đây là lựa chọn yêu cầu xác nhận sau mỗi boot, nhằm tránh biến dữ liệu flash
cũ hoặc flash simulator bị nạp lại thành quyền tự bật. NVS không thay phao,
flow guard, phản hồi van, timer cắt hay bảo vệ điện của bơm thực.

## Nhật ký và thứ tự cấp điện

| Trạng thái báo | Ý nghĩa |
| --- | --- |
| READY | Đã reset hoặc dừng khỏe, relay OFF, chưa có quyền phục hồi ON |
| ARMED | Record đã ghi/xác minh trước lần bật; không tự chứng minh GPIO ON |
| LOCKED | Giữ OFF/khóa, cần reset có điều kiện |
| STORAGE_FAULT | Không xác minh được đọc/ghi, giữ OFF/khóa |

Boot đọc record: thiếu record là chưa khởi tạo và khóa; record không biết,
sai kiểu hoặc đọc lỗi là STORAGE_FAULT. Record hợp lệ vẫn chuyển về LOCKED.
Ghi chỉ được coi thành công khi adapter báo commit thành công và đọc lại
đúng giá trị. Không xóa toàn NVS, tự format hoặc tự bỏ qua lỗi lưu trữ.

ON phải qua validation/fence và các guard hiện có, rồi ghi ARMED khi GPIO
còn OFF. Ghi/readback thất bại không được cấp điện. Sau thao tác flash,
firmware kiểm tra lại hạn lệnh và thời gian monotonic; timer độc lập dùng
phần thời gian còn lại, không cấp một cửa sổ chạy mới vì ghi flash chậm.
GPIO chỉ bật khi journal còn ARMED và các điều kiện đầu ra vẫn cho phép.

OFF/timer khỏe cắt đầu ra trước, rồi ghi CLEAN/READY. Nếu đã có khóa thì OFF
không xóa khóa. Fault cắt đầu ra trước, loop ghi LOCKED; lỗi ghi chuyển
STORAGE_FAULT. Callback/ISR không gọi flash, mạng hoặc Serial. Các poll và
heartbeat lặp lại không ghi flash khi trạng thái không đổi. Mỗi chu kỳ khỏe
có ghi trước ON và sau OFF; chưa đo tuổi thọ flash thực tế.

RESET cần lệnh mới hợp lệ, đầu ra OFF, phao và guard đang dùng cho phép;
record CLEAN phải ghi/readback thành công trước ACK thành công. Lỗi IO có
thể tiếp tục chặn reset. NVS hỏng kiểu/namespace không được tự xóa để sửa.
Mất mạng khi chạy vẫn cắt và khóa; nối lại không tự bật. Nếu reset thiết bị,
nguyên nhân cũ được quy về khóa khởi động, không hứa giữ chính xác mã lỗi
flow/van/phao qua reboot; lịch sử backend chỉ có những bản tin đã nhận.

## Fencing là điều kiện bắt buộc

`FARM_PUMP_DURABLE_SAFETY_ENABLED=1` yêu cầu `FARM_PUMP_FENCING_ENABLED=1`.
Compiler từ chối tổ hợp thiếu fence. Sau boot, ON/RESET cũ nhắm boot trước
không được mở khóa. Ordinal/cache vẫn thuộc phiên boot; nhật ký không lưu
ordinal và không thay thế cơ chế chống lệnh MQTT cũ ở chương34–35.

Legacy emergency OFF vẫn có thể yêu cầu reboot theo fence cũ. Sau reboot,
durable safety tiếp tục yêu cầu reset mới; không tạo đường tắt qua restart.

## Bản tin, backend và giao diện

Status thêm trường tùy chọn, ACK không thêm trường:

```json
"durableSafety": {"version":1,"enabled":true,"storage":"NVS","state":"LOCKED"}
```

`RESTART_LOCKOUT` cần metadata LOCKED/OFF/khóa; `SAFETY_STORAGE_FAULT` cần
STORAGE_FAULT/OFF/khóa. Backend kiểm tra shape/fence/tính nhất quán, lưu
`pump_status.durable_safety` JSONB. V31 không backfill hoặc bật firmware.
Trong cùng boot không được bỏ capability; báo READY hoặc OFF thông thường
không xóa LOCKED/STORAGE_FAULT. Cần bản báo LOCKOUT_RESET/READY/OFF/không khóa.
Boot mới không báo capability được coi là chưa biết, không mượn dữ liệu cũ.
ARMED có thể đi cùng OFF trong khoảng cutoff đã cắt GPIO, loop chưa kết thúc
record. Trường này không phải xác nhận relay ON hoặc quyền dispatch ở cloud.

An toàn Fail-Safe & Edge có thẻ **Khóa an toàn lưu trên thiết bị**; bản báo
cũ quá15 giây hoặc API lỗi không được coi là bằng chứng hiện tại. Firmware
cũ/thiếu metadata được ghi chưa có bằng chứng hỗ trợ, không tự gán NVS.
Control/Event Log dịch hai lý do mới; xem reason trong chi tiết sự kiện.
Không có nút reset mới trên trang chỉ đọc và không có topic/IAM/Thing mới.

## Cập nhật trên Windows — chưa chạy trong cloud

Giữ PostgreSQL và các terminal frontend/backend/gateway riêng. Pull nhánh,
restart backend để áp V31, không xóa volume. Nếu muốn thử opt-in, sửa hai
macro trong private `firmware/esp32/config/config.local.h`, mỗi macro chỉ
định nghĩa một lần; giữ endpoint/certificate và các guard đang dùng:

```cpp
#define FARM_PUMP_FENCING_ENABLED 1
#define FARM_PUMP_DURABLE_SAFETY_ENABLED 1
```

Giữ `FARM_CONTROL_ENABLED=1` của demo riêng. Backend phải bật cùng fence;
Git Bash mới tại gốc repo, sau khi dừng backend cũ:

```bash
SMARTFARM_CONTROL_ENABLED=true SMARTFARM_PUMP_FENCING_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Terminal build firmware riêng:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 --target buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py --project-dir firmware/esp32
```

Dừng nếu một lệnh lỗi. Restart simulator, chờ Wi-Fi/MQTT và status mới,
đối chiếu boot rồi reset bằng Điều khiển Actuator. Không dùng ảnh public
cloud thiếu endpoint/chứng chỉ để thay flash riêng. Không gửi PEM/config
hoặc ảnh flash vào chat/Git. Nạp lại toàn flash có thể làm mất NVS của
simulator; firmware vẫn khóa boot, nhưng điều đó không chứng minh flash đã
giữ record. Muốn kiểm tra retention phải ghi rõ cách reset và flash giữ lại.

## Bằng chứng cloud và các ca thực tế còn chờ

398 backend, 22 Safety/13 Event Log/15 Pump browser, 12 unit frontend,
12 contract Python đạt, không skip. Native journal17 nhóm/19 biến thể qua
store giả lập: thiếu/hỏng, lỗi đọc/ghi/readback, commit không rõ kết quả,
reboot, OFF không mở khóa, reset, chống ghi lặp, fence và cutoff/wrap.
Relay/flow/13 ca valve guard hồi quy đạt. Build public default, NVS+fence,
NVS+fence+flow+valve đạt; thiếu fence bị từ chối đúng static_assert rồi build
khôi phục đạt. EmptyFS/merge4MiB, lint/build đạt; không dùng private config/PEM.

Full-app nhận hai frame native từ memory store, gán giờ nguồn một lần tại
lúc nhận: boot lock và storage fault. API/React/Event Log mới đạt; restart
JVM giữ metadata, source/receipt/history rồi UI báo cũ. Không phát lại để
làm mới bằng chứng. Đây chưa phải ghi flash/NVS, MQTT, AWS hoặc GPIO thật.
Nâng V30→V31 đối chiếu37 bảng: dữ liệu giữ nguyên, chỉ execution_epoch của
watering_rule tăng1 theo startup sẵn có. Capability NVS cũ vẫn null.

| Ca Windows/AWS/Wokwi/ESP32 | Kết quả |
| --- | --- |
| Boot đầu/boot sau OFF đều LED OFF, status LOCKED; reset mới không bật LED | Chưa chạy |
| Đang ON thì reset giữ flash: không resume, boot mới và khóa | Chưa chạy |
| Fault phao/flow/van, reboot giữ flash: vẫn khóa, chỉ reset hợp lệ mở khóa | Chưa chạy |
| Phát lại ON/RESET nhắm boot trước bị từ chối sau restart | Chưa chạy |
| Mất gateway khi ON, nối lại/reset simulator và đối chiếu lịch sử | Chưa chạy |
| Tiêm lỗi đọc/ghi/kiểu NVS, brownout và đo GPIO trên ESP32 thật | Chưa chạy |

Không coi model memory-store là nghiệm thu NVS/power-loss. A3 vẫn còn
command nhiều van, ánh xạ proof đúng nhánh, interlock xuyên controller và
coordinator/dispatch queue. Chưa khôi phục tự động ON hoặc một lịch tưới dở.
