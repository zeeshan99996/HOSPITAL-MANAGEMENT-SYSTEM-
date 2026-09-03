import { Router } from 'express';
import { Op } from 'sequelize';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  validateLogin,
  validatePatient,
  validateAppointment,
  validateTokenQueue,
  validateInvoice,
  validateMedicineSale,
  validateMedicine,
  validateLabRequest,
  validateVitals,
  validateAdmission,
  validateDailyExpense,
  validateStaff,
  validateSystemUser,
  validateUserCredentials,
} from '../middleware/validate';
import { login, registerPatient, getProfile } from '../controllers/authController';
import { aiChat } from '../controllers/aiController';
import sequelize from '../config/db';
import { TokenQueue, Doctor, Department, Patient, User, StaffMember, Area, PaymentOption, Invoice, InvoiceItem, SystemUser, Setting } from '../models';
import { getPktDayBounds } from '../utils/timezone';

import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientVitals,
  logPatientVitals,
  recordDoctorConsultation,
  checkDuplicatePatient,
  createPatientVisit,
  getPatientVisits,
  createPatientFeedback,
  getPatientFeedbacks,
  getAllFeedbacks,
  updateFeedbackStatus
} from '../controllers/patientController';
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  createPrescription
} from '../controllers/appointmentController';
import {
  getClinicalTemplates,
  createClinicalTemplate,
  updateClinicalTemplate,
  deleteClinicalTemplate,
  resetClinicalTemplates
} from '../controllers/clinicalTemplateController';
import {
  getBeds,
  createBed,
  updateBed,
  deleteBed,
  admitPatient,
  getAdmissions,
  updateAdmissionNotes,
  dischargePatient,
  transferAdmissionBed,
  createLabRequest,
  getLabRequests,
  processLabSample,
  submitLabResult,
  getLaboratoryTests,
  createLaboratoryTest,
  deleteLaboratoryTest,
  sendSampleToLab
} from '../controllers/medicalController';
import {
  createInvoice,
  getInvoices,
  payInvoice,
  voidInvoice,
  refundInvoicePayment,
  getMedicines,
  updateMedicineStock,
  addMedicine,
  deleteMedicine,
  recordMedicineSale,
  administerMedicine,
  getMedicineRates,
  saveMedicineRate,
  getStockMovements,
  getDailyExpenses,
  createDailyExpense,
  deleteDailyExpense,
  getStaffPayroll,
  generatePayrollForecast,
  payStaffPayroll,
  disburseStaffSalary
} from '../controllers/billingInventoryController';
import {
  getDashboardStats,
  getAllStaff,
  createStaff,
  updateStaffStatus,
  updateDoctor,
  deleteDoctor,
  getDepartments,
  createDepartment,
  getActivityLogs,
  getAllUsersAdmin,
  updateUserCredentials,
  deleteUserAdmin,
  createSystemUserAdmin,
  getBackupLogsHandler,
  triggerBackupHandler,
  getGoogleDriveStatusHandler,
  triggerStrategyHandler,
  cronBackupHandler
} from '../controllers/dashboardController';
import { getRealtimeNotifications } from '../controllers/notificationController';

const router = Router();

// Apply general API rate limiter (150 requests per minute)
router.use(rateLimiter(150, 60000));

// ==========================================
// REAL-TIME SYSTEM NOTIFICATIONS & ALERTS
// ==========================================
router.get('/notifications', authenticateToken, getRealtimeNotifications);

// ==========================================
// PUBLIC & AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', registerPatient);
router.post('/auth/login', validateLogin, login);
router.get('/auth/profile', authenticateToken, getProfile);
router.post('/ai/chat', authenticateToken, rateLimiter(20, 60000), aiChat);

// Public endpoint for Login page to list registered active system accounts
router.get('/auth/system-users', async (_req, res) => {
  try {
    const systemUsers = await SystemUser.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'email', 'role'],
      order: [['id', 'ASC']]
    });

    const users = await User.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'email', 'role'],
      order: [['id', 'ASC']]
    });

    const userMap = new Map();
    [...systemUsers, ...users].forEach((u: any) => {
      const emailLower = (u.email || '').trim().toLowerCase();
      if (emailLower && !userMap.has(emailLower)) {
        userMap.set(emailLower, {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role
        });
      }
    });

    return res.status(200).json(Array.from(userMap.values()));
  } catch (err: any) {
    console.error('Error fetching registered system users:', err);
    return res.status(200).json([]);
  }
});


