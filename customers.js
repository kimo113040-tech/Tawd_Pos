function renderCustomers() {
  const customers = DB.get('customers', []);
  const search = document.getElementById('custSearch')?.value.toLowerCase() || '';
  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search) || (c.phone || '').includes(search)
  );
  const tbody = document.getElementById('customersTable');
  if (!tbody) return;
  tbody.innerHTML = filtered.length ? filtered.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.address || '-'}</td>
      <td><span class="loyalty-badge">⭐ ${c.loyaltyPoints || 0}</span></td>
      <td><span class="badge ${c.balance > 0 ? 'badge-danger' : 'badge-success'}">${(c.balance || 0).toFixed(2)}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openCustomerModal(${c.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">لا يوجد عملاء</td></tr>';
}

function openCustomerModal(id) {
  const customers = DB.get('customers', []);
  const customer = id ? customers.find(c => c.id === id) : { name: '', phone: '', address: '', balance: 0, loyaltyPoints: 0 };
  document.getElementById('modalTitle').textContent = id ? 'تعديل عميل' : 'عميل جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الاسم</label><input type="text" id="cName" value="${customer.name}"></div>
    <div class="form-group"><label>الهاتف</label><input type="text" id="cPhone" value="${customer.phone || ''}"></div>
    <div class="form-group"><label>العنوان</label><input type="text" id="cAddress" value="${customer.address || ''}"></div>
    <div class="form-group"><label>الرصيد</label><input type="number" id="cBalance" value="${customer.balance || 0}" step="0.01"></div>
    <div class="form-group"><label>نقاط المكافأة</label><input type="number" id="cLoyalty" value="${customer.loyaltyPoints || 0}"></div>
    <button class="btn btn-success btn-block" onclick="saveCustomer(${id || 'null'})">💾 حفظ</button>
  `;
  openModal();
}

function saveCustomer(id) {
  const customers = DB.get('customers', []);
  const data = {
    name: document.getElementById('cName').value.trim(),
    phone: document.getElementById('cPhone').value.trim(),
    address: document.getElementById('cAddress').value.trim(),
    balance: parseFloat(document.getElementById('cBalance').value) || 0,
    loyaltyPoints: parseInt(document.getElementById('cLoyalty').value) || 0
  };
  if (!data.name) { alert('⚠️ الاسم مطلوب'); return; }
  if (id) {
    const idx = customers.findIndex(c => c.id === id);
    customers[idx] = { ...customers[idx], ...data };
  } else {
    data.id = Date.now();
    data.createdAt = new Date().toISOString();
    customers.push(data);
  }
  DB.set('customers', customers);
  closeModal();
  renderCustomers();
  showToast('✅ تم الحفظ', 'success');
}

function deleteCustomer(id) {
  if (!confirm('حذف العميل؟')) return;
  DB.set('customers', DB.get('customers', []).filter(c => c.id !== id));
  renderCustomers();
  showToast('✅ تم الحذف', 'success');
}

function openCashierCustomerSearch(type) {
  const customers = DB.get('customers', []);
  document.getElementById('modalTitle').textContent = '🔍 البحث عن عميل';
  document.getElementById('modalBody').innerHTML = `
    <div class="customer-search-box">
      <input type="text" id="cashierCustSearch" placeholder="ابحث بالاسم أو رقم الهاتف..." oninput="filterCashierCustomerList('${type}')" autofocus>
    </div>
    <div class="customer-list" id="cashierCustList">
      ${customers.length ? customers.map(c => {
        const loyalty = c.loyaltyPoints ? `<span class="loyalty-badge">⭐ ${c.loyaltyPoints}</span>` : '';
        return `
          <div class="customer-list-item" onclick="selectCashierCustomer('${type}', ${c.id})">
            <div class="customer-list-item-info">
              <div class="customer-list-item-name">👤 ${c.name} ${loyalty}</div>
              <div class="customer-list-item-phone">📞 ${c.phone || 'لا يوجد'}${c.address ? ' | 📍 ' + c.address : ''}</div>
            </div>
            <span class="badge ${c.balance > 0 ? 'badge-danger' : 'badge-success'}">${(c.balance || 0).toFixed(2)} ج.م</span>
          </div>
        `;
      }).join('') : '<div class="empty"><div class="empty-icon">👥</div>لا يوجد عملاء</div>'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-success btn-block" onclick="closeModal(); openCashierNewCustomer('${type}')">➕ عميل جديد</button>
      <button class="btn btn-outline btn-block" onclick="closeModal()">إغلاق</button>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('cashierCustSearch')?.focus(), 100);
}

function filterCashierCustomerList(type) {
  const search = document.getElementById('cashierCustSearch').value.toLowerCase();
  const customers = DB.get('customers', []);
  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search) || (c.phone || '').includes(search)
  );
  document.getElementById('cashierCustList').innerHTML = filtered.length ? filtered.map(c => {
    const loyalty = c.loyaltyPoints ? `<span class="loyalty-badge">⭐ ${c.loyaltyPoints}</span>` : '';
    return `
      <div class="customer-list-item" onclick="selectCashierCustomer('${type}', ${c.id})">
        <div class="customer-list-item-info">
          <div class="customer-list-item-name">👤 ${c.name} ${loyalty}</div>
          <div class="customer-list-item-phone">📞 ${c.phone || 'لا يوجد'}${c.address ? ' | 📍 ' + c.address : ''}</div>
        </div>
        <span class="badge ${c.balance > 0 ? 'badge-danger' : 'badge-success'}">${(c.balance || 0).toFixed(2)} ج.م</span>
      </div>
    `;
  }).join('') : '<div class="empty"><div class="empty-icon">🔍</div>لا توجد نتائج</div>';
}

