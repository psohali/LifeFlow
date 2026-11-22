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
async function initAdminLoginPage() {
  const loginForm = document.getElementById('adminLoginForm');
  const setupForm = document.getElementById('adminSetupForm');
  if (!loginForm) return;

  const loginPanel = document.getElementById('loginPanel');
  const setupPanel = document.getElementById('setupPanel');

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (meData.authenticated && meData.user?.role === 'admin') {
      window.location.replace('/admin-dashboard.html');
      return;
    }

    const statusData = await (await fetch('/api/auth/setup-status', { credentials: 'include' })).json();
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
        throw new Error(data.message || 'Invalid login credentials.');
      }

      window.location.href = '/admin-dashboard.html';
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
      const password = setupForm.password.value;
      const confirmPassword = setupForm.confirm_password.value;

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
        btn.textContent = 'Creating Admin...';

        const res = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: setupForm.username.value.trim(),
            full_name: setupForm.full_name.value.trim(),
            email: setupForm.email.value.trim(),
            password,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to create administrator.');
        }

        window.location.href = '/admin-dashboard.html';
      } catch (err) {
        showAlert('authAlert', 'error', err.message || 'Admin setup failed.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Administrator Account';
      }
    });
  }
}

/* ==========================================================================
   Page: Admin Dashboard (admin-dashboard.html)
   ========================================================================== */
