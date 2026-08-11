import { Request, Response } from 'express';
import { User, Patient, Appointment, Admission, Invoice, LabRequest, Medicine, Department, Doctor, Nurse, ActivityLog, TokenQueue } from '../models';
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
    
    // Live Doctor Token Queue Monitor (Strict 12:00 AM Midnight Reset)
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfDay = new Date(`${localDateStr}T00:00:00.000`);
    const endOfDay = new Date(`${localDateStr}T23:59:59.999`);

    const doctorsList = await Doctor.findAll({
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Department, attributes: ['name'] }
      ]
    });

    const liveDoctorsQueue = await Promise.all(
      doctorsList.map(async (doc) => {
        const todayTokens = await TokenQueue.findAll({
          where: {
            doctorId: doc.id,
            createdAt: { [Op.between]: [startOfDay, endOfDay] }
          },
          order: [['createdAt', 'ASC']],
          include: [{ model: Patient, attributes: ['name', 'mrNumber'] }]
        });

        const activeProcessingToken = todayTokens.find(t => t.status === 'processing');
        const waitingTokens = todayTokens.filter(t => t.status === 'waiting');
        const completedTokens = todayTokens.filter(t => t.status === 'completed');

        const currentTokenStr = activeProcessingToken
          ? activeProcessingToken.tokenNumber
          : waitingTokens.length > 0
            ? `${waitingTokens[0].tokenNumber} (Next)`
            : 'No Token';

        const currentPatientName = activeProcessingToken
          ? activeProcessingToken.patient?.name
          : waitingTokens.length > 0
            ? waitingTokens[0].patient?.name
            : 'None';

        let opdStatus = 'available';
        if (activeProcessingToken) {
          opdStatus = 'in_consultation';
        } else if (todayTokens.length > 0) {
          opdStatus = 'busy';
        }

        return {
          doctorId: doc.id,
          doctorName: doc.user?.name ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`) : `Dr. Physician #${doc.id}`,
          specialization: doc.specialization || (doc as any).department?.name || 'General OPD',
          roomNumber: (doc as any).roomNumber || `Room 10${doc.id}`,
          currentToken: currentTokenStr,
          currentPatientName: currentPatientName,
          totalPatientsToday: todayTokens.length,
          waitingQueueCount: waitingTokens.length,
          completedCount: completedTokens.length,
          opdStatus
        };
      })
    );

    // Recent activity log
    const recentActivity = await ActivityLog.findAll({
      limit: 6,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['name', 'role'] }],
    });

    // Live department appointment counts
    const deptsWithDocs = await Department.findAll({
      include: [{
        model: Doctor,
        attributes: ['id'],
        include: [{ model: Appointment, attributes: ['id'] }]
      }]
    });

    const departmentStats = deptsWithDocs.map(d => {
      let count = 0;
      if ((d as any).doctors) {
        (d as any).doctors.forEach((doc: any) => {
          if (doc.appointments) {
            count += doc.appointments.length;
          }
        });
      }
      return { name: d.name, appointments: count };
    });

    const totalTodayTokens = await TokenQueue.count({
      where: {
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [{ model: Patient, required: true }]
    });

    const pendingCheckupsCount = await TokenQueue.count({
      where: {
        status: 'waiting',
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [{ model: Patient, required: true }]
    });

    // Ensure Today Patients cannot exceed total registered patients, and pending checkups cannot exceed today patients
    const rawTodayCount = totalTodayTokens > 0 ? totalTodayTokens : todayAppointments;
    const todayPatients = Math.min(totalPatients, rawTodayCount);
    const pendingCheckups = Math.min(todayPatients, pendingCheckupsCount);

    // DOCTOR ROLE SPECIFIC DASHBOARD
    if (userRole === 'doctor') {
      const currentDoc = await Doctor.findOne({
        where: { userId: (req as any).user.id },
        include: [{ model: User, attributes: ['name', 'email'] }, { model: Department, attributes: ['name'] }]
      });

      const docObj = currentDoc || (doctorsList.length > 0 ? doctorsList[0] : null);
      const targetDocId = docObj ? docObj.id : null;

      const docTodayTokens = targetDocId ? await TokenQueue.findAll({
        where: {
          doctorId: targetDocId,
          createdAt: { [Op.between]: [startOfDay, endOfDay] }
        },
        order: [['createdAt', 'ASC']],
        include: [{ model: Patient, attributes: ['id', 'name', 'mrNumber', 'phone', 'gender', 'age', 'bloodGroup', 'address', 'area'] }]
      }) : [];

      // Deduplicate tokens by unique patient ID, prioritizing status: completed > processing > waiting
      const uniqueTokensMap = new Map<number, any>();
      const statusWeight: Record<string, number> = { completed: 3, processing: 2, waiting: 1 };

      docTodayTokens.forEach(t => {
        const pId = t.patientId || t.id;
        const existing = uniqueTokensMap.get(pId);
        if (!existing) {
          uniqueTokensMap.set(pId, t);
        } else {
          const currentWeight = statusWeight[t.status] || 0;
          const existingWeight = statusWeight[existing.status] || 0;
          if (currentWeight > existingWeight) {
            uniqueTokensMap.set(pId, t);
          }
        }
      });
      const uniqueDocTokens = Array.from(uniqueTokensMap.values());

      const docCompleted = uniqueDocTokens.filter(t => t.status === 'completed').length;
      const docRemaining = uniqueDocTokens.filter(t => t.status === 'waiting' || t.status === 'processing').length;
      const docAdmitted = targetDocId ? await Admission.count({ where: { doctorId: targetDocId, status: 'admitted' } }) : 0;

      return res.status(200).json({
        isDoctorView: true,
        doctorInfo: {
          id: docObj?.id,
          name: docObj?.user?.name ? (docObj.user.name.startsWith('Dr.') ? docObj.user.name : `Dr. ${docObj.user.name}`) : 'Dr. Medical Doctor',
          specialization: docObj?.specialization || (docObj as any)?.department?.name || 'General OPD',
          roomNumber: (docObj as any)?.roomNumber || `Room 10${docObj?.id || 1}`,
        },
        stats: {
          totalPatients: uniqueDocTokens.length,
          todayPatients: uniqueDocTokens.length,
          completedPatients: docCompleted,
          remainingPatients: docRemaining,
          activeAdmissions: docAdmitted,
          pendingCheckups: docRemaining,
        },
        doctorQueueList: uniqueDocTokens,
        liveDoctorsQueue,
        recentActivity: []
      });
    }

    if (userRole === 'receptionist') {
      // Return filtered stats without revenue/financial metrics or low-stock thresholds
      return res.status(200).json({
        stats: {
          totalPatients,
          todayPatients,
          todayAppointments: todayPatients,
          activeAdmissions,
          pendingCheckups,
          totalDoctors: doctorsList.length,
          totalRevenue: null, // Hidden
          pendingBills: null, // Hidden
          pendingLabs: 0,
          lowStockMeds: null, // Hidden
        },
        charts: {
          monthlyRevenue: [], // Hidden
          departmentStats,
        },
        liveDoctorsQueue,
        recentActivity,
      });
    }

    // Revenue aggregates for other roles (admin, doctor, accountant, etc.)
    const paidInvoices = await Invoice.findAll({
      where: { status: 'paid' },
      attributes: ['grandTotal', 'createdAt']
    });
    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);

    const pendingBills = await Invoice.count({ where: { status: 'unpaid' } });
    const pendingLabs = await LabRequest.count({ where: { status: 'pending' } });
    const lowStockMeds = await Medicine.count({ where: { stockLevel: { [Op.lt]: 20 } } });

    // Aggregate actual monthly revenue for last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      monthlyMap[mName] = 0;
    }

    paidInvoices.forEach(inv => {
      const invDate = new Date(inv.createdAt);
      const mName = monthNames[invDate.getMonth()];
      if (monthlyMap[mName] !== undefined) {
        monthlyMap[mName] += Number(inv.grandTotal);
      }
    });

    const monthlyRevenue = Object.keys(monthlyMap).map(month => ({
      month,
      revenue: Number(monthlyMap[month].toFixed(2))
    }));

    return res.status(200).json({
      stats: {
        totalPatients,
        todayPatients,
        todayAppointments: todayPatients,
        activeAdmissions,
        pendingCheckups,
        totalDoctors: doctorsList.length,
        totalRevenue,
        pendingBills,
        pendingLabs,
        lowStockMeds,
      },
      charts: {
        monthlyRevenue,
        departmentStats,
      },
      liveDoctorsQueue,
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
  const { name, email, password, role, phone, cnic, address, designation, salary, departmentId, specialization, consultationFee } = req.body;

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
      cnic: cnic || '',
      address: address || '',
      designation: designation || role,
      salary: Number(salary) || 0,
      status: 'active',
    });

    if (role === 'doctor') {
      let deptId = Number(departmentId);
      if (!deptId || isNaN(deptId) || deptId <= 0) {
        let defaultDept = await Department.findOne();
        if (!defaultDept) {
          defaultDept = await Department.create({ name: 'General OPD', description: 'General Outpatient Department' });
        }
        deptId = defaultDept.id;
      }

      await Doctor.create({
        userId: user.id,
        departmentId: deptId,
        specialization: specialization || designation || 'General Practitioner',
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

export const updateDoctor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, specialization, departmentId, consultationFee, biography, status } = req.body;

  try {
    const doctor = await Doctor.findByPk(id, { include: [{ model: User }] });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    if (doctor.user) {
      const userUpdates: any = {};
      if (name) userUpdates.name = name;
      if (email) userUpdates.email = email;
      if (phone) userUpdates.phone = phone;
      if (status) userUpdates.status = status;
      await doctor.user.update(userUpdates);
    }

    const doctorUpdates: any = {};
    if (specialization) doctorUpdates.specialization = specialization;
    if (departmentId) doctorUpdates.departmentId = departmentId;
    if (consultationFee !== undefined) doctorUpdates.consultationFee = consultationFee;
    if (biography !== undefined) doctorUpdates.biography = biography;
    if (status) doctorUpdates.status = status;

    await doctor.update(doctorUpdates);

    const updated = await Doctor.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'phone', 'status'] },
        { model: Department, attributes: ['id', 'name'] }
      ]
    });

    return res.status(200).json({ message: 'Doctor profile updated successfully.', doctor: updated });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating doctor profile.', error: error.message });
  }
};

