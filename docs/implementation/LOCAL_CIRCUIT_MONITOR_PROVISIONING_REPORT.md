# Bàn giao — đăng ký danh tính board monitor từ project theo nhánh

Đợt 16/10/2026; [chương45](../book/CHAPTER_45_CIRCUIT_MONITOR_PROVISIONING.md).
Chỉ công cụ local và tài liệu mới, không đổi Java/React/firmware/migration.
Schema vẫn V31, cloud runtime vẫn circuit_package_smoke từ chương44.

## Đã làm

Thêm tools/aws/provision_circuit_monitor.py, CLI --project-dir/--account-id,
--profile tùy chọn và --apply. Mặc định plan hoàn toàn offline, không cần SDK
được cài để render. Kiểm tra allowlist14 file/SHA, manifest monitor, IDs02–99,
revisions, config và policy parity với renderer đã có. Policy cấp cho thiết
bị chỉ Connect đúng controller/Publish đúng status. Không thực thi mã project.

Output cố định trong .local/aws/circuit-monitor/ACCOUNT/CONTROLLER, ACL riêng,
file exclusive/fsync, khóa từng thư mục. Plan gồm bốn JSON public; apply lưu
manifest phục hồi/cert/key/endpoint riêng, không tự cài vào project hoặc sửa
backend IAM. Không in dữ liệu SDK hoặc secrets; chỉ operation/error code hợp lệ.

STS account được so trước IoT; kiểm tra ownership/attachments/groups/endpoint
trước mutate. Không coi AccessDenied là missing. Tạo cert INACTIVE sau pending
marker, ghi ARN/hash manifest trước khi ghi key để phục hồi lỗi đĩa; lưu/kiểm tra
cặp key trước attach; EXCLUSIVE_THING, policy riêng,
đọc lại exact attachments/group rồi activate. Readback ACTIVE/PEM phải khớp.
Retry attach/activation giữ identity cũ; SDK tổng1attempt. Request create
không rõ kết quả, file dở dang hoặc manifest/key hỏng chặn tự tạo thêm.

IAM provisioning có cert/* đúng account/region và Resource* cho API không
có tài nguyên cụ thể; điều này là quyền quản lý certificate trong phạm vi,
không quảng cáo hoàn toàn riêng một certificate chưa biết ID. Thing/policy
đúng ARN tên; không IAM mutation, delete/rotation, MQTT Publish hoặc command.
Thing group bị từ chối để tránh quyền IoT kế thừa ngoài policy status-only.

## Kiểm chứng

| Kiểm tra trong đợt này | Kết quả |
| --- | --- |
| Test mới công cụ, SDK giả lập và tham số model IoT pin |33 đạt,0 fail/error/skip |
| Regression provisioning WATER/SOIL |8 đạt |
| Regression policy irrigation |5 đạt |
| Regression thư mục riêng/Windows ACL mock |2 đạt |
| Hai project public thực của chương44, plan lặp2lần/board |Đạt, không ghi project, không key/cert, không SDK |
| Plan không SDK/site-packages |Đạt qua Python -S, profile không tồn tại |
| Stored full-app compatibility chương44 |Đạt, GET-only, clocks/history giữ nguyên |
| Python compile/help, liên kết tài liệu/diff check |Đạt |

33test gồm account/ownership, group, pagination hai kiểu, keypair/cert remote,
plan không SDK, duplicate JSON, policy broaden/config/hash, link/junction
checks theo code (symlink/hardlink thực POSIX), filemode, ACL failure mock,
lock, partial attach, disk full, create timeout/denial, activation timeout và
readback chưa ACTIVE. Cặp self-signed dùng riêng cho test được sinh trong
thư mục temp; không đọc credential hoặc PEM có sẵn.

Lượt test đầu có một assertion sai: tìm chuỗi Publish trong toàn bộ calls
bắt nhầm quyền iot:Publish trong policy hợp lệ. Sửa assertion chỉ kiểm tra
tên API đã gọi, giữ assertion policy scope riêng; không bỏ ràng buộc Publish.
Model botocore cho thấy ListAttachedPolicies dùng nextMarker khác nextToken;
công cụ chặn cả hai và có test. Venv cloud ban đầu thiếu botocore dù đã có
jsonschema; cài đúng botocore1.43.62 đã pin trong requirements, không nới version.
Truy cập tài liệu IAM công khai từ cloud bị proxy403; không coi model SDK
là bằng chứng IAM đã áp và hoạt động trên AWS.

Không chạy lại backend416 hoặc browser42/lint/build từ chương44 vì không sửa
những phần đó. Dữ liệu/observations/cloud process cũ giữ nguyên; không tạo
fixture telemetry mới, không sửa clocks để làm mới trạng thái. Không gọi AWS,
MQTT, cấp certificate thật, khởi động Wokwi hoặc tác động GPIO.

## Bàn giao Windows

Xem các lệnh và bảng5ca Chưa chạy ở chương45. Chạy plan trước; chỉ dùng
--apply tại máy đã xác thực với account/project đã đối chiếu. Backend IAM
status cần bổ sung riêng và restart subscribe, không tạo role cho mỗi board.
Không gửi access key/private key, không xóa folder recovery khi gặp lỗi.

Giới hạn: Singapore/SIMULATOR/board riêng02–99, chưa sửa mapping đang
provision, chưa khóa đăng ký phân tán, chưa rotation/import/cancel certificate
hoặc tự cập nhật IAM. Khóa sau hard kill phải đối chiếu process/recovery.
A3/coordinator/queue dispatch chưa hoàn tất, năm ca live chưa nghiệm thu.
