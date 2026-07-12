const pageTitles = {
  dashboard: 'لوحة التحكم', pos: '🛒 نقطة البيع', takeaway: '🥡 تيك أواي',
  delivery: '🛵 دليفري', products: 'الأصناف', inventory: 'المخازن',
  customers: 'العملاء', drivers: '🛵 السائقون', suppliers: 'الموردين',
  debts: 'المديونيات', collections: 'التحصيلات', expenses: '💸 المصروفات',
  invoices: 'الفواتير', returns: 'المرتجعات', 'sales-reports': '📊 تقارير المبيعات',
  'driver-reports': '🛵 تقارير السائقين', 'activity-log': '📝 سجل النشاطات',
  shifts: 'الشيفتات', attendance: 'الحضور', users: 'المستخدمون',
  'inventory-check': 'جرد المخزن', 'cash-check': 'جرد الخزينة',
  settings: 'الإعدادات', activate: 'تفعيل', keys: 'إدارة الأكواد',
  keyreports: 'تقارير الأكواد'
};

const pageRenderers = {
  dashboard: renderDashboard, pos: () => initCashier('pos'),
  takeaway: () => initCashier('ta'), delivery: () => initCashier('dl'),
  products: renderProducts, inventory: renderInventory, customers: renderCustomers,
  drivers: renderDrivers, suppliers: renderSuppliers, debts: renderDebts,
  collections: renderCollections, expenses: renderExpenses, invoices: renderInvoices,
  returns: renderReturns, 'sales-reports': renderSalesReport,
  'driver-reports': renderDriverReports, 'activity-log': renderActivityLog,
  shifts: renderShifts, attendance: renderAttendance, users: renderUsers,
  'inventory-check': renderInventoryCheck, 'cash-check': renderCashCheck,
  settings: loadSettings, activate: renderActivate, keys: renderKeys,
  keyreports: renderKeyReport
};

