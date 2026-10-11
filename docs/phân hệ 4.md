# VAI TRÒ

Bạn là một **Senior Product Designer + UI/UX Designer + Frontend Architect + IoT Platform Architect + Smart Agriculture System Analyst**, có kinh nghiệm thiết kế:

- IoT Platform
- Smart Farm
- Device Monitoring
- MQTT-based System
- Real-time Dashboard
- Industrial Control Dashboard
- Automation Rule Engine
- Device Topology
- Alert Management
- Digital Twin
- Energy & Water Monitoring
- Fail-safe Control System

Nhiệm vụ của bạn là thiết kế và triển khai UI cho:

# PHÂN HỆ 4 — IoT & TỰ ĐỘNG HÓA

thuộc hệ thống:

# Smart Farm Management System

---

# 1. MỤC TIÊU PHÂN HỆ

Phân hệ IoT & Tự động hóa chịu trách nhiệm:

```text
Sensor
→ Thu thập dữ liệu
→ Truyền dữ liệu
→ Monitoring
→ Phân tích điều kiện
→ Automation
→ Điều khiển
→ Feedback
→ Cảnh báo
→ Nhật ký
```

Phân hệ này phải trả lời được:

- Thiết bị nào đang online?
- Sensor đang đo bao nhiêu?
- Khu nào đang có vấn đề?
- Máy bơm đang chạy hay không?
- Van nào đang mở?
- Rule nào vừa được kích hoạt?
- Vì sao hệ thống bật bơm?
- Automation có chạy thành công không?
- Có sensor nào gửi dữ liệu bất thường?
- Gateway nào đang mất kết nối?
- Trang trại hôm nay dùng bao nhiêu nước?
- Máy bơm tiêu thụ bao nhiêu điện?
- Có thể điều khiển thiết bị từ xa không?
- Khi mất Internet hệ thống sẽ xử lý thế nào?

---

# 2. RANH GIỚI VỚI PHÂN HỆ 3

Phải phân biệt rõ:

## Phân hệ 3 — Vật tư & Tài sản

Trả lời:

```text
Thiết bị là gì?
Mua khi nào?
Giá bao nhiêu?
Serial gì?
Đang lắp ở đâu?
Khi nào bảo trì?
```

## Phân hệ 4 — IoT & Tự động hóa

Trả lời:

```text
Thiết bị có online không?
Đang gửi dữ liệu gì?
Đang điều khiển gì?
Rule nào đang sử dụng?
Có lỗi không?
```

Hai phân hệ liên kết bằng:

```text
Device ID
```

Ví dụ:

```text
SM-03
```

Trong phân hệ 3:

```text
Soil Moisture Sensor
Giá: 350.000đ
Mua: 01/08/2026
Vị trí: Khu A
```

Trong phân hệ 4:

```text
SM-03

Online

Soil Moisture:
31%

Last Seen:
12 giây trước

Used By:
Irrigation Rule A
```

---

# 3. CÁC NĂNG LỰC CHÍNH

Phân hệ gồm 8 nhóm năng lực lớn:

```text
1. Monitoring
2. Control
3. Automation
4. Alerting
5. Device Intelligence
6. Resource Optimization
7. Reliability & Safety
8. Analytics & Prediction
```

---

# 4. CÁC MODULE CHÍNH

Thiết kế các module:

1. IoT Dashboard
2. Device Monitor
3. Realtime Sensor Data
4. Historical Data
5. Device Control
6. Automation Rules
7. Schedule Automation
8. Alert Center
9. Device Health
10. IoT Topology
11. Water Monitoring
12. Energy Monitoring
13. Automation History
14. IoT Event Log
15. Rule Simulator
16. Digital Twin
17. Remote Configuration
18. OTA Firmware
19. Reliability & Fail-safe
20. Analytics & Prediction

---

# 5. SIDEBAR PHÂN HỆ

