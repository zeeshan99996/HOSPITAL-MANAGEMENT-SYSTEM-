import { Request, Response } from 'express';
import { Medicine, LabRequest, Appointment, TokenQueue, Notification, Patient, Doctor, User } from '../models';
import { Op } from 'sequelize';
import { getPktDayBounds } from '../utils/timezone';

export interface RealtimeAlert {
  id: string;
  title: string;
  desc: string;
  type: 'warning' | 'success' | 'info' | 'error';
  link?: string;
  createdAt: string;
}

export const getRealtimeNotifications = async (req: Request, res: Response) => {
  try {
    const alerts: RealtimeAlert[] = [];
    const { startOfDay, endOfDay } = getPktDayBounds();

    // 1. REAL LOW MEDICINE INVENTORY ALERTS (from database)
    const lowStockMedicines = await Medicine.findAll({
      where: {
        stockLevel: {
          [Op.lte]: 15 // Under 15 units or at/below minStockAlert
        }
      },
      order: [['stockLevel', 'ASC']],
      limit: 6
    });

    for (const med of lowStockMedicines) {
      alerts.push({
        id: `med_${med.id}`,
        title: 'Low Inventory Alert',
        desc: `${med.name} is critically low (${med.stockLevel} ${med.unit || 'units'} remaining).`,
        type: 'warning',
        link: '/pharmacy',
        createdAt: (med as any).updatedAt ? (med as any).updatedAt.toISOString() : new Date().toISOString()
      });
    }

    // 2. REAL LAB RESULTS READY (Completed Lab Tests from database)
    const completedLabs = await LabRequest.findAll({
      where: {
        status: 'completed'
      },
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });

    for (const lab of completedLabs) {
      const patientName = lab.patient?.name || `MRN ${lab.patient?.mrNumber || 'N/A'}`;
      alerts.push({
        id: `lab_done_${lab.id}`,
        title: 'Lab Result Ready',
        desc: `${lab.testName} report ready for patient ${patientName}.`,
        type: 'success',
        link: '/laboratory',
        createdAt: (lab as any).updatedAt ? (lab as any).updatedAt.toISOString() : new Date().toISOString()
      });
    }

    // 3. REAL OPD TOKENS WAITING IN QUEUE (Live Queue from database)
    const waitingTokens = await TokenQueue.findAll({
      where: {
        status: 'waiting',
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ],
      order: [['id', 'ASC']],
      limit: 5
    });

    for (const tok of waitingTokens) {
      const patientName = tok.patient?.name || `MRN ${tok.patient?.mrNumber || 'N/A'}`;
      const docName = tok.doctor?.user?.name ? `Dr. ${tok.doctor.user.name}` : 'Physician';
      alerts.push({
        id: `token_wait_${tok.id}`,
        title: 'Patient Waiting in Queue',
        desc: `Token #${tok.tokenNumber}: ${patientName} is waiting for ${docName}.`,
        type: 'info',
        link: '/tokens',
        createdAt: (tok as any).createdAt ? (tok as any).createdAt.toISOString() : new Date().toISOString()
      });
    }

    // 4. REAL APPOINTMENTS (Booked for Today or Pending from database)
    const pendingAppointments = await Appointment.findAll({
      where: {
        status: 'pending',
        appointmentDate: {
          [Op.gte]: startOfDay
        }
      },
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrNumber'] },
        { model: Doctor, include: [{ model: User, attributes: ['name'] }] }
      ],
      order: [['appointmentDate', 'ASC']],
      limit: 5
    });

    for (const appt of pendingAppointments) {
      const patientName = appt.patient?.name || 'Registered Patient';
      const docName = appt.doctor?.user?.name ? `Dr. ${appt.doctor.user.name}` : 'Doctor';
      alerts.push({
        id: `appt_${appt.id}`,
        title: 'New Appointment Booked',
        desc: `${patientName} has a scheduled consultation with ${docName}.`,
        type: 'info',
        link: '/appointments',
        createdAt: (appt as any).createdAt ? (appt as any).createdAt.toISOString() : new Date().toISOString()
      });
    }

    // 5. SYSTEM DATABASE NOTIFICATIONS (from Notification table)
    const dbNotifs = await Notification.findAll({
      where: {
        status: 'unread'
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    for (const notif of dbNotifs) {
      alerts.push({
        id: `db_notif_${notif.id}`,
        title: notif.title,
        desc: notif.message,
        type: notif.type === 'low_stock' ? 'warning' : notif.type === 'billing' ? 'warning' : 'info',
        link: notif.type === 'low_stock' ? '/pharmacy' : notif.type === 'billing' ? '/billing' : '/dashboard',
        createdAt: (notif as any).createdAt ? (notif as any).createdAt.toISOString() : new Date().toISOString()
      });
    }

    // Sort all alerts: warnings first, then newest first
    alerts.sort((a, b) => {
      if (a.type === 'warning' && b.type !== 'warning') return -1;
      if (b.type === 'warning' && a.type !== 'warning') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error: any) {
    console.error('Error fetching realtime notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve realtime notifications.',
      error: error.message
    });
  }
};