const pageTemplates = {
  dashboard: '<div id="dashboardContent"></div>',
  pos: `<div class="cashier-layout"><div class="cashier-left"><div class="customer-bar" id="pos-customer-bar"></div><div class="products-bar"><div class="products-bar-header"><input type="text" id="pos-search" placeholder="🔍 بحث..." oninput="renderCashierProducts('pos')"><select id="pos-category" onchange="renderCashierProducts('pos')"><option value="">كل الأصناف</option></select></div><div class="products-scroll"><div class="products-grid" id="pos-products"></div></div></div></div><div class="cashier-right" id="pos-cart"></div></div>`,
  takeaway: `<div class="cashier-layout"><div class="cashier-left"><div class="customer-bar" id="ta-customer-bar"></div><div class="products-bar"><div class="products-bar-header"><input type="text" id="ta-search" placeholder="🔍 بحث..." oninput="renderCashierProducts('ta')"><select id="ta-category" onchange="renderCashierProducts('ta')"><option value="">كل الأصناف</option></select></div><div class="products-scroll"><div class="products-grid" id="ta-products"></div></div></div></div><div class="cashier-right" id="ta-cart"></div></div>`,
  delivery: `<div class="cashier-layout"><div class="cashier-left"><div class="customer-bar" id="dl-customer-bar"></div><div class="products-bar"><div class="products-bar-header"><input type="text" id="dl-search" placeholder="🔍 بحث..." oninput="renderCashierProducts('dl')"><select id="dl-category" onchange="renderCashierProducts('dl')"><option value="">كل الأصناف</option></select></div><div class="products-scroll"><div class="products-grid" id="dl-products"></div></div></div></div><div class="cashier-right" id="dl-cart"></div></div>`,
  products: `<div class="card"><div class="card-title">📦 الأصناف<button class="btn btn-primary btn-sm" onclick="openProductModal()">➕ إضافة</button></div><input type="text" id="prodSearch" placeholder="🔍 بحث..." oninput="renderProducts()" style="width:100%;padding:10px;border:2px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-family:inherit;margin-bottom:12px"><div class="table-wrap"><table><thead><tr><th>الصورة</th><th>الاسم</th><th>الفئة</th><th>السعر</th><th>التكلفة</th><th>المخزون</th><th>إجراءات</th></tr></thead><tbody id="productsTable"></tbody></table></div></div>`,
  inventory: `<div class="card"><div class="card-title">🏪 المخازن<button class="btn btn-primary btn-sm" onclick="openInventoryModal()">➕ مخزن</button></div><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الموقع</th><th>إجراءات</th></tr></thead><tbody id="inventoryTable"></tbody></table></div></div>`,
  customers: `<div class="card"><div class="card-title">👥 العملاء<button class="btn btn-primary btn-sm" onclick="openCustomerModal()">➕ عميل</button></div><input type="text" id="custSearch" placeholder="🔍 بحث..." oninput="renderCustomers()" style="width:100%;padding:10px;border:2px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-family:inherit;margin-bottom:12px"><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>النقاط</th><th>الرصيد</th><th>إجراءات</th></tr></thead><tbody id="customersTable"></tbody></table></div></div>`,
  drivers: `<div class="card"><div class="card-title">🛵 إدارة السائقين<button class="btn btn-primary btn-sm" onclick="openDriverModal()">➕ سائق جديد</button></div><div class="alert alert-info">💡 السائق اختياري - يمكنك تعيين سائق لطلبات الدليفري أو تركه فارغاً</div><div id="driversList"></div></div>`,
  suppliers: `<div class="card"><div class="card-title">🚚 الموردين<button class="btn btn-primary btn-sm" onclick="openSupplierModal()">➕ مورد</button></div><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>المديونية</th><th>إجراءات</th></tr></thead><tbody id="suppliersTable"></tbody></table></div></div>`,
  debts: `<div class="card"><div class="card-title">💳 المديونيات<button class="btn btn-primary btn-sm" onclick="openDebtModal()">➕ مديونية</button></div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>إجراءات</th></tr></thead><tbody id="debtsTable"></tbody></table></div></div>`,
  collections: `<div class="card"><div class="card-title">💰 التحصيلات<button class="btn btn-primary btn-sm" onclick="openCollectionModal()">➕ تحصيل</button></div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>الدفع</th><th>ملاحظات</th><th>إجراءات</th></tr></thead><tbody id="collectionsTable"></tbody></table></div></div>`,
  expenses: `<div class="card"><div class="card-title">💸 المصروفات<button class="btn btn-primary btn-sm" onclick="openExpenseModal()">➕ مصروف</button></div><div class="stats-grid" id="expensesStats"></div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>الفئة</th><th>الوصف</th><th>المبلغ</th><th>إجراءات</th></tr></thead><tbody id="expensesTable"></tbody></table></div></div>`,
  invoices: `<div class="card"><div class="card-title">🧾 الفواتير</div><div class="table-wrap"><table><thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الدفع</th><th>النوع</th><th>إجراءات</th></tr></thead><tbody id="invoicesTable"></tbody></table></div></div>`,
  returns: `<div class="card"><div class="card-title">↩️ المرتجعات<button class="btn btn-primary btn-sm" onclick="openReturnModal()">➕ مرتجع</button></div><div class="stats-grid" id="returnsStats"></div><div class="table-wrap"><table><thead><tr><th>رقم</th><th>التاريخ</th><th>الفاتورة</th><th>الصنف</th><th>الكمية</th><th>المبلغ</th><th>السبب</th><th>إجراءات</th></tr></thead><tbody id="returnsTable"></tbody></table></div></div>`,
  'sales-reports': `<div class="card"><div class="card-title">📊 تقارير المبيعات<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="exportSalesReport('csv')">📤 CSV</button><button class="btn btn-success btn-sm" onclick="exportSalesReport('json')">📋 JSON</button></div></div><div class="filter-bar"><select id="reportPeriod" onchange="renderSalesReport()"><option value="today">اليوم</option><option value="week">هذا الأسبوع</option><option value="month" selected>هذا الشهر</option><option value="year">هذه السنة</option><option value="custom">مخصص</option></select><input type="date" id="reportFrom" style="display:none" onchange="renderSalesReport()"><input type="date" id="reportTo" style="display:none" onchange="renderSalesReport()"></div><div id="salesReportContent"></div></div>`,
  'driver-reports': `<div class="card"><div class="card-title">🛵 تقارير السائقين</div><div id="driverReportsContent"></div></div>`,
  'activity-log': `<div class="card"><div class="card-title">📝 سجل النشاطات<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="exportActivityLog()">📤 تصدير</button><button class="btn btn-danger btn-sm" onclick="clearActivityLog()">🗑️ مسح</button></div></div><div class="filter-bar"><input type="text" id="activitySearch" placeholder="🔍 بحث..." oninput="renderActivityLog()"><select id="activityFilter" onchange="renderActivityLog()"><option value="">كل الأنشطة</option><option value="login">دخول</option><option value="sale">مبيعات</option><option value="return">مرتجعات</option><option value="expense">مصروفات</option><option value="edit">تعديلات</option></select></div><div id="activityLogContent"></div></div>`,
  shifts: `<div class="card"><div class="card-title">⏰ الشيفتات<div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" id="shiftToggle" onclick="toggleShift()">▶️ بدء</button><button class="btn btn-warning btn-sm" id="shiftClose" onclick="closeShiftModal()" style="display:none">🔒 تقفيل</button></div></div><div id="currentShift"></div><div class="table-wrap"><table><thead><tr><th>البداية</th><th>النهاية</th><th>الكاشير</th><th>المبيعات</th><th>النقدية</th><th>الحالة</th></tr></thead><tbody id="shiftsTable"></tbody></table></div></div>`,
  attendance: `<div class="card"><div class="card-title">✅ الحضور والانصراف</div><div class="table-wrap"><table><thead><tr><th>الموظف</th><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الساعات</th></tr></thead><tbody id="attendanceTable"></tbody></table></div></div>`,
  users: `<div class="card"><div class="card-title">👤 المستخدمون<button class="btn btn-primary btn-sm" onclick="openUserModal()">➕ مستخدم</button></div><div class="alert alert-info">🔒 <strong>حماية المصمم:</strong> المصمم فقط يمكنه رؤية وتعديل بياناته.</div><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody id="usersTable"></tbody></table></div></div>`,
  'inventory-check': `<div class="card"><div class="card-title">📋 جرد المخزن<button class="btn btn-success btn-sm" onclick="saveInventoryCheck()">💾 حفظ</button></div><div class="alert alert-info">💡 أدخل الكميات الفعلية.</div><div id="inventoryCheckList"></div></div><div class="card"><div class="card-title">📜 سجل الجرد</div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>الأصناف</th><th>الفرق</th><th>ملاحظات</th></tr></thead><tbody id="inventoryCheckHistory"></tbody></table></div></div>`,
  'cash-check': `<div class="card"><div class="card-title">💵 جرد الخزينة<button class="btn btn-success btn-sm" onclick="saveCashCheck()">💾 حفظ</button></div><div class="stats-grid" id="cashCheckStats"></div><div class="form-group"><label>الرصيد المتوقع</label><input type="number" id="expectedCash" readonly style="background:var(--bg)"></div><div class="form-group"><label>الرصيد الفعلي</label><input type="number" id="actualCash" step="0.01" oninput="calculateCashDiff()"></div><div class="form-group"><label>الفرق</label><input type="text" id="cashDiff" readonly style="background:var(--bg);font-weight:700;font-size:18px"></div><div class="form-group"><label>ملاحظات</label><textarea id="cashCheckNotes" rows="3"></textarea></div></div><div class="card"><div class="card-title">📜 سجل جرد الخزينة</div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>المتوقع</th><th>الفعلي</th><th>الفرق</th><th>ملاحظات</th></tr></thead><tbody id="cashCheckHistory"></tbody></table></div></div>`,
  settings: `<div class="card"><div class="card-title">⚙️ الإعدادات</div><div class="form-group"><label>اسم المحل</label><input type="text" id="shopName"></div><div class="form-group"><label>العنوان</label><input type="text" id="shopAddress"></div><div class="form-group"><label>الهاتف</label><input type="text" id="shopPhone"></div><div class="form-group"><label>الرقم الضريبي</label><input type="text" id="shopTax"></div><div class="form-group"><label>رسالة أسفل الفاتورة</label><input type="text" id="shopFooter"></div><div class="form-group"><label>نقاط المكافأة لكل جنيه (اختياري)</label><input type="number" id="loyaltyRate" value="1" step="0.1"></div><button class="btn btn-success" onclick="saveSettings()">💾 حفظ</button></div><div class="card"><div class="card-title">💾 النسخ الاحتياطي</div><div class="alert alert-info">💡 النسخ الاحتياطي التلقائي يعمل كل 5 دقائق</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn btn-primary" onclick="backupData()">📥 تحميل</button><button class="btn btn-warning" onclick="document.getElementById('restoreFile').click()">📤 استعادة</button><input type="file" id="restoreFile" style="display:none" accept=".json" onchange="restoreData(event)"><button class="btn btn-info" onclick="exportAllData()">📦 تصدير شامل</button></div></div><div class="card"><div class="card-title">⚠️ منطقة الخطر</div><button class="btn btn-danger" onclick="resetData()">🗑️ مسح البيانات</button></div>`,
  activate: `<div class="card"><div class="card-title">🔑 تفعيل البرنامج</div><div id="licenseStatus"></div><div class="alert alert-info">💡 كل كود يعمل على جهاز واحد فقط.</div><div class="form-group"><label>كود التفعيل</label><input type="text" id="licenseKey" placeholder="TAWD-XXXX-XXXX-XXXX" style="font-family:'Courier New',monospace;letter-spacing:1px;text-transform:uppercase"></div><button class="btn btn-success btn-block" onclick="activateLicense()">🔓 تفعيل</button><div class="device-info-box" id="currentDeviceInfo"></div></div>`,
  keys: `<div class="card"><div class="card-title">🗝️ إدارة الأكواد<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-success btn-sm" onclick="generateNewKey('trial')">➕ تجريبي</button><button class="btn btn-primary btn-sm" onclick="generateNewKey('full')">➕ نهائي</button><button class="btn btn-outline btn-sm" onclick="generateBulkKeys()">📦 متعدد</button><button class="btn btn-warning btn-sm" onclick="exportKeys()">📤 تصدير</button><button class="btn btn-outline btn-sm" onclick="document.getElementById('importKeys').click()">📥 استيراد</button><input type="file" id="importKeys" style="display:none" accept=".json" onchange="importKeys(event)"></div></div><div class="stats-grid" id="keysStats"></div><div class="filter-bar"><input type="text" id="keyFilterSearch" placeholder="🔍 بحث..." oninput="renderKeys()"><select id="keyFilterStatus" onchange="renderKeys()"><option value="">كل الحالات</option><option value="available">متاح</option><option value="used">مستخدم</option></select><select id="keyFilterType" onchange="renderKeys()"><option value="">كل الأنواع</option><option value="trial">تجريبي</option><option value="full">نهائي</option></select></div><div class="keys-grid" id="keysList"></div></div>`,
  keyreports: `<div class="card"><div class="card-title">📈 تقارير الأكواد<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="exportKeyReport('csv')">📊 CSV</button><button class="btn btn-success btn-sm" onclick="exportKeyReport('json')">📋 JSON</button></div></div><div id="reportContent"></div></div>`
};

