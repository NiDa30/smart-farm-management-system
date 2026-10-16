# Chương 50 — Xem lại phiên tưới và đối chiếu từng bước

Cập nhật: 16/10/2026, giờ Việt Nam. Nền: [phiên tưới V35](CHAPTER_49_OPERATOR_IRRIGATION_SESSION.md).

## Bài toán

Panel điều khiển chỉ hiện 10 phiên gần đây và 20 bước của phiên đang giữ
bơm. Sau khi khép phiên, người vận hành cần tìm lại yêu cầu đã gửi, phân
biệt kết quả gửi ban đầu với ACK đến sau, và lưu bằng chứng thử nghiệm.

V36 thêm lịch sử cho các phiên đã lưu từ V35. Đây là màn hình chỉ xem;
không bắt đầu, tiếp tục, phát lại, khép hay sửa phiên. Không nhập lịch sử
từ các lệnh thủ công cũ, rule ENV01 hoặc hàng chờ diễn tập.

## Thao tác trên web

1. Mở **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới**.
2. Chọn **Lịch sử mọi phiên tưới** hoặc **Lịch sử phiên PC1** ở nhánh cần xem.
3. Chọn khoảng 1 giờ, 24 giờ, 7 ngày hoặc 31 ngày; nhập mã nhánh hoặc để
   trống để xem mọi nhánh. Bấm **Đọc lịch sử phiên** để áp dụng.
4. Lọc tất cả, chưa khép, đã khép hoặc cần phục hồi. Khoảng giờ tính theo
   **giờ tạo phiên**, không theo giờ bật bơm, giờ ACK hoặc giờ kết thúc.
5. Chọn **Xem phiên …** để đọc cấu hình gốc và các bước mới nhất trước.
   **Tải thêm phiên / Tải thêm bước** lấy trang tiếp theo, mỗi trang 50 dòng.
6. Tải **CSV phiên đã tải** hoặc **CSV bước đã tải**. Hai file chỉ chứa các
   dòng đã tải; không tự lấy những trang còn lại.

Giờ trên giao diện là giờ Việt Nam; CSV giữ timestamp có múi giờ từ API.
Mã nhánh sai định dạng hoặc phản hồi không khớp sẽ được báo lỗi. Khi đổi
bộ lọc, chi tiết cũ đóng lại. Yêu cầu chậm của bộ lọc/phiên cũ không được
ghi đè kết quả mới. Khi tải lỗi, CSV tương ứng bị chặn cho đến khi đọc lại.

## Đọc bằng chứng đúng nguồn

| Thông tin | Ý nghĩa | Không được suy ra |
| --- | --- | --- |
| Cấu hình trong phiên | Snapshot nhánh, vùng, controller, van, nguồn và hai boot lúc tạo | Mapping hoặc boot hiện tại |
| Thời gian yêu cầu | Số giây người vận hành chọn cho ON | Thời gian bơm thực chạy hoặc số lít |
| Phase / lý do phiên | Bản ghi quy trình lúc đọc | Trạng thái GPIO hiện tại |
| RESERVED / UNRESOLVED | Bước giữ mã hoặc kết quả gọi chưa rõ | Chưa gửi, đã gửi thành công, hoặc có thể retry |
| RETURNED và kết quả ban đầu | Kết quả dispatcher đã trả và được lưu khi gọi bước | ACK/status mới nhất |
| Bản lưu lệnh lúc đọc | Ledger được đối chiếu bằng đúng UUID và định nghĩa yêu cầu | Bơm/van hiện đã ở trạng thái đó |
| FINISH | Bước khép bản ghi sau kiểm tra V35 | Một command mới |

Ví dụ: kết quả gọi ban đầu là **SENT**, còn bản lưu lệnh lúc đọc là
**EXECUTED**. ACK đã đến sau khi kết quả ban đầu được lưu; hai giá trị
không mâu thuẫn và không nên ghi đè nhau. ACK bơm có giờ nhận, boot và
sequence khi đã lưu. Ledger van hiện chỉ có ACK sequence; giao diện không
tạo giờ nhận ACK hoặc GPIO từ sequence đó.

OFF của bơm không ràng route và có thể được ACK bởi boot mới. ON vẫn phải
đúng boot đích. Đọc lịch sử không thay đổi các quy tắc dispatch/receiver
này. Không tìm thấy lệnh khớp yêu cầu thì ghi chưa có bằng chứng để đối
chiếu; không mượn lệnh khác chỉ vì trùng UUID. Các OFF khẩn ngoài session
không tự trở thành bước của phiên; xem thêm lịch sử PUMP01 riêng.

Số **bước chưa có kết quả gọi** đếm RESERVED/UNRESOLVED. Một RETURNED có
kết quả PUBLISH_UNCERTAIN vẫn là kết quả gọi đã lưu; số đếm này không phải
số lệnh chưa ACK và không biểu thị điều kiện an toàn để khởi chạy.

