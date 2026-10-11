# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Data Product Architect + BI Dashboard Designer + Analytics System Analyst**, có kinh nghiệm thiết kế:

- Business Intelligence Dashboard
- Farm Analytics
- IoT Analytics
- Financial Dashboard
- Operational Analytics
- KPI Monitoring
- Benchmarking
- Anomaly Detection
- Forecasting
- Report Builder
- Management Information System

Nhiệm vụ của bạn là thiết kế và triển khai UI cho:

# PHÂN HỆ 6 — BÁO CÁO & PHÂN TÍCH

thuộc hệ thống:

# Smart Farm Management System

---

# 1. MỤC TIÊU PHÂN HỆ

Phân hệ này là nơi tổng hợp dữ liệu từ toàn bộ hệ thống để hỗ trợ quản lý và ra quyết định.

Dữ liệu đến từ:

```text
Sản xuất & Cây trồng
+
Vật tư & Kho
+
Thiết bị & Tài sản
+
IoT & Tự động hóa
+
Kinh doanh & Khách hàng
+
Chi phí & Tài chính
```

và được chuyển thành:

```text
KPI
→ Dashboard
→ So sánh
→ Phân tích
→ Cảnh báo bất thường
→ Dự báo
→ Hỗ trợ quyết định
```

Phân hệ phải giúp người quản lý trả lời nhanh:

- Trang trại hiện đang hoạt động thế nào?
- Khu nào đang tốt hoặc kém?
- Cây nào có năng suất thấp?
- Sâu bệnh nào xuất hiện nhiều?
- Chi phí đang tăng ở đâu?
- Nước và điện đang sử dụng có hiệu quả không?
- Thiết bị nào thường xuyên lỗi?
- Sản phẩm nào mang lại doanh thu cao?
- Khách hàng nào quan trọng?
- Trang trại đang có lời hay lỗ?
- Tháng tới có thể thu hoạch bao nhiêu?
- Vật tư nào có nguy cơ thiếu?
- Có dữ liệu nào bất thường cần kiểm tra?

---

# 2. NGUYÊN TẮC THIẾT KẾ

Phân hệ báo cáo không được chỉ là một tập hợp biểu đồ.

UI phải hỗ trợ:

```text
Overview
→ Drill-down
→ Compare
→ Filter
→ Diagnose
→ Action
```

Ví dụ:

```text
Dashboard
→ Năng suất Khu B thấp
→ Click Khu B
→ Xem cây
→ Xem nước
→ Xem phân bón
→ Xem sâu bệnh
→ Xác định dữ liệu liên quan
```

Người dùng không nên phải mở nhiều module thủ công để điều tra vấn đề.

---

# 3. NGUYÊN TẮC DATA ANALYTICS

Mỗi KPI phải có:

- Giá trị hiện tại
- So với kỳ trước
- Xu hướng
- Khoảng thời gian
- Nguồn dữ liệu
- Có thể drill-down nếu phù hợp

Ví dụ:

```text
Năng suất tháng

3.2 tấn

↑ 8.5%

so với tháng trước
```

Không hiển thị số đơn lẻ thiếu bối cảnh.

---

# 4. CÁC NHÓM PHÂN TÍCH

Phân hệ 6 gồm 6 nhóm lớn:

```text
1. Tổng quan điều hành
2. Sản xuất
3. IoT & Tài nguyên
4. Vật tư & Tài sản
5. Kinh doanh & Tài chính
6. Phân tích nâng cao
```

---

# 5. SIDEBAR PHÂN HỆ

```text
Báo cáo & Phân tích
│
├── Tổng quan điều hành
│
├── Sản xuất
│   ├── Cây trồng
│   ├── Sinh trưởng
│   ├── Năng suất
│   ├── Sâu bệnh
│   ├── Dinh dưỡng
│   └── Thu hoạch
│
├── IoT & Tài nguyên
│   ├── Môi trường
│   ├── Nước
│   ├── Điện
│   ├── Thiết bị IoT
│   └── Automation
│
├── Vật tư & Tài sản
│   ├── Kho
│   ├── Vật tư
│   ├── Tài sản
│   └── Bảo trì
│
├── Kinh doanh
│   ├── Doanh thu
│   ├── Đơn hàng
│   ├── Sản phẩm
│   ├── Khách hàng
│   └── Công nợ
│
├── Tài chính
│   ├── Chi phí
│   ├── Lợi nhuận
│   └── Hiệu quả
│
└── Phân tích nâng cao
    ├── So sánh
    ├── Bất thường
    ├── Dự báo
    └── Report Builder
```