// Database Connection Health Verification
const handleDbHealthRoute = async (_req: any, res: any) => {
  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    let showTablesQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';";
    if (dialect === 'mysql') {
      showTablesQuery = 'SHOW TABLES;';
    } else if (dialect === 'sqlite') {
      showTablesQuery = "SELECT name FROM sqlite_master WHERE type='table';";
    }
    const [tables]: any = await sequelize.query(showTablesQuery);
    return res.status(200).json({
      status: 'CONNECTED',
      dialect,
      host: dialect === 'sqlite' ? 'local' : (process.env.DB_HOST || '195.35.59.4'),
      database: dialect === 'sqlite' ? 'local_sqlite' : (process.env.DB_NAME || 'u526981273_BfYkc'),
      user: dialect === 'sqlite' ? 'local' : (process.env.DB_USER || 'u526981273_8gj7P'),
      tableCount: tables ? tables.length : 0,
      message: `Successfully connected to ${dialect.toUpperCase()} Database!`
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'DISCONNECTED',
      host: process.env.DB_HOST || '195.35.59.4',
      database: process.env.DB_NAME || 'u526981273_BfYkc',
      user: process.env.DB_USER || 'u526981273_8gj7P',
      error: err.message,
      message: 'Failed to connect to Hostinger MySQL Database. Please verify DB_USER and DB_PASSWORD.'
    });
  }
};

router.get('/health', (_req, res) => res.status(200).json({ status: 'UP', message: 'HMS API Service running healthy' }));
router.get('/health/db', handleDbHealthRoute);
router.get('/db-health', handleDbHealthRoute);

// ==========================================
// PATIENT MANAGEMENT & DUPLICATE CHECK
// ==========================================
router.get('/patients/check-duplicate', authenticateToken, checkDuplicatePatient);
router.post('/patients', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), validatePatient, createPatient);
router.get('/patients', authenticateToken, getAllPatients);
router.get('/patients/:id', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse', 'accountant', 'patient']), getPatientById);
router.put('/patients/:id', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), validatePatient, updatePatient);
router.delete('/patients/:id', authenticateToken, requireRoles(['admin']), deletePatient);

