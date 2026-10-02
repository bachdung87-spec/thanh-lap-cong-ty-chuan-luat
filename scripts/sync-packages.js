/**
 * Script đồng bộ cấu hình data/packages.json vào index.html (cho SEO tĩnh & Schema Markup)
 * Chạy lệnh: node scripts/sync-packages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_FILE = path.join(ROOT_DIR, 'data', 'packages.json');
const HTML_FILE = path.join(ROOT_DIR, 'index.html');

function generateCardHtml(pkg) {
  const isPop = pkg.isPopular;
  const containerClass = isPop
    ? 'bg-white rounded-3xl p-7 border-2 border-brand-700 shadow-xl shadow-brand-900/10 relative flex flex-col justify-between transform lg:-translate-y-2'
    : 'bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between';

  const badgeHtml = isPop && pkg.popularBadge
    ? `\n          <div class="badge-popular">${pkg.popularBadge}</div>`
    : '';

  const taglineColor = isPop ? 'text-brand-800' : 'text-slate-500';
  const priceColor = isPop ? 'text-brand-800' : 'text-slate-900';
  const priceNoteColor = isPop ? 'text-emerald-700 font-bold' : 'text-emerald-700 font-semibold';

  const featuresHtml = pkg.features.map(f => {
    let liClass = 'flex items-start gap-2.5';
    let iconColor = isPop ? 'text-brand-700' : 'text-emerald-600';

    if (f.box === 'brand') {
      liClass = 'flex items-start gap-2.5 bg-brand-50 p-2.5 rounded-xl text-brand-950 font-bold border border-brand-200/60';
      iconColor = 'text-brand-700';
    } else if (f.box === 'gold') {
      liClass = 'flex items-start gap-2.5 bg-amber-50/80 p-2.5 rounded-xl text-amber-950 font-bold border border-amber-200/60';
      iconColor = 'text-amber-600';
    } else if (f.highlight) {
      liClass += ' font-bold text-slate-900';
    } else {
      liClass += ' text-slate-700';
    }

    return `              <li class="${liClass}">
                <svg class="w-4 h-4 ${iconColor} shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span>${f.text}</span>
              </li>`;
  }).join('\n');

  const btnClass = isPop
    ? 'w-full h-12 bg-gradient-to-r from-orange-600 via-accent-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center'
    : 'w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center';

  return `        <!-- PACKAGE: ${pkg.name.toUpperCase()} -->
        <div class="${containerClass}">${badgeHtml}
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider ${taglineColor} mb-1">${pkg.tagline}</div>
            <h3 class="text-xl sm:text-2xl font-black text-slate-900 mb-2">${pkg.name}</h3>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">${pkg.description}</p>
            
            <div class="mb-6 pb-6 border-b border-slate-100">
              <div class="flex items-baseline gap-1">
                <span class="text-3xl sm:text-4xl font-black ${priceColor}">${pkg.priceDisplay}</span>
                <span class="text-sm font-bold text-slate-500">${pkg.priceUnit || 'đ'}</span>
              </div>
              <span class="text-[11px] ${priceNoteColor} block mt-1">${pkg.priceNote}</span>
            </div>

            <ul class="space-y-3 text-xs mb-8">
${featuresHtml}
            </ul>
          </div>

          <button onclick="openLeadModal('${pkg.name} (${pkg.priceDisplay}đ)')" class="${btnClass}">
            ${pkg.ctaText}
          </button>
        </div>`;
}

function syncPackages() {
  if (!fs.existsSync(PACKAGES_FILE)) {
    console.error('Không tìm thấy file data/packages.json');
    return;
  }
  if (!fs.existsSync(HTML_FILE)) {
    console.error('Không tìm thấy file index.html');
    return;
  }

  const packages = JSON.parse(fs.readFileSync(PACKAGES_FILE, 'utf8'));
  let html = fs.readFileSync(HTML_FILE, 'utf8');

  // 1. Generate Cards Grid
  const cardsHtml = packages.map(pkg => generateCardHtml(pkg)).join('\n\n');
  const cardsGridRegex = /<!-- START_PRICING_CARDS -->[\s\S]*?<!-- END_PRICING_CARDS -->/;

  if (cardsGridRegex.test(html)) {
    html = html.replace(cardsGridRegex, `<!-- START_PRICING_CARDS -->\n${cardsHtml}\n        <!-- END_PRICING_CARDS -->`);
    console.log('✅ Đã đồng bộ các thẻ bảng giá trong index.html');
  } else {
    console.log('⚠️ Chưa có thẻ đánh dấu <!-- START_PRICING_CARDS --> trong index.html');
  }

  // 2. Generate Hero Select Options
  const selectOptionsHtml = packages.map(pkg => {
    const star = pkg.isPopular ? '⭐ ' : '';
    const note = pkg.isPopular ? ' (Bán chạy nhất)' : '';
    return `                    <option value="${pkg.name} (${pkg.priceDisplay}đ)">${star}${pkg.name}: ${pkg.priceDisplay}đ${note}</option>`;
  }).join('\n') + `\n                    <option value="Tư vấn phương án phù hợp">Cần tư vấn thêm mô hình phù hợp</option>`;

  const selectRegex = /<!-- START_PACKAGE_OPTIONS -->[\s\S]*?<!-- END_PACKAGE_OPTIONS -->/;
  if (selectRegex.test(html)) {
    html = html.replace(selectRegex, `<!-- START_PACKAGE_OPTIONS -->\n${selectOptionsHtml}\n                    <!-- END_PACKAGE_OPTIONS -->`);
    console.log('✅ Đã đồng bộ dropdown gói dịch vụ trong Hero Form');
  }

  fs.writeFileSync(HTML_FILE, html, 'utf8');
  console.log('🎉 Hoàn tất đồng bộ cấu hình gói sản phẩm vào index.html!');
}

syncPackages();
