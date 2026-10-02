# HƯỚNG DẪN KẾT NỐI BẮN LEAD VỀ GOOGLE SHEET (2 PHÚT)

Hệ thống Landing Page của **Kế Toán Thuế Chuẩn Luật** đã được lập trình sẵn sàng để tự động đẩy thông tin khách hàng đăng ký (Lead) trực tiếp vào file Google Sheet của bạn theo thời gian thực.

---

## 5 BƯỚC THIẾT LẬP NHANH CHÓNG

### Bước 1: Mở Google Sheet
1. Truy cập [Google Sheets](https://sheets.google.com) và tạo một bảng tính mới.
2. Đổi tên trang tính (ví dụ: `Leads - Thành Lập Công Ty Chuẩn Luật`).

### Bước 2: Mở trình chỉnh sửa Apps Script
1. Trên menu trên cùng của Google Sheet, bấm vào **Tiện ích mở rộng** (*Extensions*) $\rightarrow$ chọn **Apps Script**.
2. Một tab mới sẽ mở ra trình soạn thảo mã nguồn.

### Bước 3: Dán đoạn mã có sẵn
1. Xóa toàn bộ đoạn mã mẫu mặc định (`function myFunction() {...}`).
2. Mở file [google-sheets/Code.gs](file:///Users/dungbv/Documents/ThanhLapCongty/google-sheets/Code.gs) trong dự án này, copy toàn bộ nội dung và dán vào Apps Script.
3. Bấm biểu tượng **Lưu (Save / Ctrl + S)**.

### Bước 4: Triển khai thành Web App (Deploy)
1. Ở góc trên bên phải, bấm nút **Triển khai (Deploy)** $\rightarrow$ chọn **Tùy chọn triển khai mới (New deployment)**.
2. Tại mục *Chọn loại (Select type)*, bấm biểu tượng bánh răng ⚙️ $\rightarrow$ chọn **Ứng dụng web (Web app)**.
3. Điền các trường như sau:
   - **Mô tả (Description)**: `Webhook Chuẩn Luật Leads`
   - **Thực thi dưới tên (Execute as)**: **Tôi (Địa chỉ email của bạn)**
   - **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(Rất quan trọng để form từ website gửi dữ liệu vào được)*.
4. Bấm **Triển khai (Deploy)**.
5. Nếu Google hỏi quyền truy cập:
   - Bấm *Ủy quyền truy cập (Authorize access)* $\rightarrow$ Chọn tài khoản Google của bạn $\rightarrow$ Bấm *Nâng cao (Advanced)* $\rightarrow$ Bấm *Đi tới [Tên dự án] (Không an toàn)* $\rightarrow$ Bấm *Cho phép (Allow)*.
6. Sau khi hoàn thành, bạn sẽ nhận được một đường link dạng:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Bước 5: Kích hoạt trên Website
Bạn có 2 cách cực kỳ đơn giản để kích hoạt:

#### Cách 1 (Nhanh nhất - Ngay trên giao diện):
- Mở trang web tại `http://localhost:3002`.
- Nhấn tổ hợp phím **`Ctrl + Shift + L`** (hoặc bấm nút "Quản lý Lead & Cấu hình" ở cuối chân trang Footer).
- Chuyển sang tab **Cấu hình Google Sheet** $\rightarrow$ Dán đường dẫn Web App vào ô và bấm **Lưu & Test Kết Nối**.

#### Cách 2:
- Mở file [data/config.json](file:///Users/dungbv/Documents/ThanhLapCongty/data/config.json).
- Dán link vào trường `"googleSheetWebhookUrl"`:
  ```json
  {
    "googleSheetWebhookUrl": "https://script.google.com/macros/s/AKfycb.../exec"
  }
  ```

---

## DỮ LIỆU TỰ ĐỘNG THU THẬP VÀO GOOGLE SHEET GỒM:
1. **Thời gian**: Ngày giờ khách gửi form chính xác đến từng giây (GMT+7).
2. **Họ và tên**: Họ tên khách hàng đăng ký.
3. **Số điện thoại**: Số điện thoại/Zalo để sale gọi tư vấn ngay.
4. **Gói quan tâm**: Gói Cơ bản (1.5tr), Gói Vận hành (3.79tr), Gói VIP (5.49tr)...
5. **Ngành nghề / Ghi chú**: Nhu cầu đặc thù của doanh nghiệp.
6. **Nguồn UTM (UTM Source)**: Khách đến từ Facebook Ads, Google Ads, TikTok, Zalo hay Trực tiếp.
7. **Chiến dịch UTM (UTM Campaign)**: Tên chiến dịch quảng cáo mang lại lead.
8. **Đường dẫn**: Trang web hoặc vị trí form khách điền.
9. **Thiết bị**: Mobile hay Desktop để tư vấn viên nắm bắt thói quen của khách.
10. **Trạng thái**: Mặc định là `Mới nhận - Chưa gọi` để tiện quản lý phễu telesale.

---

## CƠ CHẾ AN TOÀN CHỐNG MẤT LEAD:
- Ngay cả khi Google Sheet gặp sự cố mạng, mọi lead đều được tự động lưu dự phòng trong file `data/leads.json` trên server và trong `localStorage` trên trình duyệt. Bạn sẽ không bao giờ bị thất thoát bất kỳ khách hàng tiềm năng nào!