function selectCashierCustomer(type, id) {
  const customers = DB.get('customers', []);
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  window.cashiers[type].selectedCustomer = customer;
  if (type === 'ta' || type === 'dl') {
    window.cashiers[type].customerName = customer.name;
    window.cashiers[type].customerPhone = customer.phone || '';
    if (type === 'dl') window.cashiers[type].customerAddress = customer.address || '';
  }
  closeModal();
  renderCashierCustomerBar(type);
}

function clearCashierCustomer(type) {
  window.cashiers[type].selectedCustomer = null;
  if (type === 'ta' || type === 'dl') {
    window.cashiers[type].customerName = '';
    window.cashiers[type].customerPhone = '';
    if (type === 'dl') window.cashiers[type].customerAddress = '';
  }
  renderCashierCustomerBar(type);
}

function openCashierNewCustomer(type) {
  document.getElementById('modalTitle').textContent = '➕ إضافة عميل جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="alert alert-info">💡 جميع البيانات اختيارية</div>
    <div class="form-group"><label>الاسم <span style="color:var(--danger)">*</span></label><input type="text" id="ncName" placeholder="اسم العميل"></div>
    <div class="form-group"><label>رقم الهاتف</label><input type="tel" id="ncPhone" placeholder="01xxxxxxxxx"></div>
    <div class="form-group"><label>العنوان</label><input type="text" id="ncAddress"></div>
    <div class="form-group"><label>الرصيد الافتتاحي</label><input type="number" id="ncBalance" value="0" step="0.01"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-success btn-block" onclick="saveCashierNewCustomer('${type}')">💾 حفظ واختيار</button>
      <button class="btn btn-outline btn-block" onclick="closeModal()">إلغاء</button>
    </div>
  `;
  openModal();
}

function saveCashierNewCustomer(type) {
  const name = document.getElementById('ncName').value.trim();
  if (!name) { alert('⚠️ الاسم مطلوب'); return; }
  const customers = DB.get('customers', []);
  const phone = document.getElementById('ncPhone').value.trim();
  if (phone && customers.some(c => c.phone === phone)) { alert('⚠️ رقم الهاتف موجود بالفعل'); return; }
  const newCustomer = {
    id: Date.now(), name, phone,
    address: document.getElementById('ncAddress').value.trim(),
    balance: parseFloat(document.getElementById('ncBalance').value) || 0,
    loyaltyPoints: 0, createdAt: new Date().toISOString()
  };
  customers.push(newCustomer);
  DB.set('customers', customers);
  window.cashiers[type].selectedCustomer = newCustomer;
  if (type === 'ta' || type === 'dl') {
    window.cashiers[type].customerName = newCustomer.name;
    window.cashiers[type].customerPhone = newCustomer.phone || '';
    if (type === 'dl') window.cashiers[type].customerAddress = newCustomer.address || '';
  }
  closeModal();
  renderCashierCustomerBar(type);
  showToast('✅ تم حفظ العميل', 'success');
  logActivity('customer', 'إضافة عميل جديد', newCustomer.name);
}

function addLoyaltyPoints(customerId, amount) {
  const settings = DB.get('settings', {});
  const rate = settings.loyaltyRate || 1;
  const points = Math.floor(amount * rate);
  if (points > 0 && customerId) {
    const customers = DB.get('customers', []);
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx >= 0) {
      customers[idx].loyaltyPoints = (customers[idx].loyaltyPoints || 0) + points;
      DB.set('customers', customers);
      return points;
    }
  }
  return 0;
}

function renderSuppliers() {
  const suppliers = DB.get('suppliers', []);
  const tbody = document.getElementById('suppliersTable');
  if (!tbody) return;
  tbody.innerHTML = suppliers.length ? suppliers.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.phone || '-'}</td>
      <td>${s.address || '-'}</td>
      <td><span class="badge badge-danger">${(s.debt || 0).toFixed(2)}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openSupplierModal(${s.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty">لا يوجد موردين</td></tr>';
}

function openSupplierModal(id) {
  const suppliers = DB.get('suppliers', []);
  const supplier = id ? suppliers.find(s => s.id === id) : { name: '', phone: '', address: '', debt: 0 };
  document.getElementById('modalTitle').textContent = id ? 'تعديل مورد' : 'مورد جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الاسم</label><input type="text" id="sName" value="${supplier.name}"></div>
    <div class="form-group"><label>الهاتف</label><input type="text" id="sPhone" value="${supplier.phone || ''}"></div>
    <div class="form-group"><label>العنوان</label><input type="text" id="sAddress" value="${supplier.address || ''}"></div>
    <div class="form-group"><label>المديونية</label><input type="number" id="sDebt" value="${supplier.debt || 0}" step="0.01"></div>
    <button class="btn btn-success btn-block" onclick="saveSupplier(${id || 'null'})">💾 حفظ</button>
  `;
  openModal();
}

