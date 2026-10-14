# Bàn giao A2 monitoring — WATER firmware và provenance

Ngày 14/10/2026. Tiếp nối A1 và roadmap hợp nhất. Phần giám sát trạm nước có
source/build/helpers; không có AWS/Wokwi live mới hoặc pump no-flow shutdown.

## Thay đổi

- firmware/water-node riêng, ESP32/ArduinoJson7.4.2, pin LOW27/HIGH14/FLOW25,
  LED lỗi GPIO2, không pin/command bơm. Hai phao debounce 100 ms, bất nhất fault/
  null; ISR đếm rising edge, tính rate theo elapsed window và pulses/litre.
- Sơ đồ riêng có hai slide float, clock 45 Hz và gate 0/clock. Hệ số450 là demo,
  dataSource SIMULATOR. Không có random measurement, nhiệt/áp giả hoặc lít từ
  thời gian relay. 0 pulses không phân biệt sensor đứt với không chảy.
- Provision helper render trước/apply rõ ràng; policy publish đúng node,
  không Subscribe/Receive/RetainPublish/command. Manifest/key riêng theo ID,
  kiểm tra ownership/account/ACTIVE, retry attachment không tạo lại cert.
  Exclusive lock theo node chặn chạy đồng thời. CreateKeys SDK retry bị tắt;
  checkpoint chặn retry khi request không rõ.
- Prepare helper dùng API localhost, registry LOW/HIGH/FLOW/calibration và
  node manifest riêng, SSL pair/CA check. Copy whitelist public source, tạo
  config/data private trong .local/water-nodes/ID. Không chép khóa ENV; không
  ghi đè project đã có. Refresh hash bảo toàn config/key và source người dùng sửa.
- merge_flash thêm --project-dir; default ENV01 giữ nguyên. Build/fs/merge
  cloud dùng template không endpoint và filesystem rỗng, không có khóa thật.
- V15 thêm node_sample.data_source mặc định UNSPECIFIED cho v2 cũ. Optional
  field v2, strict enum, source lưu theo packet và duplicate không ghi đè.
- Web source badge và mức bồn từ cặp phao mới/cùng packet/source. 0/fault/null/
  stale/unknown riêng; không gắn mức bồn với lệnh PUMP01 hay tank percent.

## Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Maven verify / PostgreSQL test riêng | 119 pass, 0 fail/error/skip |
| Browser node fixtures | 9 pass |
| Frontend node units | 6 pass |
| Python water contracts/helpers/SDK mocks/diagram | 17 pass |
| Python flash regression | 2 pass |
| Native C++ model và packet builder | Đạt |
| Packet C++ → schema → fixture Java/parser/SQL | Đạt |
| ESP32 build, LittleFS rỗng và merge 4 MiB | Đạt |
| Lint/build | Đạt; warning Vite cũ |

Helper tests mock SDK/SSL pair-copy case; không gửi AWS dù stdout trong mock
có chữ provisioned. Có test CA invalid thực chặn chuẩn bị project, nhưng
không chứng minh certificate AWS thật hoặc kết nối TLS thực. IAM render
được kiểm tra scope nhưng chưa được gọi trong AWS account thật.

Maven 119 có fixture phát từ C++ builder, Java cập nhật timestamp trong test
rồi parse/store 3 kênh, source và no-command. Không gọi đó là broker ingestion
live; MQTT worker/router code có chung đường store, transport chưa thử mới.

## Smoke toàn ứng dụng

Dùng PostgreSQL test cổng 55439/database smartfarm_test/schema water_a2_smoke,
MQTT/control=false. Script tools/frontend/smoke_water_node.py --phase declare
đi từ menu thật đến form registry, tạo WATER01 với 3 kênh/calibration null.
Các phase mid/fault/stale chỉ GET; sample được seed SQL, không phải sensor AWS.

Seed mid bằng node_sample(source SIMULATOR,boot3400...,sequence1,observedNow)
và ba channel: LOW=true / HIGH=false / FLOW=6. Seed fault dùng cùng boot sequence 2,
observedNow, LOW/HIGH SENSOR_FAULT/null, FLOW VALID=0. Trước khi chạy stale,
UPDATE timestamps của cả fixture về now-60 s để nguồn cũ không bị mẫu mới khác
che. Mỗi node_sample được chèn cùng ba channel trong một transaction/CTE.
Tham chiếu script và schema V15 khi tái lập, không seed database demo.

Đã xác nhận declaration, MID/source/6 L/min, fault/null/zero và stale/UNKNOWN
qua menu → React → API/PostgreSQL, MQTT/control tắt. Command/run luôn 0; không
có public HTTP ingestion được thêm để phục vụ smoke. Artifact ảnh /tmp.
Đầu vào SQL mang nhãn mô phỏng do fixture khai báo; không phải attestation.

Nâng cấp schema nodes_smoke đã có sample V14 lên V15 bằng jar thật giữ
nguyên 1 sample/3 channel, default provenance UNSPECIFIED, command 0/run 0. Không
suy diễn nguồn cũ thành PHYSICAL/SIMULATOR. Schema water_a2_smoke riêng được
khôi phục sau phép thử, không ghi đè dữ liệu fixture cũ.

## Người dùng làm trên Windows

Theo [chương 23](../book/CHAPTER_23_WATER_NODE_MONITOR.md): pull/restart backend,
registry, render IAM/device policy, apply bằng profile có quyền, CA public,
prepare per-node project, build/buildfs/merge, mở folder riêng trong VS Code.
Không tạo IAM role cho từng node hoặc dùng lại key ENV01. Helper chưa là fleet
provisioning; scope IAM caller phải cho phép node đích trước apply.

Tất cả ma trận AWS/Wokwi live ở chương23 còn **Chưa chạy**. Chưa có flow-based
pump shutdown, no-flow grace period theo pump ON, water central alerts,
pressure/temp reading, water sample history API, NVS hay multi-zone arbitration.
A2 monitoring không hoàn tất toàn bộ A2; local GPIO27 interlock trên ENV giữ
nguyên. Nhiều simulator/gateway đồng thời và node physical cần nghiệm thu riêng.
