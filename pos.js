window.cashiers = {
  pos: { cart: [], selectedCustomer: null, discount: 0, tax: 0 },
  ta: { cart: [], selectedCustomer: null, customerName: '', customerPhone: '', notes: '' },
  dl: { cart: [], selectedCustomer: null, customerName: '', customerPhone: '', customerAddress: '', driverId: '', deliveryFee: 0, notes: '', payment: 'cash' }
};
window.currentShift = null;

function initCashier(type) {
  renderCashierProducts(type);
  renderCashierCart(type);
  renderCashierCustomerBar(type);
}

function renderCashierProducts(type) {
  const products = DB.get('products', []);
  const search = document.getElementById(type + '-search')?.value.toLowerCase() || '';
  const category = document.getElementById(type + '-category')?.value || '';
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const categorySelect = document.getElementById(type + '-category');
  if (categorySelect) {
    const current = categorySelect.value;
    categorySelect.innerHTML = '<option value="">كل الأصناف</option>' + categories.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
  }
  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search) || (p.barcode || '').includes(search)) &&
    (!category || p.category === category)
  );
  const gridEl = document.getElementById(type + '-products');
  if (!gridEl) return;
  gridEl.innerHTML = filtered.length ? filtered.map(p => `
    <div class="product-card" onclick="addToCashierCart('${type}', ${p.id})">
      <div class="product-img">${p.image ? `<img src="${p.image}">` : '📦'}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${p.price.toFixed(2)} ج.م</div>
      <div class="product-stock">المخزون: ${p.stock}</div>
    </div>
  `).join('') : '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div>لا توجد أصناف</div>';
}

function addToCashierCart(type, productId) {
  const products = DB.get('products', []);
  const product = products.find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) { showToast('⚠️ الصنف غير متوفر', 'warning'); return; }
  const cashier = window.cashiers[type];
  const existing = cashier.cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('⚠️ لا يوجد مخزون كافٍ', 'warning'); return; }
    existing.qty++;
  } else {
    cashier.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, image: product.image });
  }
  renderCashierCart(type);
}

function changeCashierQty(type, index, delta) {
  const cashier = window.cashiers[type];
  const products = DB.get('products', []);
  const product = products.find(p => p.id === cashier.cart[index].id);
  cashier.cart[index].qty = Math.max(1, cashier.cart[index].qty + delta);
  if (product && cashier.cart[index].qty > product.stock) {
    cashier.cart[index].qty = product.stock;
    showToast('⚠️ الحد الأقصى', 'warning');
  }
  renderCashierCart(type);
}

function setCashierQty(type, index, value) {
  window.cashiers[type].cart[index].qty = Math.max(1, parseInt(value) || 1);
  renderCashierCart(type);
}

function removeCashierItem(type, index) {
  window.cashiers[type].cart.splice(index, 1);
  renderCashierCart(type);
}

function clearCashierCart(type) {
  if (!confirm('إفراغ السلة؟')) return;
  window.cashiers[type].cart = [];
  if (type === 'pos') {
    window.cashiers[type].selectedCustomer = null;
    window.cashiers[type].discount = 0;
    window.cashiers[type].tax = 0;
  }
  if (type === 'ta') {
    window.cashiers[type].selectedCustomer = null;
    window.cashiers[type].customerName = '';
    window.cashiers[type].customerPhone = '';
    window.cashiers[type].notes = '';
  }
  if (type === 'dl') {
    window.cashiers[type].selectedCustomer = null;
    window.cashiers[type].customerName = '';
    window.cashiers[type].customerPhone = '';
    window.cashiers[type].customerAddress = '';
    window.cashiers[type].driverId = '';
    window.cashiers[type].deliveryFee = 0;
    window.cashiers[type].notes = '';
    window.cashiers[type].payment = 'cash';
  }
  renderCashierCart(type);
  renderCashierCustomerBar(type);
}

