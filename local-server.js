/**
 * Local Web Server & API Gateway for Kế Toán Thuế Chuẩn Luật Landing Page
 * Port: 3002
 * Features:
 * - Static file serving with MIME types
 * - POST /api/leads: Receive lead, save to data/leads.json, push to Google Sheet Webhook
 * - GET /api/leads: View leads list
 * - GET /api/config & POST /api/config: Read/write system configuration (Google Sheet URL, etc.)
 * - GET /api/packages & POST /api/packages: Read/write configurable product packages
 * - POST /api/test-sheet: Test Google Sheet Webhook connection
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3002;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const PACKAGES_FILE = path.join(DATA_DIR, 'packages.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LEADS_FILE)) {
  fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
}
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    googleSheetWebhookUrl: "",
    autoBackupLocal: true,
    emailNotification: "ketoanchuanluat@gmail.com"
  }, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Lỗi đọc file ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Lỗi ghi file ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Send HTTP/HTTPS POST to Google Apps Script Webhook
 * Handles 302/301 redirects returned by Google Apps Script
 */
function sendToGoogleSheet(webhookUrl, payload, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return resolve({ skipped: true, message: 'Chưa cấu hình Google Sheet Webhook URL' });
    }

    const jsonString = JSON.stringify(payload);

    function executeRequest(targetUrl, redirectsLeft) {
      if (redirectsLeft <= 0) {
        return reject(new Error('Quá nhiều lần chuyển hướng (Too many redirects)'));
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return reject(e);
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonString)
        },
        timeout: 15000
      };

      const req = client.request(options, (res) => {
        // Handle Google 302/301 Redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectLocation = res.headers.location;
          // Google Apps Script redirect to GET or POST
          // If redirected, follow GET to finish
          const redirectUrlObj = new URL(redirectLocation, targetUrl);
          const redirectClient = redirectUrlObj.protocol === 'https:' ? https : http;
          
          redirectClient.get(redirectUrlObj.href, (redirRes) => {
            let redirBody = '';
            redirRes.on('data', chunk => { redirBody += chunk; });
            redirRes.on('end', () => {
              resolve({
                status: 'success',
                statusCode: redirRes.statusCode,
                body: redirBody
              });
            });
          }).on('error', (err) => {
            // Even if redirect GET fails, Google usually executed the POST
            resolve({ status: 'warning', message: err.message });
          });
          return;
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({
            status: 'success',
            statusCode: res.statusCode,
            body: body
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Kết nối tới Google Sheet hết thời gian chờ (Timeout)'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(jsonString);
      req.end();
    }

    executeRequest(webhookUrl, maxRedirects);
  });
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Dữ liệu gửi lên vượt quá giới hạn'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        // Try form-urlencoded parse
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [key, value] of params.entries()) {
          obj[key] = value;
        }
        resolve(obj);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = req.url.split('?')[0];

  // ==========================================
  // REST API ENDPOINTS
  // ==========================================

  // 1. GET /api/leads: Return all leads
  if (req.method === 'GET' && parsedUrl === '/api/leads') {
    const leads = readJsonFile(LEADS_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: leads.length, leads }));
    return;
  }

  // 2. POST /api/leads: Record new lead & forward to Google Sheet
  if (req.method === 'POST' && parsedUrl === '/api/leads') {
    try {
      const data = await parseRequestBody(req);

      if (!data.phone) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Số điện thoại là bắt buộc' }));
        return;
      }

      const newLead = {
        id: 'LEAD-' + Date.now(),
        name: data.name || 'Khách hàng',
        phone: data.phone,
        package: data.package || 'Tư vấn chung',
        industry: data.industry || data.notes || '',
        notes: data.notes || '',
        utm_source: data.utm_source || 'direct',
        utm_medium: data.utm_medium || '',
        utm_campaign: data.utm_campaign || 'none',
        utm_term: data.utm_term || '',
        utm_content: data.utm_content || '',
        page_url: data.page_url || '/',
        user_agent: data.user_agent || req.headers['user-agent'] || '',
        submitted_at: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        createdAt: new Date().toISOString()
      };

      // 1. Save to local data/leads.json
      const leads = readJsonFile(LEADS_FILE, []);
      leads.unshift(newLead);
      writeJsonFile(LEADS_FILE, leads);

      // 2. Forward to Google Sheet Webhook if configured
      const config = readJsonFile(CONFIG_FILE, {});
      let sheetSyncResult = null;
      if (config.googleSheetWebhookUrl) {
        try {
          sheetSyncResult = await sendToGoogleSheet(config.googleSheetWebhookUrl, newLead);
          console.log(`[Google Sheet] Đã đẩy lead ${newLead.phone} thành công!`);
        } catch (sheetErr) {
          console.error(`[Google Sheet] Lỗi đẩy lead:`, sheetErr.message);
          sheetSyncResult = { status: 'error', error: sheetErr.message };
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: 'Lead đã được tiếp nhận và lưu trữ an toàn!',
        lead: newLead,
        sheetSynced: !!(config.googleSheetWebhookUrl && (!sheetSyncResult || sheetSyncResult.status !== 'error'))
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  // 3. GET /api/config: Get settings
  if (req.method === 'GET' && parsedUrl === '/api/config') {
    const config = readJsonFile(CONFIG_FILE, {});
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, config }));
    return;
  }

  // 4. POST /api/config: Update settings (Google Sheet URL, etc.)
  if (req.method === 'POST' && parsedUrl === '/api/config') {
    try {
      const updates = await parseRequestBody(req);
      const currentConfig = readJsonFile(CONFIG_FILE, {});
      const newConfig = {
        ...currentConfig,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeJsonFile(CONFIG_FILE, newConfig);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: 'Đã lưu cấu hình thành công!', config: newConfig }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  // 5. GET /api/packages: Get product packages
  if (req.method === 'GET' && parsedUrl === '/api/packages') {
    const packages = readJsonFile(PACKAGES_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: packages.length, packages }));
    return;
  }

  // 6. POST /api/packages: Update product packages
  if (req.method === 'POST' && parsedUrl === '/api/packages') {
    try {
      const data = await parseRequestBody(req);
      const packagesList = Array.isArray(data) ? data : data.packages;

      if (!Array.isArray(packagesList) || packagesList.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Dữ liệu packages phải là một mảng hợp lệ' }));
        return;
      }

      writeJsonFile(PACKAGES_FILE, packagesList);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: 'Đã cập nhật các gói sản phẩm thành công!', packages: packagesList }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  // 7. POST /api/test-sheet: Test Google Sheet Webhook with a test row
  if (req.method === 'POST' && parsedUrl === '/api/test-sheet') {
    try {
      const data = await parseRequestBody(req);
      const webhookUrl = data.webhookUrl || readJsonFile(CONFIG_FILE, {}).googleSheetWebhookUrl;

      if (!webhookUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Vui lòng cung cấp Google Sheet Webhook URL' }));
        return;
      }

      const testPayload = {
        name: 'Dương Văn Test (Dữ liệu kiểm thử)',
        phone: '0587949999',
        package: 'Gói Vận Hành Chuẩn (3.790.000đ)',
        notes: 'Kiểm thử kết nối hệ thống tự động Chuẩn Luật',
        utm_source: 'system_test',
        utm_campaign: 'webhook_verification',
        page_url: 'http://localhost:3002/#test',
        submitted_at: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        user_agent: 'Antigravity Test Agent'
      };

      const result = await sendToGoogleSheet(webhookUrl, testPayload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: 'Đã gửi dữ liệu thử nghiệm tới Google Sheet thành công!',
        result
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Lỗi gửi tới Google Sheet: ' + err.message }));
    }
    return;
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  let safePath = path.normalize(parsedUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT_DIR, safePath === '/' ? 'index.html' : safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="vi">
        <head><meta charset="utf-8"><title>404 - Không tìm thấy trang</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px;">
          <h2>404 - Không tìm thấy tệp yêu cầu</h2>
          <p><a href="/">Quay về Trang chủ Landing Page</a></p>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Chuẩn Luật Landing Page & Lead API Server:`);
  console.log(`👉 Web Interface: http://localhost:${PORT}`);
  console.log(`👉 Lead API:      http://localhost:${PORT}/api/leads`);
  console.log(`👉 Config API:    http://localhost:${PORT}/api/config`);
  console.log(`👉 Packages API:  http://localhost:${PORT}/api/packages`);
  console.log(`====================================================`);
});