```text
IoT & Tự động hóa
│
├── Tổng quan
│
├── Monitoring
│   ├── Thiết bị
│   ├── Sensor Realtime
│   ├── Lịch sử dữ liệu
│   └── Topology
│
├── Điều khiển
│   ├── Control Center
│   └── Digital Twin
│
├── Tự động hóa
│   ├── Rules
│   ├── Lịch tự động
│   ├── Rule Simulator
│   └── Automation History
│
├── Cảnh báo
│
├── Thiết bị
│   ├── Device Health
│   ├── Remote Config
│   └── OTA
│
├── Tài nguyên
│   ├── Nước
│   └── Năng lượng
│
├── Safety
│
└── Analytics
```

---

# 6. NGUYÊN TẮC UI CHUNG

UI phải mang phong cách:

**Modern IoT Control Center + Smart Agriculture + Industrial Dashboard**

Không được thiết kế giống CRUD dashboard thông thường.

Ưu tiên:

- realtime;
- trạng thái thiết bị;
- không gian vận hành;
- biểu đồ;
- topology;
- status indicators;
- alarm;
- control;
- automation.

Phải nhìn vào là hiểu ngay:

```text
Trang trại đang bình thường hay có vấn đề.
```

---

# 7. SCREEN 01 — IoT DASHBOARD

## Mục tiêu

Cho người quản lý thấy tình trạng IoT toàn trang trại trong một màn hình.

---

## KPI

Hiển thị:

```text
Thiết bị
48

Online
45

Offline
3

Critical Alerts
2

Automation Active
12

Water Today
12.4 m³

Energy Today
42.5 kWh
```

---

## Main Layout

```text
┌───────────────────────────────┬──────────────────────────┐
│ Farm IoT Map                 │ Critical Alerts          │
│                              │                          │
├───────────────────────────────┼──────────────────────────┤
│ Environment Overview         │ Device Health            │
│                              │                          │
├───────────────────────────────┴──────────────────────────┤
│ Automation Activity                                     │
└─────────────────────────────────────────────────────────┘
```

---

# 8. FARM IoT MAP

Hiển thị sơ đồ trang trại.

Các khu:

```text
Khu A
Khu B
Khu C
```

Mỗi khu có trạng thái:

```text
🟢 Normal
🟡 Warning
🔴 Critical
⚫ Offline
```

Click khu:

→ mở Right Drawer.

Ví dụ:

```text
Khu A

Devices:
12

Online:
11

Offline:
1

Soil Moisture:
34%

Temperature:
31°C

Active Automation:
2

Alerts:
1

[Xem chi tiết]
```

---

# 9. ENVIRONMENT OVERVIEW

Hiển thị các chỉ số môi trường chính.

Ví dụ:

```text
Soil Moisture
34%

Air Temperature
31°C

Humidity
72%

pH
6.3

EC
1.4

Tank Level
68%
```

Mỗi card có:

- giá trị;
- trạng thái;
- trend;
- ngưỡng;
- thời gian update gần nhất.

Ví dụ:

```text
Soil Moisture

34%

↓ 5%

Normal Range:
35–60%

Updated:
12s ago
```

---

# 10. SCREEN 02 — DEVICE MONITOR

Header:

```text
Thiết bị IoT

Theo dõi trạng thái kết nối và hoạt động thiết bị
```

Filter:

```text
[Search Device...]

[Type ▼]
[Farm ▼]
[Area ▼]
[Status ▼]
[Gateway ▼]
```

---

## Table

```text
Device ID
Name
Type
Location
Gateway
Status
Last Seen
Signal
Battery
Firmware
Actions
```

Ví dụ:

```text
SM-03

Soil Moisture 03

Sensor

Khu A

ESP32-04

● Online

12s ago

-62 dBm

84%

v1.2.0
```

---

# 11. DEVICE STATUS

Status gồm:

```text
ONLINE
OFFLINE
DEGRADED
WARNING
ERROR
MAINTENANCE
DISABLED
```

UI:

```text
● Online
● Offline
● Không ổn định
● Warning
● Error
● Bảo trì
● Disabled
```

---

# 12. SCREEN 03 — DEVICE DETAIL

Header:

```text
SM-03

Soil Moisture Sensor

● Online

Khu A

[Control] [Config] [...]
```

Tabs:

```text
Overview
Realtime
History
Connectivity
Automation
Alerts
Events
Health
Config
```

---

# 13. DEVICE OVERVIEW

Thông tin:

```text
Current Value
31%

Last Seen
12 giây trước

Gateway
ESP32-04

Location
Khu A

Plants
A021–A040
```

Có link:

```text
[Xem tài sản]
```

→ chuyển sang phân hệ 3.

---

# 14. REALTIME SECTION

Chart realtime.

Ví dụ:

```text
Soil Moisture %

60 ─
50 ─
40 ─
30 ──────╲____╱────
20 ─
```

Cho phép chọn window:

```text
5 phút
30 phút
1 giờ
6 giờ
24 giờ
```

---

# 15. SCREEN 04 — SENSOR REALTIME

Mục tiêu:

Theo dõi nhiều sensor cùng lúc.

Filter:

```text
[Area ▼]
[Sensor Type ▼]
[Status ▼]
```

Layout dạng grid.

Ví dụ:

```text
Soil A
31%

Soil B
47%

Temp A
31°C

Humidity A
72%

Tank
68%

Flow
12 L/min
```

Có switch:

```text
[Card View] [Table View]
```

---

# 16. SENSOR CARD

Mỗi card hiển thị:

```text
Soil Moisture A

31%

Normal:
35–60%

↓ Low

Updated:
8s ago
```

Actions:

```text
[History]
[Related Rule]
```

---

# 17. SCREEN 05 — HISTORICAL DATA

Mục tiêu:

Phân tích dữ liệu sensor theo thời gian.

Selector:

```text
Sensor
Metric
Area
```

Time range:

```text
1h
24h
7d
30d
Custom
```

Chart hỗ trợ:

- min;
- max;
- average;
- threshold;
- automation event marker.

Ví dụ:

```text
──── Soil Moisture
---- Lower Threshold
│   Irrigation Started
```

---

# 18. MULTI-SENSOR COMPARE

Cho phép chọn:

```text
SM-01
SM-02
SM-03
```

Hiển thị trên cùng chart.

Mục đích:

- so sánh vùng;
- phát hiện sensor lệch;
- kiểm tra consistency.

---

# 19. SCREEN 06 — CONTROL CENTER

Mục tiêu:

Điều khiển các thiết bị actuator.

Bao gồm:

- Pump
- Valve
- Relay
- Fan
- Light
- Mist
- Motor

---

## Layout

```text
┌────────────────────────────────────────────┐
│ Control Center                             │
├─────────────────────┬──────────────────────┤
│ Device List         │ Selected Device      │
│                     │                      │
│ Pump P01            │ Pump P01             │
│ Valve V01           │                      │
│ Valve V02           │ OFF                  │
│ Fan F01             │                      │
│                     │ [START]              │
└─────────────────────┴──────────────────────┘
```

---

# 20. PUMP CONTROL

Ví dụ:

```text
Pump P01

Status:
OFF

Mode:
AUTO

Runtime Today:
2h 15m

Current:
0A

Flow:
0 L/min
```

Actions:

```text
[Start]

[Stop]

[Manual Override]
```

---

# 21. SAFETY CONFIRMATION

Với thao tác nguy hiểm:

```text
Bạn đang bật Pump P01.

Pump này phục vụ:
Zone A và Zone B.

Valve hiện đang mở:
V02

Bạn có chắc chắn?

[Hủy]
[Bật Pump]
```

---

# 22. COMMAND STATE

Sau khi gửi lệnh:

Không được ngay lập tức hiển thị thành công.

Phải hiển thị:

```text
Sending Command...
```

Sau đó:

```text
Command sent
↓
Waiting for device ACK
```

Nếu thành công:

```text
Pump P01
ON

Confirmed by device
2 seconds ago
```

Nếu thất bại:

```text
Command timeout

Thiết bị không xác nhận trạng thái.

[Retry]
```

---

# 23. MANUAL OVERRIDE

Cho phép:

```text
Manual Override
```

Ví dụ:

```text
Disable Automation

Duration:
[15 phút ▼]

Reason:
[Kiểm tra hệ thống]

[Activate]
```

Sau 15 phút:

```text
Automation tự động được bật lại.
```

---

# 24. SCREEN 07 — DIGITAL TWIN

Mỗi thiết bị có bản sao số.

Ví dụ:

```text
Pump P01
● ON

Valve V01
● OPEN

Valve V02
● CLOSED

Tank
68%

Flow
12 L/min
```

Dùng layout trực quan dạng sơ đồ.

---

# 25. SCREEN 08 — AUTOMATION RULE LIST

Header:

```text
Automation Rules

Quản lý các quy tắc tự động hóa

                         [+ Tạo Rule]
```

---

## Filter

```text
[Search...]

[Area ▼]
[Status ▼]
[Type ▼]
```

---

## Table

```text
Rule
Area
Trigger
Action
Priority
Status
Last Run
Success Rate
Actions
```

Ví dụ:

```text
Irrigation Zone A

Khu A

Soil < 30%

Pump P01 + Valve V01

High

● Active

10 phút trước

98.6%
```

---

# 26. SCREEN 09 — RULE BUILDER

Đây là màn hình cực kỳ quan trọng.

Không bắt người dùng viết code.

Dùng visual builder.

---

## SECTION 1 — RULE NAME

```text
Tên Rule

Tưới tự động Khu A
```

---

## SECTION 2 — TRIGGER

Ví dụ:

```text
WHEN

[Soil Moisture ▼]

[SM-03 ▼]

[<]

[30]

[%]
```

---

# 27. MULTIPLE CONDITIONS

Cho phép:

```text
AND / OR
```

Ví dụ:

```text
WHEN

Soil Moisture < 30%

AND

Tank Level > 20%

AND

Rain Sensor = FALSE

AND

Pump P01 Status != ERROR
```

---

# 28. ACTION BUILDER

```text
THEN
```

Action:

```text
1. Open Valve V01
2. Start Pump P01
3. Wait 10 minutes
4. Stop Pump P01
5. Close Valve V01
6. Wait 5 minutes
7. Read Soil Sensor
```

Cho phép drag/reorder.

---

# 29. RULE SAFETY

Mỗi rule có:

```text
Maximum Runtime
15 minutes

Cooldown
30 minutes

Maximum Runs / Day
4

Priority
High
```

---

# 30. RULE MODE

```text
AUTO
SEMI-AUTO
NOTIFY ONLY
```

## AUTO

Tự chạy.

## SEMI-AUTO

Rule phát hiện điều kiện nhưng yêu cầu người dùng xác nhận.

## NOTIFY ONLY

Chỉ cảnh báo.

---

# 31. RULE PRIORITY

Ví dụ:

```text
Safety Rule
Priority 100

Irrigation Rule
Priority 50
```

Nếu:

```text
Soil dry = TRUE
```

nhưng:

```text
Tank low = TRUE
```

thì Safety Rule phải thắng.

---

# 32. SCREEN 10 — RULE SIMULATOR

Trước khi bật rule thật.

UI:

```text
Simulation Period

[7 ngày gần nhất ▼]
```

Kết quả:

```text
Rule would trigger:
14 lần

Average runtime:
8.2 phút

Estimated water:
3.2 m³

Conflicts:
1

Safety violations:
0
```

---

## Simulation Timeline

Hiển thị:

```text
01/10 06:20
Would Trigger

01/10 16:10
Would Trigger

02/10 07:00
Blocked by Tank Low
```

---

# 33. SCREEN 11 — SCHEDULE AUTOMATION

Tạo automation theo lịch.

Ví dụ:

```text
Tên:
Tưới sáng Zone A

Schedule:
06:00

Days:
Mon Tue Wed Thu Fri Sat Sun
```

Có thêm condition:

```text
Only run if:

Soil Moisture < 45%
```

---

# 34. SCREEN 12 — AUTOMATION HISTORY

Table:

```text
Time
Rule
Area
Trigger
Action
Result
Duration
Water
Status
```

Ví dụ:

```text
05/10 06:00

Irrigation A

Soil 27%

Pump P01 + Valve A

Success

10m

420L
```

---

# 35. AUTOMATION DETAIL

Timeline:

```text
06:00:01
Rule Triggered

06:00:02
Valve V01 OPEN

06:00:03
Pump P01 ON

06:10:03
Pump P01 OFF

06:10:04
Valve V01 CLOSED

06:15:00
Soil Moisture = 42%

Automation Completed
```