export const deleteDoctor = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const doctor = await Doctor.findByPk(id, { include: [{ model: User }] });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    await doctor.update({ status: 'inactive' });
    if (doctor.user) {
      await doctor.user.update({ status: 'inactive' });
    }

    return res.status(200).json({ message: 'Doctor profile deactivated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deactivating doctor.', error: error.message });
  }
};

// ==========================================
// DEPARTMENTS
// ==========================================
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const depts = await Department.findAll({
      include: [{
        model: Doctor,
        attributes: ['id', 'specialization', 'consultationFee', 'status'],
        include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }]
      }],
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

export const deleteUserAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const adminUser = (req as any).user;
    if (adminUser && Number(adminUser.id) === Number(id)) {
      return res.status(400).json({ message: 'You cannot delete your own active administrator account.' });
    }

    const deletedEmail = user.email;
    const deletedName = user.name;

    await user.destroy(); // Soft delete because User model has paranoid: true

    await ActivityLog.create({
      userId: adminUser?.id || null,
      action: 'Account Deletion',
      details: `User account [${deletedName} - ${deletedEmail}] was deleted by Admin.`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: `User account '${deletedName}' (${deletedEmail}) deleted successfully.`,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting user account.', error: error.message });
  }
};

export const createSystemUserAdmin = async (req: Request, res: Response) => {
  const { name, email, password, role, status, phone } = req.body;

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User with this email address already exists.' });
    }

    const hashed = await bcrypt.hash(password || 'Password123', 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || 'patient',
      phone: phone || '',
      status: status || 'active',
    });

    const adminUser = (req as any).user;
    await ActivityLog.create({
      userId: adminUser?.id || null,
      action: 'System User Account Created',
      details: `New account [${user.name} - ${user.email}] with role '${user.role}' created by Admin in Security Control.`,
      ipAddress: req.ip,
    });

    const createdUser = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
    return res.status(201).json({
      message: `System account for '${user.name}' created successfully.`,
      user: createdUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating system user account.', error: error.message });
  }
};