---

# 6. SCREEN 01 — EXECUTIVE DASHBOARD

## Mục tiêu

Đây là màn hình dành cho:

- Chủ trang trại
- Quản lý
- Admin cấp cao

Phải cho biết tình trạng toàn hệ thống trong một màn hình.

---

## KPI HÀNG ĐẦU

```text
Tổng cây
1,250

Cây khỏe
1,173

Cây cần theo dõi
52

Đang bệnh
25

Sản lượng tháng
3.2 tấn

Doanh thu tháng
325 triệu

Chi phí tháng
184 triệu

Lợi nhuận
141 triệu
```

---

## KPI PHỤ

```text
Water Usage
324 m³

Energy
1,240 kWh

IoT Online
95.8%

Đơn hàng đang xử lý
28

Công nợ phải thu
82 triệu

Vật tư cảnh báo
13
```

---

# 7. EXECUTIVE DASHBOARD LAYOUT

```text
┌──────────────────────────────────────────────┐
│ KPI SUMMARY                                  │
├───────────────────────┬──────────────────────┤
│ Production            │ Financial            │
├───────────────────────┼──────────────────────┤
│ Farm Health Map       │ Alerts               │
├───────────────────────┼──────────────────────┤
│ Revenue & Profit      │ Resource Efficiency  │
└───────────────────────┴──────────────────────┘
```

---

# 8. GLOBAL FILTER BAR

Phải có filter chung:

```text
[Farm ▼]

[Area ▼]

[Crop ▼]

[Variety ▼]

[Time Range ▼]

[Compare With ▼]
```

Time range:

```text
Today
7 days
30 days
This Month
Quarter
Year
Custom
```

Filter chung phải áp dụng đồng bộ cho dashboard.

---

# 9. COMPARISON CONTROL

Cho phép:

```text
So với:

Kỳ trước
Cùng kỳ năm trước
Khu khác
Giống khác
```

Ví dụ:

```text
Khu Bắc
vs
Khu Nam
```

---

# 10. FARM HEALTH MAP

Hiển thị các khu:

```text
Khu Bắc
● Normal

Khu Trung
● Warning

Khu Nam
● Critical
```

Có thể dựa trên:

- sức khỏe cây
- sâu bệnh
- IoT
- năng suất
- công việc
- cảnh báo

Click khu:

→ mở Dashboard khu.

---

# 11. SCREEN 02 — PRODUCTION ANALYTICS

Dashboard sản xuất.

KPI:

```text
Cây đang sản xuất
1,250

Sinh trưởng bình thường
92%

Cần theo dõi
6%

Bất thường
2%

Thu hoạch tháng
3.2 tấn
```

---

# 12. PHÂN TÍCH THEO CÂY

Table:

```text
Cây
Giống
Tuổi
Khu
Health
Growth Trend
Yield
Cost
Profit
```

Ví dụ:

```text
A023

Dừa xiêm

4 năm

Khu Bắc

Warning

↓ Growth

78 trái/năm

450.000đ

1.2 triệu
```

---

# 13. TREE PERFORMANCE RANKING

Hiển thị:

```text
Top 10 cây năng suất cao

Bottom 10 cây năng suất thấp
```

Không chỉ hiển thị ranking.

Cho phép click:

```text
A023
```

→ mở hồ sơ cây ở Phân hệ 2.

---

# 14. SCREEN 03 — GROWTH ANALYTICS

Phân tích:

- chiều cao
- thân
- lá
- hoa
- trái
- tốc độ sinh trưởng

Chart:

```text
Average Growth by Month
```

Có thể chọn metric:

```text
[Chiều cao ▼]
```

---

# 15. NORMAL RANGE

Chart nên hiển thị:

```text
Actual Growth
Expected Growth Range
```

Ví dụ:

```text
Expected:
40–50 cm

Actual:
34 cm
```

Badge:

```text
Below Expected
```

---

# 16. SCREEN 04 — YIELD ANALYTICS

KPI:

```text
Tổng sản lượng
3.2 tấn

Năng suất / cây
82 kg

Năng suất / ha
12.4 tấn

So với kỳ trước
+8.5%
```