// PATIENT VISITS & INTAKE
router.post('/patients/:id/visits', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor', 'nurse']), createPatientVisit);
router.get('/patients/:id/visits', authenticateToken, getPatientVisits);

// PATIENT FEEDBACK & GRIEVANCES
router.post('/patients/:id/feedback', authenticateToken, createPatientFeedback);
router.get('/patients/:id/feedback', authenticateToken, getPatientFeedbacks);
router.get('/feedbacks', authenticateToken, getAllFeedbacks);
router.put('/feedbacks/:id/status', authenticateToken, requireRoles(['admin', 'receptionist']), updateFeedbackStatus);

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
router.post('/doctor/consultation', authenticateToken, requireRoles(['admin', 'doctor']), recordDoctorConsultation);

// DOCTOR CLINICAL EMR TEMPLATES & CUSTOM QUICK TAGS
router.get('/clinical-templates', authenticateToken, requireRoles(['admin', 'doctor']), getClinicalTemplates);
router.post('/clinical-templates', authenticateToken, requireRoles(['admin', 'doctor']), createClinicalTemplate);
router.put('/clinical-templates/:id', authenticateToken, requireRoles(['admin', 'doctor']), updateClinicalTemplate);
router.delete('/clinical-templates/:id', authenticateToken, requireRoles(['admin', 'doctor']), deleteClinicalTemplate);
router.post('/clinical-templates/reset-defaults', authenticateToken, requireRoles(['admin', 'doctor']), resetClinicalTemplates);

// THERMAL PRINTER & QUEUE TOKEN GENERATION (DOCTOR-SPECIFIC DAILY SEQUENCE)
router.post('/tokens', authenticateToken, requireRoles(['admin', 'receptionist']), validateTokenQueue, async (req, res) => {
  const { type, patientId, doctorId, detail, fee } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const { startOfDay, endOfDay, dateString: localDateStr } = getPktDayBounds();


    // Validate Patient ID
    let validPatientId = Number(patientId);
    let patObj = await Patient.findByPk(validPatientId, { transaction });
    if (!patObj) {
      const fallbackPat = await Patient.findOne({ transaction });
      if (fallbackPat) {
        validPatientId = fallbackPat.id;
        patObj = fallbackPat;
      } else {
        await transaction.rollback();
        return res.status(400).json({ message: 'Valid patient required for token generation.' });
      }
    }

    // Validate Doctor ID
    let validDocId: number | null = null;
    let doctorName = 'General OPD';

    if (doctorId) {
      const numDocId = Number(doctorId);
      let docObj = await Doctor.findByPk(numDocId, {
        include: [
          { model: User, attributes: ['name'] },
          { model: StaffMember, as: 'staffMember', attributes: ['name', 'designation'] }
        ],
        transaction
      });

      if (!docObj) {
        docObj = await Doctor.findOne({
          where: { userId: numDocId },
          include: [
            { model: User, attributes: ['name'] },
            { model: StaffMember, as: 'staffMember', attributes: ['name', 'designation'] }
          ],
          transaction
        });
      }

      if (docObj) {
        validDocId = docObj.id;
        const dName = docObj.staffMember?.name || docObj.user?.name || `Doctor #${docObj.id}`;
        doctorName = dName.startsWith('Dr') ? dName : `Dr. ${dName}`;
      }
    }

    if (!validDocId) {
      const fallbackDoc = await Doctor.findOne({
        include: [
          { model: User, attributes: ['name'] },
          { model: StaffMember, as: 'staffMember', attributes: ['name', 'designation'] }
        ],
        transaction
      });
      if (fallbackDoc) {
        validDocId = fallbackDoc.id;
        const dName = fallbackDoc.staffMember?.name || fallbackDoc.user?.name || `Doctor #${fallbackDoc.id}`;
        doctorName = dName.startsWith('Dr') ? dName : `Dr. ${dName}`;
      }
    }

    let docSeq = 1;
    const whereCondition: any = {
      createdAt: {
        [Op.between]: [startOfDay, endOfDay]
      }
    };
    if (validDocId) {
      whereCondition.doctorId = validDocId;
    } else {
      whereCondition.doctorId = null;
    }

    // Retrieve today's existing tokens within transaction lock for accurate sequence
    const todayTokens = await TokenQueue.findAll({
      where: whereCondition,
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    docSeq = todayTokens.length + 1;

    const tokenId = `T-${String(docSeq).padStart(2, '0')}`;

    const token = await TokenQueue.create({
      tokenNumber: tokenId,
      type: type || 'opd',
      patientId: validPatientId,
      doctorId: validDocId,
      status: 'waiting',
      waitingTime: Math.floor(5 + Math.random() * 20),
      detail: detail || `OPD Consultation with ${doctorName}`
    }, { transaction });

    // If fee > 0, generate consultation invoice
    const numericFee = Math.max(0, Number(fee) || 0);
    if (numericFee > 0) {
      try {
        const invoice = await Invoice.create({
          patientId: validPatientId,
          totalAmount: numericFee,
          discount: 0.00,
          tax: 0.00,
          grandTotal: numericFee,
          paidAmount: numericFee,
          status: 'paid',
          insuranceClaimed: false,
          paymentMethod: 'cash'
        }, { transaction });

        await InvoiceItem.create({
          invoiceId: invoice.id,
          itemName: `Consultation Fee - ${doctorName} (${tokenId})`,
          itemCategory: 'Consultation',
          unitPrice: numericFee,
          quantity: 1,
          totalPrice: numericFee,
        }, { transaction });
      } catch (invErr) {
        console.warn('Invoice generation warning:', invErr);
      }
    }

    await transaction.commit();

    // Populate associations
    const populated = await TokenQueue.findByPk(token.id, {
      include: [
        { model: Patient, attributes: ['name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ]
    });

    return res.status(201).json(populated);
  } catch (err: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error generating token.', error: err.message });
  }
});

// ==========================================
// BED & ADMISSION MANAGEMENT (IPD & SURGERY)
// ==========================================
router.get('/beds', authenticateToken, getBeds);
router.post('/beds', authenticateToken, requireRoles(['admin', 'receptionist']), createBed);
router.put('/beds/:id', authenticateToken, requireRoles(['admin', 'receptionist']), updateBed);
router.delete('/beds/:id', authenticateToken, requireRoles(['admin']), deleteBed);
router.post('/admissions', authenticateToken, requireRoles(['admin', 'receptionist']), validateAdmission, admitPatient);
router.get('/admissions', authenticateToken, getAdmissions);
router.put('/admissions/:id/notes', authenticateToken, requireRoles(['admin', 'doctor', 'nurse', 'receptionist']), updateAdmissionNotes);
router.put('/admissions/:id/discharge', authenticateToken, requireRoles(['admin', 'doctor', 'receptionist']), dischargePatient);
router.post('/admissions/:id/transfer', authenticateToken, requireRoles(['admin', 'receptionist', 'nurse']), transferAdmissionBed);

// ==========================================
// LABORATORY MANAGEMENT
// ==========================================
router.post('/lab/requests', authenticateToken, requireRoles(['admin', 'doctor', 'receptionist']), validateLabRequest, createLabRequest);
router.get('/lab/requests', authenticateToken, getLabRequests);
router.put('/lab/requests/:id/process', authenticateToken, requireRoles(['admin', 'receptionist']), processLabSample);
router.put('/lab/requests/:id/send', authenticateToken, requireRoles(['admin', 'nurse', 'receptionist']), sendSampleToLab);
router.put('/lab/requests/:id/result', authenticateToken, requireRoles(['admin', 'receptionist']), submitLabResult);

// LAB TESTS RATE CATALOG
router.get('/lab/tests', authenticateToken, getLaboratoryTests);
router.post('/lab/tests', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), createLaboratoryTest);
router.delete('/lab/tests/:id', authenticateToken, requireRoles(['admin', 'receptionist']), deleteLaboratoryTest);

// ==========================================
// BILLING, PAYROLL, PETTY CASH LEDGER
// ==========================================
router.post('/invoices', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), validateInvoice, createInvoice);
router.get('/invoices', authenticateToken, getInvoices);
router.put('/invoices/:id/pay', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist', 'patient']), payInvoice);
router.post('/invoices/:id/payment', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist', 'patient']), payInvoice);
router.post('/invoices/:id/pay', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist', 'patient']), payInvoice);
router.post('/invoices/:id/void', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), voidInvoice);
router.post('/invoices/:id/refund', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), refundInvoicePayment);

// PETTY CASH daily expenses ledger
router.get('/expenses', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), getDailyExpenses);
router.post('/expenses', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), validateDailyExpense, createDailyExpense);
router.delete('/expenses/:id', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), deleteDailyExpense);

// MONTHLY PAYROLL SYSTEM & forecasts
router.get('/payroll', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), getStaffPayroll);
router.post('/payroll/forecast', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), generatePayrollForecast);
router.post('/payroll/disburse', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), disburseStaffSalary);
router.put('/payroll/:id/pay', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), payStaffPayroll);

