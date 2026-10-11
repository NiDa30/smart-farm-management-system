# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Frontend Architect + Agricultural System Analyst** có kinh nghiệm thiết kế:

- Farm Management System
- Smart Agriculture
- Crop Management
- Individual Plant Tracking
- Pest & Disease Management
- IoT-enabled Agriculture
- Agricultural Operations Dashboard
- Traceability System

Nhiệm vụ của bạn là thiết kế và triển khai UI cho:

# PHÂN HỆ 2 — SẢN XUẤT & CÂY TRỒNG

thuộc hệ thống **Smart Farm Management System**.

---

# 1. MỤC TIÊU PHÂN HỆ

Phân hệ này quản lý toàn bộ vòng đời cây trồng:

```text
Trang trại
→ Khu
→ Vườn
→ Hàng / Luống
→ Cây
→ Sinh trưởng
→ Chăm sóc
→ Dinh dưỡng
→ Tưới
→ Sâu bệnh
→ Điều trị
→ Thu hoạch
→ Truy xuất nguồn gốc
```

Hệ thống phải hỗ trợ quản lý tới **từng cá thể cây**.

Ví dụ:

```text
Trang trại Dừa An Phú
    ↓
Khu Bắc
    ↓
Vườn 01
    ↓
Hàng A
    ↓
A001
A002
A003
...
A100
```

Mỗi cây có hồ sơ riêng và timeline riêng.

---

# 2. CÁC MODULE CHÍNH

Phân hệ 2 gồm:

1. Cơ cấu trang trại
2. Sơ đồ vườn & Định vị cây
3. Cây trồng & Hồ sơ cá thể
4. Giai đoạn & Chỉ số sinh trưởng
5. Công việc & Lịch chăm sóc
6. Dinh dưỡng & Bón phân
7. Nước & Tưới tiêu
8. Đất & Môi trường
9. Thư viện sâu bệnh & Thuốc BVTV
10. Theo dõi sâu bệnh & Điều trị
11. Thu hoạch & Năng suất
12. Nhật ký vòng đời & Truy xuất nguồn gốc

---

# 3. NGUYÊN TẮC UI CHUNG

UI phải:

- Desktop-first
- Hiện đại
- Dễ đọc
- Không quá nhiều card rời rạc
- Ưu tiên bảng, sơ đồ, timeline và map
- Hiển thị nhiều dữ liệu nhưng không rối
- Hạn chế scroll dọc không cần thiết
- Hỗ trợ tablet
- Dễ mở rộng sang IoT
- Không nhập lại dữ liệu đã có
- Một thao tác phải tự cập nhật các dữ liệu liên quan

Phong cách:

**Modern Agricultural SaaS + Smart Farm + Enterprise Dashboard**

Ưu tiên:

**clarity > decoration**

---

# 4. SIDEBAR PHÂN HỆ 2

Menu:

```text
Sản xuất & Cây trồng
│
├── Tổng quan sản xuất
├── Sơ đồ vườn
├── Cây trồng
├── Sinh trưởng
├── Công việc
├── Dinh dưỡng
├── Tưới tiêu
├── Đất & Môi trường
├── Sâu bệnh
│   ├── Thư viện sâu bệnh
│   ├── Thuốc BVTV
│   └── Case điều trị
├── Thu hoạch
└── Truy xuất nguồn gốc
```

---

# 5. SCREEN 01 — DASHBOARD SẢN XUẤT

## Mục tiêu

Cho quản lý biết:

- Có bao nhiêu cây?
- Bao nhiêu cây khỏe?
- Bao nhiêu cây cần theo dõi?
- Bao nhiêu cây đang bệnh?
- Hôm nay có những công việc gì?
- Có khu nào bất thường?
- Năng suất gần đây thế nào?

## KPI

Hiển thị:

```text
Tổng cây
1,250

Khỏe mạnh
1,173

Cần theo dõi
52

Đang bệnh
25

Công việc hôm nay
18

Thu hoạch tháng
3,250 kg
```

Mỗi KPI có thể click để lọc dữ liệu liên quan.

---

## Main Content

Layout:

