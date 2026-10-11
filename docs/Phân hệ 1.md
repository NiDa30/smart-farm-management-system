# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Frontend Architect + Solution Architect** có kinh nghiệm xây dựng hệ thống:

- Farm Management System
- Smart Agriculture
- IoT Platform
- ERP nông nghiệp
- Dashboard quản trị
- Role Based Access Control
- Bản đồ trang trại
- Thiết kế hệ thống quản lý nhiều phân hệ

Nhiệm vụ của bạn là thiết kế và triển khai giao diện web cho một **Hệ thống Quản lý Nông nghiệp tích hợp IoT**.

Ưu tiên:

- UI hiện đại
- Dễ sử dụng
- Ít thao tác thừa
- Có tính hệ thống
- Dễ mở rộng
- Phù hợp desktop
- Responsive tablet
- Không tạo giao diện quá nhiều card rời rạc
- Hiển thị được nhiều dữ liệu nhưng không gây rối
- Tối ưu không gian màn hình desktop
- Hạn chế scroll dọc không cần thiết
- Có design system thống nhất cho toàn bộ sản phẩm

---

# PHẦN I — TỔNG QUAN HỆ THỐNG

Tên tạm thời:

# Smart Farm Management System

Đây là hệ thống quản lý nông nghiệp từ:

**Trang trại  
→ Cây trồng  
→ Chăm sóc  
→ Vật tư  
→ IoT  
→ Sâu bệnh  
→ Thu hoạch  
→ Kinh doanh  
→ Tài chính  
→ Báo cáo**

Hệ thống phải cho phép quản lý tới **từng cá thể cây**.

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

Mỗi cây có:

- mã cây;
- vị trí;
- QR;
- giống;
- tuổi;
- giai đoạn sinh trưởng;
- chỉ số sinh trưởng;
- lịch sử chăm sóc;
- lịch sử bón phân;
- lịch sử tưới;
- sâu bệnh;
- điều trị;
- thu hoạch;
- năng suất;
- chi phí;
- nhật ký vòng đời.

---

# PHẦN II — CÁC PHÂN HỆ CHÍNH

Hệ thống gồm 6 phân hệ.

---

# PHÂN HỆ 1 — HỆ THỐNG & PHÂN QUYỀN

Chức năng:

- Quản lý trang trại
- Cấu trúc trang trại
- Quản lý khu vực
- Quản lý người dùng
- Vai trò
- Phân quyền
- Phạm vi dữ liệu
- Audit Log
- Cấu hình hệ thống

Đây là phân hệ nền tảng.

---

# PHÂN HỆ 2 — SẢN XUẤT & CÂY TRỒNG

Bao gồm:

## Cơ cấu trang trại

```text
Trang trại
→ Khu
→ Vườn / Lô / Nhà kính
→ Hàng / Luống
→ Cây
```

## Sơ đồ vườn

Cho phép:

- xem vị trí cây;
- tìm cây;
- highlight cây;
- xem trạng thái;
- xác định hàng/cột;
- GPS nếu có;
- QR Code;
- hướng dẫn vị trí cây.

## Hồ sơ cây

Mỗi cây có:

- mã;
- loại cây;
- giống;
- ngày trồng;
- tuổi;
- trạng thái;
- hình ảnh;
- vị trí;
- sức khỏe.

## Sinh trưởng

Theo dõi:

- chiều cao;
- đường kính;
- số lá;
- số cành;
- số hoa;
- số trái;
- số buồng;
- trọng lượng;
- tốc độ sinh trưởng.

## Công việc

- tưới;
- bón phân;
- cắt tỉa;
- kiểm tra;
- làm cỏ;
- vệ sinh;
- xử lý bệnh;
- thu hoạch.

## Dinh dưỡng

Quản lý:

- phân bón;
- liều lượng;
- chu kỳ;
- quy trình;
- điều kiện bón;
- lịch sử.

## Tưới tiêu

Quản lý:

- nguồn nước;
- vùng tưới;
- lịch tưới;
- lượng nước;
- thời gian;
- phương pháp tưới.

