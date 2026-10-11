# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Frontend Architect + CRM Analyst + Sales Operations Analyst + Agricultural Supply Chain Analyst**, có kinh nghiệm thiết kế:

- CRM
- Sales Management
- Order Management
- Agricultural Sales Platform
- Finished Goods Inventory
- Pricing System
- Customer Debt Management
- Delivery Management
- Product Traceability
- Farm-to-Customer Supply Chain

Nhiệm vụ của bạn là thiết kế và triển khai UI cho:

# PHÂN HỆ 5 — KINH DOANH & KHÁCH HÀNG

thuộc hệ thống:

# Smart Farm Management System

---

# 1. MỤC TIÊU PHÂN HỆ

Phân hệ này quản lý toàn bộ đầu ra của hoạt động sản xuất.

Business Flow chính:

```text
Cây trồng
→ Thu hoạch
→ Phân loại
→ Sản phẩm thương mại
→ Kho thành phẩm
→ Khách hàng
→ Báo giá
→ Đơn hàng
→ Giữ hàng
→ Giao hàng
→ Thanh toán
→ Doanh thu
→ Công nợ
```

Ngoài ra phải hỗ trợ:

```text
Khiếu nại
→ Trả hàng
→ Truy xuất nguồn gốc
→ Lô thu hoạch
→ Cây trồng
```

Phân hệ phải trả lời được:

- Trang trại đang có những sản phẩm nào để bán?
- Có bao nhiêu hàng có thể bán ngay?
- Bao nhiêu hàng đã được giữ cho đơn khác?
- Khách hàng nào mua nhiều nhất?
- Khách nào đang nợ?
- Đơn hàng nào cần giao hôm nay?
- Giá bán hiện tại là bao nhiêu?
- Có thể đáp ứng đơn hàng hay không?
- Sản lượng sắp thu hoạch có đủ bù nhu cầu không?
- Sản phẩm khách khiếu nại đến từ khu/cây nào?
- Doanh thu theo sản phẩm, khách hàng và thời gian là bao nhiêu?

---

# 2. NGUYÊN TẮC NGHIỆP VỤ QUAN TRỌNG

## Nguyên tắc 1 — Thu hoạch không đồng nghĩa với hàng bán được

Flow đúng:

```text
Thu hoạch
→ Phân loại
→ Xác định chất lượng
→ Tạo sản phẩm thương mại
→ Nhập kho thành phẩm
```

Ví dụ:

```text
Thu hoạch:
1.000 trái dừa

↓

Loại A:
750

Loại B:
200

Reject:
50
```

Kho thành phẩm chỉ tăng:

```text
Dừa A +750
Dừa B +200
```

50 sản phẩm lỗi không được tính là hàng có thể bán.

---

# 3. NGUYÊN TẮC 2 — KHÔNG BÁN VƯỢT TỒN

Phải phân biệt:

```text
On Hand
Reserved
Available
```

Công thức:

```text
Available = On Hand - Reserved
```

Ví dụ:

```text
On Hand:
1.000

Reserved:
800

Available:
200
```

UI không được hiển thị 1.000 là lượng còn có thể bán.

---

# 4. NGUYÊN TẮC 3 — MỘT NGHIỆP VỤ KHÔNG NHẬP HAI LẦN

Ví dụ:

```text
Quotation
→ Customer Accepts
→ Convert to Order
```

Không nhập lại toàn bộ sản phẩm và giá.

Tương tự:

```text
Order
→ Create Delivery
```

Delivery phải lấy dữ liệu trực tiếp từ Order.

---

# 5. NGUYÊN TẮC 4 — PHẢI TRUY XUẤT ĐƯỢC NGUỒN GỐC

Một sản phẩm đã bán phải có khả năng truy:

```text
Order
→ Product
→ Product Lot
→ Harvest Batch
→ Farm Area
→ Plant
```

Nếu quản lý theo từng cây:

```text
Product Lot
→ A001
→ A002
→ A003
...
```

---

# 6. CÁC MODULE CHÍNH

Phân hệ 5 gồm:

1. Dashboard kinh doanh
2. Khách hàng & CRM
3. Sản phẩm thương mại
4. Phân loại sau thu hoạch
5. Kho thành phẩm
6. Bảng giá
7. Chính sách giá
8. Báo giá
9. Đơn hàng
10. Giữ hàng & Phân bổ
11. Kế hoạch cung ứng
12. Giao hàng
13. Thanh toán
14. Công nợ
15. Trả hàng
16. Khiếu nại
17. Truy xuất nguồn gốc
18. CRM Activity
19. Báo cáo kinh doanh cơ bản

---

# 7. SIDEBAR PHÂN HỆ

```text
Kinh doanh & Khách hàng
│
├── Tổng quan
│
├── Khách hàng
│   ├── Danh sách khách hàng
│   └── CRM Activity
│
├── Sản phẩm
│   ├── Danh mục sản phẩm
│   ├── Phân loại sau thu hoạch
│   └── Kho thành phẩm
│
├── Giá bán
│   ├── Bảng giá
│   └── Chính sách giá
│
├── Bán hàng
│   ├── Báo giá
│   ├── Đơn hàng
│   ├── Giữ hàng
│   └── Kế hoạch cung ứng
│
├── Giao hàng
│
├── Thanh toán & Công nợ
│
├── Trả hàng & Khiếu nại
│
└── Truy xuất nguồn gốc
```

---

# 8. SCREEN 01 — DASHBOARD KINH DOANH

## Mục tiêu

Người quản lý phải thấy ngay:

- Doanh thu
- Đơn hàng
- Hàng có thể bán
- Công nợ
- Khách hàng lớn
- Đơn cần giao
- Sản phẩm bán chạy

---

## KPI

```text
Doanh thu tháng
325.000.000đ

Đơn hàng tháng
128

Đơn cần giao hôm nay
8

Công nợ phải thu
82.000.000đ

Khách hàng
146

Hàng có thể bán
12.450 đơn vị
```

---

## Main Layout

```text
┌─────────────────────────────┬───────────────────────────┐
│ Doanh thu                   │ Đơn cần xử lý            │
├─────────────────────────────┼───────────────────────────┤
│ Sản phẩm bán chạy           │ Công nợ                  │
├─────────────────────────────┼───────────────────────────┤
│ Tồn thành phẩm              │ Khách hàng lớn           │
└─────────────────────────────┴───────────────────────────┘
```

---

# 9. SCREEN 02 — DANH SÁCH KHÁCH HÀNG

## Header

```text
Khách hàng

Quản lý khách hàng và lịch sử giao dịch

                         [+ Thêm khách hàng]
```

---

## Filter

```text
[Tìm tên / mã / số điện thoại...]

[Loại khách ▼]
[Nhóm giá ▼]
[Trạng thái ▼]
[Công nợ ▼]
```

---

## Table

```text
Mã khách
Tên khách
Loại
Điện thoại
Nhóm giá
Đơn hàng
Doanh thu
Công nợ
Lần mua gần nhất
Trạng thái
Actions
```

Ví dụ:

```text
KH-0023

Nhà hàng ABC

Nhà hàng

0901234567

Giá đại lý

42 đơn

125 triệu

5 triệu

3 ngày trước

● Active
```

---

# 10. LOẠI KHÁCH HÀNG

Có thể gồm:

```text
Khách lẻ
Khách sỉ
Đại lý
Nhà phân phối
Nhà hàng
Khách sạn
Siêu thị
Doanh nghiệp
```

---

# 11. SCREEN 03 — CHI TIẾT KHÁCH HÀNG

Header:

```text
Nhà hàng ABC

KH-0023

● Đang hoạt động

                        [+ Tạo đơn hàng]
```

Tabs:

```text
Tổng quan
Đơn hàng
Báo giá
Thanh toán
Công nợ
CRM Activity
Khiếu nại
```

---

## Tổng quan

Thông tin:

```text
Loại:
Nhà hàng

Điện thoại:
0901234567

Email:
abc@email.com

Địa chỉ:
...

Nhóm giá:
Đại lý
```

---

## KPI khách hàng

```text
Tổng doanh thu
125 triệu

Đơn hàng
42

Giá trị đơn trung bình
2.97 triệu

Công nợ
5 triệu
```

---

# 12. CRM ACTIVITY

Timeline:

```text
05/10
Gọi xác nhận nhu cầu 300 trái

03/10
Khách yêu cầu báo giá

01/10
Đã giao đơn SO-0012
```

Có thể tạo:

```text
+ Ghi chú
+ Cuộc gọi
+ Lịch hẹn
+ Follow-up
```

---

# 13. SCREEN 04 — TẠO / CHỈNH SỬA KHÁCH HÀNG

Sections:

## Thông tin chung

```text
Tên khách *
Loại khách *
Số điện thoại *
Email
Mã số thuế
```

## Địa chỉ

```text
Địa chỉ chính
Địa chỉ giao hàng
```

## Chính sách thương mại

```text
Nhóm giá
Hạn mức công nợ
Điều khoản thanh toán
```

---

# 14. SCREEN 05 — DANH MỤC SẢN PHẨM

Cần phân biệt với Crop/Plant.

Ví dụ:

```text
Crop:
Dừa xiêm xanh
```

có thể có:

```text
SKU-001
Dừa xiêm loại A

SKU-002
Dừa xiêm loại B

SKU-003
Dừa nguyên buồng
```

---

## Table

```text
SKU
Tên
Nguồn cây trồng
Chất lượng
Quy cách
Đơn vị
Giá chuẩn
Available
Trạng thái
```

---

# 15. SCREEN 06 — PRODUCT DETAIL

Header:

```text
Dừa xiêm loại A

SKU-COC-A
```

Tabs:

```text
Tổng quan
Tồn kho
Giá
Lô sản phẩm
Lịch sử bán
Khách hàng
```

Thông tin:

- Crop source
- Grade
- Size
- Weight
- Packaging
- Sales unit
- Standard price

---

# 16. SCREEN 07 — PHÂN LOẠI SAU THU HOẠCH

Flow:

```text
Harvest Batch
→ Quality Classification
→ Commercial Product
```

Header:

```text
Phân loại sau thu hoạch
```

---

## Chọn đợt thu hoạch

Ví dụ:

```text
HARV-20261005-001

Khu Bắc

Thu hoạch:
1.000 trái
```

---

## Classification Table

```text
Loại
Số lượng
Tỷ lệ
Sản phẩm tạo
```

Ví dụ:

```text
A
750
75%
Dừa loại A

B
200
20%
Dừa loại B

Reject
50
5%
Không bán
```

Button:

```text
[Xác nhận phân loại]
```

Sau save:

```text
Finished Goods Inventory
→ +750 A
→ +200 B
```

---

# 17. SCREEN 08 — KHO THÀNH PHẨM

KPI:

```text
Tổng SKU
24

On Hand
15.200

Reserved
2.750

Available
12.450
```

---

## Table

```text
SKU
Sản phẩm
Lô
On Hand
Reserved
Available
Ngày thu hoạch
Hạn sử dụng
Trạng thái
```

---

# 18. LÔ THÀNH PHẨM

Ví dụ:

```text
LOT-COC-A-20261005

Dừa A

On Hand:
750

Reserved:
500

Available:
250

Harvest:
HARV-20261005-001
```

Click:

→ xem traceability.

---

# 19. SCREEN 09 — BẢNG GIÁ

Header:

```text
Bảng giá

                        [+ Tạo bảng giá]
```

---

## Price List

Ví dụ:

```text
Giá bán lẻ

Hiệu lực:
01/10/2026
```

Table:

```text
Sản phẩm
Đơn vị
Giá
Minimum Price
```

---

# 20. NHIỀU BẢNG GIÁ

Hỗ trợ:

```text
Giá bán lẻ
Giá đại lý
Giá khách sỉ
Giá nhà hàng
Giá khách đặc biệt
```

---

# 21. SCREEN 10 — CHÍNH SÁCH GIÁ

Ví dụ:

```text
Dừa A

1–99:
18.000đ

100–499:
16.000đ

>=500:
14.800đ
```

Có thể thêm:

```text
Customer-specific price
```

Ví dụ:

```text
Nhà hàng ABC
15.000đ/trái
```

---

# 22. PRICE HISTORY

Phải lưu:

```text
Ngày
Bảng giá
Giá cũ
Giá mới
Người thay đổi
```

