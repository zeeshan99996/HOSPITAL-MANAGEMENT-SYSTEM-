import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth';
import {
  validatePatient,
  validateAppointment,
  validateInvoice,
  validateMedicineSale,
  validateLabRequest,
  validateVitals,
  validateAdmission
} from '../middleware/validate';
import { login, registerPatient, getProfile } from '../controllers/authController';
import { aiChat } from '../controllers/aiController';
import { TokenQueue, Doctor, Department, Patient, User } from '../models';

import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientVitals,
  logPatientVitals
} from '../controllers/patientController';
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  createPrescription
} from '../controllers/appointmentController';
import {
  getBeds,
  admitPatient,
  getAdmissions,
  updateAdmissionNotes,
  dischargePatient,
  createLabRequest,
  getLabRequests,
  processLabSample,
  submitLabResult,
  getLaboratoryTests,
  createLaboratoryTest,
  sendSampleToLab
} from '../controllers/medicalController';
import {
  createInvoice,
  getInvoices,
  payInvoice,
  getMedicines,
  updateMedicineStock,
  addMedicine,
  recordMedicineSale,
  administerMedicine,
  getMedicineRates,
  saveMedicineRate,
  getDailyExpenses,
  createDailyExpense,
  getStaffPayroll,
  generatePayrollForecast,
  payStaffPayroll
} from '../controllers/billingInventoryController';
import {
  getDashboardStats,
  getAllStaff,
  createStaff,
  updateStaffStatus,
  getDepartments,
  createDepartment,
  getActivityLogs
} from '../controllers/dashboardController';

const router = Router();

// ==========================================
// PUBLIC & AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', registerPatient);
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);
router.post('/ai/chat', authenticateToken, aiChat);

