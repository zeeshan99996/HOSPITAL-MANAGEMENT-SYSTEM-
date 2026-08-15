import { Request, Response } from 'express';
import { ClinicalTemplate, Doctor, LaboratoryTest } from '../models';
import { Op } from 'sequelize';

export const DEFAULT_HOSPITAL_LAB_TESTS = [
  { name: 'Complete Blood Count (CBC)', category: 'Hematology', rate: 600 },
  { name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'Hematology', rate: 300 },
  { name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', rate: 250 },
  { name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', rate: 250 },
  { name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', rate: 1200 },
  { name: 'Liver Function Tests (LFT)', category: 'Biochemistry', rate: 1200 },
  { name: 'Renal Function Tests / Creatinine (RFT)', category: 'Biochemistry', rate: 1000 },
  { name: 'Lipid Profile', category: 'Biochemistry', rate: 1400 },
  { name: 'Urine Complete Examination (R/E)', category: 'Clinical Pathology', rate: 400 },
  { name: 'Typhidot / Widal Test', category: 'Serology', rate: 700 },
  { name: 'Dengue NS1 Antigen', category: 'Serology', rate: 1200 },
  { name: 'Serum Electrolytes (Na, K, Cl)', category: 'Biochemistry', rate: 900 },
  { name: 'H. Pylori Antigen / Antibody', category: 'Serology', rate: 800 },
  { name: 'Serum Uric Acid', category: 'Biochemistry', rate: 450 },
  { name: 'ECG (12-Lead)', category: 'Cardiology', rate: 600 },
  { name: 'Chest X-Ray (PA View)', category: 'Radiology', rate: 800 },
  { name: 'Ultrasound Abdomen & Pelvis', category: 'Ultrasound', rate: 1500 },
  { name: 'Thyroid Profile (TSH, FT3, FT4)', category: 'Endocrinology', rate: 1800 }
];

export const DEFAULT_CLINICAL_TEMPLATES = {
  symptom: [
    'Fever',
    'Dry Cough',
    'Productive Cough',
    'Chest Pain',
    'Shortness of Breath',
    'Headache',
    'Abdominal Pain',
    'Nausea / Vomiting',
    'Diarrhea',
    'Throat Pain / Sore Throat',
    'Body Aches',
    'Generalized Weakness',
    'Dizziness',
    'Back Pain',
    'Joint Pain',
    'Burning Micturition (UTI)',
    'Skin Rash / Itching',
    'Loss of Appetite',
    'Weight Loss',
    'Palpitations'
  ],
  diagnosis: [
    'Acute Upper Respiratory Infection (URI)',
    'Acute Bronchitis',
    'Enteric Fever / Typhoid',
    'Acute Gastroenteritis',
    'Essential Hypertension',
    'Type 2 Diabetes Mellitus',
    'Acute Tonsillitis / Pharyngitis',
    'Acid Peptic Disease / Gastritis (GERD)',
    'Urinary Tract Infection (UTI)',
    'Migraine / Tension Headache',
    'Musculoskeletal Pain / Lumbar Spondylosis',
    'Allergic Dermatitis / Eczema',
    'Bronchial Asthma',
    'Ischemic Heart Disease (IHD)',
    'Iron Deficiency Anemia'
  ],
  advice: [
    'Drink plenty of lukewarm water and stay well-hydrated.',
    'Avoid cold, oily, and spicy foods; follow a light, soft diet.',
    'Complete bed rest and avoid strenuous physical activity.',
    'Low salt and low fat diet with regular blood pressure tracking.',
    'Diabetic diet: restrict refined sugars and high-carbohydrate meals.',
    'Take all prescribed medications strictly on time after meals.'
  ]
};

// Helper to get doctor ID from request
const getDoctorIdFromUser = async (userId: number): Promise<number | null> => {
  const doctor = await Doctor.findOne({ where: { userId } });
  if (doctor) return doctor.id;
  const firstDoc = await Doctor.findOne();
  return firstDoc ? firstDoc.id : null;
};

// Seed default templates for a doctor and ensure LaboratoryTest catalog is populated
const seedDefaultTemplatesForDoctor = async (doctorId: number | null) => {
  const itemsToCreate: any[] = [];
  
  for (const [cat, titles] of Object.entries(DEFAULT_CLINICAL_TEMPLATES)) {
    titles.forEach((title, idx) => {
      itemsToCreate.push({
        doctorId: doctorId,
        category: cat,
        title: title,
        displayOrder: idx
      });
    });
  }

  if (itemsToCreate.length > 0) {
    try {
      await ClinicalTemplate.bulkCreate(itemsToCreate);
    } catch (e) {
      console.warn('[ClinicalTemplate] Seed error:', e);
    }
  }

  // Ensure LaboratoryTest catalog has default tests
  try {
    const existingLabCount = await LaboratoryTest.count();
    if (existingLabCount === 0) {
      for (const t of DEFAULT_HOSPITAL_LAB_TESTS) {
        try {
          await LaboratoryTest.create(t as any);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[LaboratoryTest] Seed error:', e);
  }
};

// 1. GET ALL TEMPLATES FOR CURRENT DOCTOR / GLOBAL (SYNCHRONIZED WITH RECEPTIONIST LAB CATALOG)
export const getClinicalTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const doctorId = userId ? await getDoctorIdFromUser(userId) : null;

    // Check if tables exist, sync if needed
    try {
      await ClinicalTemplate.sync();
      await LaboratoryTest.sync();
    } catch (e) {}

    const whereClause = doctorId
      ? { [Op.or]: [{ doctorId }, { doctorId: null }] }
      : { doctorId: null };

    let templates = await ClinicalTemplate.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['displayOrder', 'ASC'], ['id', 'ASC']]
    });

    // Ensure laboratory test catalog is seeded
    let labTests = await LaboratoryTest.findAll({ order: [['name', 'ASC']] });
    if (labTests.length === 0) {
      for (const t of DEFAULT_HOSPITAL_LAB_TESTS) {
        try {
          await LaboratoryTest.create(t as any);
        } catch (e) {}
      }
      labTests = await LaboratoryTest.findAll({ order: [['name', 'ASC']] });
    }

    // If no clinical templates found in database, seed defaults
    if (templates.length === 0) {
      await seedDefaultTemplatesForDoctor(doctorId);
      templates = await ClinicalTemplate.findAll({
        where: whereClause,
        order: [['category', 'ASC'], ['displayOrder', 'ASC'], ['id', 'ASC']]
      });
    }

    // Map labTests from LaboratoryTest catalog directly so Receptionist & Doctor are 100% unified!
    const unifiedLabTests = labTests.map((lt: any, idx: number) => ({
      id: lt.id,
      doctorId: null,
      category: 'lab_test' as const,
      title: lt.name,
      details: lt.rate ? String(lt.rate) : '0',
      rate: Number(lt.rate || 0),
      labCategory: lt.category || 'Pathology',
      displayOrder: idx
    }));

    // Group by category
    const grouped = {
      symptoms: templates.filter(t => t.category === 'symptom'),
      diagnoses: templates.filter(t => t.category === 'diagnosis'),
      lab_tests: unifiedLabTests,
      advice: templates.filter(t => t.category === 'advice'),
      all: [
        ...templates.filter(t => t.category !== 'lab_test'),
        ...unifiedLabTests
      ]
    };

    return res.status(200).json(grouped);
  } catch (error: any) {
    console.error('[getClinicalTemplates] Error:', error);
    return res.status(200).json({
      symptoms: DEFAULT_CLINICAL_TEMPLATES.symptom.map((title, id) => ({ id, title, category: 'symptom' })),
      diagnoses: DEFAULT_CLINICAL_TEMPLATES.diagnosis.map((title, id) => ({ id, title, category: 'diagnosis' })),
      lab_tests: DEFAULT_HOSPITAL_LAB_TESTS.map((t, id) => ({ id, title: t.name, rate: t.rate, details: String(t.rate), category: 'lab_test' })),
      advice: DEFAULT_CLINICAL_TEMPLATES.advice.map((title, id) => ({ id, title, category: 'advice' })),
      all: []
    });
  }
};

// 2. CREATE NEW TEMPLATE (CUSTOM QUICK TAG - SYNCS WITH LAB CATALOG)
export const createClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { category, title, details, rate, labCategory } = req.body;
    if (!category || !title || !title.trim()) {
      return res.status(400).json({ message: 'Category and title are required.' });
    }

    const userId = (req as any).user?.id;
    const doctorId = userId ? await getDoctorIdFromUser(userId) : null;
    const trimmedTitle = title.trim();

    // If adding a lab test, sync directly with LaboratoryTest catalog
    if (category === 'lab_test') {
      const parsedRate = rate !== undefined ? Number(rate) : details ? Number(details) : 0;
      let existingLab = await LaboratoryTest.findOne({ where: { name: trimmedTitle } });
      if (existingLab) {
        await existingLab.update({
          rate: parsedRate,
          category: labCategory || existingLab.category || 'Pathology'
        });
        return res.status(200).json({
          message: 'Laboratory test updated in catalog.',
          template: {
            id: existingLab.id,
            category: 'lab_test',
            title: existingLab.name,
            details: String(existingLab.rate),
            rate: existingLab.rate,
            labCategory: existingLab.category
          }
        });
      }

      const createdLab = await LaboratoryTest.create({
        name: trimmedTitle,
        category: labCategory || 'Pathology',
        rate: parsedRate,
        isOutsourced: false
      });

      return res.status(201).json({
        message: 'Lab test registered in Hospital Laboratory Catalog & Doctor templates.',
        template: {
          id: createdLab.id,
          category: 'lab_test',
          title: createdLab.name,
          details: String(createdLab.rate),
          rate: createdLab.rate,
          labCategory: createdLab.category
        }
      });
    }

    // Standard symptoms, diagnoses, advice
    const existing = await ClinicalTemplate.findOne({
      where: {
        category,
        title: trimmedTitle,
        ...(doctorId ? { doctorId } : {})
      }
    });

    if (existing) {
      return res.status(400).json({ message: `"${trimmedTitle}" already exists in this category.` });
    }

    const count = await ClinicalTemplate.count({
      where: {
        category,
        ...(doctorId ? { doctorId } : {})
      }
    });

    const newTemplate = await ClinicalTemplate.create({
      doctorId,
      category,
      title: trimmedTitle,
      details: details ? details.trim() : null,
      displayOrder: count
    });

    return res.status(201).json({
      message: 'Template added successfully.',
      template: newTemplate
    });
  } catch (error: any) {
    console.error('[createClinicalTemplate] Error:', error);
    return res.status(500).json({ message: 'Error creating clinical template.', error: error.message });
  }
};

