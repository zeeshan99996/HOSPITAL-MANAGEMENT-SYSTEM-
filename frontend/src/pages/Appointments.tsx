import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { Calendar, User, UserCheck, Stethoscope, FileText, CheckCircle, Plus, Trash } from 'lucide-react';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms controls
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // Booking Form State
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptType, setApptType] = useState('walk-in');
  const [symptoms, setSymptoms] = useState('');

  // Prescription Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [prescriptionMeds, setPrescriptionMeds] = useState<Array<{ name: string; dosage: string; frequency: string; duration: string }>>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = '';
      if (user?.role === 'doctor' && user.profileId) {
        query = `?doctorId=${user.profileId}`;
      } else if (user?.role === 'patient' && user.profileId) {
        query = `?patientId=${user.profileId}`;
      }
      const data = await apiClient.get(`/appointments${query}`);
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsAndPatients = async () => {
    try {
      const depts = await apiClient.get('/admin/departments');
      // Flatten doctors list from departments
      const docList: any[] = [];
      depts.forEach((d: any) => {
        if (d.doctors) {
          d.doctors.forEach((doc: any) => {
            docList.push({
              id: doc.id,
              name: doc.user?.name || `Dr. Specialization: ${doc.specialization}`,
              fee: doc.consultationFee
            });
          });
        }
      });
      setDoctors(docList);

      if (user?.role !== 'patient') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList);
      }
    } catch (err) {
      console.error('Error fetching doctors or patients lists', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctorsAndPatients();
  }, [user]);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/appointments', {
        patientId: user?.role === 'patient' ? user.profileId : patientId,
        doctorId,
        appointmentDate: apptDate,
        type: apptType,
        symptoms,
      });
      setIsBookOpen(false);
      fetchAppointments();
      // Reset form
      setPatientId('');
      setDoctorId('');
      setApptDate('');
      setSymptoms('');
    } catch (err) {
      alert('Error scheduling appointment. Check doctor availability.');
    }
  };

  const handleStartConsultation = (appt: any) => {
    setSelectedAppt(appt);
    setDiagnosis('');
    setPrescriptionNotes('');
    setPrescriptionMeds([{ name: '', dosage: '', frequency: '', duration: '' }]);
    setIsPrescribeOpen(true);
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...prescriptionMeds];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionMeds(updated);
  };

  const handleAddMedRow = () => {
    setPrescriptionMeds([...prescriptionMeds, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedRow = (index: number) => {
    const updated = prescriptionMeds.filter((_, i) => i !== index);
    setPrescriptionMeds(updated.length > 0 ? updated : [{ name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/appointments/prescription', {
        appointmentId: selectedAppt.id,
        diagnosis,
        notes: prescriptionNotes,
        medicines: prescriptionMeds.filter(m => m.name !== '')
      });
      setIsPrescribeOpen(false);
      fetchAppointments();
    } catch (err) {
      alert('Failed to submit prescription.');
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await apiClient.put(`/appointments/${id}/status`, { status: 'cancelled' });
        fetchAppointments();
      } catch (err) {
        alert('Failed to cancel appointment.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Appointments & Queue</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user?.role === 'doctor' ? 'Review your scheduled patients for consultation.' : 'Manage doctor availability and generate tokens.'}
          </p>
        </div>
        {user?.role !== 'doctor' && (
          <Button onClick={() => setIsBookOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Book Appointment
          </Button>
        )}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          <div className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No scheduled appointments.</p>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Select booking options to register an appointment slot.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {appointments.map(appt => (
            <Card key={appt.id} className="flex flex-col justify-between gap-4">
              {/* Card Header info */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="p-1 px-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold rounded-lg border border-brand-500/20 tracking-wider uppercase">
                    Token: {appt.queueToken}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    {user?.role === 'patient' ? `Physician: ${appt.doctor?.user?.name}` : `Patient: ${appt.patient?.name}`}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Slot: {new Date(appt.appointmentDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <Badge
                  type={
                    appt.status === 'completed'
                      ? 'success'
                      : appt.status === 'consultation'
                      ? 'warning'
                      : appt.status === 'cancelled'
                      ? 'error'
                      : 'info'
                  }
                >
                  {appt.status}
                </Badge>
              </div>

              {/* Symptoms body */}
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-dark-950/20 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-350 block mb-0.5">Symptoms:</span>
                <span className="italic">{appt.symptoms || 'General Checkup / Routine Visit'}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-850 pt-3">
                {user?.role === 'doctor' && appt.status === 'pending' && (
                  <Button onClick={() => handleStartConsultation(appt)} variant="primary" size="sm" className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" /> Start Consult
                  </Button>
                )}
                {appt.status === 'pending' && (
                  <Button onClick={() => handleCancelAppointment(appt.id)} variant="danger" size="sm">
                    Cancel Slot
                  </Button>
                )}
                {appt.status === 'completed' && appt.prescription && (
                  <Button
                    onClick={() => alert(`Prescription Summary:\nDiagnosis: ${appt.prescription.diagnosis}\nNotes: ${appt.prescription.notes}`)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Rx
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Book Appointment Modal */}
      <Modal isOpen={isBookOpen} onClose={() => setIsBookOpen(false)} title="Schedule Appointment Slot">
        <form onSubmit={handleBookSubmit} className="space-y-4">
          {/* Patient Selection (For staff users) */}
          {user?.role !== 'patient' && (
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
              <select
                required
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                ))}
              </select>
            </div>
          )}

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Assign Physician</label>
            <select
              required
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} (${d.fee} Fee)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Appointment Date & Time" type="datetime-local" required value={apptDate} onChange={e => setApptDate(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Consultation Type</label>
              <select
                value={apptType}
                onChange={e => setApptType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="walk-in">Walk-in Admission</option>
                <option value="online">Online Telehealth</option>
              </select>
            </div>
          </div>

          <Input label="Symptoms / Presenting Complaints" placeholder="e.g. Heart palpitations, dry cough" value={symptoms} onChange={e => setSymptoms(e.target.value)} />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsBookOpen(false)}>Cancel</Button>
            <Button type="submit">Schedule and Queue Patient</Button>
          </div>
        </form>
      </Modal>

      {/* Prescription Pad Drawer (Doctor Consultations) */}
      <Drawer isOpen={isPrescribeOpen} onClose={() => setIsPrescribeOpen(false)} title={selectedAppt ? `Consultation Pad: Token ${selectedAppt.queueToken}` : 'Consultation'}>
        {selectedAppt && (
          <form onSubmit={handlePrescriptionSubmit} className="space-y-5">
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient:</strong> {selectedAppt.patient?.name} ({selectedAppt.patient?.gender})</p>
              <p className="mt-1"><strong>Symptoms Reported:</strong> <span className="italic">{selectedAppt.symptoms || 'None'}</span></p>
            </div>

            <Input label="Clinical Diagnosis" required value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Acute Bronchitis, Essential Hypertension" />
            
            {/* Prescription Items Grid */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Prescribed Medicines</span>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddMedRow}>Add Row</Button>
              </div>

              {prescriptionMeds.map((med, index) => (
                <div key={index} className="flex flex-col gap-2.5 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-dark-950/20 relative">
                  {prescriptionMeds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedRow(index)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Input label="Medicine Name" required value={med.name} onChange={e => handleMedChange(index, 'name', e.target.value)} placeholder="e.g. Amoxicillin 500mg" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input label="Dosage" required value={med.dosage} onChange={e => handleMedChange(index, 'dosage', e.target.value)} placeholder="1 tab" />
                    <Input label="Frequency" required value={med.frequency} onChange={e => handleMedChange(index, 'frequency', e.target.value)} placeholder="TDS (3x/day)" />
                    <Input label="Duration" required value={med.duration} onChange={e => handleMedChange(index, 'duration', e.target.value)} placeholder="7 days" />
                  </div>
                </div>
              ))}
            </div>

            <Input label="Consultation & Diet Notes" value={prescriptionNotes} onChange={e => setPrescriptionNotes(e.target.value)} placeholder="Rest well, drink warm fluids, avoid dairy..." />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsPrescribeOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Finalize Rx & Complete Visit</Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};
