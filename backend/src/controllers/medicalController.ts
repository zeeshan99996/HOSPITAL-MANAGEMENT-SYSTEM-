import { Request, Response } from 'express';
import { Bed, Admission, Patient, Doctor, User, LabRequest, LaboratoryTest, Invoice, InvoiceItem, TokenQueue, Appointment } from '../models';
import sequelize from '../config/db';

// ==========================================
// BED MANAGEMENT
// ==========================================
export const getBeds = async (req: Request, res: Response) => {
  try {
    let beds = await Bed.findAll({ order: [['id', 'ASC']] });
    if (beds.length === 0) {
      const defaultBeds = [
        { bedNumber: 'Bed-101', wardName: 'General Male Ward', type: 'general', status: 'available' },
        { bedNumber: 'Bed-102', wardName: 'General Female Ward', type: 'general', status: 'available' },
        { bedNumber: 'Bed-201', wardName: 'Surgical ICU Ward', type: 'icu', status: 'available' },
        { bedNumber: 'Bed-202', wardName: 'Private VIP Suite', type: 'private', status: 'available' },
        { bedNumber: 'Bed-203', wardName: 'Emergency Recovery Ward', type: 'semi-private', status: 'available' },
      ];
      for (const b of defaultBeds) {
        try {
          await Bed.create(b as any);
        } catch (e) {}
      }
      beds = await Bed.findAll({ order: [['id', 'ASC']] });
    }
    return res.status(200).json(beds);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving beds.', error: error.message });
  }
};

export const createBed = async (req: Request, res: Response) => {
  try {
    const { bedNumber, wardName, type, status } = req.body;
    if (!bedNumber || !wardName) {
      return res.status(400).json({ message: 'Bed number and ward name are required.' });
    }

    const trimmedBedNum = bedNumber.trim();
    const existing = await Bed.findOne({ where: { bedNumber: trimmedBedNum } });
    if (existing) {
      return res.status(400).json({ message: `A bed with number "${trimmedBedNum}" already exists.` });
    }

    const newBed = await Bed.create({
      bedNumber: trimmedBedNum,
      wardName: wardName.trim(),
      type: type || 'general',
      status: status || 'available',
    } as any);

    return res.status(201).json({ message: 'Hospital bed added successfully.', bed: newBed });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error adding bed.', error: error.message });
  }
};

export const deleteBed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bed = await Bed.findByPk(id);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found.' });
    }
    if (bed.status === 'occupied') {
      return res.status(400).json({ message: 'Cannot delete an occupied bed. Please discharge or transfer the admitted patient first.' });
    }
    await bed.destroy();
    return res.status(200).json({ message: 'Bed deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting bed.', error: error.message });
  }
};

export const updateBed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bedNumber, wardName, type, status } = req.body;

    const bed = await Bed.findByPk(id);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found.' });
    }

    if (bedNumber && bedNumber.trim() !== bed.bedNumber) {
      const existing = await Bed.findOne({ where: { bedNumber: bedNumber.trim() } });
      if (existing && existing.id !== bed.id) {
        return res.status(400).json({ message: `Another bed already has the number "${bedNumber.trim()}".` });
      }
      bed.bedNumber = bedNumber.trim();
    }

    if (wardName) bed.wardName = wardName.trim();
    if (type) bed.type = type;
    if (status) {
      if (bed.status === 'occupied' && status !== 'occupied') {
        const activeAdm = await Admission.findOne({ where: { bedId: bed.id, status: 'admitted' } });
        if (activeAdm) {
          return res.status(400).json({ message: 'Cannot change status of an occupied bed while a patient is actively admitted.' });
        }
      }
      bed.status = status;
    }

    await bed.save();
    return res.status(200).json({ message: 'Hospital bed updated successfully.', bed });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating bed.', error: error.message });
  }
};