Không overwrite mất lịch sử.

---

# 23. SCREEN 11 — DANH SÁCH BÁO GIÁ

Table:

```text
Quotation
Khách hàng
Ngày
Hiệu lực đến
Tổng tiền
Trạng thái
Người tạo
Actions
```

Status:

```text
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED
CONVERTED
```

---

# 24. SCREEN 12 — TẠO BÁO GIÁ

Fields:

```text
Khách hàng *

Bảng giá

Ngày

Hiệu lực đến

Điều khoản thanh toán
```

---

## Item Table

```text
Sản phẩm
Số lượng
Đơn vị
Giá
Chiết khấu
Thành tiền
```

Price tự lấy theo:

```text
Customer
+
Price List
+
Quantity Rule
```

nhưng cho phép người có quyền điều chỉnh.

---

# 25. QUOTATION SUMMARY

```text
Tạm tính
9.000.000đ

Chiết khấu
300.000đ

Thuế
...

Tổng
8.700.000đ
```

---

# 26. CONVERT QUOTATION TO ORDER

Khi báo giá được chấp nhận:

```text
[Chuyển thành đơn hàng]
```

Hệ thống copy:

- Customer
- Products
- Quantity
- Price
- Discount
- Payment terms

Không nhập lại.

---

# 27. SCREEN 13 — ORDER LIST

Header:

```text
Đơn hàng

                          [+ Tạo đơn hàng]
```

---

## Filter

```text
[Khách hàng]
[Trạng thái]
[Ngày giao]
[Thanh toán]
[Sản phẩm]
```

---

## Table

```text
Order
Customer
Order Date
Delivery Date
Items
Total
Fulfillment
Payment
Status
Actions
```

---

# 28. ORDER STATUS

```text
DRAFT
CONFIRMED
ALLOCATED
PREPARING
SHIPPING
DELIVERED
COMPLETED
CANCELLED
```

UI:

```text
Nháp
Đã xác nhận
Đã giữ hàng
Đang chuẩn bị
Đang giao
Đã giao
Hoàn tất
Đã hủy
```

---

# 29. SCREEN 14 — ORDER DETAIL

Header:

```text
SO-2026-01028

Nhà hàng ABC

● Đã xác nhận
```

Actions:

```text
[Giữ hàng]
[Tạo giao hàng]
[Ghi nhận thanh toán]
[...]
```

Tabs:

```text
Tổng quan
Sản phẩm
Phân bổ hàng
Giao hàng
Thanh toán
Timeline
Traceability
```

---

# 30. ORDER OVERVIEW

Hiển thị:

```text
Ngày đặt:
05/10

Ngày giao:
08/10

Payment terms:
15 ngày

Total:
10.000.000đ
```

---

# 31. SCREEN 15 — GIỮ HÀNG / ALLOCATION

Đây là phần rất quan trọng.

Ví dụ order:

```text
Dừa A
500 trái
```

Hệ thống hiển thị:

```text
On Hand:
700

Reserved:
300

Available:
400

Order Demand:
500

Shortage:
100
```

---

# 32. ALLOCATION UI

Danh sách lô:

```text
LOT-A01
Available 250

LOT-A02
Available 150

LOT-A03
Available 300
```

Người dùng hoặc hệ thống chọn:

```text
LOT-A01 → 250
LOT-A02 → 150
```

Tổng:

```text
Allocated:
400

Still Missing:
100
```

---

# 33. AUTO ALLOCATION

Có thể hỗ trợ:

```text
[Auto Allocate]
```

Theo:

```text
FIFO
FEFO
Harvest Date
Quality
```

---

# 34. SCREEN 16 — KẾ HOẠCH CUNG ỨNG

Khi thiếu hàng.

Ví dụ:

```text
Order Demand:
2.000

Available:
700

Reserved elsewhere:
500

Expected Harvest:
1.500

Expected Date:
07/10
```

UI hiển thị:

```text
Projected Supply:
2.200

Demand:
2.000

Potentially Fulfillable:
YES
```

nhưng phải có badge:

```text
Dựa trên sản lượng dự kiến
```

Không coi forecast là tồn kho thật.

---

# 35. SUPPLY TIMELINE

