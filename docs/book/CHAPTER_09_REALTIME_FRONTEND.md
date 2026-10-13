# Chương 9 — Hiển thị telemetry thật trên React

Bản thảo cập nhật13/10/2026. Chương8 đã có bằng chứng API latest trả reading
live trên Windows. Chương này thêm giao diện gọi API; người dùng sau đó xác
nhận “đã chạy thành công”. Chưa có ảnh hoặc kết quả riêng của từng tình huống
sensor variation/stale/outage/recovery trên máy họ.

## Từ API đến màn hình

Màn hình IoT → Sensor Realtime đọc latest và history từ backend, hiển thị nhiệt
độ, độ ẩm không khí, độ ẩm đất và tối đa15 reading trong24 giờ. Dữ liệu đến từ
PostgreSQL; mở lại trang vẫn có lịch sử mà database giữ. Browser không cần
access key AWS, certificate hay private key của ESP32.

Vite dev proxy chuyển `/api` đến `http://127.0.0.1:8080`. React dùng URL tương
đối `/api/v1/devices/ENV01/telemetry`, tránh vấn đề CORS trong workflow local.
Đây là cấu hình dev server, không tự xuất hiện khi deploy static dist. Production
cần reverse proxy/API authentication riêng, không dùng Vite dev server để public
ứng dụng. Các màn hình ngoài Sensor Realtime còn dữ liệu mock chưa được chuyển
đổi; trạng thái mock trong topbar không phải trạng thái của telemetry thực tế.

## Cập nhật và trạng thái dữ liệu

Frontend polling latest/history song song, chờ5 giây sau khi vòng request kết
thúc trước vòng tiếp theo. Không chồng request; timeout8 giây và abort khi rời
màn hình. Nút Làm mới kích hoạt vòng mới. Đây là polling, chưa phải WebSocket
realtime từ backend đến browser.

“Dữ liệu mới” đòi hỏi cả timestamp nguồn và receivedAt không cũ quá30 giây.
Đồng hồ UI cập nhật mỗi giây, nên ngay cả khi API luôn trả200, reading cũ vẫn
chuyển trạng thái. Không dùng thời điểm fetch để làm mới tuổi reading.
Timestamp vượt trước clock trình duyệt quá60 giây cũng bị đánh dấu dữ liệu cũ
và hiển thị nhắc đồng bộ giờ. Trạng thái mới không chứng minh LWT ONLINE hay
health MQTT toàn hệ thống; đây là trạng thái freshness của reading đã nhận.

Nếu API lỗi, giữ số đo và lịch sử đã tải nhưng đánh dấu backend không khả dụng.
Không tự hiển thị số0 hoặc dữ liệu giả. Latest404 là chưa có reading; HTTP lỗi
khác và response sai dạng là không tải được. Nếu riêng history lỗi, latest vẫn
có thể hiển thị và history giữ bản trước với banner riêng. Một reading lặp lại
không tạo thêm dòng lịch sử; dùng id database và source time để sắp xếp.

## Kiểm tra response ở ranh giới giao diện

TypeScript interface không tự kiểm tra JSON từ mạng. Parser kiểm tra farm/device,
schemaVersion, UUID, timestamps có timezone, số hữu hạn/range và các integer
an toàn trong JavaScript trước khi đưa lên card. Không ép chuỗi thành số. Backend
vẫn chịu trách nhiệm validation ingest và database constraints; kiểm tra ở browser
bảo vệ màn hình khỏi response sai, không thay thế bảo mật API.

## Chạy trên Windows

Giữ PostgreSQL healthy, backend đang chạy, Wokwi và gateway cung cấp telemetry.
Tại repository root trong terminal khác:

```bash
git pull --ff-only origin feat/day1-iot-foundation
npm run dev
```

Nếu dev server đã chạy trước khi cập nhật proxy, restart nó. Mở địa chỉ local
Vite in trong terminal, thường là http://localhost:3000; chọn IoT & Tự động hóa
→ Sensor Realtime. Route của ứng dụng là state nội bộ, không giả định truy cập
thẳng URL /iot/realtime sẽ chọn được màn hình.

Đổi cảm biến Wokwi, so sánh latest API với card và lịch sử. Stop Wokwi nhưng giữ
backend/API chạy: sau khoảng30 giây kể từ reading cuối, màn hình phải báo dữ
liệu cũ. Khởi động lại Wokwi: reading mới phải phục hồi trạng thái. Dừng backend:
UI phải báo không kết nối được, giữ và đánh dấu các giá trị cache. Đây là các bước
live cần người dùng xác nhận; fixture browser tests không chứng minh AWS live.

## Kiểm chứng trong cloud

Lint/build đạt. Build vẫn có cảnh báo baseline về __dirname và bundle lớn,
không ngăn build. Ba tests chạy bằng Node/tsx xác nhận freshness không bị
polling làm mới giả, từ chối response sai và history dedup/source ordering:

```bash
node --import tsx --test src/modules/iot/realtime/telemetryApi.test.ts
```

Playwright/Chromium đã kiểm tra UI với API fixtures: fresh, stale, lỗi503 giữ
reading cache, payload sai, empty404, recovery, history trùng không thêm dòng,
không có page errors. Script optional `tools/frontend/smoke_realtime.py` cần
Python playwright và Chromium (CHROMIUM_PATH hoặc browser Playwright đã cài),
dev server đang chạy. Screenshot được lưu trong ignored.local. Không yêu cầu
cài Playwright để chạy ứng dụng.

```bash
python tools/frontend/smoke_realtime.py
```

Lần smoke đầu dùng glob route không khớp /latest, nên request lọt ra backend
không chạy và nhận lỗi. Sửa test interception rồi chạy lại đạt; đây là lỗi test
harness, không kết luận API production lỗi. Proxy thực cũng được kiểm tra với
Spring Boot/PostgreSQL: history[] và latest404 đi qua Vite đúng khi DB trống,
MQTT disabled trong cloud. Chưa xác nhận reading live trên frontend Windows.

## Bước tiếp theo

Thu bằng chứng UI trên máy người dùng, rồi mới đánh dấu nghiệm thu giao diện.
Biểu đồ dài hạn, WebSocket push, health/LWT status và đa trang trại chưa thuộc
bản thay đổi này. Tiếp tục phần safety/control/ACK theo gate kế hoạch sau khi
luồng dữ liệu đã được đối chiếu thực tế.
