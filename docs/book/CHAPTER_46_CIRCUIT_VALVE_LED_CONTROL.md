# Chương 46 — Điều khiển LED van riêng theo nhánh tưới

Ngày16/10/2026. V32 bổ sung đường điều khiển mô phỏng cho controller/van02–99,
sau [project monitor](CHAPTER_44_CIRCUIT_MONITOR_PACKAGE.md) và
[công cụ đăng ký](CHAPTER_45_CIRCUIT_MONITOR_PROVISIONING.md).

## Có thể làm gì

Vào **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới**,
chọn **Điều khiển LED <mã nhánh>**. Trang riêng hiển thị controller/van/vùng,
revision, hai đồng hồ, boot, GPIO, phản hồi vị trí và20lệnh gần nhất.
Có nút mở1–30giây, đóng thủ công và đọc lại. Cột Van ở danh sách vẫn là
monitor; đọc GPIO control trong panel riêng này. Không tự gửi lệnh khi mở trang,
poll, reconnect hoặc restart backend.

Đây là LED GPIO26 của ESP32 mô phỏng riêng. Chưa nối van cơ khí, bơm chung
hoặc nước. Nhiều board có thể chạy độc lập, không có khóa điều phối chung cho
các LED; không được dùng đường này như coordinator nhiều van dùng chung bơm.
PUMP01, rule ENV01 và queue PREVIEW_ONLY giữ đường cũ. A3 chưa hoàn tất.

Profile mới là **CIRCUIT_LED_DEMO**, tắt mặc định ở cả backend và firmware.
Profile monitor vẫn chỉ quan sát, GPIO luôn tắt. Dữ liệu monitor không thể
cho phép mở LED và không được đổi thành trạng thái control bằng backfill.
IRRIGATION01/VALVE01 tiếp tục demo legacy của chương32–37.

## Topic và cấu hình riêng

| Luồng | Topic của ví dụ VALVE08 |
| --- | --- |
| Backend gửi command | smartfarm/FARM001/VALVE08/demo/command |
| Thiết bị báo status | smartfarm/FARM001/VALVE08/demo/status |
| Thiết bị báo ACK | smartfarm/FARM001/VALVE08/demo/ack |
| Monitor cũ, giữ riêng | smartfarm/FARM001/VALVE08/status |

Không retained command/status/ACK. QoS1, clean session; không replay lệnh
chưa rõ kết quả. Backend subscribe đúng từng topic của nhánh simulator có
controller riêng, không dùng wildcard command. Thêm board/controller cần
restart backend để nhận subscription mới. Một controller hiện chỉ dùng cho
một van; cấu hình chia sẻ controller không được cấp đường điều khiển này.

Command và status/ACK mang controlProfile, controllerId, actuatorId,
circuitId/circuitRevision, zoneId/zoneRevision. Cả OPEN và CLOSE phải đúng
boot. Sai mã/revision/profile bị từ chối trước áp GPIO. Giới hạn thời gian,
ordinal, expiry và bảo vệ mất kết nối nằm tại firmware; backend không thể
thay thế timer cục bộ bằng việc đếm thời gian trên web.

## Lệnh, ACK và trạng thái được phân biệt

- POST mang UUID requestId, action, durationSeconds (chỉ OPEN), expectedBootId,
  expectedRevision, expectedZoneRevision và requestedAt. HTTP intent chỉ
  trong10giây, cho phép lệch tương lai tối đa2giây; MQTT lifetime10giây.
- Backend commit PENDING trước publish. Cùng UUID và cùng intent chỉ đọc
  ledger, không publish lại; đổi intent dưới UUID cũ trả409. Publish không
  rõ kết quả lưu PUBLISH_UNCERTAIN, không tự retry hoặc resend sau restart.
- OPEN cần mapping CURRENT/SIMULATOR, controller riêng, transport đã subscribe,
  status đúng mapping/boot còn mới cả source và receipt trong15giây,
  demoEnabled, GPIO CLOSED và vị trí CLOSED không fault. Tất cả lệnh của
  boot đó phải được status thấy; không chỉ kiểm tra20hàng đang hiển thị.
- CLOSE cho phép gửi khi status cũ hoặc vị trí fault, nhưng vẫn cần mapping
  và boot đã biết, request mới và transport sẵn sàng. Thiết bị reboot luôn
  đóng; CLOSE của boot cũ không được làm đổi ordinal của boot mới.