function saveSupplier(id) {
  const suppliers = DB.get('suppliers', []);
  const data = {
    name: document.getElementById('sName').value.trim(),
    phone: document.getElementById('sPhone').value.trim(),
    address: document.getElementById('sAddress').value.trim(),
    debt: parseFloat(document.getElementById('sDebt').value) || 0
  };
  if (!data.name) { alert('⚠️ الاسم مطلوب'); return; }
  if (id) {
    const idx = suppliers.findIndex(s => s.id === id);
    suppliers[idx] = { ...suppliers[idx], ...data };
  } else { data.id = Date.now(); suppliers.push(data); }
  DB.set('suppliers', suppliers);
  closeModal();
  renderSuppliers();
  showToast('✅ تم الحفظ', 'success');
}

function deleteSupplier(id) {
  if (!confirm('حذف المورد؟')) return;
  DB.set('suppliers', DB.get('suppliers', []).filter(s => s.id !== id));
  renderSuppliers();
  showToast('✅ تم الحذف', 'success');
}

function renderDebts() {
  const debts = DB.get('debts', []);
  const tbody = document.getElementById('debtsTable');
  if (!tbody) return;
  tbody.innerHTML = debts.length ? debts.map(d => `
    <tr>
      <td>${new Date(d.date).toLocaleDateString('ar-EG')}</td>
      <td><span class="badge ${d.type === 'customer' ? 'badge-warning' : 'badge-danger'}">${d.type === 'customer' ? 'عميل' : 'مورد'}</span></td>
      <td>${d.name}</td>
      <td>${d.amount.toFixed(2)}</td>
      <td>${(d.paid || 0).toFixed(2)}</td>
      <td><strong>${(d.amount - (d.paid || 0)).toFixed(2)}</strong></td>
      <td>
        <button class="btn btn-success btn-sm" onclick="payDebt(${d.id})">💰</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDebt(${d.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty">لا توجد مديونيات</td></tr>';
}

function openDebtModal() {
  document.getElementById('modalTitle').textContent = 'مديونية جديدة';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>النوع</label>
      <select id="dType"><option value="customer">عميل</option><option value="supplier">مورد</option></select>
    </div>
    <div class="form-group"><label>الاسم</label><input type="text" id="dName"></div>
    <div class="form-group"><label>المبلغ</label><input type="number" id="dAmount" step="0.01"></div>
    <button class="btn btn-success btn-block" onclick="saveDebt()">💾 حفظ</button>
  `;
  openModal();
}

function saveDebt() {
  const debts = DB.get('debts', []);
  debts.push({
    id: Date.now(), date: new Date().toISOString(),
    type: document.getElementById('dType').value,
    name: document.getElementById('dName').value.trim(),
    amount: parseFloat(document.getElementById('dAmount').value) || 0, paid: 0
  });
  DB.set('debts', debts);
  closeModal();
  renderDebts();
  showToast('✅ تم الحفظ', 'success');
}

function payDebt(id) {
  const debts = DB.get('debts', []);
  const debt = debts.find(d => d.id === id);
  if (!debt) return;
  const remaining = debt.amount - (debt.paid || 0);
  const amount = parseFloat(prompt('المبلغ المدفوع (المتبقي: ' + remaining.toFixed(2) + ')', remaining));
  if (isNaN(amount) || amount <= 0) return;
  debt.paid = (debt.paid || 0) + amount;
  DB.set('debts', debts);
  renderDebts();
  showToast('✅ تم الدفع', 'success');
}

function deleteDebt(id) {
  if (!confirm('حذف المديونية؟')) return;
  DB.set('debts', DB.get('debts', []).filter(d => d.id !== id));
  renderDebts();
  showToast('✅ تم الحذف', 'success');
}

function renderCollections() {
  const collections = DB.get('collections', []);
  const tbody = document.getElementById('collectionsTable');
  if (!tbody) return;
  tbody.innerHTML = collections.length ? collections.map(c => `
    <tr>
      <td>${new Date(c.date).toLocaleDateString('ar-EG')}</td>
      <td>${c.customer}</td>
      <td><strong>${c.amount.toFixed(2)}</strong></td>
      <td>${c.method}</td>
      <td>${c.notes || '-'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteCollection(${c.id})">🗑️</button></td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">لا توجد تحصيلات</td></tr>';
}

function openCollectionModal() {
  const customers = DB.get('customers', []);
  document.getElementById('modalTitle').textContent = 'تحصيل جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>العميل</label>
      <input type="text" id="colCustomer" list="custL2">
      <datalist id="custL2">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
    </div>
    <div class="form-group"><label>المبلغ</label><input type="number" id="colAmount" step="0.01"></div>
    <div class="form-group"><label>طريقة الدفع</label>
      <select id="colMethod"><option>نقدي</option><option>فيزا</option><option>تحويل</option></select>
    </div>
    <div class="form-group"><label>ملاحظات</label><input type="text" id="colNotes"></div>
    <button class="btn btn-success btn-block" onclick="saveCollection()">💾 حفظ</button>
  `;
  openModal();
}

function saveCollection() {
  const collections = DB.get('collections', []);
  const customerName = document.getElementById('colCustomer').value.trim();
  const amount = parseFloat(document.getElementById('colAmount').value) || 0;
  if (!customerName || !amount) { alert('⚠️ البيانات ناقصة'); return; }
  collections.push({
    id: Date.now(), date: new Date().toISOString(), customer: customerName, amount,
    method: document.getElementById('colMethod').value,
    notes: document.getElementById('colNotes').value.trim()
  });
  const customers = DB.get('customers', []);
  const customer = customers.find(c => c.name === customerName);
  if (customer) {
    customer.balance = Math.max(0, (customer.balance || 0) - amount);
    DB.set('customers', customers);
  }
  DB.set('collections', collections);
  closeModal();
  renderCollections();
  showToast('✅ تم الحفظ', 'success');
}

function deleteCollection(id) {
  if (!confirm('حذف التحصيل؟')) return;
  DB.set('collections', DB.get('collections', []).filter(c => c.id !== id));
  renderCollections();
  showToast('✅ تم الحذف', 'success');
}