function renderCashierCart(type) {
  const cashier = window.cashiers[type];
  const subtotal = cashier.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  let discount = 0, tax = 0, deliveryFee = 0, total = 0;
  let extraHtml = '', summaryExtra = '';
  if (type === 'pos') {
    discount = cashier.discount || 0;
    tax = subtotal * ((cashier.tax || 0) / 100);
    total = subtotal - discount + tax;
    extraHtml = `
      <div class="cart-extras">
        <input type="number" placeholder="💸 خصم ج.م" value="${discount}" oninput="window.cashiers.pos.discount = parseFloat(this.value) || 0; renderCashierCart('pos')">
        <input type="number" placeholder="📊 ضريبة %" value="${cashier.tax || 0}" oninput="window.cashiers.pos.tax = parseFloat(this.value) || 0; renderCashierCart('pos')">
      </div>
    `;
    summaryExtra = `
      <div class="cart-row"><span>الخصم:</span><span>${discount.toFixed(2)} ج.م</span></div>
      <div class="cart-row"><span>الضريبة:</span><span>${tax.toFixed(2)} ج.م</span></div>
    `;
  } else if (type === 'ta') {
    total = subtotal;
    extraHtml = `
      <div style="margin-bottom:6px">
        <input type="text" placeholder="📝 ملاحظات للمطبخ" value="${cashier.notes}" oninput="window.cashiers.ta.notes = this.value" style="width:100%;padding:6px;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:11px">
      </div>
    `;
  } else if (type === 'dl') {
    deliveryFee = cashier.deliveryFee || 0;
    total = subtotal + deliveryFee;
    const drivers = DB.get('drivers', []);
    extraHtml = `
      <div style="margin-bottom:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <input type="number" placeholder="🛵 رسوم التوصيل" value="${deliveryFee}" oninput="window.cashiers.dl.deliveryFee = parseFloat(this.value) || 0; renderCashierCart('dl')" style="padding:6px;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:11px">
        <select onchange="window.cashiers.dl.driverId = this.value" style="padding:6px;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:11px">
          <option value="">🛵 السائق (اختياري)</option>
          ${drivers.map(d => `<option value="${d.id}" ${cashier.driverId == d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </div>
      <select onchange="window.cashiers.dl.payment = this.value" style="width:100%;padding:6px;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:11px;margin-bottom:4px">
        <option value="cash" ${cashier.payment === 'cash' ? 'selected' : ''}>💵 نقدي</option>
        <option value="card" ${cashier.payment === 'card' ? 'selected' : ''}>💳 فيزا</option>
        <option value="credit" ${cashier.payment === 'credit' ? 'selected' : ''}>📝 آجل</option>
      </select>
      <input type="text" placeholder="📝 ملاحظات" value="${cashier.notes}" oninput="window.cashiers.dl.notes = this.value" style="width:100%;padding:6px;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:11px;margin-bottom:4px">
    `;
    summaryExtra = `<div class="cart-row"><span>التوصيل:</span><span>${deliveryFee.toFixed(2)} ج.م</span></div>`;
  }
  const cartHtml = cashier.cart.length ? cashier.cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price.toFixed(2)} × ${item.qty} = ${(item.price * item.qty).toFixed(2)} ج.م</div>
      </div>
      <div class="cart-qty">
        <button class="qty-btn" onclick="changeCashierQty('${type}', ${idx}, -1)">−</button>
        <input class="qty-input" type="number" value="${item.qty}" onchange="setCashierQty('${type}', ${idx}, this.value)">
        <button class="qty-btn" onclick="changeCashierQty('${type}', ${idx}, 1)">+</button>
        <button class="qty-btn" style="background:var(--danger)" onclick="removeCashierItem('${type}', ${idx})">🗑</button>
      </div>
    </div>
  `).join('') : '<div class="empty" style="padding:12px"><div class="empty-icon">🛒</div>السلة فارغة</div>';
  const titles = { pos: '🛒 نقطة البيع', ta: '🥡 تيك أواي', dl: '🛵 دليفري' };
  const payButtons = type === 'pos' ? `
    <div class="pay-buttons">
      <button class="btn btn-success" onclick="checkoutPOS('cash')">💵 نقدي</button>
      <button class="btn btn-primary" onclick="checkoutPOS('card')">💳 فيزا</button>
      <button class="btn btn-warning" onclick="checkoutPOS('credit')">📝 آجل</button>
    </div>
  ` : type === 'ta' ? `
    <div class="pay-buttons">
      <button class="btn btn-success" onclick="checkoutTA('cash')">💵 نقدي</button>
      <button class="btn btn-primary" onclick="checkoutTA('card')">💳 فيزا</button>
      <button class="btn btn-warning" onclick="checkoutTA('credit')">📝 آجل</button>
    </div>
  ` : `
    <div class="pay-buttons">
      <button class="btn btn-success btn-block" onclick="checkoutDL()" style="grid-column:1/-1">✅ حفظ طلب الدليفري</button>
    </div>
  `;
  const cartEl = document.getElementById(type + '-cart');
  if (!cartEl) return;
  cartEl.innerHTML = `
    <div class="cart-header">
      <div class="cart-title">${titles[type]} (${cashier.cart.reduce((sum, item) => sum + item.qty, 0)})</div>
      <button class="btn btn-danger btn-sm" onclick="clearCashierCart('${type}')">🗑️</button>
    </div>
    <div class="cart-items">${cartHtml}</div>
    <div class="cart-summary">
      ${extraHtml}
      <div class="cart-row"><span>المجموع:</span><span>${subtotal.toFixed(2)} ج.م</span></div>
      ${summaryExtra}
      <div class="cart-row total"><span>💰 الإجمالي:</span><span>${total.toFixed(2)} ج.م</span></div>
      ${payButtons}
    </div>
  `;
}

function renderCashierCustomerBar(type) {
  const bar = document.getElementById(type + '-customer-bar');
  if (!bar) return;
  const cashier = window.cashiers[type];
  if (cashier.selectedCustomer) {
    const customer = cashier.selectedCustomer;
    const balanceColor = customer.balance > 0 ? 'color:var(--danger)' : 'color:var(--success)';
    const loyaltyHtml = customer.loyaltyPoints ? `<span class="loyalty-badge">⭐ ${customer.loyaltyPoints} نقطة</span>` : '';
    bar.classList.add('has-customer');
    bar.innerHTML = `
      <div class="customer-bar-info">
        <div class="customer-bar-name">✅ ${customer.name} ${loyaltyHtml}</div>
        <div class="customer-bar-details">📞 ${customer.phone || '-'} ${customer.address ? '| 📍 ' + customer.address : ''} | <span style="${balanceColor}">💰 ${customer.balance.toFixed(2)} ج.م</span></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openCashierCustomerSearch('${type}')">🔍 تغيير</button>
      <button class="btn btn-danger btn-sm" onclick="clearCashierCustomer('${type}')">❌</button>
    `;
  } else {
    bar.classList.remove('has-customer');
    const title = type === 'pos' ? '👤 العميل (اختياري)' : type === 'ta' ? '🥡 بيانات تيك أواي (اختياري)' : '🛵 بيانات الدليفري (اختياري)';
    bar.innerHTML = `
      <div class="customer-bar-info"><div class="customer-bar-name">${title}</div></div>
      <button class="btn btn-primary btn-sm" onclick="openCashierCustomerSearch('${type}')">🔍 بحث</button>
      <button class="btn btn-success btn-sm" onclick="openCashierNewCustomer('${type}')">➕ جديد</button>
    `;
    if (type === 'ta') {
      bar.innerHTML += `
        <input type="text" placeholder="👤 الاسم" value="${cashier.customerName}" oninput="window.cashiers.ta.customerName = this.value" style="flex:1;min-width:100px">
        <input type="tel" placeholder="📞 الهاتف" value="${cashier.customerPhone}" oninput="window.cashiers.ta.customerPhone = this.value" style="flex:1;min-width:100px">
      `;
    } else if (type === 'dl') {
      bar.innerHTML += `
        <input type="text" placeholder="👤 الاسم" value="${cashier.customerName}" oninput="window.cashiers.dl.customerName = this.value" style="flex:1;min-width:80px">
        <input type="tel" placeholder="📞 الهاتف" value="${cashier.customerPhone}" oninput="window.cashiers.dl.customerPhone = this.value" style="flex:1;min-width:90px">
        <input type="text" placeholder="📍 العنوان" value="${cashier.customerAddress}" oninput="window.cashiers.dl.customerAddress = this.value" style="flex:2;min-width:120px">
      `;
    }
  }
}

function checkoutPOS(method) {
  const cashier = window.cashiers.pos;
  if (!cashier.cart.length) { showToast('⚠️ السلة فارغة', 'warning'); return; }
  const licenseCheck = checkLicense();
  if (!licenseCheck.valid && window.currentUser.role !== 'designer') { alert('⚠️ البرنامج غير مفعل'); return; }
  const subtotal = cashier.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = cashier.discount || 0;
  const taxPercent = cashier.tax || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = afterDiscount * taxPercent / 100;
  const total = afterDiscount + tax;
  let customer = null;
  if (cashier.selectedCustomer) {
    const customers = DB.get('customers', []);
    const idx = customers.findIndex(c => c.id === cashier.selectedCustomer.id);
    if (idx >= 0) {
      customer = customers[idx];
      if (method === 'credit') {
        customers[idx].balance = (customers[idx].balance || 0) + total;
        DB.set('customers', customers);
        cashier.selectedCustomer = customers[idx];
      }
    }
  }
  const products = DB.get('products', []);
  cashier.cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  });
  DB.set('products', products);
  const invoice = {
    id: Date.now(), number: DB.get('invoiceCounter', 1),
    date: new Date().toISOString(), items: [...cashier.cart],
    subtotal, discount, tax, total,
    customer: customer ? customer.name : 'عميل نقدي',
    customerPhone: customer ? customer.phone : '',
    customerId: customer ? customer.id : null,
    customerAddress: customer ? customer.address : '',
    payment: method, cashier: window.currentUser.name,
    shiftId: window.currentShift?.id, type: 'pos'
  };
  const invoices = DB.get('invoices', []);
  invoices.push(invoice);
  DB.set('invoices', invoices);
  DB.set('invoiceCounter', invoice.number + 1);
  if (method === 'credit' && customer) {
    const debts = DB.get('debts', []);
    debts.push({
      id: Date.now(), date: new Date().toISOString(),
      type: 'customer', name: customer.name,
      customerId: customer.id, amount: total, paid: 0, invoiceId: invoice.id
    });
    DB.set('debts', debts);
  }
  if (customer) {
    const points = addLoyaltyPoints(customer.id, total);
    if (points > 0) showToast('🎁 حصلت على ' + points + ' نقطة مكافأة', 'success', 4000);
  }
  printInvoice(invoice);
  logActivity('sale', 'فاتورة جديدة', '#' + invoice.number + ' - ' + total.toFixed(2) + ' ج.م');
  cashier.cart = [];
  cashier.selectedCustomer = null;
  cashier.discount = 0;
  cashier.tax = 0;
  renderCashierCart('pos');
  renderCashierCustomerBar('pos');
  showToast('✅ تم حفظ الفاتورة #' + invoice.number, 'success');
}

