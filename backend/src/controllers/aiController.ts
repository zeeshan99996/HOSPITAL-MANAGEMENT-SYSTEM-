import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db';
import {
  User,
  Patient,
  Bed,
  Invoice,
  InvoiceItem,
  DailyExpense,
  Appointment,
  Medicine,
  MedicineRate,
  LabRequest,
  TokenQueue,
  ActivityLog,
  Doctor,
  Admission,
  Department,
  Setting
} from '../models';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL_NAME = 'meta-llama/llama-3-8b-instruct:free';
const FALLBACK_MODEL_NAME = 'meta-llama/llama-3.2-3b-instruct:free';

// Left Sidebar restrictions mapping
const SIDEBAR_MENUS: Record<string, string[]> = {
  admin: [
    'Dashboard', 'Patient Registration', 'Patients', 'Appointments',
    'Token Queue', 'Doctors Schedule', 'Bed Admissions', 'Laboratory Tests',
    'Pharmacy & Stock', 'Billing & Invoices', 'Reports', 'Profile', 'Staff Registry',
    'Activity Audit', 'Settings'
  ],
  doctor: [
    'Dashboard', 'Patients', 'Appointments', 'Doctors Schedule',
    'Bed Admissions', 'Laboratory Tests', 'Profile'
  ],
  receptionist: [
    'Dashboard', 'Patient Registration', 'Patients', 'Appointments',
    'Token Queue', 'Doctors Schedule', 'Billing & Invoices', 'Reports', 'Profile'
  ],
  pharmacist: [
    'Dashboard', 'Pharmacy & Stock', 'Profile'
  ],
  lab_technician: [
    'Dashboard', 'Laboratory Tests', 'Profile'
  ],
  accountant: [
    'Dashboard', 'Patients', 'Pharmacy & Stock', 'Billing & Invoices',
    'Reports', 'Profile'
  ],
  nurse: [
    'Dashboard', 'Patients', 'Appointments', 'Bed Admissions', 'Profile'
  ],
  patient: [
    'Dashboard', 'Appointments', 'Profile'
  ]
};

// Define tool specifications to share with LLM
const TOOLS_DEFINITION = [
  {
    name: 'get_dashboard_stats',
    description: 'Fetch counts and totals of patients, occupied beds, revenue, daily expenses, and pending appointments.'
  },
  {
    name: 'register_patient',
    description: 'Create a new patient file along with a user login credentials account. Requires name, gender, dob, phone. Optional fields: email, address, bloodGroup, allergies, insuranceProvider, insurancePolicyNum.',
    parameters: ['name', 'gender', 'dob', 'phone', 'email', 'address', 'bloodGroup', 'allergies', 'insuranceProvider', 'insurancePolicyNum']
  },
  {
    name: 'get_patients_list',
    description: 'Search through patients list. Optional filter: search (matching name, phone, or MR number).',
    parameters: ['search']
  },
  {
    name: 'check_inventory',
    description: 'Query, add stock, add/create new medicines, or delete medicines in the inventory. Allowed roles: Admin, Pharmacist. Parameters: action ("view" / "add_stock" / "create" / "delete"), id (medicine ID), name (medicine name), category, stockLevel, lowStockThreshold, unit, price, batchNumber, expiryDate, quantity (amount to add to stock).',
    parameters: ['action', 'id', 'name', 'category', 'stockLevel', 'lowStockThreshold', 'unit', 'price', 'batchNumber', 'expiryDate', 'quantity']
  },
  {
    name: 'billing_summary',
    description: 'Fetch overview of invoices and unpaid payment ledger logs.'
  },
  {
    name: 'test_request',
    description: 'Pull active laboratory requests and diagnostic test processing logs.'
  },
  {
    name: 'manage_appointments',
    description: 'Query, schedule, or update appointment records. For action "create", you can pass patient MR number (e.g., "MR-2026-0012") or patient name string directly into "patientId", and doctor name string directly into "doctorId".',
    parameters: ['action', 'id', 'patientId', 'patientName', 'doctorId', 'doctorName', 'appointmentDate', 'status', 'symptoms']
  },
  {
    name: 'token_queue_status',
    description: 'Query or create token queue entries. For action "create", you can pass patient MR number or patient name string directly into "patientId", and doctor name string directly into "doctorId".',
    parameters: ['action', 'id', 'status', 'type', 'patientId', 'patientName', 'doctorId', 'doctorName', 'detail']
  },
  {
    name: 'manage_beds',
    description: 'Query ward occupancy, or admit a patient (action: "admit"). For action "admit", you can pass patient MR number or patient name string directly into "patientId", bedNumber (e.g., "G-101"), doctor name string directly into "doctorId", and condition.',
    parameters: ['action', 'patientId', 'patientName', 'bedId', 'bedNumber', 'doctorId', 'doctorName', 'condition', 'notes', 'baselineCost', 'advancePaid']
  },
  {
    name: 'doctors_schedule',
    description: 'Query active doctors schedule list, current consultation room allocations, availability timings, and live status.',
    parameters: ['action']
  },
  {
    name: 'manage_staff',
    description: 'Query, register, or delete staff members. Allowed roles: Admin. Parameters: action ("view" / "create" / "delete"), name, email, role (e.g., "doctor", "nurse", "receptionist"), phone, id (staff ID for delete).',
    parameters: ['action', 'id', 'name', 'email', 'role', 'phone']
  },
  {
    name: 'activity_audit',
    description: 'Retrieve EMR system-wide user activity logs. Requires Admin role.',
    parameters: ['action']
  },
  {
    name: 'manage_settings',
    description: 'Query EMR system parameters or settings. Requires Admin role.',
    parameters: ['action']
  },
  {
    name: 'get_report',
    description: 'Fetch operational reports data. Allowed categories: "billing" (Daily Billing Collection Log), "registrations" (Daily Patient Intake Log), "appointments" (Daily Booking & Appointment Log). Optional parameters: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD).',
    parameters: ['category', 'startDate', 'endDate']
  }
];

