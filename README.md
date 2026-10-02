# Landing Page Dịch Vụ Thành Lập Công Ty - Kế Toán Thuế Chuẩn Luật

Website Landing Page tối ưu tỷ lệ chuyển đổi (CRO) cao cấp cho **CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT**.

- **Website / MST**: `0319213958`
- **Hotline / Zalo**: `0587949999`
- **Slogan**: "Điểm Tựa Pháp Lý – Bệ Phóng Khởi Nghiệp"
- **Địa chỉ**: Phòng 5.10, 5.12 Tòa nhà Cana, 725/21 Trường Chinh, Phường Tây Thạnh, TPHCM

---

## 🚀 Tính Năng Nổi Bật

1. **Giao Diện Doanh Nghiệp Sang Trọng (Executive Deep Emerald)**:
   - Tông màu xanh lá đậm Chuẩn Luật kết hợp cam vermilion của Cán cân công lý.
   - Hoa văn bảo mật chống giả mạo **Guilloche Security Lattice** và **Con dấu bảo chứng pháp lý**.
   - Hero Slider 3 slide chuyên nghiệp tự động xoay chuyển mượt mà.
2. **Tự Động Bắn Lead Về Google Sheet**:
   - Khách đăng ký trên bất kỳ form nào đều được lưu realtime về Google Sheet.
   - Script Google Apps Script tạo sẵn tại `google-sheets/Code.gs`.
   - Cơ chế dự phòng an toàn 100% chống mất dữ liệu khách hàng.
3. **Cấu Hình Gói Sản Phẩm Linh Hoạt**:
   - Quản trị toàn bộ bảng giá và quyền lợi tại `data/packages.json`.
   - Tự động đồng bộ lên giao diện và form tư vấn.
4. **Bảng Điều Khiển Quản Trị Trực Quan**:
   - Nhấn **`Ctrl + Shift + L`** hoặc bấm nút quản trị dưới chân trang để xem toàn bộ danh sách lead, xuất file CSV tiếng Việt, và cài đặt link Google Sheet.
5. **Tối Ưu SEO & Hiệu Năng 100%**:
   - Đầy đủ Schema.org JSON-LD (LegalService, Product, FAQPage, BreadcrumbList).
   - Thẻ Meta OpenGraph, Twitter Card, Geo Tagging TPHCM.

---

## 💻 Hướng Dẫn Chạy Cục Bộ (Local Development)

```bash
# 1. Chạy server Node.js cục bộ (Port 3002)
npm start

# Mở trình duyệt tại: http://localhost:3002

# 2. Chạy bộ kiểm thử tự động
npm test

# 3. Đồng bộ cấu hình gói sản phẩm vào HTML tĩnh (nếu cần)
npm run sync-packages
```

---

## ☁️ Triển Khai Lên Vercel (Production Deployment)

Dự án đã được cấu hình sẵn tệp `vercel.json` và Vercel Serverless Function `api/leads.js`.

### Cách 1: Kết nối trực tiếp từ GitHub sang Vercel (Khuyên dùng)
1. Đẩy mã nguồn lên GitHub.
2. Đăng nhập [Vercel Dashboard](https://vercel.com/new).
3. Bấm **Import Git Repository** $\rightarrow$ chọn repository vừa tạo.
4. (Tùy chọn) Thêm biến môi trường:
   - `GOOGLE_SHEET_WEBHOOK_URL`: Đường dẫn Web App Google Apps Script của bạn.
5. Bấm **Deploy**. Vercel sẽ cấp phát tên miền SSL miễn phí dạng `https://ten-du-an.vercel.app`.

### Cách 2: Triển khai bằng Vercel CLI
```bash
npx vercel login
npx vercel --prod
```
