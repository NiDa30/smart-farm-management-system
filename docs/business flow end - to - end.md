# BUSINESS FLOW END-TO-END  
## Hệ thống quản lý nông nghiệp tích hợp IoT

---

# 1. Mục tiêu của Business Flow

Business Flow mô tả cách dữ liệu và nghiệp vụ di chuyển xuyên suốt hệ thống:

**Thiết lập trang trại  
→ Quản lý cây  
→ Chăm sóc  
→ Sử dụng vật tư  
→ IoT giám sát  
→ Phát hiện vấn đề  
→ Điều trị  
→ Thu hoạch  
→ Bán hàng  
→ Doanh thu  
→ Báo cáo & phân tích**

Các phân hệ tham gia:

1. Hệ thống & Phân quyền
2. Sản xuất & Cây trồng
3. Vật tư nông nghiệp
4. IoT & Tự động hóa
5. Kinh doanh & Khách hàng
6. Báo cáo & Phân tích

---

# 2. FLOW 01 — Khởi tạo trang trại

## Mục tiêu

Thiết lập cấu trúc cơ bản để toàn bộ dữ liệu sau này có thể gắn đúng vị trí.

## Flow

**Admin tạo trang trại**

→ Khai báo thông tin trang trại

→ Tạo khu vực

→ Tạo vườn / lô / nhà kính

→ Tạo hàng / luống

→ Thiết lập sơ đồ khu vực

→ Tạo tài khoản người dùng

→ Gán vai trò

→ Gán quyền truy cập

→ Hệ thống sẵn sàng vận hành.

## Ví dụ

```text
Trang trại Dừa A
    ↓
Khu Bắc
    ↓
Vườn 01
    ↓
Hàng A
    ↓
A001 → A020
```

## Phân hệ liên quan

**Hệ thống & Phân quyền**

→ tạo người dùng và quyền.

**Sản xuất & Cây trồng**

→ tạo cấu trúc trang trại.

---

# 3. FLOW 02 — Khởi tạo cây trồng

## Mục tiêu

Đưa cây thực tế ngoài vườn vào hệ thống.

## Flow

**Chọn khu trồng**

→ chọn loại cây

→ chọn giống

→ nhập ngày trồng

→ khai báo vị trí

→ hệ thống sinh mã cây

→ tạo QR Code

→ cây xuất hiện trên sơ đồ vườn

→ tạo hồ sơ cây

→ gán quy trình chăm sóc mặc định.

## Ví dụ

```text
Vườn Dừa A
    ↓
Khu Bắc
    ↓
Hàng A
    ↓
A023
```

Thông tin:

```text
Mã: COC-A023
Giống: Dừa xiêm xanh
Ngày trồng: 10/05/2023
Trạng thái: Sinh trưởng
Sức khỏe: Bình thường
```

## Kết quả

Cây bắt đầu có:

- Hồ sơ riêng
- Timeline riêng
- Lịch chăm sóc
- Lịch bón phân
- Lịch kiểm tra
- Lịch sử sâu bệnh
- Lịch sử thu hoạch.

---

# 4. FLOW 03 — Theo dõi sinh trưởng cây

## Flow

**Đến kỳ kiểm tra**

→ tạo công việc kiểm tra cây

→ nhân viên quét QR cây

→ mở hồ sơ

→ nhập thông số sinh trưởng

→ chụp ảnh

→ ghi tình trạng cây

→ hệ thống lưu Growth Record

→ cập nhật biểu đồ sinh trưởng

→ kiểm tra bất thường.

## Ví dụ

```text
A023
↓
Chiều cao: 3.4m
Số tàu lá: 23
Số buồng: 6
Số trái: 41
Tình trạng: Bình thường
```

Lần sau:

```text
Số trái: 35
```

Lần sau:

```text
Số trái: 28
```

Hệ thống có thể đánh dấu:

```text
⚠ Năng suất có xu hướng giảm
```

và đưa cây vào danh sách cần kiểm tra.

---

# 5. FLOW 04 — Lập kế hoạch chăm sóc

## Mục tiêu

Chuyển quy trình kỹ thuật thành công việc thực tế.

## Flow

**Loại cây**

+ **Giống**

+ **Tuổi cây**

+ **Giai đoạn sinh trưởng**

→ xác định quy trình chăm sóc

→ hệ thống sinh lịch công việc.