function checkoutTA(method) {
  const cashier = window.cashiers.ta;
  if (!cashier.cart.length) { showToast('⚠️ السلة فارغة', 'warning'); return; }
  const total = cashier.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const products = DB.get('products', []);
  cashier.cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  });
  DB.set('products', products);
  const customerName = cashier.selectedCustomer ? cashier.selectedCustomer.name : (cashier.customerName || 'عميل');
  const customerPhone = cashier.selectedCustomer ? cashier.selectedCustomer.phone : (cashier.customerPhone || '');
  const customerId = cashier.selectedCustomer ? cashier.selectedCustomer.id : null;
  const orders = DB.get('takeawayOrders', []);
  const order = {
    id: Date.now(), orderNumber: DB.get('taCounter', 1),
    date: new Date().toISOString(), customerName, customerPhone, customerId,
    items: [...cashier.cart], total, notes: cashier.notes || '',
    status: 'new', payment: method, cashier: window.currentUser.name
  };
  orders.push(order);
  DB.set('takeawayOrders', orders);
  DB.set('taCounter', order.orderNumber + 1);
  const invoices = DB.get('invoices', []);
  invoices.push({
    id: Date.now(), number: DB.get('invoiceCounter', 1),
    date: new Date().toISOString(), items: [...cashier.cart],
    subtotal: total, discount: 0, tax: 0, total,
    customer: customerName + ' (تيك أواي)',
    customerPhone, customerId, payment: method,
    cashier: window.currentUser.name, shiftId: window.currentShift?.id,
    type: 'takeaway', orderId: order.id
  });
  DB.set('invoices', invoices);
  DB.set('invoiceCounter', DB.get('invoiceCounter', 1) + 1);
  if (customerId) {
    const points = addLoyaltyPoints(customerId, total);
    if (points > 0) showToast('🎁 حصلت على ' + points + ' نقطة', 'success', 4000);
  }
  printTakeawayInvoice(order.id);
  playNotificationSound();
  logActivity('sale', 'طلب تيك أواي', '#' + order.orderNumber + ' - ' + total.toFixed(2) + ' ج.م');
  cashier.cart = [];
  cashier.selectedCustomer = null;
  cashier.customerName = '';
  cashier.customerPhone = '';
  cashier.notes = '';
  renderCashierCart('ta');
  renderCashierCustomerBar('ta');
  showToast('✅ تم حفظ الطلب #' + order.orderNumber, 'success');
}