```text
┌─────────────────────────────┬─────────────────────┐
│ Sơ đồ trạng thái vườn      │ Công việc hôm nay  │
│                             │                     │
├─────────────────────────────┼─────────────────────┤
│ Sinh trưởng / năng suất    │ Cảnh báo sức khỏe  │
└─────────────────────────────┴─────────────────────┘
```

---

# 6. SCREEN 02 — SƠ ĐỒ VƯỜN

Đây là một trong những màn hình quan trọng nhất.

## Mục tiêu

Giúp người dùng tìm chính xác vị trí cây.

Ví dụ:

```text
Hàng A

A001  A002  A003  A004  A005
 🟢    🟢    🟡    🟢    🔴

Hàng B

B001  B002  B003  B004  B005
 🟢    🟢    🟢    🟡    🟢
```

Trạng thái:

```text
🟢 Bình thường
🟡 Cần theo dõi
🔴 Có vấn đề
⚫ Ngừng khai thác
```

---

## Toolbar

```text
[Tìm mã cây...]

[Khu ▼]

[Vườn ▼]

[Trạng thái ▼]

[Giống ▼]

[Fit]

[Zoom +]

[Zoom -]
```

Layer:

```text
☑ Cây
☑ Hàng
☐ IoT
☐ Sâu bệnh
☐ Tưới
```

---

## Click cây

Khi click `A023`:

mở Right Drawer.

```text
Dừa A023

Dừa xiêm xanh
4 năm 2 tháng

● Cần theo dõi

Số buồng
6

Số trái
34

Lần bón gần nhất
12 ngày trước

Lần tưới
2 ngày trước

Sâu bệnh
1 case đang theo dõi

[Xem hồ sơ]
```

---

# 7. SCREEN 03 — DANH SÁCH CÂY

## Header

```text
Cây trồng

Quản lý hồ sơ từng cây

                        [+ Thêm cây]
```

---

## Filter

```text
[Tìm mã cây...]

[Khu ▼]
[Vườn ▼]
[Giống ▼]
[Giai đoạn ▼]
[Sức khỏe ▼]
```

---

## Table

Các cột:

```text
Mã cây
Tên / Giống
Khu
Vườn
Hàng
Tuổi
Giai đoạn
Sức khỏe
Năng suất gần nhất
Actions
```

Ví dụ:

```text
A023
Dừa xiêm xanh
Khu Bắc
Vườn 01
Hàng A
4 năm
Đang cho trái
● Warning
34 trái
```

---

# 8. SCREEN 04 — HỒ SƠ CÂY

Đây là màn hình trung tâm.

## Header

```text
← A023

Dừa xiêm xanh

● Cần theo dõi

Khu Bắc / Vườn 01 / Hàng A

[QR] [Chỉnh sửa] [...]
```

---

## Header KPI

```text
Tuổi
4 năm 2 tháng

Giai đoạn
Cho trái

Số buồng
6

Số trái
34

Năng suất gần nhất
42 kg
```

---

## Tabs

```text
Tổng quan
Sinh trưởng
Công việc
Dinh dưỡng
Tưới
Sâu bệnh
Thu hoạch
Timeline
```

---

# 9. TAB TỔNG QUAN CÂY

Layout:

```text
┌──────────────────────────────┬──────────────────────┐
│ Thông tin cây               │ Ảnh cây             │
├──────────────────────────────┼──────────────────────┤
│ Chỉ số gần nhất             │ Công việc sắp tới   │
├──────────────────────────────┼──────────────────────┤
│ Môi trường                  │ Sức khỏe            │
└──────────────────────────────┴──────────────────────┘
```

Thông tin:

- Ngày trồng
- Tuổi
- Giống
- Vị trí
- Hàng
- GPS nếu có
- Trạng thái

---

# 10. SCREEN 05 — SINH TRƯỞNG

## Mục tiêu

Theo dõi sự phát triển theo thời gian.

Các chỉ số:

- Chiều cao
- Đường kính thân
- Chu vi thân
- Số lá
- Số cành
- Số hoa
- Số buồng
- Số trái
- Trọng lượng
- Tỷ lệ rụng

---

## Layout

Bên trái:

Chart.

Bên phải:

Lịch sử đo.

