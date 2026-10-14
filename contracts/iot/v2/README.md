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
