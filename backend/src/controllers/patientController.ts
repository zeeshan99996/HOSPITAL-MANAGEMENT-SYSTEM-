import { Request, Response } from 'express';
import { Patient, Appointment, Prescription, PrescriptionItem, LabRequest, Admission, Bed, Doctor, User, PatientVital, TokenQueue, ActivityLog } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/db';
import { getPktDayBounds } from '../utils/timezone';

export const createPatient = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
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

    // Calculate daily sequence token number starting from 1 every midnight in PKT (UTC+5)
    const { startOfDay, endOfDay } = getPktDayBounds();

    let maxToken = 0;
    try {
      maxToken = (await Patient.max('tokenNumber', {
        where: {
          createdAt: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          }
        },
        transaction
      }) as number) || 0;
    } catch (e) {
      console.warn('[patientController] Error getting max today token number:', e);
    }

    patientData.tokenNumber = maxToken + 1;

    const patient = await Patient.create(patientData, { transaction });

    if (patientData.mrNumber === tempUuid) {
      const year = new Date().getFullYear();
      const formattedMr = `MR-${year}-${String(patient.id).padStart(4, '0')}`;
      try {
        await patient.update({ mrNumber: formattedMr }, { transaction });
      } catch (e) {
        // Ignore if update fails
      }
    }

    await transaction.commit();
    return res.status(201).json({ message: 'Patient registered successfully.', patient });
  } catch (error: any) {
    await transaction.rollback();
    console.error('[patientController] Error creating patient:', error);
    return res.status(500).json({ message: error.message || 'Error creating patient.', error: error.message });
  }
};