// ==========================================
// PHARMACY & MEDICINE INVENTORY
// ==========================================
router.get('/medicines', authenticateToken, getMedicines);
router.post('/medicines', authenticateToken, requireRoles(['admin', 'pharmacist', 'accountant', 'receptionist']), validateMedicine, addMedicine);
router.put('/medicines/:id', authenticateToken, requireRoles(['admin', 'pharmacist', 'accountant', 'receptionist']), updateMedicineStock);
router.delete('/medicines/:id', authenticateToken, requireRoles(['admin', 'pharmacist', 'receptionist']), deleteMedicine);
router.post('/medicines/sale', authenticateToken, requireRoles(['admin', 'pharmacist', 'receptionist', 'accountant', 'nurse']), recordMedicineSale);
router.get('/medicines/stock-movements', authenticateToken, getStockMovements);

// DIRECT MEDICINE/INJECTION CLINICAL ADMINISTRATION
router.post('/medicines/administer', authenticateToken, requireRoles(['admin', 'nurse', 'doctor', 'pharmacist', 'receptionist']), administerMedicine);

// MEDICINE PRE-DEFINED RATE CONFIGS
router.get('/medicines/rates', authenticateToken, getMedicineRates);
router.post('/medicines/rates', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist']), saveMedicineRate);

// ==========================================
// ADMIN DASHBOARD & STAFF / DOCTOR OPERATIONS
// ==========================================
router.get('/staff', authenticateToken, getAllStaff);
router.get('/admin/stats', authenticateToken, requireRoles(['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant']), getDashboardStats);
router.get('/admin/staff', authenticateToken, requireRoles(['admin', 'accountant', 'receptionist', 'doctor', 'nurse', 'pharmacist', 'lab_technician']), getAllStaff);
router.post('/admin/staff', authenticateToken, requireRoles(['admin']), validateStaff, createStaff);
router.put('/admin/staff/:id/status', authenticateToken, requireRoles(['admin']), updateStaffStatus);
router.put('/doctors/:id', authenticateToken, requireRoles(['admin']), updateDoctor);
router.delete('/doctors/:id', authenticateToken, requireRoles(['admin']), deleteDoctor);
router.get('/admin/users', authenticateToken, getAllUsersAdmin);
router.post('/admin/users', authenticateToken, validateSystemUser, createSystemUserAdmin);
router.put('/admin/users/:id/credentials', authenticateToken, validateUserCredentials, updateUserCredentials);
router.delete('/admin/users/:id', authenticateToken, deleteUserAdmin);
router.get('/admin/departments', authenticateToken, getDepartments);
router.post('/admin/departments', authenticateToken, requireRoles(['admin']), createDepartment);
router.get('/admin/logs', authenticateToken, requireRoles(['admin']), getActivityLogs);
router.get('/admin/backups', authenticateToken, requireRoles(['admin']), getBackupLogsHandler);
router.get('/admin/backups/gdrive-status', authenticateToken, requireRoles(['admin']), getGoogleDriveStatusHandler);
router.post('/admin/backups/run', authenticateToken, requireRoles(['admin']), rateLimiter(30, 60000), triggerBackupHandler);
router.post('/admin/backups/evaluate-strategy', authenticateToken, requireRoles(['admin']), triggerStrategyHandler);
router.get('/cron/backup', cronBackupHandler);
router.post('/cron/backup', cronBackupHandler);

// ==========================================
// RECEPTIONIST PORTAL ENDPOINTS
// ==========================================
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getPktDayBounds();

    const tokens = await TokenQueue.findAll({
      where: {
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrNumber', 'phone'] },
        {
          model: Doctor,
          include: [
            { model: User, attributes: ['id', 'name', 'email'] },
            { model: StaffMember, as: 'staffMember', attributes: ['id', 'name', 'designation', 'phone'] },
            { model: Department, attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    return res.status(200).json(tokens);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching token queue', error: err.message });
  }
});

router.put('/tokens/:id/status', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor']), async (req, res) => {
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

router.put('/tokens/:id/transfer', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor']), async (req, res) => {
  const { doctorId, notes } = req.body;
  try {
    const token = await TokenQueue.findByPk(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    const targetDocId = doctorId ? Number(doctorId) : null;
    token.transferredToDoctorId = targetDocId;
    token.doctorId = targetDocId;
    token.status = 'transferred';
    if (notes) token.detail = `${token.detail || ''} (Transferred: ${notes})`;
    await token.save();
    return res.status(200).json({ message: 'Token transferred successfully', token });
  } catch (err: any) {
    return res.status(500).json({ message: 'Error transferring token', error: err.message });
  }
});

router.put('/tokens/:id/action', authenticateToken, requireRoles(['admin', 'receptionist', 'doctor']), async (req, res) => {
  const { action } = req.body; // 'recall', 'no_show', 'cancel'
  try {
    const token = await TokenQueue.findByPk(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (action === 'recall') {
      token.status = 'waiting';
    } else if (action === 'no_show') {
      token.status = 'no_show';
    } else if (action === 'cancel') {
      token.status = 'cancelled';
    }
    await token.save();
    return res.status(200).json({ message: `Token action ${action} applied.`, token });
  } catch (err: any) {
    return res.status(500).json({ message: 'Error updating token action', error: err.message });
  }
});

router.get('/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'phone', 'status'] },
        { model: StaffMember, as: 'staffMember', attributes: ['id', 'name', 'phone', 'cnic', 'designation', 'status'] },
        { model: Department, attributes: ['id', 'name'] }
      ]
    });

    const formatted = doctors
      .filter((d: any) => d.staffMember || d.user)
      .map((d: any) => {
        const staff = d.staffMember;
        const user = d.user;
        const rawName = staff?.name || user?.name || `Doctor #${d.id}`;
        const cleanName = rawName.startsWith('Dr') ? rawName : `Dr. ${rawName}`;
        const spec = d.specialization || staff?.designation || 'General OPD';
        const fee = d.consultationFee || 500;
        const status = d.status === 'inactive' || staff?.status === 'inactive' || user?.status === 'inactive' ? 'inactive' : 'active';

        return {
          id: d.id,
          userId: d.userId,
          staffId: d.staffId,
          name: cleanName,
          specialization: spec,
          consultationFee: fee,
          departmentId: d.departmentId,
          department: d.department || { id: 1, name: 'General OPD' },
          status,
          phone: staff?.phone || user?.phone || '',
          user: user || (staff ? { id: staff.id, name: cleanName, phone: staff.phone, email: '' } : null),
          staffMember: staff || null,
        };
      });

    return res.status(200).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching doctors', error: err.message });
  }
});

router.get('/doctors/schedule', authenticateToken, async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        { model: User, attributes: ['name', 'email', 'phone'] },
        { model: StaffMember, as: 'staffMember', attributes: ['name', 'phone', 'designation', 'status'] },
        { model: Department, attributes: ['name'] }
      ]
    });

    const { startOfDay, endOfDay } = getPktDayBounds();

    const activeTokens = await TokenQueue.findAll({
      where: {
        status: ['processing', 'waiting'],
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      }
    });

    const scheduledDoctors = doctors
      .filter((d: any) => d.staffMember || d.user)
      .map((doc: any) => {
        const rawName = doc.staffMember?.name || doc.user?.name || `Doctor #${doc.id}`;
        const docName = rawName.startsWith('Dr') ? rawName : `Dr. ${rawName}`;
        const isProcessing = activeTokens.some((t: any) => t.doctorId === doc.id && t.status === 'processing');
        const isWaiting = activeTokens.some((t: any) => t.doctorId === doc.id && t.status === 'waiting');

        let currentStatus = 'available';
        if (doc.status === 'inactive' || doc.staffMember?.status === 'inactive') {
          currentStatus = 'on_break';
        } else if (isProcessing) {
          currentStatus = 'in_consultation';
        }

        return {
          id: doc.id,
          doctorName: docName,
          name: docName,
          specialization: doc.specialization || doc.staffMember?.designation || 'General OPD',
          department: doc.department?.name || 'General OPD',
          roomNumber: `OPD-${100 + doc.id}`,
          availableTime: '09:00 AM - 05:00 PM',
          currentStatus,
          consultationFee: doc.consultationFee || 500,
          nextAvailableSlot: isProcessing ? '15 mins' : (isWaiting ? '10 mins' : 'Immediate'),
          leaveStatus: (doc.status === 'active' && doc.staffMember?.status !== 'inactive') ? 'active' : 'on_leave'
        };
      });

    return res.status(200).json(scheduledDoctors);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching doctor schedule', error: err.message });
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

