import { Request, Response } from 'express';
import {
  Invoice,
  InvoiceItem,
  Patient,
  Medicine,
  ActivityLog,
  MedicineRate,
  DailyExpense,
  StaffPayroll,
  User,
  Notification,
  Payment,
  InsuranceClaim
} from '../models';
import sequelize from '../config/db';
import { Op } from 'sequelize';

// ==========================================
// BILLING / INVOICING
// ==========================================
export const createInvoice = async (req: Request, res: Response) => {
  const { patientId, discount, items, admissionId } = req.body; // items: [{itemName, itemCategory, unitPrice, quantity}]
  const transaction = await sequelize.transaction();

  try {
    const patient = await Patient.findByPk(patientId, { transaction });
    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Patient not found.' });
    }

    let total = 0;
    const itemRecords = (items || []).map((item: any) => {
      const uPrice = Math.max(0, Number(item.unitPrice) || 0);
      const qty = Math.max(1, Number(item.quantity) || 1);
      const itemTotal = Math.round((uPrice * qty) * 100) / 100;
      total += itemTotal;
      return {
        itemName: item.itemName,
        itemCategory: item.itemCategory || 'General',
        unitPrice: uPrice,
        quantity: qty,
        totalPrice: itemTotal,
      };
    });

    total = Math.round(total * 100) / 100;
    const discAmt = Math.min(Math.max(0, Number(discount) || 0), total);
    const taxableAmount = Math.max(0, total - discAmt);
    const taxAmt = 0;
    const grandTotal = Math.round(taxableAmount * 100) / 100;

    const invoice = await Invoice.create({
      patientId,
      totalAmount: total,
      discount: discAmt,
      tax: taxAmt,
      grandTotal,
      paidAmount: 0.00,
      status: 'unpaid',
      insuranceClaimed: false,
    }, { transaction });

    const itemsToSave = itemRecords.map((item: any) => ({
      ...item,
      invoiceId: invoice.id,
    }));
    await InvoiceItem.bulkCreate(itemsToSave, { transaction });

    await transaction.commit();
    return res.status(201).json({ message: 'Invoice generated successfully.', invoice });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error generating invoice.', error: error.message });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  const { patientId, status } = req.query;
  const whereClause: any = {};

  if (patientId) whereClause.patientId = patientId;
  if (status) whereClause.status = status;

  try {
    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        { model: Patient, attributes: ['id', 'name', 'phone', 'mrNumber'] },
        { model: InvoiceItem },
        { model: Payment },
        { model: InsuranceClaim },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(invoices);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving invoices.', error: error.message });
  }
};

export const payInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMethod, insuranceClaimed, insuranceProvider, policyNumber } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const invoice = await Invoice.findByPk(id, { transaction });
    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    const currentPaid = Number(invoice.paidAmount);
    const paying = Number(amount) || 0;
    if (paying <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Payment amount must be a positive number greater than zero.' });
    }

    const newPaid = Math.round((currentPaid + paying) * 100) / 100;
    const targetTotal = Number(invoice.grandTotal);

    let status: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
    if (newPaid >= targetTotal) {
      status = 'paid';
    } else if (newPaid > 0) {
      status = 'partially_paid';
    }

    await invoice.update({
      paidAmount: Math.min(newPaid, targetTotal),
      status,
      paymentMethod: paymentMethod || 'cash',
      insuranceClaimed: insuranceClaimed !== undefined ? insuranceClaimed : invoice.insuranceClaimed,
    }, { transaction });

    // Record Payment transaction
    await Payment.create({
      invoiceId: invoice.id,
      amount: paying,
      paymentMethod: paymentMethod || 'cash',
      paymentDate: new Date(),
    }, { transaction });

    // Handle insurance record — guard against duplicates on multi-installment payments
    if (insuranceClaimed && insuranceProvider && policyNumber) {
      const existingClaim = await InsuranceClaim.findOne({
        where: { invoiceId: invoice.id },
        transaction,
      });

      if (!existingClaim) {
        await InsuranceClaim.create({
          invoiceId: invoice.id,
          insuranceProvider,
          policyNumber,
          claimAmount: targetTotal,
          approvedAmount: 0.00,
          status: 'pending',
        }, { transaction });
      } else {
        // Update the existing claim with latest details
        await existingClaim.update({
          insuranceProvider,
          policyNumber,
          claimAmount: targetTotal,
        }, { transaction });
      }
    }

    await transaction.commit();
    return res.status(200).json({ message: 'Payment recorded successfully.', invoice });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error updating payment.', error: error.message });
  }
};