Ví dụ:

```text
01/08
Số trái: 47

01/09
Số trái: 40

01/10
Số trái: 34
```

Hệ thống có thể badge:

```text
↓ 27.6% trong 3 tháng
```

---

## Add Measurement

Button:

```text
+ Ghi nhận chỉ số
```

Form:

```text
Ngày đo

Chiều cao
Đường kính
Số lá
Số hoa
Số trái

Ảnh

Ghi chú
```

---

# 11. SCREEN 06 — CÔNG VIỆC & LỊCH CHĂM SÓC

## Views

Cho phép chuyển:

```text
[List] [Calendar] [Board]
```

---

## Task Types

- Tưới
- Bón phân
- Cắt tỉa
- Làm cỏ
- Vệ sinh
- Kiểm tra cây
- Kiểm tra sâu bệnh
- Điều trị
- Thu hoạch

---

## Calendar

Hiển thị:

```text
05/10
Kiểm tra A001–A020

10/10
Bón phân Khu Bắc

12/10
Kiểm tra sâu bệnh A023
```

---

## Task Detail Drawer

```text
Bón phân cây A023

Ngày:
10/10/2026

Vật tư:
NPK 16-16-8

Liều lượng dự kiến:
1.5 kg

Trạng thái:
Đang chờ

[Hoàn thành công việc]
```

---

# 12. HOÀN THÀNH CÔNG VIỆC

Khi người dùng hoàn thành task:

Form:

```text
Số lượng thực tế

Vật tư sử dụng

Thời gian

Ảnh

Ghi chú
```

Sau khi submit:

```text
Task → Completed
Kho → Trừ vật tư
Chi phí → Cập nhật
Timeline cây → Cập nhật
```

Không nhập lại lần hai.

---

# 13. SCREEN 07 — DINH DƯỠNG & BÓN PHÂN

Có 2 phần:

## A. Quy trình dinh dưỡng

Theo:

```text
Loại cây
+ Giống
+ Tuổi
+ Giai đoạn
```

Ví dụ:

```text
Dừa xiêm
4–6 năm
Giai đoạn cho trái
```

Hiển thị:

- Loại phân
- Liều lượng
- Chu kỳ
- Phương pháp bón
- Điều kiện
- Ghi chú kỹ thuật

---

## B. Lịch sử bón

Table:

```text
Ngày
Cây/Khu
Phân
Liều lượng
Người thực hiện
Chi phí
Kết quả
```

---

## Màn hình cây

Hiển thị:

```text
Lần bón gần nhất
12 ngày trước

Lần tiếp theo
18 ngày nữa
```

---

# 14. SCREEN 08 — NƯỚC & TƯỚI TIÊU

## Dashboard tưới

KPI:

```text
Vùng tưới
6

Lượng nước hôm nay
12.4 m³

Đang tưới
2 vùng

Cảnh báo
1
```

---

## Zone Cards / Table

```text
Zone A

A001–A020

Độ ẩm đất
31%

Lần tưới
2 ngày trước

Lượng nước gần nhất
420 L

[Chi tiết]
```

---

## Lịch tưới

Calendar/Schedule.

Hiển thị:

- Khu
- Thời gian
- Lượng nước
- Manual / Auto
- IoT Rule nếu có

---

# 15. SCREEN 09 — ĐẤT & MÔI TRƯỜNG

Dashboard theo khu.

Các chỉ số:

```text
pH
6.2

EC
1.4

Soil Moisture
41%

Air Temperature
31°C

Humidity
74%

Rain
0 mm
```

Dùng:

- KPI
- chart
- history
- threshold line

Nguồn dữ liệu badge:

```text
IoT
Manual
Lab Test
```

---

# 16. SCREEN 10 — THƯ VIỆN SÂU BỆNH

## Header

```text
Thư viện sâu bệnh

                          [+ Thêm sâu bệnh]
```

---

## Search

```text
[Tìm sâu bệnh...]

[Cây áp dụng ▼]
[Nhóm ▼]
[Mức độ ▼]
```

---

## Disease Card / Table

Thông tin:

```text
Tên:
Bọ cánh cứng hại dừa

Cây:
Dừa

Bộ phận:
Đọt / Lá non

Mức độ:
Cao
```

Có thumbnail ảnh.

---

# 17. SCREEN 11 — CHI TIẾT SÂU BỆNH

Header:

```text
Bọ cánh cứng hại dừa
```

Tabs:

```text
Tổng quan
Triệu chứng
Điều kiện phát sinh
Phòng ngừa
Điều trị
Thuốc phù hợp
Case thực tế
```

---

## Triệu chứng

- Mô tả
- Hình ảnh
- Bộ phận ảnh hưởng
- Dấu hiệu nhận biết

---

## Thuốc phù hợp

Table:

```text
Thuốc
Hoạt chất
Công dụng
Giá
Tồn kho
Hiệu quả lịch sử
```

---

# 18. SCREEN 12 — THƯ VIỆN THUỐC BVTV

Table:

```text
Tên thuốc
Hoạt chất
Nhóm
Công dụng
Sâu bệnh
Giá
Tồn kho
Nhà cung cấp
```

Click thuốc:

→ detail page.

---

# 19. SCREEN 13 — CHI TIẾT THUỐC

Hiển thị:

```text
Tên thương mại
Hoạt chất
Nhà sản xuất
Nhóm thuốc
```

Sections:

- Công dụng
- Đối tượng điều trị
- Cây áp dụng
- Hướng dẫn sử dụng
- Điều kiện sử dụng
- Cảnh báo
- Thời gian cách ly
- Giá
- Nhà cung cấp
- Tồn kho
- Lịch sử giá

---

# 20. SCREEN 14 — CASE SÂU BỆNH

List page.

Filter:

```text
[Cây/Khu]
[Bệnh]
[Mức độ]
[Trạng thái]
[Ngày]
```

Table:

```text
Case ID
Cây
Bệnh
Mức độ
Ngày phát hiện
Trạng thái
Điều trị
```

---

# 21. SCREEN 15 — CHI TIẾT CASE ĐIỀU TRỊ

Header:

```text
CASE-2026-0127

Dừa A023

Bọ cánh cứng

● Trung bình
```

---

## Case Timeline

```text
01/10
Phát hiện

02/10
Chẩn đoán

03/10
Điều trị lần 1

06/10
Kiểm tra lại

10/10
Đóng case
```

---

## Tabs

```text
Thông tin
Triệu chứng
Điều trị
Thuốc
Hình ảnh
Timeline
```

---

## Điều trị

Hiển thị:

- Phương pháp
- Thuốc
- Liều lượng
- Người thực hiện
- Ngày
- Kết quả

---

# 22. ĐỀ XUẤT ĐIỀU TRỊ

Khi chẩn đoán:

UI có panel:

```text
Đề xuất xử lý

1. Kiểm tra thêm triệu chứng X
2. Vệ sinh khu vực
3. Theo dõi cây lân cận

Thuốc phù hợp:

Thuốc A
Thuốc B
Thuốc C
```

Mỗi thuốc hiển thị:

```text
Giá
Tồn kho
Hoạt chất
Mức độ phù hợp
```

Không tự động điều trị.

Người dùng phải chọn:

```text
[Chọn phương án]
```

---

# 23. SCREEN 16 — THU HOẠCH

## Dashboard

KPI:

```text
Thu hoạch hôm nay
320 kg

Tháng này
3.2 tấn

Loại A
72%

Loại B
22%

Lỗi
6%
```

---

## Harvest List

```text
Ngày
Khu
Cây / Nhóm cây
Số lượng
Khối lượng
Loại A
Loại B
Lỗi
```

---

# 24. TẠO ĐỢT THU HOẠCH

Form:

```text
Ngày

Khu

Chọn cây
hoặc
Chọn nhóm cây

Số lượng

Khối lượng

Phân loại:
A
B
Reject

Ghi chú
```

Sau save:

```text
Plant Yield → Update
Harvest → Created
Commercial Product → Generated
Timeline → Updated
```

---

# 25. SCREEN 17 — NĂNG SUẤT

So sánh:

```text
Theo cây
Theo khu
Theo giống
Theo tháng
Theo năm
```

Ví dụ table:

```text
A001  125 trái
A002  142
A003   78
A004  136
```

A003 badge:

```text
↓ 32% dưới trung bình
```

---

# 26. SCREEN 18 — NHẬT KÝ VÒNG ĐỜI

Timeline của cây:

```text
2023
│
├── 10/05
│   Trồng cây
│
├── 10/06
│   Bón phân
│
├── 20/08
│   Kiểm tra sinh trưởng
│
├── 05/09
│   Phát hiện sâu bệnh
│
├── 06/09
│   Điều trị
│
└── 15/10
    Thu hoạch
```

Filter timeline:

```text
[Tất cả]

[Chăm sóc]

[Dinh dưỡng]

[Sâu bệnh]

[Thu hoạch]

[IoT]
```

---

# 27. SCREEN 19 — TRUY XUẤT NGUỒN GỐC

Search:

```text
[Mã cây / mã lô / mã thu hoạch / QR]
```

Ví dụ nhập:

```text
LOT-COC-20261015
```

Hiển thị:

```text
Lô sản phẩm
↓
Đợt thu hoạch
↓
Cây A001–A030
↓
Vườn 01
↓
Khu Bắc
↓
Trang trại Dừa An Phú
```

---

# 28. QUICK PLANT SEARCH

Topbar hoặc trong module có search nhanh:

```text
A023
```

Kết quả:

```text
A023
Dừa xiêm xanh

Khu Bắc
Vườn 01
Hàng A

● Warning
```

Actions:

```text
[Xem hồ sơ]
[Định vị trên bản đồ]
```

---

# 29. COMPONENT SYSTEM

Tái sử dụng:

```text
PlantStatusBadge
PlantMap
PlantMarker
PlantQuickDrawer

GrowthChart
GrowthRecordForm

TaskCalendar
TaskCard
TaskDetailDrawer

NutritionPlan
FertilizerHistory

IrrigationZoneCard

EnvironmentMetricCard
SensorChart

DiseaseCard
DiseaseDetail
TreatmentTimeline
TreatmentSuggestion

HarvestForm
HarvestTable

TraceabilityTree

LifecycleTimeline
```

---

# 30. STATUS SYSTEM

## Plant Health

```text
NORMAL
WATCH
SICK
CRITICAL
DEAD
```

UI:

```text
● Bình thường
● Cần theo dõi
● Bị bệnh
● Nghiêm trọng
● Đã chết
```

---

## Disease Case

```text
DETECTED
DIAGNOSING
TREATING
MONITORING
RESOLVED
CLOSED
```

---

## Task

```text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
OVERDUE
```

---

# 31. DATA RELATIONSHIP TRONG UI

UI phải thể hiện rõ:

```text
Plant
→ Growth
→ Task
→ Nutrition
→ Irrigation
→ Disease
→ Harvest
→ Timeline
```

Người dùng đang ở hồ sơ cây không cần phải sang nhiều module để xem dữ liệu.

Tabs phải cho phép xem toàn bộ lịch sử liên quan tới cây.

---

# 32. RESPONSIVE

## Desktop

Ưu tiên đầy đủ tính năng.

Map và table chiếm không gian lớn.

## Tablet

Sidebar collapse.

Map vẫn phải usable.

## Mobile

Ưu tiên:

- QR
- Tìm cây
- Hồ sơ cây
- Hoàn thành task
- Ghi chỉ số
- Báo sâu bệnh
- Chụp ảnh
- Thu hoạch

Không cần hiển thị dashboard phức tạp.

---

# 33. UI STATES

Mỗi screen phải có:

## Loading

Skeleton.

## Empty

Ví dụ:

```text
Chưa có cây nào trong khu vực này.

[+ Thêm cây]
```

## Error

```text
Không thể tải dữ liệu.

[Thử lại]
```

## Permission denied

```text
Bạn không có quyền chỉnh sửa dữ liệu này.
```

---

# 34. USER EXPERIENCE QUAN TRỌNG NGOÀI VƯỜN

Nhân viên ngoài vườn phải thao tác nhanh.

Ví dụ:

```text
Scan QR
→ A023
→ Báo sâu bệnh
→ Chụp ảnh
→ Chọn mức độ
→ Lưu
```