// ==========================================
// CLINIC PROFILE & PRINTING PARAMETERS
// ==========================================
router.get('/settings/clinic', async (_req, res) => {
  try {
    const settings = await Setting.findAll();
    const map: Record<string, string> = {};
    settings.forEach(s => {
      map[s.key] = s.value;
    });
    return res.status(200).json({
      clinicName: map['clinic_name'] || 'DR. TALHA CLINIC',
      clinicAddress: map['clinic_address'] || '12-B, Main Boulevard, Gulberg III, Lahore',
      clinicPhone: map['clinic_phone'] || '(042) 35889900',
      clinicMobile: map['clinic_mobile'] || '0311-6353044',
      receiptFooter: map['receipt_footer'] || 'THANK YOU FOR VISITING DR. TALHA CLINIC\nPLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD'
    });
  } catch (err: any) {
    return res.status(200).json({
      clinicName: 'DR. TALHA CLINIC',
      clinicAddress: '12-B, Main Boulevard, Gulberg III, Lahore',
      clinicPhone: '(042) 35889900',
      clinicMobile: '0311-6353044',
      receiptFooter: 'THANK YOU FOR VISITING DR. TALHA CLINIC\nPLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD'
    });
  }
});

router.put('/settings/clinic', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  try {
    const { clinicName, clinicAddress, clinicPhone, clinicMobile, receiptFooter } = req.body;
    
    const items = [
      { key: 'clinic_name', value: clinicName || 'DR. TALHA CLINIC', description: 'Clinic Header Name' },
      { key: 'clinic_address', value: clinicAddress || '12-B, Main Boulevard, Gulberg III, Lahore', description: 'Clinic Address' },
      { key: 'clinic_phone', value: clinicPhone || '(042) 35889900', description: 'Clinic Telephone' },
      { key: 'clinic_mobile', value: clinicMobile || '0311-6353044', description: 'Clinic Mobile / WhatsApp' },
      { key: 'receipt_footer', value: receiptFooter || 'THANK YOU FOR VISITING DR. TALHA CLINIC\nPLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD', description: 'Receipt Footer' }
    ];

    for (const item of items) {
      const existing = await Setting.findOne({ where: { key: item.key } });
      if (existing) {
        await existing.update({ value: item.value });
      } else {
        await Setting.create({ key: item.key, value: item.value, description: item.description });
      }
    }

    return res.status(200).json({
      message: 'Clinic printing parameters updated successfully',
      clinicName: clinicName || 'DR. TALHA CLINIC',
      clinicAddress: clinicAddress || '12-B, Main Boulevard, Gulberg III, Lahore',
      clinicPhone: clinicPhone || '(042) 35889900',
      clinicMobile: clinicMobile || '0311-6353044',
      receiptFooter: receiptFooter || 'THANK YOU FOR VISITING DR. TALHA CLINIC\nPLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Error updating clinic parameters', error: err.message });
  }
});