// ==========================================
// PHARMACY MEDICINES
// ==========================================
export const getMedicines = async (req: Request, res: Response) => {
  try {
    let medicines = await Medicine.findAll({
      include: [{ model: MedicineRate }],
      order: [['name', 'ASC']],
    });

    if (medicines.length < 5) {
      const famousMeds = [
        { name: 'Panadol', category: 'Tablet', unit: '500 mg', stockLevel: 500, price: 35, lowStockThreshold: 50, batchNumber: 'PN-2026-A1', expiryDate: '2028-12-31' },
        { name: 'Panadol Extra', category: 'Tablet', unit: '500/65 mg', stockLevel: 400, price: 45, lowStockThreshold: 40, batchNumber: 'PX-2026-B2', expiryDate: '2028-11-30' },
        { name: 'Brufen', category: 'Tablet', unit: '400 mg', stockLevel: 350, price: 60, lowStockThreshold: 40, batchNumber: 'BR-2026-C3', expiryDate: '2028-10-15' },
        { name: 'Augmentin', category: 'Tablet', unit: '625 mg', stockLevel: 200, price: 280, lowStockThreshold: 30, batchNumber: 'AG-2026-D4', expiryDate: '2027-09-20' },
        { name: 'Augmentin 1g', category: 'Tablet', unit: '1000 mg', stockLevel: 150, price: 350, lowStockThreshold: 25, batchNumber: 'AG-2026-D5', expiryDate: '2027-08-10' },
        { name: 'Risek', category: 'Capsule', unit: '20 mg', stockLevel: 300, price: 160, lowStockThreshold: 35, batchNumber: 'RK-2026-E1', expiryDate: '2028-06-30' },
        { name: 'Risek 40mg', category: 'Capsule', unit: '40 mg', stockLevel: 250, price: 220, lowStockThreshold: 30, batchNumber: 'RK-2026-E2', expiryDate: '2028-05-15' },
        { name: 'Flagyl', category: 'Tablet', unit: '400 mg', stockLevel: 400, price: 40, lowStockThreshold: 50, batchNumber: 'FG-2026-F1', expiryDate: '2028-07-20' },
        { name: 'Arinac', category: 'Tablet', unit: '200/30 mg', stockLevel: 300, price: 70, lowStockThreshold: 35, batchNumber: 'AR-2026-G1', expiryDate: '2028-04-10' },
        { name: 'Softin', category: 'Tablet', unit: '10 mg', stockLevel: 250, price: 90, lowStockThreshold: 30, batchNumber: 'SF-2026-H1', expiryDate: '2028-03-25' },
        { name: 'Ponstan', category: 'Tablet', unit: '250 mg', stockLevel: 400, price: 50, lowStockThreshold: 45, batchNumber: 'PS-2026-I1', expiryDate: '2028-12-01' },
        { name: 'Gravinate', category: 'Tablet', unit: '50 mg', stockLevel: 300, price: 30, lowStockThreshold: 35, batchNumber: 'GV-2026-J1', expiryDate: '2028-08-14' },
        { name: 'Disprin', category: 'Tablet', unit: '300 mg', stockLevel: 500, price: 25, lowStockThreshold: 50, batchNumber: 'DS-2026-K1', expiryDate: '2028-11-05' },
        { name: 'Calpol Syrup', category: 'Syrup', unit: '120mg/5ml', stockLevel: 150, price: 85, lowStockThreshold: 20, batchNumber: 'CP-2026-L1', expiryDate: '2027-10-30' },
        { name: 'Flagyl Suspension', category: 'Syrup', unit: '100mg/5ml', stockLevel: 120, price: 75, lowStockThreshold: 20, batchNumber: 'FS-2026-M1', expiryDate: '2027-09-15' },
        { name: 'Nuberol Forte', category: 'Tablet', unit: '650/35 mg', stockLevel: 350, price: 110, lowStockThreshold: 40, batchNumber: 'NF-2026-N1', expiryDate: '2028-01-20' },
        { name: 'Cefspan', category: 'Capsule', unit: '400 mg', stockLevel: 180, price: 420, lowStockThreshold: 25, batchNumber: 'CS-2026-O1', expiryDate: '2027-12-10' },
        { name: 'Ciprofloxacin', category: 'Tablet', unit: '500 mg', stockLevel: 200, price: 190, lowStockThreshold: 30, batchNumber: 'CP-2026-P1', expiryDate: '2028-02-28' },
        { name: 'Voren', category: 'Tablet', unit: '50 mg', stockLevel: 300, price: 80, lowStockThreshold: 35, batchNumber: 'VR-2026-Q1', expiryDate: '2028-06-12' },
        { name: 'Rigix', category: 'Tablet', unit: '10 mg', stockLevel: 300, price: 85, lowStockThreshold: 35, batchNumber: 'RX-2026-R1', expiryDate: '2028-09-18' },
        { name: 'Normal Saline 0.9%', category: 'IV Drip', unit: '1000 ml', stockLevel: 100, price: 120, lowStockThreshold: 20, batchNumber: 'NS-2026-S1', expiryDate: '2029-01-01' },
        { name: 'Dextrose 5%', category: 'IV Drip', unit: '1000 ml', stockLevel: 80, price: 130, lowStockThreshold: 15, batchNumber: 'DX-2026-T1', expiryDate: '2029-01-01' },
        { name: 'Ringer Lactate', category: 'IV Drip', unit: '1000 ml', stockLevel: 90, price: 140, lowStockThreshold: 15, batchNumber: 'RL-2026-U1', expiryDate: '2029-01-01' },
        { name: 'Clexane Injection', category: 'Injection', unit: '40 mg', stockLevel: 50, price: 1250, lowStockThreshold: 10, batchNumber: 'CX-2026-V1', expiryDate: '2027-11-30' },
        { name: 'Solu-Cortef Injection', category: 'Injection', unit: '100 mg', stockLevel: 60, price: 380, lowStockThreshold: 10, batchNumber: 'SC-2026-W1', expiryDate: '2027-10-15' },
      ];

      for (const m of famousMeds) {
        try {
          const existing = await Medicine.findOne({ where: { name: m.name } });
          if (!existing) {
            const created = await Medicine.create(m as any);
            await MedicineRate.create({
              medicineId: created.id,
              unitRate: created.price,
            });
          }
        } catch (e) {}
      }

      medicines = await Medicine.findAll({
        include: [{ model: MedicineRate }],
        order: [['name', 'ASC']],
      });
    }

    return res.status(200).json(medicines);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving medicine inventory.', error: error.message });
  }
};

