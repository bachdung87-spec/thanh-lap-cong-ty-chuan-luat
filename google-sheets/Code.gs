/**
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG THU THẬP LEAD TỪ LANDING PAGE CHUẨN LUẬT
 * CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT
 * 
 * 10 CỘT CHUẨN HOÁ:
 * 1. STT
 * 2. Thời gian
 * 3. Họ và tên
 * 4. Số điện thoại
 * 5. Gói quan tâm
 * 6. Nhu cầu / Ngành nghề
 * 7. Trạng thái gọi
 * 8. Ghi chú Telesale
 * 9. Nguồn (UTM Source)
 * 10. Chiến dịch (UTM Campaign)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Tránh xung đột khi nhiều khách cùng gửi form cùng lúc

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DanhSachLead") || ss.getActiveSheet();

    // 1. Tự động khởi tạo 10 cột tiêu đề chuẩn nếu sheet còn trống
    if (sheet.getLastRow() === 0) {
      var headers = [
        "STT",
        "Thời gian",
        "Họ và tên",
        "Số điện thoại",
        "Gói quan tâm",
        "Nhu cầu / Ngành nghề",
        "Trạng thái gọi",
        "Ghi chú Telesale",
        "Nguồn (UTM Source)",
        "Chiến dịch (UTM Campaign)"
      ];
      sheet.appendRow(headers);

      // Định dạng dòng tiêu đề: Xanh lá đậm Chuẩn Luật #166534, chữ trắng in đậm
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#166534");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(11);
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 38);
      sheet.setFrozenRows(1);
    }

    // 2. Trích xuất dữ liệu từ request
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

    // Thời gian Việt Nam GMT+7
    var nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    // Tính STT tự động (dòng 2 là STT 1, dòng 3 là STT 2...)
    var currentLastRow = sheet.getLastRow();
    var stt = Math.max(1, currentLastRow);

    // Chuẩn hoá số điện thoại (thêm ' để không mất số 0 đầu)
    var phoneStr = (data.phone || "").toString().trim();
    if (phoneStr && !phoneStr.startsWith("'")) {
      phoneStr = "'" + phoneStr;
    }

    // Nhu cầu hoặc ngành nghề kinh doanh
    var noteOrIndustry = (data.notes || data.industry || data.message || "").toString().trim();

    // 10 giá trị tương ứng đúng thứ tự 10 cột
    var rowData = [
      stt,                                              // 1. STT
      nowFormatted,                                     // 2. Thời gian
      data.name || data.fullname || "Chưa cung cấp",     // 3. Họ và tên
      phoneStr,                                         // 4. Số điện thoại
      data.package || data.service || "Tư vấn chung",   // 5. Gói quan tâm
      noteOrIndustry,                                   // 6. Nhu cầu / Ngành nghề
      "Chưa liên hệ",                                   // 7. Trạng thái gọi
      "",                                               // 8. Ghi chú Telesale (để trống cho nhân viên ghi chú)
      data.utm_source || "direct",                      // 9. Nguồn (UTM Source)
      data.utm_campaign || "none"                       // 10. Chiến dịch (UTM Campaign)
    ];

    sheet.appendRow(rowData);

    // Định dạng dòng vừa thêm: Căn giữa STT, Thời gian, SĐT, Trạng thái, Nguồn
    var newRow = sheet.getLastRow();
    sheet.setRowHeight(newRow, 30);
    sheet.getRange(newRow, 1).setHorizontalAlignment("center"); // STT
    sheet.getRange(newRow, 2).setHorizontalAlignment("center"); // Thời gian
    sheet.getRange(newRow, 4).setHorizontalAlignment("center"); // SĐT
    sheet.getRange(newRow, 7).setHorizontalAlignment("center"); // Trạng thái gọi
    sheet.getRange(newRow, 9).setHorizontalAlignment("center"); // UTM Source
    sheet.getRange(newRow, 10).setHorizontalAlignment("center"); // UTM Campaign

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead đã được lưu vào Google Sheet chuẩn 10 cột thành công!",
      stt: stt,
      row: newRow,
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
    message: "Google Sheet Webhook Kế Toán Thuế Chuẩn Luật (Chuẩn 10 cột) đang hoạt động!",
    totalLeads: totalRows,
    timestamp: Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}
