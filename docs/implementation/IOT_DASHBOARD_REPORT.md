# Bàn giao Tổng quan IoT — 14/10/2026

Nền bbbd231, feature branch, working tree sạch trước đợt. Thay dashboard mock
bằng dữ liệu thật cho FARM001. Không đổi rule/control logic, firmware, IAM hoặc
migrations. Không đọc secrets hoặc chạy lệnh AWS.

## Thiết kế và file

- IoTOverview.java/OverviewController.java trong backend/iot/dashboard:
  GET /api/v1/dashboard/overview ghép monitoring, areas, tổng cảnh báo, năm
  cảnh báo mở mới nhất, rule state và tám event trong 24 giờ. Transaction DB
  read-only REPEATABLE_READ, không expire pending hay pause/enable rule.
- IoTDashboard.tsx chỉ dùng navigate của AppContext, số liệu lấy API. Các nút
  điều hướng, không có quick-toggle từ mock. Relay không rõ khi status cũ.
- overviewApi.ts kiểm tra response; freshAverages chỉ tính sensor có dữ liệu
  mới, không tính actuator/stale, không trả0 cho trung bình thiếu dữ liệu.
- Thêm IoTOverviewTest, overviewApi.test.ts và dashboard.browser.spec.ts.
- Playwright dashboard fixture4180 không có proxy backend; GET API được
  intercept và request ngoài origin bị chặn. Không có control dispatch.
- tools/frontend/smoke_dashboard.py đi qua App thật và backend/PostgreSQL thật,
  có fixture assumptions mô tả bên dưới. Thêm script npm test:dashboard,
  không dependency mới hoặc sửa lockfile.
- Viết chương16, cập nhật mục lục, acceptance và journal.

## Kiểm tra cuối

| Kiểm tra | Kết quả |
|---|---|
| Maven verify toàn bộ | 64/64, failures/errors/skipped=0, DB test riêng 55439 |
| IoTOverviewTest | 3 integration: dữ liệu/relay chưa biết, tổng 6 cảnh báo so preview 5, GET không expire/pause |
| npm run test:dashboard | 7/7 Chromium fixtures |
| Node overviewApi + monitoringApi + telemetryApi tests | 9/9 unit |
| npm run lint/build | Đạt; cảnh báo Vite __dirname và bundle lớn vẫn có |
| smoke_dashboard.py | Đạt: full app menu → tổng quan → giám sát/cảnh báo, API/DB thật |
| git diff --check và liên kết sách | Đạt, chỉ kiểm tra đích file nội bộ |

Bảy browser tests gồm: sensor count tách actuator, trung bình không dùng mẫu
cũ; stale relay/SENT; tổng alert không theo preview; navigation GET-only;
empty; API error/recovery; invalid response. Bộ unit trung bình kiểm tra mẫu
cũ, actuator, không có số đo và trọng số bằng nhau.

DB cloud dùng container smartfarm-cloud-test cổng loopback 55439, không đụng DB
người dùng 5433. Integration schema telemetry_test; full app schema monitor_smoke.
Smoke seed ENV01 temp25/soil28, một alert mở, PUMP01 ON cũ. Backend 8080 MQTT và
control đều tắt, Vite 3000 dùng proxy thật. Script chặn API không phải GET và
request ngoài origin. Không có pageerror. Không chạy script với DB demo rồi
coi dữ liệu không đúng fixture là lỗi ứng dụng.

Các bộ browser automation/events/monitoring trước đó không chạy lại vì source
của chúng không đổi. Bộ backend64 vẫn bao gồm tất cả regression trước đó.
Không tự đánh dấu kiểm tra AWS/Wokwi/GPIO thành công từ fixture hoặc DB seed.

## Giới hạn

Đây là snapshot MVP một farm, không phải inventory AWS toàn tài khoản hoặc
xác nhận thiết bị online vật lý. Trung bình là current values có trọng số
bằng nhau, không phải time-weighted average. Count cảnh báo toàn bộ; chỉ
preview 5. Event list là read model từ nguồn hiện có, không phải immutable audit.
Không có pin/pH/lưu lượng giả hoặc lệnh điều khiển trực tiếp ở dashboard.
Chưa kiểm tra dữ liệu Windows/AWS live hoặc tải trên lịch sử rất lớn.

## Windows: năm bước

1. Pull feature branch sau khi push, giữ các thay đổi local.
2. Restart backend bằng Git Bash mới với helper hiện có; giữ frontend chạy.
3. Mở IoT → Tổng quan IoT, đối chiếu số sensor/khu vực/cảnh báo với trang riêng.
4. Giữ Wokwi chạy để thấy số đo mới; thử các nút mở Giám sát/Cảnh báo/Nhật ký.
5. Ngừng simulation để chờ số đo cũ rời trung bình; không coi đó là bằng chứng
   Wi-Fi mất. Trang chỉ đọc, không cần sửa IAM/build firmware/migration mới.

Hướng dẫn cloud start_skill đã cập nhật với API/test dashboard trong draft.
Đây là cấu hình đã lưu, chưa publish; không thay secret bindings hoặc network policy.
