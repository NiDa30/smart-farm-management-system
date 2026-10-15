# Chương 38 — Nhánh tưới: vùng, van dự kiến và trạm nước

Ngày triển khai: **15/10/2026**, múi giờ Asia/Ho_Chi_Minh. Migration V26.

## Vấn đề cần giải quyết

Một nông trại có thể có nhiều vùng đất, nhiều controller và nhiều trạm nước.
Trước đây hàng chờ V21 chỉ giữ cấu hình vùng; chưa biết van hay trạm nào thuộc
vùng đó. Nếu bổ sung đích điều khiển sau này mà chỉ tra cấu hình mới nhất,
một lượt đã được duyệt có thể vô tình chuyển sang van khác.

V26 thêm nhánh tưới làm bản khai liên kết. Trang web có đường đi **IoT & Tự
động hóa → Điều khiển Actuator → Cấu hình nhánh tưới**. Có thể tạo, xem và sửa
nhiều nhánh, rồi mở hàng chờ để diễn tập. Đây là cấu hình; chưa có coordinator
gửi lệnh tuần tự van–bơm. Thêm nhánh không tự tạo Thing/certificate/policy,
không bổ sung van trong Wokwi hoặc giữ quyền sử dụng PUMP01.

Ví dụ cấu hình:

| Nhánh | Vùng | Controller / van dự kiến | Bơm | Trạm nước |
| --- | --- | --- | --- | --- |
| CIRCUIT01 | ZONE01 | IRRIGATION02 / VALVE02 | PUMP01 | WATER01 |
| CIRCUIT02 | ZONE02 | IRRIGATION02 / VALVE03 | PUMP01 | WATER01 |
| CIRCUIT03 | ZONE03 | IRRIGATION03 / VALVE04 | PUMP01 | WATER02 |

Controller và trạm nước được dùng chung. Một vùng chỉ thuộc một nhánh và một
mã van chỉ được dùng một lần trong FARM001, kể cả khác controller, vì topic
hiện có vẫn mang mã actuator phẳng. Chưa hỗ trợ nhiều bơm hoặc nhiều farm.

## Dữ liệu và kiểm tra khi lưu

`irrigation_circuit` giữ mã/tên nhánh, mã và phiên bản vùng, controller/van,
PUMP01, WATER node cùng hai kênh phao/lưu lượng, nguồn SIMULATOR/PHYSICAL và
phiên bản nhánh. Trạm phải là WATER/v2; phao dùng WATER_PRESENT/boolean,
lưu lượng dùng FLOW_RATE/L/min. Nguồn của nhánh phải trùng nguồn vùng đang
được chọn; chưa có mẫu đúng nguồn thì trang khảo sát ghi rõ tình trạng đó.

Mã controller được giới hạn IRRIGATION01–99, van VALVE01–99. Những mã dự kiến
không được trùng node, sensor hoặc actuator đã khai báo. V26 chưa giữ chỗ mã
trong registry thiết bị; nếu về sau có khai báo thiết bị trùng mã, nhánh báo
IDENTITY_CONFLICT và không được dùng để tạo/khởi động lượt diễn tập mới.

PUT phải gửi phiên bản nhánh đang sửa. Hai người cùng sửa thì người gửi
phiên bản cũ nhận409. Unique constraint bảo vệ cả hai yêu cầu tạo đồng thời.
Lưu mất phản hồi không tự thử lại: UI giữ mã và đối chiếu bằng GET. Nếu cấu
hình đọc được khác yêu cầu, UI đưa cấu hình hiện tại vào biểu mẫu để xem lại,
không nhận đó là yêu cầu vừa lưu thành công.

## API

| Đường dẫn | Hành vi |
| --- | --- |
| GET `/api/v1/irrigation-circuits` | Snapshot CONFIGURATION_ONLY, dispatchAvailable=false |
| GET `/api/v1/irrigation-circuits/{id}` | Đọc cấu hình để đối chiếu |
| POST `/api/v1/irrigation-circuits` | Tạo cấu hình, trả201 và revision1 |
| PUT `/api/v1/irrigation-circuits/{id}` | Sửa đúng revision, trả200 với revision tăng |

POST nhận đúng các trường sau; PUT thêm `revision`:

```json
{
  "circuitId": "CIRCUIT01",
  "name": "Nhánh rau A",
  "zoneId": "ZONE01",
  "zoneRevision": 1,
  "controllerId": "IRRIGATION02",
  "valveId": "VALVE02",
  "pumpId": "PUMP01",
  "waterNodeId": "WATER01",
  "lowChannelId": "LOW",
  "flowChannelId": "FLOW",
  "expectedSource": "SIMULATOR"
}
```

Các mã trong ví dụ phải được thay theo khai báo thực tế. API từ chối JSON có
trường lạ, key lặp, thiếu trường hoặc nối thêm object phía sau. Không có API
execute/delete hoặc cờ tự bật vận hành trong phần nhánh này.

## Khảo sát nước và van

Snapshot báo cấu hình còn khớp, vùng đã đổi, kênh nước đã đổi hoặc mã thiết bị
bị trùng. Dữ liệu phao và flow phân biệt thiếu mẫu, lệch giờ, cũ, lỗi cảm
biến và nguồn không khớp. Độ mới xét cả observedAt và receivedAt dưới15giây,
không nhận thời gian tương lai quá2giây. Flow0 khi nghỉ vẫn là mẫu hợp lệ;
không có flow proof, tính lít theo nhánh hoặc quyết định cho phép bơm ở đây.

