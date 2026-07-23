import { Request, Response } from 'express';
import { User, Patient, Appointment, Admission, Invoice, LabRequest, Medicine, Department, Doctor, Nurse, ActivityLog } from '../models';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

// ==========================================
// DASHBOARD ANALYTICS WIDGETS
// ==========================================
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalPatients = await Patient.count();
    
    const todayAppointments = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.between]: [today, tomorrow],
        },
      },
    });

    const activeAdmissions = await Admission.count({ where: { status: 'admitted' } });
    
    // Recent activity log
    const recentActivity = await ActivityLog.findAll({
      limit: 6,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['name', 'role'] }],
    });

    const departmentStats = [
      { name: 'Cardiology', appointments: 12 },
      { name: 'Pediatrics', appointments: 8 },
      { name: 'Neurology', appointments: 5 },
      { name: 'Orthopedics', appointments: 14 },
      { name: 'General Medicine', appointments: 25 },
    ];

    if (userRole === 'receptionist') {
      // Return filtered stats without revenue/financial metrics or low-stock thresholds
      return res.status(200).json({
        stats: {
          totalPatients,
          todayAppointments,
          activeAdmissions,
          totalRevenue: null, // Hidden
          pendingBills: null, // Hidden
          pendingLabs: 0,
          lowStockMeds: null, // Hidden
        },
        charts: {
          monthlyRevenue: [], // Hidden
          departmentStats,
        },
        recentActivity,
      });
    }

    // Revenue aggregates for other roles (admin, doctor, accountant, etc.)
    const paidInvoices = await Invoice.findAll({ where: { status: 'paid' } });
    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);

    const pendingBills = await Invoice.count({ where: { status: 'unpaid' } });
    const pendingLabs = await LabRequest.count({ where: { status: 'pending' } });
    const lowStockMeds = await Medicine.count({ where: { stockLevel: { [Op.lt]: 20 } } });

    // Mock chart data (Monthly Revenue & Department Bookings)
    const monthlyRevenue = [
      { month: 'Jan', revenue: totalRevenue * 0.4 },
      { month: 'Feb', revenue: totalRevenue * 0.5 },
      { month: 'Mar', revenue: totalRevenue * 0.65 },
      { month: 'Apr', revenue: totalRevenue * 0.75 },
      { month: 'May', revenue: totalRevenue * 0.8 },
      { month: 'Jun', revenue: totalRevenue },
    ];

    return res.status(200).json({
      stats: {
        totalPatients,
        todayAppointments,
        activeAdmissions,
        totalRevenue,
        pendingBills,
        pendingLabs,
        lowStockMeds,
      },
      charts: {
        monthlyRevenue,
        departmentStats,
      },
      recentActivity,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error compiling dashboard stats.', error: error.message });
  }
};

// ==========================================
// STAFF MANAGEMENT (CRUD)
// ==========================================
export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staff = await User.findAll({
      where: {
        role: {
          [Op.in]: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant'],
        },
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Doctor,
          include: [{ model: Department, attributes: ['name'] }],
        },
        {
          model: Nurse,
          include: [{ model: Department, attributes: ['name'] }],
        },
      ],
    });
    return res.status(200).json(staff);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving staff records.', error: error.message });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  const { name, email, password, role, phone, departmentId, specialization, consultationFee } = req.body;

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Staff email already registered.' });
    }

    const hashed = await bcrypt.hash(password || 'Password123', 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      phone,
      status: 'active',
    });

    if (role === 'doctor') {
      await Doctor.create({
        userId: user.id,
        departmentId: departmentId || 1,
        specialization: specialization || 'General Practitioner',
        consultationFee: consultationFee || 50.00,
        status: 'active',
      });
    }

    return res.status(201).json({ message: 'Staff member created successfully.', user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating staff.', error: error.message });
  }
};

export const updateStaffStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // active, inactive

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    await user.update({ status });
    return res.status(200).json({ message: `Staff account status updated to ${status}.`, user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating staff status.', error: error.message });
  }
};

// ==========================================
// DEPARTMENTS
// ==========================================
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const depts = await Department.findAll({
      include: [{ model: Doctor, attributes: ['id'] }],
    });
    return res.status(200).json(depts);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving departments.', error: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const dept = await Department.create(req.body);
    return res.status(201).json({ message: 'Department created successfully.', dept });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating department.', error: error.message });
  }
};

// ==========================================
// ACTIVITY AUDIT LOGS
// ==========================================
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await ActivityLog.findAll({
      include: [{ model: User, attributes: ['name', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving activity logs.', error: error.message });
  }
};

// ==========================================
// SECURITY & USER CREDENTIALS MANAGEMENT (ADMIN)
// ==========================================
export const getAllUsersAdmin = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving user accounts.', error: error.message });
  }
};

export const updateUserCredentials = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, status } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ message: 'Email address is already in use by another account.' });
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;

    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.update(updates);

    // Track security activity audit log
    const adminUser = (req as any).user;
    await ActivityLog.create({
      userId: adminUser?.id || user.id,
      action: 'Security Credentials Update',
      details: `Account [${user.email}] updated by Admin. Modified fields: ${Object.keys(updates).join(', ')}.`,
      ipAddress: req.ip,
    });

    const updatedUser = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    return res.status(200).json({
      message: `User credentials for ${user.email} updated successfully.`,
      user: updatedUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating user credentials.', error: error.message });
  }
};

