# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Frontend Architect + Inventory System Analyst + Agricultural Operations Analyst**, có kinh nghiệm thiết kế:

- Farm Management System
- Agricultural Inventory
- Warehouse Management
- Procurement
- Supplier Management
- Asset Management
- IoT Asset Management
- Maintenance Management
- Cost Tracking
- Farm Financial Management

Nhiệm vụ của bạn là thiết kế và triển khai UI cho:

# PHÂN HỆ 3 — VẬT TƯ NÔNG NGHIỆP

thuộc hệ thống **Smart Farm Management System**.

---

# 1. MỤC TIÊU PHÂN HỆ

Phân hệ này quản lý toàn bộ nguồn lực vật chất của trang trại:

```text
Nhà cung cấp
→ Mua hàng
→ Nhận hàng
→ Kho
→ Xuất sử dụng
→ Công việc / Cây / Khu
→ Chi phí
```

đồng thời quản lý:

```text
Thiết bị
→ Tài sản
→ Thiết bị IoT
→ Lắp đặt
→ Bảo trì
→ Sửa chữa
→ Hiệu chuẩn
```

Phân hệ phải trả lời được:

- Trang trại hiện có những vật tư nào?
- Còn bao nhiêu?
- Đang nằm ở đâu?
- Sắp hết hay sắp hết hạn không?
- Mua từ nhà cung cấp nào?
- Giá mua gần nhất bao nhiêu?
- Vật tư đã được sử dụng cho cây/khu nào?
- Trang trại đang sở hữu thiết bị nào?
- Thiết bị IoT nào đang ở trong kho, đang lắp hoặc đang hoạt động?
- Thiết bị nào cần bảo trì?
- Chi phí của từng hoạt động là bao nhiêu?

---

# 2. NGUYÊN TẮC NGHIỆP VỤ QUAN TRỌNG

## Mua hàng không nhập kho hai lần

Flow:

```text
Nhà cung cấp
→ Tạo đơn mua
→ Nhận hàng
→ Xác nhận số lượng thực nhận
→ Kho tự động tăng
```

Không tạo thêm bước:

```text
Nhận hàng
→ Đề xuất nhập kho
→ Nhập lại dữ liệu
```

Sai.

---

## Kho chỉ tăng khi hàng thực sự được nhận

Ví dụ:

```text
Đặt mua: 500 kg NPK
```

Nhưng mới nhận:

```text
300 kg
```

thì:

```text
Tồn kho +300 kg
```

Khi nhận tiếp:

```text
200 kg
```

thì:

```text
Tồn kho +200 kg
```

---

## Một nghiệp vụ cập nhật nhiều dữ liệu

Ví dụ:

```text
Nhận 500 kg NPK
```

hệ thống tự động:

```text
→ Tăng kho
→ Tạo lô hàng
→ Ghi giá nhập
→ Cập nhật lịch sử nhà cung cấp
→ Ghi công nợ / giao dịch tài chính
```

Tương tự:

```text
Xuất 1.5 kg NPK cho cây A023
```

tự động:

```text
→ Kho giảm
→ Task cập nhật
→ Nhật ký cây cập nhật
→ Chi phí cây cập nhật
```

---

# 3. CÁC MODULE CHÍNH

Phân hệ 3 gồm:

1. Dashboard vật tư
2. Danh mục vật tư
3. Nhà cung cấp
4. Mua hàng
5. Nhận hàng
6. Kho & Tồn kho
7. Xuất kho
8. Điều chuyển
9. Kiểm kê
10. Thiết bị & Tài sản
11. Thiết bị IoT
12. Lắp đặt & Gán thiết bị
13. Bảo trì & Sửa chữa
14. Hiệu chuẩn thiết bị
15. Chi phí trang trại
16. Tài chính & Hiệu quả
17. Cảnh báo

---

# 4. SIDEBAR PHÂN HỆ