## Đất & môi trường

Theo dõi:

- pH;
- EC;
- độ ẩm đất;
- nhiệt độ;
- độ ẩm không khí;
- ánh sáng;
- mưa.

## Sâu bệnh

Tách thành:

### Thư viện sâu bệnh

- loại sâu bệnh;
- triệu chứng;
- hình ảnh;
- nguyên nhân;
- phương pháp phòng;
- phương pháp điều trị.

### Thư viện thuốc

- tên thuốc;
- hoạt chất;
- công dụng;
- sâu bệnh đặc trị;
- liều lượng;
- cảnh báo;
- giá;
- nhà cung cấp;
- tồn kho.

### Case điều trị

```text
Phát hiện
→ Chẩn đoán
→ Điều trị
→ Theo dõi
→ Đóng case
```

## Thu hoạch

Theo dõi:

- số lượng;
- khối lượng;
- chất lượng;
- sản lượng;
- năng suất từng cây.

## Nhật ký & truy xuất nguồn gốc

Có thể truy:

```text
Sản phẩm
→ Thu hoạch
→ Cây
→ Vườn
→ Lịch sử chăm sóc
```

---

# PHÂN HỆ 3 — VẬT TƯ NÔNG NGHIỆP

Bao gồm:

## Vật tư

- phân;
- thuốc;
- hạt giống;
- vật tư;
- phụ tùng.

## Nhà cung cấp & mua hàng

Flow:

```text
Nhà cung cấp
→ Đơn mua
→ Nhận hàng
→ Tự động tăng kho
```

Không yêu cầu người dùng tạo phiếu nhập lần hai.

Nếu nhận một phần:

```text
Đặt 500 kg
→ Nhận 300
→ Kho +300
→ Nhận tiếp 200
→ Kho +200
```

## Kho

- nhập;
- xuất;
- tồn;
- lô;
- hạn sử dụng;
- FEFO;
- kiểm kê;
- điều chuyển.

## Thiết bị & tài sản

- máy bơm;
- máy cắt;
- máy phun;
- dụng cụ;
- phương tiện.

## Thiết bị IoT

Quản lý tài sản:

- ESP32;
- gateway;
- sensor;
- relay;
- valve;
- camera;
- LoRa;
- modem;
- nguồn.

Phân hệ này trả lời:

> Thiết bị nào đang sở hữu, mua khi nào, giá bao nhiêu, lắp ở đâu?

## Bảo trì

- sửa chữa;
- calibration;
- thay pin;
- thay linh kiện;
- firmware;
- chi phí.

## Chi phí

Có thể phân bổ theo:

- farm;
- khu;
- cây;
- task;
- thiết bị.

---

# PHÂN HỆ 4 — IOT & TỰ ĐỘNG HÓA

Phân hệ này trả lời:

> Thiết bị đang hoạt động như thế nào?

Chức năng chính:

## Monitoring

- dữ liệu realtime;
- sensor;
- biểu đồ;
- lịch sử.

## Control

Điều khiển:

- bơm;
- valve;
- relay;
- quạt;
- đèn;
- motor.

## Automation

Ví dụ:

```text
IF soil_moisture < 30%
AND tank > 20%
AND rain = false

THEN
open valve
start pump
water 10 minutes
```

## Alert

- sensor offline;
- nhiệt độ cao;
- đất khô;
- pH bất thường;
- bồn nước thấp;
- valve lỗi;
- pump lỗi.

Ngoài ra:

- Device Health
- Calibration
- OTA
- Remote Config
- IoT Topology
- Fail-safe
- Manual Override
- Energy Monitoring
- Water Monitoring
- Rule Simulation
- Digital Twin
- Prediction
- Anomaly Detection

---

# PHÂN HỆ 5 — KINH DOANH & KHÁCH HÀNG

Flow chính:

```text
Thu hoạch
→ Phân loại
→ Kho thành phẩm
→ Khách hàng
→ Báo giá
→ Đơn hàng
→ Giữ hàng
→ Giao hàng
→ Thanh toán
→ Doanh thu
```