- CLOSE đặt fence chống HTTP OPEN cũ đến muộn. ACK đúng command có thể đổi
  ledger thành EXECUTED/REJECTED, không đổi latest status. ACK thành công
  không tự chứng minh van đã đóng hoặc nước đã chảy.
- Status chống duplicate/out-of-order, ordinal lạ, nguồn khác, mapping khác
  và boot đã retire. Duplicate không làm mới receivedAt. Capability vị trí
  bắt buộc; lỗi vị trí chỉ xóa khi có status sau CLOSE mới hoặc boot mới.
- Trên web, mất phản hồi POST giữ UUID để GET đối chiếu, không tự gửi lại;
  OPEN bị chặn khi còn intent chưa rõ. Vẫn có thể gửi CLOSE nếu backend
  còn sẵn sàng. Nếu GET404/lỗi, giữ intent, không coi đó là ACK. Không có
  tự resume. Khi quay lại trang cần đọc trạng thái mới trước thao tác.

V32 có circuit_demo_command/status/boot/gate, tách monitor status/history.
Lệnh lưu toàn bộ config snapshot; status lưu source/receipt độc lập.
Không nhập lại history từ dữ liệu cũ. Latest control chưa có bảng lịch sử
mỗi packet hoặc cảnh báo riêng tương đương monitor; đợt này là điều khiển
và ledger, không quảng cáo đã hoàn tất mọi màn lịch sử/cảnh báo mới.

Sửa nhánh/vùng hoặc thêm nhánh dùng chung controller có lịch sử control cần
phản hồi vị trí CLOSED mới sau mọi command; stale GPIO hoặc ACK không đủ.
Mapping đổi phải build/boot mới; cùng boot không tự nhận revision mới.
Nếu board mất và không xác nhận đóng được, công cụ không tự bỏ điều kiện
để ép remap; quy trình khôi phục vận hành cần làm riêng.

## Chuẩn bị trên Windows

Ví dụ dùng CIRCUIT08/ZONE08, IRRIGATION08/VALVE08. Thay bằng mapping và revision
thực tế của bạn; không tự tạo ví dụ vào database. Không dùng thiết bị vật lý.

1. Pull nhánh, restart backend để áp V32; không xóa volume. Tải **lại** project
   monitor từ backend mới vào thư mục riêng. Gói cũ trước chương46 không có
   code profile mới dù có thể tự thêm macro bằng tay.
2. Nếu cần danh tính mới, đăng ký board theo chương45 ở profile monitor trước.
   Mỗi board có certificate/key riêng. Dừng simulator monitor cùng client ID
   trước chuyển profile; hai process cùng MQTT client ID sẽ đá kết nối nhau.
3. Copy config.example.h sang config.local.h riêng, giữ endpoint/certificate
   riêng tư, đúng controller/valve/circuit/zone/revisions. Sửa đúng define:

```cpp
#define IRRIGATION_SIMULATOR 1
#define IRRIGATION_DEMO_ENABLED 1
#define IRRIGATION_MONITOR_ONLY 0
#define IRRIGATION_CIRCUIT_CONTROL_ENABLED 1
#define IRRIGATION_POSITION_FEEDBACK_ENABLED 1
#define IRRIGATION_CONTROLLER_ID "IRRIGATION08"
#define IRRIGATION_VALVE_ID "VALVE08"
#define IRRIGATION_CIRCUIT_ID "CIRCUIT08"
#define IRRIGATION_CIRCUIT_REVISION 1
#define IRRIGATION_ZONE_ID "ZONE08"
#define IRRIGATION_ZONE_REVISION 1
```

Không thêm define trùng vào cuối file. Compiler chặn monitor+control, thiếu
feedback hoặc simulator0. Hai switch độc lập: GPIO32=CLOSED, GPIO33=OPEN,
active LOW; không nối switch với GPIO26. Ban đầu đặt CLOSED=true, OPEN=false,
đợi debounce100ms. Khi mở LED, chuyển đầu vào sang OPEN trong3giây; khi đóng
LED chuyển về CLOSED. Đây là end stop mô phỏng, không phải feedback lấy từ
chính lệnh GPIO. Không đạt vị trí sẽ đóng GPIO và latch lỗi.

4. Render policy công khai, không gọi AWS, tại Git Bash gốc repo:

```bash
mkdir -p .local/policies
./.local/day1-venv/Scripts/python.exe tools/aws/render_irrigation_policies.py \
  --account-id 123456789012 \
  --controller-id IRRIGATION08 \
  --valve-id VALVE08 \
  --circuit-demo > .local/policies/IRRIGATION08-led-control.json
```

