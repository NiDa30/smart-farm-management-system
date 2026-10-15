# Chương 45 — Đăng ký board giám sát nhánh từ gói Wokwi

Đợt 16/10/2026, sau [chương44](CHAPTER_44_CIRCUIT_MONITOR_PACKAGE.md).
Database giữ V31; firmware và API điều khiển không đổi.

## Bài toán và kết quả

Tải project chỉ chuẩn bị mã nguồn. Một board giám sát riêng còn cần Thing,
certificate/key và IoT policy đúng client/topic. Công cụ
`tools/aws/provision_circuit_monitor.py` đọc project đã giải nén, render kế
hoạch ngoại tuyến rồi chỉ đăng ký một danh tính khi có `--apply`.

Đây là công cụ chạy tại máy quản trị của bạn, dùng profile AWS đã cấu hình.
Web/backend không nhận access key, không giữ private key và không tự provision.
Một controller hiện tương ứng một board, một van. Chỉ hỗ trợ
IRRIGATION02–99/VALVE02–99, nguồn SIMULATOR, region ap-southeast-1.
GPIO26 giữ OFF trong firmware monitor; đăng ký xong không phải bật van.

## Kiểm tra gói trước khi đăng ký

Công cụ đọc đúng manifest và14 file công khai theo allowlist chương44,
không đọc config.local.h hoặc data chứa PEM của project. Nó kiểm tra account,
region, ID/revision, flags monitor1/demo0/feedback1, SHA-256 và hai policy
bằng renderer status-only trong repository. Không chấp nhận policy nới quyền
ngay cả khi người sửa đã tính lại hash. JSON trùng khóa, path liên kết,
junction/reparse point và hard link đều bị từ chối.

Checksum chỉ phát hiện thay đổi file, không là chữ ký hay chứng minh nguồn
gói đáng tin. Công cụ không thực thi mã trong project. Firmware vẫn cần lấy
từ repository/gói mà bạn tin cậy, rồi build riêng.

Kế hoạch là **offline**: không gọi SDK, STS, IoT hoặc backend, nên không xác
nhận mapping vẫn CURRENT trên web. Trước apply, đọc lại đúng hàng nhánh và
phiên bản vùng; nếu đổi thì tải gói mới. Không dùng một gói cũ làm giấy phép
vận hành hoặc dispatch.

## Thực hành Windows bằng Git Bash

Chạy tại gốc repository, sau khi pull nhánh đang làm. Dừng ở lệnh báo lỗi.
Ví dụ dưới dùng account và mã nhánh minh họa; thay bằng account/project của bạn.
Không nhập access key/secret key vào tham số hoặc gửi chúng qua chat.

```bash
AWS_ACCOUNT_ID='123456789012'
SIM_PROJECT='.local/simulators/FARM001-CIRCUIT02-r1-IRRIGATION02-VALVE02-monitor'

./.local/day1-venv/Scripts/python.exe -m pip install -r tools/requirements-day1.txt

./.local/day1-venv/Scripts/python.exe tools/aws/provision_circuit_monitor.py \
  --project-dir "$SIM_PROJECT" \
  --account-id "$AWS_ACCOUNT_ID"
```

Kết quả cần có `PLAN ONLY; no AWS calls`. Bốn file nằm tại:

```text
.local/aws/circuit-monitor/<ACCOUNT_ID>/<CONTROLLER_ID>/
  plan.json
  device-policy.json
  backend-additional-identity-policy.json
  provisioner-iam-policy.json
```

`plan.json` ghi mapping, tên policy, ba thuộc tính Thing và những việc dự kiến
làm. Hai loại policy cần phân biệt:

| File | Nơi dùng và phạm vi |
| --- | --- |
| device-policy.json | IoT policy trên certificate: Connect đúng controller, Publish đúng status của van |
| provisioner-iam-policy.json | Quyền IAM cho người chạy công cụ, không phải quyền thiết bị hoặc backend |
| backend-additional-identity-policy.json | IAM bổ sung Subscribe/Receive đúng status cho danh tính backend hiện có |

