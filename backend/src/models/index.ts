import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// ==========================================
// 1. ROLE & PERMISSION MODELS (Strict RBAC)
// ==========================================
export class Role extends Model {
  declare id: number;
  declare name: string;
  declare description: string;
}
Role.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'role' }
);

export class Permission extends Model {
  declare id: number;
  declare name: string;
  declare description: string;
}
Permission.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'permission' }
);

export class RolePermission extends Model {
  declare roleId: number;
  declare permissionId: number;
}
RolePermission.init(
  {
    roleId: { type: DataTypes.INTEGER, primaryKey: true, references: { model: 'roles', key: 'id' } },
    permissionId: { type: DataTypes.INTEGER, primaryKey: true, references: { model: 'permissions', key: 'id' } },
  },
  { sequelize, modelName: 'role_permission', timestamps: false }
);

// ==========================================
// 2. USER MODEL
// ==========================================
export class User extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: 'admin' | 'doctor' | 'receptionist' | 'lab_technician' | 'pharmacist' | 'accountant' | 'nurse' | 'patient';
  declare phone: string;
  declare status: 'active' | 'inactive';
  declare roleId: number | null;
}
User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist', 'accountant', 'nurse', 'patient'),
      allowNull: false,
    },

    phone: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    roleId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'roles', key: 'id' } },
  },
  { sequelize, modelName: 'user', paranoid: true }
);

// ==========================================
// 3. DEPARTMENT MODEL
// ==========================================
export class Department extends Model {
  declare id: number;
  declare name: string;
  declare description: string;
}
Department.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'department' }
);

// ==========================================
// 4. DOCTOR MODEL
// ==========================================
export class Doctor extends Model {
  declare id: number;
  declare userId: number;
  declare departmentId: number;
  declare specialization: string;
  declare consultationFee: number;
  declare status: 'active' | 'inactive';
  declare biography: string;
  declare user?: User;
}
Doctor.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    departmentId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'departments', key: 'id' } },
    specialization: { type: DataTypes.STRING, allowNull: false },
    consultationFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    biography: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'doctor' }
);

// ==========================================
// 5. NURSE MODEL
// ==========================================
export class Nurse extends Model {
  declare id: number;
  declare userId: number;
  declare departmentId: number;
  declare status: 'active' | 'inactive';
}
Nurse.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    departmentId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'departments', key: 'id' } },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  },
  { sequelize, modelName: 'nurse' }
);

// ==========================================
// 6. PATIENT MODEL
// ==========================================
export class Patient extends Model {
  declare id: number;
  declare userId: number | null;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare gender: 'male' | 'female' | 'other';
  declare dob: string;
  declare address: string;
  declare emergencyContactName: string;
  declare emergencyContactPhone: string;
  declare bloodGroup: string;
  declare allergies: string;
  declare insuranceProvider: string;
  declare insurancePolicyNum: string;
  declare mrNumber: string;
  declare createdAt: Date;
}
Patient.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: false },
    gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: false },
    dob: { type: DataTypes.DATEONLY, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: true },
    emergencyContactName: { type: DataTypes.STRING, allowNull: true },
    emergencyContactPhone: { type: DataTypes.STRING, allowNull: true },
    bloodGroup: { type: DataTypes.STRING, allowNull: true },
    allergies: { type: DataTypes.TEXT, allowNull: true },
    insuranceProvider: { type: DataTypes.STRING, allowNull: true },
    insurancePolicyNum: { type: DataTypes.STRING, allowNull: true },
    mrNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  { sequelize, modelName: 'patient', paranoid: true }
);

// ==========================================
// 7. PATIENT VITALS MODEL
// ==========================================
export class PatientVital extends Model {
  declare id: number;
  declare patientId: number;
  declare bp: string;
  declare temperature: number;
  declare pulse: number;
  declare respRate: number;
  declare spo2: number;
  declare weight: number;
  declare height: number;
  declare notes: string;
  declare loggedBy: number;
}
PatientVital.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    bp: { type: DataTypes.STRING, allowNull: false },
    temperature: { type: DataTypes.DECIMAL(4, 1), allowNull: false },
    pulse: { type: DataTypes.INTEGER, allowNull: false },
    respRate: { type: DataTypes.INTEGER, allowNull: false },
    spo2: { type: DataTypes.INTEGER, allowNull: false },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    height: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    loggedBy: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  },
  { sequelize, modelName: 'patient_vital' }
);