## Phân trang và tính thay đổi của dữ liệu

Migration V36 chỉ thêm `history_id` cho phiên và bước cùng index phân trang.
UUID, cấu hình, phase, payload và kết quả V35 được giữ nguyên. Không sửa
checksum migration cũ, không xóa hoặc tạo lại schema để nâng cấp.

Danh sách sắp theo `created_at DESC, history_id DESC`. Trang đầu giữ trần
identity; các bản ghi mới có ID cao hơn không chen vào trang sau, kể cả khi
có giờ tạo lùi. Cursor ràng với endpoint, khoảng giờ, nhánh và trạng thái;
cursor chi tiết ràng với đúng session. Phân trang không phải snapshot giữ
xuyên nhiều HTTP request: transaction đang commit hoặc phase/ACK cập nhật
vẫn có thể làm kết quả thay đổi. Bấm đọc lại để lấy lượt mới.

Mỗi HTTP GET dùng transaction read-only/repeatable-read. UI giữ `readAt`
cho từng trang đã tải; CSV có cột này vì các trang có thể được đọc ở các
thời điểm khác nhau. Nếu revision phiên thay đổi khi tải thêm bước, UI yêu
cầu đọc lại chi tiết, không ghép các trang như cùng một phiên bản.

CSV dùng UTF-8 BOM, quote/double-quote và chống formula injection cho ô
bắt đầu bằng ký tự công thức. Không xuất private key, certificate hoặc
endpoint AWS. Chưa có tổng lượng nước, phân bổ theo cây, retention hoặc
thống kê thời gian bơm thực chạy.

## API và Windows

```text
GET /api/v1/irrigation-session-history?from=...&to=...&circuitId=PC1&condition=ALL&limit=50
GET /api/v1/irrigation-session-history/PC1/{sessionId}/steps?limit=50
```

Khoảng `[from,to)` tối đa 31 ngày; limit từ 1–100 ở API, web dùng 50.
`circuitId` có thể bỏ ở danh sách. Condition là ALL, UNFINISHED, CLOSED,
RECOVERY. Có thể truyền cursor của chính bộ lọc/phiên để tải tiếp.
API lấy snapshot lịch sử, không cần nhánh còn tồn tại trong registry và
không cần bật profile điều khiển để xem.

Trên Windows, pull nhánh hiện tại, restart backend bằng cách đã dùng ở
[runbook](WINDOWS_RUNBOOK.md), giữ PostgreSQL volume để Flyway áp V36.
Không có flag, IAM, topic, certificate hoặc firmware mới cho màn hình này.
Frontend đang chạy sẽ cập nhật qua Vite; bản production cần build lại.

## Kiểm chứng và phần chờ nghiệm thu

512 test backend đạt, không skip, gồm 15 test lịch sử mới. 75 test browser
nhánh đạt, gồm 13 ca mới; 10 unit parser/CSV đạt; lint/build đạt. Lượt browser
đầu có một lỗi selector exact vì đoạn văn còn chứa câu giải thích CSV;
sửa selector rồi chạy lại 13 ca và toàn bộ 75 ca. Không bỏ assertion.

Fixture V35 có sẵn gồm một phiên đã khép, một phiên cần phục hồi và năm
bước của phiên đã khép. Chạy Flyway riêng lên V36 giữ nội dung 11 bảng,
chỉ thêm identity; lần migrate tiếp không có thay đổi. Startup JVM giữ
phiên đã khép, tăng revision phiên cần phục hồi theo chính sách V35, không
phát lại command. Thử full app đi qua menu thật, chi tiết, hai CSV và
nhánh khác rỗng: không API write, ngoại mạng hoặc lỗi JavaScript. GET danh
sách/chi tiết giữ nguyên cả 11 bảng dữ liệu đã đối chiếu.

| Ca Windows/AWS/Wokwi mới | Kết quả |
| --- | --- |
| Hoàn tất một phiên trên Wokwi, xem đủ bước và ACK sau khi khép | Chưa chạy |
| Mất phản hồi/ACK đến muộn, đối chiếu kết quả ban đầu với ledger | Chưa chạy |
| Restart backend, tìm phiên phục hồi và kiểm tra không replay | Chưa chạy |
| Tải nhiều trang, đổi bộ lọc và đối chiếu hai CSV | Chưa chạy |

Không gửi AWS trong đợt này. Chưa tự điều phối nhiều nhánh, dispatch queue,
proof flow xuyên controller hoặc nghiệm thu bơm/van vật lý. A3 còn mở.
[Báo cáo bàn giao](../implementation/LOCAL_SESSION_HISTORY_REPORT.md).
