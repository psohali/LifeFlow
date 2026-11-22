import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Idempotent Indian sample demonstration dataset for LifeFlow.
 * Populates donors, patients, blood requests, and request history ONLY when
 * the portal has no donors, patients, or blood requests yet.
 */
export async function seedSamplePortalData(db) {
  const [[donorCountRow]] = await db.execute('SELECT COUNT(*) AS count FROM donors');
  const [[requestCountRow]] = await db.execute('SELECT COUNT(*) AS count FROM blood_requests');
  const [[portalUserRow]] = await db.execute(
    "SELECT COUNT(*) AS count FROM users WHERE role IN ('donor', 'patient')"
  );

  if (
    Number(donorCountRow?.count || 0) > 0 ||
    Number(requestCountRow?.count || 0) > 0 ||
    Number(portalUserRow?.count || 0) > 0
  ) {
    return false;
  }

  // Generate random non-reusable password hashes for demo accounts (no hardcoded passwords)
  const demoSecret = crypto.randomBytes(16).toString('hex');
  const demoHash = await bcrypt.hash(demoSecret, 10);

  const [[adminRow]] = await db.execute(
    "SELECT user_id FROM users WHERE role = 'admin' ORDER BY user_id ASC LIMIT 1"
  );
  const adminUserId = adminRow?.user_id || null;

  const sampleDonors = [
    {
      full_name: 'Aarav Sharma',
      age: 28,
      gender: 'Male',
      blood_group: 'O+',
      phone: '+91 9820145678',
      email: 'aarav.sharma@example.in',
      house_street: '14, Pali Hill Apartments',
      area: 'Bandra West',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pin_code: '400050',
      account_status: 'active',
      createUser: true,
    },
    {
      full_name: 'Priya Nair',
      age: 24,
      gender: 'Female',
      blood_group: 'A+',
      phone: '+91 9845012345',
      email: 'priya.nair@example.in',
      house_street: '22, 12th Main Road',
      area: 'Indiranagar',
      city: 'Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pin_code: '560038',
      account_status: 'active',
      createUser: true,
    },
    {
      full_name: 'Vikramaditya Singh',
      age: 31,
      gender: 'Male',
      blood_group: 'B+',
      phone: '+91 9811234567',
      email: 'vikram.singh@example.in',
      house_street: 'B-42, Press Enclave Road',
      area: 'Saket',
      city: 'New Delhi',
      district: 'South Delhi',
      state: 'Delhi',
      pin_code: '110017',
      account_status: 'active',
      createUser: true,
    },
    {
      full_name: 'Sneha Deshmukh',
      age: 27,
      gender: 'Female',
      blood_group: 'AB+',
      phone: '+91 9765432109',
      email: 'sneha.deshmukh@example.in',
      house_street: '8, Paud Road Housing Society',
      area: 'Kothrud',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pin_code: '411038',
      account_status: 'active',
      createUser: true,
    },
    {
      full_name: 'Karthik Subramanian',
      age: 34,
      gender: 'Male',
      blood_group: 'O-',
      phone: '+91 9444112233',
      email: 'karthik.s@example.in',
      house_street: '19, Gandhi Nagar 3rd Cross',
      area: 'Adyar',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pin_code: '600020',
      account_status: 'active',
      createUser: true,
    },
    {
      full_name: 'Meera Patel',
      age: 29,
      gender: 'Female',
      blood_group: 'A-',
      phone: '+91 9898765432',
      email: 'meera.patel@example.in',
      house_street: '304, Shivalik Residency',
      area: 'Navrangpura',
      city: 'Ahmedabad',
      district: 'Ahmedabad',
      state: 'Gujarat',
      pin_code: '380009',
      account_status: 'rejected',
      createUser: true,
    },
    {
      full_name: 'Rohan Chatterjee',
      age: 22,
      gender: 'Male',
      blood_group: 'B-',
      phone: '+91 9830198765',
      email: 'rohan.chatterjee@example.in',
      house_street: 'CF-18, Sector I',
      area: 'Salt Lake',
      city: 'Kolkata',
      district: 'North 24 Parganas',
      state: 'West Bengal',
      pin_code: '700091',
      account_status: null,
      createUser: false,
    },
    {
      full_name: 'Ananya Reddy',
      age: 26,
      gender: 'Female',
      blood_group: 'AB-',
      phone: '+91 9849055667',
      email: 'ananya.reddy@example.in',
      house_street: 'Plot 74, Road No. 36',
      area: 'Jubilee Hills',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      pin_code: '500033',
      account_status: null,
      createUser: false,
    },
  ];

  for (const d of sampleDonors) {
    let linkedUserId = null;
    if (d.createUser) {
      const [uRes] = await db.execute(
        `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
         VALUES (NULL, ?, ?, ?, ?, 'donor', ?)`,
        [d.full_name, d.email, d.phone, demoHash, d.account_status]
      );
      linkedUserId = uRes.insertId;
    }

    await db.execute(
      `INSERT INTO donors
       (user_id, full_name, age, gender, blood_group, phone, email, house_street, area, city, district, state, pin_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        linkedUserId,
        d.full_name,
        d.age,
        d.gender,
        d.blood_group,
        d.phone,
        d.email,
        d.house_street,
        d.area,
        d.city,
        d.district,
        d.state,
        d.pin_code,
      ]
    );
  }

  const samplePatients = [
    {
      full_name: 'Rajesh Kumar Verma',
      email: 'rajesh.verma@example.in',
      phone: '+91 9876543210',
      account_status: 'active',
    },
    {
      full_name: 'Sunita Joshi',
      email: 'sunita.joshi@example.in',
      phone: '+91 9822334455',
      account_status: 'active',
    },
    {
      full_name: 'Mohammed Irfan Khan',
      email: 'irfan.khan@example.in',
      phone: '+91 9717889900',
      account_status: 'active',
    },
    {
      full_name: 'Kavita Krishnan',
      email: 'kavita.krishnan@example.in',
      phone: '+91 9840122334',
      account_status: 'active',
    },
    {
      full_name: 'Deepak Agarwal',
      email: 'deepak.agarwal@example.in',
      phone: '+91 9829066778',
      account_status: 'rejected',
    },
  ];

  const patientIds = [];
  for (const p of samplePatients) {
    const [uRes] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (NULL, ?, ?, ?, ?, 'patient', ?)`,
      [p.full_name, p.email, p.phone, demoHash, p.account_status]
    );
    patientIds.push(uRes.insertId);
  }

  const sampleRequests = [
    {
      patient_user_id: patientIds[0],
      patient_name: 'Ramesh Verma',
      requester_name: 'Rajesh Kumar Verma',
      phone: '+91 9876543210',
      blood_group: 'O+',
      units_required: 2,
      hospital_name: 'AIIMS New Delhi',
      location: 'Ansari Nagar, New Delhi',
      urgency: 'Emergency',
      status: 'Pending',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[0], remarks: 'Emergency trauma request submitted via portal' },
      ],
    },
    {
      patient_user_id: patientIds[1],
      patient_name: 'Asha Joshi',
      requester_name: 'Sunita Joshi',
      phone: '+91 9822334455',
      blood_group: 'A+',
      units_required: 1,
      hospital_name: 'Ruby Hall Clinic',
      location: 'Sassoon Road, Pune',
      urgency: 'Urgent',
      status: 'Approved',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[1], remarks: 'Request submitted for scheduled surgery' },
        { old_status: 'Pending', new_status: 'Approved', changed_by: adminUserId, remarks: 'Cross-match approved; 1 unit A+ reserved' },
      ],
    },
    {
      patient_user_id: patientIds[2],
      patient_name: 'Imran Khan',
      requester_name: 'Mohammed Irfan Khan',
      phone: '+91 9717889900',
      blood_group: 'B+',
      units_required: 3,
      hospital_name: 'KEM Hospital',
      location: 'Parel, Mumbai',
      urgency: 'Emergency',
      status: 'Fulfilled',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[2], remarks: 'Urgent ICU ward blood requisition' },
        { old_status: 'Pending', new_status: 'Approved', changed_by: adminUserId, remarks: 'Verified hospital requisition slip' },
        { old_status: 'Approved', new_status: 'Fulfilled', changed_by: adminUserId, remarks: 'All 3 units B+ issued to KEM blood bank counter' },
      ],
    },
    {
      patient_user_id: patientIds[3],
      patient_name: 'Lakshmi Krishnan',
      requester_name: 'Kavita Krishnan',
      phone: '+91 9840122334',
      blood_group: 'AB-',
      units_required: 1,
      hospital_name: 'Apollo Hospital',
      location: 'Greams Road, Chennai',
      urgency: 'Urgent',
      status: 'Pending',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[3], remarks: 'Rare AB- unit requested by Apollo haematology desk' },
      ],
    },
    {
      patient_user_id: patientIds[0],
      patient_name: 'Suresh Verma',
      requester_name: 'Rajesh Kumar Verma',
      phone: '+91 9876543210',
      blood_group: 'O-',
      units_required: 2,
      hospital_name: 'Safdarjung Hospital',
      location: 'Ring Road, New Delhi',
      urgency: 'Normal',
      status: 'Rejected',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[0], remarks: 'Request submitted via LifeFlow portal' },
        { old_status: 'Pending', new_status: 'Rejected', changed_by: adminUserId, remarks: 'Duplicate entry — already fulfilled by hospital blood bank' },
      ],
    },
    {
      patient_user_id: patientIds[1],
      patient_name: 'Geeta Joshi',
      requester_name: 'Sunita Joshi',
      phone: '+91 9822334455',
      blood_group: 'B-',
      units_required: 2,
      hospital_name: 'Sahyadri Hospital',
      location: 'Deccan Gymkhana, Pune',
      urgency: 'Normal',
      status: 'Approved',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[1], remarks: 'Elective orthopaedic procedure requirement' },
        { old_status: 'Pending', new_status: 'Approved', changed_by: adminUserId, remarks: 'Approved for collection before 18:00 IST' },
      ],
    },
    {
      patient_user_id: patientIds[3],
      patient_name: 'Nitin Kulkarni',
      requester_name: 'Kavita Krishnan',
      phone: '+91 9840122334',
      blood_group: 'AB+',
      units_required: 1,
      hospital_name: 'Manipal Hospital',
      location: 'HAL Old Airport Road, Bengaluru',
      urgency: 'Normal',
      status: 'Fulfilled',
      transitions: [
        { old_status: null, new_status: 'Pending', changed_by: patientIds[3], remarks: 'Request submitted via LifeFlow portal' },
        { old_status: 'Pending', new_status: 'Fulfilled', changed_by: adminUserId, remarks: '1 unit AB+ dispatched and acknowledged' },
      ],
    },
  ];

  for (const r of sampleRequests) {
    const [reqRes] = await db.execute(
      `INSERT INTO blood_requests
       (patient_user_id, patient_name, requester_name, phone, blood_group, units_required, hospital_name, location, urgency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.patient_user_id,
        r.patient_name,
        r.requester_name,
        r.phone,
        r.blood_group,
        r.units_required,
        r.hospital_name,
        r.location,
        r.urgency,
        r.status,
      ]
    );
    const requestId = reqRes.insertId;
    for (const tr of r.transitions) {
      await db.execute(
        `INSERT INTO request_history (request_id, old_status, new_status, changed_by, remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [requestId, tr.old_status, tr.new_status, tr.changed_by, tr.remarks]
      );
    }
  }

  return true;
}
