# HỆ THỐNG QUẢN LÝ NÔNG NGHIỆP TÍCH HỢP IOT

> Cập nhật ưu tiên 14/10/2026: xây các chức năng IoT nông nghiệp trước theo
> [lộ trình thiết bị mới](AGRICULTURAL_IOT_DEVICE_ROADMAP.md): trạm nước,
> đất/tưới 4 dãy, môi trường, rồi chăn nuôi/camera. Danh mục và thứ tự tổng quát
> bên dưới là bản định hướng trước đó; không biểu thị chức năng đã triển khai.


## 1. Tổng quan hệ thống

Hệ thống được thiết kế theo hướng quản lý toàn diện hoạt động nông nghiệp, từ cây trồng, vật tư, thiết bị, IoT, bán hàng cho tới báo cáo và phân tích.

Các phân hệ chính:

1. Hệ thống & Phân quyền
2. Sản xuất & Cây trồng
3. Vật tư nông nghiệp
4. IoT & Tự động hóa
5. Kinh doanh & Khách hàng
6. Báo cáo & Phân tích

---

# HƯỚNG TRIỂN KHAI TIẾP THEO

Sau khi chốt các phân hệ, nên tiếp tục theo thứ tự:

1. Chốt phạm vi MVP
2. Vẽ Business Flow end-to-end
3. Thiết kế ERD
4. Thiết kế kiến trúc hệ thống
5. Thiết kế phân quyền
6. Thiết kế UI / Wireframe
7. Thiết kế API
8. Chia Epic / Feature / User Story
9. Bắt đầu implementation

Đề xuất ưu tiên:

MVP  
→ Core nghiệp vụ cây trồng  
→ Kho / vật tư  
→ IoT monitoring  
→ IoT control  
→ Automation  
→ Kinh doanh  
→ Báo cáo nâng cao  
→ AI / Prediction

Chốt MVP
Xác định bản đầu tiên cần những chức năng nào để có thể chạy thật.
Tôi đề xuất MVP chỉ gồm:

- Cơ cấu trang trại
- Sơ đồ vị trí cây
- Hồ sơ từng cây
- Công việc & lịch chăm sóc
- Dinh dưỡng / bón phân
- Sâu bệnh & điều trị
- Kho vật tư cơ bản
- Thiết bị IoT cơ bản
- Monitoring sensor
- Điều khiển thiết bị cơ bản
- Dashboard đơn giản
