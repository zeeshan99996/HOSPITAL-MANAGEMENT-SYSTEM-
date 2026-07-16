import bcrypt from 'bcryptjs';
import {
  User,
  Role,
  Permission,
  RolePermission,
  Department,
  Doctor,
  Nurse,
  Patient,
  PatientVital,
  Ward,
  Bed,
  Medicine,
  MedicineRate,
  LaboratoryTest,
  Appointment,
  Invoice,
  InvoiceItem,
  LabRequest,
  Admission,
  DailyExpense,
  StaffPayroll
} from '../models';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Checking if database seeding is required...');
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('[Seed] Database already seeded. Skipping.');
      return;
    }

    console.log('[Seed] Seeding database with initial data...');

    // 1. Hash default password
    const hashedPassword = await bcrypt.hash('Password123', 10);

    // 2. Create Roles & Permissions
    console.log('[Seed] Creating roles and permissions...');
    const rolesData = [
      { name: 'admin', description: 'System Administrator' },
      { name: 'doctor', description: 'Medical Doctor' },
      { name: 'receptionist', description: 'Front Desk Receptionist' },
      { name: 'lab_technician', description: 'Laboratory Technician' },
      { name: 'pharmacist', description: 'Clinical Pharmacist' },
      { name: 'accountant', description: 'Financial Accountant' },
    ];

    const rolesMap: Record<string, Role> = {};
    for (const r of rolesData) {
      rolesMap[r.name] = await Role.create(r);
    }

    const permissionsData = [
      { name: 'register_patient', description: 'Register new patient' },
      { name: 'log_vitals', description: 'Log patient vital history' },
      { name: 'generate_tokens', description: 'Generate queue/bill/lab tokens' },
      { name: 'view_financials', description: 'View revenue and financial metrics' },
      { name: 'manage_payroll', description: 'Manage staff salaries and forecast' },
      { name: 'manage_expenses', description: 'Log daily expenditures' },
      { name: 'administer_meds', description: 'Log direct medication administration' },
      { name: 'configure_rates', description: 'Configure inventory medicine rates' },
    ];

    const permsMap: Record<string, Permission> = {};
    for (const p of permissionsData) {
      permsMap[p.name] = await Permission.create(p);
    }

    // Link all permissions to admin, select to others
    for (const pName of Object.keys(permsMap)) {
      await RolePermission.create({ roleId: rolesMap['admin'].id, permissionId: permsMap[pName].id });
    }

    // Receptionist gets registration, vitals, tokens
    await RolePermission.create({ roleId: rolesMap['receptionist'].id, permissionId: permsMap['register_patient'].id });
    await RolePermission.create({ roleId: rolesMap['receptionist'].id, permissionId: permsMap['log_vitals'].id });
    await RolePermission.create({ roleId: rolesMap['receptionist'].id, permissionId: permsMap['generate_tokens'].id });



    // Accountant gets financials, payroll, expenses, configure_rates
    await RolePermission.create({ roleId: rolesMap['accountant'].id, permissionId: permsMap['view_financials'].id });
    await RolePermission.create({ roleId: rolesMap['accountant'].id, permissionId: permsMap['manage_payroll'].id });
    await RolePermission.create({ roleId: rolesMap['accountant'].id, permissionId: permsMap['manage_expenses'].id });
    await RolePermission.create({ roleId: rolesMap['accountant'].id, permissionId: permsMap['configure_rates'].id });

    // 3. Create Departments
    console.log('[Seed] Creating departments...');
    const deptPayloads = [
      { name: 'Cardiology', description: 'Heart and cardiovascular system care.' },
      { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
      { name: 'Neurology', description: 'Brain, spinal cord, and nervous system health.' },
      { name: 'Orthopedics', description: 'Musculoskeletal system, bones, and joints.' },
      { name: 'General Medicine', description: 'Primary health care, physicals, and check-ups.' },
    ];
    const depts = [];
    for (const payload of deptPayloads) {
      const dept = await Department.create(payload);
      depts.push(dept);
    }

    const userPayloads = [
      { name: 'System Admin', email: 'admin@lifeflow.com', password: hashedPassword, role: 'admin', phone: '1234567890', roleId: rolesMap['admin'].id },
      { name: 'Dr. Jane Smith', email: 'doctor@lifeflow.com', password: hashedPassword, role: 'doctor', phone: '2345678901', roleId: rolesMap['doctor'].id },
      { name: 'Receptionist Emily Davis', email: 'receptionist@lifeflow.com', password: hashedPassword, role: 'receptionist', phone: '4567890123', roleId: rolesMap['receptionist'].id },
      { name: 'Lab Tech Robert Miller', email: 'lab@lifeflow.com', password: hashedPassword, role: 'lab_technician', phone: '5678901234', roleId: rolesMap['lab_technician'].id },
      { name: 'Pharmacist David Wilson', email: 'pharmacist@lifeflow.com', password: hashedPassword, role: 'pharmacist', phone: '6789012345', roleId: rolesMap['pharmacist'].id },
      { name: 'Accountant Mark Evans', email: 'accountant@lifeflow.com', password: hashedPassword, role: 'accountant', phone: '7890123456', roleId: rolesMap['accountant'].id },
    ];
    const users = [];
    for (const payload of userPayloads) {
      const user = await User.create(payload);
      users.push(user);
    }

    // 5. Create Doctor Profile
    console.log('[Seed] Creating doctor profiles...');
    const doctorUser = users.find(u => u.role === 'doctor')!;
    const cardioDept = depts.find(d => d.name === 'Cardiology')!;
    const doctor = await Doctor.create({
      userId: doctorUser.id,
      departmentId: cardioDept.id,
      specialization: 'Interventional Cardiology',
      consultationFee: 150.00,
      status: 'active',
      biography: 'Over 15 years of experience in cardiology and heart care.',
    });



    // 7. Create Wards & Beds
    console.log('[Seed] Creating Wards and Beds...');
    const wardGeneral = await Ward.create({ name: 'General Ward A', description: 'Standard recovery ward' });
    const wardICU = await Ward.create({ name: 'ICU Block B', description: 'Intensive care unit' });
    const wardPrivate = await Ward.create({ name: 'Private Ward C', description: 'Deluxe private suites' });

    const beds = await Bed.bulkCreate([
      { bedNumber: 'B-101', wardName: 'General Ward A', type: 'general', status: 'available', wardId: wardGeneral.id },
      { bedNumber: 'B-102', wardName: 'General Ward A', type: 'general', status: 'available', wardId: wardGeneral.id },
      { bedNumber: 'B-201', wardName: 'ICU Block B', type: 'icu', status: 'available', wardId: wardICU.id },
      { bedNumber: 'B-202', wardName: 'ICU Block B', type: 'icu', status: 'occupied', wardId: wardICU.id },
      { bedNumber: 'B-301', wardName: 'Private Room 301', type: 'private', status: 'available', wardId: wardPrivate.id },
    ]);

    // 8. Create Patients with MR Numbers
    console.log('[Seed] Creating patient profiles...');
    const patient = await Patient.create({
      userId: null,
      name: 'Patient Alice Brown',
      email: 'patient.alice@gmail.com',
      phone: '8901234567',
      gender: 'female',
      dob: '1992-05-15',
      address: '742 Evergreen Terrace, Springfield',
      emergencyContactName: 'John Brown',
      emergencyContactPhone: '8901234568',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Peanuts',
      insuranceProvider: 'BlueCross Shield',
      insurancePolicyNum: 'BCX-99881122',
      mrNumber: 'MR-2026-0001',
    });

    // Add another mock patient (walk-in patient, no login user)
    const walkinPatient = await Patient.create({
      name: 'Bob Jackson',
      email: 'bob.jackson@gmail.com',
      phone: '555-888-9999',
      gender: 'male',
      dob: '1978-10-24',
      address: '123 Main Street, Suite B',
      emergencyContactName: 'Mary Jackson',
      emergencyContactPhone: '555-888-0000',
      bloodGroup: 'A-',
      allergies: 'None',
      insuranceProvider: 'Aetna Health',
      insurancePolicyNum: 'AET-44332211',
      mrNumber: 'MR-2026-0002',
    });

    // 9. Log Initial Vitals
    console.log('[Seed] Creating patient vitals records...');
    await PatientVital.create({
      patientId: patient.id,
      bp: '120/80',
      temperature: 98.6,
      pulse: 72,
      respRate: 16,
      spo2: 99,
      weight: 65.2,
      height: 165.0,
      notes: 'Admitted vitals normal.',
      loggedBy: users.find(u => u.role === 'receptionist')!.id
    });

    await PatientVital.create({
      patientId: walkinPatient.id,
      bp: '135/90',
      temperature: 99.1,
      pulse: 84,
      respRate: 18,
      spo2: 97,
      weight: 80.5,
      height: 178.0,
      notes: 'Mild hypertension noted on intake.',
      loggedBy: users.find(u => u.role === 'admin')!.id
    });

    // 10. Set an admission for the occupied ICU bed (IPD advance setup)
    console.log('[Seed] Setting active admissions...');
    const occupiedBed = beds.find(b => b.status === 'occupied')!;
    await Admission.create({
      patientId: walkinPatient.id,
      bedId: occupiedBed.id,
      doctorId: doctor.id,
      condition: 'Post-Op Coronary Bypass',
      status: 'admitted',
      notes: 'Patient stable, monitor vitals every 2 hours.',
      baselineCost: 15000.00,
      advancePaid: 5000.00,
      discount: 1000.00,
    });

    // 11. Create Medicines & Predefined rates (Clinical Stock)
    console.log('[Seed] Creating medicine inventory & rates...');
    const meds = await Medicine.bulkCreate([
      { name: 'Injection Ceftriaxone 1g', category: 'Antibiotic Injection', stockLevel: 150, batchNumber: 'BAT-2026-X01', expiryDate: '2028-12-31', price: 500.00, supplierName: 'PharmaCorp Inc.', lowStockThreshold: 30, unit: 'vial' },
      { name: 'Injection Dexa 4mg', category: 'Steroid Injection', stockLevel: 80, batchNumber: 'BAT-2026-X02', expiryDate: '2027-09-30', price: 150.00, supplierName: 'Global Meds', lowStockThreshold: 15, unit: 'ampoule' },
      { name: 'Injection Tramadol 50mg/ml', category: 'Analgesic Injection', stockLevel: 120, batchNumber: 'BAT-2026-X03', expiryDate: '2028-06-15', price: 600.00, supplierName: 'PharmaCorp Inc.', lowStockThreshold: 20, unit: 'ml' },
      { name: 'Atorvastatin 20mg', category: 'Cardiovascular', stockLevel: 250, batchNumber: 'BAT-2026-001', expiryDate: '2027-12-31', price: 12.50, supplierName: 'PharmaCorp Inc.', lowStockThreshold: 40, unit: 'tab' },
      { name: 'Amoxicillin 500mg', category: 'Antibiotic', stockLevel: 45, batchNumber: 'BAT-2026-022', expiryDate: '2026-09-30', price: 8.20, supplierName: 'Global Meds', lowStockThreshold: 50, unit: 'tab' }, // low stock
      { name: 'Lisinopril 10mg', category: 'Cardiovascular', stockLevel: 8, batchNumber: 'BAT-2026-111', expiryDate: '2026-08-15', price: 9.80, supplierName: 'Global Meds', lowStockThreshold: 20, unit: 'tab' }, // Low stock & near expiry
    ]);

    // Create MedicineRates
    for (const med of meds) {
      await MedicineRate.create({
        medicineId: med.id,
        unitRate: med.price,
      });
    }

    // 12. Create Laboratory Tests
    console.log('[Seed] Seeding laboratory tests catalog...');
    await LaboratoryTest.bulkCreate([
      { name: 'Electrocardiogram (ECG)', category: 'Cardiology Test', rate: 500.00, isOutsourced: false },
      { name: 'Lipid Profile (Cholesterol)', category: 'Blood Chemistry', rate: 800.00, isOutsourced: false },
      { name: 'Complete Blood Count (CBC)', category: 'Hematology', rate: 350.00, isOutsourced: false },
      { name: 'MRI Brain Scan', category: 'Radiology', rate: 4500.00, isOutsourced: true },
    ]);

    // 13. Create Appointments
    console.log('[Seed] Creating appointments...');
    const apptDate = new Date();
    apptDate.setHours(apptDate.getHours() + 1);

    const appt1 = await Appointment.create({
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: apptDate,
      queueToken: 'LF-1001',
      status: 'pending',
      type: 'online',
      symptoms: 'Mild chest pain and shortness of breath.',
    });

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const appt2 = await Appointment.create({
      patientId: walkinPatient.id,
      doctorId: doctor.id,
      appointmentDate: pastDate,
      queueToken: 'LF-1002',
      status: 'completed',
      type: 'walk-in',
      symptoms: 'Routine cardiology follow-up.',
      notes: 'Prescribed Atorvastatin. Advised blood test.',
    });

    // 14. Create Lab Request
    console.log('[Seed] Creating laboratory requests...');
    await LabRequest.create({
      patientId: walkinPatient.id,
      doctorId: doctor.id,
      testName: 'Lipid Profile (Cholesterol)',
      category: 'Blood Chemistry',
      status: 'completed',
      specimenCollected: true,
      resultDetails: 'Total Cholesterol: 240 mg/dL (High), LDL: 160 mg/dL (High), HDL: 45 mg/dL (Normal).',
      resultFileUrl: '/uploads/lipid_profile_walkin.pdf',
      processedDate: pastDate,
      sampleStatus: 'completed',
      specimenCollectedAt: pastDate,
      sentToLabAt: pastDate
    });

    await LabRequest.create({
      patientId: patient.id,
      doctorId: doctor.id,
      testName: 'Electrocardiogram (ECG)',
      category: 'Cardiology Test',
      status: 'pending',
      specimenCollected: false,
      sampleStatus: 'collected'
    });

    // 15. Create Invoices
    console.log('[Seed] Creating invoices...');
    const invoice = await Invoice.create({
      patientId: walkinPatient.id,
      totalAmount: 182.00,
      discount: 10.00,
      tax: 15.00,
      grandTotal: 187.00,
      paidAmount: 187.00,
      status: 'paid',
      insuranceClaimed: false,
      paymentMethod: 'card',
    });

    await InvoiceItem.bulkCreate([
      { invoiceId: invoice.id, itemName: 'Cardiology Consultation Fee', itemCategory: 'Consultation', unitPrice: 150.00, quantity: 1, totalPrice: 150.00 },
      { invoiceId: invoice.id, itemName: 'Atorvastatin 20mg (16 tablets)', itemCategory: 'Pharmacy', unitPrice: 2.00, quantity: 16, totalPrice: 32.00 },
    ]);

    // Create a pending unpaid invoice
    const unpaidInvoice = await Invoice.create({
      patientId: patient.id,
      totalAmount: 150.00,
      discount: 0.00,
      tax: 12.00,
      grandTotal: 162.00,
      paidAmount: 0.00,
      status: 'unpaid',
      insuranceClaimed: true,
      paymentMethod: 'pending',
    });

    await InvoiceItem.create({
      invoiceId: unpaidInvoice.id,
      itemName: 'Cardiology Consultation Pre-booking',
      itemCategory: 'Consultation',
      unitPrice: 150.00,
      quantity: 1,
      totalPrice: 150.00,
    });

    // 16. Daily Clinic Expenses (Petty Cash Ledger)
    console.log('[Seed] Seeding petty cash daily expenditures...');
    await DailyExpense.bulkCreate([
      { description: 'Guest hospitality - cold drinks', category: 'Hospitality', amount: 350.00, spentBy: ' Emily Davis (Receptionist)', expenseDate: '2026-07-10' },
      { description: 'Staff evening tea and biscuits', category: 'Food', amount: 200.00, spentBy: ' Emily Davis (Receptionist)', expenseDate: '2026-07-11' },
      { description: 'AC Repair & maintenance General Ward A', category: 'Maintenance', amount: 2500.00, spentBy: 'Mark Evans (Accountant)', expenseDate: '2026-07-12' },
      { description: 'Photocopy paper & office supplies', category: 'Office Supplies', amount: 800.00, spentBy: 'Mark Evans (Accountant)', expenseDate: '2026-07-13' },
    ]);

    // 17. Staff Payroll Logs & Pending Month Forecast
    console.log('[Seed] Seeding payroll salary logs...');
    // Seed salaries for some staff members (receptionist, nurse, lab tech)
    const staffToPayroll = users.filter(u => u.role !== 'admin');
    for (const staff of staffToPayroll) {
      let salary = 15000.00;
      if (staff.role === 'doctor') salary = 60000.00;
      else if (staff.role === 'accountant') salary = 25000.00;

      // Seed past month (June) as PAID
      await StaffPayroll.create({
        userId: staff.id,
        month: '2026-06',
        basicSalary: salary,
        allowances: 1000.00,
        deductions: 500.00,
        netSalary: salary + 1000.00 - 500.00,
        status: 'paid',
        paymentDate: new Date('2026-06-30')
      });

      // Seed current month (July) as PENDING (as forecast)
      await StaffPayroll.create({
        userId: staff.id,
        month: '2026-07',
        basicSalary: salary,
        allowances: 1200.00,
        deductions: 400.00,
        netSalary: salary + 1200.00 - 400.00,
        status: 'pending',
        paymentDate: null
      });
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
};
