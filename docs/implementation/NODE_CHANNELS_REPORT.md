# Bàn giao A1 — node/kênh và telemetry nước v2

Ngày 14/10/2026. Tiếp nối lộ trình thiết bị từ commit 0f6d9f0. Có nền registry,
contract/routing/storage và UI; chưa có firmware/Thing WATER01 độc lập.

## Thay đổi

- V14 additive: physical node, channel, actuator binding và hai bảng sample
  v2. Backfill toàn bộ sensor_device; ENV01 có 3 kênh và PUMP01 binding. Trigger
  giữ API thêm sensor cũ đồng bộ; namespace trùng rollback, không ghi đè.
- GET nodes/detail, POST water declaration bằng strict JSON, 1–8 kênh, unit và
  calibration match. Không có API publish/ingest/actuator command tổng quát.
- MQTT router v1/v2 giữ filter hiện có, v1 vẫn qua storage/alerts cũ. V2 water
  không tạo environment giả, không gửi lệnh, không kích hoạt rule/alert.
- Cả packet transactional, dedupe(node,boot,sequence), nhận mẫu cũ nhưng
  latest source theo thời gian/sequence/id. Latest fault không fallback.
- Sensor Realtime có Node & trạm nước: ENV legacy projection, khai báo WATER
  với LOW/HIGH/FLOW và nhiệt nước tùy chọn; pressure có contract/API nhưng
  chưa có checkbox trong form. Empty/fault/stale/error và false/0 riêng.
- Save không rõ kết quả chặn retry, có GET readback so toàn bộ declaration.
  Không claim enrollment AWS hoặc measurement calibration từ registry.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Maven verify với PostgreSQL test riêng |116 pass,0 fail/error/skip |
| Playwright node API fixtures |7 pass |
| Node API parser/unit frontend |4 pass |
| JSON Schema water v2 |3 pass |
| Lint/build | Đạt; warning cũ __dirname/chunk |
| Full app/API/DB registry save/read sau restart | Đạt, command0/run0 |

Backend 116 gồm 8 NodeInventoryTest và 4 WaterTelemetryTest mới; không cộng lại
các lượt chạy trước. Browser fixtures không gửi AWS. Các suite browser khác
có bằng chứng ở các báo cáo trước, không nói đã chạy lại tất cả trong đợt này.

Full app save tạo đúng1 POST local registry; phase read chỉ GET. Metadata được
lưu trước restart và đọc lại sau restart. Sau restart seed ba measurement
SQL có timestamp cũ để thử false/0/fault; đây là fixture, không phải packet AWS
hoặc kiểm chứng firmware đo nước. Không thử restart sau khi thêm measurement.

Lần seed SQL đầu gặp UNION NULL suy ra text xung đột số; statement rollback
không tạo sample. Thêm cast `NULL::double precision`, `NULL::boolean` và
`NULL::text` cho fixture, chạy lại đạt. Đây là lỗi script thử, không sửa parser
hay bỏ assertion. Kiểm tra v1/migration cũ qua Maven tiếp tục đạt.

## Tái lập cloud, chỉ test DB

Dùng database smartfarm_test ở loopback 55439, schema nodes_smoke, user test,
MQTT/control=false. Không dùng DB demo/không xóa volume. Chạy jar với
`--spring.flyway.schemas=nodes_smoke --spring.flyway.default-schema=nodes_smoke`
và JDBC currentSchema=nodes_smoke. Vite3000 proxy đến backend8080.

Schema lần đầu không có WATERDEMO. Chạy:

```bash
python tools/frontend/smoke_nodes.py --phase save
```

Restart cùng jar/schema, seed bằng SQL chỉ trong schema test:

```sql
SET search_path TO nodes_smoke;
WITH s AS (
 INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,uptime_ms)
 VALUES('WATERDEMO','33000000-0000-4000-8000-000000000001',1,CURRENT_TIMESTAMP-INTERVAL '60 seconds',1000) RETURNING id
)
INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value,boolean_value,calibration_version)
 SELECT id,'WATERDEMO','LOW','VALID',NULL::double precision,false,NULL::text FROM s
 UNION ALL SELECT id,'WATERDEMO','HIGH','SENSOR_FAULT',NULL,NULL::boolean,NULL FROM s
 UNION ALL SELECT id,'WATERDEMO','FLOW','VALID',0,NULL,NULL FROM s;
```

```bash
python tools/frontend/smoke_nodes.py --phase read
```

Save không lặp tự động trên fixture đã có. Read có thể lặp, không POST; ledger
sample có unique key nên không seed lại cùng packet nếu đã có. Current test
schema có 2 node, 6 channel khai báo, 3 channel sample, 0 pump command, 0 watering run.
Metadata fixture WATERDEMO chưa có calibration; đọc null, không gán version giả.

## Tiếp theo / giới hạn

Đường Windows và ngữ nghĩa ở [chương22](../book/CHAPTER_22_NODES_AND_WATER_CHANNELS.md).
Firmware hiện vẫn ENV01/PUMP01 v1 và local phao GPIO27; A1 không sửa diagram.
Muốn WATER node hoạt động cần firmware v2, certificate/policy riêng và nghiệm
thu A2. Bộ helpers AWS hiện tại chưa tự provision WATER01; không copy private
key ENV01 hoặc chạy lại provisioning cũ với mong đợi tạo node nước.

Chưa có generic actuator binding CRUD/control, node update/delete, calibration
update, enrollment verification, v2 history/export/retention, monitoring/dashboard
water metrics, central water alert, flow-based safety hay tank percentage.
API bind local, chưa có auth/roles; chưa phát hành public multi-farm. Không
đổi NVS/reconnect hoặc nghiệm thu phao live. Không chạy lệnh AWS trong đợt này.
