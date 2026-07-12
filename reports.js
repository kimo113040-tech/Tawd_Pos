function renderSalesReport() {
  const period = document.getElementById('reportPeriod').value;
  const fromInput = document.getElementById('reportFrom');
  const toInput = document.getElementById('reportTo');
  if (period === 'custom') {
    fromInput.style.display = 'inline-block';
    toInput.style.display = 'inline-block';
  } else {
    fromInput.style.display = 'none';
    toInput.style.display = 'none';
  }
  const invoices = DB.get('invoices', []);
  const now = new Date();
  let from, to;
  if (period === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    from = d;
    to = now;
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = now;
  } else if (period === 'custom') {
    from = new Date(fromInput.value);
    to = new Date(toInput.value);
    to.setHours(23, 59, 59);
  }
  const filtered = invoices.filter(inv => {
    const d = new Date(inv.date);
    return d >= from && d <= to;
  });
  const totalSales = filtered.reduce((sum, inv) => sum + inv.total, 0);
  const totalCost = filtered.reduce((sum, inv) => {
    return sum + inv.items.reduce((s, item) => {
      const product = DB.get('products', []).find(p => p.id === item.id);
      return s + (product ? product.cost * item.qty : 0);
    }, 0);
  }, 0);
  const profit = totalSales - totalCost;
  const byType = { pos: 0, takeaway: 0, delivery: 0 };
  filtered.forEach(inv => { byType[inv.type || 'pos'] = (byType[inv.type || 'pos'] || 0) + inv.total; });
  const byPayment = { cash: 0, card: 0, credit: 0 };
  filtered.forEach(inv => { byPayment[inv.payment] = (byPayment[inv.payment] || 0) + inv.total; });
  const productSales = {};
  filtered.forEach(inv => {
    inv.items.forEach(item => {
      if (!productSales[item.id]) productSales[item.id] = { qty: 0, revenue: 0 };
      productSales[item.id].qty += item.qty;
      productSales[item.id].revenue += item.qty * item.price;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([id, data]) => {
      const product = DB.get('products', []).find(p => p.id == id);
      return product ? { name: product.name, qty: data.qty, revenue: data.revenue } : null;
    })
    .filter(Boolean);
  const contentEl = document.getElementById('salesReportContent');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card success"><div class="stat-label">إجمالي المبيعات</div><div class="stat-value">${totalSales.toFixed(2)} ج.م</div></div>
      <div class="stat-card info"><div class="stat-label">إجمالي الأرباح</div><div class="stat-value">${profit.toFixed(2)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">عدد الفواتير</div><div class="stat-value">${filtered.length}</div></div>
      <div class="stat-card warning"><div class="stat-label">متوسط الفاتورة</div><div class="stat-value">${filtered.length ? (totalSales / filtered.length).toFixed(2) : '0.00'} ج.م</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
      <div class="card">
        <div class="card-title">💼 المبيعات حسب النوع</div>
        <table>
          <thead><tr><th>النوع</th><th>المبلغ</th><th>النسبة</th></tr></thead>
          <tbody>
            <tr><td>🛒 نقطة البيع</td><td>${byType.pos.toFixed(2)} ج.م</td><td>${totalSales ? ((byType.pos / totalSales) * 100).toFixed(1) : 0}%</td></tr>
            <tr><td>🥡 تيك أواي</td><td>${byType.takeaway.toFixed(2)} ج.م</td><td>${totalSales ? ((byType.takeaway / totalSales) * 100).toFixed(1) : 0}%</td></tr>
            <tr><td>🛵 دليفري</td><td>${byType.delivery.toFixed(2)} ج.م</td><td>${totalSales ? ((byType.delivery / totalSales) * 100).toFixed(1) : 0}%</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title">💳 حسب طريقة الدفع</div>
        <table>
          <thead><tr><th>الطريقة</th><th>المبلغ</th><th>النسبة</th></tr></thead>
          <tbody>
            <tr><td>💵 نقدي</td><td>${byPayment.cash.toFixed(2)} ج.م</td><td>${totalSales ? ((byPayment.cash / totalSales) * 100).toFixed(1) : 0}%</td></tr>
            <tr><td>💳 فيزا</td><td>${byPayment.card.toFixed(2)} ج.م</td><td>${totalSales ? ((byPayment.card / totalSales) * 100).toFixed(1) : 0}%</td></tr>
            <tr><td>📝 آجل</td><td>${byPayment.credit.toFixed(2)} ج.م</td><td>${totalSales ? ((byPayment.credit / totalSales) * 100).toFixed(1) : 0}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🏆 أفضل 10 منتجات</div>
      ${topProducts.length ? `
        <table>
          <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>الإيرادات</th></tr></thead>
          <tbody>
            ${topProducts.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.qty}</td>
                <td><strong>${p.revenue.toFixed(2)} ج.م</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty">لا توجد مبيعات</div>'}
    </div>
  `;
}

function exportSalesReport(format) {
  const invoices = DB.get('invoices', []);
  if (format === 'csv') {
    let csv = '\ufeffالرقم,التاريخ,العميل,النوع,الإجمالي,طريقة الدفع,الكاشير\n';
    invoices.forEach(inv => {
      csv += `${inv.number},"${new Date(inv.date).toLocaleString('ar-EG')}","${inv.customer}",${inv.type || 'pos'},${inv.total.toFixed(2)},${inv.payment},"${inv.cashier}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sales-report-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  } else {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sales-report-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  }
  showToast('✅ تم التصدير', 'success');
}

function renderActivityLog() {
  const log = DB.get('activityLog', []);
  const search = document.getElementById('activitySearch')?.value.toLowerCase() || '';
  const filter = document.getElementById('activityFilter')?.value || '';
  const filtered = log.filter(entry =>
    (!search || entry.message.toLowerCase().includes(search) || entry.userName.toLowerCase().includes(search)) &&
    (!filter || entry.type === filter)
  );
  const contentEl = document.getElementById('activityLogContent');
  if (!contentEl) return;
  contentEl.innerHTML = filtered.length ? filtered.slice().reverse().slice(0, 100).map(entry => `
    <div class="activity-item ${entry.type === 'sale' ? 'success' : entry.type === 'return' ? 'danger' : entry.type === 'login' ? 'warning' : ''}">
      <div><strong>${entry.userName}</strong> - ${entry.message}</div>
      ${entry.details ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${entry.details}</div>` : ''}
      <div class="activity-time">${new Date(entry.date).toLocaleString('ar-EG')}</div>
    </div>
  `).join('') : '<div class="empty"><div class="empty-icon">📝</div>لا توجد نشاطات</div>';
}

function exportActivityLog() {
  const log = DB.get('activityLog', []);
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'activity-log-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  showToast('✅ تم التصدير', 'success');
}

function clearActivityLog() {
  if (!confirm('مسح جميع النشاطات؟')) return;
  DB.set('activityLog', []);
  renderActivityLog();
  showToast('✅ تم المسح', 'success');
}

function renderDashboard() {
  const products = DB.get('products', []);
  const invoices = DB.get('invoices', []);
  const customers = DB.get('customers', []);
  const takeawayOrders = DB.get('takeawayOrders', []);
  const deliveryOrders = DB.get('deliveryOrders', []);
  const expenses = DB.get('expenses', []);
  const today = new Date().toDateString();
  const todayInvoices = invoices.filter(inv => new Date(inv.date).toDateString() === today);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const todayCost = todayInvoices.reduce((sum, inv) => {
    return sum + inv.items.reduce((s, item) => {
      const product = products.find(p => p.id === item.id);
      return s + (product ? product.cost * item.qty : 0);
    }, 0);
  }, 0);
  const todayProfit = todaySales - todayCost;
  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
  const lowStock = products.filter(p => p.stock < 10);
  const activeTakeaway = takeawayOrders.filter(o => o.status !== 'picked' && o.status !== 'cancelled').length;
  const activeDelivery = deliveryOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const productSales = {};
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      productSales[item.id] = (productSales[item.id] || 0) + item.qty;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => {
      const product = products.find(p => p.id == id);
      return product ? { name: product.name, qty } : null;
    })
    .filter(Boolean);
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    const sales = invoices.filter(inv => new Date(inv.date).toDateString() === dateString).reduce((sum, inv) => sum + inv.total, 0);
    last7Days.push({
      date: date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }),
      sales
    });
  }
  const maxSales = Math.max(...last7Days.map(d => d.sales), 1);
  const contentEl = document.getElementById('dashboardContent');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card success"><div class="stat-label">💰 مبيعات اليوم</div><div class="stat-value">${todaySales.toFixed(2)} ج.م</div></div>
      <div class="stat-card info"><div class="stat-label">📈 أرباح اليوم</div><div class="stat-value">${todayProfit.toFixed(2)} ج.م</div></div>
      <div class="stat-card danger"><div class="stat-label">💸 مصروفات اليوم</div><div class="stat-value">${todayExpenses.toFixed(2)} ج.م</div></div>
      <div class="stat-card"><div class="stat-label">🧾 فواتير اليوم</div><div class="stat-value">${todayInvoices.length}</div></div>
      <div class="stat-card info"><div class="stat-label">🥡 تيك أواي نشطة</div><div class="stat-value">${activeTakeaway}</div></div>
      <div class="stat-card purple"><div class="stat-label">🛵 دليفري نشطة</div><div class="stat-value">${activeDelivery}</div></div>
      <div class="stat-card warning"><div class="stat-label">📦 الأصناف</div><div class="stat-value">${products.length}</div></div>
      <div class="stat-card danger"><div class="stat-label">⚠️ مخزون منخفض</div><div class="stat-value">${lowStock.length}</div></div>
      <div class="stat-card"><div class="stat-label">👥 العملاء</div><div class="stat-value">${customers.length}</div></div>
    </div>
    <div class="chart-container">
      <div class="card-title">📈 مبيعات آخر 7 أيام</div>
      <div class="chart-bars">
        ${last7Days.map(d => `
          <div class="chart-bar" style="height:${(d.sales / maxSales) * 100}%" title="${d.date}: ${d.sales.toFixed(2)} ج.م">
            <div class="chart-bar-value">${d.sales > 0 ? d.sales.toFixed(0) : ''}</div>
            <div class="chart-bar-label">${d.date}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
      <div class="card">
        <div class="card-title">🏆 أفضل 5 منتجات</div>
        ${topProducts.length ? topProducts.map((p, i) => `
          <div style="display:flex;justify-content:space-between;padding:6px;background:var(--bg);border-radius:6px;margin-bottom:4px;font-size:12px">
            <span>${i + 1}. ${p.name}</span>
            <strong>${p.qty} قطعة</strong>
          </div>
        `).join('') : '<div class="empty" style="padding:12px">لا توجد مبيعات</div>'}
      </div>
      <div class="card">
        <div class="card-title">⚠️ تنبيهات المخزون</div>
        ${lowStock.length ? lowStock.slice(0, 5).map(p => `
          <div style="display:flex;justify-content:space-between;padding:6px;background:rgba(220,53,69,.1);border-radius:6px;margin-bottom:4px;font-size:12px">
            <span>${p.name}</span>
            <strong style="color:var(--danger)">${p.stock} فقط</strong>
          </div>
        `).join('') : '<div class="empty" style="padding:12px">✅ جميع الأصناف متوفرة</div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-title">📈 آخر الفواتير</div>
      ${invoices.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>النوع</th><th>الإجمالي</th></tr></thead>
            <tbody>
              ${invoices.slice(-10).reverse().map(inv => `
                <tr>
                  <td>#${inv.number}</td>
                  <td>${new Date(inv.date).toLocaleString('ar-EG')}</td>
                  <td>${inv.customer || 'نقدي'}</td>
                  <td><span class="badge ${({pos:'badge-success',takeaway:'badge-info',delivery:'badge-purple'})[inv.type] || 'badge-secondary'}">${({pos:'🛒 بيع',takeaway:'🥡 تيك أواي',delivery:'🛵 دليفري'})[inv.type] || 'بيع'}</span></td>
                  <td><strong>${inv.total.toFixed(2)} ج.م</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty"><div class="empty-icon">📭</div>لا توجد فواتير</div>'}
    </div>
  `;
}