// ==========================================
// ADMISSIONS (IPD)
// ==========================================
export const admitPatient = async (req: Request, res: Response) => {
  const {
    patientId,
    bedId,
    doctorId,
    condition,
    notes,
    baselineCost,
    advancePaid,
    discount,
    admissionCategory,
    stayType,
    surgeryDetails,
    treatmentPlan
  } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const bed = await Bed.findByPk(bedId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!bed || bed.status !== 'available') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Bed is not available for admission.' });
    }

    let finalDoctorId = doctorId ? Number(doctorId) : null;
    if ((!finalDoctorId || isNaN(finalDoctorId)) && patientId) {
      const latestToken = await TokenQueue.findOne({
        where: { patientId: Number(patientId) },
        order: [['id', 'DESC']],
        transaction
      });
      if (latestToken?.doctorId) {
        finalDoctorId = Number(latestToken.doctorId);
      } else {
        const latestAppt = await Appointment.findOne({
          where: { patientId: Number(patientId) },
          order: [['id', 'DESC']],
          transaction
        });
        if (latestAppt?.doctorId) {
          finalDoctorId = Number(latestAppt.doctorId);
        }
      }
    }

    const admission = await Admission.create({
      patientId,
      bedId,
      doctorId: finalDoctorId,
      condition,
      status: 'admitted',
      notes,
      baselineCost: baselineCost || 0.00,
      advancePaid: advancePaid || 0.00,
      discount: discount || 0.00,
      admissionCategory: admissionCategory || 'medical',
      stayType: stayType || 'short',
      surgeryDetails: surgeryDetails || null,
      treatmentPlan: treatmentPlan || null,
    }, { transaction });

    // Update bed status to occupied
    await bed.update({ status: 'occupied' }, { transaction });

    // Create an initial invoice for the baseline admission cost if greater than zero
    if (Number(baselineCost) > 0) {
      let invoice = await Invoice.findOne({
        where: { patientId, status: 'unpaid' },
        order: [['createdAt', 'DESC']],
        transaction
      });

      if (!invoice) {
        invoice = await Invoice.create({
          patientId,
          totalAmount: 0.00,
          discount: Number(discount) || 0.00,
          tax: 0.00,
          grandTotal: 0.00,
          paidAmount: Number(advancePaid) || 0.00,
          status: (Number(advancePaid) >= Number(baselineCost)) ? 'paid' : (Number(advancePaid) > 0 ? 'partially_paid' : 'unpaid'),
          paymentMethod: Number(advancePaid) > 0 ? 'cash' : 'pending'
        }, { transaction });
      } else {
        // Apply discount & advancePaid if invoice exists
        await invoice.update({
          discount: Number(invoice.discount) + (Number(discount) || 0.00),
          paidAmount: Number(invoice.paidAmount) + (Number(advancePaid) || 0.00),
        }, { transaction });
      }

      await InvoiceItem.create({
        invoiceId: invoice.id,
        itemName: `${(admissionCategory || 'medical').toUpperCase()} Admission Baseline Cost (Bed: ${bed.bedNumber})`,
        itemCategory: 'Room Charge',
        unitPrice: baselineCost,
        quantity: 1,
        totalPrice: baselineCost,
      }, { transaction });

      // Recalculate invoice totals
      const allItems = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, transaction });
      const newTotal = allItems.reduce((acc, item) => acc + Number(item.totalPrice), 0);
      const disc = Number(invoice.discount);
      const taxable = Math.max(0, newTotal - disc);
      const newTax = 0.00;
      const newGrandTotal = Math.round(taxable * 100) / 100;

      let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      const paid = Number(invoice.paidAmount);
      if (paid >= newGrandTotal) {
        newStatus = 'paid';
      } else if (paid > 0) {
        newStatus = 'partially_paid';
      }

      await invoice.update({
        totalAmount: newTotal,
        tax: newTax,
        grandTotal: newGrandTotal,
        status: newStatus
      }, { transaction });
    }

    await transaction.commit();
    return res.status(201).json({ message: 'Patient admitted successfully.', admission });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error admitting patient.', error: error.message });
  }
};