// ==========================================
// AREA / COLONY MANAGEMENT (ADMIN & RECEPTIONIST EDITABLE)
// ==========================================
router.get('/settings/areas', authenticateToken, async (_req, res) => {
  try {
    const areas = await Area.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json(areas || []);
  } catch (err: any) {
    console.warn('[Settings Areas GET Notice]:', err?.message);
    return res.status(500).json({ message: 'Error retrieving areas', error: err?.message });
  }
});

router.post('/settings/areas', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Area name is required' });
  }
  const cleanName = name.trim();
  try {
    const existing = await Area.findOne({ where: { name: cleanName } });
    if (existing) {
      return res.status(200).json(existing);
    }
    const area = await Area.create({ name: cleanName });
    return res.status(201).json(area);
  } catch (err: any) {
    console.error('[Settings Area Create Error]:', err);
    return res.status(200).json({ id: Date.now(), name: cleanName });
  }
});

router.delete('/settings/areas/:id', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { id } = req.params;
  try {
    const area = await Area.findByPk(id);
    if (area) {
      await area.destroy();
    }
    return res.status(200).json({ message: 'Area removed successfully' });
  } catch (err: any) {
    return res.status(200).json({ message: 'Area removed successfully' });
  }
});

router.put('/settings/areas/:id', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Area name is required' });
  }
  const cleanName = name.trim();
  try {
    const area = await Area.findByPk(id);
    if (area) {
      await area.update({ name: cleanName });
      return res.status(200).json(area);
    }
    return res.status(200).json({ id: Number(id), name: cleanName });
  } catch (err: any) {
    return res.status(200).json({ id: Number(id), name: cleanName });
  }
});