---

# 36. SCREEN 13 — ALERT CENTER

Header:

```text
Cảnh báo IoT

Theo dõi và xử lý sự cố IoT
```

---

## KPI

```text
Critical
2

Warning
8

Info
14

Unresolved
5
```

---

## Table

```text
Severity
Alert
Device
Area
Started
Duration
Status
Actions
```

---

# 37. ALERT TYPES

Ví dụ:

```text
DEVICE_OFFLINE
SENSOR_LOW
SENSOR_HIGH
SENSOR_ANOMALY
LOW_BATTERY
LOW_SIGNAL
TANK_LOW
PUMP_OVER_RUNTIME
NO_FLOW
VALVE_FAILURE
GATEWAY_OFFLINE
AUTOMATION_FAILURE
```

---

# 38. ALERT DETAIL

Ví dụ:

```text
CRITICAL

No Flow Detected

Pump P01:
ON

Valve V01:
OPEN

Flow Meter:
0 L/min

Duration:
2m 15s
```

Suggested Actions:

```text
1. Stop Pump P01
2. Check water source
3. Check Valve V01
4. Inspect Flow Sensor
```

Actions:

```text
[Stop Pump]

[Create Maintenance Task]

[Acknowledge]
```

---

# 39. ALERT LIFECYCLE

```text
OPEN
ACKNOWLEDGED
INVESTIGATING
RESOLVED
CLOSED
```

---

# 40. SCREEN 14 — DEVICE HEALTH

Dashboard:

```text
Healthy
41

Warning
4

Critical
2

Offline
1
```

Table:

```text
Device
Uptime
Offline Count
Signal
Battery
Errors
Last Calibration
Health Score
```

---

# 41. HEALTH SCORE

Ví dụ:

```text
SM-03

Health Score:
92/100
```

Dựa trên:

- connection;
- signal;
- battery;
- error rate;
- calibration;
- data consistency.

---

# 42. DATA ANOMALY

Hệ thống phát hiện:

```text
SM-03

Previous:
34%

Current:
99%

Change:
+65% in 5 seconds
```

Badge:

```text
Possible Sensor Anomaly
```

Actions:

```text
[View History]
[Compare Nearby Sensors]
[Create Inspection]
```

---

# 43. STUCK SENSOR DETECTION

Ví dụ:

```text
Sensor value unchanged

31%

for

48 hours
```

→ Warning.

---

# 44. SCREEN 15 — IoT TOPOLOGY

Hiển thị network graph.

Ví dụ:

```text
Internet
   ↓
MQTT Broker
   ↓
Gateway G01
   ↓
ESP32-01
├── SM-01
├── TEMP-01
├── Relay-01
│     ↓
│   Valve V01
│
└── Flow F01
```

---

# 45. TOPOLOGY COLORS

```text
Green = Online
Yellow = Warning
Red = Error
Gray = Offline
```

Click node:

→ mở quick detail.

---

# 46. TOPOLOGY FILTER

```text
[Farm ▼]
[Area ▼]
[Gateway ▼]
[Device Type ▼]
```

---

# 47. SCREEN 16 — WATER MONITORING

KPI:

```text
Today
12.4 m³

Yesterday
13.1 m³

This Month
324 m³

Cost
2.4 triệu
```

---

## Metrics

```text
L/cây/ngày

L/kg sản phẩm

Water by Area

Water by Irrigation Zone
```

---

## Chart

```text
Khu A
4.2 m³

Khu B
5.3 m³

Khu C
2.9 m³
```

---

# 48. WATER ANOMALY

Ví dụ:

```text
Zone B

Water Usage:
+38%

compared with 7-day average
```

→ Warning.

---

# 49. SCREEN 17 — ENERGY MONITORING

KPI:

```text
Today
42.5 kWh

Cost
128.000đ

Largest Consumer
Pump P01
```

Table:

```text
Device
Runtime
Energy
Cost
Efficiency
```

---

# 50. SCREEN 18 — IoT EVENT LOG

Table:

```text
Timestamp
Device
Event Type
Message
Source
Severity
```

Ví dụ:

```text
17:42:12

Pump P01

STATE_CHANGE

OFF → ON

Automation

INFO
```