export const getAllPatients = async (req: Request, res: Response) => {
  const { search, name, phone, area, date } = req.query;
  const whereClause: any = {};

  const isPostgres = process.env.DB_DIALECT === 'postgres' || !!process.env.DATABASE_URL;
  const likeOp = isPostgres ? Op.iLike : Op.like;
  const sequelizeDb = (require('../config/db')).default;

  const searchOrConditions: any[] = [];

  // Helper to generate all common Pakistan & international phone variations
  const getPhoneSearchConditions = (inputStr: string) => {
    const raw = inputStr.trim();
    const digits = raw.replace(/\D/g, '');
    const variants = new Set<string>();
    if (raw) variants.add(raw);
    if (digits) variants.add(digits);

    // 11-digit mobile starting with 0 (e.g. 03067721033)
    if (digits.length === 11 && digits.startsWith('0')) {
      variants.add(`${digits.slice(0, 4)}-${digits.slice(4)}`); // 0306-7721033
      variants.add(`${digits.slice(0, 4)} ${digits.slice(4)}`); // 0306 7721033
      variants.add(`${digits.slice(0, 4)}.${digits.slice(4)}`); // 0306.7721033
      const core = digits.slice(1); // 3067721033
      variants.add(core);
      variants.add(`${core.slice(0, 3)}-${core.slice(3)}`); // 306-7721033
      variants.add(`${core.slice(0, 3)} ${core.slice(3)}`); // 306 7721033
      variants.add(`+92${core}`); // +923067721033
      variants.add(`92${core}`); // 923067721033
      variants.add(digits.slice(-7)); // 7721033
    } else if (digits.length === 10) { // e.g. 3067721033
      const with0 = `0${digits}`; // 03067721033
      variants.add(with0);
      variants.add(`${with0.slice(0, 4)}-${with0.slice(4)}`); // 0306-7721033
      variants.add(`${with0.slice(0, 4)} ${with0.slice(4)}`); // 0306 7721033
      variants.add(`${digits.slice(0, 3)}-${digits.slice(3)}`); // 306-7721033
      variants.add(`+92${digits}`);
      variants.add(`92${digits}`);
      variants.add(digits.slice(-7));
    } else if (digits.length >= 7) {
      variants.add(digits.slice(-7));
    }

    const conditions: any[] = [];
    variants.forEach(v => {
      if (v) {
        conditions.push({ phone: { [likeOp]: `%${v}%` } });
        conditions.push({ emergencyContactPhone: { [likeOp]: `%${v}%` } });
      }
    });

    if (digits) {
      try {
        conditions.push(
          sequelizeDb.where(sequelizeDb.fn('REPLACE', sequelizeDb.fn('REPLACE', sequelizeDb.col('phone'), '-', ''), ' ', ''), { [likeOp]: `%${digits}%` })
        );
        if (digits.length >= 7) {
          conditions.push(
            sequelizeDb.where(sequelizeDb.fn('REPLACE', sequelizeDb.fn('REPLACE', sequelizeDb.col('phone'), '-', ''), ' ', ''), { [likeOp]: `%${digits.slice(-7)}%` })
          );
        }
      } catch (e) {}
    }

    return conditions;
  };

  // Legacy or single-box search param
  if (search && typeof search === 'string' && search.trim() !== '') {
    const s = search.trim();
    searchOrConditions.push(
      { name: { [likeOp]: `%${s}%` } },
      { email: { [likeOp]: `%${s}%` } },
      { mrNumber: { [likeOp]: `%${s}%` } },
      { area: { [likeOp]: `%${s}%` } },
      { address: { [likeOp]: `%${s}%` } }
    );
    searchOrConditions.push(...getPhoneSearchConditions(s));
  }

  // 1. Name / MR Number search filter
  if (name && typeof name === 'string' && name.trim() !== '') {
    const n = name.trim();
    searchOrConditions.push(
      { name: { [likeOp]: `%${n}%` } },
      { mrNumber: { [likeOp]: `%${n}%` } }
    );
  }

  // 2. Phone Number search filter (Multi-variant matching: raw, dashed, spaced, digits-only, core)
  if (phone && typeof phone === 'string' && phone.trim() !== '') {
    searchOrConditions.push(...getPhoneSearchConditions(phone));
  }

  // 3. Area / Colony search filter
  if (area && typeof area === 'string' && area.trim() !== '') {
    const a = area.trim();
    searchOrConditions.push(
      { area: { [likeOp]: `%${a}%` } },
      { address: { [likeOp]: `%${a}%` } }
    );
  }

  // 4. Date search filter (matches DOB or Registration createdAt date)
  let dateCondition: any = null;
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

      dateCondition = {
        [Op.or]: [
          safeDobCondition,
          { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } }
        ]
      };
    } else {
      dateCondition = safeDobCondition;
    }
  }

  if (searchOrConditions.length > 0 && dateCondition) {
    whereClause[Op.and] = [
      { [Op.or]: searchOrConditions },
      dateCondition
    ];
  } else if (searchOrConditions.length > 0) {
    whereClause[Op.or] = searchOrConditions;
  } else if (dateCondition) {
    whereClause[Op.and] = [dateCondition];
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
        include: [
          {
            model: TokenQueue,
            include: [{ model: Doctor, include: [{ model: User, attributes: ['name'] }] }],
            required: false
          }
        ],
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

    await patient.destroy({ force: true });
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

export const recordDoctorConsultation = async (req: Request, res: Response) => {
  const {
    patientId,
    tokenId,
    symptoms,
    symptomTags,
    medicalHistory,
    allergies,
    vitals,
    physicalExam,
    diagnosis,
    clinicalNotes,
    dietAdvice,
    followUpDays,
    medicines,
    advisedLabTests
  } = req.body;

  try {
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const userId = (req as any).user?.id;
    let doctor = await Doctor.findOne({ where: { userId } });
    if (!doctor) {
      doctor = await Doctor.findOne();
    }
    const doctorId = doctor ? doctor.id : 1;

    // 1. Log Vitals if provided
    let loggedVital: any = null;
    if (vitals && (vitals.bp || vitals.temperature || vitals.pulse || vitals.spo2 || vitals.weight)) {
      try {
        loggedVital = await PatientVital.create({
          patientId: Number(patientId),
          bp: vitals.bp || null,
          temperature: vitals.temperature ? Number(vitals.temperature) : null,
          pulse: vitals.pulse ? Number(vitals.pulse) : null,
          spo2: vitals.spo2 ? Number(vitals.spo2) : null,
          weight: vitals.weight ? Number(vitals.weight) : null,
          notes: vitals.notes || null,
          loggedBy: userId || null
        });
      } catch (vitErr) {
        console.warn('[recordDoctorConsultation] Error saving vitals:', vitErr);
      }
    }

    // 2. Format clinical summary notes
    const clinicalSummaryParts: string[] = [];
    if (symptoms) clinicalSummaryParts.push(`Chief Complaints & Symptoms: ${symptoms}`);
    if (symptomTags && symptomTags.length > 0) clinicalSummaryParts.push(`Symptoms / Tags: ${symptomTags.join(', ')}`);
    if (medicalHistory) clinicalSummaryParts.push(`Medical History: ${medicalHistory}`);
    if (allergies) clinicalSummaryParts.push(`Allergies: ${allergies}`);
    if (physicalExam) clinicalSummaryParts.push(`Physical Exam: ${physicalExam}`);
    if (clinicalNotes) clinicalSummaryParts.push(`Doctor Notes: ${clinicalNotes}`);
    if (dietAdvice) clinicalSummaryParts.push(`Diet & Precautions: ${dietAdvice}`);
    if (followUpDays) clinicalSummaryParts.push(`Follow-up: Within ${followUpDays} day(s)`);

    const fullClinicalNotes = clinicalSummaryParts.join('\n');

    // 3. Create Appointment record
    const appointment = await Appointment.create({
      patientId: Number(patientId),
      doctorId: doctorId,
      appointmentDate: new Date(),
      status: 'completed',
      type: 'consultation',
      notes: fullClinicalNotes
    });

    // 4. Create Prescription Record
    const prescription = await Prescription.create({
      appointmentId: appointment.id,
      diagnosis: diagnosis || 'Clinical Consultation Completed',
      notes: fullClinicalNotes,
      prescriptionDate: new Date()
    });

    // 5. Create Prescription Line Items
    if (medicines && Array.isArray(medicines) && medicines.length > 0) {
      const itemsToCreate = medicines
        .filter((m: any) => m && (m.name || m.medicineName))
        .map((m: any) => ({
          prescriptionId: prescription.id,
          medicineName: (m.name || m.medicineName || '').trim(),
          dosage: m.dosage || '1 Tab',
          frequency: m.frequency || '1-0-1',
          duration: m.duration || '5 Days'
        }));

      if (itemsToCreate.length > 0) {
        await PrescriptionItem.bulkCreate(itemsToCreate);
      }
    }

    // 6. Create Lab Requests if lab tests advised
    let createdLabRequests = 0;
    if (advisedLabTests && Array.isArray(advisedLabTests) && advisedLabTests.length > 0) {
      for (const t of advisedLabTests) {
        const testTitle = typeof t === 'string' ? t : (t.testName || t.name || 'Lab Investigation');
        try {
          await LabRequest.create({
            patientId: Number(patientId),
            doctorId: doctorId || null,
            testName: testTitle,
            category: 'Pathology',
            status: 'pending',
            sampleStatus: 'collected',
            specimenCollected: false
          } as any);
          createdLabRequests++;
        } catch (labErr) {
          console.warn('[recordDoctorConsultation] Error creating lab request:', labErr);
        }
      }
    }

    // 7. Update Token Queue status to completed if tokenId provided
    if (tokenId) {
      try {
        await TokenQueue.update(
          { status: 'completed' },
          { where: { id: Number(tokenId) } }
        );
      } catch (tokErr) {
        console.warn('[recordDoctorConsultation] Error updating token queue:', tokErr);
      }
    }

    // 8. Log activity
    try {
      await ActivityLog.create({
        userId: userId || null,
        action: 'DOCTOR_CONSULTATION',
        details: `Doctor completed consultation & prescription for patient ${patient.name} (MRN: ${patient.mrNumber}). Diagnosis: ${diagnosis || 'General'}`
      });
    } catch (actErr) {}

    return res.status(201).json({
      message: 'Clinical consultation and prescription recorded successfully!',
      prescriptionId: prescription.id,
      appointmentId: appointment.id,
      patientId: patient.id,
      vitalId: loggedVital?.id || null,
      labRequestsCount: createdLabRequests
    });
  } catch (error: any) {
    console.error('[recordDoctorConsultation] Error:', error);
    return res.status(500).json({ message: 'Error saving doctor consultation.', error: error.message });
  }
};