```text
Vật tư nông nghiệp
│
├── Tổng quan
│
├── Vật tư
│   ├── Danh mục vật tư
│   ├── Kho & tồn kho
│   ├── Xuất kho
│   ├── Điều chuyển
│   └── Kiểm kê
│
├── Mua hàng
│   ├── Nhà cung cấp
│   ├── Đơn mua
│   └── Nhận hàng
│
├── Thiết bị & Tài sản
│   ├── Thiết bị thông thường
│   ├── Thiết bị IoT
│   ├── Lắp đặt
│   ├── Bảo trì
│   └── Hiệu chuẩn
│
├── Chi phí
│
└── Cảnh báo
```

---

# 5. SCREEN 01 — DASHBOARD VẬT TƯ

## Mục tiêu

Cho quản lý biết nhanh:

- Giá trị tồn kho
- Vật tư sắp hết
- Vật tư sắp hết hạn
- Đơn mua đang giao
- Thiết bị đang hoạt động
- Thiết bị hỏng
- Thiết bị cần bảo trì
- Chi phí tháng hiện tại

---

## KPI

```text
Giá trị tồn kho
182.500.000đ

Vật tư sắp hết
8

Sắp hết hạn
5

Đơn mua đang giao
4

Thiết bị
126

Thiết bị IoT
48

Cần bảo trì
7

Chi phí tháng
42.300.000đ
```

---

## Main Layout

```text
┌──────────────────────────────┬──────────────────────────┐
│ Tồn kho quan trọng           │ Đơn mua gần đây         │
├──────────────────────────────┼──────────────────────────┤
│ Cảnh báo                     │ Bảo trì sắp tới         │
├──────────────────────────────┴──────────────────────────┤
│ Xu hướng chi phí                                        │
└─────────────────────────────────────────────────────────┘
```

---

# 6. SCREEN 02 — DANH MỤC VẬT TƯ

## Header

```text
Danh mục vật tư

Quản lý vật tư phục vụ sản xuất

                         [+ Thêm vật tư]
```

---

## Filter

```text
[Tìm tên / mã...]

[Nhóm ▼]
[Trạng thái ▼]
[Nhà sản xuất ▼]
[Kho ▼]
```

---

## Table

Các cột:

```text
Mã
Tên vật tư
Nhóm
Đơn vị
Quy cách
Tồn kho
Tồn tối thiểu
Giá gần nhất
Hạn gần nhất
Trạng thái
Actions
```

Ví dụ:

```text
FERT-001

NPK 16-16-8

Phân bón

kg

Bao 25kg

350 kg

100 kg

18.000đ/kg

20/05/2027

● Bình thường
```

---

# 7. SCREEN 03 — CHI TIẾT VẬT TƯ

Header:

```text
NPK 16-16-8

FERT-001

● Đang sử dụng

[Chỉnh sửa]
```

Tabs:

```text
Tổng quan
Tồn kho
Lô hàng
Lịch sử nhập
Lịch sử xuất
Nhà cung cấp
Giá
Chi phí
```

---

## Tổng quan

Hiển thị:

```text
Nhóm:
Phân bón

Đơn vị:
kg

Quy cách:
Bao 25 kg

Nhà sản xuất:
ABC

Tồn hiện tại:
350 kg

Mức tối thiểu:
100 kg

Giá gần nhất:
18.000đ/kg
```

---

# 8. SCREEN 04 — NHÀ CUNG CẤP

## Header

```text
Nhà cung cấp

Quản lý đối tác cung cấp vật tư và thiết bị

                         [+ Thêm nhà cung cấp]
```

---

## Table

```text
Mã
Nhà cung cấp
Liên hệ
Nhóm cung cấp
Số đơn mua
Công nợ
Đánh giá
Trạng thái
```

---

# 9. SCREEN 05 — CHI TIẾT NHÀ CUNG CẤP

Header:

```text
Công ty Nông Nghiệp ABC

SUP-001

● Đang hợp tác
```

Tabs:

```text
Tổng quan
Sản phẩm cung cấp
Đơn mua
Lịch sử giao hàng
Lịch sử giá
Công nợ
Đánh giá
```

---

## Sản phẩm cung cấp

Table:

```text
Vật tư
Giá hiện tại
Đơn vị
MOQ
Thời gian giao
Giá cập nhật
```

Ví dụ:

```text
NPK 16-16-8
18.000đ
kg
100 kg
2 ngày
01/10/2026
```