---

# 51. EVENT FILTER

```text
[Device]
[Event Type]
[Severity]
[Rule]
[Date Range]
```

---

# 52. SCREEN 19 — REMOTE CONFIGURATION

Cho phép thay đổi:

```text
Sampling Interval
Upload Interval
Threshold
MQTT Topic
Power Mode
Sensor Offset
```

Ví dụ:

```text
SM-03

Sampling:
10s

Upload:
30s
```

---

# 53. CONFIG CHANGE SAFETY

Trước save:

```text
Bạn đang thay đổi cấu hình của SM-03.

Sampling:
30s → 10s

Điều này có thể tăng mức sử dụng pin.

[Hủy]
[Apply]
```

---

# 54. SCREEN 20 — OTA FIRMWARE

Table:

```text
Device
Current Firmware
Latest Firmware
Update Status
Last Update
```

Actions:

```text
[Update]
[Schedule]
```

---

## Bulk OTA

Cho phép chọn:

```text
20 ESP32 devices
```

→ schedule update.

Không cập nhật tất cả gateway cùng lúc nếu gây downtime.

---

# 55. SCREEN 21 — FAIL-SAFE & SAFETY

Mục tiêu:

Hiển thị các rule bảo vệ hệ thống.

Ví dụ:

```text
Pump Dry Run Protection

IF
Pump = ON
AND
Flow = 0

FOR
30 seconds

THEN
Stop Pump
Raise Critical Alert
```

---

# 56. FAIL-SAFE RULES

Ví dụ:

```text
Tank Empty Protection

Pump Over Runtime Protection

Valve Failure Protection

Gateway Offline Local Mode

Sensor Invalid Data Protection
```

---

# 57. LOCAL AUTOMATION

Phải thể hiện rule nào:

```text
Cloud Rule
```

và rule nào:

```text
Edge / Local Rule
```

Ví dụ:

```text
Emergency Irrigation

Location:
ESP32-04

Works Without Internet:
YES
```

---

# 58. SCREEN 22 — EDGE STATUS

Theo dõi:

```text
Gateway

Local Rules

Last Cloud Sync

Offline Duration

Local Storage Usage
```

---

# 59. SCREEN 23 — ANALYTICS

Các phân tích:

```text
Sensor Reliability
Automation Success
Water Efficiency
Energy Efficiency
Alert Frequency
Device Failure
```

---

# 60. AUTOMATION PERFORMANCE

Ví dụ:

```text
Irrigation Rule A

Runs:
128

Success:
126

Failed:
2

Success Rate:
98.4%

Water Used:
42.4 m³
```

---

# 61. ADVANCED ANALYTICS

Phase sau hỗ trợ:

- anomaly detection;
- predictive maintenance;
- irrigation optimization;
- water demand forecasting;
- energy optimization;
- plant stress detection.

---

# 62. WEATHER INTEGRATION

Có thể tích hợp:

```text
Weather Forecast
```

Rule:

```text
Rain Forecast > 70%

→ Delay Irrigation
```

UI phải hiển thị:

```text
Weather Source
Forecast
Last Update
```

---

# 63. LIÊN KẾT VỚI CÂY TRỒNG

IoT data không tồn tại độc lập.

Ví dụ:

```text
SM-03
```

phải liên kết:

```text
Zone A
→ A021–A040
```

Trong Plant Detail của phân hệ 2 có thể hiển thị:

```text
Environment

Soil:
31%

Temp:
31°C

Humidity:
72%
```

---

# 64. LIÊN KẾT VỚI TASK

Ví dụ:

```text
EC thấp
```

không nhất thiết automation trực tiếp.

Có thể:

```text
IoT Alert
→ Create Task
→ Kiểm tra dinh dưỡng Khu A
```

---

# 65. LIÊN KẾT VỚI MAINTENANCE

Ví dụ:

```text
Sensor Offline > 6h
```

→ action:

```text
Create Maintenance Request
```

→ chuyển sang Phân hệ 3.

---

# 66. COMPONENT SYSTEM

Tạo reusable components:

```text
IoTStatusBadge
RealtimeMetricCard
RealtimeChart
HistoricalChart

DeviceTable
DeviceQuickDrawer
DeviceHealthScore

ControlPanel
ControlButton
CommandStatus

RuleBuilder
ConditionBuilder
ActionBuilder
RulePriority
RuleSimulator

AlertCard
AlertTable
AlertDetailDrawer

TopologyGraph

WaterUsageChart
EnergyUsageChart

EventLogTable

DigitalTwinPanel

OTAProgress
RemoteConfigForm

FailSafeRuleCard
```

---

# 67. STATUS DESIGN

## Device

```text
ONLINE
OFFLINE
WARNING
ERROR
MAINTENANCE
DISABLED
```

## Command

```text
PENDING
SENT
ACKNOWLEDGED
SUCCESS
FAILED
TIMEOUT
```

## Automation

```text
ACTIVE
PAUSED
DISABLED
ERROR
```

## Alert

```text
INFO
WARNING
CRITICAL
```

---

# 68. REALTIME UX

Realtime update không được làm UI nhảy liên tục.

Ví dụ:

Không re-render cả table khi một sensor thay đổi.

Chỉ update:

```text
Value
Timestamp
Status
```

của row/card tương ứng.

---

# 69. CONNECTION STATE

Topbar hoặc IoT module cần hiển thị:

```text
Realtime Connected
```

hoặc:

```text
Realtime Disconnected
Trying to reconnect...
```

---

# 70. STALE DATA

Nếu sensor chưa cập nhật:

```text
Value:
31%

Last update:
15 minutes ago

⚠ Stale Data
```

Không hiển thị 31% như dữ liệu realtime bình thường.

---

# 71. CONFIRMATION RULE

Các action như:

- bật pump;
- mở valve;
- disable safety;
- OTA gateway;
- disable automation;

phải có confirmation phù hợp.

---

# 72. MOBILE / TABLET

Desktop là thiết bị chính.

Tablet phải hỗ trợ tốt:

- monitoring;
- control;
- alert;
- automation status.

Mobile ưu tiên:

```text
Alerts
Realtime
Pump Control
Valve Control
Device Status
```

Không bắt người dùng chỉnh Rule Builder phức tạp trên mobile.

---

# 73. ROUTES ĐỀ XUẤT

```text
/iot/dashboard

/iot/devices
/iot/devices/:deviceId

/iot/realtime
/iot/history

/iot/control

/iot/digital-twin

/iot/automation
/iot/automation/new
/iot/automation/:ruleId
/iot/automation/:ruleId/edit
/iot/automation/:ruleId/simulate
/iot/automation/history

/iot/schedules

/iot/alerts
/iot/alerts/:alertId

/iot/health

/iot/topology

/iot/water

/iot/energy

/iot/events

/iot/config

/iot/ota

/iot/safety

/iot/edge

/iot/analytics
```

---

# 74. FRONTEND STRUCTURE

```text
src/
│
├── modules/
│   └── iot/
│       │
│       ├── dashboard/
│       ├── devices/
│       │   ├── list/
│       │   ├── detail/
│       │   └── health/
│       │
│       ├── realtime/
│       ├── history/
│       ├── control/
│       ├── digital-twin/
│       │
│       ├── automation/
│       │   ├── rules/
│       │   ├── builder/
│       │   ├── simulator/
│       │   ├── schedules/
│       │   └── history/
│       │
│       ├── alerts/
│       ├── topology/
│       ├── water/
│       ├── energy/
│       ├── events/
│       ├── remote-config/
│       ├── ota/
│       ├── safety/
│       ├── edge/
│       └── analytics/
```

---

# 75. API / REALTIME AWARENESS

UI phải được thiết kế để hỗ trợ:

```text
REST API
+
WebSocket / SSE
+
MQTT Backend Events
```

Không cho frontend kết nối trực tiếp MQTT broker nếu kiến trúc không yêu cầu.

Realtime data nên đi:

```text
ESP32
→ MQTT Broker
→ Backend
→ WebSocket
→ Frontend
```

---

# 76. MOCK DATA

## Soil Sensor

```text
SM-03

Type:
Soil Moisture

Location:
Khu A

Gateway:
ESP32-04

Value:
31%

Status:
Online

Signal:
-62 dBm

Battery:
84%

Last Seen:
12 seconds ago
```