// 3. UPDATE TEMPLATE (SYNCS WITH LAB CATALOG)
export const updateClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, details, category, rate, labCategory } = req.body;

    if (category === 'lab_test') {
      const labTest = await LaboratoryTest.findByPk(id);
      if (labTest) {
        await labTest.update({
          ...(title ? { name: title.trim() } : {}),
          ...(rate !== undefined ? { rate: Number(rate) } : details ? { rate: Number(details) } : {}),
          ...(labCategory ? { category: labCategory } : {})
        });
        return res.status(200).json({
          message: 'Laboratory test updated successfully.',
          template: {
            id: labTest.id,
            category: 'lab_test',
            title: labTest.name,
            details: String(labTest.rate),
            rate: labTest.rate,
            labCategory: labTest.category
          }
        });
      }
    }

    const template = await ClinicalTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    await template.update({
      ...(title ? { title: title.trim() } : {}),
      ...(details !== undefined ? { details: details ? details.trim() : null } : {}),
      ...(category ? { category } : {})
    });

    return res.status(200).json({
      message: 'Template updated successfully.',
      template
    });
  } catch (error: any) {
    console.error('[updateClinicalTemplate] Error:', error);
    return res.status(500).json({ message: 'Error updating clinical template.', error: error.message });
  }
};