```text
05/10
Available 700

07/10
Expected Harvest +1.500

08/10
Order Delivery -2.000
```

Giúp người dùng đánh giá khả năng nhận đơn.

---

# 36. SCREEN 17 — DELIVERY LIST

Table:

```text
Delivery
Order
Customer
Delivery Date
Quantity
Vehicle
Driver
Status
```

Status:

```text
PLANNED
PICKING
READY
SHIPPING
DELIVERED
FAILED
CANCELLED
```

---

# 37. SCREEN 18 — TẠO GIAO HÀNG

Lấy dữ liệu từ order.

Hiển thị:

```text
Customer
Delivery Address
Order
Products
Allocated Lots
```

Thêm:

```text
Vehicle
Driver
Planned Time
Note
```

---

# 38. PICKING

UI:

```text
Dừa A

Required:
500

Picked:
[500]

Lot:
LOT-A01 + LOT-A02
```

Khi xác nhận xuất:

```text
Finished Goods Inventory ↓
Reserved ↓
Delivery → READY
```

---

# 39. SCREEN 19 — DELIVERY DETAIL

Timeline:

```text
08:00
Picking

09:10
Ready

09:30
Shipping

11:15
Delivered
```

Thông tin:

- Người nhận
- Chữ ký
- Ảnh
- Thời gian thực giao
- Số lượng thực giao

---

# 40. PARTIAL DELIVERY

Phải hỗ trợ giao một phần.

Ví dụ:

```text
Order:
500

Delivered:
400

Remaining:
100
```

Order không được tự động completed.

---

# 41. SCREEN 20 — THANH TOÁN

Trong Order Detail:

```text
Total
10.000.000đ

Paid
6.000.000đ

Outstanding
4.000.000đ
```

Button:

```text
[+ Ghi nhận thanh toán]
```

---

# 42. RECORD PAYMENT

Form:

```text
Khách hàng

Đơn hàng

Số tiền

Ngày thanh toán

Phương thức

Mã giao dịch

Ghi chú
```

Phương thức:

```text
Tiền mặt
Chuyển khoản
Khác
```

---

# 43. SCREEN 21 — CÔNG NỢ

Dashboard:

```text
Tổng phải thu
82 triệu

Quá hạn
21 triệu

Đến hạn 7 ngày
14 triệu
```

---

## Aging Table

```text
Customer
Total Debt
Current
1–30 days
31–60
61–90
>90
```

---

# 44. CUSTOMER DEBT DETAIL

Timeline:

```text
SO-001
10 triệu
Paid 6 triệu
Outstanding 4 triệu
Due 15/10
```

---

# 45. CREDIT LIMIT

Khách có thể có:

```text
Credit Limit:
50 triệu

Current Debt:
47 triệu
```

Khi tạo đơn mới 10 triệu:

UI cảnh báo:

```text
Đơn hàng này sẽ vượt hạn mức công nợ.

[Request Approval]
```

---

# 46. SCREEN 22 — TRẢ HÀNG

Header:

```text
Trả hàng

                      [+ Tạo phiếu trả]
```

Flow:

```text
Order
→ Delivery
→ Product
→ Quantity
→ Reason
```

---

# 47. RETURN REASONS

```text
Hư hỏng
Sai chất lượng
Sai sản phẩm
Thiếu tiêu chuẩn
Khác
```

---

# 48. RETURN RESOLUTION

Các phương án:

```text
Đổi hàng
Hoàn tiền
Giảm giá
Credit Note
Không chấp nhận
```

---

# 49. SCREEN 23 — KHIẾU NẠI

List:

```text
Case ID
Customer
Order
Product
Issue
Severity
Status
Created
```

Status:

```text
OPEN
INVESTIGATING
RESOLVED
CLOSED
```

---

# 50. SCREEN 24 — CHI TIẾT KHIẾU NẠI

Header:

```text
CLAIM-2026-0021

Nhà hàng ABC

Dừa A

20 trái lỗi
```

Tabs:

```text
Thông tin
Hình ảnh
Truy xuất
Xử lý
Timeline
```

---

# 51. TRACE FROM COMPLAINT

Hệ thống phải hiển thị:

