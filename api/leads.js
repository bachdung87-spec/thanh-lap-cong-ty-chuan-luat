/**
 * Vercel Serverless Function: /api/leads
 * Handles lead submissions and forwards to Google Sheet Webhook
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

function sendToGoogleSheet(webhookUrl, payload, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return resolve({ skipped: true, message: 'Chưa cấu hình Google Sheet Webhook URL' });
    }

    const jsonString = JSON.stringify(payload);

    function executeRequest(targetUrl, redirectsLeft) {
      if (redirectsLeft <= 0) {
        return reject(new Error('Quá nhiều lần chuyển hướng'));
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
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrlObj = new URL(res.headers.location, targetUrl);
          const redirectClient = redirectUrlObj.protocol === 'https:' ? https : http;
          
          redirectClient.get(redirectUrlObj.href, (redirRes) => {
            let redirBody = '';
            redirRes.on('data', chunk => { redirBody += chunk; });
            redirRes.on('end', () => {
              resolve({ status: 'success', statusCode: redirRes.statusCode, body: redirBody });
            });
          }).on('error', () => {
            resolve({ status: 'sent_with_redirect' });
          });
          return;
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({ status: 'success', statusCode: res.statusCode, body });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Hết thời gian chờ Google Sheet'));
      });

      req.on('error', reject);
      req.write(jsonString);
      req.end();
    }

    executeRequest(webhookUrl, maxRedirects);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Chuẩn Luật Leads API trên Vercel đang sẵn sàng' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const data = req.body || {};
    if (!data.phone) {
      return res.status(400).json({ success: false, message: 'Số điện thoại là bắt buộc' });
    }

    const leadRecord = {
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
      page_url: data.page_url || '/',
      user_agent: data.user_agent || req.headers['user-agent'] || '',
      submitted_at: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };

    // Lấy Webhook URL từ biến môi trường Vercel hoặc file config.json
    let webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl) {
      try {
        const configPath = path.join(process.cwd(), 'data', 'config.json');
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          webhookUrl = cfg.googleSheetWebhookUrl;
        }
      } catch (e) {}
    }

    let sheetResult = null;
    if (webhookUrl) {
      try {
        sheetResult = await sendToGoogleSheet(webhookUrl, leadRecord);
      } catch (err) {
        console.error('Lỗi đẩy Google Sheet trên Vercel:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Lead đã được tiếp nhận thành công!',
      lead: leadRecord,
      sheetSynced: !!(webhookUrl && (!sheetResult || sheetResult.status !== 'error'))
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