Chỉ cặp IRRIGATION01/VALVE01 có adapter đọc phản hồi demo hiện hữu. Nó còn
phải khớp binding vùng/phiên bản, nguồn mô phỏng và status mới; GPIO cũ không
được coi là vị trí xác minh. IRRIGATION02/VALVE02 hoặc các cặp khác hiển thị
“Chưa có kết nối van này”, không mượn status của VALVE01. Nhãn PHYSICAL trong
cấu hình không chứng minh đã có phần cứng hoặc chứng thực nguồn đo.

## Hàng chờ lưu bản chụp cấu hình

V26 thêm `circuit_snapshot` JSONB nullable. Lượt trước nâng cấp giữ null,
không tự gán van/trạm. Vùng chưa có nhánh vẫn được diễn tập như V21.

Khi vùng đã có nhánh, POST tạo lượt phải gửi thêm **circuitId/circuitRevision**
đã xem. Thiếu một trường nhận400; thiếu cả hai khi đã có ánh xạ, hoặc gửi
phiên bản cũ, nhận409. Backend chụp toàn bộ cấu hình nhánh trong cùng giao
dịch với việc xếp hàng, không chỉ lưu mã tham chiếu.

Trả lại cùng UUID vẫn đọc đúng bản ghi cũ dù nhánh đã sửa; thay nội dung dưới
cùng UUID bị từ chối. Không chụp lại nhánh mới vào lượt cũ. Trước khi bắt đầu
và trong bảo trì, backend đối chiếu cả cấu hình vùng và toàn bộ nhánh:

- Vùng đổi: lượt chờ INVALIDATED, lượt đang diễn tập INTERRUPTED / ZONE_CHANGED.
- Nhánh đổi hoặc mới được thêm sau lượt chưa có nhánh: trạng thái tương ứng,
  reason CIRCUIT_CHANGED. Bản chụp cũ không đổi.
- Restart backend: lượt đang diễn tập INTERRUPTED / BACKEND_RESTARTED; không
  tự tiếp tục hoặc tự bắt đầu lượt sau.

Khóa cấu hình nhánh dùng chung với giao dịch hàng chờ để không có lần sửa
ánh xạ chen giữa việc kiểm tra và chụp cấu hình. FIFO, giới hạn50lượt,
TTL5phút và thời gian diễn tập1–30giây vẫn giữ. Toàn bộ vẫn PREVIEW_ONLY.

## Kiểm chứng trong cloud

315 kiểm thử backend đạt, không skip, gồm15ca nhánh mới. 11ca browser nhánh,
16ca browser hàng chờ (4mới), lint và build đạt. Kiểm thử migration V25→26 giữ
nguyên bản ghi hàng chờ cũ và để circuit_snapshot null. Lượt đầu kiểm thử
tập trung phát hiện singleton binding của fixture đã bị một suite cũ dọn;
bổ sung khởi tạo nếu thiếu vào setup test riêng, không sửa hoặc reset DB demo.

Full-app React → HTTP → PostgreSQL dùng schema riêng
`irrigation_circuit_smoke` trên DB test55439. Tạo hai vùng/nhánh dùng chung
IRRIGATION02 và CWATER01 qua API/UI thật. Tạo một lượt hủy, một lượt đang
diễn tập và một lượt chờ. Restart JVM thật giữ cấu hình và bản chụp, ngắt
lượt đang diễn tập bằng BACKEND_RESTARTED và không chạy tiếp lượt sau.
MQTT/control/valve-demo đều false; pump_command, watering_run và
irrigation_demo_command đều0. Không dùng route mock cho phép thử full-app.

Script `tools/frontend/smoke_irrigation_circuits.py` có phase create opt-in
chỉ cho fixture riêng và phase stored chỉ đọc. Không chạy create với DB demo,
không xóa/reset fixture để lặp bằng chứng. Firmware không đổi trong V26;
không tính lại bằng chứng firmware V25 thành nghiệm thu nhiều van.

## Windows và giới hạn nghiệm thu

Pull nhánh feat/day1-iot-foundation, dừng backend bằng Ctrl+C rồi chạy lại
bằng lệnh Git Bash đang dùng. Flyway áp V26 khi khởi động. Không cần sửa
private config, IAM hoặc build firmware cho phần cấu hình này. Giữ frontend
bằng npm run dev ở terminal riêng; trang mới nằm trong Điều khiển Actuator.

| Ca bổ sung | Kỳ vọng | Windows thực tế |
| --- | --- | --- |
| Hai nhánh khác vùng, chung trạm | Lưu được, hai van khác nhau | Chưa chạy |
| Dùng lại van hoặc vùng |409, không tự thử lại | Chưa chạy |
| Sửa nhánh sau khi xếp hàng | Lượt cũ mất hiệu lực, snapshot không đổi | Chưa chạy |
| Đổi vùng hoặc nguồn | Phải duyệt lại cấu hình, không tự chuyển đích | Chưa chạy |
| Restart giữa diễn tập | INTERRUPTED, không resume hoặc bật thiết bị | Chưa chạy |

Bước vận hành tiếp theo cần namespace/provisioning nhiều controller, giao
thức và phản hồi từng van, coordinator có quyền sử dụng bơm cùng interlock
xuyên van–bơm và chính sách nước/flow proof. Tự tưới từ vùng SOIL và nhiều
bơm còn sau. V26 không đánh dấu coordinator A3 hoàn tất.

Xem [báo cáo V26](../implementation/LOCAL_IRRIGATION_CIRCUITS_REPORT.md).