// Helper database tools execution
const executeTool = async (
  toolName: string,
  args: any,
  user: { id: number; role: string }
): Promise<any> => {
  const role = user.role;

  switch (toolName) {
    case 'get_dashboard_stats': {
      const patientCount = await Patient.count();
      const occupiedBeds = await Bed.count({ where: { status: 'occupied' } });
      const invoiceSum = (await Invoice.sum('grandTotal')) || 0;
      const expenseSum = (await DailyExpense.sum('amount')) || 0;
      const pendingAppts = await Appointment.count({ where: { status: 'pending' } });
      return {
        totalPatients: patientCount,
        occupiedBedsIPD: occupiedBeds,
        totalRevenueBilled: invoiceSum,
        totalExpensesLogged: expenseSum,
        pendingAppointmentsCount: pendingAppts
      };
    }

    case 'register_patient': {
      if (role !== 'admin' && role !== 'receptionist') {
        throw new Error('Access denied. Only Admins and Receptionists can register patients.');
      }
      const { name, gender, dob, phone, email, address, bloodGroup, allergies, insuranceProvider, insurancePolicyNum } = args;
      if (!name || !gender || !dob || !phone) {
        throw new Error('Missing required fields: name, gender, dob, phone.');
      }

      return await sequelize.transaction(async (t) => {
        // Hash temporary password
        const passwordHash = await bcrypt.hash('Password123', 10);
        const userAccount = await User.create({
          name,
          email: email || `patient.${Date.now()}-${Math.floor(Math.random()*1000)}@lifeflow.com`,
          password: passwordHash,
          role: 'patient',
          phone,
          status: 'active'
        }, { transaction: t });

        const tempUuid = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const patientRecord = await Patient.create({
          userId: userAccount.id,
          name,
          email: email || null,
          phone,
          gender,
          dob,
          address: address || null,
          bloodGroup: bloodGroup || 'O+',
          allergies: allergies || 'None',
          insuranceProvider: insuranceProvider || 'None',
          insurancePolicyNum: insurancePolicyNum || 'None',
          mrNumber: tempUuid
        }, { transaction: t });

        const year = new Date().getFullYear();
        const formattedMr = `MR-${year}-${String(patientRecord.id).padStart(4, '0')}`;
        await patientRecord.update({ mrNumber: formattedMr }, { transaction: t });

        await ActivityLog.create({
          userId: user.id,
          action: 'Register Patient',
          details: `Registered patient ${name} via AI Assistant. MRN: ${formattedMr}`,
          ipAddress: 'AI-Agent-Widget'
        }, { transaction: t });

        return {
          message: 'Patient registered successfully.',
          patient: {
            id: patientRecord.id,
            name: patientRecord.name,
            mrNumber: formattedMr,
            phone: patientRecord.phone,
            dob: patientRecord.dob
          }
        };
      });
    }

    case 'get_patients_list': {
      const search = args.search || '';
      const whereClause: any = {};
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { mrNumber: { [Op.like]: `%${search}%` } }
        ];
      }
      const patients = await Patient.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      return patients.map(p => ({
        id: p.id,
        name: p.name,
        mrNumber: p.mrNumber,
        phone: p.phone,
        bloodGroup: p.bloodGroup
      }));
    }

    case 'check_inventory': {
      if (role !== 'admin' && role !== 'pharmacist') {
        throw new Error('Access denied. Only Admins and Pharmacists can manage the medicine inventory.');
      }
      let action = args.action || 'view';
      if (action === 'get' || action === 'list' || action === 'query' || action === 'search') action = 'view';

      if (action === 'add_stock') {
        const { id, name, quantity, category, price, unit } = args;
        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error('Please provide a valid positive number for stock quantity.');
        }

        let med;
        if (id) {
          med = await Medicine.findByPk(id);
        } else if (name) {
          med = await Medicine.findOne({
            where: { name: { [Op.like]: `%${name}%` } }
          });
        }

        if (!med) {
          if (!name) {
            throw new Error('Medicine name is required to register a new medicine.');
          }
          
          const expDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
          const batch = `BAT-2026-X${Math.floor(10 + Math.random() * 90)}`;
          const medPrice = Number(price) || 10.00;
          const medUnit = unit || 'tab';
          const medCategory = category || 'General';

          const result = await sequelize.transaction(async (t) => {
            const newMed = await Medicine.create({
              name,
              category: medCategory,
              stockLevel: qty,
              batchNumber: batch,
              expiryDate: expDate.toISOString().split('T')[0],
              price: medPrice,
              supplierName: 'Global Meds',
              lowStockThreshold: 20,
              unit: medUnit
            }, { transaction: t });

            await MedicineRate.create({
              medicineId: newMed.id,
              unitRate: medPrice
            }, { transaction: t });

            return newMed;
          });

          return {
            message: 'New medicine registered and stock level initialized successfully.',
            medicine: {
              id: result.id,
              name: result.name,
              category: result.category,
              stockLevel: result.stockLevel,
              unit: result.unit,
              price: result.price
            }
          };
        }
        
        med.stockLevel += qty;
        await med.save();

        return {
          message: 'Stock level updated successfully.',
          medicine: {
            id: med.id,
            name: med.name,
            category: med.category,
            stockLevel: med.stockLevel,
            unit: med.unit
          }
        };
      } else if (action === 'create') {
        const { name, category, stockLevel, lowStockThreshold, unit, price, batchNumber, expiryDate, supplierName } = args;
        if (!name || !category) {
          throw new Error('Medicine name and category are required to create a new medicine inventory entry.');
        }

        const expDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
        const batch = batchNumber || `BAT-2026-X${Math.floor(10 + Math.random() * 90)}`;
        const medPrice = Number(price) || 10.00;
        const finalStock = Number(stockLevel) || 0;
        const lowThreshold = Number(lowStockThreshold) || 20;
        const medUnit = unit || 'tab';

        const result = await sequelize.transaction(async (t) => {
          const newMed = await Medicine.create({
            name,
            category,
            stockLevel: finalStock,
            batchNumber: batch,
            expiryDate: expDate.toISOString().split('T')[0],
            price: medPrice,
            supplierName: supplierName || 'Global Meds',
            lowStockThreshold: lowThreshold,
            unit: medUnit
          }, { transaction: t });

          await MedicineRate.create({
            medicineId: newMed.id,
            unitRate: medPrice
          }, { transaction: t });

          return newMed;
        });

        return {
          message: 'New medicine added to inventory successfully.',
          medicine: {
            id: result.id,
            name: result.name,
            category: result.category,
            stockLevel: result.stockLevel,
            unit: result.unit,
            price: result.price
          }
        };
      } else if (action === 'delete') {
        const { id, name } = args;
        let med;
        if (id) {
          med = await Medicine.findByPk(id);
        } else if (name) {
          med = await Medicine.findOne({
            where: { name: { [Op.like]: `%${name}%` } }
          });
        }

        if (!med) throw new Error(`Medicine "${name || id || 'Unknown'}" not found in inventory.`);
        
        const deletedName = med.name;
        
        await sequelize.transaction(async (t) => {
          await MedicineRate.destroy({ where: { medicineId: med.id }, transaction: t });
          await med.destroy({ transaction: t });
        });

        return {
          message: 'Medicine deleted successfully.',
          deletedMedicineName: deletedName
        };
      }

      const medicines = await Medicine.findAll({
        order: [['stockLevel', 'ASC']],
        limit: 20
      });
      const lowStock = medicines.filter(m => m.stockLevel <= m.lowStockThreshold);
      return {
        totalItemsCount: medicines.length,
        lowStockItems: lowStock.map(m => ({
          name: m.name,
          category: m.category,
          stockLevel: m.stockLevel,
          lowStockThreshold: m.lowStockThreshold,
          unit: m.unit
        })),
        allMedicines: medicines.map(m => ({
          id: m.id,
          name: m.name,
          category: m.category,
          stockLevel: m.stockLevel,
          lowStockThreshold: m.lowStockThreshold,
          unit: m.unit,
          price: m.price,
          batchNumber: m.batchNumber,
          expiryDate: m.expiryDate
        }))
      };
    }

    case 'billing_summary': {
      if (role !== 'admin' && role !== 'accountant' && role !== 'receptionist') {
        throw new Error('Access denied. Only Admins, Accountants, and Receptionists can view billing summaries.');
      }
      const unpaidInvoices = await Invoice.findAll({
        where: { status: { [Op.ne]: 'paid' } },
        include: [{ model: Patient, attributes: ['name', 'mrNumber'] }],
        limit: 10
      });
      return unpaidInvoices.map(inv => ({
        id: inv.id,
        patientName: inv.patient?.name || 'Unknown',
        mrNumber: inv.patient?.mrNumber || 'N/A',
        grandTotal: inv.grandTotal,
        paidAmount: inv.paidAmount,
        status: inv.status,
        paymentMethod: inv.paymentMethod
      }));
    }

    case 'test_request': {
      if (role !== 'admin' && role !== 'lab_technician' && role !== 'doctor') {
        throw new Error('Access denied. Only Admins, Doctors, and Lab Technicians can access laboratory requests.');
      }
      const requests = await LabRequest.findAll({
        include: [{ model: Patient, attributes: ['name', 'mrNumber'] }],
        limit: 10
      });
      return requests.map(req => ({
        id: req.id,
        patientName: req.patient?.name || 'Unknown',
        mrNumber: req.patient?.mrNumber || 'N/A',
        testName: req.testName,
        category: req.category,
        status: req.status,
        sampleStatus: req.sampleStatus
      }));
    }

    case 'manage_appointments': {
      if (role !== 'admin' && role !== 'doctor' && role !== 'receptionist') {
        throw new Error('Access denied. Only Admins, Doctors, and Receptionists can manage appointments.');
      }
      let action = args.action || 'view';
      if (action === 'get' || action === 'list' || action === 'query' || action === 'search') action = 'view';
      if (action === 'view') {
        const appts = await Appointment.findAll({
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ],
          order: [['appointmentDate', 'ASC']],
          limit: 10
        });
        return appts.map(a => ({
          id: a.id,
          patientName: a.patient?.name || 'Unknown',
          mrNumber: a.patient?.mrNumber || 'N/A',
          doctorName: a.doctor?.user?.name || 'Unknown',
          appointmentDate: a.appointmentDate,
          status: a.status,
          queueToken: a.queueToken,
          symptoms: a.symptoms
        }));
      } else if (action === 'create') {
        let { patientId, doctorId, patientName, doctorName, appointmentDate, symptoms } = args;
        
        // Resolve patient if patientId is a string MR/Name or missing
        if (patientId && isNaN(Number(patientId))) {
          const patientStr = String(patientId).trim();
          const pt = patientStr.startsWith('MR-')
            ? await Patient.findOne({ where: { mrNumber: patientStr } })
            : await Patient.findOne({ where: { name: { [Op.like]: `%${patientStr}%` } } });
          if (pt) {
            patientId = pt.id;
          } else {
            throw new Error(`Patient "${patientStr}" not found. Please register the patient first.`);
          }
        } else if (!patientId && patientName) {
          const pt = await Patient.findOne({
            where: { name: { [Op.like]: `%${patientName}%` } }
          });
          if (pt) {
            patientId = pt.id;
          } else {
            throw new Error(`Patient name "${patientName}" not found in the database. Please register the patient first.`);
          }
        }

        // Resolve doctor if doctorId is a name string or missing
        if (doctorId && isNaN(Number(doctorId))) {
          const docStr = String(doctorId).replace(/^dr\.?\s*/i, '').trim();
          const doc = await Doctor.findOne({
            include: [{
              model: User,
              where: { name: { [Op.like]: `%${docStr}%` } }
            }]
          });
          if (doc) doctorId = doc.id;
          else doctorId = undefined; // Trigger fallback search below
        }

        if (!doctorId) {
          if (doctorName) {
            const docStr = String(doctorName).replace(/^dr\.?\s*/i, '').trim();
            const doc = await Doctor.findOne({
              include: [{
                model: User,
                where: { name: { [Op.like]: `%${docStr}%` } }
              }]
            });
            if (doc) {
              doctorId = doc.id;
            }
          }
          // Fallback to first active doctor
          if (!doctorId) {
            const defaultDoc = await Doctor.findOne({ where: { status: 'active' } });
            if (defaultDoc) {
              doctorId = defaultDoc.id;
            } else {
              const anyDoc = await Doctor.findOne();
              if (anyDoc) doctorId = anyDoc.id;
            }
          }
        }

        if (!patientId || !doctorId || !appointmentDate) {
          throw new Error('Missing patient details (ID/Name), doctor details, or appointmentDate for creation.');
        }

        const tokenVal = `LF-${Math.floor(1000 + Math.random() * 9000)}`;
        const appt = await Appointment.create({
          patientId,
          doctorId,
          appointmentDate: new Date(appointmentDate),
          queueToken: tokenVal,
          status: 'pending',
          type: 'walk-in',
          symptoms: symptoms || ''
        });

        const populatedAppt = await Appointment.findByPk(appt.id, {
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ]
        });

        return { 
          message: 'Appointment scheduled successfully', 
          appointment: {
            id: appt.id,
            patientName: populatedAppt?.patient?.name || 'Unknown',
            mrNumber: populatedAppt?.patient?.mrNumber || 'N/A',
            doctorName: populatedAppt?.doctor?.user?.name || 'Unknown',
            appointmentDate: appt.appointmentDate,
            status: appt.status,
            queueToken: appt.queueToken
          }
        };
      } else if (action === 'update' || action === 'status') {
        const { id, status } = args;
        if (!id || !status) {
          throw new Error('Missing id or status for updating appointment.');
        }
        const appt = await Appointment.findByPk(id);
        if (!appt) throw new Error('Appointment not found.');
        appt.status = status;
        await appt.save();
        return { message: 'Appointment updated successfully', appointment: appt };
      } else {
        const appts = await Appointment.findAll({
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ],
          order: [['appointmentDate', 'ASC']],
          limit: 10
        });
        return appts.map(a => ({
          id: a.id,
          patientName: a.patient?.name || 'Unknown',
          mrNumber: a.patient?.mrNumber || 'N/A',
          doctorName: a.doctor?.user?.name || 'Unknown',
          appointmentDate: a.appointmentDate,
          status: a.status,
          queueToken: a.queueToken,
          symptoms: a.symptoms
        }));
      }
    }

    case 'token_queue_status': {
      if (role !== 'admin' && role !== 'receptionist') {
        throw new Error('Access denied. Only Admins and Receptionists can manage token queues.');
      }
      let action = args.action || 'view';
      if (action === 'get' || action === 'list' || action === 'query' || action === 'search') action = 'view';
      if (action === 'view') {
        const tokens = await TokenQueue.findAll({
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ],
          order: [['createdAt', 'ASC']],
          limit: 10
        });
        return tokens.map(t => ({
          id: t.id,
          tokenNumber: t.tokenNumber,
          type: t.type,
          patientName: t.patient?.name || 'Unknown',
          doctorName: t.doctor?.user?.name || 'N/A',
          status: t.status,
          waitingTime: t.waitingTime
        }));
      } else if (action === 'create') {
        let { patientId, doctorId, patientName, doctorName, type, detail } = args;
        
        if (patientId && isNaN(Number(patientId))) {
          const patientStr = String(patientId).trim();
          const pt = patientStr.startsWith('MR-')
            ? await Patient.findOne({ where: { mrNumber: patientStr } })
            : await Patient.findOne({ where: { name: { [Op.like]: `%${patientStr}%` } } });
          if (pt) patientId = pt.id;
          else throw new Error(`Patient "${patientStr}" not found. Please register them first.`);
        } else if (!patientId && patientName) {
          const pt = await Patient.findOne({
            where: { name: { [Op.like]: `%${patientName}%` } }
          });
          if (pt) patientId = pt.id;
          else throw new Error(`Patient "${patientName}" not found. Please register them first.`);
        }

        if (doctorId && isNaN(Number(doctorId))) {
          const docStr = String(doctorId).replace(/^dr\.?\s*/i, '').trim();
          const doc = await Doctor.findOne({
            include: [{
              model: User,
              where: { name: { [Op.like]: `%${docStr}%` } }
            }]
          });
          if (doc) doctorId = doc.id;
          else doctorId = undefined;
        }

        if (!doctorId && doctorName) {
          const docStr = String(doctorName).replace(/^dr\.?\s*/i, '').trim();
          const doc = await Doctor.findOne({
            include: [{
              model: User,
              where: { name: { [Op.like]: `%${docStr}%` } }
            }]
          });
          if (doc) doctorId = doc.id;
        }

        if (!patientId || !type) {
          throw new Error('Missing patientId/patientName or type for creating queue token.');
        }

        const rand = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear();
        const tokenNumber = `${type.toUpperCase()}-${year}-${rand}`;
        const queueItem = await TokenQueue.create({
          tokenNumber,
          type,
          patientId,
          doctorId: doctorId || null,
          status: 'waiting',
          waitingTime: Math.floor(5 + Math.random() * 20),
          detail: detail || ''
        });

        const populated = await TokenQueue.findByPk(queueItem.id, {
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ]
        });

        return { 
          message: 'Queue token created successfully', 
          token: {
            tokenNumber: queueItem.tokenNumber,
            type: queueItem.type,
            patientName: populated?.patient?.name || 'Unknown',
            doctorName: populated?.doctor?.user?.name || 'N/A',
            status: queueItem.status,
            waitingTime: queueItem.waitingTime
          }
        };
      } else if (action === 'update' || action === 'status') {
        const { id, status } = args;
        if (!id || !status) {
          throw new Error('Missing id or status for token queue update.');
        }
        const queueItem = await TokenQueue.findByPk(id);
        if (!queueItem) throw new Error('Queue token entry not found.');
        queueItem.status = status;
        await queueItem.save();
        return { message: 'Queue token status updated successfully', token: queueItem };
      } else {
        const tokens = await TokenQueue.findAll({
          include: [
            { model: Patient, attributes: ['name', 'mrNumber'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ],
          order: [['createdAt', 'ASC']],
          limit: 10
        });
        return tokens.map(t => ({
          id: t.id,
          tokenNumber: t.tokenNumber,
          type: t.type,
          patientName: t.patient?.name || 'Unknown',
          doctorName: t.doctor?.user?.name || 'N/A',
          status: t.status,
          waitingTime: t.waitingTime
        }));
      }
    }

    case 'manage_beds': {
      if (role !== 'admin' && role !== 'doctor' && role !== 'nurse') {
        throw new Error('Access denied. Only Admins, Doctors, and Nurses can view bed admissions.');
      }
      let action = args.action || 'view';
      if (action === 'get' || action === 'list' || action === 'query' || action === 'search') action = 'view';
      
      if (action === 'admit') {
        let { patientId, patientName, bedId, bedNumber, doctorId, doctorName, condition, notes, baselineCost, advancePaid } = args;
        if (!condition) condition = 'General Admission';
        
        return await sequelize.transaction(async (t) => {
          // 1. Resolve Patient
          if (patientId && isNaN(Number(patientId))) {
            const patientStr = String(patientId).trim();
            const pt = patientStr.startsWith('MR-')
              ? await Patient.findOne({ where: { mrNumber: patientStr }, transaction: t })
              : await Patient.findOne({ where: { name: { [Op.like]: `%${patientStr}%` }, transaction: t } });
            if (pt) patientId = pt.id;
            else throw new Error(`Patient "${patientStr}" not found. Please register the patient first.`);
          } else if (!patientId && patientName) {
            const pt = await Patient.findOne({
              where: { name: { [Op.like]: `%${patientName}%` } },
              transaction: t
            });
            if (pt) patientId = pt.id;
            else throw new Error(`Patient "${patientName}" not found in the database. Please register the patient first.`);
          }
          if (!patientId) throw new Error('Missing patientId or patientName for admission.');

          // Check if patient is already admitted
          const existingAdmission = await Admission.findOne({
            where: { patientId, status: 'admitted' },
            transaction: t
          });
          if (existingAdmission) {
            throw new Error(`Patient is already admitted to bed ${existingAdmission.bedId || 'N/A'}.`);
          }

          // 2. Resolve Bed
          let bed;
          if (bedId) {
            bed = await Bed.findByPk(bedId, { transaction: t });
          } else if (bedNumber) {
            bed = await Bed.findOne({
              where: { bedNumber },
              transaction: t
            });
            
            // Fallback: If bed number doesn't match directly, guess ward type from bedNumber string
            if (!bed) {
              const bedStr = String(bedNumber).toLowerCase();
              let wardLike = '';
              if (bedStr.includes('icu') || bedStr.includes('i-')) wardLike = '%ICU%';
              else if (bedStr.includes('gen') || bedStr.includes('g-') || bedStr.includes('ward')) wardLike = '%General%';
              else if (bedStr.includes('priv') || bedStr.includes('p-')) wardLike = '%Private%';
              
              if (wardLike) {
                bed = await Bed.findOne({
                  where: {
                    wardName: { [Op.like]: wardLike },
                    status: 'available'
                  },
                  transaction: t
                });
              }
            }
          }
          
          if (!bed) {
            // Find first available bed anywhere in the hospital
            bed = await Bed.findOne({
              where: { status: 'available' },
              transaction: t
            });
          }
          if (!bed) throw new Error('All hospital beds are currently occupied. Cannot admit patient.');
          if (bed.status !== 'available') throw new Error(`Bed ${bed.bedNumber} is currently ${bed.status}.`);

          // 3. Resolve Doctor
          if (doctorId && isNaN(Number(doctorId))) {
            const docStr = String(doctorId).replace(/^dr\.?\s*/i, '').trim();
            const doc = await Doctor.findOne({
              include: [{
                model: User,
                where: { name: { [Op.like]: `%${docStr}%` } }
              }],
              transaction: t
            });
            if (doc) doctorId = doc.id;
            else doctorId = undefined;
          }

          if (!doctorId) {
            if (doctorName) {
              const docStr = String(doctorName).replace(/^dr\.?\s*/i, '').trim();
              const doc = await Doctor.findOne({
                include: [{
                  model: User,
                  where: { name: { [Op.like]: `%${docStr}%` } }
                }],
                transaction: t
              });
              if (doc) doctorId = doc.id;
            }
            if (!doctorId) {
              const defaultDoc = await Doctor.findOne({ where: { status: 'active' }, transaction: t });
              doctorId = defaultDoc ? defaultDoc.id : 1;
            }
          }

          // 4. Create Admission
          const adm = await Admission.create({
            patientId,
            bedId: bed.id,
            doctorId,
            condition,
            status: 'admitted',
            notes: notes || 'Admitted via AI Assistant',
            baselineCost: baselineCost || 0.00,
            advancePaid: advancePaid || 0.00,
            discount: 0.00
          }, { transaction: t });

          // Update bed status to occupied
          await bed.update({ status: 'occupied' }, { transaction: t });

          // Create an initial invoice if baseline cost > 0
          if (Number(baselineCost) > 0) {
            const invoice = await Invoice.create({
              patientId,
              totalAmount: baselineCost,
              discount: 0.00,
              tax: Number((Number(baselineCost) * 0.08).toFixed(2)),
              grandTotal: Number((Number(baselineCost) * 1.08).toFixed(2)),
              paidAmount: Number(advancePaid) || 0.00,
              status: (Number(advancePaid) >= Number(baselineCost) * 1.08) ? 'paid' : (Number(advancePaid) > 0 ? 'partially_paid' : 'unpaid'),
              paymentMethod: Number(advancePaid) > 0 ? 'cash' : 'pending'
            }, { transaction: t });

            await InvoiceItem.create({
              invoiceId: invoice.id,
              itemName: `IPD Admission / Surgery Baseline Cost (Bed: ${bed.bedNumber})`,
              itemCategory: 'Room Charge',
              unitPrice: baselineCost,
              quantity: 1,
              totalPrice: baselineCost
            }, { transaction: t });
          }

          // Fetch fresh admission with patient name & bed number
          const populated = await Admission.findByPk(adm.id, {
            include: [
              { model: Patient, attributes: ['name', 'mrNumber'] },
              { model: Bed, attributes: ['bedNumber', 'wardName'] }
            ],
            transaction: t
          });

          return {
            message: 'Patient admitted successfully.',
            admission: {
              id: populated?.id,
              patientName: populated?.patient?.name || 'Unknown',
              mrNumber: populated?.patient?.mrNumber || 'N/A',
              bedNumber: populated?.bed?.bedNumber || 'N/A',
              wardName: populated?.bed?.wardName || 'N/A',
              condition: populated?.condition,
              admissionDate: populated?.admissionDate
            }
          };
        });
      }

      const admissions = await Admission.findAll({
        where: { status: 'admitted' },
        include: [
          { model: Patient, attributes: ['name', 'mrNumber'] },
          { model: Bed, attributes: ['bedNumber', 'wardName', 'type'] },
          { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
        ]
      });
      return admissions.map(adm => ({
        id: adm.id,
        patientName: adm.patient?.name || 'Unknown',
        mrNumber: adm.patient?.mrNumber || 'N/A',
        bedNumber: adm.bed?.bedNumber || 'N/A',
        wardName: adm.bed?.wardName || 'N/A',
        bedType: adm.bed?.type || 'N/A',
        doctorName: adm.doctor?.user?.name || 'Unknown',
        admissionDate: adm.admissionDate,
        condition: adm.condition,
        notes: adm.notes
      }));
    }

    case 'doctors_schedule': {
      if (role !== 'admin' && role !== 'doctor' && role !== 'receptionist') {
        throw new Error('Access denied. Only Admins, Doctors, and Receptionists can view doctor schedules.');
      }
      const doctors = await Doctor.findAll({
        include: [
          { model: User, attributes: ['name', 'email', 'phone'] },
          { model: Department, attributes: ['name'] }
        ]
      });
      const statuses = ['available', 'in_consultation', 'on_break'];
      return doctors.map((doc: any, index) => ({
        id: doc.id,
        doctorName: doc.user?.name || 'Unknown Doctor',
        department: doc.department?.name || 'General Medicine',
        roomNumber: `OPD-${100 + doc.id}`,
        availableTime: '09:00 AM - 05:00 PM',
        currentStatus: statuses[index % statuses.length],
        nextAvailableSlot: '15 mins',
        leaveStatus: doc.status === 'active' ? 'active' : 'on_leave'
      }));
    }

    case 'manage_staff': {
      if (role !== 'admin') {
        throw new Error('Access denied. Only Admins can view the staff registry.');
      }
      let action = args.action || 'view';
      if (action === 'get' || action === 'list' || action === 'query' || action === 'search') action = 'view';

      if (action === 'create') {
        const { name, email, role: staffRole, phone, departmentId, specialization } = args;
        if (!name || !email || !staffRole) {
          throw new Error('Missing name, email, or role to create a new staff registry entry.');
        }

        const allowedRoles = ['admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist', 'accountant', 'nurse'];
        if (!allowedRoles.includes(staffRole.toLowerCase())) {
          throw new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`);
        }

        const passwordHash = bcrypt.hashSync('password123', 10);

        const result = await sequelize.transaction(async (t) => {
          const userRecord = await User.create({
            name,
            email,
            phone: phone || '',
            role: staffRole.toLowerCase(),
            password: passwordHash,
            status: 'active'
          }, { transaction: t });

          if (staffRole.toLowerCase() === 'doctor') {
            await Doctor.create({
              userId: userRecord.id,
              departmentId: departmentId || 1,
              specialization: specialization || 'General Medicine',
              consultationFee: 150.00,
              status: 'active'
            }, { transaction: t });
          }

          return userRecord;
        });

        return {
          message: 'New staff member registered successfully.',
          staff: {
            id: result.id,
            name: result.name,
            email: result.email,
            role: result.role,
            phone: result.phone,
            status: result.status
          }
        };
      } else if (action === 'delete') {
        const { id, name, email } = args;
        let staff;
        if (id) {
          staff = await User.findByPk(id);
        } else if (email) {
          staff = await User.findOne({ where: { email } });
        } else if (name) {
          staff = await User.findOne({ where: { name } });
        }

        if (!staff) throw new Error('Staff member not found.');

        const deletedName = staff.name;

        await sequelize.transaction(async (t) => {
          if (staff.role === 'doctor') {
            await Doctor.destroy({ where: { userId: staff.id }, transaction: t });
          }
          await staff.destroy({ transaction: t });
        });

        return {
          message: 'Staff member deleted successfully.',
          deletedStaffName: deletedName
        };
      }

      const staffList = await User.findAll({
        where: {
          role: {
            [Op.in]: ['admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist', 'accountant', 'nurse']
          }
        },
        attributes: ['id', 'name', 'email', 'role', 'phone', 'status']
      });
      return staffList.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        phone: s.phone || 'N/A',
        status: s.status
      }));
    }

    case 'activity_audit': {
      if (role !== 'admin') {
        throw new Error('Access denied. Only Admins can view activity logs.');
      }
      const logs = await ActivityLog.findAll({
        include: [{ model: User, attributes: ['name', 'role'] }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });
      return logs.map(l => ({
        id: l.id,
        userName: l.user?.name || 'System / Guest',
        userRole: l.user?.role || 'N/A',
        action: l.action,
        details: l.details,
        ipAddress: l.ipAddress,
        date: l.createdAt
      }));
    }

    case 'manage_settings': {
      if (role !== 'admin') {
        throw new Error('Access denied. Only Admins can view settings.');
      }
      const settings = await Setting.findAll();
      return settings.map(s => ({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description
      }));
    }

    case 'get_report': {
      if (role !== 'admin' && role !== 'receptionist' && role !== 'accountant') {
        throw new Error('Access denied. Only Admins, Receptionists, and Accountants can query reports.');
      }
      const category = args.category || 'billing';
      const startDate = args.startDate || '2026-07-01';
      const endDate = args.endDate || '2026-07-31';

      if (category === 'billing') {
        const invoices = await Invoice.findAll({
          where: {
            createdAt: {
              [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')]
            }
          },
          include: [{ model: Patient, attributes: ['name', 'mrNumber'] }]
        });
        return {
          category,
          startDate,
          endDate,
          records: invoices.map(inv => ({
            date: inv.createdAt.toISOString().split('T')[0],
            invoice: `INV-2026-${100 + inv.id}`,
            patient: inv.patient?.name || 'Unknown',
            amount: Number(inv.grandTotal),
            method: inv.paymentMethod,
            status: inv.status
          }))
        };
      } else if (category === 'registrations') {
        const patients = await Patient.findAll({
          where: {
            createdAt: {
              [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')]
            }
          }
        });
        return {
          category,
          startDate,
          endDate,
          records: patients.map(p => ({
            date: p.createdAt.toISOString().split('T')[0],
            mrn: p.mrNumber,
            patient: p.name,
            gender: p.gender,
            phone: p.phone,
            registrar: 'System Admin'
          }))
        };
      } else if (category === 'appointments') {
        const appts = await Appointment.findAll({
          where: {
            appointmentDate: {
              [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')]
            }
          },
          include: [
            { model: Patient, attributes: ['name'] },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
          ]
        });
        return {
          category,
          startDate,
          endDate,
          records: appts.map(a => ({
            date: new Date(a.appointmentDate).toISOString().split('T')[0],
            patient: a.patient?.name || 'Unknown',
            doctor: a.doctor?.user?.name || 'Unknown',
            department: 'Outpatient Clinic',
            time: new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: a.status
          }))
        };
      } else {
        throw new Error(`Invalid report category: ${category}`);
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

// AI chat handler
export const aiChat = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. JWT token not found.' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Missing or invalid messages history log array.' });
  }

  const { id: userId, role } = req.user;

  // Retrieve user name
  let userName = 'Staff Member';
  try {
    const userInstance = await User.findByPk(userId);
    if (userInstance) userName = userInstance.name;
  } catch (err) {
    // Ignore error, fallback to 'Staff Member'
  }

  // Allowed left sidebar menus based on roles
  const allowedMenus = SIDEBAR_MENUS[role] || ['Dashboard', 'Profile'];

  // Construct System Prompt enforcing Guardrails
  const systemPrompt = `You are LifeFlow Copilot, an enterprise-grade medical automation engine for LifeFlow Hospital EMR.
You are directly chatting with user "${userName}" holding the role of "${role}".

SECURITY & RBAC CONSTRAINTS:
1. You MUST strictly enforce Role-Based Access Control (RBAC). 
2. The user is ONLY allowed to access these Left Sidebar menus: ${JSON.stringify(allowedMenus)}.
3. If the user asks about data or requests actions related to a menu NOT in their allowed list, you must reject the request politely but firmly. For example:
   - A Pharmacist (can only see Dashboard, Pharmacy & Stock, Profile) cannot view billing, generate queue tokens, or pull financial/invoices report details.
   - A Lab Tech cannot register a patient or access invoices.
4. Always state why you are rejecting the request if it violates these access rules.

DATABASE INTEGRATION & TOOL CALLS:
You have access to backend helper tools mapped to Sequelize models. When the user requests an action, you should check if you can resolve it using a tool.
To run a tool, you MUST respond with a JSON block in the following exact format:
\`\`\`json
{
  "tool": "tool_name",
  "parameters": {
    "param_name": "param_val"
  }
}
\`\`\`

Available Tools:
${JSON.stringify(TOOLS_DEFINITION, null, 2)}

When a tool returns data, it will be injected into the conversation. Summarize or explain the result cleanly to the user.
If the user requests a database write action (such as 'register a patient named Salman born on 2014-07-13, phone 03028763849'), output the tool call payload immediately. After the tool runs, you will be fed the result (such as MR-2026-XXXX) to display to the user.

OUTPUT STYLING & FORMATTING:
1. Format all reports, metrics, lists, and tables using clean and beautiful Markdown. Use markdown table syntax for stats or list metrics (e.g. Columns like Patient Name, MR Number, Contact, etc.).
2. Do not include raw safety metrics, metadata headers, safety evaluation categories, or JSON debug markers in your main conversational text responses.
3. Keep responses structured, professional, clear and well-formatted.`;

  try {
    // Check if OpenRouter API key is configured
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        message: 'OpenRouter API Key is not configured on the backend server. Set OPENROUTER_API_KEY in .env.'
      });
    }

    // Call OpenRouter
    const chatResponse = await callOpenRouter(systemPrompt, messages);
    
    // Check if LLM requested a tool call
    const messageContent = chatResponse.choices?.[0]?.message?.content || '';
    console.log('[AI Debug] messageContent raw:', messageContent);
    
    // Try to extract tool call JSON block from response
    const toolCall = parseToolCall(messageContent);
    console.log('[AI Debug] toolCall parsed:', JSON.stringify(toolCall));
    
    if (toolCall) {
      const { tool, parameters } = toolCall;
      try {
        // Execute local database query
        const toolResult = await executeTool(tool, parameters, { id: userId, role });
        
        // Format direct markdown representation to cut latency by 50%
        const finalContent = formatToolResultMarkdown(tool, toolResult);
        console.log('[AI Debug] finalContent raw formatted:', finalContent);
        
        return res.status(200).json({
          response: cleanResponseContent(finalContent),
          executedTool: tool,
          toolResult
        });
      } catch (toolError: any) {
        return res.status(200).json({
          response: `I attempted to call the tool '${tool}', but encountered an authorization or validation error: ${toolError.message}.`,
          error: toolError.message
        });
      }
    }

    // Standard conversational response
    return res.status(200).json({ response: cleanResponseContent(messageContent) });

  } catch (error: any) {
    console.error('[AI Chatbot API Error]:', error);
    return res.status(500).json({
      message: 'Failed to communicate with OpenRouter AI model.',
      error: error.message
    });
  }
};

// OpenRouter fetch utility supporting free models with fallback
async function callOpenRouter(systemPrompt: string, conversationMessages: any[]): Promise<any> {
  const fetchMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages
  ];

  const models = [
    'tencent/hy3:free',
    'qwen/qwen3-coder:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free'
  ];

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'LifeFlow HMS Chatbot'
  };

  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`[AI Chatbot] Attempting chat request with model: ${modelName}`);
      const payload = {
        model: modelName,
        messages: fetchMessages,
        temperature: 0.2
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content.trim()) {
        throw new Error('Model returned an empty text content response.');
      }
      
      console.log(`[AI Chatbot] Successfully fetched response using model: ${modelName}`);
      return data;
    } catch (error: any) {
      console.warn(`[AI Chatbot] Model ${modelName} request failed: ${error.message}`);
      lastError = error;
      // Wait 100ms before retrying the next model in the list
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error(`All candidate OpenRouter models failed. Last error: ${lastError?.message}`);
}