Dùng tài khoản quản trị có thẩm quyền để bổ sung policy provisioning cho user
chạy CLI, chẳng hạn smartfarm-dev; không thay toàn bộ quyền backend bằng file
bổ sung. Công cụ không tạo role, không sửa trust policy và không gắn IAM vào
user. Thing/policy ARN được giới hạn đúng tên, mọi statement giới hạn region.
Một số API phải dùng Resource `*`; quyền quản lý certificate dùng `cert/*`
trong đúng account/region vì ID chưa tồn tại trước yêu cầu tạo. Đây là quyền
quản trị certificate trong phạm vi đó, không chỉ riêng certificate sắp tạo;
chỉ cấp cho danh tính provisioning phù hợp. Không có quyền Publish MQTT,
command, PUMP01, Delete hoặc thay phiên bản policy.

Xác thực profile ngay tại terminal như các chương trước. Sau khi xem kế
hoạch và đối chiếu mapping, chạy apply bằng cùng project/account:

```bash
./.local/day1-venv/Scripts/python.exe tools/aws/provision_circuit_monitor.py \
  --project-dir "$SIM_PROJECT" \
  --account-id "$AWS_ACCOUNT_ID" \
  --profile smartfarm \
  --apply
```

Công cụ so account bằng STS trước mọi thao tác IoT. Không có `--apply` thì
profile không được dùng và SDK không được khởi tạo.

## Trình tự apply và phục hồi

1. Giữ khóa local độc quyền theo account/controller; kiểm tra manifest và
   file phục hồi trước khi gọi AWS. Thư mục riêng dùng chmod700 trên POSIX
   hoặc DACL của user trên Windows, file mới tạo độc quyền và fsync.
2. Đọc policy/Thing/certificate/attachments/endpoint trước khi mutate.
   Từ chối policy khác, Thing khác mapping/profile, principal khác, certificate
   thuộc Thing/policy khác hoặc Thing nằm trong group có thể cấp quyền thêm.
   API list quá một trang sẽ dừng để kiểm tra, không bỏ qua phần còn lại.
3. Tạo Thing và IoT policy nếu thiếu. Tên Thing là controller; policy dạng
   `SmartFarmMonitorIRRIGATION02VALVE02`. Thing có farmId, profile và
   bindingHash gắn account/controller/valve/circuit/zone cùng revisions.
4. Ghi `certificate-request.json` trước yêu cầu tạo. SDK không tự retry.
   Tạo certificate **INACTIVE**, ghi `provisioning.json` với ARN và SHA-256
   trước khi lưu PEM/key để vẫn nhận diện tài nguyên khi lỗi ghi khóa. Chỉ
   tiếp tục sau khi cặp PEM/key đã lưu và kiểm tra được.
5. Gắn certificate theo quan hệ EXCLUSIVE_THING và đúng policy. Đọc lại
   attachments/group; chỉ khi xác nhận đúng mới kích hoạt. Đối chiếu trạng
   thái ACTIVE và certificate PEM từ AWS với file local trước báo thành công.
6. Lưu endpoint.txt; xóa pending marker sau khi hoàn tất. Không in PEM/key,
   nội dung phản hồi AWS hoặc thông báo SDK có thể chứa dữ liệu riêng tư.

Sau thành công có thêm device.pem.crt, private.pem.key, provisioning.json và
endpoint.txt trong thư mục riêng. Không có certificate hoặc endpoint nào
được ghi vào Git, DB hay project tự động. Hãy bảo quản cả thư mục phục hồi,
không chỉ private.pem.key.

Chạy lại sau lỗi AttachPolicy dùng lại certificate đã lưu; không xoay khóa.
Nếu yêu cầu tạo certificate bị AccessDenied/InvalidRequest xác định thì có
thể sửa quyền và chạy lại. Với timeout, lỗi dịch vụ không rõ kết quả hoặc
lỗi ghi file sau tạo, pending marker chặn tạo thêm certificate. Nếu manifest
đã lưu đầy đủ, lần chạy sau có thể đối chiếu và hoàn tất attachments/activation.

