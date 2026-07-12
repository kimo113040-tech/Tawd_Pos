const DB = {
  get(key, defaultValue) {
    try { return JSON.parse(localStorage.getItem('tawd_' + key)) ?? defaultValue; }
    catch { return defaultValue; }
  },
  set(key, value) { localStorage.setItem('tawd_' + key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem('tawd_' + key); },
  clear() {
    Object.keys(localStorage).filter(k => k.startsWith('tawd_')).forEach(k => localStorage.removeItem(k));
  }
};

if (!DB.get('initialized')) {
  DB.set('users', [
    { id: 1, name: 'المصمم', username: 'designer', password: 'tawd2024', role: 'designer', active: true },
    { id: 2, name: 'المدير', username: 'admin', password: 'admin123', role: 'admin', active: true }
  ]);
  DB.set('products', [
    { id: 1, name: 'كولا', category: 'مشروبات', price: 15, cost: 10, stock: 100, image: '', barcode: '1001' },
    { id: 2, name: 'شيبسي', category: 'سناكس', price: 10, cost: 6, stock: 50, image: '', barcode: '1002' },
    { id: 3, name: 'ساندوتش', category: 'وجبات', price: 35, cost: 20, stock: 20, image: '', barcode: '1003' },
    { id: 4, name: 'برجر', category: 'وجبات', price: 45, cost: 25, stock: 15, image: '', barcode: '1004' },
    { id: 5, name: 'عصير برتقال', category: 'مشروبات', price: 12, cost: 6, stock: 40, image: '', barcode: '1005' },
    { id: 6, name: 'بيتزا', category: 'وجبات', price: 60, cost: 30, stock: 10, image: '', barcode: '1006' }
  ]);
  DB.set('customers', []);
  DB.set('suppliers', []);
  DB.set('debts', []);
  DB.set('collections', []);
  DB.set('invoices', []);
  DB.set('shifts', []);
  DB.set('attendance', []);
  DB.set('returns', []);
  DB.set('inventoryChecks', []);
  DB.set('cashChecks', []);
  DB.set('expenses', []);
  DB.set('takeawayOrders', []);
  DB.set('deliveryOrders', []);
  DB.set('drivers', []);
  DB.set('activityLog', []);
  DB.set('inventories', [{ id: 1, name: 'المخزن الرئيسي', location: 'المحل' }]);
  DB.set('settings', {
    shopName: 'TAWD Store', shopAddress: '', shopPhone: '', shopTax: '',
    shopFooter: 'شكراً لزيارتكم', loyaltyRate: 1
  });
  DB.set('license', { active: false, type: 'trial', startDate: null, endDate: null, key: null, customerName: null, deviceId: null });
  DB.set('licenseKeys', []);
  DB.set('lastBackup', null);
  DB.set('initialized', true);
}