---

## CHARTS

```text
Yield by Area
Yield by Variety
Yield by Plant Age
Yield by Month
Yield by Plant
```

---

# 17. YIELD DISTRIBUTION

Ví dụ:

```text
<50 trái     12 cây

50–100       48 cây

100–150      32 cây

>150          8 cây
```

Giúp nhận diện nhóm bất thường.

---

# 18. SCREEN 05 — PEST & DISEASE ANALYTICS

KPI:

```text
Cases tháng này
18

Active Cases
5

Resolved
13

Average Resolution
6.2 days
```

---

## CHARTS

```text
Disease Frequency
By Area
By Month
By Crop
By Severity
```

---

# 19. TREATMENT PERFORMANCE

Table:

```text
Disease
Treatment
Cases
Success Rate
Average Days
Cost
```

Ví dụ:

```text
Bệnh X

Treatment A

12 cases

91%

5.2 days

1.2 triệu
```

---

# 20. DISEASE HEATMAP

Hiển thị:

```text
Khu Bắc     2 cases
Khu Trung   8 cases
Khu Nam     1 case
```

Có thể tô vùng theo mật độ.

---

# 21. SCREEN 06 — NUTRITION ANALYTICS

KPI:

```text
Fertilizer Used
2.4 tấn

Cost
42 triệu

Average / Tree
1.9 kg

Plan Variance
+8%
```

---

## PHÂN TÍCH

```text
Fertilizer by Area
Fertilizer by Type
Fertilizer Cost
Plan vs Actual
```

---

# 22. EFFICIENCY VIEW

Ví dụ:

```text
Khu A

Fertilizer:
+20%

Yield:
+4%
```

Hiển thị:

```text
Potential Efficiency Issue
```

Không tự kết luận bón dư nếu chưa đủ dữ liệu.

---

# 23. SCREEN 07 — WATER ANALYTICS

KPI:

```text
Water Today
12.4 m³

Month
324 m³

L/tree/day
18.4 L

L/kg output
24.8 L
```

---

## CHARTS

```text
Water by Area
Water by Day
Water by Irrigation Zone
Water per Plant
Water per kg
```

---

# 24. WATER EFFICIENCY

So sánh:

```text
Khu A

18 L/kg

Khu B

27 L/kg
```

Badge:

```text
Khu B sử dụng nước cao hơn 50%
```

---

# 25. SCREEN 08 — ENVIRONMENT ANALYTICS

Metrics:

```text
Temperature
Humidity
Soil Moisture
pH
EC
Rain
Light
```

---

## ANALYSIS

Không chỉ chart raw.

Phải có:

```text
Average
Min
Max
Time Outside Range
Alert Count
Missing Data
```

Ví dụ:

```text
Soil Moisture

Average:
42%

Below threshold:
34 hours

Alert:
8
```

---

# 26. SCREEN 09 — IoT DEVICE ANALYTICS

KPI:

```text
Devices
48

Uptime
98.2%

Offline Events
32

Critical Failures
4
```

---

## TABLE

```text
Device
Uptime
Offline Count
Signal
Battery
Errors
Maintenance
Health Score
```

---

# 27. DEVICE RELIABILITY RANKING

```text
Most Reliable Devices

Least Reliable Devices
```

Ví dụ:

```text
SM-07

Uptime:
87%

Offline:
14 lần
```

---

# 28. SCREEN 10 — AUTOMATION ANALYTICS

KPI:

```text
Automation Runs
1,240

Successful
1,218

Failed
22

Success Rate
98.2%
```

---

## TABLE

```text
Rule
Runs
Success
Failed
Average Runtime
Water
Energy
```

---

# 29. AUTOMATION BENEFIT

Nếu dữ liệu đủ:

```text
Manual Irrigation Estimate
420 m³

Automation Actual
360 m³

Estimated Water Saving
60 m³
```

Phải ghi rõ:

```text
Estimated
```

nếu là số ước tính.

---

# 30. SCREEN 11 — INVENTORY ANALYTICS

KPI:

```text
Inventory Value
182 triệu

Low Stock
8

Expiring
5

Expired
1
```

---

## CHARTS

```text
Inventory Value by Category
Inventory Usage
Stock Movement
Top Used Materials
```

---

# 31. MATERIAL CONSUMPTION

Ví dụ:

```text
NPK

Opening:
500 kg

Purchased:
300

Used:
420

Closing:
380
```

---

# 32. INVENTORY FORECAST

Nếu đủ dữ liệu:

```text
NPK

Current:
350 kg

Average Usage:
20 kg/day

Estimated Days Remaining:
17 days
```

Badge:

```text
Reorder Soon
```

---

# 33. SCREEN 12 — ASSET & MAINTENANCE ANALYTICS

KPI:

```text
Assets
126

Active
110

Maintenance
9

Broken
7

Asset Value
820 triệu
```

---

## CHARTS

```text
Maintenance Cost
Failure Count
Asset Downtime
Maintenance by Type
```

---

# 34. REPAIR VS REPLACE INSIGHT

Ví dụ:

```text
Pump P01

Purchase Cost:
8 triệu

Repair Cost 12 months:
3.2 triệu

Downtime:
82 hours
```

UI chỉ cung cấp dữ liệu hỗ trợ quyết định.

Không tự kết luận thay mới nếu chưa có rule.

---

# 35. SCREEN 13 — SALES ANALYTICS

KPI:

```text
Revenue
325 triệu

Orders
128

Average Order Value
2.54 triệu

Units Sold
18,420
```

---

## CHARTS

```text
Revenue by Time
Revenue by Product
Revenue by Customer
Revenue by Customer Type
Units Sold
Average Selling Price
```

---

# 36. PRODUCT PERFORMANCE

Table:

```text
Product
Revenue
Quantity
Avg Price
Return Rate
Margin
```

Nếu chưa có đủ cost allocation:

không hiển thị Margin giả.

---

# 37. SCREEN 14 — CUSTOMER ANALYTICS

KPI:

```text
Customers
146

Active
112

New
8

Repeat Rate
74%
```

---

## ANALYSIS

```text
Top Customers
Revenue by Customer
Order Frequency
Last Purchase
Average Order
Debt
```

---

# 38. RFM — PHASE SAU

Có thể bổ sung:

```text
Recency
Frequency
Monetary
```

Phân nhóm:

```text
Champions
Loyal
At Risk
Inactive
```

Không bắt buộc MVP.

---

# 39. SCREEN 15 — RECEIVABLE ANALYTICS

KPI:

```text
Total Receivable
82 triệu

Overdue
21 triệu

Due in 7 days
14 triệu
```

---

## AGING

```text
Current
1–30 days
31–60
61–90
>90
```

Chart + table.

---

# 40. SCREEN 16 — COST ANALYTICS

KPI:

```text
Total Cost
184 triệu

Material
72 triệu

Water/Energy
35 triệu

Maintenance
18 triệu

Other
59 triệu
```

---

## COST BREAKDOWN

Phân tích theo:

```text
Farm
Area
Plant
Crop
Task
Device
Month
```

---

# 41. COST PER TREE

Ví dụ:

```text
A023

Fertilizer
250k

Pesticide
70k

Water
80k

Allocated Maintenance
30k

Total
430k
```

---

# 42. SCREEN 17 — PROFITABILITY

KPI:

```text
Revenue
325 triệu

Cost
184 triệu

Profit
141 triệu

Profit Margin
43.4%
```

---

## PROFIT VIEW

```text
Profit by Product
Profit by Area
Profit by Crop
Profit by Customer
Profit by Time
```

---

# 43. PROFIT PER TREE

Nếu dữ liệu được phân bổ đủ:

```text
A023

Revenue:
1.84 triệu

Cost:
430k

Direct Profit:
1.41 triệu
```

Ghi rõ:

```text
Direct Profit
```

nếu chưa phân bổ toàn bộ overhead.

---

# 44. SCREEN 18 — BENCHMARK

Đây là một màn hình quan trọng.

Cho phép chọn:

```text
Compare

[Khu A ▼]

vs

[Khu B ▼]
```

---

## METRICS

```text
Yield
Water
Fertilizer
Disease
Cost
Revenue
Profit
IoT Alerts
```

---

## EXAMPLE

```text
                   Khu A       Khu B

Yield              12.4t       10.8t

Water/kg           18L         27L

Disease Cases      4           11

Cost/kg            8.200       10.500
```

---

# 45. PLANT BENCHMARK

Cho phép:

```text
A023
vs
Nhóm cây cùng tuổi
```

Hiển thị:

```text
Yield
Growth
Water
Disease
Cost
```

---

# 46. SCREEN 19 — ANOMALY CENTER

Tập trung các bất thường hệ thống phát hiện.

Ví dụ:

```text
A023
Năng suất thấp hơn nhóm 28%

Khu B
Nước cao hơn trung bình 35%

NPK
Chi phí tăng 42%

SM-07
Dữ liệu lệch sensor gần đó
```

---

# 47. ANOMALY LIST

Columns:

```text
Severity
Object
Metric
Detected
Deviation
Confidence
Status
```

Status:

```text
NEW
REVIEWING
CONFIRMED
DISMISSED
RESOLVED
```

---

# 48. ANOMALY DETAIL

Ví dụ:

```text
Khu B

Water Usage Anomaly

Current:
27 L/kg

Normal:
18–21 L/kg

Deviation:
+35%
```

Related Data:

```text
Irrigation Count
Rainfall
Soil Moisture
Yield
```

Actions:

```text
[Open Irrigation]

[Create Investigation Task]

[Dismiss]
```

---

# 49. KHÔNG BIẾN CORRELATION THÀNH CAUSATION

Ví dụ hệ thống thấy:

```text
High Humidity
+
Disease Cases
```

UI nên ghi:

```text
Có tương quan quan sát được
```

không ghi:

```text
Độ ẩm cao là nguyên nhân gây bệnh
```

nếu chưa đủ bằng chứng.

---

# 50. SCREEN 20 — FORECAST CENTER

Các forecast:

```text
Yield
Harvest Date
Material Demand
Water Demand
Revenue
Inventory
Disease Risk
```

---

# 51. FORECAST CARD

Ví dụ:

```text
Projected Harvest Next Month

1,500–1,700 fruits

Confidence:
82%

Based on:
12 months historical data
```

---

# 52. FORECAST VISUAL

Hiển thị:

```text
Historical
Forecast
Confidence Range
```

Không hiển thị forecast như một giá trị chắc chắn.

---

# 53. MATERIAL FORECAST

Ví dụ:

```text
NPK Demand

Next 30 days:
450 kg

Current Stock:
350 kg

Expected Shortage:
100 kg
```

Action:

```text
[Xem vật tư]

[Tạo đề xuất mua]
```

---

# 54. SCREEN 21 — REPORT BUILDER

Mục tiêu:

Cho phép người dùng tự tạo báo cáo mà không cần developer.

---

## STEP 1 — DATA SOURCE

```text
Cây trồng
Sinh trưởng
Sâu bệnh
IoT
Kho
Kinh doanh
Tài chính
```

---

# 55. STEP 2 — METRICS

Ví dụ:

```text
Yield
Cost
Water
Revenue
```

---

# 56. STEP 3 — DIMENSIONS

```text
By Area
By Plant
By Product
By Month
By Customer
```

---

# 57. STEP 4 — FILTER

Ví dụ:

```text
Farm = An Phú

Area = Khu Bắc

Time = 2026
```

---

# 58. STEP 5 — VISUALIZATION

Cho phép:

```text
Table
Bar
Line
Area
Pie
Scatter
Heatmap
```

Không cho chọn chart không phù hợp với dữ liệu.

---

# 59. REPORT PREVIEW

Hiển thị trực tiếp preview trước khi lưu.

Actions:

```text
[Lưu báo cáo]

[Export]

[Schedule]
```

---

# 60. SCREEN 22 — SAVED REPORTS

Table:

```text
Tên report
Owner
Data Source
Created
Last Run
Schedule
Actions
```

---

# 61. REPORT SCHEDULING

Ví dụ:

```text
Báo cáo sản xuất tuần

Every Monday

08:00

Recipients:
Management
```

Output:

```text
PDF
Excel
```

---

# 62. EXPORT

Hỗ trợ:

```text
PDF
Excel
CSV
```

Nếu export có filter:

export phải giữ đúng filter hiện tại.

---

# 63. DASHBOARD PERSONALIZATION

Phase sau có thể cho người dùng:

```text
Add Widget
Remove Widget
Rearrange Widget
Save Layout
```

Nhưng không bắt buộc MVP.

---

# 64. DRILL-DOWN PATTERN

Mọi KPI quan trọng nên có khả năng drill-down.

Ví dụ:

```text
25 cây bệnh
```

Click:

```text
Danh sách 25 cây
```

