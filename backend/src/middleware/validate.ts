/**
 * validate.ts
 * ============================================================
 * Centralised request-body validation middleware.
 *
 * Each exported middleware runs BEFORE the controller and
 * returns a 400 response with a structured error list if
 * the body is malformed. This prevents invalid data from
 * reaching Sequelize and triggering cryptic DB errors.
 *
 * Pattern:
 *   router.post('/patients', authenticateToken, validatePatient, createPatient)
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Helper — collect field errors and send in one shot
// ---------------------------------------------------------------------------
interface FieldError {
  field: string;
  message: string;
}

const fail = (res: Response, errors: FieldError[]) =>
  res.status(400).json({
    message: 'Validation failed. Please correct the highlighted fields.',
    errors,
  });

const isPositiveNumber = (v: any) => v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) >= 0;
const isPositiveInt    = (v: any) => isPositiveNumber(v) && Number.isInteger(Number(v));
const isNonEmptyString = (v: any) => typeof v === 'string' && v.trim().length > 0;
const isValidDate      = (v: any) => isNonEmptyString(v) && !isNaN(Date.parse(v));

// ---------------------------------------------------------------------------
// 1. Patient Registration
// ---------------------------------------------------------------------------
export const validatePatient = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { name, phone, gender, dob, address } = req.body;

  if (!isNonEmptyString(name))
    errors.push({ field: 'name', message: 'Patient full name is required.' });

  if (!isNonEmptyString(phone))
    errors.push({ field: 'phone', message: 'Contact phone number is required.' });
  else if (!/^\+?[\d\s\-().]{7,20}$/.test(phone.trim()))
    errors.push({ field: 'phone', message: 'Phone number format is invalid.' });

  if (!['male', 'female', 'other'].includes(gender))
    errors.push({ field: 'gender', message: "Gender must be 'male', 'female', or 'other'." });

  if (!isValidDate(dob))
    errors.push({ field: 'dob', message: 'A valid date of birth is required.' });
  else if (new Date(dob) >= new Date())
    errors.push({ field: 'dob', message: 'Date of birth cannot be in the future.' });

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 2. Appointment Booking
// ---------------------------------------------------------------------------
export const validateAppointment = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, doctorId, appointmentDate } = req.body;

  if (!isPositiveInt(patientId))
    errors.push({ field: 'patientId', message: 'A valid patient ID is required.' });

  if (!isPositiveInt(doctorId))
    errors.push({ field: 'doctorId', message: 'A valid doctor ID is required.' });

  if (!isValidDate(appointmentDate))
    errors.push({ field: 'appointmentDate', message: 'A valid appointment date/time is required.' });
  else if (new Date(appointmentDate) < new Date(Date.now() - 60_000)) // allow 1-min grace for latency
    errors.push({ field: 'appointmentDate', message: 'Appointment date cannot be in the past.' });

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 3. Invoice Creation
// ---------------------------------------------------------------------------
export const validateInvoice = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, items, discount } = req.body;

  if (!isPositiveInt(patientId))
    errors.push({ field: 'patientId', message: 'A valid patient ID is required.' });

  if (!Array.isArray(items) || items.length === 0)
    errors.push({ field: 'items', message: 'At least one invoice line item is required.' });
  else {
    items.forEach((item: any, idx: number) => {
      if (!isNonEmptyString(item.itemName))
        errors.push({ field: `items[${idx}].itemName`, message: 'Item name is required.' });
      if (!isPositiveNumber(item.unitPrice))
        errors.push({ field: `items[${idx}].unitPrice`, message: 'Unit price must be a non-negative number.' });
      if (!isPositiveInt(item.quantity) || Number(item.quantity) < 1)
        errors.push({ field: `items[${idx}].quantity`, message: 'Quantity must be a positive integer.' });
    });
  }

  if (discount !== undefined && !isPositiveNumber(discount))
    errors.push({ field: 'discount', message: 'Discount must be a non-negative number.' });

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 4. Pharmacy Medicine Sale (POS)
// ---------------------------------------------------------------------------
export const validateMedicineSale = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, items } = req.body;

  if (!isPositiveInt(patientId))
    errors.push({ field: 'patientId', message: 'A valid patient ID is required.' });

  if (!Array.isArray(items) || items.length === 0)
    errors.push({ field: 'items', message: 'At least one medicine must be included in the sale.' });
  else {
    items.forEach((item: any, idx: number) => {
      if (!isPositiveInt(item.medicineId))
        errors.push({ field: `items[${idx}].medicineId`, message: 'A valid medicine ID is required.' });
      if (!isPositiveInt(item.quantity) || Number(item.quantity) < 1)
        errors.push({ field: `items[${idx}].quantity`, message: 'Quantity must be a positive integer (≥ 1).' });
    });
  }

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 5. Laboratory Test Request
// ---------------------------------------------------------------------------
export const validateLabRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, doctorId, testName } = req.body;

  if (!isPositiveInt(patientId))
    errors.push({ field: 'patientId', message: 'A valid patient ID is required.' });

  if (!isPositiveInt(doctorId))
    errors.push({ field: 'doctorId', message: 'A valid requesting doctor ID is required.' });

  if (!isNonEmptyString(testName))
    errors.push({ field: 'testName', message: 'Test name is required.' });

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 6. Patient Vitals Logging
// ---------------------------------------------------------------------------
export const validateVitals = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { bp, temperature, pulse, respRate, spo2 } = req.body;

  // Blood pressure – basic string format check (e.g. "120/80")
  if (!isNonEmptyString(bp) || !/^\d{2,3}\/\d{2,3}$/.test(bp.trim()))
    errors.push({ field: 'bp', message: "Blood pressure must be in 'systolic/diastolic' format (e.g. 120/80)." });

  if (!isPositiveNumber(temperature) || Number(temperature) < 30 || Number(temperature) > 45)
    errors.push({ field: 'temperature', message: 'Temperature must be between 30°C and 45°C.' });

  if (!isPositiveInt(pulse) || Number(pulse) < 20 || Number(pulse) > 300)
    errors.push({ field: 'pulse', message: 'Pulse rate must be between 20 and 300 bpm.' });

  if (!isPositiveInt(respRate) || Number(respRate) < 4 || Number(respRate) > 60)
    errors.push({ field: 'respRate', message: 'Respiratory rate must be between 4 and 60 breaths/min.' });

  if (!isPositiveInt(spo2) || Number(spo2) < 50 || Number(spo2) > 100)
    errors.push({ field: 'spo2', message: 'SpO2 saturation must be between 50% and 100%.' });

  if (errors.length) return fail(res, errors);
  next();
};

// ---------------------------------------------------------------------------
// 7. Patient Admission (IPD)
// ---------------------------------------------------------------------------
export const validateAdmission = (req: Request, res: Response, next: NextFunction) => {
  const errors: FieldError[] = [];
  const { patientId, bedId, doctorId, condition } = req.body;

  if (!isPositiveInt(patientId))
    errors.push({ field: 'patientId', message: 'A valid patient ID is required.' });

  if (!isPositiveInt(bedId))
    errors.push({ field: 'bedId', message: 'A valid bed ID is required.' });

  if (!isPositiveInt(doctorId))
    errors.push({ field: 'doctorId', message: 'An admitting doctor ID is required.' });

  if (!isNonEmptyString(condition))
    errors.push({ field: 'condition', message: 'Admitting condition/diagnosis is required.' });

  if (errors.length) return fail(res, errors);
  next();
};