Bao gồm:

- CRM;
- khách hàng;
- sản phẩm;
- SKU;
- bảng giá;
- báo giá;
- đơn hàng;
- tồn thành phẩm;
- reserve stock;
- delivery;
- payment;
- công nợ;
- khiếu nại;
- truy xuất nguồn gốc.

---

# PHÂN HỆ 6 — BÁO CÁO & PHÂN TÍCH

Dashboard tổng hợp:

- cây;
- sức khỏe;
- năng suất;
- sâu bệnh;
- IoT;
- vật tư;
- kho;
- doanh thu;
- chi phí;
- lợi nhuận.

Báo cáo:

- sinh trưởng;
- năng suất;
- sâu bệnh;
- phân bón;
- nước;
- IoT;
- thiết bị;
- kho;
- tài sản;
- kinh doanh;
- khách hàng;
- chi phí;
- lợi nhuận.

Phân tích nâng cao:

- Benchmark
- Anomaly Detection
- Forecast
- Prediction
- Report Builder

---

# PHẦN III — MASTER BUSINESS FLOW

Flow tổng thể:

```text
ADMIN
↓
Thiết lập trang trại
↓
Thiết lập cấu trúc
↓
Tạo cây
↓
Theo dõi sinh trưởng
↓
Lập lịch chăm sóc
↓
Thực hiện công việc
↓
Sử dụng vật tư
↓
Trừ kho
↓
Ghi chi phí
↓
IoT giám sát
↓
Automation
↓
Phát hiện sâu bệnh
↓
Điều trị
↓
Theo dõi
↓
Thu hoạch
↓
Phân loại
↓
Kho thành phẩm
↓
Đơn hàng
↓
Giao hàng
↓
Thanh toán
↓
Doanh thu
↓
Báo cáo
↓
Phân tích
```

Nguyên tắc:

# Một hành động chỉ nhập một lần.

Ví dụ:

```text
Bón phân hoàn thành
```

phải tự động:

```text
→ Trừ kho
→ Ghi chi phí
→ Ghi nhật ký cây
→ Cập nhật task
```

Tương tự:

```text
Nhận hàng
```

phải:

```text
→ Kho tăng
→ Lịch sử nhà cung cấp cập nhật
→ Giá vật tư cập nhật
→ Tài chính cập nhật
```

---

# PHẦN IV — YÊU CẦU THIẾT KẾ UI CHUNG

Ứng dụng là web dashboard desktop-first.

## Layout chung

```text
┌───────────────────────────────────────────────┐
│ TOPBAR                                        │
├────────────┬──────────────────────────────────┤
│            │                                  │
│ SIDEBAR    │ CONTENT                          │
│            │                                  │
│            │                                  │
└────────────┴──────────────────────────────────┘
```

---

# Sidebar

Màu xanh navy / xanh đậm.

Menu:

```text
Tổng quan

Hệ thống
 ├ Trang trại
 ├ Cấu trúc khu vực
 ├ Người dùng
 ├ Vai trò & Phân quyền
 ├ Audit Log
 └ Cấu hình

Sản xuất & Cây trồng

Vật tư nông nghiệp

IoT & Tự động hóa

Kinh doanh & Khách hàng

Báo cáo & Phân tích
```

Sidebar:

- collapsible;
- icon rõ ràng;
- active menu nổi bật;
- không quá rộng.

---

# Topbar

Bao gồm:

- Hamburger
- Breadcrumb
- Global Search
- Notification
- IoT Alert
- User avatar
- User role

Ví dụ:

```text
Trang trại > Trại Dừa An Phú > Khu Bắc
```

---

# Màu sắc

Primary:

```text
#16A34A
```

Primary Dark:

```text
#166534
```

Sidebar:

```text
#0F2D32
```

Background:

```text
#F5F7F8
```

Card:

```text
#FFFFFF
```

Border:

```text
#E5E7EB
```

Warning:

```text
#F59E0B
```

Error:

```text
#DC2626
```

Info:

```text
#2563EB
```

---

# Typography

Ưu tiên:

```text
Inter
```