```text
Claim
↓
Order SO-1028
↓
Delivery DEL-221
↓
Product Lot LOT-COC-A-05
↓
Harvest HARV-1005
↓
Khu Bắc
↓
A001–A030
```

---

# 52. SCREEN 25 — TRUY XUẤT NGUỒN GỐC

Search:

```text
[Order / Lot / Product / QR / Harvest]
```

Ví dụ:

```text
LOT-COC-A-20261005
```

Hiển thị dạng traceability tree:

```text
Trang trại
↓
Khu Bắc
↓
Vườn 01
↓
A001–A030
↓
Thu hoạch
↓
Phân loại
↓
Product Lot
↓
Delivery
↓
Customer
```

---

# 53. CUSTOMER QR VIEW

Có thể tạo trang public đơn giản.

Khách quét QR:

```text
Dừa xiêm loại A
```

Hiển thị:

- Trang trại
- Giống
- Vùng trồng
- Ngày thu hoạch
- Ngày đóng gói
- Mã lô
- Quy trình cơ bản

Không hiển thị:

- Giá vốn
- Chi phí
- dữ liệu nội bộ
- tài khoản nhân viên

---

# 54. SCREEN 26 — CRM ACTIVITY

Có thể thiết kế dạng timeline + task.

Các loại:

```text
CALL
MEETING
MESSAGE
EMAIL
FOLLOW_UP
NOTE
```

---

# 55. CRM FOLLOW-UP

Ví dụ:

```text
Khách ABC

Lần mua gần nhất:
14 ngày trước

Tần suất trung bình:
7 ngày
```

Hệ thống có thể hiển thị:

```text
⚠ Khách đang mua chậm hơn bình thường.
```

Action:

```text
[Tạo Follow-up]
```

---

# 56. SALES PIPELINE — OPTIONAL

Nếu cần CRM nâng cao có thể thêm:

```text
Lead
→ Opportunity
→ Quotation
→ Order
```

Nhưng không bắt buộc trong MVP nếu hệ thống chủ yếu quản lý khách hàng hiện hữu.

---

# 57. COMPONENT SYSTEM

Tạo các reusable components:

```text
CustomerCard
CustomerStatusBadge
CustomerDebtBadge
CRMActivityTimeline

ProductCard
ProductLotTable
InventoryAvailabilityBadge

PriceListTable
PriceRuleBuilder

QuotationTable
QuotationForm
QuotationStatus

OrderTable
OrderStatusStepper
OrderSummary

AllocationTable
AllocationDrawer
SupplyProjection

DeliveryTable
DeliveryStepper
PickingTable

PaymentForm
PaymentHistory

DebtAgingTable

ReturnForm
ClaimTimeline

TraceabilityTree
TraceabilityDrawer
```

---

# 58. STATUS DESIGN

## Customer

```text
ACTIVE
INACTIVE
BLOCKED
```

## Quotation

```text
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED
CONVERTED
```

## Order

```text
DRAFT
CONFIRMED
ALLOCATED
PREPARING
SHIPPING
DELIVERED
COMPLETED
CANCELLED
```

## Payment

```text
UNPAID
PARTIALLY_PAID
PAID
OVERDUE
```

## Delivery

```text
PLANNED
PICKING
READY
SHIPPING
DELIVERED
FAILED
CANCELLED
```

---

# 59. UI COLORS

Không dùng quá nhiều màu.

Có thể chuẩn hóa:

```text
Green:
Completed / Paid / Delivered

Blue:
Confirmed / Processing

Orange:
Pending / Partial / Warning

Red:
Overdue / Failed / Cancelled

Gray:
Draft / Archived
```

Không chỉ dùng màu; luôn có text/icon.

---

# 60. BUSINESS FLOW QUAN TRỌNG

## FLOW 1 — TỪ THU HOẠCH ĐẾN HÀNG BÁN

```text
Harvest
→ Classification
→ Product Lot
→ Finished Goods Inventory
```

---

## FLOW 2 — BÁN HÀNG

```text
Customer
→ Quotation
→ Order
→ Allocation
→ Picking
→ Delivery
→ Payment
```

---

## FLOW 3 — THIẾU HÀNG

```text
Order
→ Available Inventory không đủ
→ Expected Harvest
→ Supply Planning
→ Người dùng quyết định
```