Ví dụ:

```text
Dừa xiêm
4 năm tuổi
Giai đoạn cho trái
```

Hệ thống tạo:

```text
05/10 — Kiểm tra sâu bệnh
10/10 — Bón phân
12/10 — Kiểm tra độ ẩm
15/10 — Vệ sinh gốc
20/10 — Kiểm tra trái
```

Sau đó:

**Task được giao**

→ nhân viên thực hiện

→ nhập kết quả

→ hoàn thành

→ ghi vào nhật ký cây.

---

# 6. FLOW 05 — Bón phân

Đây là flow kết nối mạnh giữa:

**Cây trồng + Công việc + Kho + Chi phí**

## Flow

**Đến kỳ bón**

→ kiểm tra cây

→ kiểm tra giai đoạn sinh trưởng

→ kiểm tra điều kiện môi trường

→ xác định công thức phân

→ tạo công việc bón phân.

Sau đó:

**Nhân viên thực hiện**

→ chọn vật tư sử dụng

→ nhập số lượng thực tế

→ hoàn thành công việc.

Hệ thống tự động:

```text
Trừ kho
+
Ghi lịch sử bón phân
+
Ghi chi phí cây
+
Ghi nhật ký cây
```

## Ví dụ

```text
A023
↓
NPK 16-16-8
↓
1.5 kg
↓
Kho: -1.5 kg
↓
Chi phí: +27.000đ
↓
Nhật ký:
10/10/2026 — Bón 1.5 kg NPK
```

---

# 7. FLOW 06 — Mua vật tư

## Flow chuẩn

**Kho sắp thiếu vật tư**

→ người phụ trách kiểm tra

→ chọn nhà cung cấp

→ tạo đơn mua

→ nhà cung cấp giao hàng

→ nhân viên xác nhận nhận hàng.

Ngay khi xác nhận:

```text
Kho tự tăng
+
Tạo lịch sử mua
+
Cập nhật giá
+
Tạo công nợ/chi phí
```

Không cần tạo thêm đề xuất nhập kho.

## Ví dụ

```text
Mua:
NPK = 500 kg

↓ nhận đủ

Inventory:
+500 kg

Expense:
+9.000.000đ

Supplier history:
+1 transaction
```

---

# 8. FLOW 07 — Mua nhanh

Trường hợp chủ trang trại đi mua trực tiếp.

## Flow

**Chọn Mua nhanh**

→ chọn nhà cung cấp

→ nhập vật tư

→ nhập số lượng

→ nhập giá

→ chọn kho

→ xác nhận.

Hệ thống:

```text
Tăng kho
+
Tạo chi phí
+
Cập nhật giá gần nhất
+
Lưu hóa đơn
```

---

# 9. FLOW 08 — Phát hiện sâu bệnh

## Flow

**Nhân viên kiểm tra cây**

→ phát hiện triệu chứng

→ quét QR cây

→ chọn "Báo cáo sâu bệnh"

→ nhập triệu chứng

→ chụp ảnh

→ chọn mức độ

→ tạo Pest/Disease Case.

Sau đó hệ thống:

**Triệu chứng**

→ đối chiếu thư viện sâu bệnh

→ hiển thị các bệnh có khả năng liên quan

→ hiển thị phương pháp xử lý

→ hiển thị thuốc phù hợp.

Người phụ trách:

→ xác định bệnh

→ chọn phương án điều trị.

---

# 10. FLOW 09 — Điều trị sâu bệnh

## Flow

```text
Disease Case
↓
Chọn phương án điều trị
↓
Chọn thuốc
↓
Kiểm tra tồn kho
```

Nếu đủ:

```text
Tạo task điều trị
↓
Nhân viên thực hiện
↓
Xuất thuốc khỏi kho
↓
Ghi liều lượng
↓
Ghi người thực hiện
↓
Tạo lịch tái kiểm tra
```

Sau X ngày:

```text
Kiểm tra lại
↓
Đánh giá hiệu quả
```

Có thể:

```text
Khỏi
↓
Đóng case
```

hoặc:

```text
Chưa khỏi
↓
Điều chỉnh phương án
↓
Tiếp tục điều trị
```

## Dữ liệu được cập nhật

- Hồ sơ cây
- Nhật ký cây
- Kho thuốc
- Chi phí
- Lịch sử bệnh
- Hiệu quả thuốc.

---