hoặc font tương đương hỗ trợ tiếng Việt tốt.

Sizes:

```text
Page title: 24px
Section title: 18px
Card title: 15–16px
Body: 14px
Caption: 12–13px
```

---

# PHẦN V — TRIỂN KHAI UI PHÂN HỆ 1

Tên:

# HỆ THỐNG & PHÂN QUYỀN

Các màn hình:

```text
01 Dashboard
02 Farm List
03 Farm Detail
04 Create/Edit Farm
05 Area Structure
06 Farm Map
07 User List
08 User Detail
09 Create/Edit User
10 Role List
11 Role Permission
12 Audit Log
13 System Settings
```

---

# SCREEN 01 — SYSTEM DASHBOARD

## Header

```text
Tổng quan hệ thống

Trại Dừa An Phú
```

Bên phải:

```text
[Hôm nay ▼]
```

---

## KPI Section

Sử dụng một hàng KPI cards.

### User

```text
Người dùng
12

+2 tháng này
```

### Roles

```text
Vai trò
6
```

### Areas

```text
Khu vực
8
```

### Plants

```text
Cây
1,250
```

### IoT

```text
IoT Devices
48

45 Online
3 Offline
```

KPI card:

- icon;
- số lớn;
- caption;
- trend nhỏ;
- click được.

---

# Dashboard Main Content

Chia layout:

```text
60% Farm Overview
40% Recent Activity
```

---

## Farm Overview

Hiển thị bản đồ/sơ đồ trang trại.

Ví dụ:

```text
KHU BẮC
320 cây

KHU TRUNG
450 cây

KHU NAM
480 cây
```

Click khu:

→ mở right drawer.

Drawer:

```text
Khu Bắc

Diện tích
8.2 ha

320 cây

Cây cần theo dõi
6

IoT Offline
1

[Xem chi tiết]
```

---

## Recent Activity

Timeline:

```text
Nguyễn Văn A
Thêm người dùng mới
10 phút trước

Lê Văn C
Cập nhật quyền
35 phút trước
```

---

## System Alerts

Panel cuối:

```text
Critical
Gateway G02 Offline

Warning
3 tài khoản bị khóa
```

---

# SCREEN 02 — FARM LIST

Header:

```text
Quản lý trang trại

Thông tin chung và cấu hình các trang trại

                         [+ Thêm trang trại]
```

Toolbar:

```text
[Search...]

[Loại hình ▼]
[Trạng thái ▼]
[Sort ▼]

[Card] [Table]
```

---

## Farm Card

```text
[IMAGE]

Trại Dừa An Phú
FARM-001

Bến Tre

25.6 ha

Dừa xiêm

● Đang hoạt động

[Chi tiết] [Chỉnh sửa] [...]
```

Menu:

```text
Xem
Chỉnh sửa
Xem bản đồ
Cấu trúc
Tạm ngưng
Archive
```

Không hard delete farm có dữ liệu.

---

# SCREEN 03 — FARM DETAIL

Header:

```text
← Trại Dừa An Phú

FARM-001

● Active

                         [Chỉnh sửa]
```

Tabs:

```text
Tổng quan
Cấu trúc
Bản đồ
Người dùng
Thiết bị
Hoạt động
```

Overview cards:

```text
3 khu
8 vườn
42 hàng
1,250 cây
48 thiết bị
12 người dùng
```

---

# SCREEN 04 — CREATE / EDIT FARM

Dùng Step Wizard.

Step sidebar:

```text
1 Thông tin chung
2 Địa chỉ & vị trí
3 Cấu hình mặc định
4 Xác nhận
```

---

## STEP 1

Fields:

```text
Tên trang trại *
Mã trang trại *
Loại hình *
Diện tích
Cây trồng chính
Mô tả
Trạng thái
```

---

## STEP 2

```text
Tỉnh
Huyện
Xã
Địa chỉ

Latitude
Longitude

MAP
```

Cho phép chọn vị trí trên map.

---

## STEP 3

```text
Area Unit
Weight Unit
Volume Unit
Currency
Timezone
Language
```

