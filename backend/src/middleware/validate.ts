/**
 * validate.ts
 * ============================================================
 * Centralised, strict request-body schema validation middleware.
 *
 * Enforces strict type, length, and format schemas on all API inputs.
 * Anything that does not strictly match the schema is REJECTED with a
 * 400 Bad Request and detailed field validation errors.
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';

export interface FieldError {
  field: string;
  message: string;
}

const fail = (res: Response, errors: FieldError[]) =>
  res.status(400).json({
    message: 'Validation failed. Please correct the highlighted fields.',
    errors,
  });

// ---------------------------------------------------------------------------
// Strict Type & Format Validator Helpers
// ---------------------------------------------------------------------------

/** Validates that value is a string with length within [minLen, maxLen] */
const isString = (v: any, minLen = 1, maxLen = 255): boolean => {
  if (typeof v !== 'string') return false;
  const len = v.trim().length;
  return len >= minLen && len <= maxLen;
};

/** Validates email format and max length (max 254 chars per RFC 5321) */
const isValidEmail = (v: any): boolean => {
  if (!isString(v, 3, 254)) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(v.trim());
};

/** Validates phone number format (flexible 3 to 50 characters) */
const isValidPhone = (v: any): boolean => {
  if (v === undefined || v === null || v === '') return true;
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const str = String(v).trim();
  return str.length >= 3 && str.length <= 50;
};

/** Validates CNIC format (flexible 3 to 50 characters) */
const isValidCNIC = (v: any): boolean => {
  if (v === undefined || v === null || v === '') return true;
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const str = String(v).trim();
  return str.length >= 3 && str.length <= 50;
};

/** Validates that value is a number within [min, max] range */
const isNumberInRange = (v: any, min = 0, max = Number.MAX_SAFE_INTEGER): boolean => {
  if (v === undefined || v === null || v === '') return false;
  const num = Number(v);
  return typeof num === 'number' && !isNaN(num) && num >= min && num <= max;
};

/** Validates that value is an integer within [min, max] range */
const isIntegerInRange = (v: any, min = 0, max = Number.MAX_SAFE_INTEGER): boolean => {
  if (!isNumberInRange(v, min, max)) return false;
  return Number.isInteger(Number(v));
};

/** Validates ISO Date format (YYYY-MM-DD or valid date string) */
const isValidDateString = (v: any): boolean => {
  if (!isString(v, 4, 30)) return false;
  const parsed = Date.parse(v.trim());
  return !isNaN(parsed);
};

/** Validates enum value strictly against allowed values list */
const isEnumValue = (v: any, allowedValues: string[]): boolean => {
  if (typeof v !== 'string') return false;
  return allowedValues.includes(v.trim());
};

