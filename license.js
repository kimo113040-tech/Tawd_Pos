function checkLicense() {
  const license = DB.get('license');
  if (!license.active) return { valid: false };
  const now = new Date();
  const end = new Date(license.endDate);
  if (now > end) return { valid: false };
  const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return { valid: true, days, type: license.type, key: license.key };
}

function updateLicenseBadge() {
  const check = checkLicense();
  const badge = document.getElementById('licenseBadge');
  if (!badge) return;
  if (!check.valid) {
    badge.textContent = '⚠️ غير مفعل';
    badge.style.color = 'var(--danger)';
  } else {
    badge.textContent = '📅 ' + check.days + ' يوم';
    badge.style.color = 'var(--success)';
  }
}

function activateLicense() {
  const code = document.getElementById('licenseKey').value.trim().toUpperCase();
  if (!code) { alert('⚠️ أدخل كود التفعيل'); return; }
  if (!/^TAWD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    alert('❌ صيغة غير صحيحة'); return;
  }
  const keys = DB.get('licenseKeys', []);
  const key = keys.find(k => k.code === code);
  if (!key) { alert('❌ كود غير موجود'); return; }
  if (key.status === 'used') { alert('❌ كود مستخدم بالفعل'); return; }
  const deviceId = getDeviceId();
  const deviceInfo = getDeviceInfo();
  const start = new Date();
  const end = new Date(start.getTime() + key.duration * 24 * 60 * 60 * 1000);
  DB.set('license', {
    active: true, type: key.type, startDate: start.toISOString(), endDate: end.toISOString(),
    key: code, customerName: key.customerName || null, deviceId
  });
  key.status = 'used';
  key.usedAt = start.toISOString();
  key.expiresAt = end.toISOString();
  key.deviceId = deviceId;
  key.deviceInfo = { platform: deviceInfo.platform, screen: deviceInfo.screen };
  DB.set('licenseKeys', keys);
  logActivity('activate', 'تفعيل البرنامج', 'الكود: ' + code);
  showToast('✅ تم التفعيل! المدة: ' + key.duration + ' يوم', 'success', 5000);
  updateLicenseBadge();
  renderActivate();
}

function renderActivate() {
  const check = checkLicense();
  const license = DB.get('license');
  const statusEl = document.getElementById('licenseStatus');
  if (!statusEl) return;
  let message = '';
  if (!check.valid) {
    message = '<div class="alert alert-danger">❌ غير مفعل</div>';
  } else {
    message = `<div class="alert alert-success">✅ مفعل<br><strong>الكود:</strong> ${license.key}<br><strong>النوع:</strong> ${license.type === 'trial' ? 'تجريبي' : 'نهائي'}<br><strong>المتبقي:</strong> ${check.days} يوم</div>`;
  }
  statusEl.innerHTML = message;
  showDeviceInfo();
}

function generateNewKey(type) {
  const keys = DB.get('licenseKeys', []);
  let code;
  do {
    code = 'TAWD-' + generateRandomCode(4) + '-' + generateRandomCode(4) + '-' + generateRandomCode(4);
  } while (keys.some(k => k.code === code));
  const key = {
    id: Date.now() + Math.random(), code, type,
    duration: type === 'trial' ? 3 : 365,
    status: 'available', createdAt: new Date().toISOString(),
    usedAt: null, expiresAt: null, customerName: null,
    deviceId: null, deviceInfo: null, price: 0
  };
  keys.push(key);
  DB.set('licenseKeys', keys);
  document.getElementById('modalTitle').textContent = '✅ تم توليد كود';
  document.getElementById('modalBody').innerHTML = `
    <div class="alert alert-success">تم إنشاء الكود</div>
    <div class="license-key-display">${code}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div><strong>النوع:</strong> ${type === 'trial' ? 'تجريبي (3 أيام)' : 'نهائي (سنة)'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-primary" onclick="copyKey('${code}')">📋 نسخ</button>
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
    </div>
  `;
  openModal();
  renderKeys();
}