function checkoutDL() {
  const cashier = window.cashiers.dl;
  if (!cashier.cart.length) { showToast('⚠️ السلة فارغة', 'warning'); return; }
  const customerName = cashier.selectedCustomer ? cashier.selectedCustomer.name : cashier.customerName;
  const customerPhone = cashier.selectedCustomer ? cashier.selectedCustomer.phone : cashier.customerPhone;
  const customerAddress = cashier.selectedCustomer ? cashier.selectedCustomer.address : cashier.customerAddress;
  const customerId = cashier.selectedCustomer ? cashier.selectedCustomer.id : null;
  if (!customerName || !customerPhone || !customerAddress) {
    showToast('⚠️ الاسم والهاتف والعنوان مطلوبين', 'warning'); return;
  }
  const itemsTotal = cashier.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = itemsTotal + (cashier.deliveryFee || 0);
  const products = DB.get('products', []);
  cashier.cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  });
  DB.set('products', products);
  let driverName = '', driverPhone = '';
  if (cashier.driverId) {
    const drivers = DB.get('drivers', []);
    const driver = drivers.find(d => d.id == cashier.driverId);
    if (driver) { driverName = driver.name; driverPhone = driver.phone; }
  }
  const orders = DB.get('deliveryOrders', []);
  const order = {
    id: Date.now(), orderNumber: DB.get('dlCounter', 1),
    date: new Date().toISOString(), customerName, customerPhone, customerAddress, customerId,
    driverId: cashier.driverId || null, driverName, driverPhone,
    items: [...cashier.cart], itemsTotal, deliveryFee: cashier.deliveryFee || 0,
    total, payment: cashier.payment || 'cash', notes: cashier.notes || '',
    status: 'new', cashier: window.currentUser.name
  };
  orders.push(order);
  DB.set('deliveryOrders', orders);
  DB.set('dlCounter', order.orderNumber + 1);
  const invoices = DB.get('invoices', []);
  invoices.push({
    id: Date.now(), number: DB.get('invoiceCounter', 1),
    date: new Date().toISOString(), items: [...cashier.cart],
    subtotal: itemsTotal, discount: 0, tax: 0, total,
    customer: customerName + ' (دليفري)', customerPhone, customerId, customerAddress,
    payment: cashier.payment, cashier: window.currentUser.name,
    shiftId: window.currentShift?.id, type: 'delivery',
    orderId: order.id, driverId: cashier.driverId || null
  });
  DB.set('invoices', invoices);
  DB.set('invoiceCounter', DB.get('invoiceCounter', 1) + 1);
  if (customerId) {
    const points = addLoyaltyPoints(customerId, total);
    if (points > 0) showToast('🎁 حصلت على ' + points + ' نقطة', 'success', 4000);
  }
  printDeliveryInvoice(order.id);
  playNotificationSound();
  logActivity('sale', 'طلب دليفري', '#' + order.orderNumber + ' - ' + total.toFixed(2) + ' ج.م');
  cashier.cart = [];
  cashier.selectedCustomer = null;
  cashier.customerName = '';
  cashier.customerPhone = '';
  cashier.customerAddress = '';
  cashier.driverId = '';
  cashier.deliveryFee = 0;
  cashier.notes = '';
  cashier.payment = 'cash';
  renderCashierCart('dl');
  renderCashierCustomerBar('dl');
  showToast('✅ تم حفظ طلب الدليفري #' + order.orderNumber, 'success');
}

