const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

function formatISTDateTime(value) {
  if (!value) return '—';
  const raw = String(value);
  const normalized = raw.includes('T') || raw.endsWith('Z') ? raw : `${raw.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;

  const datePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\//g, '-');

  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${datePart}, ${timePart} IST`;
}

function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

function stripPhonePrefix(phoneStr) {
  return normalizePhone(phoneStr || '');
}

function isValidIndianMobile(digits) {
  return /^[6-9]\d{9}$/.test(digits);
}

function isValidIndianPin(pin) {
  return /^[1-9]\d{5}$/.test(String(pin || '').trim());
}

function showAlert(containerId, type, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideAlert(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
}

function populateStateDropdowns() {
  const selects = document.querySelectorAll('select.indian-state-select, select#state');
  selects.forEach((select) => {
    if (select.options.length > 1) return;
    INDIAN_STATES_AND_UTS.forEach((stateName) => {
      const opt = document.createElement('option');
      opt.value = stateName;
      opt.textContent = stateName;
      select.appendChild(opt);
    });
  });
}

function setupTabGroups() {
  const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-panel');
  if (!tabButtons.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.add('hidden'));
      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove('hidden');
    });
  });
}

function setupAuthSwitcher() {
  const btns = document.querySelectorAll('.auth-switcher-btn[data-panel]');
  const panels = document.querySelectorAll('.auth-panel');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.panel;
      btns.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.add('hidden'));
      btn.classList.add('active');
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('hidden');
      hideAlert('authAlert');
    });
  });
}

async function fetchInventoryIntoGrid(gridId, totalId, updatedId, alertId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const totalEl = totalId ? document.getElementById(totalId) : null;
  const updatedEl = updatedId ? document.getElementById(updatedId) : null;

  if (alertId) hideAlert(alertId);

  try {
    const res = await fetch('/api/inventory', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not load blood inventory.');
    }

    if (totalEl) totalEl.textContent = `${data.totalUnits} Units`;

    const latestTimestamp = data.inventory
      .map((item) => item.updated_at)
      .filter(Boolean)
      .sort()
      .pop();
    if (updatedEl) {
      updatedEl.textContent = latestTimestamp ? formatISTDateTime(latestTimestamp) : '—';
    }

    grid.replaceChildren();
    data.inventory.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'blood-card';

      const top = document.createElement('div');
      top.className = 'blood-card-top';

      const groupLabel = document.createElement('span');
      groupLabel.className = 'blood-group-label';
      groupLabel.textContent = item.blood_group;

      const status = document.createElement('span');
      const units = Number(item.units_available);
      if (units === 0) {
        status.className = 'status-text status-empty';
        status.textContent = 'Out of Stock';
      } else if (units < 10) {
        status.className = 'status-text status-low';
        status.textContent = 'Low Stock';
      } else {
        status.className = 'status-text status-available';
        status.textContent = 'Available';
      }

      top.appendChild(groupLabel);
      top.appendChild(status);

      const unitsEl = document.createElement('div');
      unitsEl.className = 'blood-units-value';
      unitsEl.textContent = String(units);

      const captionEl = document.createElement('div');
      captionEl.className = 'blood-units-caption';
      captionEl.textContent = units === 1 ? 'Sample unit available' : 'Sample units available';

      card.appendChild(top);
      card.appendChild(unitsEl);
      card.appendChild(captionEl);
      grid.appendChild(card);
    });
  } catch (err) {
    if (alertId) showAlert(alertId, 'error', err.message || 'Unable to load inventory.');
  }
}

/* ==========================================================================
   Page: Blood Availability (availability.html)
   ========================================================================== */
async function initAvailabilityPage() {
  const grid = document.getElementById('bloodInventoryGrid');
  if (!grid) return;

  const refreshBtn = document.getElementById('refreshInventoryBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () =>
      fetchInventoryIntoGrid('bloodInventoryGrid', 'totalUnitsDisplay', 'lastUpdatedDisplay', 'availabilityAlert')
    );
  }
  await fetchInventoryIntoGrid('bloodInventoryGrid', 'totalUnitsDisplay', 'lastUpdatedDisplay', 'availabilityAlert');
}

/* ==========================================================================
   Page: Public Donate Blood (donate.html)
   ========================================================================== */
function initDonorForm() {
  const form = document.getElementById('donorForm');
  if (!form) return;

  populateStateDropdowns();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('donorAlert');

    const submitBtn = document.getElementById('donorSubmitBtn');
    const phoneDigits = normalizePhone(form.phone.value);
    const pinCode = form.pin_code.value.trim();
    const age = Number(form.age.value);

    if (!Number.isInteger(age) || age < 18 || age > 65) {
      showAlert('donorAlert', 'error', 'Donor age must be between 18 and 65 years.');
      return;
    }
    if (!isValidIndianMobile(phoneDigits)) {
      showAlert(
        'donorAlert',
        'error',
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    if (!isValidIndianPin(pinCode)) {
      showAlert('donorAlert', 'error', 'Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    const payload = {
      full_name: form.full_name.value.trim(),
      age,
      gender: form.gender.value,
      blood_group: form.blood_group.value,
      phone: phoneDigits,
      email: form.email.value.trim(),
      house_street: form.house_street.value.trim(),
      area: form.area.value.trim(),
      city: form.city.value.trim(),
      district: form.district.value.trim(),
      state: form.state.value,
      pin_code: pinCode,
    };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const res = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not save donor registration.');
      }

      showAlert('donorAlert', 'success', `${data.message} Registration ID: #${data.donorId}.`);
      form.reset();
    } catch (err) {
      showAlert('donorAlert', 'error', err.message || 'Failed to submit registration.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register as Donor';
    }
  });
}

/* ==========================================================================
   Page: Public Request Blood (request.html)
   ========================================================================== */