// 4. DELETE TEMPLATE (SYNCS WITH LAB CATALOG)
export const deleteClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if it exists in LaboratoryTest catalog
    const labTest = await LaboratoryTest.findByPk(id);
    if (labTest) {
      await labTest.destroy();
      return res.status(200).json({ message: 'Laboratory test removed from catalog successfully.' });
    }

    const template = await ClinicalTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    // Also remove from LaboratoryTest if it matches title
    if (template.category === 'lab_test') {
      await LaboratoryTest.destroy({ where: { name: template.title } });
    }

    await template.destroy();
    return res.status(200).json({ message: 'Template deleted successfully.' });
  } catch (error: any) {
    console.error('[deleteClinicalTemplate] Error:', error);
    return res.status(500).json({ message: 'Error deleting clinical template.', error: error.message });
  }
};

// 5. RESET TO STANDARD MEDICAL DEFAULTS
export const resetClinicalTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const doctorId = userId ? await getDoctorIdFromUser(userId) : null;

    if (doctorId) {
      await ClinicalTemplate.destroy({ where: { doctorId } });
    } else {
      await ClinicalTemplate.destroy({ where: { doctorId: null } });
    }

    // Also populate default laboratory catalog
    for (const t of DEFAULT_HOSPITAL_LAB_TESTS) {
      try {
        const existing = await LaboratoryTest.findOne({ where: { name: t.name } });
        if (existing) {
          await existing.update(t);
        } else {
          await LaboratoryTest.create(t as any);
        }
      } catch (e) {}
    }

    await seedDefaultTemplatesForDoctor(doctorId);

    return res.status(200).json({ message: 'Clinical templates & laboratory catalog reset to standard medical defaults successfully.' });
  } catch (error: any) {
    console.error('[resetClinicalTemplates] Error:', error);
    return res.status(500).json({ message: 'Error resetting clinical templates.', error: error.message });
  }
};