async function initAdminDashboard() {
  const dashboardRoot = document.getElementById('adminDashboardRoot');
  if (!dashboardRoot) return;

  setupTabGroups();

  try {
    const meData = await (await fetch('/api/auth/me', { credentials: 'include' })).json();
    if (!meData.authenticated || meData.user?.role !== 'admin') {
      window.location.replace('/admin-login.html');
      return;
    }

    const adminNameEl = document.getElementById('adminWelcomeName');
    if (adminNameEl && meData.user) {
      adminNameEl.textContent = `${meData.user.fullName} (${meData.user.username || meData.user.email})`;
    }
  } catch {
    window.location.replace('/admin-login.html');
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/admin-login.html';
    });
  }

  async function loadStats() {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      window.location.replace('/admin-login.html');
      return;
    }
    const data = await res.json();
    if (!data.success) return;

    document.getElementById('statTotalDonors').textContent = String(data.stats.totalDonors);
    document.getElementById('statTotalPatients').textContent = String(data.stats.totalPatients);
    document.getElementById('statTotalRequests').textContent = String(data.stats.totalRequests);
    document.getElementById('statPendingRequests').textContent = String(data.stats.pendingRequests);
    document.getElementById('statAvailableUnits').textContent = String(data.stats.availableUnits);
  }

  async function loadDonors() {
    const tbody = document.getElementById('donorsTableBody');
    const res = await fetch('/api/donors', { credentials: 'include' });
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.donors || data.donors.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'empty-state';
      td.textContent = 'No donor registrations have been submitted yet.';
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
        d.user_id ? `Account (${d.account_status || 'active'})` : 'Walk-in Form',
      ];

      cells.forEach((text, idx) => {
        const td = document.createElement('td');
        if (idx === 0) td.className = 'mono';
        if (idx === 3) {
          td.style.fontWeight = '700';
          td.style.color = 'var(--crimson)';
        }
        td.textContent = text;
        if (idx === 4) td.style.whiteSpace = 'pre-line';
        tr.appendChild(td);
      });

      const tdAction = document.createElement('td');
      if (d.user_id) {
        const nextStatus = d.account_status === 'rejected' ? 'active' : 'rejected';
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = d.account_status === 'rejected' ? 'btn btn-outline btn-sm' : 'btn btn-danger-outline btn-sm';
        toggleBtn.textContent = d.account_status === 'rejected' ? 'Activate' : 'Deactivate';
        toggleBtn.addEventListener('click', async () => {
          hideAlert('dashboardAlert');
          const res2 = await fetch(`/api/admin/users/${d.user_id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ account_status: nextStatus }),
          });
          const data2 = await res2.json();
          if (res2.ok && data2.success) {
            showAlert('dashboardAlert', 'success', data2.message);
            await loadDonors();
          } else {
            showAlert('dashboardAlert', 'error', data2.message || 'Failed to update donor status.');
          }
        });
        tdAction.appendChild(toggleBtn);
      } else {
        tdAction.textContent = formatISTDateTime(d.created_at);
      }

      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  async function loadPatients() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;

    const res = await fetch('/api/admin/patients', { credentials: 'include' });
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
        p.email,
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
      const nextStatus = p.account_status === 'rejected' ? 'active' : 'rejected';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = p.account_status === 'rejected' ? 'btn btn-outline btn-sm' : 'btn btn-danger-outline btn-sm';
      btn.textContent = p.account_status === 'rejected' ? 'Activate' : 'Deactivate';
      btn.addEventListener('click', async () => {
        hideAlert('dashboardAlert');
        const r = await fetch(`/api/admin/users/${p.user_id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ account_status: nextStatus }),
        });
        const d = await r.json();
        if (r.ok && d.success) {
          showAlert('dashboardAlert', 'success', d.message);
          await loadPatients();
        } else {
          showAlert('dashboardAlert', 'error', d.message || 'Action failed.');
        }
      });
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  async function loadRequests() {
    const tbody = document.getElementById('requestsTableBody');
    const res = await fetch('/api/requests', { credentials: 'include' });
    const data = await res.json();
    tbody.replaceChildren();

    if (!data.success || !data.requests || data.requests.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'empty-state';
      td.textContent = 'No blood requests have been submitted yet.';
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
          const patchRes = await fetch(`/api/requests/${r.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
          await Promise.all([loadStats(), loadRequests(), loadHistory()]);
        } catch (err) {
          showAlert('dashboardAlert', 'error', err.message);
        } finally {
          saveBtn.disabled = false;
        }
      });

      controls.append(select, remarksInput, saveBtn);
      tdAction.appendChild(controls);

      tr.append(tdId, tdPatient, tdContact, tdGroup, tdHospital, tdUrgency, tdStatus, tdAction);
      tbody.appendChild(tr);
    });
  }

  async function loadInventoryManager() {
    const tbody = document.getElementById('stockTableBody');
    const res = await fetch('/api/inventory', { credentials: 'include' });
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
      input.setAttribute('aria-label', `Units for ${item.blood_group}`);

      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.className = 'btn btn-primary btn-sm';
      setBtn.textContent = 'Save Units';

      const addOneBtn = document.createElement('button');
      addOneBtn.type = 'button';
      addOneBtn.className = 'btn btn-outline btn-sm';
      addOneBtn.textContent = '+1 Unit';

      async function saveStock(mode, unitsVal) {
        hideAlert('dashboardAlert');
        try {
          const putRes = await fetch(`/api/inventory/${encodeURIComponent(item.blood_group)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ mode, units: unitsVal }),
          });
          const putData = await putRes.json();
          if (!putRes.ok || !putData.success) {
            throw new Error(putData.message || 'Stock update failed.');
          }
          showAlert('dashboardAlert', 'success', putData.message);
          await Promise.all([loadStats(), loadInventoryManager()]);
        } catch (err) {
          showAlert('dashboardAlert', 'error', err.message);
        }
      }

      setBtn.addEventListener('click', () => saveStock('set', Number(input.value)));
      addOneBtn.addEventListener('click', () => saveStock('add', 1));

      wrap.append(input, setBtn, addOneBtn);
      tdControls.appendChild(wrap);

      tr.append(tdGroup, tdUnits, tdUpdated, tdControls);
      tbody.appendChild(tr);
    });
  }

  async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const res = await fetch('/api/requests/history', { credentials: 'include' });
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

  await Promise.all([
    loadStats(),
    loadDonors(),
    loadPatients(),
    loadRequests(),
    loadInventoryManager(),
    loadHistory(),
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
