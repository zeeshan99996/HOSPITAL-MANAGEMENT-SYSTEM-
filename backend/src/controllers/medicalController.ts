import { Request, Response } from 'express';
import { Bed, Admission, Patient, Doctor, User, LabRequest, LaboratoryTest, Invoice, InvoiceItem } from '../models';
import sequelize from '../config/db';

// ==========================================
// BED MANAGEMENT
// ==========================================
export const getBeds = async (req: Request, res: Response) => {
  try {
    const beds = await Bed.findAll();
    return res.status(200).json(beds);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving beds.', error: error.message });
  }
};

// ==========================================
// ADMISSIONS (IPD)
// ==========================================
export const admitPatient = async (req: Request, res: Response) => {
  const { patientId, bedId, doctorId, condition, notes, baselineCost, advancePaid, discount } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const bed = await Bed.findByPk(bedId, { transaction });
    if (!bed || bed.status !== 'available') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Bed is not available for admission.' });
    }

    const admission = await Admission.create({
      patientId,
      bedId,
      doctorId,
      condition,
      status: 'admitted',
      notes,
      baselineCost: baselineCost || 0.00,
      advancePaid: advancePaid || 0.00,
      discount: discount || 0.00,
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
        itemName: `IPD Admission / Surgery Baseline Cost (Bed: ${bed.bedNumber})`,
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
      const newTax = Number((taxable * 0.08).toFixed(2));
      const newGrandTotal = taxable + newTax;

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
  const { status } = req.query; // admitted, discharged
  const whereClause: any = {};
  if (status) whereClause.status = status;

  try {
    const admissions = await Admission.findAll({
      where: whereClause,
      include: [
        { model: Patient, attributes: ['id', 'name', 'phone', 'bloodGroup', 'allergies', 'mrNumber'] },
        { model: Bed, attributes: ['bedNumber', 'wardName', 'type'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] },
      ],
      order: [['admissionDate', 'DESC']],
    });
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

  try {
    const admission = await Admission.findByPk(id);
    if (!admission || admission.status === 'discharged') {
      return res.status(400).json({ message: 'Admission record not found or already discharged.' });
    }

    const bed = await Bed.findByPk(admission.bedId);

    await admission.update({
      status: 'discharged',
      dischargeDate: new Date(),
    });

    if (bed) {
      await bed.update({ status: 'available' });
    }

    return res.status(200).json({ message: 'Patient discharged successfully.', admission });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error discharging patient.', error: error.message });
  }
};

// ==========================================
// LABORATORY RATES & CATALOG
// ==========================================
export const getLaboratoryTests = async (req: Request, res: Response) => {
  try {
    const tests = await LaboratoryTest.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json(tests);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving tests catalog.', error: error.message });
  }
};

export const createLaboratoryTest = async (req: Request, res: Response) => {
  try {
    const test = await LaboratoryTest.create(req.body);
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
    const labRequest = await LabRequest.create({
      patientId,
      doctorId,
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