---

## Pump

```text
PUMP-P01

Status:
OFF

Mode:
AUTO

Runtime Today:
2h 15m

Flow:
0 L/min

Energy:
7.2 kWh
```

---

## Rule

```text
IRRIGATION-ZONE-A

Trigger:
Soil < 30%

Conditions:
Tank > 20%
Rain = false

Actions:
Open V01
Start P01
Wait 10m
Stop P01
Close V01

Priority:
50

Status:
ACTIVE
```

---

## Alert

```text
ALERT-2026-0127

Severity:
CRITICAL

Type:
NO_FLOW

Pump:
P01

Valve:
V01

Flow:
0 L/min

Duration:
2m 15s

Status:
OPEN
```

---

# 77. UI IMPLEMENTATION ORDER

## Phase 1

```text
IoT Dashboard
Device Monitor
Device Detail
Realtime Data
History
```

## Phase 2

```text
Control Center
Digital Twin
```

## Phase 3

```text
Automation Rule List
Rule Builder
Schedule
Automation History
```

## Phase 4

```text
Alert Center
Device Health
Topology
```

## Phase 5

```text
Water
Energy
Remote Config
OTA
```

## Phase 6

```text
Fail-safe
Edge
Analytics
Prediction
```

---

# 78. MVP UI

MVP ưu tiên:

1. IoT Dashboard
2. Device Monitor
3. Sensor Realtime
4. Historical Chart
5. Pump/Valve Control
6. Automation Rules
7. Basic Rule Builder
8. Alert Center
9. Device Health
10. IoT Event Log

Sau đó mới thêm:

- Digital Twin nâng cao;
- Rule Simulator;
- OTA;
- Edge;
- Prediction.

---

# 79. 5 TRẢI NGHIỆM CỐT LÕI

UI phải tối ưu đặc biệt 5 flow sau.

## EXPERIENCE 1 — MONITORING

```text
Mở Dashboard
→ thấy khu bất thường
→ click khu
→ thấy sensor
→ xem lịch sử
```

---

## EXPERIENCE 2 — MANUAL CONTROL

```text
Chọn Pump
→ Start
→ gửi command
→ nhận ACK
→ trạng thái cập nhật
```

---

## EXPERIENCE 3 — AUTOMATION

```text
Tạo Rule
→ đặt điều kiện
→ đặt action
→ test
→ activate
→ theo dõi lịch sử
```

---

## EXPERIENCE 4 — ALERT

```text
Alert xuất hiện
→ xem nguyên nhân
→ thực hiện action
→ acknowledge
→ resolve
```

---

## EXPERIENCE 5 — DEVICE FAILURE

```text
Device Offline
→ Device Health
→ xem lịch sử
→ tạo Maintenance
→ chuyển sang Phân hệ 3
```

---

# 80. OUTPUT YÊU CẦU

Hãy tạo UI hoàn chỉnh cho:

# IoT & Tự động hóa

Không thiết kế nó như một màn hình sensor đơn giản.

Phải thể hiện rõ toàn bộ chu trình:

```text
Sensor
→ Data
→ Monitoring
→ Decision
→ Automation
→ Control
→ Feedback
→ Alert
→ History
```

và mối quan hệ:

```text
IoT
↔ Cây trồng
↔ Tưới
↔ Thiết bị
↔ Bảo trì
↔ Chi phí
```

Đặc biệt phải đảm bảo:

- realtime rõ ràng;
- trạng thái thiết bị dễ hiểu;
- action nguy hiểm có kiểm soát;
- automation có traceability;
- người dùng luôn biết vì sao thiết bị được bật/tắt;
- có phân biệt manual và automatic;
- dữ liệu cũ phải được đánh dấu stale;
- fail-safe phải rõ ràng;
- không phụ thuộc hoàn toàn vào cloud cho các rule an toàn;
- UI có khả năng mở rộng cho hàng trăm hoặc hàng nghìn thiết bị.

Phong cách cuối cùng:

**Industrial IoT Control Center + Smart Farm + Modern SaaS**

Ưu tiên:

**reliability + observability + safety + clarity + automation**.