---

## STEP 4

Review toàn bộ thông tin.

Bottom sticky actions:

```text
[Quay lại]

[Hủy] [Tạo trang trại]
```

---

# SCREEN 05 — AREA STRUCTURE

Đây là màn hình dạng master-detail.

```text
┌────────────────────┬───────────────────────────────┐
│ STRUCTURE TREE     │ DETAIL                       │
│                    │                              │
│ Farm               │ Khu Bắc                     │
│ ├ Khu Bắc          │                              │
│ │ ├ Vườn 01        │ [Info][Children][Map][IoT]  │
│ │ │ ├ Hàng A       │                              │
│ │ │ └ Hàng B       │                              │
│ │ └ Vườn 02        │                              │
│ └ Khu Nam          │                              │
└────────────────────┴───────────────────────────────┘
```

---

## Tree Panel

Top:

```text
[Tìm khu vực...]

[+ Thêm khu vực]
```

Node:

```text
▾ Khu Bắc                    ...
    ▾ Vườn 01                ...
        Hàng A
        Hàng B
```

Menu:

```text
Thêm child
Chỉnh sửa
Di chuyển
Ngừng sử dụng
Xóa
```

---

## Detail Panel

Header:

```text
Khu Bắc

KB

[Chỉnh sửa]
```

KPI:

```text
8.2 ha
2 vườn
320 cây
10 IoT devices
```

Tabs:

```text
Thông tin
Danh sách vườn
Bản đồ
IoT
```

---

# SCREEN 06 — FARM MAP

Main content gần full screen.

Toolbar nổi:

```text
[Search]

[+]
[-]
[Fit]
[Layer]
[Map/Satellite]
```

Layers:

```text
☑ Khu
☑ Vườn
☐ Hàng
☐ Cây
☐ IoT
☐ Cảnh báo
```

Click object:

→ mở right drawer.

---

# SCREEN 07 — USER LIST

Header:

```text
Người dùng

Quản lý tài khoản và quyền truy cập

                         [+ Thêm người dùng]
```

Filter:

```text
[Tìm tên/email...]

[Role ▼]
[Farm ▼]
[Area ▼]
[Status ▼]
```

Table:

```text
☐

Người dùng
Username
Email
Vai trò
Phạm vi
Status
Last Login
Actions
```

Actions:

```text
View
Edit
Reset Password
Lock
More
```

Bulk actions:

```text
3 người dùng được chọn

[Lock]
[Assign Role]
[Assign Area]
```

---

# SCREEN 08 — USER DETAIL

Header card:

```text
[Avatar]

Nguyễn Văn A
@nva

Quản trị viên

● Active

                    [Chỉnh sửa] [...]
```

Tabs:

```text
Thông tin
Vai trò & Quyền
Phạm vi dữ liệu
Hoạt động
Phiên đăng nhập
```

---

## Data Scope Tab

Tree checkbox:

```text
☑ Trại Dừa An Phú
   ☑ Khu Bắc
   ☑ Khu Trung
   ☐ Khu Nam
```

---

# SCREEN 09 — CREATE / EDIT USER

Sections:

## Personal

```text
Họ tên *
Email *
Phone
```

## Account

```text
Username *
Password *
Confirm Password *
```

Switch:

```text
☑ Yêu cầu đổi mật khẩu lần đầu
```

## Role

```text
[Role ▼]
```

## Scope

```text
○ Toàn hệ thống
○ Toàn trang trại
● Chọn khu vực
```

Tree checkbox.

Sticky buttons:

```text
[Hủy]
[Lưu]
```

---

# SCREEN 10 — ROLE LIST

Table:

```text
Vai trò
Mô tả
Users
Type
Status
Actions
```

Ví dụ:

```text
Admin
Toàn quyền
1
System
Active
```

System Role:

- không xóa được;
- không sửa một số permission cốt lõi.

Actions:

```text
View
Edit
Duplicate
Delete
```

---

# SCREEN 11 — ROLE & PERMISSION

Đây là màn hình quan trọng.

Header:

```text
Kỹ thuật viên

6 người dùng

[Duplicate] [Save]
```

Permission Matrix:

```text
                    View Create Update Delete Approve

Cây trồng            ✓     ✓      ✓      -      -
Công việc            ✓     ✓      ✓      -      ✓
Sâu bệnh             ✓     ✓      ✓      -      -
Kho                  ✓     -      -      -      -
IoT                  ✓     -      ✓      -      -
Kinh doanh           -     -      -      -      -
```

Có:

- Select all row
- Select all column
- Collapse module
- Search permission

Khi save:

```text
Bạn đang thay đổi quyền của
Kỹ thuật viên.

6 người dùng sẽ bị ảnh hưởng.

[Hủy]
[Xác nhận]
```

---

# SCREEN 12 — AUDIT LOG

Toolbar:

```text
[User ▼]
[Module ▼]
[Action ▼]
[Entity ▼]
[From]
[To]

[Reset]
```

Table:

```text
Time
User
Action
Module
Target
IP
```

Click row:

→ mở drawer.

Drawer:

```text
Audit ID
User
Time
Action
Entity
IP
```

Diff:

```text
Before

health_status:
NORMAL

After

health_status:
WARNING
```

---

# SCREEN 13 — SYSTEM SETTINGS

Layout:

```text
┌──────────────────┬───────────────────────────┐
│ Settings Menu    │ Settings Content          │
│                  │                           │
│ General          │                           │
│ Format           │                           │
│ Notification     │                           │
│ Security         │                           │
│ Integration      │                           │
│ Backup           │                           │
└──────────────────┴───────────────────────────┘
```

---

# GENERAL

```text
Tên hệ thống
Logo
Primary Color
Language
Timezone
```

---

# FORMAT

```text
Date Format
Time Format
Currency
Weight
Area
Volume
Decimal
```

---

# NOTIFICATION

Matrix:

```text
                      In-App Email SMS

IoT Critical             ✓     ✓    ✓
Task Overdue             ✓     ✓
Low Inventory            ✓     ✓
```

---

# SECURITY

```text
Minimum Password Length

Session Timeout

Failed Login Limit

☑ Strong Password
☑ Auto Lock
```

---

# BACKUP

```text
Last Backup
05/10/2026 02:00

Successful

[Backup Now]

[Restore]
```

Restore yêu cầu xác nhận mạnh.

---

# PHẦN VI — COMPONENT SYSTEM

Phải tái sử dụng component.

Tạo các component:

```text
AppSidebar
AppTopbar
Breadcrumb
PageHeader
KpiCard
StatusBadge
DataTable
FilterBar
SearchInput
FormField
SelectField
DatePicker
TreeView
PermissionMatrix
MapPanel
RightDrawer
ConfirmModal
ActivityTimeline
AuditDiff
EmptyState
LoadingState
ErrorState
Pagination
```

---

# DATA TABLE STANDARD

Mọi table:

- sticky header;
- search;
- filter;
- sort;
- pagination;
- column visibility;
- row action;
- bulk selection;
- loading skeleton;
- empty state.

Không để table kéo dài toàn trang nếu có thể dùng pagination.

---

# FORM STANDARD

Form desktop nên dùng 2 cột nếu phù hợp.

Ví dụ:

```text
Tên trang trại      Mã

Loại hình           Diện tích

Tỉnh                Huyện
```

Textarea full width.

Form actions sticky bottom nếu form dài.

---

# PHẦN VII — RESPONSIVE

Desktop là thiết bị chính.

Breakpoint lớn:

```text
>= 1280px
```

Sidebar đầy đủ.

Tablet:

```text
768–1279px
```

Sidebar icon hoặc drawer.

Các card giảm số cột.

Mobile:

chỉ cần hỗ trợ các chức năng quản trị cơ bản.

Không cố nhồi Permission Matrix hoặc Map lớn trên mobile.

---

# PHẦN VIII — UX RULES

1. Không yêu cầu người dùng nhập lại dữ liệu đã có.

2. Mọi thao tác nguy hiểm cần confirmation.

