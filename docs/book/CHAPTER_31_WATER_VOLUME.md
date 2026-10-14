# Chương 31 — Ước tính lượng nước từ FLOW và độ phủ dữ liệu

Ngày **15/10/2026, giờ Việt Nam**. Sau [tổng quan nông nghiệp](CHAPTER_30_AGRICULTURE_OVERVIEW.md),
màn **Tiêu thụ Nước & Điện** chuyển từ số mẫu sang tính từ telemetry nước đã
lưu. FLOW_RATE là L/min tại thời điểm đo; cộng trực tiếp các số FLOW không ra
lít. Đây là ước tính trên các đoạn quan sát được, chưa phải công tơ tổng.

## 1. Công thức và ranh giới

Dùng hình thang giữa hai mẫu: `lít = (q1 + q2) / 2 × giây / 60`.
Ví dụ6→6L/min trong5 giây cho0,5 lít;6→12 trong5 giây cho0,75 lít.
Nếu khoảng chọn dài60 giây nhưng chỉ hai đoạn5 giây hợp lệ, kết quả1,25 lít
chỉ thuộc10 giây được phủ.50 giây còn lại chưa có ước tính, không phải0 lít.

Đầu khoảng lấy cả mốc from, cuối không lấy mốc to: `[from,to)`. Không đọc
mẫu ngoài khoảng để ngoại suy hai mép, không kéo FLOW cuối tới “bây giờ”.
Ngay cả khi không có cặp bị loại, hai mép có thể thiếu dữ liệu. Độ phủ là tổng
thời gian các đoạn hợp lệ, chia toàn bộ thời gian chọn; không phải phần trăm
nước đã đo hoặc chứng nhận độ chính xác cảm biến.

Chỉ cặp **liền nhau trong danh sách tất cả packet của node** mới được xét.
SQL LEFT JOIN kênh FLOW, giữ cả packet thiếu kênh và khác nguồn; lọc bỏ chúng
trước sẽ có thể nối nhầm qua gián đoạn. Cặp cần:

- Cả hai đúng nguồn SIMULATOR/PHYSICAL/UNSPECIFIED đã chọn, không trộn nguồn.
- Kênh FLOW_RATE/L/min ở WATER/v2, quality VALID, số hữu hạn không âm.
- Cùng bootId, sequence tăng đúng1, cùng calibrationVersion (kể cả null).
- Thời gian nguồn tăng, cách nhau không quá15 giây; giờ nguồn không đi trước
  giờ nhận hơn2 giây và mẫu không đến trễ hơn30 giây.

Đây là điều kiện độ tin cậy **lúc nhận mẫu**, không phải yêu cầu dữ liệu lịch
sử còn mới hiện tại. Mẫu nhiều ngày trước vẫn được đọc nếu khoảng chọn đúng;
không đổi timestamp hoặc seed lại để cho nó trông như live. Duplicate packet
đã bị ingestion chặn từ trước. Cặp bị loại được ghi một lý do đầu tiên theo
thứ tự nguồn, thiếu, fault, clock, receipt, boot, seq, calibration, thời gian;
không đếm nhiều lý do trên cùng một cặp.

FLOW=0 VALID tạo lượng0 và có độ phủ. Fault/null hoặc chỉ một mẫu không có
đoạn hợp lệ: estimatedLitres=null, không ghi0. Khi có nhiều phiên bản hiệu
chuẩn, mỗi nhóm giữ lít/giây/số khoảng riêng, tổng chung=null. Null calibration
được ghi “chưa khai báo”, không tự gán thành một bản hiệu chuẩn thực địa.
Nguồn PHYSICAL và tên hiệu chuẩn vẫn do thiết bị khai báo.

## 2. API chỉ đọc, không thêm schema

GET `/api/v1/nodes/{nodeId}/channels/{channelId}/water-volume` yêu cầu from,
to và dataSource cụ thể. Khoảng tăng dần, tối đa24 giờ, từ năm1970, mốc to
không quá2 giây tương lai. Timestamp cần chính xác tới microsecond hoặc thô
hơn để không bị PostgreSQL làm tròn lệch biên; UI dùng giây/millisecond.

Response có nodeId/channelId/from/to/dataSource, method=TRAPEZOID_V1,
maxGapSeconds=15, packetCount (mọi nguồn, cả packet thiếu kênh),
sourcePacketCount, acceptedIntervals, excluded, coveredSeconds,
uncoveredSeconds, estimatedLitres và groups. Group có calibrationVersion,
intervals, coveredSeconds, estimatedLitres. `excluded` đếm cặp, không đếm giây;
accepted+sum(excluded)=max(packetCount−1,0).

Một request REPEATABLE_READ/read-only trả tối đa25.000 packet đầu vào, không
phân trang kết quả. Nếu có25.001 trở lên, trả422 cho **toàn bộ** phép tính,
yêu cầu khoảng ngắn hơn; không trả tổng đã cắt.400 cho range/source sai hoặc
thiếu param,404 cho node/kênh không phải FLOW nước. BigDecimal tính thời gian
và tích phân, guard kết quả quá miền số JSON hữu hạn trả422. Không lưu ledger
thể tích hay cache có thể bị hiểu là công tơ. Schema vẫn V19, firmware/IAM/
provisioning/telemetry không đổi; GET không phát lệnh hoặc tạo run.

## 3. Giao diện

