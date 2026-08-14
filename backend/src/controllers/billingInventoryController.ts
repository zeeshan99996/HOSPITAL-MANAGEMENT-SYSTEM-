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
  StaffMember,
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
      include: [
        { model: User, attributes: ['id', 'name', 'role', 'email', 'phone'] },
        { model: StaffMember, as: 'staffMember', attributes: ['id', 'name', 'phone', 'designation', 'salary', 'status'] }
      ],
      order: [['month', 'DESC'], ['id', 'ASC']],
    });

    const staffMembers = await StaffMember.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'phone', 'designation', 'salary', 'status']
    });

    return res.status(200).json({ payroll, staffMembers });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching payroll logs.', error: error.message });
  }
};

export const generatePayrollForecast = async (req: Request, res: Response) => {
  const { month } = req.body; // e.g. "2026-08"
  if (!month) return res.status(400).json({ message: 'Month parameter is required (format YYYY-MM).' });

  try {
    const staffMembers = await StaffMember.findAll({
      where: { status: 'active' }
    });

    const forecastLogs = [];
    for (const staff of staffMembers) {
      let payLog = await StaffPayroll.findOne({ where: { staffId: staff.id, month } });

      if (!payLog) {
        const basic = Number(staff.salary) || 25000.00;
        const allowances = 0.00;
        const deductions = 0.00;
        const net = basic + allowances - deductions;

        payLog = await StaffPayroll.create({
          staffId: staff.id,
          userId: null,
          staffName: staff.name,
          designation: staff.designation,
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

    const fullyLoaded = await StaffPayroll.findAll({
      where: { month },
      include: [
        { model: User, attributes: ['id', 'name', 'role', 'email'] },
        { model: StaffMember, as: 'staffMember', attributes: ['id', 'name', 'phone', 'designation', 'salary'] }
      ]
    });

    const totalProjectedExpense = fullyLoaded.reduce((acc, log) => acc + Number(log.netSalary), 0);

    return res.status(200).json({
      month,
      forecast: fullyLoaded,
      totalProjectedExpense,
      staffMembers,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error generating salary forecasts.', error: error.message });
  }
};

export const disburseStaffSalary = async (req: Request, res: Response) => {
  const {
    staffId,
    userId,
    staffName,
    designation,
    month,
    basicSalary,
    allowances,
    deductions,
    netSalary,
    paymentDate,
    paymentMethod = 'cash',
    notes
  } = req.body;

  if (!month) {
    return res.status(400).json({ message: 'Month parameter is required (format YYYY-MM).' });
  }

  const transaction = await sequelize.transaction();

  try {
    const cleanBasic = Number(basicSalary) || 0;
    const cleanAllow = Number(allowances) || 0;
    const cleanDeduct = Number(deductions) || 0;
    const cleanNet = netSalary !== undefined ? Number(netSalary) : (cleanBasic + cleanAllow - cleanDeduct);

    let cleanStaffName = staffName;
    let cleanDesignation = designation;

    if (staffId && !cleanStaffName) {
      const s = await StaffMember.findByPk(staffId, { transaction });
      if (s) {
        cleanStaffName = s.name;
        cleanDesignation = s.designation;
      }
    } else if (userId && !cleanStaffName) {
      const u = await User.findByPk(userId, { transaction });
      if (u) {
        cleanStaffName = u.name;
        cleanDesignation = u.role;
      }
    }

    cleanStaffName = cleanStaffName || 'Staff Member';
    cleanDesignation = cleanDesignation || 'Staff';

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const dateOnlyStr = paymentDate || payDate.toISOString().split('T')[0];

    const whereSearch: any = { month };
    if (staffId) whereSearch.staffId = staffId;
    else if (userId) whereSearch.userId = userId;
    else whereSearch.staffName = cleanStaffName;

    let payroll = await StaffPayroll.findOne({ where: whereSearch, transaction });

    if (payroll) {
      await payroll.update({
        staffId: staffId || payroll.staffId,
        userId: userId || payroll.userId,
        staffName: cleanStaffName,
        designation: cleanDesignation,
        basicSalary: cleanBasic,
        allowances: cleanAllow,
        deductions: cleanDeduct,
        netSalary: cleanNet,
        status: 'paid',
        paymentDate: payDate,
        paymentMethod,
        notes: notes || payroll.notes
      }, { transaction });
    } else {
      payroll = await StaffPayroll.create({
        staffId: staffId || null,
        userId: userId || null,
        staffName: cleanStaffName,
        designation: cleanDesignation,
        month,
        basicSalary: cleanBasic,
        allowances: cleanAllow,
        deductions: cleanDeduct,
        netSalary: cleanNet,
        status: 'paid',
        paymentDate: payDate,
        paymentMethod,
        notes: notes || null
      }, { transaction });
    }

    // Automatically post to DailyExpense as 'Staff Salary & Payroll'
    const expense = await DailyExpense.create({
      description: `Staff Salary: ${cleanStaffName} (${cleanDesignation}) - Month: ${month}`,
      category: 'Staff Salary & Payroll',
      amount: cleanNet,
      spentBy: (req as any).user?.name || 'Administrator',
      expenseDate: dateOnlyStr,
    }, { transaction });

    await ActivityLog.create({
      userId: (req as any).user?.id || null,
      action: 'Salary Disbursed',
      details: `Paid salary of Rs. ${cleanNet} to ${cleanStaffName} for ${month} via ${paymentMethod.toUpperCase()}`,
      ipAddress: req.ip
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      message: `Staff salary for ${cleanStaffName} successfully paid and recorded in Clinic Expenses.`,
      payroll,
      expense
    });
  } catch (error: any) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Error disbursing staff salary.', error: error.message });
  }
};

export const payStaffPayroll = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentMethod = 'cash', notes } = req.body;

  try {
    const payroll = await StaffPayroll.findByPk(id, {
      include: [
        { model: User, attributes: ['name'] },
        { model: StaffMember, as: 'staffMember', attributes: ['name', 'designation'] }
      ]
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
      paymentMethod,
      notes: notes || payroll.notes
    });

    const staffName = (payroll as any).staffMember?.name || (payroll as any).user?.name || payroll.staffName || `Staff #${payroll.staffId || payroll.userId}`;
    const designation = (payroll as any).staffMember?.designation || payroll.designation || 'Staff';
    const todayStr = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}-${String(payDate.getDate()).padStart(2, '0')}`;

    // Automatically post salary clearance as an Office / Clinic Expense entry
    const expense = await DailyExpense.create({
      description: `Staff Salary: ${staffName} (${designation}) - Month: ${payroll.month}`,
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

    return res.status(200).json({ message: 'Salary marked as paid and posted to Clinic Expenses.', payroll, expense });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error processing payroll clearance.', error: error.message });
  }
};