Click A023:

```text
Plant Detail
```

---

# 65. CROSS-MODULE NAVIGATION

Báo cáo phải liên kết trực tiếp tới module nguồn.

Ví dụ:

```text
SM-07 có uptime thấp
```

Action:

```text
[Xem thiết bị]
```

→ Phân hệ IoT.

Hoặc:

```text
NPK sắp hết
```

→ Phân hệ vật tư.

---

# 66. DATA FRESHNESS

Mỗi dashboard cần hiển thị:

```text
Last updated:
17:42:10
```

Realtime data:

```text
Live
```

Aggregate report:

```text
Updated 5 minutes ago
```

Nếu stale:

```text
⚠ Data may be outdated
```

---

# 67. DATA SOURCE INDICATOR

Ví dụ:

```text
Source:
IoT Sensor

Manual Entry

Inventory Transaction

Sales Order
```

Rất quan trọng cho traceability.

---

# 68. KPI TOOLTIP

Hover/click KPI:

```text
Năng suất / cây

Công thức:
Tổng sản lượng / số cây đang khai thác
```

Người dùng cần hiểu KPI được tính thế nào.

---

# 69. COMPONENT SYSTEM

Tạo reusable components:

```text
AnalyticsKpiCard
TrendIndicator
ComparisonBadge

GlobalFilterBar
DateRangePicker
CompareSelector

AnalyticsChart
TimeSeriesChart
ThresholdChart
Heatmap
ScatterPlot

DrilldownTable
RankingTable

FarmHealthMap

BenchmarkPanel
BenchmarkTable

AnomalyCard
AnomalyDetailDrawer

ForecastCard
ForecastChart
ConfidenceBadge

ReportBuilder
MetricSelector
DimensionSelector
VisualizationSelector

ExportMenu
ReportScheduleForm

DataFreshnessBadge
DataSourceBadge
```

---

# 70. CHART DESIGN RULES

Charts phải:

- có title rõ;
- đơn vị rõ;
- legend rõ;
- không quá nhiều màu;
- tooltip;
- zoom/filter khi cần;
- có empty state.

Không sử dụng pie chart khi có quá nhiều categories.

Không dùng 3D chart.

---

# 71. TABLE DESIGN

Analytics tables hỗ trợ:

- Sort
- Filter
- Search
- Pin column
- Export
- Pagination
- Drill-down

---

# 72. RESPONSIVE

Desktop là chính.

Tablet:

- KPI giảm cột;
- chart stack;
- filter collapse.

Mobile:

ưu tiên:

```text
Executive KPI
Alerts
Anomaly
Quick Reports
```

Không cần Report Builder đầy đủ trên mobile.

---

# 73. ROUTES ĐỀ XUẤT

```text
/analytics/dashboard

/analytics/production
/analytics/growth
/analytics/yield
/analytics/disease
/analytics/nutrition

/analytics/environment
/analytics/water
/analytics/energy
/analytics/iot-devices
/analytics/automation

/analytics/inventory
/analytics/assets
/analytics/maintenance

/analytics/sales
/analytics/customers
/analytics/receivables

/analytics/cost
/analytics/profitability

/analytics/benchmark

/analytics/anomalies
/analytics/anomalies/:anomalyId

/analytics/forecast

/analytics/reports
/analytics/reports/new
/analytics/reports/:reportId
```

---

# 74. FRONTEND STRUCTURE

```text
src/
│
├── modules/
│   └── analytics/
│       │
│       ├── dashboard/
│       │
│       ├── production/
│       │   ├── growth/
│       │   ├── yield/
│       │   ├── disease/
│       │   └── nutrition/
│       │
│       ├── iot/
│       │   ├── environment/
│       │   ├── water/
│       │   ├── energy/
│       │   ├── devices/
│       │   └── automation/
│       │
│       ├── resources/
│       │   ├── inventory/
│       │   ├── assets/
│       │   └── maintenance/
│       │
│       ├── sales/
│       │   ├── revenue/
│       │   ├── customers/
│       │   └── receivables/
│       │
│       ├── finance/
│       │   ├── cost/
│       │   └── profitability/
│       │
│       ├── benchmark/
│       ├── anomalies/
│       ├── forecast/
│       └── report-builder/
```

---

# 75. UI STATES

Mọi analytics screen phải có:

## Loading

Skeleton chart.

