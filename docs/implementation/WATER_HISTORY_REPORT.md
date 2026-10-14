# Bàn giao — Lịch sử kênh trạm nước và CSV

Ngày 14/10/2026, sau V16. Không có migration mới, firmware/certificate hoặc
AWS operation. Hướng dẫn người dùng ở [chương 25](../book/CHAPTER_25_WATER_HISTORY.md).

## Phạm vi

API GET /api/v1/nodes/{nodeId}/channels/{channelId}/history, riêng WATER/v2.
Trả khai báo kênh và từng sample ID/value/quality/source/calibration/boot/sequence/
giờ đo/giờ nhận. Phao false, flow 0 và fault/null giữ đúng kiểu. Không đọc nhầm
legacy telemetry v1 hoặc giả số đo khi kênh rỗng.

Range mặc định 24 giờ, [from,to), tối đa 31 ngày; source/quality optional;
limit 1–1000 (UI dùng 100). Cursor keyset theo observed_at/id, gắn với
node/channel/range/source/quality, giữ cap ID từ lượt đầu. Read-only repeatable
read trong từng request, không là snapshot transaction xuyên HTTP: ID đã giữ
nhưng commit muộn có thể xuất hiện. Không tuyên bố snapshot kiểm toán tuyệt đối.
SQL parameterized, dùng các index hiện có; không thêm ingestion/public write.

Sensor Realtime → Node & trạm nước có nút lịch sử mỗi kênh WATER. Khi xem lịch
sử tạm dừng polling registry, quay lại tiếp tục. Range theo giờ máy rồi đổi
UTC, không auto mở rộng Đến. Bộ lọc thay đổi/API lỗi/response sai scope khóa
CSV và phân trang. Response cũ bị bỏ sau đổi request hoặc rời màn hình.

CSV UTF-8 BOM chỉ xuất trang đang thấy, giữ raw timestamp, số/boolean/null,
source và calibration từng mẫu. Chuỗi chống spreadsheet formula; số âm numeric
không bị sửa. Chưa tích phân lưu lượng, tính chi phí, comparison chart hoặc
export toàn bộ range; không thêm chart làm liền khoảng không có dữ liệu.
History không xác nhận trạng thái hiện tại hay quyền bật bơm.

## Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Maven verify / DB test riêng | 141 pass, 0 fail/error/skip |
| Trong đó WaterHistoryTest | 9 pass |
| Browser node/history | 18 pass (9 cũ, 9 mới) |
| Unit frontend node/history | 12 pass (6 cũ, 6 mới) |
| TypeScript lint / Vite build | Đạt, warning Vite cũ |
| Full app/API/PostgreSQL + CSV thật | Đạt, GET-only, MQTT/control=false |

Backend kiểm tra boundary [from,to), dữ liệu lịch sử, false/0/fault/source,
hiệu chuẩn, timestamp ties, insert muộn sau cap, cursor scope, malformed/query
validation, metadata/defaults và unknown channel. Mỗi test kiểm tra không
thêm pump_command/watering_run; dùng schema telemetry_test/port 55439 riêng.
Không chạy test trên database demo.

Unit có test order microsecond: không dùng Date.parse millisecond để nhầm thứ
tự hai timestamp trong cùng ms; bảo vệ CSV formula không làm hỏng số âm. Browser
có download thật, phân trang thay bảng, source/quality request, outage/identity
mismatch, response cũ và range invalid. Lần đầu 16 đạt/1 lỗi ở thao tác Playwright
fill datetime-local giây 00; sửa input test dạng phút và sửa UI so sánh thời điểm
thay raw string. Thêm test minute-only; lượt cuối 18/18 đạt, không skip.

Log /tmp/water-history-{backend-final,browser-final,unit,lint,build}.log.
Chạy lại các lệnh test đã có trong cloud chỉ khi đổi code/lỗi cần xác minh:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:nodes
node --import tsx --test src/modules/iot/nodes/nodeApi.test.ts src/modules/iot/nodes/waterHistoryApi.test.ts
npm run lint
npm run build
```

## Smoke trên dữ liệu đã lưu

Backend mới chạy jar cuối với schema **water_alert_smoke**, PostgreSQL test
55439, MQTT/control=false; trước build đã dừng đúng backend do nhiệm vụ tạo.
Flyway vẫn V16, đọc lại fixture WATERALARM đã tạo qua parser/router ở đợt trước,
không seed/viết lại hoặc giả AWS lần này.

`tools/frontend/smoke_water_history.py` đi qua menu ứng dụng thật, mở lịch sử
LOW/FLOW, đọc 4 mẫu/kênh; PHYSICAL rỗng, SIMULATOR/VALID trả 4. Tải CSV bằng browser,
đọc CSV thật và kiểm tra ID [4,3,2,1]; LOW=[true,true,false,false], FLOW=[0,0,0,0].
Guard chặn request ngoài origin và mọi API write. Không thêm endpoint test để seed.

SQL trước/sau: 4 node_sample / 12 channel_sample, 1 water_alert đã xem/đã hết,
command=0/run=0. Ghi chú V16 vẫn còn. Log /tmp/water-history-smoke.log,
artifact /tmp/water-history-{LOW,FLOW}.{csv,png}. Ảnh chụp tắt animation, không
bỏ assertion chức năng. Không thay bằng chứng này cho AWS/Wokwi/flow vật lý.

Có thể chạy lại smoke GET-only trên fixture giữ nguyên. Script đọc bằng chứng
mở/hết đợt WATERALARM từ API, chọn range quanh fixture rồi áp dụng trên UI,
không phụ thuộc default 24 giờ khi chạy lại ngày khác. Không tạo lại dữ liệu
để làm cho readiness đạt. Giờ input được đổi sang timezone của browser.

## Người dùng tiếp tục

Pull nhánh feature, restart backend với cấu hình/database đang dùng, mở Sensor
Realtime → Node & trạm nước → Lịch sử WATER01 FLOW (hoặc node đã có). Không flash
lại hay chạy provisioning để chữa lỗi không có mẫu. Đổi giờ/range/source cho đúng.
Nghiệm thu AWS/Wokwi/Excel Windows ở chương 25 còn Chưa chạy; pump no-flow
cutoff, tổng lít, nhiều zone và NVS chưa triển khai trong đợt này.