Nếu tiến trình bị kill, `.provisioning.lock` có thể còn. Kiểm tra tiến trình
cũ đã kết thúc và các file phục hồi trước khi xử lý khóa. Không xóa lock,
marker, manifest hoặc cả thư mục để ép chạy lại. Trường hợp mất private key,
manifest hỏng hoặc chưa lưu được identity cần kiểm tra certificate trên AWS
riêng tư; chưa có quy trình tự động nhập lại/thu hồi/rotation trong công cụ này.

## Đưa credential vào project riêng và chạy mô phỏng

Sau apply, làm tiếp hướng dẫn chương44, trong đúng thư mục project của board:

- Tạo data/ riêng tư bằng helper prepare_private_directory đã có. Sao chép
  device.pem.crt và private.pem.key của đúng controller vào data/; không ghi
  đè file có sẵn hoặc dùng key ENV01/WATER01/board khác.
- Tải AmazonRootCA1.pem từ kho Amazon Trust như các chương trước; không tắt
  kiểm tra TLS. Copy config.example.h thành config.local.h nếu chưa có và
  điền endpoint từ endpoint.txt, giữ nguyên monitor1/demo0/IDs/revisions.
- Build, buildfs và merge_flash.py với `--project-dir "$SIM_PROJECT"` như
  chương44, rồi mở diagram của project đó. Mỗi board có client ID riêng.
- Gắn IAM **bổ sung** đọc status cho backend hiện có, bật
  `SMARTFARM_IRRIGATION_MONITOR_ENABLED=true`, restart backend để subscribe
  topic mới. Không cần tạo role mới cho mỗi board.
- Đổi hai switch độc lập và xem đúng hàng nhánh; LED vẫn OFF. Tắt gateway
  để kiểm tra dữ liệu trở thành cũ, board khác không nhận thay trạng thái.

Công cụ không publish MQTT, không bắt đầu simulator hoặc ghi ảnh flash.
Không cam kết chi phí bằng0: khi vận hành còn có kết nối/message và các dịch
vụ đang bật; theo dõi Budget đã cấu hình.

## Giới hạn và bằng chứng

Mapping/revision thay đổi bị từ chối nếu đã có kế hoạch/danh tính cũ trong
thư mục. Chưa tự chuyển certificate sang mapping mới, chưa kiểm tra mapping
live qua API, chưa điều phối đăng ký nhiều máy cùng lúc. Khóa local chỉ chặn
cùng thư mục trên một máy; không phải khóa phân tán trên AWS. Không sửa Thing,
policy hoặc certificate khác để giải quyết xung đột.

33 test mới offline đạt,0 skip; thêm8 regression provisioning WATER/SOIL,
5 policy và2 ACL đạt. Có kiểm tra tham số bằng model IoT thật của botocore
đã pin; response và thao tác vẫn giả lập. Hai project tải thực từ ứng dụng
chương44 qua kiểm tra plan hai lần, giữ nguyên public inputs, không sinh
key hoặc gọi SDK. Backend416/browser42 từ chương44 là bằng chứng đợt trước,
không chạy lại hoặc tính như kiểm thử apply AWS của đợt này. GET-only stored
smoke ứng dụng thật đạt lại trong đợt này, giữ nguyên mapping/source/receipt/
history của fixture chương44; không phát packet để làm mới.

| Ca Windows/AWS/Wokwi cần chạy tại máy người dùng | Kết quả |
| --- | --- |
| Plan đúng gói/account, thêm IAM provisioning đã xem | Chưa chạy |
| Apply một board, xác nhận Thing/policy/certificate đúng và ACTIVE | Chưa chạy |
| Apply lại cùng thư mục không tạo certificate mới | Chưa chạy |
| Hai board riêng gửi status đúng hai hàng, GPIO luôn OFF | Chưa chạy |
| Lỗi quyền attach rồi phục hồi cùng certificate và kiểm tra Budget | Chưa chạy |

Tưới nhiều van, proof theo nhánh, coordinator và dispatch queue vẫn còn
trong A3. Provisioned không đồng nghĩa đã nghiệm thu AWS/Wokwi hoặc cho phép
tưới. [Báo cáo đợt này](../implementation/LOCAL_CIRCUIT_MONITOR_PROVISIONING_REPORT.md).