---

# 10. SCREEN 06 — DANH SÁCH ĐƠN MUA

Header:

```text
Đơn mua

                          [+ Tạo đơn mua]
```

Filter:

```text
[Nhà cung cấp ▼]
[Trạng thái ▼]
[Ngày từ]
[Ngày đến]
```

---

## Table

```text
PO
Nhà cung cấp
Ngày đặt
Tổng tiền
Đã nhận
Trạng thái
Dự kiến giao
Actions
```

Trạng thái:

```text
DRAFT
ORDERED
SHIPPING
PARTIALLY_RECEIVED
RECEIVED
COMPLETED
CANCELLED
```

UI:

```text
Nháp
Đã đặt
Đang giao
Nhận một phần
Đã nhận đủ
Hoàn tất
Đã hủy
```

---

# 11. SCREEN 07 — TẠO ĐƠN MUA

## Header

```text
Tạo đơn mua
```

---

## Section 1 — Nhà cung cấp

```text
Nhà cung cấp *

Ngày đặt *

Ngày dự kiến giao

Kho nhận *
```

---

## Section 2 — Vật tư

Table editable:

```text
Vật tư
Đơn vị
Số lượng
Đơn giá
Chiết khấu
Thành tiền
```

Button:

```text
+ Thêm dòng
```

---

## Summary

```text
Tạm tính
8.500.000đ

Thuế
850.000đ

Vận chuyển
300.000đ

Tổng
9.650.000đ
```

---

## Actions

```text
[Lưu nháp]

[Đặt hàng]
```

---

# 12. SCREEN 08 — CHI TIẾT ĐƠN MUA

Header:

```text
PO-2026-00125

Công ty ABC

● Đang giao
```

Actions:

```text
[Nhận hàng]

[Chỉnh sửa]

[Hủy]
```

---

## Progress

```text
Đã đặt
✓

Đang giao
✓

Đã nhận
○

Hoàn tất
○
```

---

## Item Table

```text
Vật tư
Đặt
Đã nhận
Còn lại
Đơn giá
```

Ví dụ:

```text
NPK

500 kg

300 kg

200 kg

18.000đ
```

---

# 13. SCREEN 09 — NHẬN HÀNG

Đây là màn hình nghiệp vụ quan trọng.

Header:

```text
Nhận hàng từ PO-2026-00125
```

---

## Purchase Information

```text
Nhà cung cấp:
ABC

Kho nhận:
Kho chính

Ngày nhận:
05/10/2026
```

---

## Receive Table

```text
Vật tư
Đặt mua
Đã nhận
Còn lại
Nhận lần này
Lô
Hạn sử dụng
```

Ví dụ:

```text
NPK

500

300

200

[200]

[LOT-251005]

[05/2027]
```

---

## Confirm

Button:

```text
[Xác nhận nhận hàng]
```

Sau khi xác nhận:

```text
Inventory +200
Purchase Order → Received
Batch → Created
Supplier History → Updated
Cost / Payable → Updated
```

Không yêu cầu nhập kho lại.

---

# 14. SCREEN 10 — MUA NHANH

Dùng cho trường hợp mua trực tiếp.

Form:

```text
Nhà cung cấp

Kho nhận

Vật tư

Số lượng

Giá

Lô

Hạn sử dụng

Hóa đơn / Ảnh
```

Button:

```text
[Hoàn tất mua hàng]
```

Sau save:

```text
Kho tăng
+
Chi phí tăng
+
Lịch sử giá cập nhật
```

---

# 15. SCREEN 11 — KHO & TỒN KHO

## Header

```text
Kho & Tồn kho
```

---

## Warehouse Selector

```text
[Kho chính ▼]
```

---

## KPI

```text
Tổng SKU
320

Giá trị tồn
182.5 triệu

Sắp hết
8

Sắp hết hạn
5
```

---

## Table

```text
Vật tư
Lô
Tồn
Available
Reserved
Hạn sử dụng
Vị trí
Trạng thái
```

---

# 16. SCREEN 12 — CHI TIẾT LÔ HÀNG

