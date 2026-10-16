# Water node telemetry v2

v1 ENV01/PUMP01 remains unchanged. v2 accepts WATER nodes declared in
`iot_node` with named sensor channels; v2 is not a new pump command format.

Topic: `smartfarm/FARM001/{nodeId}/telemetry`; payload deviceId must match the
registered physical node. No new subscription or public HTTP ingestion route.
AWS node certificate/policy/firmware are still separate provisioning steps.

See [schema](water-telemetry.schema.json) and [example](examples/water-telemetry.json).
Every reading includes channelId, metric, unit, quality, value and
calibrationVersion. Metric/unit/calibration must exactly match the declared
channel. Packet may contain any nonempty subset (max8) of channels; omitted
channels keep their own prior reading/age, never become zero or fresh.

Metrics: WATER_PRESENT/boolean, FLOW_RATE/L/min (>=0), WATER_TEMPERATURE/°C
(-55..125), WATER_PRESSURE/kPa (>=0). Flow/pressure bounds are parser rules,
not calibrated sensor ranges. VALID is the device's quality report, not
independent proof of metrology. calibrationVersion=null explicitly means no
calibration version declared. A version string does not prove calibration.

SENSOR_FAULT requires value=null; VALID requires a correctly typed finite
value. false, zero, missing channel and fault/null have separate meanings.
LOW/HIGH WATER_PRESENT is true when that switch senses water at its position;
no derived tank percentage, safety permission or impossible-float detection
is implemented from these measurements yet.

Strict envelope/reading keys, duplicate JSON keys, UUID, nonnegative safe-JS
sequence/uptime, unique channelId and timestamp <= serverNow+2s are enforced
in Java. JSON Schema alone cannot enforce channelId uniqueness by property,
clock bounds or registry lookups. Historical packets remain accepted; UI
shows source+receipt freshness and newest fault without fallback to good data.

(nodeId, bootId, sequence) is the idempotency key, whole packet is transactional.
Duplicate delivery keeps first persisted contents; it does not update receipt
or refresh the channel. Latest channel is ordered by observedAt, sequence, id;
a reboot/timestamp tie is not proof of live physical presence. Retained or
old packets are historical data, not authority to start a pump.

No automatic watering, alerts or PUMP01 status is generated from v2 yet.
Existing GPIO27 local interlock remains the control safety source. See the
[implementation report](../../../docs/implementation/NODE_CHANNELS_REPORT.md).


## A2 monitor and provenance

Standalone source firmware/water-node publishes LOW/HIGH/FLOW, no actuator
commands. Optional envelope dataSource is SIMULATOR/PHYSICAL/UNSPECIFIED; older
v2 packets default UNSPECIFIED. This is device-declared provenance, not hardware
attestation. V15 persists the value per node_sample; duplicates cannot rewrite
source or receipt. Legacy v1 remains unchanged/unspecified.

Firmware debounces the float pair, reports inconsistent/warming inputs as
fault/null and counts GPIO pulses for FLOW using actual elapsed time. Zero
pulses cannot distinguish no water from sensor disconnection. Invalid window,
overflow, invalid factor/calibration or excess frequency become flow fault,
not numeric zero. No pressure/temp or new pump no-flow policy is implemented.

UI level summary requires LOW/HIGH fresh and coherent boot/sequence/time/source;
otherwise UNKNOWN. It is not permission to run PUMP01. See
[water monitor handoff](../../../docs/implementation/WATER_NODE_FIRMWARE_REPORT.md)
and [chapter23](../../../docs/book/CHAPTER_23_WATER_NODE_MONITOR.md).

## SOIL nhiều điểm (V17)

[soil-telemetry.schema.json](soil-telemetry.schema.json) và
[ví dụ](examples/soil-telemetry.json) dùng envelope v2, 1–8 kênh
SOIL_MOISTURE/%, số VALID 0–100 hoặc SENSOR_FAULT/null. Khai báo bằng POST
`/api/v1/nodes/soil`, body nodeId/name/areaId/channels giống cấu trúc WATER.
Node phải là SOIL/v2, topic/device và từng metric/unit/calibration phải khớp.
Một packet không được trùng channelId; JSON Schema không kiểm tra tính duy nhất
theo một thuộc tính, backend kiểm tra thêm. Backend cũng kiểm tra duplicate
JSON keys, giới hạn payload, thời gian tương lai và registry trước transaction.

Không sửa schema nước để nhận metric đất. Router dùng decoder envelope chung
nhưng registry riêng cho từng loại; SOIL không sinh water alerts, không ghi
telemetry v1 hoặc điều khiển PUMP01. Snapshot/history giữ từng điểm riêng,
packet một phần không làm mới điểm thiếu. Xem
[chương 27](../../../docs/book/CHAPTER_27_SOIL_MULTIPOINT.md). Firmware demo
có ba kênh và chỉ SIMULATOR; nguồn PHYSICAL trong contract là thông tin khai
báo, không chứng minh phần cứng/hiệu chuẩn đã nghiệm thu.

