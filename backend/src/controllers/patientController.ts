import { Request, Response } from 'express';
import { Patient, Appointment, Prescription, PrescriptionItem, LabRequest, Admission, Bed, Doctor, User, PatientVital, TokenQueue } from '../models';
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

    // Calculate daily sequence token number starting from 1 every midnight (using MAX for concurrent safety)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let maxToken = 0;
    try {
      maxToken = (await Patient.max('tokenNumber', {
        where: {
          createdAt: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          }
        }
      }) as number) || 0;
    } catch (e) {
      console.warn('[patientController] Error getting max today token number:', e);
    }

    patientData.tokenNumber = maxToken + 1;

    const patient = await Patient.create(patientData);

    if (patientData.mrNumber === tempUuid) {
      const year = new Date().getFullYear();
      const formattedMr = `MR-${year}-${String(patient.id).padStart(4, '0')}`;
      try {
        await patient.update({ mrNumber: formattedMr });
      } catch (e) {
        // Ignore if update fails
      }
    }

    // Auto-create TokenQueue entry if doctorId was provided in request
    const assignedDocId = Number(req.body.doctorId || patientData.doctorId);
    if (assignedDocId > 0) {
      try {
        const TokenQueueModel = (await import('../models')).TokenQueue;
        const countToday = await TokenQueueModel.count({
          where: {
            doctorId: assignedDocId,
            createdAt: { [Op.between]: [startOfDay, endOfDay] }
          }
        });
        const docSeq = countToday + 1;
        const tokenNoStr = `T-${String(docSeq).padStart(2, '0')}`;

        await TokenQueueModel.create({
          patientId: patient.id,
          doctorId: assignedDocId,
          tokenNumber: tokenNoStr,
          status: 'waiting',
        });
      } catch (tErr) {
        console.warn('[patientController] Auto TokenQueue creation error:', tErr);
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
    const sequelize = (require('../config/db')).default;
    const safeDobCondition = sequelize.where(sequelize.cast(sequelize.col('dob'), 'VARCHAR'), { [likeOp]: `%${d}%` });

    if (!isNaN(parsedDate.getTime())) {
      const startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);

      andConditions.push({
        [Op.or]: [
          safeDobCondition,
          { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } }
        ]
      });
    } else {
      andConditions.push({
        [Op.or]: [
          safeDobCondition
        ]
      });
    }
  }

  if (andConditions.length > 0) {
    whereClause[Op.and] = andConditions;
  }

  try {
    let patients: any[] = [];
    try {
      patients = await Patient.findAll({
        where: whereClause,
        include: [
          {
            model: TokenQueue,
            include: [{ model: Doctor, include: [{ model: User, attributes: ['name'] }] }],
            required: false
          },
          {
            model: Appointment,
            include: [{ model: Doctor, include: [{ model: User, attributes: ['name'] }] }],
            required: false
          },
          {
            model: Admission,
            include: [
              { model: Bed },
              { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
            ],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
      });
    } catch (includeErr) {
      console.warn('[getAllPatients] Association include fallback triggered:', includeErr);
      patients = await Patient.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
      });
    }

    // Find active doctor for auto-healing unassigned records
    let fallbackDoctor = await Doctor.findOne({
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    // Auto-repair and populate Doctor details for all patients
    const resultList = await Promise.all(
      patients.map(async (pat: any) => {
        const pObj = pat.toJSON ? pat.toJSON() : pat;
        const tokens = pObj.token_queues || [];

        if (tokens.length > 0) {
          for (const t of tokens) {
            if (!t.doctorId && fallbackDoctor) {
              t.doctorId = fallbackDoctor.id;
              t.doctor = fallbackDoctor.toJSON ? fallbackDoctor.toJSON() : fallbackDoctor;
              try {
                const TokenQueueModel = (await import('../models')).TokenQueue;
                await TokenQueueModel.update({ doctorId: fallbackDoctor.id }, { where: { id: t.id } });
              } catch (uErr) {}
            } else if (t.doctorId && (!t.doctor || !t.doctor.user)) {
              try {
                const docRecord = await Doctor.findByPk(t.doctorId, {
                  include: [{ model: User, attributes: ['name', 'email'] }]
                });
                if (docRecord) {
                  t.doctor = docRecord.toJSON ? docRecord.toJSON() : docRecord;
                }
              } catch (e) {}
            }
          }
        }
        return pObj;
      })
    );

    return res.status(200).json(resultList);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving patients.', error: error.message });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    let patient: any = null;
    try {
      patient = await Patient.findByPk(id, {
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
    } catch (includeErr) {
      console.warn('[getPatientById] Association include fallback triggered:', includeErr);
      patient = await Patient.findByPk(id);
    }

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
