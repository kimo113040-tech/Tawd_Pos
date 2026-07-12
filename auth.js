window.currentUser = null;

function login() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const users = DB.get('users', []);
  const user = users.find(x => x.username === username && x.password === password && x.active);
  if (!user) {
    document.getElementById('loginAlert').innerHTML = '<div class="alert alert-danger">❌ بيانات غير صحيحة</div>';
    return;
  }
  window.currentUser = user;
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  recordAttendance('in');
  logActivity('login', 'تسجيل دخول', 'المستخدم: ' + user.name);
  showApp();
}

function logout() {
  if (window.currentUser) {
    recordAttendance('out');
    logActivity('logout', 'تسجيل خروج', 'المستخدم: ' + window.currentUser.name);
  }
  sessionStorage.removeItem('currentUser');
  location.reload();
}

function recordAttendance(type) {
  if (!window.currentUser || window.currentUser.role === 'designer') return;
  const attendance = DB.get('attendance', []);
  const today = new Date().toDateString();
  if (type === 'in') {
    attendance.push({
      id: Date.now(), userId: window.currentUser.id, userName: window.currentUser.name,
      date: today, timeIn: new Date().toLocaleString('ar-EG'), timeOut: null
    });
  } else {
    const record = attendance.filter(a => a.userId === window.currentUser.id && a.date === today).pop();
    if (record) record.timeOut = new Date().toLocaleString('ar-EG');
  }
  DB.set('attendance', attendance);
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').classList.add('active');
  document.getElementById('userBadge').textContent = '👤 ' + window.currentUser.name + ' (' + roleLabel(window.currentUser.role) + ')';
  updateLicenseBadge();
  applyPermissions();
  navigateTo('dashboard');
}

function roleLabel(role) {
  return { designer: 'مصمم', admin: 'مدير', cashier: 'كاشير' }[role] || role;
}

function applyPermissions() {
  const role = window.currentUser.role;
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = (role === 'admin' || role === 'designer') ? '' : 'none';
  });
  document.querySelectorAll('.designer-only').forEach(el => {
    el.style.display = role === 'designer' ? '' : 'none';
  });
}

function renderUsers() {
  const users = DB.get('users', []);
  const isDesigner = window.currentUser.role === 'designer';
  const filteredUsers = isDesigner ? users : users.filter(u => u.role !== 'designer');
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = filteredUsers.map(user => {
    const isDesignerUser = user.role === 'designer';
    const canEdit = isDesigner || (window.currentUser.role === 'admin' && !isDesignerUser);
    return `<tr>
      <td>${user.name}${isDesignerUser ? ' 🔒' : ''}</td>
      <td>${user.username}</td>
      <td><span class="badge ${({designer:'badge-danger',admin:'badge-warning',cashier:'badge-success'})[user.role]}">${roleLabel(user.role)}</span></td>
      <td><span class="badge ${user.active ? 'badge-success' : 'badge-danger'}">${user.active ? 'نشط' : 'معطل'}</span></td>
      <td>${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openUserModal(${user.id})">✏️</button>${user.username !== 'designer' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">🗑️</button>` : ''}` : '<span style="color:var(--muted)">🔒 محمي</span>'}</td>
    </tr>`;
  }).join('');
}

function openUserModal(id) {
  const users = DB.get('users', []);
  const user = id ? users.find(x => x.id === id) : { name: '', username: '', password: '', role: 'cashier', active: true };
  const isDesignerUser = user.role === 'designer';
  const canEdit = window.currentUser.role === 'designer' || (window.currentUser.role === 'admin' && !isDesignerUser);
  if (!canEdit) { alert('⚠️ لا يمكنك تعديل بيانات المصمم'); return; }
  document.getElementById('modalTitle').textContent = id ? 'تعديل مستخدم' : 'مستخدم جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>الاسم</label><input type="text" id="uName" value="${user.name}"></div>
    <div class="form-group"><label>اسم المستخدم</label><input type="text" id="uUsername" value="${user.username}"></div>
    <div class="form-group"><label>كلمة المرور</label><input type="password" id="uPassword" value="${user.password}"></div>
    <div class="form-group"><label>الدور</label>
      <select id="uRole" ${isDesignerUser && window.currentUser.role !== 'designer' ? 'disabled' : ''}>
        <option value="cashier" ${user.role === 'cashier' ? 'selected' : ''}>كاشير</option>
        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
        ${window.currentUser.role === 'designer' ? `<option value="designer" ${user.role === 'designer' ? 'selected' : ''}>مصمم</option>` : ''}
      </select>
    </div>
    <div class="form-group"><label><input type="checkbox" id="uActive" ${user.active ? 'checked' : ''}> نشط</label></div>
    ${isDesignerUser ? '<div class="designer-protected">🔒 هذا حساب المصمم - محمي بالكامل</div>' : ''}
    <button class="btn btn-success btn-block" onclick="saveUser(${id || 'null'})">💾 حفظ</button>
  `;
  openModal();
}

function saveUser(id) {
  const users = DB.get('users', []);
  const data = {
    name: document.getElementById('uName').value.trim(),
    username: document.getElementById('uUsername').value.trim(),
    password: document.getElementById('uPassword').value,
    role: document.getElementById('uRole').value,
    active: document.getElementById('uActive').checked
  };
  if (!data.name || !data.username || !data.password) { alert('⚠️ جميع الحقول مطلوبة'); return; }
  if (id) {
    const idx = users.findIndex(x => x.id === id);
    if (users[idx].role === 'designer' && window.currentUser.role !== 'designer') {
      alert('⚠️ لا يمكنك تعديل بيانات المصمم'); return;
    }
    users[idx] = { ...users[idx], ...data };
  } else { data.id = Date.now(); users.push(data); }
  DB.set('users', users);
  closeModal();
  renderUsers();
  showToast('✅ تم الحفظ', 'success');
}

function deleteUser(id) {
  if (!confirm('حذف المستخدم؟')) return;
  const users = DB.get('users', []);
  const user = users.find(x => x.id === id);
  if (user && user.role === 'designer') { alert('⚠️ لا يمكنك حذف حساب المصمم'); return; }
  DB.set('users', users.filter(u => u.id !== id));
  renderUsers();
  showToast('✅ تم الحذف', 'success');
}

function renderAttendance() {
  const attendance = DB.get('attendance', []);
  const tbody = document.getElementById('attendanceTable');
  if (!tbody) return;
  tbody.innerHTML = attendance.slice().reverse().map(record => {
    let hours = '-';
    if (record.timeIn && record.timeOut) {
      hours = ((new Date(record.timeOut) - new Date(record.timeIn)) / 3600000).toFixed(1);
    }
    return `<tr><td>${record.userName}</td><td>${record.date}</td><td>${record.timeIn || '-'}</td><td>${record.timeOut || '-'}</td><td>${hours}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty">لا توجد سجلات</td></tr>';
}