export const getAdmissions = async (req: Request, res: Response) => {
  const { status, category, stayType } = req.query; // admitted, discharged, medical, surgical, short, long
  const whereClause: any = {};
  if (status) whereClause.status = status;
  if (category) whereClause.admissionCategory = category;
  if (stayType) whereClause.stayType = stayType;

  try {
    const rawAdmissions = await Admission.findAll({
      where: whereClause,
      include: [
        { model: Patient, attributes: ['id', 'name', 'phone', 'bloodGroup', 'allergies', 'mrNumber', 'dob', 'gender'] },
        { model: Bed, attributes: ['bedNumber', 'wardName', 'type'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] },
      ],
      order: [['admissionDate', 'DESC']],
    });

    const admissions = await Promise.all(
      rawAdmissions.map(async (adm: any) => {
        const plain = adm.toJSON ? adm.toJSON() : adm;
        if (!plain.doctor && plain.patientId) {
          const latestToken = await TokenQueue.findOne({
            where: { patientId: plain.patientId },
            include: [{ model: Doctor, include: [{ model: User, attributes: ['name'] }] }],
            order: [['id', 'DESC']]
          });
          if (latestToken && (latestToken as any).Doctor) {
            plain.doctor = (latestToken as any).Doctor;
          }
        }
        return plain;
      })
    );

    return res.status(200).json(admissions);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving admissions.', error: error.message });
  }
};

export const updateAdmissionNotes = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    await admission.update({ notes });
    return res.status(200).json({ message: 'Admission records updated.', admission });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating records.', error: error.message });
  }
};

export const dischargePatient = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    dischargeDate,
    dischargeNotes,
    bedCharges,
    doctorFee,
    nursingFee,
    medicationCharges,
    otherCharges,
    discount,
    advancePaid,
    paidAmount,
    paymentMethod,
    createInvoice = true
  } = req.body;

  const transaction = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(id, {
      include: [
        { model: Patient },
        { model: Bed },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ],
      transaction
    });

    if (!admission || admission.status === 'discharged') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Admission record not found or patient is already discharged.' });
    }

    const actualDischargeDate = dischargeDate ? new Date(dischargeDate) : new Date();
    const admDate = new Date(admission.admissionDate || (admission as any).createdAt);
    const diffMs = actualDischargeDate.getTime() - admDate.getTime();
    const stayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const bed = admission.bed || (await Bed.findByPk(admission.bedId, { transaction }));

    // 1. Update Admission record
    const updatedNotes = dischargeNotes
      ? (admission.notes ? `${admission.notes}\n[Discharge Summary]: ${dischargeNotes}` : `[Discharge Summary]: ${dischargeNotes}`)
      : admission.notes;

    await admission.update({
      status: 'discharged',
      dischargeDate: actualDischargeDate,
      notes: updatedNotes,
    }, { transaction });

    // 2. Free up the Bed
    if (bed) {
      await bed.update({ status: 'available' }, { transaction });
    }

    let generatedInvoice: any = null;

    // 3. Generate Final Inpatient Invoice in Billing
    if (createInvoice) {
      const roomChargeVal = bedCharges !== undefined ? Number(bedCharges) : (Number(admission.baselineCost) || (stayDays * 2500));
      const docFeeVal = doctorFee !== undefined ? Number(doctorFee) : 1500;
      const nurseFeeVal = nursingFee !== undefined ? Number(nursingFee) : 1000;
      const medChargeVal = medicationCharges !== undefined ? Number(medicationCharges) : 0;
      const otherChargeVal = otherCharges !== undefined ? Number(otherCharges) : 0;
      const discountVal = discount !== undefined ? Number(discount) : (Number(admission.discount) || 0);
      const advanceVal = advancePaid !== undefined ? Number(advancePaid) : (Number(admission.advancePaid) || 0);
      const paidVal = paidAmount !== undefined ? Number(paidAmount) : advanceVal;
      const payMethodVal = paymentMethod || (paidVal > 0 ? 'cash' : 'pending');

      const invoiceTotal = roomChargeVal + docFeeVal + nurseFeeVal + medChargeVal + otherChargeVal;
      const grandTotal = Math.max(0, invoiceTotal - discountVal);

      let invoiceStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      if (paidVal >= grandTotal && grandTotal > 0) {
        invoiceStatus = 'paid';
      } else if (paidVal > 0) {
        invoiceStatus = 'partially_paid';
      }

      generatedInvoice = await Invoice.create({
        patientId: admission.patientId,
        totalAmount: invoiceTotal,
        discount: discountVal,
        tax: 0.00,
        grandTotal: grandTotal,
        paidAmount: paidVal,
        status: invoiceStatus,
        paymentMethod: payMethodVal,
      }, { transaction });

      // Create itemized billing records
      const itemsToCreate: any[] = [];

      if (roomChargeVal > 0) {
        itemsToCreate.push({
          invoiceId: generatedInvoice.id,
          itemName: `Inpatient Bed & Room Stay Charges (${stayDays} Days @ Bed ${bed?.bedNumber || 'Ward'} - ${bed?.wardName || 'General Ward'})`,
          itemCategory: 'Room Charge',
          unitPrice: roomChargeVal,
          quantity: 1,
          totalPrice: roomChargeVal,
        });
      }

      if (docFeeVal > 0) {
        itemsToCreate.push({
          invoiceId: generatedInvoice.id,
          itemName: `Inpatient Doctor & Consultant Visitation Fees (${admission.doctor?.user?.name || 'Assigned Consultant'})`,
          itemCategory: 'Doctor Fee',
          unitPrice: docFeeVal,
          quantity: 1,
          totalPrice: docFeeVal,
        });
      }

      if (nurseFeeVal > 0) {
        itemsToCreate.push({
          invoiceId: generatedInvoice.id,
          itemName: `Nursing Care, Vitals Monitoring & Hospital Sanitation Services`,
          itemCategory: 'Nursing Care',
          unitPrice: nurseFeeVal,
          quantity: 1,
          totalPrice: nurseFeeVal,
        });
      }

      if (medChargeVal > 0) {
        itemsToCreate.push({
          invoiceId: generatedInvoice.id,
          itemName: `Inpatient Medications, Injections & Clinical Treatment Supplies`,
          itemCategory: 'Medication',
          unitPrice: medChargeVal,
          quantity: 1,
          totalPrice: medChargeVal,
        });
      }

      if (otherChargeVal > 0) {
        itemsToCreate.push({
          invoiceId: generatedInvoice.id,
          itemName: `Miscellaneous Clinical Support & Hospital Services`,
          itemCategory: 'Hospital Services',
          unitPrice: otherChargeVal,
          quantity: 1,
          totalPrice: otherChargeVal,
        });
      }

      for (const itm of itemsToCreate) {
        await InvoiceItem.create(itm, { transaction });
      }
    }

    await transaction.commit();
    return res.status(200).json({
      message: `Patient ${admission.patient?.name || 'admitted'} discharged successfully. Inpatient final invoice generated in Billing section.`,
      admission,
      invoice: generatedInvoice,
    });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error discharging patient and creating invoice.', error: error.message });
  }
};