// ==========================================
// 8. WARD & BED MODELS
// ==========================================
export class Ward extends Model {
  declare id: number;
  declare name: string;
  declare description: string;
}
Ward.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'ward' }
);

export class Bed extends Model {
  declare id: number;
  declare bedNumber: string;
  declare wardName: string;
  declare type: 'general' | 'icu' | 'semi-private' | 'private';
  declare status: 'available' | 'occupied' | 'maintenance';
  declare wardId: number | null;
}
Bed.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bedNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    wardName: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('general', 'icu', 'semi-private', 'private'), defaultValue: 'general' },
    status: { type: DataTypes.ENUM('available', 'occupied', 'maintenance'), defaultValue: 'available' },
    wardId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'wards', key: 'id' } },
  },
  { sequelize, modelName: 'bed' }
);

// ==========================================
// 9. ADMISSION MODEL (IPD & Surgery Advances)
// ==========================================
export class Admission extends Model {
  declare id: number;
  declare patientId: number;
  declare bedId: number;
  declare doctorId: number;
  declare admissionDate: Date;
  declare dischargeDate: Date | null;
  declare condition: string;
  declare status: 'admitted' | 'discharged';
  declare notes: string;
  declare baselineCost: number;
  declare advancePaid: number;
  declare discount: number;
  declare patient?: Patient;
  declare doctor?: Doctor;
  declare bed?: Bed;
}
Admission.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    bedId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'beds', key: 'id' } },
    doctorId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'doctors', key: 'id' } },
    admissionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    dischargeDate: { type: DataTypes.DATE, allowNull: true },
    condition: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('admitted', 'discharged'), defaultValue: 'admitted' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    baselineCost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    advancePaid: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  },
  { sequelize, modelName: 'admission' }
);

// ==========================================
// 10. APPOINTMENT MODEL
// ==========================================
export class Appointment extends Model {
  declare id: number;
  declare patientId: number;
  declare doctorId: number;
  declare appointmentDate: Date;
  declare queueToken: string;
  declare status: 'pending' | 'consultation' | 'completed' | 'cancelled';
  declare type: 'online' | 'walk-in';
  declare symptoms: string;
  declare notes: string;
  declare patient?: Patient;
  declare doctor?: Doctor;
}
Appointment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    doctorId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'doctors', key: 'id' } },
    appointmentDate: { type: DataTypes.DATE, allowNull: false },
    queueToken: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'consultation', 'completed', 'cancelled'),
      defaultValue: 'pending',
    },
    type: { type: DataTypes.ENUM('online', 'walk-in'), defaultValue: 'walk-in' },
    symptoms: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'appointment', paranoid: true }
);

// ==========================================
// 11. PRESCRIPTION MODEL
// ==========================================
export class Prescription extends Model {
  declare id: number;
  declare appointmentId: number;
  declare diagnosis: string;
  declare notes: string;
  declare prescriptionDate: Date;
}
Prescription.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    appointmentId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'appointments', key: 'id' } },
    diagnosis: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    prescriptionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'prescription' }
);

export class PrescriptionItem extends Model {
  declare id: number;
  declare prescriptionId: number;
  declare medicineName: string;
  declare dosage: string;
  declare frequency: string;
  declare duration: string;
}
PrescriptionItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    prescriptionId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'prescriptions', key: 'id' } },
    medicineName: { type: DataTypes.STRING, allowNull: false },
    dosage: { type: DataTypes.STRING, allowNull: false },
    frequency: { type: DataTypes.STRING, allowNull: false },
    duration: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'prescription_item' }
);