## No Data

```text
Chưa có đủ dữ liệu cho khoảng thời gian này.
```

## Partial Data

```text
Một số nguồn dữ liệu chưa đầy đủ.
```

## Error

```text
Không thể tải báo cáo.

[Thử lại]
```

---

# 76. INSUFFICIENT DATA

Dự báo hoặc phân tích không được tạo số giả.

Ví dụ:

```text
Chưa đủ dữ liệu để dự báo sản lượng.

Yêu cầu tối thiểu:
6 tháng dữ liệu.
```

---

# 77. PERMISSION

Không phải người dùng nào cũng được xem:

- Revenue
- Profit
- Customer
- Cost
- Debt

Analytics phải tuân theo RBAC của Phân hệ 1.

---

# 78. MOCK DATA

Executive:

```text
Plants:
1,250

Healthy:
1,173

Yield:
3.2 tons

Revenue:
325m

Cost:
184m

Profit:
141m
```

---

## Area Comparison

```text
Khu Bắc

Yield:
12.4 tons/ha

Water:
18 L/kg

Disease:
4 cases

Cost:
8,200đ/kg
```

```text
Khu Nam

Yield:
10.8 tons/ha

Water:
27 L/kg

Disease:
11 cases

Cost:
10,500đ/kg
```

---

# 79. IMPLEMENTATION ORDER

## Phase 1

```text
Executive Dashboard
Production Dashboard
Yield Analytics
Sales Analytics
Cost Analytics
```

## Phase 2

```text
Disease
Water
IoT Device
Inventory
Profitability
```

## Phase 3

```text
Benchmark
Anomaly Center
```

## Phase 4

```text
Forecast
Report Builder
Scheduled Reports
```

---

# 80. MVP UI

MVP ưu tiên:

1. Executive Dashboard
2. Production Analytics
3. Yield Analytics
4. Disease Analytics
5. IoT Analytics
6. Inventory Analytics
7. Sales Analytics
8. Cost Analytics
9. Profitability
10. Benchmark cơ bản

Forecast và Report Builder có thể để phase sau.

---

# 81. 5 TRẢI NGHIỆM CỐT LÕI

## EXPERIENCE 1 — TỔNG QUAN

```text
Mở Dashboard
→ hiểu tình trạng farm
→ thấy vấn đề
→ drill-down
```

---

## EXPERIENCE 2 — SO SÁNH

```text
Chọn Khu A
vs
Khu B
→ xem khác biệt
→ mở dữ liệu liên quan
```

---

## EXPERIENCE 3 — BẤT THƯỜNG

```text
Anomaly detected
→ xem mức độ
→ xem evidence
→ điều tra
→ chuyển sang module nguồn
```

---

## EXPERIENCE 4 — LỢI NHUẬN

```text
Revenue
→ Cost
→ Profit
→ Drill-down theo khu/cây/sản phẩm
```

---

## EXPERIENCE 5 — DỰ BÁO

```text
Historical Data
→ Forecast
→ Confidence
→ Expected Gap
→ Recommended Next Action
```

---

# 82. OUTPUT YÊU CẦU

Hãy thiết kế và triển khai UI hoàn chỉnh cho:

# Báo cáo & Phân tích

Không thiết kế nó như một trang chứa nhiều chart rời rạc.

Phải thể hiện được chu trình:

```text
Operational Data
→ KPI
→ Trend
→ Comparison
→ Drill-down
→ Insight
→ Action
```

và liên kết toàn hệ thống:

```text
Plant
+
IoT
+
Inventory
+
Asset
+
Sales
+
Finance
↓
Analytics
```

UI phải giúp người quản lý đi từ:

```text
"Có vấn đề gì?"
```

đến:

```text
"Vấn đề nằm ở đâu?"
```

rồi:

```text
"Dữ liệu nào đang liên quan?"
```

và cuối cùng:

```text
"Tôi cần mở module nào để xử lý?"
```

Phân biệt rõ:

- dữ liệu thực tế;
- dữ liệu ước tính;
- forecast;
- anomaly;
- correlation;
- recommendation.

Không trình bày dự báo hoặc tương quan như sự thật chắc chắn.

Phong cách:

**Modern BI Dashboard + Agricultural Analytics + IoT Intelligence**

Ưu tiên:

**decision support + drill-down + comparability + explainability + traceability + clarity**.