# 11. FLOW 10 — IoT Monitoring

## Flow

```text
Sensor
↓
ESP32
↓
MQTT Broker
↓
IoT Backend
↓
Database
↓
Dashboard
```

Ví dụ:

```text
Soil Sensor
↓
31%
```

Hệ thống:

→ lưu telemetry

→ cập nhật dashboard

→ cập nhật trạng thái khu

→ kiểm tra rule.

---

# 12. FLOW 11 — IoT Automation

Ví dụ automation tưới.

## Flow

Sensor gửi:

```text
Soil Moisture = 27%
```

Rule Engine kiểm tra:

```text
Soil < 30% ?        YES
Tank > 20% ?        YES
Rain = false ?      YES
Pump healthy ?      YES
```

→ cho phép automation.

Hệ thống:

```text
Open Valve A
↓
Start Pump P01
↓
Water 10 minutes
↓
Stop Pump
↓
Close Valve
↓
Read sensor again
```

Sau đó:

```text
Soil = 43%
```

Hệ thống ghi:

```text
Irrigation successful
```

và cập nhật:

- Nhật ký IoT
- Nhật ký tưới
- Lượng nước
- Thời gian máy bơm
- Chi phí điện/nước.

---

# 13. FLOW 12 — IoT phát hiện lỗi

Ví dụ:

```text
Valve = OPEN
```

nhưng:

```text
Flow Meter = 0 L/min
```

Hệ thống phát hiện:

```text
Van mở nhưng không có nước
```

→ dừng pump nếu cần

→ tạo cảnh báo Critical

→ tạo sự kiện IoT

→ có thể tạo công việc:

```text
Kiểm tra Valve V03
```

→ gán cho người phụ trách.

---

# 14. FLOW 13 — Thiết bị IoT từ mua đến vận hành

## Flow

**Mua sensor**

→ nhà cung cấp

→ nhận hàng

→ thiết bị được thêm vào kho

→ tạo Asset / IoT Device

→ trạng thái:

```text
IN_STOCK
```

Sau đó:

**Kỹ thuật viên lắp đặt**

→ chọn khu

→ chọn gateway

→ cấu hình Device ID

→ test connection

→ trạng thái:

```text
ACTIVE
```

→ thiết bị xuất hiện trong IoT Dashboard.

Như vậy:

**Phân hệ 3**

quản lý vòng đời tài sản.

**Phân hệ 4**

quản lý hoạt động realtime.

---

# 15. FLOW 14 — Thiết bị IoT hỏng

## Flow

IoT phát hiện:

```text
Sensor offline
```

→ cảnh báo

→ kiểm tra thời gian offline

→ nếu vượt threshold

→ tạo maintenance request.

Kỹ thuật viên:

→ kiểm tra

→ sửa chữa / thay thiết bị

→ ghi linh kiện sử dụng

→ ghi chi phí

→ test lại.

Nếu thành công:

```text
ACTIVE
```

Nếu không:

```text
RETIRED
```

---

# 16. FLOW 15 — Thu hoạch

## Flow

**Đến thời điểm thu hoạch**

→ tạo task thu hoạch

→ chọn cây

→ ghi số lượng

→ cân khối lượng

→ phân loại.

Ví dụ:

```text
A023

Thu hoạch:
15 trái

Loại A: 11
Loại B: 3
Lỗi: 1
```

Hệ thống:

→ cập nhật sản lượng cây

→ cập nhật lịch sử thu hoạch

→ cập nhật KPI cây

→ tạo sản phẩm sau thu hoạch.

---

# 17. FLOW 16 — Từ thu hoạch sang kho thành phẩm

## Flow

```text
Harvest
↓
Quality Classification
↓
Commercial Product
↓
Finished Goods Inventory
```

Ví dụ:

```text
1000 trái dừa

↓ phân loại

A = 750
B = 200
Reject = 50

↓ kho

Dừa A: +750
Dừa B: +200
```

---

# 18. FLOW 17 — Khách hàng đặt hàng

## Flow

**Khách hàng**

→ yêu cầu báo giá

→ nhân viên tạo báo giá

→ hệ thống lấy bảng giá

→ gửi báo giá

→ khách xác nhận.

Sau đó:

```text
Quotation
↓
Convert to Order
```

Không nhập lại dữ liệu.

---

# 19. FLOW 18 — Xử lý đơn hàng

