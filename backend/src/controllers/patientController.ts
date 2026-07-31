import { Request, Response } from 'express';
import { Patient, Appointment, Prescription, PrescriptionItem, LabRequest, Admission, Bed, Doctor, User, PatientVital } from '../models';
import { Op } from 'sequelize';

export const createPatient = async (req: Request, res: Response) => {
  try {
    const tempUuid = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const patientData = {
      ...req.body,
      mrNumber: req.body.mrNumber || tempUuid
    };

    // Calculate approximate DOB if empty, or set default valid date string
    if (!patientData.dob || typeof patientData.dob !== 'string' || patientData.dob.trim() === '') {
      if (patientData.age && !isNaN(parseInt(patientData.age))) {
        const approxYear = new Date().getFullYear() - Math.max(0, parseInt(patientData.age));
        patientData.dob = `${approxYear}-01-01`;
      } else {
        patientData.dob = '1990-01-01';
      }
    }

    // Sanitize optional string fields so they are never null/empty
    patientData.guardianName = patientData.guardianName || 'N/A';
    patientData.cnic = patientData.cnic || 'N/A';
    patientData.address = patientData.address || 'N/A';
    patientData.area = patientData.area || 'N/A';
    patientData.emergencyContactName = patientData.emergencyContactName || 'N/A';
    patientData.emergencyContactPhone = patientData.emergencyContactPhone || 'N/A';
    patientData.bloodGroup = patientData.bloodGroup || 'N/A';
    patientData.allergies = patientData.allergies || 'None';
    patientData.insuranceProvider = patientData.insuranceProvider || 'N/A';
    patientData.insurancePolicyNum = patientData.insurancePolicyNum || 'N/A';
    patientData.paymentMethod = patientData.paymentMethod || 'Initial Payment';

    // Clean numerical amount for paymentAmount
    if (patientData.paymentAmount !== undefined && patientData.paymentAmount !== null) {
      const parsedAmount = parseFloat(patientData.paymentAmount);
      patientData.paymentAmount = !isNaN(parsedAmount) ? parsedAmount : 1500;
    } else {
      patientData.paymentAmount = 1500;
    }

    // Calculate daily sequence token number starting from 1 every midnight
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let todayCount = 0;
    try {
      todayCount = await Patient.count({
        where: {
          createdAt: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          }
        }
      });
    } catch (e) {
      console.warn('[patientController] Error counting today patients for token:', e);
    }

    patientData.tokenNumber = todayCount + 1;

    let patient: any;
    try {
      patient = await Patient.create(patientData);
    } catch (dbErr: any) {
      console.warn('[patientController] Primary Patient.create failed, dynamically fixing schema & retrying:', dbErr.message);

      // Auto alter table columns & drop NOT NULL constraints on live DB
      try {
        const sequelize = (await import('../config/db')).default;
        const columnsToEnsure = ['dob', 'age', 'paymentAmount', 'area', 'guardianName', 'cnic', 'paymentMethod', 'email', 'phone', 'address', 'bloodGroup', 'allergies', 'insuranceProvider', 'insurancePolicyNum', 'emergencyContactName', 'emergencyContactPhone'];
        
        for (const col of columnsToEnsure) {
          try {
            await sequelize.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "${col}" VARCHAR(255);`);
          } catch (e) {}
          try {
            await sequelize.query(`ALTER TABLE "patients" ALTER COLUMN "${col}" DROP NOT NULL;`);
          } catch (e) {}
        }
      } catch (alterErr) {
        console.error('[patientController] Alter table error:', alterErr);
      }

      // Retry creating patient
      try {
        patient = await Patient.create(patientData);
      } catch (retryErr: any) {
        console.warn('[patientController] Second attempt failed, creating with fallback:', retryErr.message);
        const coreData = { ...patientData };
        if (!coreData.dob) coreData.dob = '1990-01-01';
        patient = await Patient.create(coreData);
      }
    }

    if (patientData.mrNumber === tempUuid) {
      const year = new Date().getFullYear();
      const formattedMr = `MR-${year}-${String(patient.id).padStart(4, '0')}`;
      try {
        await patient.update({ mrNumber: formattedMr });
      } catch (e) {
        // Ignore if update fails
      }
    }

    return res.status(201).json({ message: 'Patient registered successfully.', patient });
  } catch (error: any) {
    console.error('[patientController] Error creating patient:', error);
    return res.status(500).json({ message: error.message || 'Error creating patient.', error: error.message });
  }
};

export const getAllPatients = async (req: Request, res: Response) => {
  const { search, name, phone, area, date } = req.query;
  const whereClause: any = {};

  const isPostgres = process.env.DB_DIALECT === 'postgres' || !!process.env.DATABASE_URL;
  const likeOp = isPostgres ? Op.iLike : Op.like;

  const andConditions: any[] = [];

  // Legacy search param (searches across multiple fields)
  if (search && typeof search === 'string' && search.trim() !== '') {
    const s = search.trim();
    andConditions.push({
      [Op.or]: [
        { name: { [likeOp]: `%${s}%` } },
        { phone: { [likeOp]: `%${s}%` } },
        { email: { [likeOp]: `%${s}%` } },
        { mrNumber: { [likeOp]: `%${s}%` } },
        { area: { [likeOp]: `%${s}%` } },
        { address: { [likeOp]: `%${s}%` } },
      ]
    });
  }

  // 1. Name / MR Number search filter
  if (name && typeof name === 'string' && name.trim() !== '') {
    const n = name.trim();
    andConditions.push({
      [Op.or]: [
        { name: { [likeOp]: `%${n}%` } },
        { mrNumber: { [likeOp]: `%${n}%` } }
      ]
    });
  }

  // 2. Phone Number search filter
  if (phone && typeof phone === 'string' && phone.trim() !== '') {
    const p = phone.trim();
    andConditions.push({
      phone: { [likeOp]: `%${p}%` }
    });
  }

  // 3. Area / Colony search filter
  if (area && typeof area === 'string' && area.trim() !== '') {
    const a = area.trim();
    andConditions.push({
      [Op.or]: [
        { area: { [likeOp]: `%${a}%` } },
        { address: { [likeOp]: `%${a}%` } }
      ]
    });
  }

  // 4. Date search filter (matches DOB or Registration createdAt date)
  if (date && typeof date === 'string' && date.trim() !== '') {
    const d = date.trim();
    const parsedDate = new Date(d);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);

      andConditions.push({
        [Op.or]: [
          { dob: { [likeOp]: `%${d}%` } },
          { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } }
        ]
      });
    } else {
      andConditions.push({
        [Op.or]: [
          { dob: { [likeOp]: `%${d}%` } }
        ]
      });
    }
  }

  if (andConditions.length > 0) {
    whereClause[Op.and] = andConditions;
  }

  try {
    const patients = await Patient.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(patients);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving patients.', error: error.message });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await Patient.findByPk(id, {
      include: [
        {
          model: Appointment,
          include: [
            {
              model: Doctor,
              include: [{ model: User, attributes: ['name'] }],
            },
            {
              model: Prescription,
              include: [PrescriptionItem],
            },
          ],
        },
        {
          model: LabRequest,
          include: [{ model: Doctor, include: [{ model: User, attributes: ['name'] }] }],
        },
        {
          model: Admission,
          include: [
            { model: Bed },
            { model: Doctor, include: [{ model: User, attributes: ['name'] }] },
          ],
        },
        {
          model: PatientVital,
          include: [{ model: User, as: 'logger', attributes: ['name', 'role'] }]
        }
      ],
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    return res.status(200).json(patient);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving patient details.', error: error.message });
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    await patient.update(req.body);
    return res.status(200).json({ message: 'Patient updated successfully.', patient });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating patient.', error: error.message });
  }
};

export const deletePatient = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    await patient.destroy(); // Soft delete because of paranoid: true
    return res.status(200).json({ message: 'Patient deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting patient.', error: error.message });
  }
};

// ==========================================
// PATIENT VITALS HISTORY LOGGING
// ==========================================
export const getPatientVitals = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const vitals = await PatientVital.findAll({
      where: { patientId: id },
      include: [{ model: User, as: 'logger', attributes: ['name', 'role'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(vitals);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving vitals.', error: error.message });
  }
};

export const logPatientVitals = async (req: Request, res: Response) => {
  const { id } = req.params; // Patient ID
  const { bp, temperature, pulse, respRate, spo2, weight, height, notes } = req.body;
  const loggedBy = (req as any).user?.id || 1;

  try {
    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const vitals = await PatientVital.create({
      patientId: id,
      bp,
      temperature,
      pulse,
      respRate,
      spo2,
      weight,
      height,
      notes,
      loggedBy,
    });

    return res.status(201).json({ message: 'Vitals logged successfully.', vitals });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error logging vitals.', error: error.message });
  }
};