---

## FLOW 4 — KHIẾU NẠI

```text
Customer Claim
→ Order
→ Delivery
→ Product Lot
→ Harvest
→ Plant
→ Root Cause Investigation
```

---

# 61. TÍCH HỢP VỚI PHÂN HỆ 2

Dữ liệu:

```text
Harvest
```

được lấy từ:

```text
Sản xuất & Cây trồng
```

Kinh doanh không nhập lại thu hoạch.

Flow:

```text
Production Harvest
→ Sales Classification
→ Finished Goods
```

---

# 62. TÍCH HỢP VỚI PHÂN HỆ 3

Có thể dùng chung Inventory Engine.

Nhưng phân biệt:

```text
Raw/Material Inventory
```

và:

```text
Finished Goods Inventory
```

---

# 63. TÍCH HỢP VỚI PHÂN HỆ 6

Kinh doanh cung cấp:

```text
Revenue
Orders
Customers
Payments
Debt
Returns
```

cho:

```text
Reporting & Analytics
```

---

# 64. MOBILE / TABLET

Desktop là chính.

Tablet cần hỗ trợ tốt:

- Order
- Delivery
- Customer
- Payment

Mobile ưu tiên:

```text
Xem khách hàng
Tạo đơn nhanh
Giao hàng
Xác nhận giao
Ghi thanh toán
Chụp ảnh khiếu nại
Quét QR truy xuất
```

---

# 65. QUICK ORDER

Trên mobile/tablet có thể hỗ trợ flow nhanh:

```text
Chọn khách
→ Chọn sản phẩm
→ Nhập số lượng
→ Xem giá
→ Kiểm tra tồn
→ Xác nhận
```

---

# 66. GLOBAL SEARCH

Search:

```text
KH-0023
SO-1028
LOT-COC-A
Dừa loại A
```

Kết quả phân nhóm:

```text
Khách hàng
Đơn hàng
Sản phẩm
Lô sản phẩm
```

---

# 67. ROUTES ĐỀ XUẤT

```text
/sales/dashboard

/sales/customers
/sales/customers/new
/sales/customers/:customerId
/sales/customers/:customerId/edit

/sales/products
/sales/products/:productId

/sales/classification

/sales/inventory
/sales/inventory/lots/:lotId

/sales/pricing
/sales/pricing/:priceListId

/sales/quotations
/sales/quotations/new
/sales/quotations/:quotationId

/sales/orders
/sales/orders/new
/sales/orders/:orderId

/sales/allocation
/sales/supply-plan

/sales/deliveries
/sales/deliveries/:deliveryId

/sales/payments

/sales/receivables

/sales/returns

/sales/claims
/sales/claims/:claimId

/sales/traceability
```

---

# 68. FRONTEND STRUCTURE

```text
src/
│
├── modules/
│   └── sales/
│       │
│       ├── dashboard/
│       │
│       ├── customers/
│       │   ├── list/
│       │   ├── detail/
│       │   ├── form/
│       │   └── crm/
│       │
│       ├── products/
│       ├── classification/
│       ├── inventory/
│       │
│       ├── pricing/
│       │
│       ├── quotations/
│       │
│       ├── orders/
│       │
│       ├── allocation/
│       ├── supply-planning/
│       │
│       ├── deliveries/
│       │
│       ├── payments/
│       ├── receivables/
│       │
│       ├── returns/
│       ├── claims/
│       │
│       └── traceability/
```

---

# 69. UI STATES

Mọi screen phải có:

## Loading

Skeleton.

## Empty

Ví dụ:

```text
Chưa có đơn hàng.

[+ Tạo đơn hàng]
```

## Error

```text
Không thể tải dữ liệu.

[Thử lại]
```

## Permission denied

```text
Bạn không có quyền xem dữ liệu kinh doanh này.
```

---

# 70. VALIDATION QUAN TRỌNG

Không cho xác nhận Order nếu:

```text
Customer = null
Items = 0
Delivery Date invalid
```

Không cho giao vượt số lượng order.

Không cho allocate vượt Available Inventory.

Không cho payment âm.

Không tự completed order nếu chưa giao/hoàn thành đúng flow.