// Parse custom json block from assistant content
function parseToolCall(content: string): { tool: string; parameters: any } | null {
  if (!content) return null;
  
  // 1. XML-like tag parsing (common in some free LLMs)
  if (content.includes('<tool_call>')) {
    try {
      const startIdx = content.indexOf('<tool_call>') + 11;
      let endIdx = content.indexOf('</tool_call>');
      if (endIdx === -1) {
        endIdx = content.length; // fallback to the end of the string if closing tag is missing
      }
      
      const inner = content.substring(startIdx, endIdx).trim();
      
      // Extract tool name (everything up to the first '<' if arguments exist, else the whole string)
      const bracketIdx = inner.indexOf('<');
      let tool = '';
      let parameters: any = {};
      
      if (bracketIdx !== -1) {
        tool = inner.substring(0, bracketIdx).trim();
        // Extract keys and values using a regex
        const argRegex = /<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/gi;
        let match;
        while ((match = argRegex.exec(inner)) !== null) {
          const key = match[1].trim();
          let val: any = match[2].trim();
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
          parameters[key] = val;
        }
      } else {
        tool = inner;
      }
      
      if (tool) {
        return { tool, parameters };
      }
    } catch (err) {
      console.error('[AI Parser] Error parsing XML tool call:', err);
    }
  }

  // 2. JSON-like block parsing
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/i;
  const match = content.match(jsonRegex);
  
  let jsonString = '';
  if (match && match[1]) {
    jsonString = match[1].trim();
  } else {
    // If no markdown block is present, try to extract standard JSON object patterns
    const braceRegex = /(\{[\s\S]*\})/i;
    const braceMatch = content.match(braceRegex);
    if (braceMatch && braceMatch[1]) {
      jsonString = braceMatch[1].trim();
    }
  }

  if (!jsonString) return null;

  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object' && typeof parsed.tool === 'string') {
      return {
        tool: parsed.tool,
        parameters: parsed.parameters || {}
      };
    }
  } catch (e) {
    // Invalid JSON format, skip
  }

  return null;
}

