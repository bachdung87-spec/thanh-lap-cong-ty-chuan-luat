/**
 * Automated Verification Test for Lead Pipeline & Configurable Packages
 * Chạy lệnh: node test/lead_test.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_FILE = path.join(ROOT_DIR, 'data', 'packages.json');
const CONFIG_FILE = path.join(ROOT_DIR, 'data', 'config.json');
const LEADS_FILE = path.join(ROOT_DIR, 'data', 'leads.json');
const GOOGLE_SCRIPT_FILE = path.join(ROOT_DIR, 'google-sheets', 'Code.gs');
const GOOGLE_GUIDE_FILE = path.join(ROOT_DIR, 'google-sheets', 'HUONG_DAN_GOOGLE_SHEET.md');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  return new Promise((resolve) => {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        res.then(() => {
          console.log(`✅ PASS: ${description}`);
          passCount++;
          resolve();
        }).catch((err) => {
          console.error(`❌ FAIL: ${description}`);
          console.error(err.message);
          failCount++;
          resolve();
        });
      } else {
        console.log(`✅ PASS: ${description}`);
        passCount++;
        resolve();
      }
    } catch (err) {
      console.error(`❌ FAIL: ${description}`);
      console.error(err.message);
      failCount++;
      resolve();
    }
  });
}

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: '127.0.0.1',
      port: 3002,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:3002${urlPath}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ HỆ THỐNG LEAD & GÓI SẢN PHẨM ---\n');

  // 1. Kiểm tra tồn tại file cấu hình và script
  await test('File cấu hình data/packages.json và data/config.json phải tồn tại', () => {
    assert(fs.existsSync(PACKAGES_FILE), 'Thiếu file data/packages.json');
    assert(fs.existsSync(CONFIG_FILE), 'Thiếu file data/config.json');
  });

  await test('Tài liệu và mã nguồn google-sheets/Code.gs, HUONG_DAN_GOOGLE_SHEET.md phải tồn tại', () => {
    assert(fs.existsSync(GOOGLE_SCRIPT_FILE), 'Thiếu file google-sheets/Code.gs');
    assert(fs.existsSync(GOOGLE_GUIDE_FILE), 'Thiếu file google-sheets/HUONG_DAN_GOOGLE_SHEET.md');
    const scriptContent = fs.readFileSync(GOOGLE_SCRIPT_FILE, 'utf8');
    assert(scriptContent.includes('doPost'), 'Google Apps Script phải có hàm doPost');
    assert(scriptContent.includes('doGet'), 'Google Apps Script phải có hàm doGet');
  });

  // 2. Kiểm tra tính toàn vẹn của data/packages.json
  await test('data/packages.json phải chứa cấu hình hợp lệ với đầy đủ 3 gói dịch vụ', () => {
    const packages = JSON.parse(fs.readFileSync(PACKAGES_FILE, 'utf8'));
    assert(Array.isArray(packages), 'packages phải là một mảng');
    assert(packages.length >= 3, 'Phải có ít nhất 3 gói dịch vụ');

    const prices = packages.map(p => p.price);
    assert(prices.includes(1500000), 'Thiếu gói giá 1.500.000');
    assert(prices.includes(3790000), 'Thiếu gói giá 3.790.000');
    assert(prices.includes(5490000), 'Thiếu gói giá 5.490.000');

    packages.forEach(pkg => {
      assert(pkg.id, 'Mỗi gói phải có id');
      assert(pkg.name, 'Mỗi gói phải có name');
      assert(pkg.priceDisplay, 'Mỗi gói phải có priceDisplay');
      assert(Array.isArray(pkg.features) && pkg.features.length > 0, 'Mỗi gói phải có danh sách features');
    });
  });

  // 3. Kiểm tra API GET /api/config
  await test('API GET /api/config phải trả về cấu hình hệ thống', async () => {
    const res = await getJson('/api/config');
    assert.strictEqual(res.statusCode, 200, 'HTTP status phải là 200');
    assert(res.data.success, 'Phản hồi phải có success: true');
    assert('googleSheetWebhookUrl' in res.data.config, 'Config phải có trường googleSheetWebhookUrl');
  });

  // 4. Kiểm tra API GET /api/packages
  await test('API GET /api/packages phải trả về danh sách các gói dịch vụ', async () => {
    const res = await getJson('/api/packages');
    assert.strictEqual(res.statusCode, 200, 'HTTP status phải là 200');
    assert(res.data.success, 'Phản hồi phải có success: true');
    assert(Array.isArray(res.data.packages), 'packages phải là mảng');
    assert(res.data.packages.length >= 3, 'Phải có ít nhất 3 gói');
  });

  // 5. Kiểm tra API POST /api/leads
  const testPhone = '0987654321';
  await test('API POST /api/leads tiếp nhận lead và ghi nhận an toàn', async () => {
    const leadPayload = {
      name: 'Khách Hàng Tự Động Test',
      phone: testPhone,
      package: 'Gói Vận Hành Chuẩn (3.790.000đ)',
      notes: 'Thành lập công ty phần mềm công nghệ',
      utm_source: 'automated_test',
      utm_campaign: 'ci_pipeline'
    };

    const res = await postJson('/api/leads', leadPayload);
    assert.strictEqual(res.statusCode, 200, 'HTTP status phải là 200');
    assert(res.data.success, 'Phản hồi phải có success: true');
    assert.strictEqual(res.data.lead.phone, testPhone, 'Số điện thoại trong lead trả về phải trùng khớp');

    // Kiểm tra lead đã vào data/leads.json
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    const found = leads.find(l => l.phone === testPhone);
    assert(found, 'Lead phải được ghi vào file data/leads.json');
    assert.strictEqual(found.name, 'Khách Hàng Tự Động Test');
  });

  // 6. Dọn dẹp dữ liệu test khỏi data/leads.json
  const currentLeads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const cleanedLeads = currentLeads.filter(l => l.phone !== testPhone);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(cleanedLeads, null, 2), 'utf8');

  console.log(`\n========================================`);
  console.log(`TỔNG KẾT LEAD & CONFIG: ${passCount} PASS | ${failCount} FAIL`);
  console.log(`========================================\n`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