// ==========================================
// 12. PHARMACY MEDICINE & RATES
// ==========================================
export class Medicine extends Model {
  declare id: number;
  declare name: string;
  declare category: string;
  declare stockLevel: number;
  declare batchNumber: string;
  declare expiryDate: string;
  declare price: number;
  declare supplierName: string;
  declare lowStockThreshold: number;
  declare unit: string;
}
Medicine.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    stockLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
    batchNumber: { type: DataTypes.STRING, allowNull: false },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    supplierName: { type: DataTypes.STRING, allowNull: true },
    lowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 20 },
    unit: { type: DataTypes.STRING, defaultValue: 'vial' },
  },
  { sequelize, modelName: 'medicine' }
);

export class MedicineRate extends Model {
  declare id: number;
  declare medicineId: number;
  declare unitRate: number;
}
MedicineRate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    medicineId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'medicines', key: 'id' } },
    unitRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  },
  { sequelize, modelName: 'medicine_rate' }
);

// ==========================================
// 13. LABORATORY TESTS & RESULTS
// ==========================================
export class LaboratoryTest extends Model {
  declare id: number;
  declare name: string;
  declare category: string;
  declare rate: number;
  declare isOutsourced: boolean;
}
LaboratoryTest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: { type: DataTypes.STRING, defaultValue: 'General' },
    rate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    isOutsourced: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, modelName: 'laboratory_test' }
);

export class LabRequest extends Model {
  declare id: number;
  declare patientId: number;
  declare doctorId: number;
  declare testName: string;
  declare category: string;
  declare status: 'pending' | 'processing' | 'completed';
  declare specimenCollected: boolean;
  declare resultDetails: string;
  declare resultFileUrl: string;
  declare processedDate: Date | null;
  declare sampleStatus: 'collected' | 'sent_to_lab' | 'processing' | 'completed';
  declare specimenCollectedAt: Date | null;
  declare sentToLabAt: Date | null;
  declare patient?: Patient;
  declare doctor?: Doctor;
}
LabRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    doctorId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'doctors', key: 'id' } },
    testName: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, defaultValue: 'General' },
    status: { type: DataTypes.ENUM('pending', 'processing', 'completed'), defaultValue: 'pending' },
    specimenCollected: { type: DataTypes.BOOLEAN, defaultValue: false },
    resultDetails: { type: DataTypes.TEXT, allowNull: true },
    resultFileUrl: { type: DataTypes.STRING, allowNull: true },
    processedDate: { type: DataTypes.DATE, allowNull: true },
    sampleStatus: { type: DataTypes.ENUM('collected', 'sent_to_lab', 'processing', 'completed'), defaultValue: 'collected' },
    specimenCollectedAt: { type: DataTypes.DATE, allowNull: true },
    sentToLabAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'lab_request' }
);

// ==========================================
// 14. INVOICES, PAYMENTS, INSURANCE
// ==========================================
export class Invoice extends Model {
  declare id: number;
  declare patientId: number;
  declare totalAmount: number;
  declare discount: number;
  declare tax: number;
  declare grandTotal: number;
  declare paidAmount: number;
  declare status: 'unpaid' | 'partially_paid' | 'paid';
  declare insuranceClaimed: boolean;
  declare paymentMethod: 'cash' | 'card' | 'online' | 'pending';
  declare patient?: Patient;
  declare invoice_items?: any[];
  declare createdAt: Date;
}
Invoice.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    tax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    grandTotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    status: { type: DataTypes.ENUM('unpaid', 'partially_paid', 'paid'), defaultValue: 'unpaid' },
    insuranceClaimed: { type: DataTypes.BOOLEAN, defaultValue: false },
    paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'online', 'pending'), defaultValue: 'pending' },
  },
  { sequelize, modelName: 'invoice', paranoid: true }
);

export class InvoiceItem extends Model {
  declare id: number;
  declare invoiceId: number;
  declare itemName: string;
  declare itemCategory: string;
  declare unitPrice: number;
  declare quantity: number;
  declare totalPrice: number;
}
InvoiceItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    invoiceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'invoices', key: 'id' } },
    itemName: { type: DataTypes.STRING, allowNull: false },
    itemCategory: { type: DataTypes.STRING, defaultValue: 'Consultation' },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  },
  { sequelize, modelName: 'invoice_item' }
);

