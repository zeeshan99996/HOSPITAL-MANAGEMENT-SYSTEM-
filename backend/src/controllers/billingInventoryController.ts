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

  try {
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    let total = 0;
    const itemRecords = items.map((item: any) => {
      const itemTotal = Number(item.unitPrice) * Number(item.quantity);
      total += itemTotal;
      return {
        itemName: item.itemName,
        itemCategory: item.itemCategory || 'General',
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
      };
    });

    const discAmt = Number(discount) || 0;
    const taxableAmount = Math.max(0, total - discAmt);
    const taxAmt = Number((taxableAmount * 0.08).toFixed(2)); // 8% standard tax
    const grandTotal = taxableAmount + taxAmt;

    const invoice = await Invoice.create({
      patientId,
      totalAmount: total,
      discount: discAmt,
      tax: taxAmt,
      grandTotal,
      paidAmount: 0.00,
      status: 'unpaid',
      insuranceClaimed: false,
    });

    const itemsToSave = itemRecords.map((item: any) => ({
      ...item,
      invoiceId: invoice.id,
    }));
    await InvoiceItem.bulkCreate(itemsToSave);

    return res.status(201).json({ message: 'Invoice generated successfully.', invoice });
  } catch (error: any) {
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
    const newPaid = currentPaid + paying;
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
    const medicines = await Medicine.findAll({
      include: [{ model: MedicineRate }],
      order: [['name', 'ASC']],
    });
    return res.status(200).json(medicines);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving medicine inventory.', error: error.message });
  }
};

export const updateMedicineStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stockLevel, price, lowStockThreshold, unit } = req.body;

  try {
    const med = await Medicine.findByPk(id);
    if (!med) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }

    const updates: any = {};
    if (stockLevel !== undefined) updates.stockLevel = stockLevel;
    if (price !== undefined) updates.price = price;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;
    if (unit !== undefined) updates.unit = unit;

    await med.update(updates);

    // Sync unit rate
    if (price !== undefined) {
      await MedicineRate.upsert({
        medicineId: med.id,
        unitRate: price,
      });
    }

    return res.status(200).json({ message: 'Medicine updated.', medicine: med });
  } catch (error: any) {
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

export const recordMedicineSale = async (req: Request, res: Response) => {
  const { patientId, items, discount } = req.body; // items: [{medicineId, quantity}], discount optional
  const transaction = await sequelize.transaction();

  try {
    const invoiceItems = [];
    let subtotal = 0;

    for (const item of items) {
      const medicine = await Medicine.findByPk(item.medicineId, { transaction });
      if (!medicine) {
        throw new Error(`Medicine with ID ${item.medicineId} not found.`);
      }

      if (medicine.stockLevel < item.quantity) {
        throw new Error(`Insufficient stock for ${medicine.name}. Only ${medicine.stockLevel} units remaining.`);
      }

      // Deduct stock
      const newStock = medicine.stockLevel - item.quantity;
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

      const totalItemPrice = rate * item.quantity;
      subtotal += totalItemPrice;

      invoiceItems.push({
        itemName: `${medicine.name} (Pharmacy Dispense)`,
        itemCategory: 'Pharmacy',
        unitPrice: rate,
        quantity: item.quantity,
        totalPrice: totalItemPrice,
      });
    }

    // Apply discount correctly before computing tax
    const discAmt = Math.min(Number(discount) || 0, subtotal); // clamp discount to subtotal
    const taxable = Math.max(0, subtotal - discAmt);
    const tax = Number((taxable * 0.08).toFixed(2));
    const grandTotal = taxable + tax;

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
    const newTax = Number((taxable * 0.08).toFixed(2));
    const newGrandTotal = taxable + newTax;

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

    await payroll.update({
      status: 'paid',
      paymentDate: new Date(),
    });

    await ActivityLog.create({
      userId: (req as any).user?.id || null,
      action: 'Salary Disbursed',
      details: `Cleared salary payment for staff member: ${(payroll as any).user?.name} (Month: ${payroll.month}, Net: Rs. ${payroll.netSalary})`,
      ipAddress: req.ip
    });

    return res.status(200).json({ message: 'Salary marked as paid.', payroll });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error processing payroll clearance.', error: error.message });
  }
};