// ==========================================
// LABORATORY RATES & CATALOG
// ==========================================
export const getLaboratoryTests = async (req: Request, res: Response) => {
  try {
    let tests = await LaboratoryTest.findAll({ order: [['name', 'ASC']] });
    if (tests.length === 0) {
      const defaultCatalog = [
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
      for (const t of defaultCatalog) {
        try {
          await LaboratoryTest.create(t as any);
        } catch (e) {}
      }
      tests = await LaboratoryTest.findAll({ order: [['name', 'ASC']] });
    }
    return res.status(200).json(tests);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving tests catalog.', error: error.message });
  }
};

export const createLaboratoryTest = async (req: Request, res: Response) => {
  try {
    const { name, category, rate, isOutsourced } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Test name is required.' });
    }
    const cleanName = name.trim();
    let test = await LaboratoryTest.findOne({ where: { name: cleanName } });
    if (test) {
      await test.update({
        category: category || test.category || 'Pathology',
        rate: rate !== undefined ? Number(rate) : test.rate
      });
      return res.status(200).json({ message: 'Lab test updated in catalog.', test });
    }

    test = await LaboratoryTest.create({
      name: cleanName,
      category: category || 'Pathology',
      rate: rate !== undefined ? Number(rate) : 0,
      isOutsourced: !!isOutsourced
    });

    return res.status(201).json({ message: 'Lab test created successfully.', test });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating lab test entry.', error: error.message });
  }
};