function createDynamicPage(page) {
  const contentArea = document.getElementById('contentArea');
  if (pageTemplates[page]) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    pageDiv.id = 'page-' + page;
    pageDiv.innerHTML = pageTemplates[page];
    contentArea.appendChild(pageDiv);
    pageDiv.classList.add('active');
  }
}

function navigateTo(page) {
  const licenseCheck = checkLicense();
  if (!licenseCheck.valid && page !== 'activate' && window.currentUser.role !== 'designer') {
    alert('⚠️ البرنامج غير مفعل');
    page = 'activate';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  let pageEl = document.getElementById('page-' + page);
  if (!pageEl) {
    createDynamicPage(page);
    pageEl = document.getElementById('page-' + page);
  }
  if (pageEl) pageEl.classList.add('active');
  const navLink = document.querySelector('[data-page="' + page + '"]');
  if (navLink) navLink.classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  if (pageRenderers[page]) pageRenderers[page]();
  if (window.innerWidth <= 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', function() {
      navigateTo(this.dataset.page);
    });
  });
});

document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'F1') { e.preventDefault(); navigateTo('pos'); }
  else if (e.key === 'F2') { e.preventDefault(); navigateTo('takeaway'); }
  else if (e.key === 'F3') { e.preventDefault(); navigateTo('delivery'); }
  else if (e.key === 'F4') {
    e.preventDefault();
    const searchInput = document.querySelector('.page.active input[type="text"]');
    if (searchInput) searchInput.focus();
  }
  else if (e.key === 'Escape') {
    closeModal();
    const displayMode = document.getElementById('displayMode');
    if (displayMode) displayMode.remove();
  }
  else if (e.key === 'F9') {
    e.preventDefault();
    if (document.getElementById('page-pos')?.classList.contains('active')) checkoutPOS('cash');
  }
  else if (e.key === 'F10') {
    e.preventDefault();
    if (document.getElementById('page-pos')?.classList.contains('active')) checkoutPOS('card');
  }
  else if (e.key === 'F11') {
    e.preventDefault();
    if (document.getElementById('page-pos')?.classList.contains('active')) checkoutPOS('credit');
  }
});

window.addEventListener('resize', function() {
  if (window.innerWidth > 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }
});

window.addEventListener('load', function() {
  const savedTheme = DB.get('theme', 'light');
  document.body.dataset.theme = savedTheme;
  document.getElementById('themeBtn').textContent = savedTheme === 'light' ? '🌙' : '☀️';
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser) {
    window.currentUser = JSON.parse(savedUser);
    showApp();
  }
  autoBackup();
  document.getElementById('loginPass').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') login();
  });
});