```text
LOT-NPK-251005

NPK 16-16-8
```

Thông tin:

```text
Ngày nhập
05/10/2026

Nhà cung cấp
ABC

Số lượng ban đầu
500 kg

Còn lại
320 kg

Hạn
05/2027

Kho
Kho chính

Kệ
A-03
```

Timeline:

```text
05/10 +500 kg
10/10 -20 kg
15/10 -35 kg
...
```

---

# 17. SCREEN 13 — XUẤT KHO

Header:

```text
Xuất vật tư
```

---

## Fields

```text
Kho *

Loại xuất *

Đối tượng sử dụng *
```

Loại:

```text
Công việc
Cây
Khu
Thiết bị
Hủy
Khác
```

Ví dụ:

```text
Task:
Bón phân A001–A020
```

---

## Material Table

```text
Vật tư
Lô
Tồn
Số lượng xuất
Đơn vị
```

FEFO có thể tự đề xuất lô.

---

## Confirm

Sau save:

```text
Inventory giảm
Task cập nhật
Chi phí cập nhật
Plant timeline cập nhật
```

---

# 18. SCREEN 14 — ĐIỀU CHUYỂN KHO

Form:

```text
Kho nguồn

Kho đích

Vật tư

Lô

Số lượng

Ngày

Ghi chú
```

Sau xác nhận:

```text
Kho nguồn -X
Kho đích +X
```

Một transaction duy nhất.

---

# 19. SCREEN 15 — KIỂM KÊ

Header:

```text
Kiểm kê kho

                         [+ Tạo đợt kiểm kê]
```

---

## Inventory Count

Table:

```text
Vật tư
Lô
Tồn hệ thống
Tồn thực tế
Chênh lệch
Lý do
```

Ví dụ:

```text
NPK
LOT-A

100 kg

97 kg

-3 kg

Hao hụt
```

---

## Confirm

Sau khi duyệt:

```text
Inventory Adjustment
```

phải tạo Audit Log.

---

# 20. SCREEN 16 — THIẾT BỊ & TÀI SẢN

Header:

```text
Thiết bị & Tài sản

                         [+ Thêm thiết bị]
```

Filter:

```text
[Loại ▼]
[Trạng thái ▼]
[Khu vực ▼]
[Bảo trì ▼]
```

---

## Table

```text
Mã
Thiết bị
Loại
Vị trí
Ngày mua
Giá mua
Trạng thái
Bảo trì tiếp theo
```

---

# 21. SCREEN 17 — CHI TIẾT TÀI SẢN

Header:

```text
Pump P01

Máy bơm

● Đang hoạt động
```

Tabs:

```text
Tổng quan
Lịch sử sử dụng
Bảo trì
Sửa chữa
Chi phí
Tài liệu
```

---

# 22. SCREEN 18 — THIẾT BỊ IOT

Mục tiêu:

Quản lý IoT như **tài sản vật lý**, không phải realtime monitoring.

Header:

```text
Thiết bị IoT

                         [+ Thêm thiết bị]
```

---

## Table

```text
Device ID
Tên
Loại
Model
Serial
Vị trí
Gateway
Firmware
Trạng thái tài sản
Trạng thái lắp đặt
```

Ví dụ:

```text
SM-03

Soil Moisture 03

Sensor

XYZ-100

SN123123

Khu A

ESP32-04

v1.2.0

Active

Installed
```

---

# 23. SCREEN 19 — CHI TIẾT THIẾT BỊ IOT

Tabs:

```text
Tổng quan
Thông số kỹ thuật
Vị trí
Kết nối
Bảo trì
Hiệu chuẩn
Firmware
Chi phí
```

Thông tin:

```text
Device ID
SM-03

Serial
SN123123

Model
XYZ-100

Ngày mua
01/08/2026

Giá
350.000đ

Nhà cung cấp
ABC

Ngày lắp
01/09/2026

Khu
Khu A

Phục vụ
A021–A040
```

Có link:

```text
[Xem realtime trong IoT]
```

để chuyển sang Phân hệ 4.

---

# 24. SCREEN 20 — LẮP ĐẶT & GÁN THIẾT BỊ

Flow:

```text
Thiết bị trong kho
↓
Chọn vị trí
↓
Chọn Gateway / Parent
↓
Gán khu / nhóm cây
↓
Xác nhận lắp đặt
```

Form:

```text
Thiết bị

Trang trại

Khu

Vườn

Nhóm cây

Gateway

Ngày lắp

Người lắp
```

---

## Topology Preview

Ví dụ:

```text
Gateway G01
    ↓
ESP32-04
    ↓
SM-03
    ↓
Khu A
    ↓
A021–A040
```

---

# 25. SCREEN 21 — BẢO TRÌ

## Views

```text
[List] [Calendar]
```

---

## Table

```text
Thiết bị
Loại bảo trì
Ngày dự kiến
Lần gần nhất
Trạng thái
Người phụ trách
```

---

## Maintenance Types

```text
Định kỳ
Theo giờ hoạt động
Sửa chữa
Thay linh kiện
Vệ sinh
Kiểm tra
```

---

# 26. SCREEN 22 — TẠO BẢO TRÌ

Form:

```text
Thiết bị

Loại

Ngày

Nguyên nhân

Công việc

Vật tư / linh kiện

Người phụ trách

Chi phí dự kiến
```

Khi hoàn thành:

```text
Maintenance → Completed
Asset history → Updated
Inventory → Reduce parts
Expense → Updated
```

---

# 27. SCREEN 23 — HIỆU CHUẨN IOT

Đặc biệt quan trọng với:

- pH
- EC
- Soil Sensor
- Flow Meter

Table:

```text
Thiết bị
Loại
Lần calibration gần nhất
Chu kỳ
Ngày tiếp theo
Trạng thái
```

---

## Calibration Record

```text
Ngày

Giá trị chuẩn

Giá trị trước hiệu chuẩn

Giá trị sau hiệu chuẩn

Sai số

Người thực hiện

Ghi chú
```

---

# 28. SCREEN 24 — CHI PHÍ

Header:

```text
Chi phí trang trại
```

KPI:

```text
Tháng này
42.3 triệu

Vật tư
18.2 triệu

Bảo trì
7.5 triệu

Điện nước
9.4 triệu

Khác
7.2 triệu
```

---

## Filter

```text
[Farm]
[Khu]
[Cây]
[Nhóm chi phí]
[Thời gian]
```

---

## Table

```text
Ngày
Loại chi phí
Đối tượng
Nguồn phát sinh
Số tiền
Ghi chú
```

---

# 29. PHÂN BỔ CHI PHÍ

Chi phí có thể liên kết:

```text
Farm
Zone
Plant
Task
Device
Harvest
```

Ví dụ:

```text
27.000đ

NPK

Task:
Bón phân A023

→ Plant A023
```

UI phải cho phép click drill-down.

---

# 30. SCREEN 25 — TÀI CHÍNH & HIỆU QUẢ

Không xây kế toán đầy đủ.

Chỉ quản trị farm.

KPI:

```text
Tổng chi

Giá trị tồn

Giá trị tài sản

Công nợ nhà cung cấp
```

Có thể xem:

```text
Chi phí / cây
Chi phí / khu
Chi phí / kg sản phẩm
```

---

# 31. SCREEN 26 — CẢNH BÁO

Một inbox cảnh báo chung.

Categories:

```text
LOW_STOCK
EXPIRING
EXPIRED
MAINTENANCE_DUE
CALIBRATION_DUE
ASSET_BROKEN
PRICE_INCREASE
SUPPLIER_DEBT
```

---

## Table

```text
Mức độ
Loại
Đối tượng
Nội dung
Ngày
Trạng thái
```

Ví dụ:

```text
Warning

Low Stock

NPK 16-16-8

Còn 80kg, thấp hơn mức 100kg
```

---

# 32. ALERT ACTIONS

Ví dụ Low Stock:

```text
[Xem vật tư]
[Tạo đơn mua]
[Đóng cảnh báo]
```

Expiring:

```text
[Xem lô]
```

Maintenance:

```text
[Tạo bảo trì]
```

---

# 33. COMPONENT SYSTEM

Tạo component tái sử dụng:

```text
InventoryStatusBadge
MaterialSelector
MaterialTable
StockCard
BatchSelector
WarehouseSelector

SupplierCard
PurchaseOrderTable
PurchaseOrderStatus
ReceivingTable

AssetStatusBadge
AssetCard
IoTDeviceCard
InstallationTree

MaintenanceCalendar
MaintenanceDrawer
CalibrationForm

ExpenseTable
CostBreakdown

AlertInbox
```

---

# 34. STATUS SYSTEM

## Purchase Order

```text
DRAFT
ORDERED
SHIPPING
PARTIALLY_RECEIVED
RECEIVED
COMPLETED
CANCELLED
```

---

## Inventory

```text
NORMAL
LOW_STOCK
OUT_OF_STOCK
EXPIRING
EXPIRED
```

---

## Asset

```text
IN_STOCK
INSTALLING
ACTIVE
MAINTENANCE
BROKEN
RETIRED
```

---

## Maintenance

```text
PLANNED
IN_PROGRESS
COMPLETED
CANCELLED
OVERDUE
```

---

# 35. ROUTES ĐỀ XUẤT

```text
/resources/dashboard

/resources/materials
/resources/materials/new
/resources/materials/:materialId

/resources/suppliers
/resources/suppliers/new
/resources/suppliers/:supplierId

/resources/purchases
/resources/purchases/new
/resources/purchases/:purchaseId
/resources/purchases/:purchaseId/receive
/resources/purchases/quick

/resources/inventory
/resources/inventory/batches/:batchId
/resources/inventory/issue
/resources/inventory/transfer
/resources/inventory/count

/resources/assets
/resources/assets/new
/resources/assets/:assetId

/resources/iot-devices
/resources/iot-devices/:deviceId
/resources/iot-devices/install

/resources/maintenance
/resources/maintenance/new
/resources/maintenance/:maintenanceId

/resources/calibration

/resources/expenses

/resources/finance

/resources/alerts
```

---

# 36. CẤU TRÚC FRONTEND

```text
src/
│
├── modules/
│   └── resources/
│       │
│       ├── dashboard/
│       │
│       ├── materials/
│       │
│       ├── suppliers/
│       │
│       ├── purchases/
│       │   ├── orders/
│       │   ├── receiving/
│       │   └── quick-purchase/
│       │
│       ├── inventory/
│       │   ├── stock/
│       │   ├── batches/
│       │   ├── issues/
│       │   ├── transfers/
│       │   └── counting/
│       │
│       ├── assets/
│       │
│       ├── iot-devices/
│       │
│       ├── maintenance/
│       │
│       ├── calibration/
│       │
│       ├── expenses/
│       │
│       ├── finance/
│       │
│       └── alerts/
```

---

# 37. MOBILE / TABLET UX

Desktop là thiết bị chính.

Tablet phải hỗ trợ tốt:

- kiểm kho;
- nhận hàng;
- xem thiết bị;
- bảo trì.

Mobile ưu tiên nghiệp vụ hiện trường:

```text
Scan QR vật tư
→ xem tồn
```

```text
Scan QR thiết bị
→ xem tài sản
→ báo hỏng
```

```text
Nhận hàng
→ nhập số lượng
→ chụp hóa đơn
→ xác nhận
```

```text
Bảo trì
→ ghi vật tư
→ chụp ảnh
→ hoàn thành
```

---

# 38. QR / BARCODE

Nên chuẩn bị UI cho:

- QR vật tư
- Barcode
- QR tài sản
- QR thiết bị IoT

Ví dụ:

```text
Scan Pump-P01
```

→ mở thẳng Asset Detail.

Hoặc:

```text
Scan LOT-NPK-A
```

→ mở Batch Detail.

---

# 39. UX RULES QUAN TRỌNG

## Rule 1

Không nhập dữ liệu hai lần.

## Rule 2

Nhận hàng phải tự tăng kho.

## Rule 3

Xuất vật tư từ task phải tự ghi chi phí.

## Rule 4

Thiết bị IoT phải liên kết được với Phân hệ 4.

## Rule 5

Không hard delete giao dịch kho.

