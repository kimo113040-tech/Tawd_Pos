function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 200);
  } catch (e) {}
}

function getDeviceId() {
  let saved = localStorage.getItem('tawd_device_id');
  if (saved) return saved;
  const nav = navigator, scr = screen;
  const parts = [nav.userAgent, nav.language, scr.width + 'x' + scr.height + 'x' + scr.colorDepth,
    new Date().getTimezoneOffset(), nav.hardwareConcurrency || 0, nav.deviceMemory || 0];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
  const uuid = 'DEV-' + Math.abs(hash).toString(16).padStart(8, '0').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  localStorage.setItem('tawd_device_id', uuid);
  return uuid;
}

function getDeviceInfo() {
  const deviceId = getDeviceId();
  const nav = navigator, scr = screen;
  return { deviceId, platform: nav.platform, screen: scr.width + '×' + scr.height };
}

function showDeviceInfo() {
  const info = getDeviceInfo();
  const el = document.getElementById('currentDeviceInfo');
  if (el) {
    el.innerHTML = `<strong>🖥️ معرف الجهاز:</strong><br><code>${info.deviceId}</code><br><br><strong>المتصفح:</strong> ${info.platform}<br><strong>الشاشة:</strong> ${info.screen}`;
  }
}

function logActivity(type, message, details = '') {
  const log = DB.get('activityLog', []);
  log.push({
    id: Date.now(), date: new Date().toISOString(),
    userId: window.currentUser?.id, userName: window.currentUser?.name || 'غير معروف',
    type, message, details
  });
  if (log.length > 1000) log.splice(0, log.length - 1000);
  DB.set('activityLog', log);
}

function autoBackup() {
  const last = DB.get('lastBackup');
  const now = Date.now();
  if (!last || (now - last) > 5 * 60 * 1000) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('tawd_')) data[key] = localStorage.getItem(key);
    }
    localStorage.setItem('tawd_auto_backup', JSON.stringify(data));
    DB.set('lastBackup', now);
  }
}

function openModal() { document.getElementById('modal').classList.add('active'); }
function closeModal() { document.getElementById('modal').classList.remove('active'); }

function toggleTheme() {
  const current = document.body.dataset.theme;
  const next = current === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = next;
  document.getElementById('themeBtn').textContent = next === 'light' ? '🌙' : '☀️';
  DB.set('theme', next);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (window.innerWidth <= 1024) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }
}

function openDisplayMode() {
  const invoices = DB.get('invoices', []);
  const lastInvoice = invoices[invoices.length - 1];
  const settings = DB.get('settings', {});
  const display = document.createElement('div');
  display.className = 'display-mode';
  display.id = 'displayMode';
  display.innerHTML = `
    <button class="display-mode-close" onclick="document.getElementById('displayMode').remove()">❌ إغلاق</button>
    <div class="display-mode-header">🛒 ${settings.shopName || 'TAWD Store'}</div>
    <div class="display-mode-content">
      <div style="font-size:24px;margin-bottom:20px">مرحباً بكم في محلنا</div>
      <div style="font-size:18px;margin-bottom:15px">📞 ${settings.shopPhone || ''}</div>
      ${lastInvoice ? `
        <div class="display-mode-invoice">
          <div style="font-size:20px;font-weight:bold;margin-bottom:10px">آخر فاتورة #${lastInvoice.number}</div>
          <div style="font-size:14px;margin-bottom:10px">العميل: ${lastInvoice.customer}</div>
          <div style="font-size:32px;font-weight:900;color:var(--primary);margin:15px 0">${lastInvoice.total.toFixed(2)} ج.م</div>
          <div style="font-size:14px">${new Date(lastInvoice.date).toLocaleString('ar-EG')}</div>
        </div>
      ` : '<div style="font-size:20px;margin-top:20px">لا توجد فواتير بعد</div>'}
      <div style="margin-top:30px;font-size:16px;opacity:.8">${settings.shopFooter || 'شكراً لزيارتكم'}</div>
    </div>
  `;
  document.body.appendChild(display);
}

function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('tawd_')) data[key] = localStorage.getItem(key);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tawd-full-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  showToast('✅ تم التصدير الشامل', 'success');
}

function backupData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('tawd_')) data[key] = localStorage.getItem(key);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tawd-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  showToast('✅ تم التحميل', 'success');
}

function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('استبدال جميع البيانات؟')) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
      alert('✅ تمت الاستعادة');
      location.reload();
    } catch { alert('❌ ملف غير صالح'); }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('مسح جميع البيانات؟')) return;
  if (!confirm('تأكيد نهائي - لا يمكن التراجع!')) return;
  DB.clear();
  location.reload();
}

function formatCurrency(amount) { return parseFloat(amount || 0).toFixed(2) + ' ج.م'; }
function formatDate(dateString) { return new Date(dateString).toLocaleString('ar-EG'); }
function formatDateShort(dateString) { return new Date(dateString).toLocaleDateString('ar-EG'); }

function generateRandomCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  return result;
}