function generateBulkKeys() {
  document.getElementById('modalTitle').textContent = '📦 توليد متعدد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>النوع</label>
      <select id="bulkType"><option value="trial">تجريبي</option><option value="full">نهائي</option></select>
    </div>
    <div class="form-group"><label>العدد</label>
      <input type="number" id="bulkCount" value="10" min="1" max="100">
    </div>
    <button class="btn btn-success btn-block" onclick="doGenerateBulk()">📦 توليد</button>
  `;
  openModal();
}

function doGenerateBulk() {
  const type = document.getElementById('bulkType').value;
  const count = parseInt(document.getElementById('bulkCount').value) || 1;
  const keys = DB.get('licenseKeys', []);
  let generated = 0;
  for (let i = 0; i < count; i++) {
    let code;
    do {
      code = 'TAWD-' + generateRandomCode(4) + '-' + generateRandomCode(4) + '-' + generateRandomCode(4);
    } while (keys.some(k => k.code === code));
    keys.push({
      id: Date.now() + i + Math.random(), code, type,
      duration: type === 'trial' ? 3 : 365,
      status: 'available', createdAt: new Date().toISOString(),
      usedAt: null, expiresAt: null, customerName: null,
      deviceId: null, deviceInfo: null, price: 0
    });
    generated++;
  }
  DB.set('licenseKeys', keys);
  closeModal();
  showToast('✅ تم توليد ' + generated + ' كود', 'success');
  renderKeys();
}

function copyKey(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast('✅ تم النسخ: ' + code, 'success');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('✅ تم النسخ: ' + code, 'success');
  });
}

function renderKeys() {
  const keys = DB.get('licenseKeys', []);
  const search = document.getElementById('keyFilterSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('keyFilterStatus')?.value || '';
  const type = document.getElementById('keyFilterType')?.value || '';
  const filtered = keys.filter(k =>
    (!search || k.code.toLowerCase().includes(search) || (k.customerName || '').toLowerCase().includes(search)) &&
    (!status || k.status === status) && (!type || k.type === type)
  );
  const available = keys.filter(k => k.status === 'available').length;
  const used = keys.filter(k => k.status === 'used').length;
  const revenue = keys.filter(k => k.status === 'used').reduce((sum, k) => sum + (k.price || 0), 0);
  const statsEl = document.getElementById('keysStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card success"><div class="stat-label">متاحة</div><div class="stat-value">${available}</div></div>
      <div class="stat-card"><div class="stat-label">مستخدمة</div><div class="stat-value">${used}</div></div>
      <div class="stat-card warning"><div class="stat-label">تجريبية</div><div class="stat-value">${keys.filter(k => k.type === 'trial').length}</div></div>
      <div class="stat-card danger"><div class="stat-label">الإيرادات</div><div class="stat-value">${revenue.toFixed(0)} ج.م</div></div>
    `;
  }
  const listEl = document.getElementById('keysList');
  if (listEl) {
    listEl.innerHTML = filtered.length ? filtered.slice().reverse().map(k => `
      <div class="key-card ${k.status === 'used' ? 'used' : ''}">
        <div class="key-value">${k.code}</div>
        <div class="key-meta">
          <span class="badge ${k.type === 'trial' ? 'badge-warning' : 'badge-info'}">${k.type === 'trial' ? 'تجريبي' : 'نهائي'}</span>
          <span class="badge ${k.status === 'available' ? 'badge-success' : 'badge-danger'}">${k.status === 'available' ? 'متاح' : 'مستخدم'}</span>
          <br>📅 ${new Date(k.createdAt).toLocaleDateString('ar-EG')}
          ${k.customerName ? '<br>👤 ' + k.customerName : ''}
          ${k.deviceId ? '<br>🖥️ <code style="font-size:10px">' + k.deviceId + '</code>' : ''}
        </div>
        <div class="key-actions">
          <button class="btn btn-primary btn-sm" onclick="copyKey('${k.code}')">📋</button>
          ${k.status === 'available' ? `<button class="btn btn-warning btn-sm" onclick="assignKey('${k.code}')">👤</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteKey('${k.code}')">🗑️</button>
        </div>
      </div>
    `).join('') : '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🗝️</div>لا توجد أكواد</div>';
  }
}

function assignKey(code) {
  const name = prompt('اسم العميل:');
  if (name === null) return;
  const keys = DB.get('licenseKeys', []);
  const key = keys.find(x => x.code === code);
  if (key) {
    key.customerName = name.trim() || null;
    DB.set('licenseKeys', keys);
    renderKeys();
  }
}

function deleteKey(code) {
  if (!confirm('حذف الكود؟')) return;
  DB.set('licenseKeys', DB.get('licenseKeys', []).filter(k => k.code !== code));
  renderKeys();
}

function exportKeys() {
  const keys = DB.get('licenseKeys', []);
  if (!keys.length) { alert('لا توجد أكواد'); return; }
  const blob = new Blob([JSON.stringify(keys, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tawd-keys-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
}

function importKeys(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) { alert('❌ ملف غير صالح'); return; }
      const existing = DB.get('licenseKeys', []);
      const codes = new Set(existing.map(k => k.code));
      let added = 0;
      imported.forEach(k => {
        if (k.code && !codes.has(k.code)) {
          existing.push(k);
          codes.add(k.code);
          added++;
        }
      });
      DB.set('licenseKeys', existing);
      showToast('✅ تم استيراد ' + added + ' كود', 'success');
      renderKeys();
    } catch { alert('❌ ملف غير صالح'); }
  };
  reader.readAsText(file);
}

function renderKeyReport() {
  const keys = DB.get('licenseKeys', []);
  const total = keys.length;
  const used = keys.filter(k => k.status === 'used').length;
  const available = keys.filter(k => k.status === 'available').length;
  const revenue = keys.filter(k => k.status === 'used').reduce((sum, k) => sum + (k.price || 0), 0);
  const uniqueDevices = new Set(keys.filter(k => k.deviceId).map(k => k.deviceId)).size;
  const contentEl = document.getElementById('reportContent');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">الإجمالي</div><div class="stat-value">${total}</div></div>
      <div class="stat-card success"><div class="stat-label">متاحة</div><div class="stat-value">${available}</div></div>
      <div class="stat-card warning"><div class="stat-label">مستخدمة</div><div class="stat-value">${used}</div></div>
      <div class="stat-card danger"><div class="stat-label">الإيرادات</div><div class="stat-value">${revenue.toFixed(0)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">أجهزة</div><div class="stat-value">${uniqueDevices}</div></div>
    </div>
    <div class="card">
      <div class="card-title">📋 جميع الأكواد</div>
      <table>
        <thead><tr><th>الكود</th><th>النوع</th><th>الحالة</th><th>العميل</th><th>السعر</th><th>التاريخ</th></tr></thead>
        <tbody>
          ${keys.slice().reverse().map(k => `
            <tr>
              <td><code style="font-size:11px">${k.code}</code></td>
              <td>${k.type === 'trial' ? 'تجريبي' : 'نهائي'}</td>
              <td><span class="badge ${k.status === 'available' ? 'badge-success' : 'badge-danger'}">${k.status === 'available' ? 'متاح' : 'مستخدم'}</span></td>
              <td>${k.customerName || '-'}</td>
              <td>${(k.price || 0).toFixed(0)}</td>
              <td>${new Date(k.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportKeyReport(format) {
  const keys = DB.get('licenseKeys', []);
  if (format === 'csv') {
    let csv = '\ufeffالكود,النوع,الحالة,العميل,الجهاز,السعر\n';
    keys.forEach(k => {
      csv += `${k.code},${k.type === 'trial' ? 'تجريبي' : 'نهائي'},${k.status === 'available' ? 'متاح' : 'مستخدم'},"${k.customerName || ''}","${k.deviceId || ''}",${k.price || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tawd-key-report-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  } else {
    exportKeys();
  }
}