Sai transaction:

→ tạo adjustment/reversal.

## Rule 6

Mọi thay đổi tồn phải có trace.

Phải biết:

```text
Ai
Khi nào
Tại sao
Transaction nào
```

---

# 40. UI STATES

Tất cả screen phải có:

## Loading

Skeleton.

## Empty

Ví dụ:

```text
Chưa có vật tư.

[+ Thêm vật tư]
```

## Error

```text
Không thể tải dữ liệu.

[Thử lại]
```

## Permission Denied

```text
Bạn không có quyền thực hiện nghiệp vụ này.
```

---

# 41. MOCK DATA

Material:

```text
NPK 16-16-8

FERT-001

350 kg

Minimum:
100 kg

18.000đ/kg
```

Supplier:

```text
Công ty Nông Nghiệp ABC

SUP-001
```

Purchase:

```text
PO-2026-00125

500 kg NPK

Tổng:
9.000.000đ

Đã nhận:
300 kg
```

IoT Device:

```text
SM-03

Soil Moisture Sensor

Model:
XYZ-100

Status:
ACTIVE

Location:
Khu A

Gateway:
ESP32-04
```

Asset:

```text
PUMP-P01

Máy bơm 3HP

Ngày mua:
01/05/2026

Giá:
8.000.000đ

Status:
ACTIVE
```

---

# 42. THỨ TỰ TRIỂN KHAI UI

## Phase 1

```text
Dashboard
Material List
Material Detail
Inventory
```

## Phase 2

```text
Supplier
Purchase Order
Receiving
Quick Purchase
```

## Phase 3

```text
Stock Issue
Transfer
Inventory Count
```

## Phase 4

```text
Assets
IoT Devices
Installation
```

## Phase 5

```text
Maintenance
Calibration
```

## Phase 6

```text
Expenses
Finance
Alerts
```

---

# 43. MVP UI

MVP ưu tiên:

1. Danh mục vật tư
2. Nhà cung cấp
3. Tạo đơn mua
4. Nhận hàng tự tăng kho
5. Kho & tồn kho
6. Xuất kho
7. Thiết bị & tài sản
8. Thiết bị IoT
9. Bảo trì
10. Cảnh báo tồn kho

Các phần tài chính nâng cao có thể để sau.

---

# 44. 4 TRẢI NGHIỆM CỐT LÕI

UI phải đặc biệt tối ưu 4 flow:

## EXPERIENCE 1 — MUA HÀNG

```text
Nhà cung cấp
→ Đơn mua
→ Nhận hàng
→ Kho tự tăng
```

---

## EXPERIENCE 2 — SỬ DỤNG VẬT TƯ

```text
Task
→ Chọn vật tư
→ Hoàn thành
→ Kho tự giảm
→ Chi phí tự ghi
```

---

## EXPERIENCE 3 — THIẾT BỊ IOT

```text
Mua thiết bị
→ Kho
→ Asset
→ Lắp đặt
→ Gán khu
→ Active
→ chuyển sang IoT Monitoring
```

---

## EXPERIENCE 4 — BẢO TRÌ

```text
Thiết bị đến hạn
→ Cảnh báo
→ Tạo maintenance
→ Dùng phụ tùng
→ Kho giảm
→ Chi phí tăng
→ Asset history cập nhật
```

---

# 45. OUTPUT YÊU CẦU

Hãy tạo UI hoàn chỉnh cho Phân hệ Vật tư nông nghiệp.

Không thiết kế nó như một phần mềm kho độc lập.

Phải thể hiện rõ mối quan hệ:

```text
Supplier
→ Purchase
→ Inventory
→ Production
→ Cost
```

và:

```text
Asset
→ IoT Device
→ Installation
→ Maintenance
→ IoT Operation
```

UI phải cho người dùng cảm nhận được đây là **hệ thống quản lý nguồn lực của toàn trang trại**, liên kết trực tiếp với cây trồng, công việc, IoT và tài chính.

Phong cách:

**Modern Agricultural ERP + Warehouse Management + Asset Management + IoT Asset Platform**

Ưu tiên:

**traceability + speed + clarity + automation + consistency**.