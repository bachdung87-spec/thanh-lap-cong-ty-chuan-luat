# HƯỚNG DẪN KẾT NỐI BẮN LEAD VỀ GOOGLE SHEET (CHUẨN HOÁ 10 CỘT)

Hệ thống Landing Page của **Kế Toán Thuế Chuẩn Luật** tự động đồng bộ mọi khách hàng đăng ký (Lead) vào Google Sheet theo đúng thứ tự 10 cột chuẩn hoá tối ưu cho quy trình Telesale và Marketing.

---

## 📋 THỨ TỰ 10 CỘT CHUẨN HOÁ TRONG GOOGLE SHEET:

| Cột | Tên Cột | Mô tả | Định dạng hiển thị |
|:---:|---|---|:---:|
| **A** | **STT** | Số thứ tự tăng dần tự động (1, 2, 3...) | Căn giữa |
| **B** | **Thời gian** | Ngày giờ khách gửi form (dd/MM/yyyy HH:mm:ss GMT+7) | Căn giữa |
| **C** | **Họ và tên** | Tên khách hàng đăng ký | Căn trái |
| **D** | **Số điện thoại** | SĐT/Zalo khách hàng (giữ số 0 đầu) | Căn giữa |
| **E** | **Gói quan tâm** | Gói dịch vụ đã chọn (Cơ bản, Vận hành, VIP...) | Căn trái |
| **F** | **Nhu cầu / Ngành nghề** | Ngành nghề dự kiến kinh doanh, tên công ty hoặc ghi chú | Căn trái |
| **G** | **Trạng thái gọi** | Mặc định: `Chưa liên hệ` (Chuyên viên đổi thành *Đã gọi*, *Hẹn gọi lại*, *Chốt hợp đồng*...) | Căn giữa |
| **H** | **Ghi chú Telesale** | **Cột để trống** để chuyên viên ghi lại nội dung tư vấn | Căn trái |
| **I** | **Nguồn (UTM Source)** | Nguồn khách (Facebook Ads, Google Ads, TikTok, Zalo, Direct) | Căn giữa |
| **J** | **Chiến dịch (UTM Campaign)** | Tên chiến dịch quảng cáo | Căn giữa |

---

## 5 BƯỚC THIẾT LẬP NHANH CHÓNG (2 PHÚT)

### Bước 1: Mở Google Sheet
1. Truy cập [Google Sheets](https://sheets.google.com) và tạo một bảng tính mới.
2. Đổi tên trang tính (ví dụ: `Leads - Thành Lập Công Ty Chuẩn Luật`).

### Bước 2: Mở trình chỉnh sửa Apps Script
1. Trên menu trên cùng của Google Sheet, bấm vào **Tiện ích mở rộng** (*Extensions*) $\rightarrow$ chọn **Apps Script**.

### Bước 3: Dán đoạn mã chuẩn hoá
1. Xóa hết code mẫu mặc định.
2. Mở file [google-sheets/Code.gs](file:///Users/dungbv/Documents/ThanhLapCongty/google-sheets/Code.gs) trong dự án, copy toàn bộ nội dung và dán vào.
3. Bấm biểu tượng **Lưu (Save / Ctrl + S)**.

### Bước 4: Triển khai thành Web App (Deploy)
1. Ở góc trên bên phải, bấm nút **Triển khai (Deploy)** $\rightarrow$ chọn **Tùy chọn triển khai mới (New deployment)**.
2. Bấm biểu tượng bánh răng ⚙️ $\rightarrow$ chọn **Ứng dụng web (Web app)**:
   - **Mô tả (Description)**: `Webhook Chuẩn Luật 10 Cột`
   - **Thực thi dưới tên (Execute as)**: **Tôi (Địa chỉ email của bạn)**
   - **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(Bắt buộc chọn Anyone)*.
3. Bấm **Triển khai (Deploy)** $\rightarrow$ Bấm *Ủy quyền truy cập* $\rightarrow$ Cho phép tài khoản Google.
4. Copy đường dẫn Web App vừa tạo dạng:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Bước 5: Cấu hình vào Website hoặc Vercel
- **Trên máy chủ / Cục bộ**: Mở file [data/config.json](file:///Users/dungbv/Documents/ThanhLapCongty/data/config.json), dán link vào `"googleSheetWebhookUrl"`.
- **Trên Vercel**: Vào Settings > Environment Variables > Thêm biến `GOOGLE_SHEET_WEBHOOK_URL` với giá trị là link Web App trên.