function printInvoice(invoice) {
  const settings = DB.get('settings', {});
  const html = `
    <div style="text-align:center;font-family:'Courier New',monospace">
      <div style="font-size:16px;font-weight:bold">${settings.shopName || 'TAWD Store'}</div>
      <div style="font-size:11px">${settings.shopAddress || ''}</div>
      <div style="font-size:11px">${settings.shopPhone || ''}</div>
      ${settings.shopTax ? `<div style="font-size:11px">الضريبية: ${settings.shopTax}</div>` : ''}
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:11px">فاتورة #${invoice.number}</div>
      <div style="font-size:11px">${new Date(invoice.date).toLocaleString('ar-EG')}</div>
      <div style="font-size:11px">الكاشير: ${invoice.cashier}</div>
      <div style="font-size:11px">العميل: ${invoice.customer}</div>
      ${invoice.customerPhone ? `<div style="font-size:11px">📞 ${invoice.customerPhone}</div>` : ''}
      <div>━━━━━━━━━━━━━━━━</div>
      ${invoice.items.map(item => `<div style="font-size:11px;text-align:right">${item.name}<br>${item.qty}×${item.price.toFixed(2)} = ${(item.qty * item.price).toFixed(2)}</div>`).join('')}
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:11px">المجموع: ${invoice.subtotal.toFixed(2)}</div>
      ${invoice.discount ? `<div style="font-size:11px">الخصم: ${invoice.discount.toFixed(2)}</div>` : ''}
      ${invoice.tax ? `<div style="font-size:11px">الضريبة: ${invoice.tax.toFixed(2)}</div>` : ''}
      <div style="font-size:14px;font-weight:bold">الإجمالي: ${invoice.total.toFixed(2)} ج.م</div>
      <div style="font-size:11px">الدفع: ${({cash:'نقدي',card:'فيزا',credit:'آجل'})[invoice.payment]}</div>
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:11px">${settings.shopFooter || 'شكراً'}</div>
    </div>
  `;
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = html;
  printArea.style.display = 'block';
  window.print();
  setTimeout(() => printArea.style.display = 'none', 500);
}

function printTakeawayInvoice(orderId) {
  const orders = DB.get('takeawayOrders', []);
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const settings = DB.get('settings', {});
  const html = `
    <div style="text-align:center;font-family:'Courier New',monospace">
      <div style="font-size:16px;font-weight:bold">🥡 تيك أواي</div>
      <div style="font-size:16px;font-weight:bold">${settings.shopName || 'TAWD Store'}</div>
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px">طلب #${order.orderNumber}</div>
      <div style="font-size:11px">${new Date(order.date).toLocaleString('ar-EG')}</div>
      <div style="font-size:11px">العميل: ${order.customerName}</div>
      ${order.customerPhone ? `<div style="font-size:11px">📞 ${order.customerPhone}</div>` : ''}
      <div>━━━━━━━━━━━━━━━━</div>
      ${order.items.map(item => `<div style="font-size:11px;text-align:right">${item.name}<br>${item.qty}×${item.price.toFixed(2)} = ${(item.qty * item.price).toFixed(2)}</div>`).join('')}
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:14px;font-weight:bold">الإجمالي: ${order.total.toFixed(2)} ج.م</div>
      <div>━━━━━━━━━━━━━━━━</div>
      ${order.notes ? `<div style="font-size:11px">ملاحظات: ${order.notes}</div>` : ''}
      <div style="font-size:11px">${settings.shopFooter || ''}</div>
    </div>
  `;
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = html;
  printArea.style.display = 'block';
  window.print();
  setTimeout(() => printArea.style.display = 'none', 500);
}

function printDeliveryInvoice(orderId) {
  const orders = DB.get('deliveryOrders', []);
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const settings = DB.get('settings', {});
  const html = `
    <div style="text-align:center;font-family:'Courier New',monospace">
      <div style="font-size:16px;font-weight:bold">🛵 دليفري</div>
      <div style="font-size:16px;font-weight:bold">${settings.shopName || 'TAWD Store'}</div>
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px">طلب #${order.orderNumber}</div>
      <div style="font-size:11px">${new Date(order.date).toLocaleString('ar-EG')}</div>
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:11px;text-align:right">العميل: ${order.customerName}</div>
      <div style="font-size:11px">📞 ${order.customerPhone}</div>
      <div style="font-size:11px">📍 ${order.customerAddress}</div>
      ${order.driverName ? `<div style="font-size:11px">🛵 السائق: ${order.driverName}</div><div style="font-size:11px">📞 ${order.driverPhone || ''}</div>` : ''}
      <div>━━━━━━━━━━━━━━━━</div>
      ${order.items.map(item => `<div style="font-size:11px;text-align:right">${item.name}<br>${item.qty}×${item.price.toFixed(2)} = ${(item.qty * item.price).toFixed(2)}</div>`).join('')}
      <div>━━━━━━━━━━━━━━━━</div>
      <div style="font-size:11px">المنتجات: ${order.itemsTotal.toFixed(2)}</div>
      <div style="font-size:11px">التوصيل: ${order.deliveryFee.toFixed(2)}</div>
      <div style="font-size:14px;font-weight:bold">الإجمالي: ${order.total.toFixed(2)} ج.م</div>
      <div style="font-size:11px">الدفع: ${({cash:'نقدي',card:'فيزا',credit:'آجل'})[order.payment]}</div>
      <div>━━━━━━━━━━━━━━━━</div>
      ${order.notes ? `<div style="font-size:11px">ملاحظات: ${order.notes}</div>` : ''}
      <div style="font-size:11px">${settings.shopFooter || ''}</div>
    </div>
  `;
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = html;
  printArea.style.display = 'block';
  window.print();
  setTimeout(() => printArea.style.display = 'none', 500);
}

