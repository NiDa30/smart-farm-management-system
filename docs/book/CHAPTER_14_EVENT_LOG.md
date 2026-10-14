# Nhật ký sự kiện từ dữ liệu PostgreSQL

Mục tiêu là trả lời: cảnh báo nào đã xảy ra, lệnh nào được tạo, thiết bị đã
ACK hay chưa, trạng thái thay đổi ra sao và lần chạy tưới nào liên quan.
Trang `/iot/events` trước đây đọc dữ liệu mock từ AppContext. Bản này dùng
API `GET /api/v1/events`, không phát lệnh điều khiển khi mở trang.

## Nguồn và ý nghĩa thời gian

| Loại | Bảng nguồn | Thời gian dùng để sắp xếp |
|---|---|---|
| Cảnh báo mở / đóng | sensor_alert | opened_at / cleared_at do cảm biến cung cấp |
| Lệnh được tạo | pump_command | issued_at của backend |
| Thiết bị ACK | pump_command | acknowledged_at khi backend nhận ACK |
| Trạng thái thiết bị | pump_state_history | observed_at của thiết bị; received_at lưu riêng |
| Bắt đầu lần chạy | watering_run | started_at của backend |

Không có thời gian backend nhận cho alert trong schema hiện tại. Ngược lại,
ACK không lưu timestamp nguồn vào bảng command. Chi tiết hiển thị “Không được
lưu” cho phần thiếu, không dùng một timestamp thay cho hai khái niệm.

Command ID và Run ID chỉ điền khi có foreign key thật. Không suy ra command
cho một dòng trạng thái chỉ vì chúng gần nhau về thời gian. Nếu một command
bị gắn với nhiều run trong dữ liệu cũ, API chọn run có ID nhỏ nhất; không tự
sửa dữ liệu để tạo quan hệ một-một.

## Lọc và phân trang

Tham số: from/to dạng ISO UTC, category (ALERT/COMMAND/DEVICE/RULE), deviceId,
limit 1..100 (mặc định 50), cursor. Không truyền khoảng thì dùng24 giờ gần nhất;
API giới hạn khoảng tối đa 31 ngày. Giao diện chọn 1 giờ/24 giờ/7 ngày.

Khoảng là [from,to). Cursor chứa thời điểm và ID cuối trang; SQL sắp xếp cả
hai giảm dần nên các dòng trùng timestamp không bị mất hoặc lặp giữa trang.
Trang tiếp phải giữ from/to và bộ lọc. UI tải 50 dòng, cho Tải thêm, Làm mới
đặt lại range/page. Request cũ bị hủy khi đổi lọc, dữ liệu phản hồi cũ không
được ghi đè bộ lọc mới.

Đây là read model của dữ liệu hiện có, chưa phải audit log bất biến. Trạng
thái command/run có thể thay đổi sau khi tải; một ACK đến muộn hoặc một alert
đóng muộn có thể xuất hiện khi Làm mới. Cursor không tạo snapshot transaction
xuyên nhiều HTTP request. Không có đầy đủ mọi chuyển PENDING→SENT→EXECUTED
vì các bảng nguồn chỉ giữ kết quả mới nhất. SENT chưa chứng minh GPIO đã bật.

## Kiểm tra và chạy trên Windows

Cloud đã kiểm tra 52 Java tests, 7 browser fixtures Event Log,13 browser fixtures
automation và 3 unit telemetry. Smoke menu thật → proxy → API → PostgreSQL test
đạt, nhưng MQTT/control bị tắt. Những kết quả này không chứng minh dữ liệu AWS
live hoặc bơm thật. Chạy Windows để xác nhận với dữ liệu của người dùng:

1. Pull feature branch sau khi đã push bản cloud mới; giữ thay đổi local.
2. Chạy backend trong terminal riêng và frontend bằng npm run dev.
3. Mở IoT → Nhật ký sự kiện Event Log.
4. Chọn Cảnh báo/ENV01 rồi Lệnh và ACK/PUMP01. Mở chi tiết để xem thời gian,
   commandId và runId; đối chiếu với các trang chuyên biệt.
5. Tải thêm hoặc Làm mới. Lỗi backend phải hiện rõ, không trả về mock thay thế.

Không cần đổi IAM, build firmware hoặc migration mới cho Event Log. Nếu dùng
script browser trên máy mới: npm ci --legacy-peer-deps, npx playwright install
chromium rồi npm run test:events. CHROMIUM_PATH là tùy chọn cho máy đã có Chrome
hệ thống; Windows bình thường dùng browser cache của Playwright.