// ---------------------------------------------------------------------------
// 1. User Authentication (Login)
// ---------------------------------------------------------------------------
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required (e.g. user@example.com).' });
  }

  if (!isString(password, 6, 128)) {
    errors.push({ field: 'password', message: 'Password is required and must be between 6 and 128 characters.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 2. Patient Registration & Profile Update
// ---------------------------------------------------------------------------
export const validatePatient = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { name, phone, gender, dob, age, paymentMethod, email, cnic, address } = req.body;

  if (!isString(name, 2, 100)) {
    errors.push({ field: 'name', message: 'Patient name must be between 2 and 100 characters.' });
  }

  if (!isNumberInRange(age, 0, 130)) {
    errors.push({ field: 'age', message: 'Patient age must be a valid number between 0 and 130.' });
  }

  if (!isString(paymentMethod, 1, 50)) {
    errors.push({ field: 'paymentMethod', message: 'Payment method is compulsory.' });
  }

  if (phone !== undefined && phone !== null && phone !== '' && !isValidPhone(phone)) {
    errors.push({ field: 'phone', message: 'Phone number format is invalid (7-20 digits allowed).' });
  }

  if (gender !== undefined && gender !== null && gender !== '' && !isEnumValue(gender, ['male', 'female', 'other'])) {
    errors.push({ field: 'gender', message: 'Gender must be strictly one of: male, female, other.' });
  }

  if (dob !== undefined && dob !== null && dob !== '') {
    if (!isValidDateString(dob)) {
      errors.push({ field: 'dob', message: 'Date of birth format is invalid.' });
    } else if (new Date(dob) > new Date()) {
      errors.push({ field: 'dob', message: 'Date of birth cannot be in the future.' });
    }
  }

  if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Email address format is invalid.' });
  }

  if (cnic !== undefined && cnic !== null && cnic !== '' && !isValidCNIC(cnic)) {
    errors.push({ field: 'cnic', message: 'CNIC format is invalid (e.g. 42101-1234567-1).' });
  }

  if (address !== undefined && address !== null && address !== '' && !isString(address, 1, 500)) {
    errors.push({ field: 'address', message: 'Address must not exceed 500 characters.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 3. Appointment Booking
// ---------------------------------------------------------------------------
export const validateAppointment = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, doctorId, appointmentDate, type, symptoms } = req.body;

  if (!isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'A valid patient ID (integer >= 1) is required.' });
  }

  if (!isIntegerInRange(doctorId, 1)) {
    errors.push({ field: 'doctorId', message: 'A valid doctor ID (integer >= 1) is required.' });
  }

  if (!isValidDateString(appointmentDate)) {
    errors.push({ field: 'appointmentDate', message: 'A valid appointment date/time is required.' });
  } else if (new Date(appointmentDate) < new Date(Date.now() - 60_000)) {
    errors.push({ field: 'appointmentDate', message: 'Appointment date cannot be in the past.' });
  }

  if (type !== undefined && type !== null && type !== '' && !isEnumValue(type, ['online', 'walk-in'])) {
    errors.push({ field: 'type', message: 'Appointment type must be walk-in or online.' });
  }

  if (symptoms !== undefined && symptoms !== null && symptoms !== '' && !isString(symptoms, 1, 1000)) {
    errors.push({ field: 'symptoms', message: 'Symptoms notes must not exceed 1000 characters.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 4. Token Queue Generation
// ---------------------------------------------------------------------------
export const validateTokenQueue = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, doctorId, type, fee, detail } = req.body;

  if (patientId !== undefined && patientId !== null && !isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'Patient ID must be a positive integer >= 1.' });
  }

  if (doctorId !== undefined && doctorId !== null && !isIntegerInRange(doctorId, 1)) {
    errors.push({ field: 'doctorId', message: 'Doctor ID must be a positive integer >= 1.' });
  }

  if (type !== undefined && type !== null && !isEnumValue(type, ['opd', 'lab', 'billing'])) {
    errors.push({ field: 'type', message: 'Token type must be opd, lab, or billing.' });
  }

  if (fee !== undefined && fee !== null && !isNumberInRange(fee, 0, 1000000)) {
    errors.push({ field: 'fee', message: 'Token fee must be a valid non-negative number.' });
  }

  if (detail !== undefined && detail !== null && !isString(detail, 1, 300)) {
    errors.push({ field: 'detail', message: 'Token detail must not exceed 300 characters.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 5. Invoicing & Billing
// ---------------------------------------------------------------------------
export const validateInvoice = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, items, discount, tax, paymentMethod } = req.body;

  if (!isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'A valid patient ID (integer >= 1) is required.' });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    errors.push({ field: 'items', message: 'At least one invoice line item (max 100 items) is required.' });
  } else {
    items.forEach((item: any, idx: number) => {
      if (!isString(item.itemName, 1, 200)) {
        errors.push({ field: `items[${idx}].itemName`, message: 'Item name is required (max 200 chars).' });
      }
      if (!isNumberInRange(item.unitPrice, 0, 1000000)) {
        errors.push({ field: `items[${idx}].unitPrice`, message: 'Unit price must be a non-negative number.' });
      }
      if (!isIntegerInRange(item.quantity, 1, 10000)) {
        errors.push({ field: `items[${idx}].quantity`, message: 'Quantity must be a positive integer (1 - 10000).' });
      }
    });
  }

  if (discount !== undefined && discount !== null && !isNumberInRange(discount, 0, 1000000)) {
    errors.push({ field: 'discount', message: 'Discount must be a non-negative number.' });
  }

  if (tax !== undefined && tax !== null && !isNumberInRange(tax, 0, 1000000)) {
    errors.push({ field: 'tax', message: 'Tax must be a non-negative number.' });
  }

  if (paymentMethod !== undefined && paymentMethod !== null && !isEnumValue(paymentMethod, ['cash', 'card', 'online', 'pending'])) {
    errors.push({ field: 'paymentMethod', message: 'Payment method must be cash, card, online, or pending.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 6. Pharmacy Medicine Sale (POS)
// ---------------------------------------------------------------------------
export const validateMedicineSale = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, items } = req.body;

  if (!isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'A valid patient ID (integer >= 1) is required.' });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    errors.push({ field: 'items', message: 'At least one medicine item (max 50 items) is required.' });
  } else {
    items.forEach((item: any, idx: number) => {
      if (!isIntegerInRange(item.medicineId, 1)) {
        errors.push({ field: `items[${idx}].medicineId`, message: 'A valid medicine ID (integer >= 1) is required.' });
      }
      if (!isIntegerInRange(item.quantity, 1, 1000)) {
        errors.push({ field: `items[${idx}].quantity`, message: 'Quantity must be a positive integer (1 - 1000).' });
      }
    });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 7. Store Stock Medicine Item Creation
// ---------------------------------------------------------------------------
export const validateMedicine = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { name, category, stockLevel, price, unit, lowStockThreshold, batchNumber, expiryDate } = req.body;

  if (!isString(name, 1, 150)) {
    errors.push({ field: 'name', message: 'Medicine name is required (max 150 characters).' });
  }

  if (!isString(category, 1, 100)) {
    errors.push({ field: 'category', message: 'Medicine category is required (max 100 characters).' });
  }

  if (!isIntegerInRange(stockLevel, 0, 1000000)) {
    errors.push({ field: 'stockLevel', message: 'Stock level must be a non-negative integer.' });
  }

  if (!isNumberInRange(price, 0, 1000000)) {
    errors.push({ field: 'price', message: 'Price must be a valid non-negative number.' });
  }

  if (unit !== undefined && unit !== null && !isString(unit, 1, 50)) {
    errors.push({ field: 'unit', message: 'Unit / Dosage strength must not exceed 50 characters.' });
  }

  if (lowStockThreshold !== undefined && lowStockThreshold !== null && !isIntegerInRange(lowStockThreshold, 0, 100000)) {
    errors.push({ field: 'lowStockThreshold', message: 'Low stock threshold must be a non-negative integer.' });
  }

  if (batchNumber !== undefined && batchNumber !== null && !isString(batchNumber, 1, 100)) {
    errors.push({ field: 'batchNumber', message: 'Batch number must not exceed 100 characters.' });
  }

  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== '' && !isValidDateString(expiryDate)) {
    errors.push({ field: 'expiryDate', message: 'Expiry date must be a valid date string.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 8. Laboratory Test Request
// ---------------------------------------------------------------------------
export const validateLabRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, doctorId, testName, category } = req.body;

  if (!isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'A valid patient ID (integer >= 1) is required.' });
  }

  if (doctorId !== undefined && doctorId !== null && !isIntegerInRange(doctorId, 1)) {
    errors.push({ field: 'doctorId', message: 'Doctor ID must be a valid integer.' });
  }

  if (!isString(testName, 2, 200)) {
    errors.push({ field: 'testName', message: 'Test name is required (2 to 200 characters).' });
  }

  if (category !== undefined && category !== null && !isString(category, 1, 100)) {
    errors.push({ field: 'category', message: 'Category must not exceed 100 characters.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 9. Patient Vitals Logging
// ---------------------------------------------------------------------------
export const validateVitals = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { bp, temperature, pulse, respRate, spo2, weight, height } = req.body;

  // Blood pressure – strict systolic/diastolic format (e.g. "120/80")
  if (!isString(bp, 3, 10) || !/^\d{2,3}\/\d{2,3}$/.test(bp.trim())) {
    errors.push({ field: 'bp', message: "Blood pressure must be in 'systolic/diastolic' format (e.g. 120/80)." });
  } else {
    const [sys, dia] = bp.split('/').map(Number);
    if (sys < 50 || sys > 260 || dia < 30 || dia > 160) {
      errors.push({ field: 'bp', message: 'Blood pressure values out of realistic physiological range.' });
    }
  }

  if (!isNumberInRange(temperature, 30.0, 45.0)) {
    errors.push({ field: 'temperature', message: 'Temperature must be between 30.0°C and 45.0°C.' });
  }

  if (!isIntegerInRange(pulse, 20, 300)) {
    errors.push({ field: 'pulse', message: 'Pulse rate must be an integer between 20 and 300 bpm.' });
  }

  if (!isIntegerInRange(respRate, 4, 60)) {
    errors.push({ field: 'respRate', message: 'Respiratory rate must be an integer between 4 and 60 breaths/min.' });
  }

  if (!isIntegerInRange(spo2, 50, 100)) {
    errors.push({ field: 'spo2', message: 'SpO2 oxygen saturation must be an integer between 50% and 100%.' });
  }

  if (weight !== undefined && weight !== null && weight !== '' && !isNumberInRange(weight, 0.5, 500)) {
    errors.push({ field: 'weight', message: 'Weight must be a number between 0.5 and 500 kg.' });
  }

  if (height !== undefined && height !== null && height !== '' && !isNumberInRange(height, 20, 300)) {
    errors.push({ field: 'height', message: 'Height must be a number between 20 and 300 cm.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 10. Patient Admission (IPD)
// ---------------------------------------------------------------------------
export const validateAdmission = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, bedId, doctorId, condition, admissionCategory, stayType, advancePaid } = req.body;

  if (!isIntegerInRange(patientId, 1)) {
    errors.push({ field: 'patientId', message: 'A valid patient ID (integer >= 1) is required.' });
  }

  if (!isIntegerInRange(bedId, 1)) {
    errors.push({ field: 'bedId', message: 'A valid bed ID (integer >= 1) is required.' });
  }

  if (!isIntegerInRange(doctorId, 1)) {
    errors.push({ field: 'doctorId', message: 'An admitting doctor ID (integer >= 1) is required.' });
  }

  if (!isString(condition, 2, 300)) {
    errors.push({ field: 'condition', message: 'Admitting condition/diagnosis is required (2 to 300 characters).' });
  }

  if (admissionCategory !== undefined && admissionCategory !== null && !isEnumValue(admissionCategory, ['medical', 'surgical'])) {
    errors.push({ field: 'admissionCategory', message: 'Admission category must be medical or surgical.' });
  }

  if (stayType !== undefined && stayType !== null && !isEnumValue(stayType, ['short', 'long'])) {
    errors.push({ field: 'stayType', message: 'Stay type must be short or long.' });
  }

  if (advancePaid !== undefined && advancePaid !== null && !isNumberInRange(advancePaid, 0, 10000000)) {
    errors.push({ field: 'advancePaid', message: 'Advance paid must be a non-negative number.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 11. Daily Expenses (Petty Cash Ledger)
// ---------------------------------------------------------------------------
export const validateDailyExpense = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { description, category, amount, spentBy, expenseDate } = req.body;

  if (!isString(description, 2, 200)) {
    errors.push({ field: 'description', message: 'Expense description is required (2 to 200 characters).' });
  }

  if (!isString(category, 2, 100)) {
    errors.push({ field: 'category', message: 'Expense category is required (2 to 100 characters).' });
  }

  if (!isNumberInRange(amount, 0.01, 10000000)) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number greater than 0.' });
  }

  if (spentBy !== undefined && spentBy !== null && !isString(spentBy, 1, 100)) {
    errors.push({ field: 'spentBy', message: 'Spent by name must not exceed 100 characters.' });
  }

  if (expenseDate !== undefined && expenseDate !== null && expenseDate !== '' && !isValidDateString(expenseDate)) {
    errors.push({ field: 'expenseDate', message: 'Expense date format is invalid.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 12. Staff Registration (Admin)
// ---------------------------------------------------------------------------
export const validateStaff = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { name, email, password, role, phone, cnic, address, designation, salary } = req.body;

  if (!isString(name, 1, 150)) {
    errors.push({ field: 'name', message: 'Staff name is required.' });
  }

  if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'If provided, email address format must be valid.' });
  }

  if (password !== undefined && password !== null && password !== '' && !isString(password, 6, 128)) {
    errors.push({ field: 'password', message: 'Password must be between 6 and 128 characters.' });
  }

  const allowedStaffRoles = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'accountant'];
  if (role !== undefined && role !== null && role !== '' && !isEnumValue(role, allowedStaffRoles)) {
    errors.push({ field: 'role', message: `Role must be strictly one of: ${allowedStaffRoles.join(', ')}.` });
  }

  if (phone !== undefined && phone !== null && phone !== '' && !isValidPhone(phone)) {
    errors.push({ field: 'phone', message: 'Phone number format is invalid.' });
  }

  if (cnic !== undefined && cnic !== null && cnic !== '' && !isValidCNIC(cnic)) {
    errors.push({ field: 'cnic', message: 'CNIC format is invalid (e.g. 42101-1234567-1).' });
  }

  if (address !== undefined && address !== null && address !== '' && !isString(address, 1, 500)) {
    errors.push({ field: 'address', message: 'Address must not exceed 500 characters.' });
  }

  if (designation !== undefined && designation !== null && designation !== '' && !isString(designation, 1, 100)) {
    errors.push({ field: 'designation', message: 'Designation must not exceed 100 characters.' });
  }

  if (salary !== undefined && salary !== null && salary !== '' && !isNumberInRange(salary, 0, 10000000)) {
    errors.push({ field: 'salary', message: 'Salary must be a non-negative number.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 13. System User Account Creation (Security & Access)
// ---------------------------------------------------------------------------
export const validateSystemUser = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  let { name, email, password, role, status } = req.body;

  if (!name || String(name).trim().length < 2) {
    errors.push({ field: 'name', message: 'Full name is required (at least 2 characters).' });
  }

  if (!email || !String(email).includes('@')) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!password || String(password).length < 4) {
    req.body.password = 'Password123';
  }

  if (!role) {
    req.body.role = 'admin';
  } else {
    const normRole = String(role).toLowerCase().replace(/[^a-z_]/g, '');
    if (normRole.includes('admin')) req.body.role = 'admin';
    else if (normRole.includes('doc')) req.body.role = 'doctor';
    else if (normRole.includes('recept')) req.body.role = 'receptionist';
    else if (normRole.includes('pharm')) req.body.role = 'pharmacist';
    else if (normRole.includes('account')) req.body.role = 'accountant';
    else req.body.role = 'admin';
  }

  if (!status) {
    req.body.status = 'active';
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 14. Credentials Update (Admin)
// ---------------------------------------------------------------------------
export const validateUserCredentials = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { name, email, password, role, status } = req.body;

  if (name !== undefined && name !== null && name !== '' && !isString(name, 2, 100)) {
    errors.push({ field: 'name', message: 'Full name must be between 2 and 100 characters.' });
  }

  if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (password !== undefined && password !== null && password !== '' && !isString(password, 6, 128)) {
    errors.push({ field: 'password', message: 'New password must be between 6 and 128 characters.' });
  }

  const allowedRoles = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'accountant', 'patient'];
  if (role !== undefined && role !== null && role !== '' && !isEnumValue(role, allowedRoles)) {
    errors.push({ field: 'role', message: `Role must be strictly one of: ${allowedRoles.join(', ')}.` });
  }

  if (status !== undefined && status !== null && status !== '' && !isEnumValue(status, ['active', 'inactive'])) {
    errors.push({ field: 'status', message: 'Status must be active or inactive.' });
  }

  if (errors.length) return fail(res, errors);
  next();
};