function renderInvoices() {
  const invoices = DB.get('invoices', []).slice().reverse();
  const tbody = document.getElementById('invoicesTable');
  if (!tbody) return;
  tbody.innerHTML = invoices.length ? invoices.map(inv => `
    <tr>
      <td>#${inv.number}</td>
      <td>${new Date(inv.date).toLocaleString('ar-EG')}</td>
      <td>${inv.customer}</td>
      <td><strong>${inv.total.toFixed(2)}</strong></td>
      <td><span class="badge ${({cash:'badge-success',card:'badge-warning',credit:'badge-danger'})[inv.payment]}">${({cash:'نقدي',card:'فيزا',credit:'آجل'})[inv.payment]}</span></td>
      <td><span class="badge ${({pos:'badge-success',takeaway:'badge-info',delivery:'badge-purple'})[inv.type] || 'badge-secondary'}">${({pos:'🛒 بيع',takeaway:'🥡 تيك أواي',delivery:'🛵 دليفري'})[inv.type] || 'بيع'}</span></td>
      <td><button class="btn btn-primary btn-sm" onclick='reprintInvoice(${JSON.stringify(inv).replace(/"/g, "&quot;")})'>🖨️</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty">لا توجد فواتير</td></tr>';
}

function reprintInvoice(invoice) { printInvoice(invoice); }

function renderReturns() {
  const returns = DB.get('returns', []);
  const totalReturns = returns.reduce((sum, r) => sum + r.amount, 0);
  const statsEl = document.getElementById('returnsStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card danger"><div class="stat-label">إجمالي المرتجعات</div><div class="stat-value">${totalReturns.toFixed(2)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">عدد المرتجعات</div><div class="stat-value">${returns.length}</div></div>
    `;
  }
  const tbody = document.getElementById('returnsTable');
  if (!tbody) return;
  tbody.innerHTML = returns.length ? returns.slice().reverse().map(r => `
    <tr>
      <td>#${r.id}</td>
      <td>${new Date(r.date).toLocaleDateString('ar-EG')}</td>
      <td>#${r.invoiceNumber || '-'}</td>
      <td>${r.productName}</td>
      <td>${r.qty}</td>
      <td><strong>${r.amount.toFixed(2)} ج.م</strong></td>
      <td>${r.reason || '-'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteReturn(${r.id})">🗑️</button></td>
    </tr>
  `).join('') : '<tr><td colspan="8" class="empty">لا توجد مرتجعات</td></tr>';
}

