/**
 * Main Application Logic
 * CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // --- 1. COUNTDOWN TIMER (Khuyến mãi tháng) ---
  function initCountdown() {
    var timerEl = document.getElementById('promo-timer');
    if (!timerEl) return;

    // Set end of current month
    var now = new Date();
    var endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    function updateTimer() {
      var current = new Date();
      var diff = endOfMonth - current;

      if (diff <= 0) {
        timerEl.textContent = '00 ngày : 00 giờ : 00 phút : 00 giây';
        return;
      }

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      var minutes = Math.floor((diff / 1000 / 60) % 60);
      var seconds = Math.floor((diff / 1000) % 60);

      var pad = function (n) { return n < 10 ? '0' + n : n; };
      timerEl.textContent = pad(days) + ' ngày : ' + pad(hours) + ' giờ : ' + pad(minutes) + ' phút : ' + pad(seconds) + ' giây';
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }
  initCountdown();

  // --- 2. MODAL LEAD CAPTURE ---
  var leadModal = document.getElementById('lead-modal');
  var modalTitle = document.getElementById('modal-package-title');
  var modalPackageInput = document.getElementById('modal-package-input');

  window.openLeadModal = function (packageName) {
    if (!leadModal) return;
    if (modalTitle && packageName) {
      modalTitle.textContent = 'Đăng ký: ' + packageName;
    }
    if (modalPackageInput && packageName) {
      modalPackageInput.value = packageName;
    }
    leadModal.classList.remove('hidden');
    leadModal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    if (window.trackEvent) {
      window.trackEvent('open_lead_modal', { package: packageName || 'Tư vấn chung' });
    }
  };

  window.closeLeadModal = function () {
    if (!leadModal) return;
    leadModal.classList.add('hidden');
    leadModal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  // Close modal when clicking outside modal box
  if (leadModal) {
    leadModal.addEventListener('click', function (e) {
      if (e.target === leadModal) {
        window.closeLeadModal();
      }
    });
  }

  // --- 3. FORM SUBMISSION HANDLERS (GỬI LEAD VỀ SERVER & GOOGLE SHEET) ---
  var forms = document.querySelectorAll('form[data-ajax-form="true"]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalBtnText = submitBtn ? submitBtn.innerHTML : 'Gửi';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang lưu thông tin...';
      }

      var formData = new FormData(form);
      var leadObject = {};
      formData.forEach(function (value, key) {
        leadObject[key] = value;
      });

      // Tích hợp UTM parameters từ utm-tracker.js
      var utm = window.utmData || {};
      leadObject.utm_source = utm.utm_source || 'direct';
      leadObject.utm_medium = utm.utm_medium || '';
      leadObject.utm_campaign = utm.utm_campaign || 'none';
      leadObject.utm_term = utm.utm_term || '';
      leadObject.utm_content = utm.utm_content || '';
      leadObject.page_url = window.location.href;
      leadObject.user_agent = navigator.userAgent;
      leadObject.submitted_at = new Date().toLocaleString('vi-VN');

      // 1. Sao lưu dự phòng vào LocalStorage
      try {
        var existingLeads = JSON.parse(localStorage.getItem('chuanluat_leads') || '[]');
        existingLeads.unshift(leadObject);
        localStorage.setItem('chuanluat_leads', JSON.stringify(existingLeads));
      } catch (err) {
        console.error('Lỗi lưu localStorage:', err);
      }

      // 2. Gửi dữ liệu tới API Server (/api/leads) để lưu vào file và forward tới Google Sheet
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadObject)
      })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        console.log('[Chuẩn Luật] Phản hồi ghi nhận Lead:', result);
      })
      .catch(function (apiErr) {
        console.warn('[Chuẩn Luật] Không kết nối được API server, kích hoạt webhook dự phòng:', apiErr);
        // Fallback: nếu website chạy trên hosting tĩnh không có server Node.js, bắn thẳng sang Webhook Google Sheet
        var webhookUrl = localStorage.getItem('chuanluat_sheet_url');
        if (webhookUrl && webhookUrl.startsWith('http')) {
          fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadObject)
          }).catch(function (e) { console.error('Fallback sheet error:', e); });
        }
      })
      .finally(function () {
        // 3. Đo lường chuyển đổi Marketing
        if (window.trackEvent) {
          window.trackEvent('generate_lead', {
            phone: leadObject.phone,
            name: leadObject.name,
            package: leadObject.package || 'Tư vấn chung'
          });
        }

        setTimeout(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
          }

          alert('Cảm ơn Quý khách ' + (leadObject.name || '') + '!\nChuyên viên Kế Toán Thuế Chuẩn Luật sẽ liên hệ lại qua SĐT ' + leadObject.phone + ' trong vòng 15 phút để tư vấn chi tiết phương án tối ưu nhất.');
          form.reset();

          if (leadModal && !leadModal.classList.contains('hidden')) {
            window.closeLeadModal();
          }
        }, 500);
      });
    });
  });

  // --- 4. INTERACTIVE COMPANY TYPE SELECTOR WIDGET ---
  var membersSelect = document.getElementById('calc-members');
  var capitalInput = document.getElementById('calc-capital');
  var fundSelect = document.getElementById('calc-fund');
  var resultBox = document.getElementById('type-recommendation-result');

  function calculateRecommendation() {
    if (!membersSelect || !resultBox) return;

    var members = parseInt(membersSelect.value, 10);
    var capital = parseFloat(capitalInput ? capitalInput.value : 0) || 0;
    var wantsFund = fundSelect ? fundSelect.value : 'no';

    var title = '';
    var badge = '';
    var description = '';
    var pros = [];
    var cons = [];

    if (wantsFund === 'yes' || members > 50) {
      title = 'CÔNG TY CỔ PHẦN (CTCP)';
      badge = 'Khuyên dùng cho quy mô lớn / gọi vốn';
      description = 'Rất phù hợp khi có kế hoạch huy động vốn từ nhiều nhà đầu tư hoặc phát hành cổ phần đại chúng.';
      pros = [
        'Không giới hạn số lượng cổ đông tối đa (tối thiểu 3 cổ đông).',
        'Linh hoạt chuyển nhượng cổ phần, dễ dàng gọi vốn từ quỹ hoặc nhà đầu tư thiên thần.',
        'Có thể phát hành cổ phiếu, trái phiếu huy động vốn trong tương lai.'
      ];
      cons = [
        'Cơ cấu tổ chức và thủ tục nội bộ (Đại hội đồng cổ đông, HĐQT) tương đối chặt chẽ, phức tạp hơn.',
        'Bảo mật tài chính và quản trị có tính công khai cao hơn.'
      ];
    } else if (members === 1) {
      title = 'CÔNG TY TNHH MỘT THÀNH VIÊN';
      badge = 'Lựa chọn tối ưu cho 1 chủ sở hữu cá nhân';
      description = 'Do 1 cá nhân hoặc 1 tổ chức làm chủ sở hữu. Toàn quyền tự chủ quyết định 100% mọi hoạt động của công ty.';
      pros = [
        'Chủ sở hữu toàn quyền quyết định mọi vấn đề, không lo mâu thuẫn nội bộ giữa các cổ đông.',
        'Trách nhiệm tài sản hữu hạn trong phạm vi số vốn điều lệ đã đăng ký.',
        'Thủ tục pháp lý, cơ cấu vận hành tinh gọn, dễ quản lý nhất trong các loại hình.'
      ];
      cons = [
        'Không được phát hành cổ phiếu (chỉ phát hành được trái phiếu theo quy định).',
        'Hạn chế khi muốn chia sẻ cổ phần cho người khác (phải làm thủ tục chuyển đổi sang TNHH 2TV hoặc Cổ phần).'
      ];
    } else {
      title = 'CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN';
      badge = 'Lựa chọn phổ biến cho nhóm bạn khởi nghiệp';
      description = 'Phù hợp khi có từ 2 đến 50 thành viên cùng góp vốn hợp tác kinh doanh bền vững.';
      pros = [
        'Kiểm soát chặt chẽ việc chuyển nhượng vốn (thành viên chuyển vốn phải ưu tiên chuyển cho các thành viên còn lại).',
        'Trách nhiệm hữu hạn trong phạm vi vốn góp, tính bảo mật nội bộ rất cao.',
        'Cơ cấu quản trị linh hoạt hơn nhiều so với công ty cổ phần.'
      ];
      cons = [
        'Tối đa không quá 50 thành viên.',
        'Không được phát hành cổ phiếu.'
      ];
    }

    // Calculate license tax (Lệ phí môn bài)
    var licenseTax = '2.000.000 đ/năm';
    var noteLicense = 'Vốn điều lệ từ 10 tỷ trở xuống: 2.000.000 đ/năm.';
    if (capital > 10000) { // Đơn vị: triệu đồng (> 10 tỷ)
      licenseTax = '3.000.000 đ/năm';
      noteLicense = 'Vốn điều lệ trên 10 tỷ: 3.000.000 đ/năm.';
    }
    var taxExemptionNote = 'ĐẶC BIỆT: Theo Nghị định 22/2020/NĐ-CP, doanh nghiệp mới thành lập được MIỄN LỆ PHÍ MÔN BÀI trong năm đầu tiên thành lập!';

    // Render result
    resultBox.innerHTML = `
      <div class="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span class="inline-block bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">${badge}</span>
          <span class="text-xs text-emerald-900 font-bold bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-lg">Vốn: ${capital.toLocaleString('vi-VN')} triệu VNĐ</span>
        </div>
        <h4 class="text-xl sm:text-2xl font-black text-slate-900 mb-2">${title}</h4>
        <p class="text-slate-600 text-xs sm:text-sm mb-5 leading-relaxed">${description}</p>
        
        <div class="grid md:grid-cols-2 gap-4 text-xs mb-5">
          <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <p class="font-bold text-emerald-800 mb-2 flex items-center gap-1.5 text-xs">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              Ưu điểm nổi bật:
            </p>
            <ul class="space-y-1.5 text-slate-600 leading-relaxed">
              ${pros.map(function(p){ return '<li>• ' + p + '</li>'; }).join('')}
            </ul>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <p class="font-bold text-amber-800 mb-2 flex items-center gap-1.5 text-xs">
              <svg class="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Lưu ý quan trọng:
            </p>
            <ul class="space-y-1.5 text-slate-600 leading-relaxed">
              ${cons.map(function(c){ return '<li>• ' + c + '</li>'; }).join('')}
            </ul>
          </div>
        </div>

        <div class="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 mb-5">
          <p class="font-bold mb-1 flex items-center text-emerald-900">
            <svg class="w-4 h-4 mr-1.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
            Dự toán Lệ phí Môn bài hàng năm: <span class="font-black text-sm ml-1 text-emerald-800">${licenseTax}</span>
          </p>
          <p class="text-slate-600">${noteLicense}</p>
          <p class="mt-1.5 text-emerald-800 font-bold">🎉 ${taxExemptionNote}</p>
        </div>

        <div class="text-center">
          <button onclick="openLeadModal('Tư vấn mô hình ' + '${title}')" class="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-accent-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md shadow-orange-600/25 transition duration-200 inline-flex items-center justify-center gap-2">
            <span>Nhận Bộ Hồ Sơ Mẫu & Tư Vấn Chi Tiết Mô Hình Này</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  if (membersSelect) {
    membersSelect.addEventListener('change', calculateRecommendation);
    if (capitalInput) capitalInput.addEventListener('input', calculateRecommendation);
    if (fundSelect) fundSelect.addEventListener('change', calculateRecommendation);
    calculateRecommendation();
  }

  // --- 5. SOCIAL PROOF LIVE TOAST ---
  var toastEl = document.getElementById('social-proof-toast');
  var toastMsg = document.getElementById('toast-message');
  var toastTime = document.getElementById('toast-time');

  var sampleClients = [
    { name: 'Anh Hùng', district: 'Q. Tân Bình', pkg: 'Gói Vận Hành Chuẩn', time: '4 phút trước' },
    { name: 'Chị Mai', district: 'Q. 12', pkg: 'Gói Cơ Bản (Khởi Sự)', time: '12 phút trước' },
    { name: 'Anh Tuấn', district: 'TP. Thủ Đức', pkg: 'Gói Toàn Diện VIP', time: '18 phút trước' },
    { name: 'Chị Bích', district: 'Q. Bình Thạnh', pkg: 'Gói Vận Hành Chuẩn', time: '25 phút trước' },
    { name: 'Anh Khánh', district: 'Q. Tân Phú', pkg: 'Gói Vận Hành Chuẩn', time: '35 phút trước' },
    { name: 'Công ty CP Công Nghệ NextTech', district: 'Q. 1', pkg: 'Gói Toàn Diện VIP', time: '52 phút trước' }
  ];

  var clientIndex = 0;
  function triggerSocialProofToast() {
    if (!toastEl || !toastMsg) return;
    var client = sampleClients[clientIndex % sampleClients.length];
    clientIndex++;

    toastMsg.innerHTML = '<span class="font-bold text-slate-900">' + client.name + '</span> (' + client.district + ') vừa đăng ký thành công <span class="text-emerald-700 font-bold">' + client.pkg + '</span>';
    if (toastTime) toastTime.textContent = client.time;

    toastEl.classList.remove('hide-toast');
    toastEl.classList.add('show-toast');

    setTimeout(function () {
      toastEl.classList.remove('show-toast');
      toastEl.classList.add('hide-toast');
    }, 5500);
  }

  // Trigger first after 4s, then every 22s
  setTimeout(function () {
    triggerSocialProofToast();
    setInterval(triggerSocialProofToast, 22000);
  }, 4000);

  window.closeToast = function () {
    if (toastEl) {
      toastEl.classList.remove('show-toast');
      toastEl.classList.add('hide-toast');
    }
  };

  // --- 6. MOBILE MENU TOGGLE ---
  var mobileMenuBtn = document.getElementById('mobile-menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function () {
      var isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
      } else {
        mobileMenu.classList.add('hidden');
      }
    });

    // Close mobile menu on link click
    var mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // --- 7. LEAD INSPECTOR & SYSTEM CONFIG MODAL ---
  var currentAdminLeads = [];

  window.switchAdminTab = function (tabName) {
    var tabs = ['leads', 'sheet', 'packages'];
    tabs.forEach(function (t) {
      var contentEl = document.getElementById('admin-tab-' + t);
      var btnEl = document.getElementById('tab-btn-' + t);
      if (contentEl) {
        if (t === tabName) {
          contentEl.classList.remove('hidden');
          if (t === 'leads') contentEl.classList.add('flex');
        } else {
          contentEl.classList.add('hidden');
          if (t === 'leads') contentEl.classList.remove('flex');
        }
      }
      if (btnEl) {
        if (t === tabName) {
          btnEl.classList.add('border-emerald-700', 'text-emerald-800');
          btnEl.classList.remove('border-transparent', 'text-slate-500');
        } else {
          btnEl.classList.remove('border-emerald-700', 'text-emerald-800');
          btnEl.classList.add('border-transparent', 'text-slate-500');
        }
      }
    });

    if (tabName === 'leads') {
      window.refreshLeadsList();
    } else if (tabName === 'sheet') {
      loadSheetConfigUI();
    } else if (tabName === 'packages') {
      renderPackagesAdminUI();
    }
  };

  function loadSheetConfigUI() {
    var inputEl = document.getElementById('cfg-sheet-url');
    var indicatorEl = document.getElementById('sheet-status-indicator');
    fetch('/api/config')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.config) {
          if (inputEl) inputEl.value = res.config.googleSheetWebhookUrl || '';
          if (indicatorEl) {
            if (res.config.googleSheetWebhookUrl) {
              indicatorEl.className = 'w-2 h-2 rounded-full bg-emerald-500';
              indicatorEl.title = 'Đã kết nối Google Sheet';
            } else {
              indicatorEl.className = 'w-2 h-2 rounded-full bg-amber-400';
              indicatorEl.title = 'Chưa thiết lập Google Sheet';
            }
          }
        }
      })
      .catch(function () {
        var localUrl = localStorage.getItem('chuanluat_sheet_url') || '';
        if (inputEl) inputEl.value = localUrl;
      });
  }

  window.saveSheetConfig = function () {
    var inputEl = document.getElementById('cfg-sheet-url');
    if (!inputEl) return;
    var url = inputEl.value.trim();

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleSheetWebhookUrl: url })
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      localStorage.setItem('chuanluat_sheet_url', url);
      alert('Đã lưu cấu hình Google Sheet thành công!');
      loadSheetConfigUI();
    })
    .catch(function (err) {
      localStorage.setItem('chuanluat_sheet_url', url);
      alert('Đã lưu vào bộ nhớ trình duyệt!');
    });
  };

  window.testSheetWebhook = function () {
    var inputEl = document.getElementById('cfg-sheet-url');
    var feedbackEl = document.getElementById('test-sheet-feedback');
    var btn = document.getElementById('btn-test-sheet');
    var url = inputEl ? inputEl.value.trim() : '';

    if (!url) {
      alert('Vui lòng nhập Google Sheet Webhook URL trước khi bấm test!');
      return;
    }

    if (btn) btn.disabled = true;
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      feedbackEl.className = 'mt-2 text-xs p-2.5 rounded-xl bg-blue-50 text-blue-700';
      feedbackEl.innerHTML = '⏳ Đang gửi dữ liệu kiểm thử tới Google Sheet...';
    }

    fetch('/api/test-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: url })
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res.success) {
        if (feedbackEl) {
          feedbackEl.className = 'mt-2 text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200';
          feedbackEl.innerHTML = '✅ Kết nối thành công! Đã ghi 1 dòng dữ liệu mẫu vào trang tính Google Sheet của bạn.';
        }
      } else {
        if (feedbackEl) {
          feedbackEl.className = 'mt-2 text-xs p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200';
          feedbackEl.innerHTML = '❌ Lỗi: ' + (res.message || 'Không thể kết nối');
        }
      }
    })
    .catch(function (err) {
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Kiểm thử Trực Tiếp',
          phone: '0587949999',
          package: 'Kiểm thử Google Apps Script',
          notes: 'Dữ liệu gửi từ trình duyệt',
          submitted_at: new Date().toLocaleString('vi-VN')
        })
      }).then(function () {
        if (feedbackEl) {
          feedbackEl.className = 'mt-2 text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200';
          feedbackEl.innerHTML = '✅ Đã gửi tín hiệu kiểm thử tới Google Sheet thành công!';
        }
      }).catch(function (e) {
        if (feedbackEl) {
          feedbackEl.className = 'mt-2 text-xs p-2.5 rounded-xl bg-red-50 text-red-700';
          feedbackEl.innerHTML = '❌ Lỗi kết nối: ' + e.message;
        }
      });
    })
    .finally(function () {
      if (btn) btn.disabled = false;
    });
  };

  window.refreshLeadsList = function () {
    var leadsList = document.getElementById('inspector-leads-list');
    var badge = document.getElementById('inspector-lead-badge');
    if (!leadsList) return;

    leadsList.innerHTML = '<p class="text-slate-400 italic p-4 text-center">Đang tải danh sách lead...</p>';

    fetch('/api/leads')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var leads = res.leads || [];
        try {
          var localLeads = JSON.parse(localStorage.getItem('chuanluat_leads') || '[]');
          if (leads.length === 0 && localLeads.length > 0) {
            leads = localLeads;
          }
        } catch (e) {}

        currentAdminLeads = leads;
        if (badge) badge.textContent = leads.length;
        renderLeadsHtml(leads);
      })
      .catch(function () {
        var localLeads = [];
        try {
          localLeads = JSON.parse(localStorage.getItem('chuanluat_leads') || '[]');
        } catch (e) {}
        currentAdminLeads = localLeads;
        if (badge) badge.textContent = localLeads.length;
        renderLeadsHtml(localLeads);
      });
  };

  function renderLeadsHtml(leads) {
    var leadsList = document.getElementById('inspector-leads-list');
    if (!leadsList) return;

    if (leads.length === 0) {
      leadsList.innerHTML = '<div class="text-slate-400 italic p-6 text-center text-xs">Chưa có khách hàng nào đăng ký. Hãy thử điền form bất kỳ trên trang!</div>';
      return;
    }

    leadsList.innerHTML = leads.map(function (lead, idx) {
      var sourceTag = lead.utm_source ? `<span class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">${lead.utm_source}</span>` : '';
      var campaignTag = lead.utm_campaign ? `<span class="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">${lead.utm_campaign}</span>` : '';
      return `
        <div class="py-2.5 px-2 hover:bg-white rounded-xl transition text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">#${leads.length - idx}</span>
              <span class="font-extrabold text-slate-900 text-sm">${lead.name || 'Khách hàng'}</span>
              <a href="tel:${lead.phone}" class="text-emerald-700 font-black hover:underline">${lead.phone}</a>
              <span class="text-slate-600 font-medium">(${lead.package || 'Tư vấn chung'})</span>
            </div>
            ${lead.notes || lead.industry ? `<div class="text-slate-600 mt-0.5 text-[11px]">💬 Nhu cầu: <em>${lead.notes || lead.industry}</em></div>` : ''}
            <div class="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>⏰ ${lead.submitted_at || ''}</span>
              ${sourceTag}
              ${campaignTag}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.exportLeadsCsv = function () {
    if (!currentAdminLeads || currentAdminLeads.length === 0) {
      alert('Chưa có lead nào để xuất CSV!');
      return;
    }

    var headers = ['STT', 'Thoi gian', 'Ho va ten', 'So dien thoai', 'Goi dich vu', 'Ghi chu', 'Nguon UTM', 'Chien dich'];
    var rows = currentAdminLeads.map(function (lead, idx) {
      return [
        currentAdminLeads.length - idx,
        '"' + (lead.submitted_at || '').replace(/"/g, '""') + '"',
        '"' + (lead.name || '').replace(/"/g, '""') + '"',
        '="' + (lead.phone || '') + '"',
        '"' + (lead.package || '').replace(/"/g, '""') + '"',
        '"' + (lead.notes || lead.industry || '').replace(/"/g, '""') + '"',
        '"' + (lead.utm_source || 'direct').replace(/"/g, '""') + '"',
        '"' + (lead.utm_campaign || 'none').replace(/"/g, '""') + '"'
      ].join(',');
    });

    var csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Leads_Chuan_Luat_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function renderPackagesAdminUI() {
    var container = document.getElementById('inspector-packages-list');
    if (!container) return;

    fetch('/api/packages')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var pkgs = res.packages || [];
        container.innerHTML = pkgs.map(function (p) {
          return `
            <div class="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">${p.name}</span>
                  ${p.isPopular ? '<span class="bg-brand-100 text-brand-900 font-bold text-[10px] px-2 py-0.5 rounded-full">Bán chạy nhất</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">${p.tagline} • ${p.features.length} quyền lợi</div>
              </div>
              <div class="text-right">
                <span class="text-base font-black text-brand-800">${p.priceDisplay}</span>
                <span class="text-xs text-slate-500">${p.priceUnit || 'đ'}</span>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(function () {
        container.innerHTML = '<p class="text-slate-400 italic">Không thể đọc file data/packages.json</p>';
      });
  }

  window.reloadPackages = function () {
    renderPackagesAdminUI();
    initPackages();
    alert('Đã tải lại cấu hình các gói dịch vụ!');
  };

  window.openLeadInspector = function () {
    var inspector = document.getElementById('lead-inspector-modal');
    if (!inspector) return;
    inspector.classList.remove('hidden');
    inspector.classList.add('flex');
    window.switchAdminTab('leads');
    loadSheetConfigUI();
  };

  window.closeLeadInspector = function () {
    var inspector = document.getElementById('lead-inspector-modal');
    if (inspector) {
      inspector.classList.add('hidden');
      inspector.classList.remove('flex');
    }
  };

  // Keyboard shortcut: Ctrl + Shift + L to open lead inspector
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      window.openLeadInspector();
    }
  });

  // --- 8. CONFIGURABLE PACKAGES ENGINE ---
  function initPackages() {
    fetch('/data/packages.json')
      .then(function (r) { return r.json(); })
      .then(function (packages) {
        if (!Array.isArray(packages) || packages.length === 0) return;
        window.CHUANLUAT_PACKAGES = packages;

        // 1. Populate Hero Form Package Select
        var heroSelect = document.getElementById('hero-package-select');
        if (heroSelect) {
          var currentVal = heroSelect.value;
          var optsHtml = packages.map(function (pkg) {
            var star = pkg.isPopular ? '⭐ ' : '';
            var note = pkg.isPopular ? ' (Bán chạy nhất)' : '';
            var val = `${pkg.name} (${pkg.priceDisplay}đ)`;
            return `<option value="${val}">${star}${pkg.name}: ${pkg.priceDisplay}đ${note}</option>`;
          }).join('') + '<option value="Tư vấn phương án phù hợp">Cần tư vấn thêm mô hình phù hợp</option>';
          heroSelect.innerHTML = optsHtml;
          if (currentVal) heroSelect.value = currentVal;
        }
      })
      .catch(function (err) {
        console.warn('Dùng dữ liệu gói dịch vụ tĩnh có sẵn:', err);
      });
  }
  initPackages();

  // Track call and Zalo button clicks
  var callButtons = document.querySelectorAll('a[href^="tel:"]');
  callButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.trackEvent) {
        window.trackEvent('click_hotline', { href: btn.getAttribute('href') });
      }
    });
  });

  var zaloButtons = document.querySelectorAll('a[href*="zalo.me"]');
  zaloButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.trackEvent) {
        window.trackEvent('click_zalo', { href: btn.getAttribute('href') });
      }
    });
  });

  // --- 8. HERO SLIDER INTERACTION ---
  function initHeroSlider() {
    var slides = document.querySelectorAll('.hero-slide');
    var tabs = document.querySelectorAll('.slider-tab-btn');
    if (!slides.length || !tabs.length) return;

    var currentIdx = 0;
    var timer = null;

    function showSlide(idx) {
      slides.forEach(function (s, i) {
        if (i === idx) {
          s.classList.remove('inactive-slide');
          s.classList.add('active-slide');
        } else {
          s.classList.remove('active-slide');
          s.classList.add('inactive-slide');
        }
      });
      tabs.forEach(function (t, i) {
        if (i === idx) {
          t.classList.add('active-tab');
        } else {
          t.classList.remove('active-tab');
        }
      });
      currentIdx = idx;
    }

    tabs.forEach(function (tab, idx) {
      tab.addEventListener('click', function () {
        showSlide(idx);
        restartTimer();
      });
    });

    function nextSlide() {
      var next = (currentIdx + 1) % slides.length;
      showSlide(next);
    }

    function startTimer() {
      timer = setInterval(nextSlide, 5500);
    }

    function restartTimer() {
      if (timer) clearInterval(timer);
      startTimer();
    }

    var sliderContainer = document.getElementById('hero-slider-container');
    if (sliderContainer) {
      sliderContainer.addEventListener('mouseenter', function () {
        if (timer) clearInterval(timer);
      });
      sliderContainer.addEventListener('mouseleave', function () {
        restartTimer();
      });
    }

    startTimer();
  }
  initHeroSlider();

});