export class Payment extends Model {
  declare id: number;
  declare invoiceId: number;
  declare amount: number;
  declare paymentMethod: 'cash' | 'card' | 'online';
  declare paymentDate: Date;
}
Payment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    invoiceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'invoices', key: 'id' } },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'online'), defaultValue: 'cash' },
    paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'payment' }
);

export class InsuranceClaim extends Model {
  declare id: number;
  declare invoiceId: number;
  declare insuranceProvider: string;
  declare policyNumber: string;
  declare claimAmount: number;
  declare approvedAmount: number;
  declare status: 'pending' | 'approved' | 'rejected';
}
InsuranceClaim.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    invoiceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'invoices', key: 'id' } },
    insuranceProvider: { type: DataTypes.STRING, allowNull: false },
    policyNumber: { type: DataTypes.STRING, allowNull: false },
    claimAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    approvedAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  },
  { sequelize, modelName: 'insurance_claim' }
);

// ==========================================
// 15. DAILY CLINIC EXPENSES (Petty Cash Ledger)
// ==========================================
export class DailyExpense extends Model {
  declare id: number;
  declare description: string;
  declare category: string;
  declare amount: number;
  declare spentBy: string;
  declare expenseDate: string;
}
DailyExpense.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    description: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    spentBy: { type: DataTypes.STRING, allowNull: false },
    expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { sequelize, modelName: 'daily_expense' }
);

// ==========================================
// 16. STAFF PAYROLL SYSTEM & FORECASTS
// ==========================================
export class StaffPayroll extends Model {
  declare id: number;
  declare userId: number;
  declare month: string;
  declare basicSalary: number;
  declare allowances: number;
  declare deductions: number;
  declare netSalary: number;
  declare status: 'pending' | 'paid';
  declare paymentDate: Date | null;
}
StaffPayroll.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    month: { type: DataTypes.STRING, allowNull: false },
    basicSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    allowances: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    deductions: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    netSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'paid'), defaultValue: 'pending' },
    paymentDate: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'staff_payroll' }
);

// ==========================================
// 17. SYSTEM NOTIFICATIONS & CONFIG
// ==========================================
export class Notification extends Model {
  declare id: number;
  declare userId: number | null;
  declare title: string;
  declare message: string;
  declare type: 'low_stock' | 'expiry_alert' | 'billing' | 'system' | 'payroll';
  declare status: 'unread' | 'read';
}
Notification.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.ENUM('low_stock', 'expiry_alert', 'billing', 'system', 'payroll'), defaultValue: 'system' },
    status: { type: DataTypes.ENUM('unread', 'read'), defaultValue: 'unread' },
  },
  { sequelize, modelName: 'notification' }
);

export class Setting extends Model {
  declare id: number;
  declare key: string;
  declare value: string;
  declare description: string;
}
Setting.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    value: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'setting' }
);

// ==========================================
// 18. ACTIVITY AUDIT LOG MODEL
// ==========================================
export class ActivityLog extends Model {
  declare id: number;
  declare userId: number | null;
  declare action: string;
  declare details: string;
  declare ipAddress: string;
  declare user?: User;
  declare createdAt: Date;
}
ActivityLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'activity_log' }
);

// ==========================================
// 19. TOKEN QUEUE MODEL
// ==========================================
export class TokenQueue extends Model {
  declare id: number;
  declare tokenNumber: string;
  declare type: 'opd' | 'lab' | 'billing';
  declare patientId: number;
  declare doctorId: number | null;
  declare status: 'waiting' | 'processing' | 'completed' | 'skipped';
  declare waitingTime: number;
  declare detail: string;
  declare patient?: Patient;
  declare doctor?: Doctor;
}
TokenQueue.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tokenNumber: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('opd', 'lab', 'billing'), defaultValue: 'opd' },
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'patients', key: 'id' } },
    doctorId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'doctors', key: 'id' } },
    status: { type: DataTypes.ENUM('waiting', 'processing', 'completed', 'skipped'), defaultValue: 'waiting' },
    waitingTime: { type: DataTypes.INTEGER, defaultValue: 0 },
    detail: { type: DataTypes.STRING, allowNull: true }
  },
  { sequelize, modelName: 'token_queue' }
);

