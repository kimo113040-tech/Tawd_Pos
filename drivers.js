function renderDrivers() {
  const drivers = DB.get('drivers', []);
  const orders = DB.get('deliveryOrders', []);
  const listEl = document.getElementById('driversList');
  if (!listEl) return;
  if (!drivers.length) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">🛵</div>لا يوجد سائقون مسجلون<br><button class="btn btn-primary btn-sm" onclick="openDriverModal()" style="margin-top:10px">➕ إضافة سائق</button></div>';
    return;
  }
  listEl.innerHTML = drivers.map(d => {
    const driverOrders = orders.filter(o => o.driverId == d.id);
    const delivered = driverOrders.filter(o => o.status === 'delivered').length;
    const totalRevenue = driverOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);
    const avgOrder = delivered > 0 ? (totalRevenue / delivered) : 0;
    return `
      <div class="driver-card">
        <div class="driver-info">
          <div class="driver-name">🛵 ${d.name}</div>
          <div class="driver-phone">📞 ${d.phone || '-'}</div>
        </div>
        <div class="driver-stats">
          <div class="driver-stat"><div class="driver-stat-value">${driverOrders.length}</div><div class="driver-stat-label">إجمالي الطلبات</div></div>
          <div class="driver-stat"><div class="driver-stat-value">${delivered}</div><div class="driver-stat-label">تم التسليم</div></div>
          <div class="driver-stat"><div class="driver-stat-value">${totalRevenue.toFixed(0)}</div><div class="driver-stat-label">الإيرادات</div></div>
          <div class="driver-stat"><div class="driver-stat-value">${avgOrder.toFixed(0)}</div><div class="driver-stat-label">متوسط الطلب</div></div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-primary btn-sm" onclick="openDriverModal(${d.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDriver(${d.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function openDriverModal(id) {
  const drivers = DB.get('drivers', []);
  const driver = id ? drivers.find(d => d.id === id) : { name: '', phone: '', notes: '' };
  document.getElementById('modalTitle').textContent = id ? 'تعديل سائق' : 'سائق جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="alert alert-info">💡 السائق اختياري - يمكنك إضافة سائقين لطلبات الدليفري أو تركها بدون سائق</div>
    <div class="form-group"><label>اسم السائق <span style="color:var(--danger)">*</span></label><input type="text" id="drName" value="${driver.name}" placeholder="اسم السائق"></div>
    <div class="form-group"><label>رقم الهاتف</label><input type="tel" id="drPhone" value="${driver.phone || ''}" placeholder="01xxxxxxxxx"></div>
    <div class="form-group"><label>ملاحظات (اختياري)</label><input type="text" id="drNotes" value="${driver.notes || ''}" placeholder="أي ملاحظات"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-success btn-block" onclick="saveDriver(${id || 'null'})">💾 حفظ</button>
      <button class="btn btn-outline btn-block" onclick="closeModal()">إلغاء</button>
    </div>
  `;
  openModal();
}

function saveDriver(id) {
  const name = document.getElementById('drName').value.trim();
  if (!name) { alert('⚠️ اسم السائق مطلوب'); return; }
  const drivers = DB.get('drivers', []);
  const data = {
    name, phone: document.getElementById('drPhone').value.trim(),
    notes: document.getElementById('drNotes').value.trim()
  };
  if (id) {
    const idx = drivers.findIndex(d => d.id === id);
    drivers[idx] = { ...drivers[idx], ...data };
  } else { data.id = Date.now(); drivers.push(data); }
  DB.set('drivers', drivers);
  closeModal();
  renderDrivers();
  showToast('✅ تم حفظ السائق', 'success');
  logActivity('edit', 'تعديل سائق', name);
}

function deleteDriver(id) {
  if (!confirm('حذف السائق؟')) return;
  DB.set('drivers', DB.get('drivers', []).filter(d => d.id !== id));
  renderDrivers();
  showToast('✅ تم الحذف', 'success');
}

function renderDriverReports() {
  const drivers = DB.get('drivers', []);
  const orders = DB.get('deliveryOrders', []);
  const contentEl = document.getElementById('driverReportsContent');
  if (!contentEl) return;
  if (!drivers.length) {
    contentEl.innerHTML = '<div class="empty"><div class="empty-icon">🛵</div>لا يوجد سائقون</div>';
    return;
  }
  const report = drivers.map(d => {
    const driverOrders = orders.filter(o => o.driverId == d.id);
    const delivered = driverOrders.filter(o => o.status === 'delivered').length;
    const onway = driverOrders.filter(o => o.status === 'onway').length;
    const cancelled = driverOrders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = driverOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);
    const avgOrder = delivered > 0 ? (totalRevenue / delivered) : 0;
    const successRate = driverOrders.length > 0 ? ((delivered / driverOrders.length) * 100) : 0;
    return { ...d, totalOrders: driverOrders.length, delivered, onway, cancelled, totalRevenue, avgOrder, successRate };
  });
  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي السائقين</div><div class="stat-value">${drivers.length}</div></div>
      <div class="stat-card success"><div class="stat-label">إجمالي التوصيلات</div><div class="stat-value">${report.reduce((sum, r) => sum + r.delivered, 0)}</div></div>
      <div class="stat-card info"><div class="stat-label">إجمالي الإيرادات</div><div class="stat-value">${report.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(0)} ج.م</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>السائق</th><th>الهاتف</th><th>الطلبات</th><th>تم التسليم</th><th>في الطريق</th><th>ملغي</th><th>الإيرادات</th><th>متوسط الطلب</th><th>نسبة النجاح</th></tr></thead>
        <tbody>
          ${report.map(r => `
            <tr>
              <td><strong>${r.name}</strong></td>
              <td>${r.phone || '-'}</td>
              <td>${r.totalOrders}</td>
              <td><span class="badge badge-success">${r.delivered}</span></td>
              <td><span class="badge badge-warning">${r.onway}</span></td>
              <td><span class="badge badge-danger">${r.cancelled}</span></td>
              <td><strong>${r.totalRevenue.toFixed(2)} ج.م</strong></td>
              <td>${r.avgOrder.toFixed(2)} ج.م</td>
              <td><span class="badge ${r.successRate >= 80 ? 'badge-success' : r.successRate >= 50 ? 'badge-warning' : 'badge-danger'}">${r.successRate.toFixed(1)}%</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}