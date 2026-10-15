# Bàn giao V27 — trạng thái van riêng theo nhánh

15/10/2026 (Asia/Ho_Chi_Minh), feat/day1-iot-foundation.

Thêm monitor-only controller/valve02–99: firmware cấu hình ID, circuit/zone
revision và packet riêng; không subscribe command/publishACK, GPIO LOW.
Profile demo01 giữ hợp đồng cũ; source chỉ SIMULATOR. Một board giám sát hiện
báo một van; board chạy đồng thời phải dùng controller ID khác nhau.

CircuitValveMonitor nhận/lưu theo van, ràng buộc topic/identity/source/revision,
freshness, sequence, retired boot và sticky fault/capability. Không nhận retained
hoặc control packet. V27 chỉ thêm hai bảng quan sát/boot, không sửa command/claim.
TelemetryIngestion subscribe từng status topic đã cấu hình, flag mặc địnhfalse,
worker giám sát64slot riêng. Thêm van mới sau startup cần restart backend.
Policy helper chỉ render quyền Connect/Publish status cho board và Subscribe/
Receive status cho backend; không provision/SDK/network hoặc quyền command mới.

Web tại Điều khiển Actuator → Cấu hình nhánh tưới: quan sát đúng van, vị trí
độc lập với GPIO, nguồn/time/fault; stale/config changed/disabled/unverified
không được gọi là trạng thái mới. DEVICE_FAULT không bị CLOSED che khuất.
Queue và pump ownership không đổi; mode vẫn CONFIGURATION_ONLY/PREVIEW_ONLY.

| Kiểm tra lượt cuối | Kết quả |
| --- | --- |
| Backend verify đầy đủ, PostgreSQL test riêng |333/333, không skip |
| Receiver mới / queue isolation mới |17 + 1, nằm trong333 |
| Browser nhánh cấu hình/quan sát |18/18,7mới |
| Browser queue hồi quy |16/16 |
| Python policy |5/5,2mới |
| Native legacy model / feedback / monitor + encoder |Đạt, warnings là lỗi |
| ESP32 public default / monitor profile |Build đạt |
| Monitor + control cùng bật |Compile bị từ chối đúng static_assert, expected failure |
| Empty FS / merge flash4MiB |Đạt, không PEM/private config |
| Lint / production build |Đạt, warnings Vite cũ |
| Full-app native → Java → PostgreSQL → React, restart |Đạt, không API mock |
| V26→27 giữ cấu hình2nhánh /3queue records |So từng trường, đạt |
| 307 liên kết Markdown tương đối / diff --check |Đạt |

Runtime dùng lại fixture irrigation_circuit_smoke/testDB55439. Native seq0 đã
cũ trước phép thử fresh đầu nên assertion đúng là fail; không sửa timestamp.
Một heartbeat native seq1 có timestamp mới từ encoder đi qua receiver và
browser liền mạch, fresh đạt. Sau restart JVM, metadata seq1 giữ nguyên và UI
STALE; VALVE03 luôn chưa có dữ liệu. Không reseed sau đó. MQTT/control/demo
false, monitor true, command/run0; không sửa DB demo5433 hoặc fixture khác.

Log: /tmp/valve-monitor-backend-final.log, /tmp/valve-monitor-browser-final.log,
/tmp/valve-monitor-queue-browser.log, /tmp/valve-monitor-default-build.log,
/tmp/valve-monitor-profile-build.log, /tmp/valve-monitor-profile-restored.log,
/tmp/valve-monitor-reject-control-build.log,
/tmp/valve-monitor-fs.log, /tmp/valve-monitor-merge.log,
/tmp/valve-monitor-native-receive.log, /tmp/valve-monitor-heartbeat-receive.log,
/tmp/valve-monitor-app-fresh.log, /tmp/valve-monitor-app-stored.log,
/tmp/valve-monitor-v26-stored.log, /tmp/valve-monitor-upgrade-proof.txt.
Screenshot /tmp/circuit-valve-monitor-fresh.png và stored.png. Artifact tạm,
không phải bằng chứng Wokwi hoặc thiết bị thật. Helper seed chỉ dùng đúng
schema local và không có transport, không thể phát lại seq1 để làm mới proof.

Lỗi policy test: tìm chuỗi ack nhầm backend; sửa thành topic /ack, giữ assertions
actions/resource cụ thể. Sau rà soát thêm DEVICE_FAULT và tách executor, chạy
lại toàn bộ lượt cuối333. Không cộng các lượt kiểm tra trước vào số này.
Smoke V26 chỉ so cấu hình, vì view có dữ liệu động từ V27. Sau khi xem
screenshot stale, đổi nhãn thành “GPIO trong mẫu: Tắt” để không khẳng định
GPIO hiện tại từ dữ liệu cũ; browser/lint/build/stored smoke cuối đều đạt.

Chưa AWS/Wokwi/GPIO live cho phần mới;5ca Windows ở
[chương39](../book/CHAPTER_39_CIRCUIT_VALVE_MONITOR.md) đều Chưa chạy. Chưa command
van02+, nhiều đầu ra/board, provisioning tự động, coordinator/interlock xuyên
van–bơm hoặc dispatch queue. Không đánh dấu A3 hoàn tất.