// ==========================================
// RELATIONSHIPS & ASSOCIATIONS
// ==========================================

// RBAC
User.belongsTo(Role, { as: 'roleRelation', foreignKey: 'roleId' });
Role.hasMany(User, { foreignKey: 'roleId' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId' });

// User Profiles
User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Nurse, { foreignKey: 'userId', onDelete: 'CASCADE' });
Nurse.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Patient, { foreignKey: 'userId', onDelete: 'SET NULL' });
Patient.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ActivityLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(StaffPayroll, { foreignKey: 'userId', onDelete: 'CASCADE' });
StaffPayroll.belongsTo(User, { foreignKey: 'userId' });

// Department Associations
Department.hasMany(Doctor, { foreignKey: 'departmentId', onDelete: 'RESTRICT' });
Doctor.belongsTo(Department, { foreignKey: 'departmentId' });

Department.hasMany(Nurse, { foreignKey: 'departmentId', onDelete: 'RESTRICT' });
Nurse.belongsTo(Department, { foreignKey: 'departmentId' });

// Patient Associations
Patient.hasMany(Appointment, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

Patient.hasMany(LabRequest, { foreignKey: 'patientId', onDelete: 'CASCADE' });
LabRequest.belongsTo(Patient, { foreignKey: 'patientId' });

Patient.hasMany(Invoice, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Invoice.belongsTo(Patient, { foreignKey: 'patientId' });

Patient.hasMany(Admission, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Admission.belongsTo(Patient, { foreignKey: 'patientId' });

Patient.hasMany(PatientVital, { foreignKey: 'patientId', onDelete: 'CASCADE' });
PatientVital.belongsTo(Patient, { foreignKey: 'patientId' });

// Vitals Logger
PatientVital.belongsTo(User, { as: 'logger', foreignKey: 'loggedBy' });

// Doctor Associations
Doctor.hasMany(Appointment, { foreignKey: 'doctorId', onDelete: 'RESTRICT' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

Doctor.hasMany(LabRequest, { foreignKey: 'doctorId', onDelete: 'RESTRICT' });
LabRequest.belongsTo(Doctor, { foreignKey: 'doctorId' });

Doctor.hasMany(Admission, { foreignKey: 'doctorId', onDelete: 'RESTRICT' });
Admission.belongsTo(Doctor, { foreignKey: 'doctorId' });

// Ward & Bed Associations
Ward.hasMany(Bed, { foreignKey: 'wardId', onDelete: 'RESTRICT' });
Bed.belongsTo(Ward, { foreignKey: 'wardId' });

Bed.hasMany(Admission, { foreignKey: 'bedId', onDelete: 'RESTRICT' });
Admission.belongsTo(Bed, { foreignKey: 'bedId' });

// Appointment & Prescription Associations
Appointment.hasOne(Prescription, { foreignKey: 'appointmentId', onDelete: 'CASCADE' });
Prescription.belongsTo(Appointment, { foreignKey: 'appointmentId' });

// Prescription & PrescriptionItem Associations
Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescriptionId', onDelete: 'CASCADE' });
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescriptionId' });

// Medicine Rate
Medicine.hasOne(MedicineRate, { foreignKey: 'medicineId', onDelete: 'CASCADE' });
MedicineRate.belongsTo(Medicine, { foreignKey: 'medicineId' });

// Invoice & InvoiceItem Associations
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

Invoice.hasMany(Payment, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId' });

Invoice.hasOne(InsuranceClaim, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });
InsuranceClaim.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// Token Queue relationships
Patient.hasMany(TokenQueue, { foreignKey: 'patientId', onDelete: 'CASCADE' });
TokenQueue.belongsTo(Patient, { foreignKey: 'patientId' });

Doctor.hasMany(TokenQueue, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
TokenQueue.belongsTo(Doctor, { foreignKey: 'doctorId' });