3. Không hard delete dữ liệu đã phát sinh nghiệp vụ.

4. Luôn có breadcrumb.

5. Status sử dụng:

- text;
- icon;
- màu.

Không dùng màu làm tín hiệu duy nhất.

6. Các màn hình quản lý dữ liệu lớn ưu tiên table.

7. Các đối tượng cần nhận diện nhanh ưu tiên card/map.

8. Quick information dùng drawer.

9. Form dài dùng page.

10. Modal chỉ dành cho tác vụ ngắn hoặc confirmation.

---

# PHẦN IX — TRẠNG THÁI UI

Mỗi màn hình phải thiết kế đủ:

## Loading

Skeleton.

## Empty

Ví dụ:

```text
Chưa có trang trại

Tạo trang trại đầu tiên để bắt đầu quản lý.

[+ Tạo trang trại]
```

## Error

```text
Không thể tải dữ liệu.

[Thử lại]
```

## Permission Denied

```text
Bạn không có quyền xem nội dung này.
```

---

# PHẦN X — YÊU CẦU TRIỂN KHAI FRONTEND

Nếu triển khai bằng React hoặc Vue:

- Component-based architecture
- Route-based page structure
- Reusable UI components
- Form validation
- API service abstraction
- State management hợp lý
- Không hardcode mock data trực tiếp trong component UI
- Tách mock/API layer
- Chuẩn bị cho RBAC
- Chuẩn bị multi-farm context
- Responsive
- Accessible
- Maintainable

Suggested structure:

```text
src/
│
├── layouts/
│
├── components/
│   ├── common/
│   ├── table/
│   ├── form/
│   ├── map/
│   └── permission/
│
├── modules/
│   └── system/
│       ├── dashboard/
│       ├── farms/
│       ├── areas/
│       ├── users/
│       ├── roles/
│       ├── audit/
│       └── settings/
│
├── router/
├── services/
├── stores/
├── types/
└── utils/
```

---

# PHẦN XI — ROUTES PHÂN HỆ 1

```text
/system/dashboard

/system/farms
/system/farms/new
/system/farms/:farmId
/system/farms/:farmId/edit

/system/areas

/system/map

/system/users
/system/users/new
/system/users/:userId
/system/users/:userId/edit

/system/roles
/system/roles/new
/system/roles/:roleId
/system/roles/:roleId/edit

/system/audit

/system/settings/general
/system/settings/format
/system/settings/notifications
/system/settings/security
/system/settings/integrations
/system/settings/backup
```

---

# PHẦN XII — DỮ LIỆU GIẢ LẬP CHO UI

Farm:

```text
Trại Dừa An Phú
FARM-001
25.6 ha
Bến Tre
Dừa xiêm
Active
```

Areas:

```text
Khu Bắc
320 cây

Khu Trung
450 cây

Khu Nam
480 cây
```

Users:

```text
Nguyễn Văn A
Admin

Trần Thị B
Manager

Lê Văn C
Technician

Phạm Thị D
Warehouse
```

Roles:

```text
Admin
Farm Owner
Manager
Technician
Warehouse Staff
Sales Staff
Viewer
```

---

# PHẦN XIII — OUTPUT YÊU CẦU

Hãy triển khai UI theo thứ tự:

## Phase UI 1

- Main Layout
- Sidebar
- Topbar
- Dashboard

## Phase UI 2

- Farm List
- Farm Detail
- Create/Edit Farm

## Phase UI 3

- Area Structure
- Farm Map

## Phase UI 4

- User List
- User Detail
- User Form

## Phase UI 5

- Role List
- Permission Matrix

## Phase UI 6

- Audit Log
- Settings

Đảm bảo toàn bộ UI nhìn như **một sản phẩm duy nhất**, không phải tập hợp nhiều trang rời rạc.

Thiết kế cần mang phong cách:

**Modern Agricultural SaaS + Enterprise Dashboard + IoT Platform**

Không dùng quá nhiều gradient hoặc hiệu ứng trang trí.

Ưu tiên:

**clarity > decoration**

và:

**information density + usability + consistency**.