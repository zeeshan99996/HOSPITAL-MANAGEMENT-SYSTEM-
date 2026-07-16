import { Request, Response } from 'express';
import { Appointment, Patient, Doctor, User, Prescription, PrescriptionItem, Invoice, InvoiceItem } from '../models';
import { Op } from 'sequelize';

export const createAppointment = async (req: Request, res: Response) => {
  const { patientId, doctorId, appointmentDate, type, symptoms } = req.body;

  try {
    const patient = await Patient.findByPk(patientId);
    const doctor = await Doctor.findByPk(doctorId, {
      include: [{ model: User, attributes: ['name'] }],
    });

    if (!patient || !doctor) {
      return res.status(404).json({ message: 'Patient or Doctor not found.' });
    }

    // Step 1: Insert appointment with a temporary placeholder token.
    // Using the DB auto-increment id for the final token eliminates the
    // count-based race condition under concurrent bookings.
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      queueToken: 'PENDING',          // temporary — updated immediately below
      status: 'pending',
      type: type || 'walk-in',
      symptoms,
    });

    // Step 2: Derive a permanently unique, human-readable token from the
    // database-assigned primary key.
    const queueToken = `LF-${1000 + appointment.id}`;
    await appointment.update({ queueToken });

    // Create a corresponding Consultation invoice automatically
    const subtotal = Number(doctor.consultationFee);
    const tax = Number((subtotal * 0.08).toFixed(2)); // 8% tax
    const total = subtotal + tax;

    const invoice = await Invoice.create({
      patientId,
      totalAmount: subtotal,
      discount: 0.00,
      tax,
      grandTotal: total,
      paidAmount: 0.00,
      status: 'unpaid',
      insuranceClaimed: false,
      paymentMethod: 'pending',
    });

    await InvoiceItem.create({
      invoiceId: invoice.id,
      itemName: `${(doctor as any).user?.name || 'Physician'} - Consultation Fee (${queueToken})`,
      itemCategory: 'Consultation',
      unitPrice: subtotal,
      quantity: 1,
      totalPrice: subtotal,
    });

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment,
      invoice,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error booking appointment.', error: error.message });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  const { doctorId, patientId, date, status } = req.query;
  const whereClause: any = {};

  if (doctorId) whereClause.doctorId = doctorId;
  if (patientId) whereClause.patientId = patientId;
  if (status) whereClause.status = status;

  if (date) {
    const dayStart = new Date(date as string);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date as string);
    dayEnd.setHours(23, 59, 59, 999);
    whereClause.appointmentDate = {
      [Op.between]: [dayStart, dayEnd],
    };
  }

  try {
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { model: Patient, attributes: ['id', 'name', 'phone', 'gender', 'dob'] },
        {
          model: Doctor,
          attributes: ['id', 'specialization'],
          include: [{ model: User, attributes: ['name'] }],
        },
        {
          model: Prescription,
          include: [PrescriptionItem],
        },
      ],
      order: [['appointmentDate', 'ASC']],
    });

    return res.status(200).json(appointments);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving appointments.', error: error.message });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  try {
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const updates: any = { status };
    if (notes) updates.notes = notes;

    await appointment.update(updates);
    return res.status(200).json({ message: 'Appointment status updated.', appointment });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating status.', error: error.message });
  }
};

export const createPrescription = async (req: Request, res: Response) => {
  const { appointmentId, diagnosis, notes, medicines } = req.body; // medicines: [{name, dosage, frequency, duration}]

  try {
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const prescription = await Prescription.create({
      appointmentId,
      diagnosis,
      notes,
    });

    if (medicines && medicines.length > 0) {
      const items = medicines.map((m: any) => ({
        prescriptionId: prescription.id,
        medicineName: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      }));
      await PrescriptionItem.bulkCreate(items);
    }

    // Complete appointment
    await appointment.update({ status: 'completed' });

    return res.status(201).json({
      message: 'Prescription created and appointment completed.',
      prescription,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating prescription.', error: error.message });
  }
};