function initRequestForm() {
  const form = document.getElementById('requestForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('requestAlert');

    const submitBtn = document.getElementById('requestSubmitBtn');
    const phoneDigits = normalizePhone(form.phone.value);
    const unitsRequired = Number(form.units_required.value);

    if (!isValidIndianMobile(phoneDigits)) {
      showAlert(
        'requestAlert',
        'error',
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    if (!Number.isInteger(unitsRequired) || unitsRequired < 1 || unitsRequired > 20) {
      showAlert('requestAlert', 'error', 'Units required must be between 1 and 20.');
      return;
    }

    const payload = {
      patient_name: form.patient_name.value.trim(),
      requester_name: form.requester_name.value.trim(),
      phone: phoneDigits,
      blood_group: form.blood_group.value,
      units_required: unitsRequired,
      hospital_name: form.hospital_name.value.trim(),
      location: form.location.value.trim(),
      urgency: form.urgency.value,
    };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not submit blood request.');
      }

      showAlert(
        'requestAlert',
        'success',
        `${data.message} Request Reference: #${data.requestId} (Status: ${data.status}).`
      );
      form.reset();
    } catch (err) {
      showAlert('requestAlert', 'error', err.message || 'Failed to submit blood request.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Blood Request';
    }
  });
}

/* ==========================================================================
   Page: Role Selection Portal (login.html)
   ========================================================================== */
async function initLoginPortalPage() {
  const banner = document.getElementById('activeSessionBanner');
  if (!banner) return;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (data.authenticated && data.user) {
      const dashMap = {
        donor: '/donor-dashboard.html',
        patient: '/patient-dashboard.html',
        admin: '/admin-dashboard.html',
      };
      const target = dashMap[data.user.role] || '/index.html';
      banner.classList.remove('hidden');
      const link = document.getElementById('activeSessionDashLink');
      const text = document.getElementById('activeSessionText');
      if (text) {
        text.textContent = `Currently signed in as ${data.user.fullName} (${data.user.role}).`;
      }
      if (link) {
        link.href = target;
      }
    }
  } catch {
    // Ignore session probe error on login selector
  }
}

/* ==========================================================================
   Page: Donor Login & Registration (donor-login.html)
   ========================================================================== */