---

# 71. AUDITABILITY

Các hành động quan trọng phải lưu:

```text
Price Change
Order Confirm
Order Cancel
Allocation
Delivery Confirmation
Payment
Debt Adjustment
Return
Complaint Resolution
```

Phải biết:

```text
Ai
Khi nào
Dữ liệu trước
Dữ liệu sau
```

---

# 72. MOCK DATA

Customer:

```text
KH-0023

Nhà hàng ABC

Type:
Restaurant

Price Group:
Đại lý

Debt:
5.000.000đ
```

Product:

```text
SKU-COC-A

Dừa xiêm loại A

Available:
750

Standard Price:
18.000đ
```

Quotation:

```text
QT-2026-0052

Customer:
Nhà hàng ABC

500 trái

15.000đ / trái

Total:
7.500.000đ
```

Order:

```text
SO-2026-1028

Customer:
Nhà hàng ABC

Dừa A:
500

Delivery:
08/10/2026

Total:
7.500.000đ

Status:
CONFIRMED
```

---

# 73. THỨ TỰ TRIỂN KHAI UI

## Phase 1

```text
Sales Dashboard
Customer List
Customer Detail
Product List
Finished Goods Inventory
```

## Phase 2

```text
Pricing
Quotation
Quotation → Order
```

## Phase 3

```text
Order List
Order Detail
Allocation
```

## Phase 4

```text
Supply Planning
Delivery
Picking
```

## Phase 5

```text
Payment
Receivables
```

## Phase 6

```text
Returns
Claims
Traceability
CRM nâng cao
```

---

# 74. MVP UI

Ưu tiên:

1. Khách hàng
2. Sản phẩm
3. Kho thành phẩm
4. Bảng giá cơ bản
5. Đơn hàng
6. Giữ hàng
7. Giao hàng
8. Thanh toán
9. Công nợ
10. Truy xuất nguồn gốc cơ bản

Báo giá, CRM nâng cao và Supply Forecast có thể bổ sung sau nếu cần giảm scope.

---

# 75. 5 TRẢI NGHIỆM CỐT LÕI

## EXPERIENCE 1 — THU HOẠCH → SẢN PHẨM

```text
Thu hoạch
→ Phân loại
→ Tạo sản phẩm
→ Tăng kho thành phẩm
```

---

## EXPERIENCE 2 — ĐẶT HÀNG

```text
Khách hàng
→ Chọn sản phẩm
→ Xem giá
→ Kiểm tra Available
→ Tạo Order
```

---

## EXPERIENCE 3 — GIỮ & GIAO HÀNG

```text
Order
→ Reserve
→ Pick
→ Ship
→ Deliver
→ Kho giảm
```

---

## EXPERIENCE 4 — THANH TOÁN

```text
Order
→ Payment
→ Partial / Full
→ Receivable cập nhật
```

---

## EXPERIENCE 5 — KHIẾU NẠI

```text
Claim
→ Order
→ Product Lot
→ Harvest
→ Plant
→ Resolution
```

---

# 76. OUTPUT YÊU CẦU

Hãy thiết kế và triển khai UI hoàn chỉnh cho:

# Kinh doanh & Khách hàng

Không thiết kế như một CRM hoặc POS độc lập.

Phải thể hiện rõ mối quan hệ từ sản xuất tới khách hàng:

```text
Plant
→ Harvest
→ Product
→ Inventory
→ Order
→ Customer
→ Revenue
```

và khả năng truy ngược:

```text
Customer Complaint
→ Order
→ Product Lot
→ Harvest
→ Plant
```

UI phải ưu tiên:

- quản lý tồn bán được chính xác;
- không bán vượt tồn;
- giữ hàng rõ ràng;
- giá bán linh hoạt;
- flow báo giá → order liền mạch;
- giao hàng có trace;
- công nợ dễ nhìn;
- truy xuất nguồn gốc mạnh;
- giảm nhập dữ liệu trùng;
- drill-down nhanh giữa customer → order → product → lot → harvest.

Phong cách:

**Modern Agricultural CRM + Order Management + Farm-to-Customer Supply Chain**

Ưu tiên:

**sales clarity + inventory accuracy + customer history + traceability + speed**.