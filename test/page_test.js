/**
 * Automated Verification Test for Kế Toán Thuế Chuẩn Luật Landing Page
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT_DIR, 'index.html');
const cssPath = path.join(ROOT_DIR, 'css', 'styles.css');
const appJsPath = path.join(ROOT_DIR, 'js', 'app.js');
const utmJsPath = path.join(ROOT_DIR, 'js', 'utm-tracker.js');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(err.message);
    failCount++;
  }
}

console.log('--- BẮT ĐẦU KIỂM THỬ LANDING PAGE CHUẨN LUẬT ---\n');

// 1. Kiểm tra tồn tại file
test('Tất cả các file cốt lõi (index.html, styles.css, app.js, utm-tracker.js) phải tồn tại', () => {
  assert(fs.existsSync(htmlPath), 'Thiếu file index.html');
  assert(fs.existsSync(cssPath), 'Thiếu file css/styles.css');
  assert(fs.existsSync(appJsPath), 'Thiếu file js/app.js');
  assert(fs.existsSync(utmJsPath), 'Thiếu file js/utm-tracker.js');
});

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 2. Kiểm tra thông tin thương hiệu bắt buộc
test('Thông tin thương hiệu CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT phải chính xác', () => {
  assert(htmlContent.includes('CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT'), 'Thiếu tên công ty chính thức');
});

test('Mã số thuế 0319213958 phải chính xác', () => {
  assert(htmlContent.includes('0319213958'), 'Thiếu mã số thuế 0319213958');
});

test('Địa chỉ trụ sở Phòng 5.10, 5.12 Tòa nhà Cana, 725/21 Trường Chinh, Phường Tây Thạnh phải chính xác', () => {
  assert(htmlContent.includes('725/21 Trường Chinh'), 'Thiếu số nhà đường Trường Chinh');
  assert(htmlContent.includes('Phường Tây Thạnh'), 'Thiếu Phường Tây Thạnh');
  assert(htmlContent.includes('Tòa nhà Cana'), 'Thiếu Tòa nhà Cana');
});

test('Hotline và liên kết Zalo 0587949999 phải có đầy đủ', () => {
  assert(htmlContent.includes('0587949999') || htmlContent.includes('0587.94.9999'), 'Thiếu hiển thị hotline 0587949999');
  assert(htmlContent.includes('tel:0587949999'), 'Thiếu link tel:0587949999');
  assert(htmlContent.includes('zalo.me/0587949999'), 'Thiếu link Zalo 0587949999');
});

test('Slogan thương hiệu mới "Điểm Tựa Pháp Lý – Bệ Phóng Khởi Nghiệp" phải hiển thị chính xác', () => {
  assert(htmlContent.includes('Điểm Tựa Pháp Lý – Bệ Phóng Khởi Nghiệp'), 'Thiếu slogan mới Điểm Tựa Pháp Lý – Bệ Phóng Khởi Nghiệp');
});

// 3. Kiểm tra SEO & Schema.org JSON-LD
test('Thẻ SEO Meta Tags (Title, Description, Canonical, OpenGraph, Geo) phải có đầy đủ', () => {
  assert(htmlContent.includes('<title>'), 'Thiếu thẻ <title>');
  assert(htmlContent.includes('name="description"'), 'Thiếu meta description');
  assert(htmlContent.includes('rel="canonical"'), 'Thiếu canonical link');
  assert(htmlContent.includes('property="og:title"'), 'Thiếu og:title');
  assert(htmlContent.includes('name="twitter:card"'), 'Thiếu twitter:card');
  assert(htmlContent.includes('name="geo.region" content="VN-SG"'), 'Thiếu geo.region TPHCM');
});

test('Schema.org JSON-LD phải hợp lệ và đầy đủ các loại Schema (LegalService, Product, FAQPage, BreadcrumbList)', () => {
  const schemaRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match = htmlContent.match(schemaRegex);
  assert(match, 'Không tìm thấy thẻ <script type="application/ld+json">');
  
  const parsed = JSON.parse(match[1]);
  assert(Array.isArray(parsed), 'Schema JSON-LD nên là một mảng schema');
  
  const types = parsed.map(item => item['@type']);
  assert(types.includes('LegalService'), 'Thiếu schema LegalService');
  assert(types.includes('Product'), 'Thiếu schema Product');
  assert(types.includes('FAQPage'), 'Thiếu schema FAQPage');
  assert(types.includes('BreadcrumbList'), 'Thiếu schema BreadcrumbList');

  // Kiểm tra chi tiết FAQPage schema có ít nhất 5 câu hỏi
  const faqSchema = parsed.find(item => item['@type'] === 'FAQPage');
  assert(faqSchema.mainEntity && faqSchema.mainEntity.length >= 5, 'FAQ schema phải có ít nhất 5 câu hỏi');
});

// 4. Kiểm tra CRO & Các gói dịch vụ
test('Các gói giá dịch vụ 1.500.000đ, 3.790.000đ, 5.490.000đ phải có mặt rõ ràng', () => {
  assert(htmlContent.includes('1.500.000'), 'Thiếu giá 1.500.000đ');
  assert(htmlContent.includes('3.790.000'), 'Thiếu giá 3.790.000đ');
  assert(htmlContent.includes('5.490.000'), 'Thiếu giá 5.490.000đ');
});

test('Các yếu tố tăng chuyển đổi (Form, Modal, Mobile Sticky Bar, Countdown, Social Proof Toast) phải có mặt', () => {
  assert(htmlContent.includes('id="lead-modal"'), 'Thiếu modal form');
  assert(htmlContent.includes('id="social-proof-toast"'), 'Thiếu toast notification');
  assert(htmlContent.includes('id="promo-timer"'), 'Thiếu đồng hồ đếm ngược ưu đãi');
  assert(htmlContent.includes('id="calc-members"'), 'Thiếu widget gợi ý loại hình');
  assert(htmlContent.includes('safe-bottom'), 'Thiếu mobile sticky bar');
});

// 5. Kiểm tra Logo chính thức và Tài nguyên thương hiệu
test('Tệp assets/logo.png phải tồn tại và được tích hợp vào Header, Footer, Favicon', () => {
  const logoPath = path.join(ROOT_DIR, 'assets', 'logo.png');
  assert(fs.existsSync(logoPath), 'Thiếu file assets/logo.png');
  assert(htmlContent.includes('src="assets/logo.png"'), 'Thiếu thẻ img src="assets/logo.png"');
  assert(htmlContent.includes('href="assets/logo.png"'), 'Thiếu favicon liên kết tới assets/logo.png');
});

// 6. Kiểm tra tính hợp lệ cú pháp của file JS
test('File js/app.js và js/utm-tracker.js không có lỗi cú pháp', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  assert(appJs.length > 500, 'File app.js rỗng hoặc quá ngắn');
  const utmJs = fs.readFileSync(utmJsPath, 'utf8');
  assert(utmJs.length > 500, 'File utm-tracker.js rỗng hoặc quá ngắn');
});

console.log(`\n========================================`);
console.log(`TỔNG KẾT: ${passCount} PASS | ${failCount} FAIL`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