Không được yêu cầu qua 5–6 page.

Tương tự:

```text
Scan QR
→ A023
→ Hoàn thành bón phân
→ nhập lượng thực tế
→ Save
```

---

# 35. ROUTES ĐỀ XUẤT

```text
/production/dashboard

/production/map

/production/plants
/production/plants/new
/production/plants/:plantId
/production/plants/:plantId/edit

/production/growth

/production/tasks
/production/tasks/:taskId

/production/nutrition

/production/irrigation

/production/environment

/production/diseases
/production/diseases/:diseaseId

/production/pesticides
/production/pesticides/:pesticideId

/production/disease-cases
/production/disease-cases/:caseId

/production/harvests
/production/harvests/new
/production/harvests/:harvestId

/production/yield

/production/traceability
```

---

# 36. CẤU TRÚC FRONTEND ĐỀ XUẤT

```text
src/
│
├── modules/
│   └── production/
│       │
│       ├── dashboard/
│       │
│       ├── map/
│       │
│       ├── plants/
│       │   ├── list/
│       │   ├── detail/
│       │   ├── form/
│       │   └── growth/
│       │
│       ├── tasks/
│       ├── nutrition/
│       ├── irrigation/
│       ├── environment/
│       │
│       ├── disease/
│       │   ├── library/
│       │   ├── pesticides/
│       │   └── cases/
│       │
│       ├── harvest/
│       ├── yield/
│       └── traceability/
```

---

# 37. THỨ TỰ TRIỂN KHAI UI

## Phase 1

```text
Production Dashboard
Plant List
Plant Detail
Plant Form
```

## Phase 2

```text
Plant Map
Growth Tracking
Lifecycle Timeline
```

## Phase 3

```text
Task Management
Nutrition
Irrigation
```

## Phase 4

```text
Disease Library
Pesticide Library
Disease Case
Treatment
```

## Phase 5

```text
Harvest
Yield
Traceability
```

---

# 38. MVP UI

MVP nên ưu tiên:

1. Sơ đồ vườn
2. Danh sách cây
3. Hồ sơ cây
4. Sinh trưởng
5. Công việc
6. Bón phân
7. Báo sâu bệnh
8. Điều trị
9. Thu hoạch
10. Timeline

Các phần phân tích nâng cao có thể để Phase 2.

---

# 39. DỮ LIỆU MOCK

Farm:

```text
Trại Dừa An Phú
```

Area:

```text
Khu Bắc
```

Garden:

```text
Vườn 01
```

Plants:

```text
A001
A002
A003
...
A100
```

Plant example:

```text
A023

Dừa xiêm xanh

Ngày trồng:
10/05/2022

Tuổi:
4 năm 5 tháng

Giai đoạn:
Cho trái

Sức khỏe:
Cần theo dõi

Số buồng:
6

Số trái:
34
```

Disease example:

```text
CASE-2026-0127

Cây:
A023

Bệnh:
Bọ cánh cứng

Mức độ:
Trung bình

Trạng thái:
Monitoring
```

---

# 40. OUTPUT YÊU CẦU

Hãy tạo UI hoàn chỉnh cho phân hệ này.

Không chỉ tạo màn hình đẹp.

Phải thể hiện rõ nghiệp vụ:

```text
Cây
→ Sinh trưởng
→ Chăm sóc
→ Vật tư
→ Sâu bệnh
→ Điều trị
→ Thu hoạch
→ Truy xuất
```

Đặc biệt tập trung vào 3 trải nghiệm quan trọng:

## Experience 1

```text
Tìm cây
→ Xác định vị trí
→ Mở hồ sơ
```

## Experience 2

```text
Phát hiện bệnh
→ Báo cáo
→ Chẩn đoán
→ Chọn phương án
→ Điều trị
→ Theo dõi
```

## Experience 3

```text
Công việc chăm sóc
→ Thực hiện
→ Ghi vật tư
→ Hoàn thành
→ Dữ liệu liên quan tự cập nhật
```

UI phải cảm giác như một **hệ thống quản lý trang trại chuyên nghiệp**, không phải CRUD dashboard thông thường.