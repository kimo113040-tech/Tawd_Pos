function renderProducts() {
  const products = DB.get('products', []);
  const search = document.getElementById('prodSearch')?.value.toLowerCase() || '';
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search));
  const tbody = document.getElementById('productsTable');
  if (!tbody) return;
  tbody.innerHTML = filtered.length ? filtered.map(p => `
    <tr>
      <td>${p.image ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover">` : '📦'}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '-'}</td>
      <td>${p.price.toFixed(2)}</td>
      <td>${p.cost.toFixed(2)}</td>
      <td><span class="badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}">${p.stock}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openProductModal(${p.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty">لا توجد أصناف</td></tr>';
}

function openProductModal(id) {
  const products = DB.get('products', []);
  const product = id ? products.find(p => p.id === id) : { name: '', category: '', price: 0, cost: 0, stock: 0, image: '', barcode: '' };
  document.getElementById('modalTitle').textContent = id ? 'تعديل صنف' : 'إضافة صنف';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الاسم</label><input type="text" id="pName" value="${product.name}"></div>
    <div class="form-group"><label>الفئة</label>
      <input type="text" id="pCategory" value="${product.category || ''}" list="catList">
      <datalist id="catList">${[...new Set(products.map(p => p.category))].map(c => `<option value="${c}">`).join('')}</datalist>
    </div>
    <div class="form-group"><label>الباركود</label><input type="text" id="pBarcode" value="${product.barcode || ''}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="form-group"><label>السعر</label><input type="number" id="pPrice" value="${product.price}" step="0.01"></div>
      <div class="form-group"><label>التكلفة</label><input type="number" id="pCost" value="${product.cost}" step="0.01"></div>
    </div>
    <div class="form-group"><label>المخزون</label><input type="number" id="pStock" value="${product.stock}"></div>
    <div class="form-group"><label>الصورة</label>
      <input type="file" id="pImage" accept="image/*" onchange="previewImage(event, 'pImgPreview')">
      <div id="pImgPreview" style="margin-top:8px">
        ${product.image ? `<img src="${product.image}" style="max-width:100px;border-radius:8px">` : ''}
      </div>
    </div>
    <button class="btn btn-success btn-block" onclick="saveProduct(${id || 'null'})">💾 حفظ</button>
  `;
  openModal();
}

function previewImage(event, targetId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById(targetId).innerHTML = `<img src="${e.target.result}" style="max-width:100px;border-radius:8px">`;
  };
  reader.readAsDataURL(file);
}

function saveProduct(id) {
  const products = DB.get('products', []);
  const imagePreview = document.querySelector('#pImgPreview img');
  const data = {
    name: document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    barcode: document.getElementById('pBarcode').value.trim(),
    price: parseFloat(document.getElementById('pPrice').value) || 0,
    cost: parseFloat(document.getElementById('pCost').value) || 0,
    stock: parseInt(document.getElementById('pStock').value) || 0,
    image: imagePreview ? imagePreview.src : (id ? products.find(p => p.id === id).image : '')
  };
  if (!data.name) { alert('⚠️ الاسم مطلوب'); return; }
  if (id) {
    const idx = products.findIndex(p => p.id === id);
    products[idx] = { ...products[idx], ...data };
  } else { data.id = Date.now(); products.push(data); }
  DB.set('products', products);
  closeModal();
  renderProducts();
  showToast('✅ تم الحفظ', 'success');
}

function deleteProduct(id) {
  if (!confirm('حذف الصنف؟')) return;
  DB.set('products', DB.get('products', []).filter(p => p.id !== id));
  renderProducts();
  showToast('✅ تم الحذف', 'success');
}

function renderInventory() {
  const inventories = DB.get('inventories', []);
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;
  tbody.innerHTML = inventories.length ? inventories.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.location || '-'}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openInventoryModal(${i.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteInventory(${i.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="3" class="empty">لا توجد مخازن</td></tr>';
}

function openInventoryModal(id) {
  const inventories = DB.get('inventories', []);
  const inventory = id ? inventories.find(i => i.id === id) : { name: '', location: '' };
  document.getElementById('modalTitle').textContent = id ? 'تعديل مخزن' : 'مخزن جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الاسم</label><input type="text" id="iName" value="${inventory.name}"></div>
    <div class="form-group"><label>الموقع</label><input type="text" id="iLocation" value="${inventory.location || ''}"></div>
    <button class="btn btn-success btn-block" onclick="saveInventory(${id || 'null'})">💾 حفظ</button>
  `;
  openModal();
}

function saveInventory(id) {
  const inventories = DB.get('inventories', []);
  const data = {
    name: document.getElementById('iName').value.trim(),
    location: document.getElementById('iLocation').value.trim()
  };
  if (!data.name) { alert('⚠️ الاسم مطلوب'); return; }
  if (id) {
    const idx = inventories.findIndex(i => i.id === id);
    inventories[idx] = { ...inventories[idx], ...data };
  } else { data.id = Date.now(); inventories.push(data); }
  DB.set('inventories', inventories);
  closeModal();
  renderInventory();
  showToast('✅ تم الحفظ', 'success');
}

function deleteInventory(id) {
  if (!confirm('حذف المخزن؟')) return;
  DB.set('inventories', DB.get('inventories', []).filter(i => i.id !== id));
  renderInventory();
  showToast('✅ تم الحذف', 'success');
}

function renderInventoryCheck() {
  const products = DB.get('products', []);
  const listEl = document.getElementById('inventoryCheckList');
  if (!listEl) return;
  listEl.innerHTML = products.length ? products.map(p => `
    <div class="inventory-item">
      <div class="inventory-item-name">${p.name}<br><small style="color:var(--muted)">${p.category || ''}</small></div>
      <div style="text-align:center"><strong>${p.stock}</strong><br><small>متوقع</small></div>
      <div><input type="number" class="inventory-item-input" id="inv_${p.id}" value="${p.stock}" min="0" oninput="calcInventoryDiff(${p.id}, ${p.stock})"></div>
      <div class="inventory-item-diff zero" id="diff_${p.id}">0</div>
    </div>
  `).join('') : '<div class="empty">لا توجد أصناف</div>';
  const history = DB.get('inventoryChecks', []);
  const historyEl = document.getElementById('inventoryCheckHistory');
  if (historyEl) {
    historyEl.innerHTML = history.length ? history.slice().reverse().map(h => `
      <tr>
        <td>${new Date(h.date).toLocaleString('ar-EG')}</td>
        <td>${h.employee}</td>
        <td>${h.items.length}</td>
        <td><span class="badge ${h.totalDiff === 0 ? 'badge-success' : h.totalDiff > 0 ? 'badge-info' : 'badge-danger'}">${h.totalDiff > 0 ? '+' : ''}${h.totalDiff}</span></td>
        <td>${h.notes || '-'}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty">لا توجد سجلات</td></tr>';
  }
}

function calcInventoryDiff(id, expected) {
  const actual = parseInt(document.getElementById('inv_' + id).value) || 0;
  const diff = actual - expected;
  const el = document.getElementById('diff_' + id);
  el.textContent = diff > 0 ? '+' + diff : diff;
  el.className = 'inventory-item-diff ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'zero');
}

function saveInventoryCheck() {
  const products = DB.get('products', []);
  const items = [];
  let totalDiff = 0;
  products.forEach(p => {
    const actual = parseInt(document.getElementById('inv_' + p.id).value) || 0;
    const diff = actual - p.stock;
    totalDiff += diff;
    items.push({ productId: p.id, productName: p.name, expected: p.stock, actual, diff });
    if (diff !== 0) {
      const idx = products.findIndex(x => x.id === p.id);
      if (idx >= 0) products[idx].stock = actual;
    }
  });
  const notes = prompt('ملاحظات الجرد (اختياري):') || '';
  const check = {
    id: Date.now(), date: new Date().toISOString(),
    employee: window.currentUser.name, items, totalDiff, notes
  };
  const checks = DB.get('inventoryChecks', []);
  checks.push(check);
  DB.set('inventoryChecks', checks);
  DB.set('products', products);
  renderInventoryCheck();
  showToast('✅ تم حفظ الجرد. الفرق: ' + (totalDiff > 0 ? '+' : '') + totalDiff, 'success');
}

function renderCashCheck() {
  const invoices = DB.get('invoices', []);
  const today = new Date().toDateString();
  const todayCash = invoices.filter(i => new Date(i.date).toDateString() === today && i.payment === 'cash').reduce((sum, i) => sum + i.total, 0);
  const collections = DB.get('collections', []).filter(c => new Date(c.date).toDateString() === today && c.method === 'نقدي').reduce((sum, c) => sum + c.amount, 0);
  const expectedCash = todayCash + collections;
  const statsEl = document.getElementById('cashCheckStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card success"><div class="stat-label">نقدية اليوم</div><div class="stat-value">${todayCash.toFixed(2)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">التحصيلات النقدية</div><div class="stat-value">${collections.toFixed(2)} ج.م</div></div>
      <div class="stat-card warning"><div class="stat-label">المتوقع</div><div class="stat-value">${expectedCash.toFixed(2)} ج.م</div></div>
    `;
  }
  const expectedEl = document.getElementById('expectedCash');
  if (expectedEl) expectedEl.value = expectedCash.toFixed(2);
  calculateCashDiff();
  const history = DB.get('cashChecks', []);
  const historyEl = document.getElementById('cashCheckHistory');
  if (historyEl) {
    historyEl.innerHTML = history.length ? history.slice().reverse().map(h => `
      <tr>
        <td>${new Date(h.date).toLocaleString('ar-EG')}</td>
        <td>${h.employee}</td>
        <td>${h.expected.toFixed(2)}</td>
        <td>${h.actual.toFixed(2)}</td>
        <td><span class="badge ${h.diff === 0 ? 'badge-success' : h.diff > 0 ? 'badge-info' : 'badge-danger'}">${h.diff > 0 ? '+' : ''}${h.diff.toFixed(2)}</span></td>
        <td>${h.notes || '-'}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty">لا توجد سجلات</td></tr>';
  }
}

function calculateCashDiff() {
  const expected = parseFloat(document.getElementById('expectedCash').value) || 0;
  const actual = parseFloat(document.getElementById('actualCash').value) || 0;
  const diff = actual - expected;
  const el = document.getElementById('cashDiff');
  el.textContent = (diff > 0 ? '+' : '') + diff.toFixed(2) + ' ج.م';
  el.style.color = diff === 0 ? 'var(--success)' : diff > 0 ? 'var(--primary)' : 'var(--danger)';
}

function saveCashCheck() {
  const expected = parseFloat(document.getElementById('expectedCash').value) || 0;
  const actual = parseFloat(document.getElementById('actualCash').value) || 0;
  const diff = actual - expected;
  const notes = document.getElementById('cashCheckNotes').value.trim();
  const check = {
    id: Date.now(), date: new Date().toISOString(),
    employee: window.currentUser.name, expected, actual, diff, notes
  };
  const checks = DB.get('cashChecks', []);
  checks.push(check);
  DB.set('cashChecks', checks);
  document.getElementById('actualCash').value = '';
  document.getElementById('cashCheckNotes').value = '';
  renderCashCheck();
  showToast('✅ تم حفظ جرد الخزينة', 'success');
}