// ==========================================
// REGISTRATION PAYMENT MODES (ADMIN & RECEPTIONIST EDITABLE)
// ==========================================
router.get('/settings/payment-modes', authenticateToken, async (_req, res) => {
  try {
    const options = await PaymentOption.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json(options || []);
  } catch (err: any) {
    console.warn('[Settings Payment Modes GET Notice]:', err?.message);
    return res.status(500).json({ message: 'Error retrieving payment modes', error: err?.message });
  }
});

router.post('/settings/payment-modes', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Payment mode name is required' });
  }
  const cleanName = name.trim();
  try {
    const existing = await PaymentOption.findOne({ where: { name: cleanName } });
    if (existing) {
      return res.status(200).json(existing);
    }
    const option = await PaymentOption.create({ name: cleanName });
    return res.status(201).json(option);
  } catch (err: any) {
    console.error('[Settings PaymentOption Create Error]:', err);
    return res.status(200).json({ id: Date.now(), name: cleanName });
  }
});

router.delete('/settings/payment-modes/:id', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { id } = req.params;
  try {
    const option = await PaymentOption.findByPk(id);
    if (option) {
      await option.destroy();
    }
    return res.status(200).json({ message: 'Payment option removed successfully' });
  } catch (err: any) {
    return res.status(200).json({ message: 'Payment option removed successfully' });
  }
});

router.put('/settings/payment-modes/:id', authenticateToken, requireRoles(['admin', 'receptionist']), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Payment option name is required' });
  }
  const cleanName = name.trim();
  try {
    const option = await PaymentOption.findByPk(id);
    if (option) {
      await option.update({ name: cleanName });
      return res.status(200).json(option);
    }
    return res.status(200).json({ id: Number(id), name: cleanName });
  } catch (err: any) {
    return res.status(200).json({ id: Number(id), name: cleanName });
  }
});

export default router;
