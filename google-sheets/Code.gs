/**
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG THU THẬP LEAD TỪ LANDING PAGE CHUẨN LUẬT
 * CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT
 * 
 * Mã này được dán vào: Tiện ích mở rộng (Extensions) > Apps Script trong Google Sheet của bạn.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Tránh xung đột khi nhiều khách cùng gửi form

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DanhSachLead") || ss.getActiveSheet();

    // 1. Tự động khởi tạo tiêu đề cột nếu sheet còn trống
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Thời gian",
        "Họ và tên",
        "Số điện thoại",
        "Gói quan tâm",
        "Ngành nghề / Ghi chú",
        "Nguồn (UTM Source)",
        "Chiến dịch (UTM Campaign)",
        "Từ khóa (UTM Term)",
        "Đường dẫn (URL)",
        "Thiết bị / Trình duyệt",
        "Trạng thái xử lý"
      ];
      sheet.appendRow(headers);

      // Định dạng dòng tiêu đề sang trọng
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#166534"); // Xanh lá đậm Chuẩn Luật
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(11);
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 2. Trích xuất dữ liệu từ request (hỗ trợ cả JSON body lẫn Form encoded)
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Lấy thời gian hiện tại theo múi giờ Việt Nam (GMT+7)
    var nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    var rowData = [
      nowFormatted,
      data.name || data.fullname || "Chưa cung cấp",
      "'" + (data.phone || ""), // Dấu ' phía trước để Google Sheet không làm mất số 0 đầu
      data.package || data.service || "Tư vấn chung",
      data.notes || data.industry || data.message || "",
      data.utm_source || "direct",
      data.utm_campaign || "none",
      data.utm_term || "",
      data.page_url || data.url || "",
      data.user_agent || data.device || "Desktop/Mobile",
      "Mới nhận - Chưa gọi"
    ];

    sheet.appendRow(rowData);

    // Tự động căn lề và định dạng dòng vừa thêm
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 3).setHorizontalAlignment("center"); // SĐT
    sheet.getRange(lastRow, 11).setHorizontalAlignment("center"); // Trạng thái

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead đã được lưu vào Google Sheet thành công!",
      row: lastRow,
      name: data.name,
      phone: data.phone
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DanhSachLead") || ss.getActiveSheet();
  var totalRows = Math.max(0, sheet.getLastRow() - 1);

  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "Google Sheet Webhook Kế Toán Thuế Chuẩn Luật đang hoạt động!",
    totalLeads: totalRows,
    timestamp: Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}