export const updateMedicineStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stockLevel, price, lowStockThreshold, unit } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const med = await Medicine.findByPk(id, { transaction });
    if (!med) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Medicine not found.' });
    }

    const updates: any = {};
    if (stockLevel !== undefined) updates.stockLevel = stockLevel;
    if (price !== undefined) updates.price = price;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;
    if (unit !== undefined) updates.unit = unit;

    await med.update(updates, { transaction });

    // Sync unit rate
    if (price !== undefined) {
      await MedicineRate.upsert({
        medicineId: med.id,
        unitRate: price,
      }, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({ message: 'Medicine updated.', medicine: med });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error updating stock.', error: error.message });
  }
};

export const addMedicine = async (req: Request, res: Response) => {
  try {
    const medicine = await Medicine.create(req.body);

    // Create unit rate mapping
    await MedicineRate.create({
      medicineId: medicine.id,
      unitRate: medicine.price,
    });

    return res.status(201).json({ message: 'Medicine added to inventory.', medicine });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error adding medicine.', error: error.message });
  }
};

export const deleteMedicine = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await Medicine.destroy({ where: { id } });
    return res.status(200).json({ message: 'Medicine deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting medicine.', error: error.message });
  }
};

export const recordMedicineSale = async (req: Request, res: Response) => {
  const { patientId, items, discount } = req.body; // items: [{medicineId, quantity}], discount optional
  const transaction = await sequelize.transaction();

  try {
    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Cart is empty. Please select at least one medicine.' });
    }

    // Pre-validate all items before row locking to prevent partial lock acquisitions
    for (const item of items) {
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Medicine quantity must be a positive number greater than zero.' });
      }
    }

    const invoiceItems = [];
    let subtotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity);

      const medicine = await Medicine.findByPk(item.medicineId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!medicine) {
        throw new Error(`Medicine with ID ${item.medicineId} not found.`);
      }

      if (medicine.stockLevel < qty) {
        throw new Error(`Insufficient stock for ${medicine.name}. Only ${medicine.stockLevel} units remaining.`);
      }

      // Deduct stock safely
      const newStock = medicine.stockLevel - qty;
      await medicine.update({ stockLevel: newStock }, { transaction });

      // Low Stock Alert
      if (newStock <= medicine.lowStockThreshold) {
        await Notification.create({
          title: 'Low Stock Alert (POS Sale)',
          message: `Stock level of medicine '${medicine.name}' has dropped to ${newStock} ${medicine.unit}. Please restock.`,
          type: 'low_stock',
          status: 'unread',
        }, { transaction });
      }

      // Fetch predefined rate or default price
      const medRate = await MedicineRate.findOne({ where: { medicineId: medicine.id }, transaction });
      const rate = medRate ? Number(medRate.unitRate) : Number(medicine.price);

      const totalItemPrice = Math.round((rate * qty) * 100) / 100;
      subtotal += totalItemPrice;

      invoiceItems.push({
        itemName: `${medicine.name} (Pharmacy Dispense)`,
        itemCategory: 'Pharmacy',
        unitPrice: rate,
        quantity: qty,
        totalPrice: totalItemPrice,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    // Apply discount correctly before computing tax
    const discAmt = Math.min(Math.max(0, Number(discount) || 0), subtotal); // clamp discount to subtotal
    const taxable = Math.max(0, subtotal - discAmt);
    const tax = 0;
    const grandTotal = Math.round(taxable * 100) / 100;

    // Create Invoice
    const invoice = await Invoice.create({
      patientId,
      totalAmount: subtotal,
      discount: discAmt,
      tax,
      grandTotal,
      paidAmount: 0.00,
      status: 'unpaid',
      insuranceClaimed: false,
      paymentMethod: 'pending',
    }, { transaction });

    const itemsToSave = invoiceItems.map(item => ({ ...item, invoiceId: invoice.id }));
    await InvoiceItem.bulkCreate(itemsToSave, { transaction });

    await transaction.commit();
    return res.status(201).json({ message: 'Pharmacy sale completed, unpaid invoice generated.', invoice });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: error.message });
  }
};

