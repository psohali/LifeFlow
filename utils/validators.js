export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const VALID_GENDERS = ['Male', 'Female', 'Other'];
export const VALID_URGENCIES = ['Normal', 'Urgent', 'Emergency'];
export const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Fulfilled'];

export const INDIAN_STATES_AND_UTS = [
  // 28 States
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
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export function normalizeIndianPhone(input) {
  if (typeof input !== 'string') return '';
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidIndianPhone(digits) {
  return /^[6-9]\d{9}$/.test(digits);
}

export function isValidIndianPin(pin) {
  return /^[1-9]\d{5}$/.test(String(pin || '').trim());
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function sanitizeText(value, maxLen = 200) {
  return String(value ?? '').trim().slice(0, maxLen);
}
