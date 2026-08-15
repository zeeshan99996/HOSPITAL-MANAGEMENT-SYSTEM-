import { Request, Response } from 'express';
import { ClinicalTemplate, Doctor } from '../models';
import { Op } from 'sequelize';

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
  lab_test: [
    'Complete Blood Count (CBC)',
    'ESR',
    'Blood Sugar Fasting (BSF)',
    'Blood Sugar Random (BSR)',
    'HbA1c (Glycated Hemoglobin)',
    'Liver Function Tests (LFT)',
    'Renal Function Tests / Creatinine (RFT)',
    'Lipid Profile',
    'Urine Complete Examination (R/E)',
    'Typhidot / Widal Test',
    'Dengue NS1 Antigen',
    'Serum Electrolytes',
    'H. Pylori Antigen',
    'ECG (12-Lead)',
    'Chest X-Ray (PA View)',
    'Ultrasound Abdomen & Pelvis',
    'Thyroid Profile (TSH, FT3, FT4)',
    'Serum Uric Acid'
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

// Seed default templates for a doctor
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
};

// 1. GET ALL TEMPLATES FOR CURRENT DOCTOR / GLOBAL
export const getClinicalTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const doctorId = userId ? await getDoctorIdFromUser(userId) : null;

    // Check if table exists, sync if needed
    try {
      await ClinicalTemplate.sync();
    } catch (e) {}

    const whereClause = doctorId
      ? { [Op.or]: [{ doctorId }, { doctorId: null }] }
      : { doctorId: null };

    let templates = await ClinicalTemplate.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['displayOrder', 'ASC'], ['id', 'ASC']]
    });

    // If no templates found in database, seed defaults
    if (templates.length === 0) {
      await seedDefaultTemplatesForDoctor(doctorId);
      templates = await ClinicalTemplate.findAll({
        where: whereClause,
        order: [['category', 'ASC'], ['displayOrder', 'ASC'], ['id', 'ASC']]
      });
    }

    // Group by category
    const grouped = {
      symptoms: templates.filter(t => t.category === 'symptom'),
      diagnoses: templates.filter(t => t.category === 'diagnosis'),
      lab_tests: templates.filter(t => t.category === 'lab_test'),
      advice: templates.filter(t => t.category === 'advice'),
      all: templates
    };

    return res.status(200).json(grouped);
  } catch (error: any) {
    console.error('[getClinicalTemplates] Error:', error);
    // Fallback to static defaults
    return res.status(200).json({
      symptoms: DEFAULT_CLINICAL_TEMPLATES.symptom.map((title, id) => ({ id, title, category: 'symptom' })),
      diagnoses: DEFAULT_CLINICAL_TEMPLATES.diagnosis.map((title, id) => ({ id, title, category: 'diagnosis' })),
      lab_tests: DEFAULT_CLINICAL_TEMPLATES.lab_test.map((title, id) => ({ id, title, category: 'lab_test' })),
      advice: DEFAULT_CLINICAL_TEMPLATES.advice.map((title, id) => ({ id, title, category: 'advice' })),
      all: []
    });
  }
};

// 2. CREATE NEW TEMPLATE (CUSTOM QUICK TAG)
export const createClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { category, title, details } = req.body;
    if (!category || !title || !title.trim()) {
      return res.status(400).json({ message: 'Category and title are required.' });
    }

    const userId = (req as any).user?.id;
    const doctorId = userId ? await getDoctorIdFromUser(userId) : null;

    const trimmedTitle = title.trim();

    // Check if duplicate already exists for this doctor & category
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

// 3. UPDATE TEMPLATE
export const updateClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, details, category } = req.body;

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

// 4. DELETE TEMPLATE
export const deleteClinicalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ClinicalTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
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

    await seedDefaultTemplatesForDoctor(doctorId);

    return res.status(200).json({ message: 'Clinical templates reset to standard medical defaults successfully.' });
  } catch (error: any) {
    console.error('[resetClinicalTemplates] Error:', error);
    return res.status(500).json({ message: 'Error resetting clinical templates.', error: error.message });
  }
};
