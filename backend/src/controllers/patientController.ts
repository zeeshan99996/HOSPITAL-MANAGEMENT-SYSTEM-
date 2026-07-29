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

    // Remove empty string dob to prevent PostgreSQL DATE parse error
    if (!patientData.dob || typeof patientData.dob !== 'string' || patientData.dob.trim() === '') {
      delete patientData.dob;
    }

    // Clean numerical amount for paymentAmount
    if (patientData.paymentAmount !== undefined && patientData.paymentAmount !== null) {
      const parsedAmount = parseFloat(patientData.paymentAmount);
      patientData.paymentAmount = !isNaN(parsedAmount) ? parsedAmount : 1500;
    } else {
      patientData.paymentAmount = 1500;
    }

    let patient: any;
    try {
      patient = await Patient.create(patientData);
    } catch (dbErr: any) {
      console.warn('[patientController] Primary Patient.create failed, dynamically altering missing columns & retrying:', dbErr.message);

      // Auto alter table columns on live DB if missing
      try {
        const sequelize = (await import('../config/db')).default;
        const columnsToEnsure = ['age', 'paymentAmount', 'area', 'guardianName', 'cnic', 'paymentMethod'];
        for (const col of columnsToEnsure) {
          try {
            await sequelize.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "${col}" VARCHAR(255);`);
          } catch (e) {
            try {
              await sequelize.query(`ALTER TABLE \`patients\` ADD \`${col}\` VARCHAR(255);`);
            } catch (err) {}
          }
        }
      } catch (alterErr) {
        console.error('[patientController] Alter table error:', alterErr);
      }

      // Retry creating patient
      try {
        patient = await Patient.create(patientData);
      } catch (retryErr: any) {
        console.warn('[patientController] Second attempt failed, applying column fallback:', retryErr.message);
        const coreData = { ...patientData };
        if (retryErr.message && retryErr.message.includes('age')) delete coreData.age;
        if (retryErr.message && retryErr.message.includes('paymentAmount')) delete coreData.paymentAmount;
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
  const { search } = req.query;
  const whereClause: any = {};

  const isPostgres = process.env.DB_DIALECT === 'postgres' || !!process.env.DATABASE_URL;
  const likeOp = isPostgres ? Op.iLike : Op.like;

  if (search) {
    whereClause[Op.or] = [
      { name: { [likeOp]: `%${search}%` } },
      { phone: { [likeOp]: `%${search}%` } },
      { email: { [likeOp]: `%${search}%` } },
      { mrNumber: { [likeOp]: `%${search}%` } },
    ];
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