IoT & Tự động hóa → **Tiêu thụ Nước & Điện** → Nước. Chọn node WATER có FLOW,
kênh, nguồn và khoảng theo giờ máy, tối đa24 giờ. Mặc định một giờ theo asOf
server và nguồn SIMULATOR. Đây là màn truy vấn: bấm Tính lượng nước để đọc
kết quả, không tự tăng lượng nước hoặc polling như công tơ live.

Hiển thị ước tính theo đoạn hợp lệ, độ phủ/giây chưa ước tính, số packet,
nhóm hiệu chuẩn và lý do loại. Đổi filter thì ẩn kết quả cũ đến khi áp dụng;
API lỗi/đang tải cũng ẩn, không giữ số cũ dưới source mới. Request cũ đến chậm
không ghi đè kết quả source mới. Đọc danh sách node lỗi sẽ khóa form tính.

Tab Điện ghi **Chưa có dữ liệu đo điện**. Các số nước/kWh/chi phí/ngày/tháng
và cảnh báo rò nước mẫu trước đây đã được bỏ khỏi màn này. Chưa có kênh công
tơ điện, chưa suy kWh từ ON/OFF relay, chưa quy tiền hoặc chia tổng FLOW thành
nước thực cấp cho từng zone/cây. Các màn analytics/mock khác không nằm trong
lượt này. Rule ENV01 và controller/van/coordinator chưa đổi.

## 4. Kiểm tra và bài học triển khai

| Kiểm tra trực tiếp trong cloud | Kết quả |
|---|---:|
| Maven verify với PostgreSQL riêng |194/194, skip0|
| WaterVolumeTest trong tổng backend |15/15|
| Browser API fixtures |16/16, skip0|
| Unit parser/scope/URL |5/5|
| Lint/build |Đạt, còn cảnh báo Vite cũ|
| Full-app/API/PostgreSQL, chỉ GET |Đạt trên lịch sử giữ lại|

Backend kiểm hình thang biến thiên,0/thiếu/fault, partial/khác nguồn, reboot/
seq/timegap, receipt/clock, nhiều calibration, biên cuối, đoạn dưới1 giây,
cap25.001, numeric overflow, HTTP và command/run không đổi. Browser kiểm
range rỗng/đảo, lỗi/retry, filter đổi, response cũ đến chậm, body sai, zero/
unknown/multical, canonical timestamp và empty registry.

Hai lỗi tiềm ẩn phát hiện khi rà mã đã được sửa trước khi nghiệm thu: input
ngày bị xóa không được gọi toISOString trên Invalid Date; response Java dạng
`...:00Z` và query JS `...:00.000Z` cần so thời điểm, không so chuỗi tuyệt đối.
Có test trình duyệt/unit tương ứng. Không có lượt test fail trong đợt này;
không coi những phát hiện khi đọc mã là sự cố đã xảy ra trên Windows/AWS.

Full-app dùng schema **agriculture_overview_smoke** đã giữ từ chương30 trên
PostgreSQL test55439, MQTT/control=false, không seed thêm. AGWATER có hai
FLOW=0/SIMULATOR cách nhau1 giây, receipt delay hợp lệ. Chọn khoảng5 giây bao
hai mẫu:0 lít, phủ1 giây=20%, thiếu4 giây. Đổi PHYSICAL: chưa đủ đoạn, không0
lít, SOURCE_CHANGE1. Kiểm cả Java timestamp chuẩn hóa và browser giờ Việt Nam;
menu thật mở đúng trang, tab Điện không có kWh giả. Command0/run0,4 packet/
12 reading/zone1/soil alert2/water alert1/soil ACK1 giữ nguyên.

[Script full-app](../../tools/frontend/smoke_water_volume.py) tự lấy khoảng
cố định từ timestamp fixture nên chạy lại sau nhiều ngày vẫn đọc đúng, không
cần sửa dữ liệu. Chỉ GET và chặn external. Không chạy AWS/Wokwi/GPIO thật hoặc
firmware build mới trong lượt backend/UI này. Chi tiết lệnh/log tại
[báo cáo](../implementation/LOCAL_WATER_VOLUME_REPORT.md).

## 5. Nghiệm thu Windows/AWS/Wokwi — Chưa chạy

Pull/restart backend/frontend trên branch hiện tại; không xóa volume, key
hoặc tạo lại certificate chỉ vì thêm phép tính. Cần WATER node/kênh FLOW đã
khai báo và có packet. Chỉ ENV01 hoặc chỉ đăng ký node mà chưa phát dữ liệu
thì màn sẽ không có thể tích; không lấy soil hoặc timer bơm thay FLOW.

| Ca mới cần nghiệm thu | Trạng thái |
|---|---|
| FLOW WATER phát qua AWS: đối chiếu L/min, thời gian, ước tính/độ phủ |Chưa chạy|
| FLOW=0 và fault/null hoặc mất packet cho kết quả khác nhau |Chưa chạy|
| Mất mạng/reboot: không nối tích phân qua boot/gap/receipt trễ |Chưa chạy|
| Hai nguồn/hiệu chuẩn: không trộn tổng, raw history giữ nguyên |Chưa chạy|
| Restart backend và truy vấn lại cùng khoảng lịch sử |Chưa chạy|

Nghiệm thu mô phỏng không xác nhận sai số đồng hồ thật, tổng nước cây nhận,
tổn thất/rò rỉ hoặc phân bổ chi phí. Cần hiệu chuẩn xung/thể tích và kiểm chứng
phần cứng trước khi dùng ước tính cho quyết định vận hành hoặc thanh toán.