// ==========================================
// DIRECT MEDICAL ENTRY & AUTO-BILLING STOCK DEDUCTION
// ==========================================
export const administerMedicine = async (req: Request, res: Response) => {
  const { patientId, medicineId, quantity } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const patient = await Patient.findByPk(patientId, { transaction });
    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Patient file not found.' });
    }

    const medicine = await Medicine.findByPk(medicineId, { transaction });
    if (!medicine) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Medicine/Injection not found.' });
    }

    if (medicine.stockLevel < quantity) {
      await transaction.rollback();
      return res.status(400).json({ message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockLevel} ${medicine.unit}` });
    }

    // Deduct Stock
    const newStock = medicine.stockLevel - quantity;
    await medicine.update({ stockLevel: newStock }, { transaction });

    // Low stock alert trigger
    let lowStockTriggered = false;
    if (newStock <= medicine.lowStockThreshold) {
      lowStockTriggered = true;
      await Notification.create({
        title: 'Critical Stock Alert',
        message: `Clinical administration of '${medicine.name}' has left only ${newStock} ${medicine.unit} in stock. (Threshold: ${medicine.lowStockThreshold})`,
        type: 'low_stock',
        status: 'unread',
      }, { transaction });
    }

    // Fetch rate
    const medRate = await MedicineRate.findOne({ where: { medicineId }, transaction });
    const rate = medRate ? Number(medRate.unitRate) : Number(medicine.price);
    const itemCost = rate * quantity;

    // Retrieve active unpaid invoice or generate a new one
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

    // Add invoice item
    await InvoiceItem.create({
      invoiceId: invoice.id,
      itemName: `${medicine.name} Administered (Dosage: ${quantity} ${medicine.unit})`,
      itemCategory: 'Pharmacy',
      unitPrice: rate,
      quantity,
      totalPrice: itemCost,
    }, { transaction });

    // Recalculate invoice totals
    const allItems = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, transaction });
    const newTotal = allItems.reduce((acc, item) => acc + Number(item.totalPrice), 0);
    const disc = Number(invoice.discount);
    const taxable = Math.max(0, newTotal - disc);
    const newTax = 0;
    const newGrandTotal = taxable;

    await invoice.update({
      totalAmount: newTotal,
      tax: newTax,
      grandTotal: newGrandTotal
    }, { transaction });

    // Activity log entry
    await ActivityLog.create({
      userId: (req as any).user?.id || null,
      action: 'Medicine Administered',
      details: `Administered ${quantity} ${medicine.unit} of ${medicine.name} to patient ${patient.name}. Auto-billed Rs. ${itemCost}.`,
      ipAddress: req.ip
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({
      message: 'Medication administered, stock deducted and patient billed successfully.',
      invoice,
      lowStockTriggered
    });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error administering medication.', error: error.message });
  }
};

// ==========================================
// PRE-DEFINED RATE CONFIGURATION
// ==========================================
export const getMedicineRates = async (req: Request, res: Response) => {
  try {
    const rates = await MedicineRate.findAll({
      include: [{ model: Medicine, attributes: ['name', 'category', 'unit', 'price'] }],
      order: [[Medicine, 'name', 'ASC']],
    });
    return res.status(200).json(rates);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching rates.', error: error.message });
  }
};

export const saveMedicineRate = async (req: Request, res: Response) => {
  const { medicineId, unitRate } = req.body;
  try {
    const med = await Medicine.findByPk(medicineId);
    if (!med) {
      return res.status(404).json({ message: 'Medicine stock item not found.' });
    }

    const rate = await MedicineRate.upsert({
      medicineId,
      unitRate,
    });

    // Also sync standard price in stock catalog
    await med.update({ price: unitRate });

    return res.status(200).json({ message: 'Unit rate saved and synced.', rate });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error configuring rate.', error: error.message });
  }
};

// ==========================================
// CLINIC EXPENSES (Petty Cash Ledger)
// ==========================================
export const getDailyExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await DailyExpense.findAll({ order: [['expenseDate', 'DESC'], ['id', 'DESC']] });
    return res.status(200).json(expenses);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving petty cash ledger.', error: error.message });
  }
};

export const createDailyExpense = async (req: Request, res: Response) => {
  const { description, category, amount, expenseDate } = req.body;
  const spentBy = (req as any).user?.name || 'Authorized Staff';

  try {
    const expense = await DailyExpense.create({
      description,
      category,
      amount,
      spentBy,
      expenseDate: expenseDate || new Date().toISOString().split('T')[0],
    });

    await ActivityLog.create({
      userId: (req as any).user?.id || null,
      action: 'Expense Logged',
      details: `Logged petty cash expenditure: ${description} (Rs. ${amount})`,
      ipAddress: req.ip
    });

    return res.status(201).json({ message: 'Petty cash expense logged.', expense });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error logging expense.', error: error.message });
  }
};

export const deleteDailyExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await DailyExpense.destroy({ where: { id } });
    return res.status(200).json({ message: 'Expense entry removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error removing expense entry.', error: error.message });
  }
};

// ==========================================
// STAFF PAYROLL & SALARY FORECASTS
// ==========================================
export const getStaffPayroll = async (req: Request, res: Response) => {
  const { month } = req.query;
  const whereClause: any = {};
  if (month) whereClause.month = month;

  try {
    const payroll = await StaffPayroll.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ['id', 'name', 'role', 'email'] }],
      order: [['month', 'DESC'], ['id', 'ASC']],
    });
    return res.status(200).json(payroll);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching payroll logs.', error: error.message });
  }
};

export const generatePayrollForecast = async (req: Request, res: Response) => {
  const { month } = req.body; // e.g. "2026-07"
  if (!month) return res.status(400).json({ message: 'Month parameter is required (format YYYY-MM).' });

  try {
    // Get all clinical & administrative staff (exclude patients)
    const staffUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant'] },
        status: 'active'
      }
    });

    const forecastLogs = [];
    for (const staff of staffUsers) {
      // Check if log already exists
      let payLog = await StaffPayroll.findOne({ where: { userId: staff.id, month } });

      if (!payLog) {
        // Assign default salaries based on role
        let basic = 15000.00;
        let allowances = 1000.00;
        let deductions = 300.00;

        if (staff.role === 'doctor') {
          basic = 60000.00;
          allowances = 5000.00;
        } else if (staff.role === 'accountant') {
          basic = 25000.00;
          allowances = 2000.00;
        }

        const net = basic + allowances - deductions;

        payLog = await StaffPayroll.create({
          userId: staff.id,
          month,
          basicSalary: basic,
          allowances,
          deductions,
          netSalary: net,
          status: 'pending',
          paymentDate: null
        });
      }
      forecastLogs.push(payLog);
    }

    // Refresh data to include User models
    const fullyLoaded = await StaffPayroll.findAll({
      where: { month },
      include: [{ model: User, attributes: ['id', 'name', 'role', 'email'] }]
    });

    const totalProjectedExpense = fullyLoaded.reduce((acc, log) => acc + Number(log.netSalary), 0);

    return res.status(200).json({
      month,
      forecast: fullyLoaded,
      totalProjectedExpense,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error generating salary forecasts.', error: error.message });
  }
};

export const payStaffPayroll = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payroll = await StaffPayroll.findByPk(id, {
      include: [{ model: User, attributes: ['name'] }]
    });
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll entry not found.' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ message: 'Salary is already cleared.' });
    }

    const payDate = new Date();
    await payroll.update({
      status: 'paid',
      paymentDate: payDate,
    });

    const staffName = (payroll as any).user?.name || `Staff #${payroll.userId}`;
    const todayStr = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}-${String(payDate.getDate()).padStart(2, '0')}`;

    // Automatically post salary clearance as an Office / Clinic Expense entry
    await DailyExpense.create({
      description: `Staff Salary Disbursed: ${staffName} (${payroll.month})`,
      category: 'Staff Salary & Payroll',
      amount: Number(payroll.netSalary) || 0,
      spentBy: (req as any).user?.name || 'Administrator',
      expenseDate: todayStr,
    });

    await ActivityLog.create({
      userId: (req as any).user?.id || null,
      action: 'Salary Disbursed',
      details: `Cleared salary payment for staff member: ${staffName} (Month: ${payroll.month}, Net: Rs. ${payroll.netSalary}) & posted auto expense record.`,
      ipAddress: req.ip
    });

    return res.status(200).json({ message: 'Salary marked as paid and posted to Office Expenses.', payroll });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error processing payroll clearance.', error: error.message });
  }
};