async function initDonorLoginPage() {
  const loginForm = document.getElementById('donorLoginForm');
  const regForm = document.getElementById('donorRegisterForm');
  if (!loginForm || !regForm) return;

  setupAuthSwitcher();
  populateStateDropdowns();

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (meData.authenticated && meData.user?.role === 'donor') {
      window.location.replace('/donor-dashboard.html');
      return;
    }
  } catch {
    // Continue to login form
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('authAlert');
    const btn = document.getElementById('donorLoginBtn');

    try {
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      const res = await fetch('/api/auth/donor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: loginForm.identifier.value.trim(),
          password: loginForm.password.value,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Sign in failed.');
      }

      window.location.href = data.redirectUrl || '/donor-dashboard.html';
    } catch (err) {
      showAlert('authAlert', 'error', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In as Donor';
    }
  });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('authAlert');
    const btn = document.getElementById('donorRegBtn');

    const age = Number(regForm.age.value);
    const phoneDigits = normalizePhone(regForm.phone.value);
    const pinCode = regForm.pin_code.value.trim();
    const password = regForm.password.value;
    const confirmPassword = regForm.confirm_password.value;

    if (!Number.isInteger(age) || age < 18 || age > 65) {
      showAlert('authAlert', 'error', 'Age must be between 18 and 65 years.');
      return;
    }
    if (!isValidIndianMobile(phoneDigits)) {
      showAlert(
        'authAlert',
        'error',
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    if (!isValidIndianPin(pinCode)) {
      showAlert('authAlert', 'error', 'Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    if (password.length < 8) {
      showAlert('authAlert', 'error', 'Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('authAlert', 'error', 'Passwords do not match.');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Creating Account...';

      const res = await fetch('/api/auth/donor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: regForm.full_name.value.trim(),
          age,
          gender: regForm.gender.value,
          blood_group: regForm.blood_group.value,
          phone: phoneDigits,
          email: regForm.email.value.trim(),
          house_street: regForm.house_street.value.trim(),
          area: regForm.area.value.trim(),
          city: regForm.city.value.trim(),
          district: regForm.district.value.trim(),
          state: regForm.state.value,
          pin_code: pinCode,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      window.location.href = data.redirectUrl || '/donor-dashboard.html';
    } catch (err) {
      showAlert('authAlert', 'error', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Donor Account';
    }
  });
}

/* ==========================================================================
   Page: Donor Dashboard (donor-dashboard.html)
   ========================================================================== */
async function initDonorDashboard() {
  const root = document.getElementById('donorDashboardRoot');
  if (!root) return;

  setupTabGroups();
  populateStateDropdowns();

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (!meData.authenticated || meData.user?.role !== 'donor') {
      window.location.replace('/donor-login.html');
      return;
    }
  } catch {
    window.location.replace('/donor-login.html');
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/donor-login.html';
    });
  }

  async function loadProfile() {
    const res = await fetch('/api/donors/me/profile', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) return;

    const u = data.user;
    const d = data.donor;
    document.getElementById('donorWelcomeName').textContent = u.full_name;
    document.getElementById('donorBloodBadge').textContent = d ? d.blood_group : '—';
    document.getElementById('donorCityStat').textContent = d ? `${d.city}, ${d.state}` : '—';

    const kv = document.getElementById('donorProfileSummary');
    kv.replaceChildren();
    const fields = [
      ['Full Name', u.full_name],
      ['Email Address', u.email],
      ['Mobile Number', u.phone || '—'],
      ['Blood Group', d ? d.blood_group : '—'],
      ['Age & Gender', d ? `${d.age} yrs · ${d.gender}` : '—'],
      [
        'Registered Address',
        d ? `${d.house_street}, ${d.area}, ${d.city}, ${d.district}, ${d.state} - ${d.pin_code}` : '—',
      ],
      ['Account Status', u.account_status],
      ['Member Since', formatISTDateTime(u.created_at)],
    ];
    fields.forEach(([label, val]) => {
      const wrap = document.createElement('div');
      wrap.className = 'profile-kv-item';
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = val;
      wrap.append(dt, dd);
      kv.appendChild(wrap);
    });

    const editForm = document.getElementById('donorEditForm');
    if (editForm && d) {
      editForm.full_name.value = d.full_name;
      editForm.age.value = d.age;
      editForm.gender.value = d.gender;
      editForm.phone.value = stripPhonePrefix(d.phone);
      editForm.house_street.value = d.house_street;
      editForm.area.value = d.area;
      editForm.city.value = d.city;
      editForm.district.value = d.district;
      editForm.state.value = d.state;
      editForm.pin_code.value = d.pin_code;
    }
  }

  async function loadOpportunities() {
    const res = await fetch('/api/donors/me/requests', { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('donorRequestsBody');
    const matchCountEl = document.getElementById('donorMatchCount');

    if (!res.ok || !data.success) return;
    if (matchCountEl) matchCountEl.textContent = String(data.matchingRequests.length);

    tbody.replaceChildren();
    if (!data.matchingRequests.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'empty-state';
      td.textContent = `No active blood requests currently match your blood group (${data.donorBloodGroup || 'any'}).`;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.matchingRequests.forEach((r) => {
      const tr = document.createElement('tr');
      const cells = [
        `#${r.id}`,
        r.blood_group,
        `${r.units_required} unit(s)`,
        `${r.hospital_name}, ${r.location}`,
        r.urgency,
        `${r.status} · ${formatISTDateTime(r.created_at)}`,
      ];
      cells.forEach((val, idx) => {
        const td = document.createElement('td');
        if (idx === 0) td.className = 'mono';
        if (idx === 1) {
          td.style.fontWeight = '700';
          td.style.color = 'var(--crimson)';
        }
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  const editForm = document.getElementById('donorEditForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('donorDashAlert');
      const btn = document.getElementById('donorSaveProfileBtn');
      const phoneDigits = normalizePhone(editForm.phone.value);
      const pinCode = editForm.pin_code.value.trim();

      if (!isValidIndianMobile(phoneDigits)) {
        showAlert('donorDashAlert', 'error', 'Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!isValidIndianPin(pinCode)) {
        showAlert('donorDashAlert', 'error', 'Please enter a valid 6-digit Indian PIN code.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Saving...';
        const res = await fetch('/api/donors/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            full_name: editForm.full_name.value.trim(),
            age: Number(editForm.age.value),
            gender: editForm.gender.value,
            phone: phoneDigits,
            house_street: editForm.house_street.value.trim(),
            area: editForm.area.value.trim(),
            city: editForm.city.value.trim(),
            district: editForm.district.value.trim(),
            state: editForm.state.value,
            pin_code: pinCode,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed.');

        showAlert('donorDashAlert', 'success', data.message);
        await loadProfile();
      } catch (err) {
        showAlert('donorDashAlert', 'error', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile Changes';
      }
    });
  }

  await Promise.all([loadProfile(), loadOpportunities()]);
}

/* ==========================================================================
   Page: Patient Login & Registration (patient-login.html)
   ========================================================================== */
async function initPatientLoginPage() {
  const loginForm = document.getElementById('patientLoginForm');
  const regForm = document.getElementById('patientRegisterForm');
  if (!loginForm || !regForm) return;

  setupAuthSwitcher();

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (meData.authenticated && meData.user?.role === 'patient') {
      window.location.replace('/patient-dashboard.html');
      return;
    }
  } catch {
    // Continue to login form
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('authAlert');
    const btn = document.getElementById('patientLoginBtn');

    try {
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      const res = await fetch('/api/auth/patient/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: loginForm.identifier.value.trim(),
          password: loginForm.password.value,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Sign in failed.');

      window.location.href = data.redirectUrl || '/patient-dashboard.html';
    } catch (err) {
      showAlert('authAlert', 'error', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In as Patient';
    }
  });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('authAlert');
    const btn = document.getElementById('patientRegBtn');

    const phoneDigits = normalizePhone(regForm.phone.value);
    const password = regForm.password.value;
    const confirmPassword = regForm.confirm_password.value;

    if (!isValidIndianMobile(phoneDigits)) {
      showAlert(
        'authAlert',
        'error',
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    if (password.length < 8) {
      showAlert('authAlert', 'error', 'Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('authAlert', 'error', 'Passwords do not match.');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Creating Account...';

      const res = await fetch('/api/auth/patient/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: regForm.full_name.value.trim(),
          phone: phoneDigits,
          email: regForm.email.value.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Registration failed.');

      window.location.href = data.redirectUrl || '/patient-dashboard.html';
    } catch (err) {
      showAlert('authAlert', 'error', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Patient Account';
    }
  });
}

/* ==========================================================================
   Page: Patient Dashboard (patient-dashboard.html)
   ========================================================================== */
async function initPatientDashboard() {
  const root = document.getElementById('patientDashboardRoot');
  if (!root) return;

  setupTabGroups();

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (!meData.authenticated || meData.user?.role !== 'patient') {
      window.location.replace('/patient-login.html');
      return;
    }
  } catch {
    window.location.replace('/patient-login.html');
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/patient-login.html';
    });
  }

  async function loadProfile() {
    const res = await fetch('/api/patient/profile', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const u = data.user;

    document.getElementById('patientWelcomeName').textContent = u.full_name;
    const editForm = document.getElementById('patientProfileForm');
    if (editForm) {
      editForm.full_name.value = u.full_name;
      editForm.phone.value = stripPhonePrefix(u.phone);
      editForm.email.value = u.email;
    }

    const reqForm = document.getElementById('patientRequestForm');
    if (reqForm) {
      if (!reqForm.requester_name.value) reqForm.requester_name.value = u.full_name;
      if (!reqForm.phone.value) reqForm.phone.value = stripPhonePrefix(u.phone);
    }
  }

  async function loadMyRequests() {
    const res = await fetch('/api/patient/requests', { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('patientRequestsBody');

    if (!res.ok || !data.success) return;
    const list = data.requests || [];

    document.getElementById('patientTotalRequests').textContent = String(list.length);
    document.getElementById('patientPendingCount').textContent = String(
      list.filter((r) => r.status === 'Pending').length
    );
    document.getElementById('patientFulfilledCount').textContent = String(
      list.filter((r) => r.status === 'Fulfilled' || r.status === 'Approved').length
    );

    tbody.replaceChildren();
    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'empty-state';
      td.textContent = 'You have not submitted any blood requests yet.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    list.forEach((r) => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.className = 'mono';
      tdId.textContent = `#${r.id}`;

      const tdPatient = document.createElement('td');
      tdPatient.textContent = `${r.patient_name} (Req: ${r.requester_name})`;

      const tdGroup = document.createElement('td');
      tdGroup.style.fontWeight = '700';
      tdGroup.style.color = 'var(--crimson)';
      tdGroup.textContent = `${r.blood_group} · ${r.units_required} unit(s)`;

      const tdHospital = document.createElement('td');
      tdHospital.textContent = `${r.hospital_name}, ${r.location}`;

      const tdUrgency = document.createElement('td');
      tdUrgency.textContent = r.urgency;

      const tdStatus = document.createElement('td');
      tdStatus.className = `status-text status-${r.status.toLowerCase()}`;
      tdStatus.textContent = r.status;

      const tdAction = document.createElement('td');
      const detailsBtn = document.createElement('button');
      detailsBtn.type = 'button';
      detailsBtn.className = 'btn btn-outline btn-sm';
      detailsBtn.textContent = 'Track History';
      detailsBtn.addEventListener('click', async () => {
        const panel = document.getElementById('patientRequestHistoryPanel');
        const histList = document.getElementById('patientHistoryBody');
        const titleEl = document.getElementById('patientHistoryTitle');
        if (!panel || !histList) return;

        const hRes = await fetch(`/api/patient/requests/${r.id}/history`, { credentials: 'include' });
        const hData = await hRes.json();
        if (!hRes.ok || !hData.success) return;

        if (titleEl) titleEl.textContent = `Status Timeline for Request #${r.id} (${r.patient_name})`;
        histList.replaceChildren();
        hData.history.forEach((h) => {
          const htr = document.createElement('tr');
          const c1 = document.createElement('td');
          c1.textContent = h.old_status ? `${h.old_status} → ${h.new_status}` : `Created → ${h.new_status}`;
          const c2 = document.createElement('td');
          c2.textContent = h.remarks || '—';
          const c3 = document.createElement('td');
          c3.textContent = formatISTDateTime(h.changed_at);
          htr.append(c1, c2, c3);
          histList.appendChild(htr);
        });
        panel.classList.remove('hidden');
      });
      tdAction.appendChild(detailsBtn);

      tr.append(tdId, tdPatient, tdGroup, tdHospital, tdUrgency, tdStatus, tdAction);
      tbody.appendChild(tr);
    });
  }

  const reqForm = document.getElementById('patientRequestForm');
  if (reqForm) {
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('patientDashAlert');
      const btn = document.getElementById('patientRequestBtn');
      const phoneDigits = normalizePhone(reqForm.phone.value);
      const unitsRequired = Number(reqForm.units_required.value);

      if (!isValidIndianMobile(phoneDigits)) {
        showAlert('patientDashAlert', 'error', 'Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!Number.isInteger(unitsRequired) || unitsRequired < 1 || unitsRequired > 20) {
        showAlert('patientDashAlert', 'error', 'Units required must be between 1 and 20.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        const res = await fetch('/api/patient/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            patient_name: reqForm.patient_name.value.trim(),
            requester_name: reqForm.requester_name.value.trim(),
            phone: phoneDigits,
            blood_group: reqForm.blood_group.value,
            units_required: unitsRequired,
            hospital_name: reqForm.hospital_name.value.trim(),
            location: reqForm.location.value.trim(),
            urgency: reqForm.urgency.value,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Submission failed.');

        showAlert('patientDashAlert', 'success', `${data.message} Reference: #${data.requestId}.`);
        reqForm.reset();
        await loadProfile();
        await loadMyRequests();
      } catch (err) {
        showAlert('patientDashAlert', 'error', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Blood Request';
      }
    });
  }

  const profileForm = document.getElementById('patientProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('patientDashAlert');
      const btn = document.getElementById('patientSaveProfileBtn');
      const phoneDigits = normalizePhone(profileForm.phone.value);

      if (!isValidIndianMobile(phoneDigits)) {
        showAlert('patientDashAlert', 'error', 'Please enter a valid 10-digit Indian mobile number.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Saving...';
        const res = await fetch('/api/patient/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            full_name: profileForm.full_name.value.trim(),
            phone: phoneDigits,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed.');

        showAlert('patientDashAlert', 'success', data.message);
        await loadProfile();
      } catch (err) {
        showAlert('patientDashAlert', 'error', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    });
  }

  await Promise.all([loadProfile(), loadMyRequests()]);
}

/* ==========================================================================
   Page: Admin Login (admin-login.html)
   ========================================================================== */
async function openAdminDashboardAfterAuth(token) {
  try {
    const probeRes = await fetch('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
    });
    const probeData = await probeRes.json();
    if (probeData.authenticated && probeData.user?.role === 'admin') {
      window.location.href = '/admin-dashboard.html';
      return;
    }
  } catch {
    // Fall back to in-memory Bearer shell when iframe third-party cookies are blocked
  }

  if (!token) {
    window.location.href = '/admin-dashboard.html';
    return;
  }

  const shellRes = await fetch('/api/admin/shell', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    cache: 'no-store',
  });
  if (!shellRes.ok) {
    throw new Error('Could not open the Admin Dashboard.');
  }

  const html = await shellRes.text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const newMain = parsed.querySelector('#adminDashboardRoot');
  const currentMain = document.querySelector('main');
  if (!newMain || !currentMain) {
    window.location.href = '/admin-dashboard.html';
    return;
  }

  document.title = parsed.title || 'Admin Dashboard – LifeFlow (India)';
  const currentHeaderActions = document.querySelector('.header-actions');
  const newHeaderActions = parsed.querySelector('.header-actions');
  if (currentHeaderActions && newHeaderActions) {
    currentHeaderActions.replaceChildren(
      ...Array.from(newHeaderActions.childNodes).map((n) => document.importNode(n, true))
    );
  }

  currentMain.replaceWith(document.importNode(newMain, true));
  await initAdminDashboard(token);
}

async function initAdminLoginPage() {
  const loginForm = document.getElementById('adminLoginForm');
  const setupForm = document.getElementById('adminSetupForm');
  if (!loginForm) return;

  const loginPanel = document.getElementById('loginPanel');
  const setupPanel = document.getElementById('setupPanel');

  try {
    const meData = await (
      await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    ).json();
    if (meData.authenticated && meData.user?.role === 'admin') {
      window.location.replace('/admin-dashboard.html');
      return;
    }

    const statusData = await (
      await fetch('/api/auth/setup-status', { credentials: 'include', cache: 'no-store' })
    ).json();
    if (statusData.success && statusData.hasAdmin === false && setupPanel) {
      setupPanel.classList.remove('hidden');
      loginPanel.classList.add('hidden');
    } else {
      loginPanel.classList.remove('hidden');
      if (setupPanel) setupPanel.classList.add('hidden');
    }
  } catch {
    loginPanel.classList.remove('hidden');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('authAlert');

    const btn = document.getElementById('loginSubmitBtn');
    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;

    try {
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid username or password.');
      }

      await openAdminDashboardAfterAuth(data.token || null);
    } catch (err) {
      showAlert('authAlert', 'error', err.message || 'Sign in failed.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  if (setupForm) {
    setupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('authAlert');

      const btn = document.getElementById('setupSubmitBtn');
      const username = setupForm.username.value.trim();
      const password = setupForm.password.value;

      if (!/^[a-z0-9_.-]{3,30}$/i.test(username)) {
        showAlert(
          'authAlert',
          'error',
          'Username must be 3–30 characters using letters, numbers, dots, hyphens, or underscores.'
        );
        return;
      }
      if (password.length < 8) {
        showAlert('authAlert', 'error', 'Password must be at least 8 characters long.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Creating Admin...';

        const res = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to create administrator.');
        }

        await openAdminDashboardAfterAuth(data.token || null);
      } catch (err) {
        showAlert('authAlert', 'error', err.message || 'Admin setup failed.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create & Sign In';
      }
    });
  }
}

/* ==========================================================================
   Page: Admin Dashboard (admin-dashboard.html)
   ========================================================================== */
async function initAdminDashboard(bearerToken = null) {
  const dashboardRoot = document.getElementById('adminDashboardRoot');
  if (!dashboardRoot) return;

  function adminFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  }

  setupTabGroups();
  populateStateDropdowns();

  try {
    const meData = await (await adminFetch('/api/auth/me')).json();
    if (!meData.authenticated || meData.user?.role !== 'admin') {
      window.location.replace('/admin-login.html');
      return;
    }

    const adminNameEl = document.getElementById('adminWelcomeName');
    if (adminNameEl && meData.user) {
      adminNameEl.textContent = meData.user.username || meData.user.fullName || 'Administrator';
    }
  } catch {
    window.location.replace('/admin-login.html');
    return;
  }

  async function performLogout() {
    try {
      await adminFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network error
    }
    window.location.href = '/admin-login.html';
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', performLogout);

  async function loadStats() {
    const res = await adminFetch('/api/admin/stats');
    if (res.status === 401 || res.status === 403) {
      window.location.replace('/admin-login.html');
      return;
    }
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    document.getElementById('statTotalDonors').textContent = String(s.totalDonors ?? 0);
    document.getElementById('statTotalPatients').textContent = String(s.totalPatients ?? 0);
    document.getElementById('statTotalRequests').textContent = String(s.totalRequests ?? 0);
    document.getElementById('statPendingRequests').textContent = String(s.pendingRequests ?? 0);
    const approvedEl = document.getElementById('statApprovedRequests');
    if (approvedEl) approvedEl.textContent = String(s.approvedRequests ?? 0);
    const fulfilledEl = document.getElementById('statFulfilledRequests');
    if (fulfilledEl) fulfilledEl.textContent = String(s.fulfilledRequests ?? 0);
    document.getElementById('statAvailableUnits').textContent = String(s.availableUnits ?? 0);
  }

  // Donor Detail & Update Card
  const donorDetailCard = document.getElementById('donorDetailCard');
  const donorEditForm = document.getElementById('adminEditDonorForm');
  const closeDonorDetailBtn = document.getElementById('closeDonorDetailBtn');
  if (closeDonorDetailBtn && donorDetailCard) {
    closeDonorDetailBtn.addEventListener('click', () => donorDetailCard.classList.add('hidden'));
  }

  function openDonorDetail(d) {
    if (!donorDetailCard || !donorEditForm) return;
    document.getElementById('donorDetailTitle').textContent = `Donor #${d.id} – ${d.full_name}`;
    donorEditForm.donor_id.value = String(d.id);
    donorEditForm.full_name.value = d.full_name || '';
    donorEditForm.age.value = String(d.age || '');
    donorEditForm.gender.value = d.gender || 'Male';
    donorEditForm.blood_group.value = d.blood_group || 'A+';
    donorEditForm.phone.value = normalizePhone(d.phone || '');
    donorEditForm.email.value = d.email || '';
    donorEditForm.house_street.value = d.house_street || '';
    donorEditForm.area.value = d.area || '';
    donorEditForm.city.value = d.city || '';
    donorEditForm.district.value = d.district || '';
    donorEditForm.state.value = d.state || '';
    donorEditForm.pin_code.value = d.pin_code || '';
    donorDetailCard.classList.remove('hidden');
    donorDetailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (donorEditForm) {
    donorEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('dashboardAlert');
      const donorId = donorEditForm.donor_id.value;
      const btn = document.getElementById('saveAdminDonorBtn');
      const phoneDigits = normalizePhone(donorEditForm.phone.value);
      const pinCode = donorEditForm.pin_code.value.trim();

      if (!isValidIndianMobile(phoneDigits)) {
        showAlert('dashboardAlert', 'error', 'Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!isValidIndianPin(pinCode)) {
        showAlert('dashboardAlert', 'error', 'Please enter a valid 6-digit Indian PIN code.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const res = await adminFetch(`/api/admin/donors/${donorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: donorEditForm.full_name.value.trim(),
            age: Number(donorEditForm.age.value),
            gender: donorEditForm.gender.value,
            blood_group: donorEditForm.blood_group.value,
            phone: phoneDigits,
            email: donorEditForm.email.value.trim(),
            house_street: donorEditForm.house_street.value.trim(),
            area: donorEditForm.area.value.trim(),
            city: donorEditForm.city.value.trim(),
            district: donorEditForm.district.value.trim(),
            state: donorEditForm.state.value,
            pin_code: pinCode,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Could not update donor.');
        showAlert('dashboardAlert', 'success', data.message);
        donorDetailCard.classList.add('hidden');
        await loadDonors();
      } catch (err) {
        showAlert('dashboardAlert', 'error', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Donor Updates';
      }
    });
  }

  const donorSearchInput = document.getElementById('donorSearchInput');
  const donorBloodFilter = document.getElementById('donorBloodFilter');
  const donorSearchResetBtn = document.getElementById('donorSearchResetBtn');

  async function loadDonors() {
    const tbody = document.getElementById('donorsTableBody');
    const params = new URLSearchParams();
    if (donorSearchInput && donorSearchInput.value.trim()) {
      params.set('q', donorSearchInput.value.trim());
    }
    if (donorBloodFilter && donorBloodFilter.value) {
      params.set('blood_group', donorBloodFilter.value);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await adminFetch(`/api/donors${queryStr}`);
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.donors || data.donors.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'empty-state';
      td.textContent = 'No matching donor registrations found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.donors.forEach((d) => {
      const tr = document.createElement('tr');

      const cells = [
        `#${d.id}`,
        d.full_name,
        `${d.age} yrs · ${d.gender}`,
        d.blood_group,
        `${d.phone}\n${d.email}`,
        `${d.house_street}, ${d.area}, ${d.city}, ${d.district}, ${d.state} - ${d.pin_code}`,
        d.user_id ? (d.account_status || 'active').toUpperCase() : 'Walk-in Form',
      ];

      cells.forEach((text, idx) => {
        const td = document.createElement('td');
        if (idx === 0) td.className = 'mono';
        if (idx === 3) {
          td.style.fontWeight = '700';
          td.style.color = 'var(--crimson)';
        }
        if (idx === 6 && d.user_id) {
          td.className = `status-text status-${d.account_status || 'active'}`;
        }
        td.textContent = text;
        if (idx === 4) td.style.whiteSpace = 'pre-line';
        tr.appendChild(td);
      });

      const tdAction = document.createElement('td');
      const controls = document.createElement('div');
      controls.className = 'inline-controls';

      const viewEditBtn = document.createElement('button');
      viewEditBtn.type = 'button';
      viewEditBtn.className = 'btn btn-outline btn-sm';
      viewEditBtn.textContent = 'View / Edit';
      viewEditBtn.addEventListener('click', () => openDonorDetail(d));
      controls.appendChild(viewEditBtn);

      if (d.user_id) {
        const nextStatus = d.account_status === 'rejected' ? 'active' : 'rejected';
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = d.account_status === 'rejected' ? 'btn btn-primary btn-sm' : 'btn btn-danger-outline btn-sm';
        toggleBtn.textContent = d.account_status === 'rejected' ? 'Activate' : 'Deactivate';
        toggleBtn.addEventListener('click', async () => {
          hideAlert('dashboardAlert');
          const res2 = await adminFetch(`/api/admin/users/${d.user_id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_status: nextStatus }),
          });
          const data2 = await res2.json();
          if (res2.ok && data2.success) {
            showAlert('dashboardAlert', 'success', data2.message);
            await Promise.all([loadDonors(), loadSecurityOverview()]);
          } else {
            showAlert('dashboardAlert', 'error', data2.message || 'Failed to update donor status.');
          }
        });
        controls.appendChild(toggleBtn);
      }

      tdAction.appendChild(controls);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  if (donorSearchInput) {
    let searchTimer = null;
    donorSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadDonors, 220);
    });
  }
  if (donorBloodFilter) {
    donorBloodFilter.addEventListener('change', loadDonors);
  }
  if (donorSearchResetBtn) {
    donorSearchResetBtn.addEventListener('click', () => {
      if (donorSearchInput) donorSearchInput.value = '';
      if (donorBloodFilter) donorBloodFilter.value = '';
      loadDonors();
    });
  }

  // Patient Requests Detail Panel
  const patientDetailCard = document.getElementById('patientRequestsDetailCard');
  const closePatientDetailBtn = document.getElementById('closePatientDetailBtn');
  if (closePatientDetailBtn && patientDetailCard) {
    closePatientDetailBtn.addEventListener('click', () => patientDetailCard.classList.add('hidden'));
  }

  async function viewPatientRequests(patient) {
    if (!patientDetailCard) return;
    const res = await adminFetch(`/api/admin/patients/${patient.user_id}/requests`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      showAlert('dashboardAlert', 'error', data.message || 'Could not load patient requests.');
      return;
    }

    document.getElementById('patientDetailTitle').textContent =
      `Blood Requests by ${data.patient.full_name} (${data.patient.phone || data.patient.email})`;

    const body = document.getElementById('patientDetailRequestsBody');
    body.replaceChildren();
    if (!data.requests || data.requests.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'empty-state';
      td.textContent = 'This patient has not submitted any blood requests yet.';
      tr.appendChild(td);
      body.appendChild(tr);
    } else {
      data.requests.forEach((r) => {
        const tr = document.createElement('tr');
        const cells = [
          `#${r.id}`,
          r.patient_name,
          `${r.blood_group} · ${r.units_required}u`,
          `${r.hospital_name}, ${r.location}`,
          r.urgency,
          r.status,
          formatISTDateTime(r.created_at),
        ];
        cells.forEach((val, idx) => {
          const td = document.createElement('td');
          if (idx === 0) td.className = 'mono';
          if (idx === 2) {
            td.style.fontWeight = '700';
            td.style.color = 'var(--crimson)';
          }
          if (idx === 5) td.className = `status-text status-${r.status.toLowerCase()}`;
          td.textContent = val;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    patientDetailCard.classList.remove('hidden');
    patientDetailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadPatients() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;

    const res = await adminFetch('/api/admin/patients');
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.patients || data.patients.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'empty-state';
      td.textContent = 'No patient accounts have been registered yet.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.patients.forEach((p) => {
      const tr = document.createElement('tr');
      const cells = [
        `#${p.user_id}`,
        p.full_name,
        p.phone || '—',
        p.email || '—',
        String(p.request_count || 0),
        p.account_status.toUpperCase(),
      ];
      cells.forEach((val, idx) => {
        const td = document.createElement('td');
        if (idx === 0 || idx === 2 || idx === 4) td.className = 'mono';
        if (idx === 5) td.className = `status-text status-${p.account_status}`;
        td.textContent = val;
        tr.appendChild(td);
      });

      const tdAction = document.createElement('td');
      const controls = document.createElement('div');
      controls.className = 'inline-controls';

      const viewReqBtn = document.createElement('button');
      viewReqBtn.type = 'button';
      viewReqBtn.className = 'btn btn-outline btn-sm';
      viewReqBtn.textContent = 'View Requests';
      viewReqBtn.addEventListener('click', () => viewPatientRequests(p));

      const nextStatus = p.account_status === 'rejected' ? 'active' : 'rejected';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = p.account_status === 'rejected' ? 'btn btn-primary btn-sm' : 'btn btn-danger-outline btn-sm';
      btn.textContent = p.account_status === 'rejected' ? 'Activate' : 'Deactivate';
      btn.addEventListener('click', async () => {
        hideAlert('dashboardAlert');
        const r = await adminFetch(`/api/admin/users/${p.user_id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_status: nextStatus }),
        });
        const d = await r.json();
        if (r.ok && d.success) {
          showAlert('dashboardAlert', 'success', d.message);
          await Promise.all([loadPatients(), loadSecurityOverview()]);
        } else {
          showAlert('dashboardAlert', 'error', d.message || 'Action failed.');
        }
      });

      controls.append(viewReqBtn, btn);
      tdAction.appendChild(controls);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  const reqBloodFilter = document.getElementById('reqBloodFilter');
  const reqUrgencyFilter = document.getElementById('reqUrgencyFilter');
  const reqStatusFilter = document.getElementById('reqStatusFilter');
  const reqFilterResetBtn = document.getElementById('reqFilterResetBtn');

  async function loadRequests() {
    const tbody = document.getElementById('requestsTableBody');
    const params = new URLSearchParams();
    if (reqBloodFilter && reqBloodFilter.value) params.set('blood_group', reqBloodFilter.value);
    if (reqUrgencyFilter && reqUrgencyFilter.value) params.set('urgency', reqUrgencyFilter.value);
    if (reqStatusFilter && reqStatusFilter.value) params.set('status', reqStatusFilter.value);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await adminFetch(`/api/requests${queryStr}`);
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.requests || data.requests.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.className = 'empty-state';
      td.textContent = 'No matching blood requests found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.requests.forEach((r) => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.className = 'mono';
      tdId.textContent = `#${r.id}`;

      const tdPatient = document.createElement('td');
      tdPatient.textContent = `${r.patient_name} (Req: ${r.requester_name})`;

      const tdContact = document.createElement('td');
      tdContact.className = 'mono';
      tdContact.textContent = r.phone;

      const tdGroup = document.createElement('td');
      tdGroup.style.fontWeight = '700';
      tdGroup.style.color = 'var(--crimson)';
      tdGroup.textContent = `${r.blood_group} · ${r.units_required}u`;

      const tdHospital = document.createElement('td');
      tdHospital.textContent = `${r.hospital_name}, ${r.location}`;

      const tdUrgency = document.createElement('td');
      tdUrgency.className =
        r.urgency === 'Emergency'
          ? 'status-text status-emergency'
          : r.urgency === 'Urgent'
          ? 'status-text status-pending'
          : 'status-text';
      tdUrgency.textContent = r.urgency;

      const tdSubmitted = document.createElement('td');
      tdSubmitted.textContent = formatISTDateTime(r.created_at);

      const tdStatus = document.createElement('td');
      tdStatus.className = `status-text status-${r.status.toLowerCase()}`;
      tdStatus.textContent = r.status;

      const tdAction = document.createElement('td');
      const controls = document.createElement('div');
      controls.className = 'inline-controls';

      const select = document.createElement('select');
      select.className = 'status-select';
      ['Pending', 'Approved', 'Rejected', 'Fulfilled'].forEach((st) => {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        if (st === r.status) opt.selected = true;
        select.appendChild(opt);
      });

      const remarksInput = document.createElement('input');
      remarksInput.type = 'text';
      remarksInput.className = 'remarks-input';
      remarksInput.placeholder = 'Remarks (optional)';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Update';

      saveBtn.addEventListener('click', async () => {
        hideAlert('dashboardAlert');
        saveBtn.disabled = true;
        try {
          const patchRes = await adminFetch(`/api/requests/${r.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: select.value,
              remarks: remarksInput.value.trim(),
            }),
          });
          const patchData = await patchRes.json();
          if (!patchRes.ok || !patchData.success) {
            throw new Error(patchData.message || 'Failed to update status.');
          }
          showAlert('dashboardAlert', 'success', patchData.message);
          await Promise.all([loadStats(), loadRequests(), loadHistory(), loadSecurityOverview()]);
        } catch (err) {
          showAlert('dashboardAlert', 'error', err.message);
        } finally {
          saveBtn.disabled = false;
        }
      });

      controls.append(select, remarksInput, saveBtn);
      tdAction.appendChild(controls);

      tr.append(
        tdId,
        tdPatient,
        tdContact,
        tdGroup,
        tdHospital,
        tdUrgency,
        tdSubmitted,
        tdStatus,
        tdAction
      );
      tbody.appendChild(tr);
    });
  }

  [reqBloodFilter, reqUrgencyFilter, reqStatusFilter].forEach((el) => {
    if (el) el.addEventListener('change', loadRequests);
  });
  if (reqFilterResetBtn) {
    reqFilterResetBtn.addEventListener('click', () => {
      if (reqBloodFilter) reqBloodFilter.value = '';
      if (reqUrgencyFilter) reqUrgencyFilter.value = '';
      if (reqStatusFilter) reqStatusFilter.value = '';
      loadRequests();
    });
  }

  async function loadInventoryManager() {
    const tbody = document.getElementById('stockTableBody');
    const res = await adminFetch('/api/inventory');
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.inventory) return;

    data.inventory.forEach((item) => {
      const tr = document.createElement('tr');

      const tdGroup = document.createElement('td');
      tdGroup.style.fontWeight = '700';
      tdGroup.style.color = 'var(--crimson)';
      tdGroup.textContent = item.blood_group;

      const tdUnits = document.createElement('td');
      tdUnits.className = 'mono';
      tdUnits.textContent = `${item.units_available} units`;

      const tdUpdated = document.createElement('td');
      tdUpdated.textContent = formatISTDateTime(item.updated_at);

      const tdControls = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.className = 'inline-controls';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '10000';
      input.value = String(item.units_available);
      input.className = 'stock-input';
      input.setAttribute('aria-label', `Set total units for ${item.blood_group}`);

      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.className = 'btn btn-primary btn-sm';
      setBtn.textContent = 'Save Quantity';

      const addInput = document.createElement('input');
      addInput.type = 'number';
      addInput.min = '1';
      addInput.max = '500';
      addInput.value = '1';
      addInput.className = 'stock-input';
      addInput.style.width = '74px';
      addInput.setAttribute('aria-label', `Add units for ${item.blood_group}`);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-outline btn-sm';
      addBtn.textContent = '+ Add Units';

      async function saveStock(mode, unitsVal) {
        hideAlert('dashboardAlert');
        try {
          const putRes = await adminFetch(`/api/inventory/${encodeURIComponent(item.blood_group)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, units: unitsVal }),
          });
          const putData = await putRes.json();
          if (!putRes.ok || !putData.success) {
            throw new Error(putData.message || 'Stock update failed.');
          }
          showAlert('dashboardAlert', 'success', putData.message);
          await Promise.all([
            loadStats(),
            loadInventoryManager(),
            fetchInventoryIntoGrid('overviewInventoryGrid', null, null, 'dashboardAlert'),
          ]);
        } catch (err) {
          showAlert('dashboardAlert', 'error', err.message);
        }
      }

      setBtn.addEventListener('click', () => saveStock('set', Number(input.value)));
      addBtn.addEventListener('click', () => saveStock('add', Number(addInput.value)));

      wrap.append(input, setBtn, addInput, addBtn);
      tdControls.appendChild(wrap);

      tr.append(tdGroup, tdUnits, tdUpdated, tdControls);
      tbody.appendChild(tr);
    });
  }

  async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const res = await adminFetch('/api/requests/history');
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.history || data.history.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'empty-state';
      td.textContent = 'No request status history recorded yet.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.history.forEach((h) => {
      const tr = document.createElement('tr');
      const actor = h.actor_name ? `${h.actor_name} (${h.actor_role})` : 'Portal Submission';
      const cells = [
        `#${h.request_id}`,
        h.patient_name ? `${h.patient_name} (${h.blood_group})` : '—',
        h.old_status ? `${h.old_status} → ${h.new_status}` : `Created → ${h.new_status}`,
        actor,
        h.remarks || '—',
        formatISTDateTime(h.changed_at),
      ];
      cells.forEach((text, idx) => {
        const td = document.createElement('td');
        if (idx === 0) td.className = 'mono';
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  const adminPasswordForm = document.getElementById('adminPasswordForm');
  if (adminPasswordForm) {
    adminPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('dashboardAlert');
      const btn = document.getElementById('changeAdminPassBtn');
      const currentPassword = adminPasswordForm.current_password.value;
      const newPassword = adminPasswordForm.new_password.value;
      const confirmPassword = adminPasswordForm.confirm_password.value;

      if (newPassword.length < 8) {
        showAlert('dashboardAlert', 'error', 'New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAlert('dashboardAlert', 'error', 'New passwords do not match.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Updating...';
        const res = await adminFetch('/api/admin/password', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Could not update password.');
        }
        showAlert('dashboardAlert', 'success', data.message);
        adminPasswordForm.reset();
      } catch (err) {
        showAlert('dashboardAlert', 'error', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    });
  }

  async function loadSecurityOverview() {
    const usernameEl = document.getElementById('secAdminUsername');
    if (!usernameEl) return;

    const res = await adminFetch('/api/admin/security');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.account) return;

    const a = data.account;
    const s = data.summary || {};

    usernameEl.textContent = a.username || 'Admin';
    const idRoleEl = document.getElementById('secAdminUserIdRole');
    if (idRoleEl) idRoleEl.textContent = `#${a.userId} · Administrator`;
    const statusEl = document.getElementById('secAdminStatus');
    if (statusEl) {
      statusEl.textContent = String(a.accountStatus || 'active').toUpperCase();
      statusEl.className = `status-text status-${a.accountStatus || 'active'}`;
    }
    const createdEl = document.getElementById('secAdminCreated');
    if (createdEl) createdEl.textContent = a.createdAt ? formatISTDateTime(a.createdAt) : '—';
    const donorAccEl = document.getElementById('secDonorAccounts');
    if (donorAccEl) {
      donorAccEl.textContent = `${s.activeDonors ?? 0} Active / ${s.deactivatedDonors ?? 0} Deactivated`;
    }
    const patientAccEl = document.getElementById('secPatientAccounts');
    if (patientAccEl) {
      patientAccEl.textContent = `${s.activePatients ?? 0} Active / ${s.deactivatedPatients ?? 0} Deactivated`;
    }
    const actionsEl = document.getElementById('secAdminActions');
    if (actionsEl) actionsEl.textContent = String(s.adminActionsCount ?? 0);
  }

  await Promise.all([
    loadStats(),
    loadDonors(),
    loadPatients(),
    loadRequests(),
    loadInventoryManager(),
    loadHistory(),
    loadSecurityOverview(),
    fetchInventoryIntoGrid('overviewInventoryGrid', null, null, 'dashboardAlert'),
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initAvailabilityPage();
  initDonorForm();
  initRequestForm();
  initLoginPortalPage();
  initDonorLoginPage();
  initDonorDashboard();
  initPatientLoginPage();
  initPatientDashboard();
  initAdminLoginPage();
  initAdminDashboard();
});