function cleanResponseContent(content: string): string {
  if (!content) return '';
  let cleaned = content
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !(
        /^(User\s*Safety\s*:)/i.test(trimmed) ||
        /^(Response\s*Safety\s*:)/i.test(trimmed) ||
        /^(Safety\s*Categories\s*:)/i.test(trimmed)
      );
    })
    .join('\n')
    .trim();

  // Strip XML tool tags from the conversation content to ensure clean UX
  cleaned = cleaned.replace(/<tool_call>[\s\S]*$/gi, ''); // Strip from <tool_call> to the end
  cleaned = cleaned.replace(/<\/tool_call>/gi, '');
  cleaned = cleaned.replace(/<arg_key>[\s\S]*?<\/arg_key>/gi, '');
  cleaned = cleaned.replace(/<arg_value>[\s\S]*?<\/arg_value>/gi, '');
  
  return cleaned.trim();
}

const formatToolResultMarkdown = (toolName: string, result: any): string => {
  if (!result) return '';
  
  switch (toolName) {
    case 'get_dashboard_stats': {
      return `### 📊 LifeFlow EMR Dashboard Statistics

| Metric | Value |
| :--- | :--- |
| **Total Registered Patients** | ${result.totalPatients} |
| **Occupied Beds (IPD)** | ${result.occupiedBedsIPD} |
| **Total Billed Revenue** | Rs. ${result.totalRevenueBilled} |
| **Total Expenses Logged** | Rs. ${result.totalExpensesLogged} |
| **Pending Appointments** | ${result.pendingAppointmentsCount} |

Let me know if you need any additional reports or details.`;
    }
    
    case 'register_patient': {
      const p = result.patient;
      return `✅ **Patient Registered Successfully**

| Field | Value |
| :--- | :--- |
| **Patient Name** | ${p.name} |
| **MR Number** | ${p.mrNumber} |
| **Phone Number** | ${p.phone} |
| **Date of Birth** | ${p.dob} |

The patient has been registered in the system with Medical Record Number **${p.mrNumber}**.`;
    }
    
    case 'get_patients_list': {
      if (!Array.isArray(result) || result.length === 0) {
        return 'No patients found matching the search criteria.';
      }
      const rows = result.map(p => `| ${p.name} | ${p.mrNumber} | ${p.phone} | ${p.bloodGroup || 'N/A'} |`).join('\n');
      return `### 👥 Patient Search Results

| Name | MR Number | Contact Phone | Blood Group |
| :--- | :--- | :--- | :--- |
${rows}`;
    }
    
    case 'check_inventory': {
      if (result.message) {
        if (result.deletedMedicineName) {
          return `✅ **Medicine Deleted Successfully**
          
| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Deleted Item** | ${result.deletedMedicineName} |`;
        }
        
        const m = result.medicine;
        return `✅ **Medicine Stock Operation Successful**

| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Medicine Name** | ${m.name} |
| **Category** | ${m.category} |
| **Current Stock Level** | ${m.stockLevel} ${m.unit} |
| **Preconfigured Price** | Rs. ${m.price || 'N/A'} |`;
      }

      const items = result.lowStockItems;
      const allMeds = result.allMedicines || [];
      
      let lowStockAlertStr = '';
      if (!Array.isArray(items) || items.length === 0) {
        lowStockAlertStr = '✅ **All medicine stocks are healthy.** No low stock items detected.\n\n';
      } else {
        const rows = items.map(m => `| ${m.name} | ${m.category} | ${m.stockLevel} | ${m.lowStockThreshold} | ${m.unit} | ⚠️ **Low Stock** |`).join('\n');
        lowStockAlertStr = `### ⚠️ Low Stock Medicine Alerts\n\n| Medicine Name | Category | Current Stock | Threshold | Unit | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows}\n\n`;
      }
      
      const allRows = allMeds.map(m => `| ${m.id} | ${m.name} | ${m.category} | ${m.stockLevel} | Rs. ${m.price} | ${m.batchNumber} | ${m.expiryDate} |`).join('\n');
      const allMedsStr = `### 📦 Complete Pharmacy Dispensary Catalog\n\n| ID | Name / Formula | Category | Stock Level | Preconfigured Unit Rate | Batch Number | Expiry Date |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${allRows}`;
      
      return `${lowStockAlertStr}${allMedsStr}`;
    }
    
    case 'billing_summary': {
      if (!Array.isArray(result) || result.length === 0) {
        return '✅ **All invoices are fully paid.** No pending invoices logged.';
      }
      const rows = result.map(inv => `| ${inv.patientName} | ${inv.mrNumber} | Rs. ${inv.grandTotal} | Rs. ${inv.paidAmount} | ${inv.status.toUpperCase()} | ${inv.paymentMethod} |`).join('\n');
      return `### 💵 Unpaid & Pending Invoices

| Patient Name | MR Number | Grand Total | Paid Amount | Status | Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }
    
    case 'test_request': {
      if (!Array.isArray(result) || result.length === 0) {
        return 'No laboratory tests requests found.';
      }
      const rows = result.map(req => `| ${req.patientName} | ${req.mrNumber} | ${req.testName} | ${req.category} | ${req.status} | ${req.sampleStatus} |`).join('\n');
      return `### 🧪 Active Lab Test Requests

| Patient Name | MR Number | Test Name | Category | Status | Sample Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }
    
    case 'manage_appointments': {
      if (result.message) {
        const appt = result.appointment;
        return `✅ **Appointment Scheduled/Updated Successfully**
        
| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Patient Name** | ${appt.patientName || 'Unknown'} (MRN: ${appt.mrNumber || 'N/A'}) |
| **Assigned Doctor** | Dr. ${appt.doctorName || 'Unknown'} |
| **Queue Token** | ${appt.queueToken} |
| **Appointment Date** | ${new Date(appt.appointmentDate).toLocaleString()} |
| **Status** | ${appt.status.toUpperCase()} |`;
      }
      if (!Array.isArray(result) || result.length === 0) {
        return 'No appointments booked.';
      }
      const rows = result.map(a => `| ${a.patientName} | ${a.mrNumber} | ${a.doctorName} | ${new Date(a.appointmentDate).toLocaleString()} | ${a.status} | ${a.queueToken} |`).join('\n');
      return `### 📅 Appointment Bookings List

| Patient Name | MR Number | Doctor Name | Date & Time | Status | Token |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }
    
    case 'token_queue_status': {
      if (result.message) {
        const tok = result.token;
        return `✅ **Queue Token Operation Successful**

| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Token Number** | ${tok.tokenNumber} |
| **Type** | ${tok.type.toUpperCase()} |
| **Status** | ${tok.status} |
| **Estimated Wait** | ${tok.waitingTime} mins |`;
      }
      if (!Array.isArray(result) || result.length === 0) {
        return 'Queue token list is empty.';
      }
      const rows = result.map(t => `| ${t.tokenNumber} | ${t.type.toUpperCase()} | ${t.patientName} | ${t.doctorName} | ${t.status} | ${t.waitingTime} mins |`).join('\n');
      return `### 🎟️ Token Queue Wait List

| Token Number | Type | Patient Name | Doctor | Status | Wait Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }
    
    case 'manage_beds': {
      if (result.message) {
        const adm = result.admission;
        return `✅ **Patient Admitted Successfully (IPD)**

| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Patient Name** | ${adm.patientName} |
| **MR Number** | ${adm.mrNumber} |
| **Bed Assigned** | Ward: ${adm.wardName} (Bed: ${adm.bedNumber}) |
| **Clinical Condition** | ${adm.condition} |
| **Admission Date** | ${new Date(adm.admissionDate).toLocaleString()} |`;
      }
      if (!Array.isArray(result) || result.length === 0) {
        return '✅ **All beds are currently vacant.** No active bed admissions found.';
      }
      const rows = result.map(adm => `| ${adm.patientName} | ${adm.mrNumber} | Ward: ${adm.wardName} (Bed: ${adm.bedNumber}) | Dr. ${adm.doctorName} | ${new Date(adm.admissionDate).toLocaleDateString()} | ${adm.condition} |`).join('\n');
      return `### 🛏️ Active Patient Bed Admissions (IPD)

| Patient Name | MR Number | Bed Allocation | Admitting Doctor | Date Admitted | Clinical Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }

    case 'doctors_schedule': {
      if (!Array.isArray(result) || result.length === 0) {
        return 'No doctors are currently scheduled.';
      }
      const rows = result.map(doc => `| Dr. ${doc.doctorName} | ${doc.department} | ${doc.roomNumber} | ${doc.availableTime} | ${doc.currentStatus.replace('_', ' ').toUpperCase()} |`).join('\n');
      return `### 🩺 Doctors Daily Consultation Schedule

| Doctor Name | Department | Room Allocation | Shift Timings | Live Availability Status |
| :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }

    case 'manage_staff': {
      if (result.message) {
        if (result.deletedStaffName) {
          return `✅ **Staff Member Deleted Successfully**
          
| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Deleted Staff Name** | ${result.deletedStaffName} |`;
        }
        
        const s = result.staff;
        return `✅ **Staff Member Registered Successfully**

| Field | Value |
| :--- | :--- |
| **Status Message** | ${result.message} |
| **Full Name** | ${s.name} |
| **Email Address** | ${s.email} |
| **Assigned Role** | ${s.role.toUpperCase()} |
| **Account Status** | ${s.status === 'active' ? '🟢 Active' : '🔴 Inactive'} |`;
      }

      if (!Array.isArray(result) || result.length === 0) {
        return 'Registry empty. No staff accounts found.';
      }
      const rows = result.map(s => `| ${s.name} | ${s.role.toUpperCase()} | ${s.email} | ${s.phone} | ${s.status === 'active' ? '🟢 Active' : '🔴 Inactive'} |`).join('\n');
      return `### 👥 Staff Registry Overview

| Full Name | Role | Email Address | Phone Number | Account Status |
| :--- | :--- | :--- | :--- | :--- |
${rows}`;
    }

    case 'activity_audit': {
      if (!Array.isArray(result) || result.length === 0) {
        return 'No activity logs recorded.';
      }
      const rows = result.map(l => `| ${new Date(l.date).toLocaleString()} | ${l.userName} (${l.userRole}) | ${l.action} | ${l.details} |`).join('\n');
      return `### 📋 User Activity Audit Logs

| Date & Time | User Details | Action Performed | Log Summary / Payload |
| :--- | :--- | :--- | :--- |
${rows}`;
    }

    case 'manage_settings': {
      if (!Array.isArray(result) || result.length === 0) {
        return 'No settings configured.';
      }
      const rows = result.map(s => `| ${s.key} | \`${s.value}\` | ${s.description || 'N/A'} |`).join('\n');
      return `### ⚙️ System Configuration Parameters

| Configuration Key | Current Value | Description / Scope |
| :--- | :--- | :--- |
${rows}`;
    }

    case 'get_report': {
      const records = result.records || [];
      const category = result.category;
      const start = result.startDate;
      const end = result.endDate;

      if (category === 'billing') {
        const title = `### 🧾 Operational Report: Daily Billing Collection Log`;
        const subtitle = `*Compiled billing records from ${start} to ${end}*`;
        if (records.length === 0) {
          return `${title}\n${subtitle}\n\n*No collection records found in this date range.*`;
        }
        const rows = records.map(r => `| ${r.date} | ${r.invoice} | ${r.patient} | Rs. ${r.amount.toFixed(2)} | ${r.method} | ${r.status.toUpperCase()} |`).join('\n');
        return `${title}\n${subtitle}\n\n| Date | Invoice ID | Patient | Amount | Method | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows}`;
      } else if (category === 'registrations') {
        const title = `### 👥 Operational Report: Daily Patient Intake Log`;
        const subtitle = `*Compiled patient intake records from ${start} to ${end}*`;
        if (records.length === 0) {
          return `${title}\n${subtitle}\n\n*No patient intake records logged in this date range.*`;
        }
        const rows = records.map(r => `| ${r.date} | ${r.mrn} | ${r.patient} | ${r.gender.toUpperCase()} | ${r.phone} | ${r.registrar} |`).join('\n');
        return `${title}\n${subtitle}\n\n| Date | MRN Number | Patient Name | Gender | Contact Phone | Registrar |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows}`;
      } else if (category === 'appointments') {
        const title = `### 📅 Operational Report: Daily Booking & Appointment Log`;
        const subtitle = `*Compiled booking records from ${start} to ${end}*`;
        if (records.length === 0) {
          return `${title}\n${subtitle}\n\n*No appointment booking records found in this date range.*`;
        }
        const rows = records.map(r => `| ${r.date} | ${r.patient} | Dr. ${r.doctor} | ${r.department} | ${r.time} | ${r.status.toUpperCase()} |`).join('\n');
        return `${title}\n${subtitle}\n\n| Date | Patient Name | Doctor Name | Department | Time | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows}`;
      }
      return JSON.stringify(result);
    }
    
    default:
      return JSON.stringify(result);
  }
};