// ==========================================
// LABORATORY REQUEST & SAMPLE TRACKING
// ==========================================
export const createLabRequest = async (req: Request, res: Response) => {
  const { patientId, doctorId, testName, category } = req.body;
  const transaction = await sequelize.transaction();

  try {
    let finalDocId = doctorId ? Number(doctorId) : null;
    if (!finalDocId) {
      const activeToken = await (await import('../models')).TokenQueue.findOne({ where: { patientId }, transaction });
      if (activeToken && activeToken.doctorId) {
        finalDocId = activeToken.doctorId;
      } else {
        const defaultDoc = await Doctor.findOne({ transaction });
        if (defaultDoc) finalDocId = defaultDoc.id;
      }
    }

    const labRequest = await LabRequest.create({
      patientId,
      doctorId: finalDocId,
      testName,
      category: category || 'General',
      status: 'pending',
      specimenCollected: false,
      sampleStatus: 'collected', // default state when ordered
    }, { transaction });

    // Try to auto-bill the test rate if catalog entry exists
    const testCatalog = await LaboratoryTest.findOne({ where: { name: testName }, transaction });
    const rate = testCatalog ? Number(testCatalog.rate) : 0.00;

    if (rate > 0) {
      let invoice = await Invoice.findOne({
        where: { patientId, status: 'unpaid' },
        order: [['createdAt', 'DESC']],
        transaction
      });

      if (!invoice) {
        invoice = await Invoice.create({
          patientId,
          totalAmount: 0.00,
          discount: 0.00,
          tax: 0.00,
          grandTotal: 0.00,
          paidAmount: 0.00,
          status: 'unpaid',
          paymentMethod: 'pending'
        }, { transaction });
      }

      await InvoiceItem.create({
        invoiceId: invoice.id,
        itemName: `${testName} (Lab Diagnostic)`,
        itemCategory: 'Diagnostics',
        unitPrice: rate,
        quantity: 1,
        totalPrice: rate,
      }, { transaction });

      // Recalculate invoice totals
      const allItems = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, transaction });
      const newTotal = allItems.reduce((acc, item) => acc + Number(item.totalPrice), 0);
      const disc = Number(invoice.discount);
      const taxable = Math.max(0, newTotal - disc);
      const newTax = Number((taxable * 0.08).toFixed(2));
      const newGrandTotal = taxable + newTax;

      await invoice.update({
        totalAmount: newTotal,
        tax: newTax,
        grandTotal: newGrandTotal
      }, { transaction });
    }

    await transaction.commit();
    return res.status(201).json({ message: 'Lab test requested and billed.', labRequest });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error creating lab request.', error: error.message });
  }
};

export const getLabRequests = async (req: Request, res: Response) => {
  const { status, patientId } = req.query;
  const whereClause: any = {};

  if (status) whereClause.status = status;
  if (patientId) whereClause.patientId = patientId;

  try {
    const requests = await LabRequest.findAll({
      where: whereClause,
      include: [
        { model: Patient, attributes: ['id', 'name', 'phone', 'gender', 'dob', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(requests);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving lab requests.', error: error.message });
  }
};

export const processLabSample = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const request = await LabRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Lab request not found.' });
    }

    await request.update({
      specimenCollected: true,
      sampleStatus: 'collected',
      specimenCollectedAt: new Date(),
    });

    return res.status(200).json({ message: 'Sample collection marked, processing test.', request });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error processing sample.', error: error.message });
  }
};

export const sendSampleToLab = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const request = await LabRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Lab request not found.' });
    }

    await request.update({
      sampleStatus: 'sent_to_lab',
      sentToLabAt: new Date(),
      status: 'processing'
    });

    return res.status(200).json({ message: 'Sample marked as sent to laboratory tracker.', request });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating sample dispatch.', error: error.message });
  }
};

export const submitLabResult = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resultDetails, resultFileUrl } = req.body;

  try {
    const request = await LabRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Lab request not found.' });
    }

    await request.update({
      status: 'completed',
      sampleStatus: 'completed',
      resultDetails,
      resultFileUrl: resultFileUrl || '/uploads/lab_report_placeholder.pdf',
      processedDate: new Date(),
    });

    return res.status(200).json({ message: 'Test results submitted.', request });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error submitting results.', error: error.message });
  }
};

export const deleteLaboratoryTest = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await LaboratoryTest.destroy({ where: { id } });
    return res.status(200).json({ message: 'Laboratory test deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting laboratory test.', error: error.message });
  }
};