## Flow

**Đơn hàng được xác nhận**

→ kiểm tra tồn kho

→ giữ hàng.

Ví dụ:

```text
On Hand = 1000
Reserved = 600
Available = 400
```

Đơn hàng:

```text
Customer A
500 trái
```

Nếu đủ:

→ reserve 500.

Nếu chưa đủ:

→ kiểm tra dự kiến thu hoạch.

Hệ thống hiển thị:

```text
Hiện có: 400
Dự kiến thu hoạch: 300
Thiếu hiện tại: 100
```

Người phụ trách quyết định có nhận đơn hay không.

---

# 20. FLOW 19 — Giao hàng

## Flow

```text
Order confirmed
↓
Prepare goods
↓
Create delivery
↓
Pick goods
↓
Ship
↓
Customer receives
↓
Confirm delivery
```

Khi xuất hàng:

```text
Kho thành phẩm giảm
```

Sau xác nhận:

```text
Order = DELIVERED
```

---

# 21. FLOW 20 — Thanh toán

## Flow

Đơn hàng:

```text
Total = 10.000.000đ
```

Khách trả:

```text
6.000.000đ
```

Hệ thống:

```text
Paid = 6.000.000
Receivable = 4.000.000
```

Sau khi thanh toán đủ:

```text
Receivable = 0
Order = COMPLETED
```

Doanh thu được cập nhật vào báo cáo.

---

# 22. FLOW 21 — Khiếu nại khách hàng

## Flow

**Khách báo sản phẩm lỗi**

→ chọn đơn hàng

→ chọn sản phẩm

→ nhập số lượng lỗi

→ ảnh

→ lý do.

Hệ thống truy xuất:

```text
Order
↓
Product Lot
↓
Harvest Batch
↓
Garden
↓
Tree
```

Nhờ đó biết sản phẩm đến từ đâu.

Sau đó xử lý:

- Đổi hàng
- Hoàn tiền
- Giảm giá
- Ghi nhận lỗi chất lượng.

---

# 23. FLOW 22 — Truy xuất nguồn gốc

Ví dụ khách quét QR:

```text
LOT-COC-20261015-A
```

Hệ thống có thể truy:

```text
Product Lot
↓
Harvest
↓
Trees
↓
Garden
↓
Plant history
↓
Fertilizer history
↓
Disease treatment
↓
Harvest date
```

Dữ liệu nội bộ nhạy cảm không cần hiển thị cho khách.

---

# 24. FLOW 23 — Chi phí tới từng cây

Mỗi hoạt động đều có thể tạo chi phí.

Ví dụ cây:

```text
A023
```

Trong năm:

```text
Phân bón       250.000
Thuốc           70.000
Nước            80.000
Điện            30.000
Chi phí khác    20.000
```

Tổng:

```text
450.000đ
```

Thu hoạch:

```text
115 trái
```

Bán:

```text
1.840.000đ
```

Hệ thống có thể tính:

```text
Direct Profit
=
Revenue - Direct Cost
```

---

# 25. FLOW 24 — Báo cáo quản trị

Dữ liệu từ tất cả các phân hệ:

```text
Plant
Inventory
IoT
Harvest
Order
Expense
Revenue
Disease
Maintenance
```

↓ được đưa vào:

```text
Analytics
```

Dashboard có thể trả lời:

```text
Trang trại đang thế nào?
```

```text
Khu nào hiệu quả?
```

```text
Cây nào kém năng suất?
```

```text
Bệnh nào xuất hiện nhiều?
```

```text
Thiết bị nào thường lỗi?
```

```text
Nước đang dùng bao nhiêu?
```

```text
Chi phí nào đang tăng?
```

---

# 26. FLOW 25 — Phát hiện bất thường

Ví dụ hệ thống phát hiện:

```text
A023:
Năng suất thấp hơn nhóm cùng tuổi 30%
```

Kết hợp:

```text
Soil Moisture thường thấp
+
2 lần bị sâu bệnh
+
EC thấp
```

Hệ thống:

→ đánh dấu cây cần kiểm tra

→ hiển thị nguyên nhân dữ liệu liên quan

→ có thể tạo task kiểm tra.

Không tự kết luận nguyên nhân nếu chưa đủ dữ liệu.

---

# 27. FLOW 26 — Báo cáo dự báo

Khi hệ thống đã có đủ dữ liệu lịch sử:

```text
Historical Harvest
+
Growth
+
Weather
+
IoT
+
Plant Age
```

→ mô hình phân tích.

Có thể đưa ra:

```text
Estimated harvest next month:
1,500–1,700 fruits
```

hoặc:

```text
Expected NPK demand:
450 kg
```

hoặc:

```text
Zone B:
increased disease risk
```

---

# 28. MASTER FLOW — Toàn bộ hệ thống

Luồng tổng thể quan trọng nhất:

```text
ADMIN
│
├── Tạo trang trại
├── Tạo khu vực
├── Tạo người dùng
└── Phân quyền
        │
        ▼
CÂY TRỒNG
│
├── Tạo cây
├── Định vị cây
├── Theo dõi sinh trưởng
├── Lập lịch chăm sóc
└── Theo dõi sức khỏe
        │
        ├─────────────────────────┐
        ▼                         ▼
CÔNG VIỆC                      IOT
│                               │
├── Tưới                        ├── Sensor
├── Bón phân                    ├── Monitoring
├── Kiểm tra                    ├── Control
├── Cắt tỉa                     ├── Automation
└── Điều trị                    └── Alert
        │                         │
        └──────────────┬──────────┘
                       ▼
                    VẬT TƯ
                       │
                ├── Xuất kho
                ├── Chi phí
                └── Nhà cung cấp
                       │
                       ▼
                   CÂY TRỒNG
                       │
                 ├── Sinh trưởng
                 ├── Sâu bệnh
                 └── Năng suất
                       │
                       ▼
                   THU HOẠCH
                       │
                 ├── Phân loại
                 └── Kho thành phẩm
                       │
                       ▼
                   KINH DOANH
                       │
                 ├── Khách hàng
                 ├── Báo giá
                 ├── Đơn hàng
                 ├── Giao hàng
                 └── Thanh toán
                       │
                       ▼
                    TÀI CHÍNH
                       │
                 ├── Doanh thu
                 ├── Chi phí
                 └── Lợi nhuận
                       │
                       ▼
               BÁO CÁO & PHÂN TÍCH
                       │
                 ├── KPI
                 ├── Benchmark
                 ├── Alert
                 ├── Prediction
                 └── Decision Support
```

---

# 29. Các phân hệ liên kết với nhau như thế nào

## Sản xuất ↔ Vật tư

```text
Công việc
→ dùng vật tư
→ trừ kho
→ phát sinh chi phí
```

## Sản xuất ↔ IoT

```text
Cây/Khu
→ Sensor
→ dữ liệu môi trường
→ automation
→ nhật ký chăm sóc
```

## Sản xuất ↔ Sâu bệnh

```text
Cây
→ phát hiện bệnh
→ điều trị
→ dùng thuốc
→ cập nhật sức khỏe
```

## Sản xuất ↔ Kinh doanh

```text
Cây
→ thu hoạch
→ sản phẩm
→ bán hàng
```

## Vật tư ↔ Nhà cung cấp

```text
Mua hàng
→ nhận hàng
→ kho tăng
→ công nợ/chi phí
```

## IoT ↔ Thiết bị tài sản

```text
Asset Device
→ Install
→ Activate
→ IoT Device
→ Monitoring
```

## Kinh doanh ↔ Tài chính

```text
Order
→ Delivery
→ Payment
→ Revenue
```

## Tất cả ↔ Báo cáo

```text
Operational Data
→ Analytics
→ KPI
→ Decision Support
```

---

# 30. Nguyên tắc thiết kế xuyên suốt

Một hành động của người dùng chỉ nên nhập **một lần**.

Ví dụ:

```text
Nhận hàng
```

không cần:

```text
Nhận hàng
→ sang Kho
→ nhập lại phiếu
```

mà phải:

```text
Nhận hàng
→ Kho tự tăng
```

Tương tự:

```text
Bón phân hoàn thành
→ kho tự giảm
→ chi phí tự tăng
→ nhật ký cây tự cập nhật
```

và:

```text
Thu hoạch
→ tạo nguồn hàng
→ phân loại
→ tăng kho thành phẩm
```

Business Flow phải hướng đến:

**Một nghiệp vụ → nhiều dữ liệu liên quan tự động cập nhật.**

Đây là nguyên tắc quan trọng nhất để hệ thống không trở thành một tập hợp nhiều module rời rạc.