Thay account minh họa bằng tài khoản của bạn. Trong kết quả, devicePolicy
là IoT policy gắn certificate của board; backendAdditionalIdentityPolicy
là IAM **bổ sung** cho danh tính backend hiện có. Không gán nguyên wrapper
JSON vào policy editor. Không thay mọi quyền backend bằng file bổ sung.
Policy chỉ cho đúng client và /demo/command,status,ack của một van; không
quyền PUMP01, RetainPublish hoặc wildcard. Đợt này không tự áp policy trên AWS.

Chuyển quyền control là thao tác quản trị riêng. Công cụ chương45 vẫn chỉ
chấp nhận monitor status-only; sau khi certificate có policy control, nó sẽ
từ chối apply monitor lại. Không sửa tool hoặc xóa recovery để bỏ kiểm tra.
Không cần tạo một IAM role mới cho mỗi board.

5. Build, buildfs và merge project riêng như chương44; không ghi đè key/ảnh
   flash của board khác. Giữ terminal gateway và chạy Wokwi từ đúng diagram.
6. Ở terminal Git Bash mới cho backend, giữ DB/profile đã cấu hình và bật
   đúng flag. Ví dụ đợt LED riêng này không gửi lệnh PUMP01 hoặc legacy01:

```bash
export SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED=true
export SMARTFARM_IRRIGATION_DEMO_ENABLED=false
export SMARTFARM_CONTROL_ENABLED=false
bash tools/backend/run_backend_windows.sh
```

Script backend dùng MQTT thật theo cấu hình hiện có trên máy bạn; chỉ chạy
sau khi đã gắn quyền topic mới. Không bật flag mới ở cloud để gọi AWS.
Sau boot, đợi status riêng và CLOSED đã xác minh mới mở. Nếu backend chưa
bật hoặc topic chưa subscribe, UI chỉ đọc và nút gửi bị chặn. Tắt profile
sau thử; khi vận hành MQTT tiếp tục theo dõi usage/Budget.

## Kiểm chứng cloud và phần cần nghiệm thu

439backend đạt (23mới),35browser nhánh (9mới),4unit parser mới, lint/build đạt.
Bốn chương trình native kiểm tra model/feedback cũ, monitor và control mới.
Ba profile firmware public legacy/monitor/circuit build đạt; profile kết
hợp sai bị compiler chặn và restored build đạt. Policy/provisioning regression
được kiểm tra riêng. Không coi test giả lập là AWS/GPIO thật.

Fixture circuit_control_smoke qua parser native với command backend tạo:
CLOSED→PENDING/SENT→native ACK/OPEN→timer logical CLOSED→receiver/PostgreSQL.
Van thứ hai không có dữ liệu; pump/run/queue/monitor0. Timer5giây trong fixture
là đồng hồ millis mô hình native tiến nhanh, không chứng minh đã chờ5giây
ở ESP32. Full app đọc ledger và stale đúng nhánh, không gửi lệnh. Restart giữ
status/ledger/clocks, không replay ON. Nâng fixture monitor V31→V32 giữ nguyên
mapping/observations, monitor không cho phép mở control và flag mặc định tắt.

| Ca Windows/AWS/Wokwi | Kết quả |
| --- | --- |
| Đúng client/certificate/policy /demo/, CLOSED độc lập mới và mở5giây | Chưa chạy |
| Hai van riêng, chỉ đúng nhánh nhận command/ACK/status | Chưa chạy |
| CLOSE sớm, OPEN cũ đến muộn không mở lại | Chưa chạy |
| Đổi switch không đúng vị trí, latch lỗi và CLOSE sau sửa đầu vào | Chưa chạy |
| Mất gateway, boot/reconnect luôn đóng, không auto resume | Chưa chạy |
| Restart backend giữa run, ledger giữ nguyên, không replay OPEN | Chưa chạy |

Bước A3 tiếp theo còn proof theo nhánh, coordinator lấy quyền bơm và kiểm
tra flow trước dispatch queue. Không lấy GPIO/ACK ở chương này làm chứng minh
nước đang đến đúng vùng. [Bàn giao](../implementation/LOCAL_CIRCUIT_VALVE_CONTROL_REPORT.md).

Bước tiếp theo tại [chương47](CHAPTER_47_PUMP_CIRCUIT_ROUTE.md) bổ sung lệnh
bơm LED có route cố định và chặn di chuyển van khi lượt bơm chưa xác nhận
OFF. V32 riêng trong chương này vẫn không phải coordinator; không tự bật
profile bơm khi mở panel điều khiển van.