// ==========================================
// PATIENT MANAGEMENT
// ==========================================
router.post('/patients', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), validatePatient, createPatient);
router.get('/patients', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse', 'accountant']), getAllPatients);
router.get('/patients/:id', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse', 'accountant', 'patient']), getPatientById);
router.put('/patients/:id', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), updatePatient);
router.delete('/patients/:id', authenticateToken, requireRoles(['admin']), deletePatient);

// PATIENT VITALS LOGGING
router.get('/patients/:id/vitals', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse', 'patient']), getPatientVitals);
router.post('/patients/:id/vitals', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), validateVitals, logPatientVitals);

// ==========================================
// APPOINTMENT MANAGEMENT & TOKENS
// ==========================================
router.post('/appointments', authenticateToken, requireRoles(['admin', 'receptionist', 'patient']), validateAppointment, createAppointment);
router.get('/appointments', authenticateToken, getAppointments);
router.put('/appointments/:id/status', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor']), updateAppointmentStatus);
router.post('/appointments/prescription', authenticateToken, requireRoles(['admin', 'doctor']), createPrescription);

// THERMAL PRINTER & QUEUE TOKEN GENERATION
router.post('/tokens', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { type, patientId, doctorId, detail } = req.body;
  try {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const tokenId = `${type.toUpperCase()}-${year}-${rand}`;
    
    const token = await TokenQueue.create({
      tokenNumber: tokenId,
      type,
      patientId,
      doctorId: doctorId || null,
      status: 'waiting',
      waitingTime: Math.floor(5 + Math.random() * 25), // Mock estimation
      detail: detail || ''
    });

    // Populate associations
    const populated = await TokenQueue.findByPk(token.id, {
      include: [
        { model: Patient, attributes: ['name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ]
    });

    return res.status(201).json(populated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error generating token record', error: err.message });
  }
});

// ==========================================
// BED & ADMISSION MANAGEMENT (IPD)
// ==========================================
router.get('/beds', authenticateToken, getBeds);
router.post('/admissions', authenticateToken, requireRoles(['admin', 'doctor', 'nurse']), validateAdmission, admitPatient);
router.get('/admissions', authenticateToken, getAdmissions);
router.put('/admissions/:id/notes', authenticateToken, requireRoles(['admin', 'doctor', 'nurse']), updateAdmissionNotes);
router.put('/admissions/:id/discharge', authenticateToken, requireRoles(['admin', 'doctor']), dischargePatient);

// ==========================================
// LABORATORY MANAGEMENT
// ==========================================
router.post('/lab/requests', authenticateToken, requireRoles(['admin', 'doctor']), validateLabRequest, createLabRequest);
router.get('/lab/requests', authenticateToken, getLabRequests);
router.put('/lab/requests/:id/process', authenticateToken, requireRoles(['admin', 'lab_technician']), processLabSample);
router.put('/lab/requests/:id/send', authenticateToken, requireRoles(['admin', 'lab_technician', 'nurse']), sendSampleToLab);
router.put('/lab/requests/:id/result', authenticateToken, requireRoles(['admin', 'lab_technician']), submitLabResult);

// LAB TESTS RATE CATALOG
router.get('/lab/tests', authenticateToken, getLaboratoryTests);
router.post('/lab/tests', authenticateToken, requireRoles(['admin', 'accountant']), createLaboratoryTest);

// ==========================================
// BILLING, PAYROLL, PETTY CASH LEDGER
// ==========================================
router.post('/invoices', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), validateInvoice, createInvoice);
router.get('/invoices', authenticateToken, getInvoices);
router.put('/invoices/:id/pay', authenticateToken, requireRoles(['admin', 'accountant', 'patient']), payInvoice);

// PETTY CASH daily expenses ledger
router.get('/expenses', authenticateToken, requireRoles(['admin', 'accountant']), getDailyExpenses);
router.post('/expenses', authenticateToken, requireRoles(['admin', 'accountant']), createDailyExpense);

// MONTHLY PAYROLL SYSTEM & forecasts
router.get('/payroll', authenticateToken, requireRoles(['admin', 'accountant']), getStaffPayroll);
router.post('/payroll/forecast', authenticateToken, requireRoles(['admin', 'accountant']), generatePayrollForecast);
router.put('/payroll/:id/pay', authenticateToken, requireRoles(['admin', 'accountant']), payStaffPayroll);

// ==========================================
// PHARMACY & MEDICINE INVENTORY
// ==========================================
router.get('/medicines', authenticateToken, getMedicines);
router.post('/medicines', authenticateToken, requireRoles(['admin', 'pharmacist', 'accountant']), addMedicine);
router.put('/medicines/:id', authenticateToken, requireRoles(['admin', 'pharmacist', 'accountant']), updateMedicineStock);
router.post('/medicines/sale', authenticateToken, requireRoles(['admin', 'pharmacist']), validateMedicineSale, recordMedicineSale);

// DIRECT MEDICINE/INJECTION CLINICAL ADMINISTRATION
router.post('/medicines/administer', authenticateToken, requireRoles(['admin', 'nurse', 'doctor']), administerMedicine);

// MEDICINE PRE-DEFINED RATE CONFIGS
router.get('/medicines/rates', authenticateToken, requireRoles(['admin', 'accountant', 'pharmacist']), getMedicineRates);
router.post('/medicines/rates', authenticateToken, requireRoles(['admin', 'accountant']), saveMedicineRate);

// ==========================================
// ADMIN DASHBOARD & STAFF OPERATIONS
// ==========================================
router.get('/admin/stats', authenticateToken, requireRoles(['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant']), getDashboardStats);
router.get('/admin/staff', authenticateToken, requireRoles(['admin']), getAllStaff);
router.post('/admin/staff', authenticateToken, requireRoles(['admin']), createStaff);
router.put('/admin/staff/:id/status', authenticateToken, requireRoles(['admin']), updateStaffStatus);
router.get('/admin/departments', authenticateToken, getDepartments);
router.post('/admin/departments', authenticateToken, requireRoles(['admin']), createDepartment);
router.get('/admin/logs', authenticateToken, requireRoles(['admin']), getActivityLogs);

// ==========================================
// RECEPTIONIST PORTAL ENDPOINTS
// ==========================================
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const tokens = await TokenQueue.findAll({
      include: [
        { model: Patient, attributes: ['name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ],
      order: [['createdAt', 'ASC']]
    });
    return res.status(200).json(tokens);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching token queue', error: err.message });
  }
});

router.put('/tokens/:id/status', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { status } = req.body;
  try {
    const token = await TokenQueue.findByPk(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    token.status = status;
    await token.save();
    return res.status(200).json(token);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error updating token status', error: err.message });
  }
});

router.get('/doctors/schedule', authenticateToken, async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        { model: User, attributes: ['name', 'email', 'phone'] },
        { model: Department, attributes: ['name'] }
      ]
    });

    const scheduledDoctors = doctors.map((doc: any, index) => {
      const statuses = ['available', 'in_consultation', 'on_break'];
      return {
        id: doc.id,
        doctorName: doc.user?.name || 'Unknown Doctor',
        department: doc.department?.name || 'General Medicine',
        roomNumber: `OPD-${100 + doc.id}`,
        availableTime: '09:00 AM - 05:00 PM',
        currentStatus: statuses[index % statuses.length],
        nextAvailableSlot: '15 mins',
        leaveStatus: doc.status === 'active' ? 'active' : 'on_leave'
      };
    });

    return res.status(200).json(scheduledDoctors);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching doctors schedule', error: err.message });
  }
});

router.put('/auth/profile', authenticateToken, async (req, res) => {
  const { name, phone, password } = req.body;
  try {
    const user = await User.findByPk((req as any).user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) {
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

export default router;