function openReturnModal() {
  const invoices = DB.get('invoices', []);
  document.getElementById('modalTitle').textContent = '↩️ مرتجع جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>اختر الفاتورة</label>
      <select id="retInvoice" onchange="loadInvoiceItems()">
        <option value="">-- اختر --</option>
        ${invoices.map(inv => `<option value="${inv.id}">فاتورة #${inv.number} - ${inv.customer} - ${inv.total.toFixed(2)} ج.م</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>اختر الصنف</label>
      <select id="retProduct" onchange="updateReturnAmount()">
        <option value="">-- اختر الفاتورة أولاً --</option>
      </select>
    </div>
    <div class="form-group"><label>الكمية</label>
      <input type="number" id="retQty" value="1" min="1" oninput="updateReturnAmount()">
    </div>
    <div class="form-group"><label>المبلغ المسترد</label>
      <input type="number" id="retAmount" step="0.01" readonly style="background:var(--bg);font-weight:700">
    </div>
    <div class="form-group"><label>سبب المرتجع</label>
      <textarea id="retReason" rows="2"></textarea>
    </div>
    <button class="btn btn-success btn-block" onclick="saveReturn()">💾 حفظ</button>
  `;
  openModal();
}

function loadInvoiceItems() {
  const invoiceId = parseInt(document.getElementById('retInvoice').value);
  if (!invoiceId) {
    document.getElementById('retProduct').innerHTML = '<option value="">-- اختر الفاتورة أولاً --</option>';
    return;
  }
  const invoices = DB.get('invoices', []);
  const invoice = invoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;
  document.getElementById('retProduct').innerHTML = invoice.items.map(item => `
    <option value="${item.id}" data-price="${item.price}" data-name="${item.name}">${item.name} - ${item.price.toFixed(2)} ج.م</option>
  `).join('');
  updateReturnAmount();
}

function updateReturnAmount() {
  const qty = parseFloat(document.getElementById('retQty').value) || 0;
  const select = document.getElementById('retProduct');
  const option = select.options[select.selectedIndex];
  const price = option ? parseFloat(option.dataset.price) || 0 : 0;
  document.getElementById('retAmount').value = (qty * price).toFixed(2);
}

function saveReturn() {
  const invoiceId = parseInt(document.getElementById('retInvoice').value);
  if (!invoiceId) { alert('⚠️ اختر الفاتورة'); return; }
  const invoices = DB.get('invoices', []);
  const invoice = invoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;
  const productId = parseInt(document.getElementById('retProduct').value);
  const productSelect = document.getElementById('retProduct');
  const productOption = productSelect.options[productSelect.selectedIndex];
  const productName = productOption.dataset.name;
  const price = parseFloat(productOption.dataset.price);
  const qty = parseFloat(document.getElementById('retQty').value) || 0;
  const amount = parseFloat(document.getElementById('retAmount').value) || 0;
  if (qty <= 0 || amount <= 0) { alert('⚠️ بيانات غير صحيحة'); return; }
  const reason = document.getElementById('retReason').value.trim();
  const returns = DB.get('returns', []);
  returns.push({
    id: Date.now(), date: new Date().toISOString(),
    invoiceId, invoiceNumber: invoice.number, customer: invoice.customer,
    customerId: invoice.customerId, productId, productName, qty, price, amount,
    reason, cashier: window.currentUser.name
  });
  DB.set('returns', returns);
  const products = DB.get('products', []);
  const product = products.find(p => p.id === productId);
  if (product) {
    product.stock += qty;
    DB.set('products', products);
  }
  if (invoice.customerId && invoice.payment === 'credit') {
    const customers = DB.get('customers', []);
    const customer = customers.find(c => c.id === invoice.customerId);
    if (customer) {
      customer.balance = Math.max(0, (customer.balance || 0) - amount);
      DB.set('customers', customers);
    }
  }
  closeModal();
  renderReturns();
  showToast('✅ تم حفظ المرتجع', 'success');
  logActivity('return', 'مرتجع', productName + ' - ' + amount.toFixed(2) + ' ج.م');
}

function deleteReturn(id) {
  if (!confirm('حذف المرتجع؟')) return;
  DB.set('returns', DB.get('returns', []).filter(r => r.id !== id));
  renderReturns();
  showToast('✅ تم الحذف', 'success');
}

function renderExpenses() {
  const expenses = DB.get('expenses', []);
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const statsEl = document.getElementById('expensesStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card success"><div class="stat-label">مصروفات اليوم</div><div class="stat-value">${todayExpenses.toFixed(2)} ج.م</div></div>
      <div class="stat-card warning"><div class="stat-label">مصروفات الشهر</div><div class="stat-value">${monthExpenses.toFixed(2)} ج.م</div></div>
      <div class="stat-card danger"><div class="stat-label">الإجمالي</div><div class="stat-value">${totalExpenses.toFixed(2)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">عدد العمليات</div><div class="stat-value">${expenses.length}</div></div>
    `;
  }
  const tbody = document.getElementById('expensesTable');
  if (!tbody) return;
  tbody.innerHTML = expenses.length ? expenses.slice().reverse().map(e => `
    <tr>
      <td>${new Date(e.date).toLocaleDateString('ar-EG')}</td>
      <td><span class="badge badge-info">${e.category}</span></td>
      <td>${e.description || '-'}</td>
      <td><strong>${e.amount.toFixed(2)} ج.م</strong></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">🗑️</button></td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty">لا توجد مصروفات</td></tr>';
}

function openExpenseModal() {
  document.getElementById('modalTitle').textContent = '💸 مصروف جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الفئة</label>
      <select id="expCategory">
        <option>إيجار</option><option>كهرباء</option><option>مياه</option>
        <option>غاز</option><option>رواتب</option><option>نظافة</option>
        <option>صيانة</option><option>مواد خام</option><option>نقل</option><option>أخرى</option>
      </select>
    </div>
    <div class="form-group"><label>المبلغ</label>
      <input type="number" id="expAmount" step="0.01" placeholder="0.00">
    </div>
    <div class="form-group"><label>الوصف (اختياري)</label>
      <input type="text" id="expDesc" placeholder="وصف المصروف">
    </div>
    <div class="form-group"><label>التاريخ</label>
      <input type="date" id="expDate" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <button class="btn btn-success btn-block" onclick="saveExpense()">💾 حفظ</button>
  `;
  openModal();
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('expAmount').value);
  if (!amount || amount <= 0) { alert('⚠️ أدخل مبلغ صحيح'); return; }
  const expenses = DB.get('expenses', []);
  expenses.push({
    id: Date.now(), date: document.getElementById('expDate').value,
    category: document.getElementById('expCategory').value, amount,
    description: document.getElementById('expDesc').value.trim(),
    user: window.currentUser.name
  });
  DB.set('expenses', expenses);
  closeModal();
  renderExpenses();
  showToast('✅ تم حفظ المصروف', 'success');
  logActivity('expense', 'إضافة مصروف', amount.toFixed(2) + ' ج.م');
}

function deleteExpense(id) {
  if (!confirm('حذف المصروف؟')) return;
  DB.set('expenses', DB.get('expenses', []).filter(e => e.id !== id));
  renderExpenses();
  showToast('✅ تم الحذف', 'success');
}

function renderShifts() {
  const shifts = DB.get('shifts', []);
  window.currentShift = DB.get('currentShift');
  const startBtn = document.getElementById('shiftToggle');
  const closeBtn = document.getElementById('shiftClose');
  if (window.currentShift) {
    startBtn.textContent = '⏹️ إنهاء';
    startBtn.className = 'btn btn-danger btn-sm';
    closeBtn.style.display = 'inline-flex';
    const invoices = DB.get('invoices', []).filter(inv => inv.shiftId === window.currentShift.id);
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const cash = invoices.filter(inv => inv.payment === 'cash').reduce((sum, inv) => sum + inv.total, 0);
    document.getElementById('currentShift').innerHTML = `
      <div class="alert alert-success">
        <strong>شيفت نشط</strong><br>
        البداية: ${new Date(window.currentShift.start).toLocaleString('ar-EG')}<br>
        المبيعات: ${total.toFixed(2)} ج.م | النقدية: ${cash.toFixed(2)} ج.م
      </div>
    `;
  } else {
    startBtn.textContent = '▶️ بدء';
    startBtn.className = 'btn btn-success btn-sm';
    closeBtn.style.display = 'none';
    document.getElementById('currentShift').innerHTML = '';
  }
  const tbody = document.getElementById('shiftsTable');
  if (!tbody) return;
  tbody.innerHTML = shifts.slice().reverse().map(s => `
    <tr>
      <td>${new Date(s.start).toLocaleString('ar-EG')}</td>
      <td>${s.end ? new Date(s.end).toLocaleString('ar-EG') : '-'}</td>
      <td>${s.cashier}</td>
      <td>${(s.total || 0).toFixed(2)}</td>
      <td>${(s.cash || 0).toFixed(2)}</td>
      <td><span class="badge ${s.end ? 'badge-success' : 'badge-warning'}">${s.end ? 'مغلق' : 'مفتوح'}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty">لا توجد شيفتات</td></tr>';
}

function toggleShift() {
  if (window.currentShift) {
    closeShiftModal();
  } else {
    window.currentShift = {
      id: Date.now(), start: new Date().toISOString(), end: null,
      cashier: window.currentUser.name, total: 0, cash: 0
    };
    const shifts = DB.get('shifts', []);
    shifts.push(window.currentShift);
    DB.set('shifts', shifts);
    DB.set('currentShift', window.currentShift);
    renderShifts();
  }
}

function closeShiftModal() {
  if (!window.currentShift) { alert('⚠️ لا يوجد شيفت نشط'); return; }
  const invoices = DB.get('invoices', []).filter(inv => inv.shiftId === window.currentShift.id);
  const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const cash = invoices.filter(inv => inv.payment === 'cash').reduce((sum, inv) => sum + inv.total, 0);
  document.getElementById('modalTitle').textContent = '🔒 تقفيل الشيفت';
  document.getElementById('modalBody').innerHTML = `
    <div class="alert alert-info">
      <strong>ملخص الشيفت</strong><br>
      البداية: ${new Date(window.currentShift.start).toLocaleString('ar-EG')}<br>
      الكاشير: ${window.currentShift.cashier}<br>
      المبيعات: ${total.toFixed(2)} ج.م<br>
      النقدية المتوقعة: ${cash.toFixed(2)} ج.م
    </div>
    <div class="form-group"><label>النقدية الفعلية</label>
      <input type="number" id="shiftActualCash" step="0.01" value="${cash.toFixed(2)}">
    </div>
    <div class="form-group"><label>ملاحظات</label>
      <textarea id="shiftNotes" rows="3"></textarea>
    </div>
    <button class="btn btn-warning btn-block" onclick="confirmCloseShift()">🔒 تقفيل</button>
  `;
  openModal();
}

function confirmCloseShift() {
  const actualCash = parseFloat(document.getElementById('shiftActualCash').value) || 0;
  const notes = document.getElementById('shiftNotes').value.trim();
  const invoices = DB.get('invoices', []).filter(inv => inv.shiftId === window.currentShift.id);
  window.currentShift.end = new Date().toISOString();
  window.currentShift.total = invoices.reduce((sum, inv) => sum + inv.total, 0);
  window.currentShift.cash = invoices.filter(inv => inv.payment === 'cash').reduce((sum, inv) => sum + inv.total, 0);
  window.currentShift.actualCash = actualCash;
  window.currentShift.diff = actualCash - window.currentShift.cash;
  window.currentShift.notes = notes;
  const shifts = DB.get('shifts', []);
  const idx = shifts.findIndex(s => s.id === window.currentShift.id);
  if (idx >= 0) shifts[idx] = window.currentShift;
  DB.set('shifts', shifts);
  DB.set('currentShift', null);
  window.currentShift = null;
  closeModal();
  renderShifts();
  showToast('✅ تم تقفيل الشيفت', 'success');
}

function loadSettings() {
  const settings = DB.get('settings', {});
  document.getElementById('shopName').value = settings.shopName || '';
  document.getElementById('shopAddress').value = settings.shopAddress || '';
  document.getElementById('shopPhone').value = settings.shopPhone || '';
  document.getElementById('shopTax').value = settings.shopTax || '';
  document.getElementById('shopFooter').value = settings.shopFooter || '';
  document.getElementById('loyaltyRate').value = settings.loyaltyRate || 1;
}

function saveSettings() {
  DB.set('settings', {
    shopName: document.getElementById('shopName').value,
    shopAddress: document.getElementById('shopAddress').value,
    shopPhone: document.getElementById('shopPhone').value,
    shopTax: document.getElementById('shopTax').value,
    shopFooter: document.getElementById('shopFooter').value,
    loyaltyRate: parseFloat(document.getElementById('loyaltyRate').value) || 1
  });
  showToast('✅ تم الحفظ', 'success');
}