## Soil alert API / V18

SOIL_MOISTURE/% mới được đánh giá theo từng channel và source: hai mẫu fresh
liền packet/boot/seq, gap≤15s; DRY_SOIL <30%, clear≥35%; SENSOR_FAULT/null clear
bằng hai mẫu VALID. Không đổi packet hoặc quyền MQTT. Missing/fault/hysteresis
band giữ điều kiện và reset pending; stale không tự đóng, không có dispatch.

GET `/api/v1/soil-alerts` (list100)/`/{id}` và PUT `/{id}/acknowledgement`
`{"note":null}` hoặc text≤500. Alert có id/nodeId/type/channelId/dataSource,
openedSampleId/At/ReceivedAt/Value, clearedSampleId/At/ReceivedAt/Value nullable,
acknowledgedAt/acknowledgementNote nullable. DRY mở Value0–<30, clear35–100;
fault mở Value null, clear0–100. List ưu tiên active/unseen; GET ID độc lập list.
ACK đầu được giữ, cùng note idempotent, khác note hoặc đã đóng chưa xem409.
JSON key trùng/field thừa/kiểu note sai bị400. ACK không sửa điều kiện hoặc bơm.
Nguồn là khai báo; xem [chương28](../../../docs/book/CHAPTER_28_SOIL_ALERTS.md).

## V19: gán ba kênh SOIL cho vùng tưới

API `/api/v1/irrigation-zones` GET/list/detail, POST/create và PUT/update quản
lý mapping, không đổi telemetry v2. Mỗi vùng cùng area/node SOIL và đúng ba
kênh %; node/channel không thuộc hai vùng. Config có zoneId/name/areaId/
soilNodeId/channelIds/expectedSource/dryThreshold/wetThreshold/revision.
POST không nhận revision; PUT nhận phiên bản đang đọc và tăng1 hoặc409.

View có asOf/points/assessment. Chỉ ba VALID fresh source+receipt≤30s, đúng
nguồn và cùng boot/sequence/observedAt/receivedAt mới có đa số2/3 DRY/WET hoặc
MIXED, count và validUntil. Ngược lại UNAVAILABLE/INCOHERENT không có count/
expiry. Đây là khảo sát một packet, không alert hai packet hoặc command gate.
Xem [chương29](../../../docs/book/CHAPTER_29_IRRIGATION_ZONES.md).

## Agricultural overview, additive API (schema vẫn V19)

GET /api/v1/dashboard/overview thêm agriculture: inventory(NodesSnapshot),
zones(ZoneSnapshot cùng inventory/asOf), waterActiveCount, soilActiveCount,
recentChannelAlerts(max5 active đất/nước). Preview record id/family/nodeId/
type/channelId/dataSource/openedAt/acknowledgedAt; family phân biệt ID ở hai
bảng, phao cặp có channelId=null. Counts độc lập list/preview, ACK vẫn mở,
cleared_sample_id khác null mới bị loại. activeAlertCount cũ chỉ môi trường;
UI tổng cộng ba nhóm. Read-only RR, không thay telemetry/policy hoặc dispatch.
Xem [chương30](../../../docs/book/CHAPTER_30_AGRICULTURE_OVERVIEW.md).

## Water volume read API, schema vẫn V19

GET /api/v1/nodes/{nodeId}/channels/{channelId}/water-volume?from=...&to=...&dataSource=...
yêu cầu WATER/v2 FLOW_RATE/L/min, explicit source, [from,to)≤24h từ1970,
timestamp microsecond hoặc thô hơn, to≤now+2s. Response TRAPEZOID_V1/maxGap15,
packetCount/sourcePacketCount/acceptedIntervals/excluded/coveredSeconds/
uncoveredSeconds/estimatedLitres/groups. Giữ packet thiếu/khác source làm
đứt đoạn; cùngboot/seq+1/calibration, VALID finite≥0, gap0–15s (không0), source
không trước receipt quá2s, receipt trễ≤30s. Không ngoại suy mép hoặc qua gap.
No valid interval→null; valid zero→0; nhiều calibration→groups riêng,totalnull.
Cap25k packet, quá cap/numeric range422, sai phạm vi400/nonFLOW404. Read-only
RR, không thay telemetry/policy/command; [chương31](../../../docs/book/CHAPTER_31_WATER_VOLUME.md).

## WEATHER/v2

WEATHER is an independent monitor node, registered via POST /api/v1/nodes/weather.
RAIN_DETECTED/boolean and LIGHT_ILLUMINANCE/lux (finite 0..200000) use the
existing envelope/source/quality/calibration fields. SENSOR_FAULT requires
null, not false or zero. This is rain detection, not rainfall mm or forecast;
lux is illuminance, not energy/radiation. See
[weather schema](weather-telemetry.schema.json) and
[native example](examples/weather-telemetry.json). Registry/topic/node type
must match. No command/status/actuator or automatic weather gate is defined.
