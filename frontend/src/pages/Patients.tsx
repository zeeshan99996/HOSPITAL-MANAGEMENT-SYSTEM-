import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { Search, UserPlus, Phone, Calendar, Heart, Shield, Activity, MapPin, Eye, ActivitySquare, Ticket, Thermometer } from 'lucide-react';
import { ThermalPrinter } from '../components/ThermalPrinter';

export const Patients: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal / Drawer controls
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  
  // Vitals form modal control
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  
  // Token printing simulator control
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printedToken, setPrintedToken] = useState<any>(null);

  // Form State - Register Patient
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNum, setInsurancePolicyNum] = useState('');
  const [mrNumber, setMrNumber] = useState(''); // Allow custom or generate in backend

  // Form State - Patient Vitals
  const [vitalsBP, setVitalsBP] = useState('120/80');
  const [vitalsTemp, setVitalsTemp] = useState(98.6);
  const [vitalsPulse, setVitalsPulse] = useState(72);
  const [vitalsResp, setVitalsResp] = useState(16);
  const [vitalsSpo2, setVitalsSpo2] = useState(98);
  const [vitalsWeight, setVitalsWeight] = useState('');
  const [vitalsHeight, setVitalsHeight] = useState('');
  const [vitalsNotes, setVitalsNotes] = useState('');

  const fetchPatients = async (query: string = '') => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/patients${query ? `?search=${query}` : ''}`);
      setPatients(data);
    } catch (err) {
      console.error('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handlePatientClick = async (id: number) => {
    setSelectedPatientId(id);
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const data = await apiClient.get(`/patients/${id}`);
      setSelectedPatient(data);
    } catch (err) {
      console.error('Error fetching patient details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/patients', {
        name,
        email,
        phone,
        gender,
        dob,
        address,
        bloodGroup,
        allergies,
        emergencyContactName,
        emergencyContactPhone,
        insuranceProvider,
        insurancePolicyNum,
        mrNumber,
      });
      setIsAddOpen(false);
      fetchPatients();
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setDob('');
      setAddress('');
      setAllergies('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setInsuranceProvider('');
      setInsurancePolicyNum('');
      setMrNumber('');
    } catch (err) {
      alert('Error creating patient profile.');
    }
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      await apiClient.post(`/patients/${selectedPatientId}/vitals`, {
        bp: vitalsBP,
        temperature: Number(vitalsTemp),
        pulse: Number(vitalsPulse),
        respRate: Number(vitalsResp),
        spo2: Number(vitalsSpo2),
        weight: vitalsWeight ? Number(vitalsWeight) : null,
        height: vitalsHeight ? Number(vitalsHeight) : null,
        notes: vitalsNotes,
      });

      setIsVitalsOpen(false);
      // Reload details
      handlePatientClick(selectedPatientId);
      alert('Patient vitals recorded successfully.');
      
      // Reset vitals form
      setVitalsBP('120/80');
      setVitalsTemp(98.6);
      setVitalsPulse(72);
      setVitalsResp(16);
      setVitalsSpo2(98);
      setVitalsWeight('');
      setVitalsHeight('');
      setVitalsNotes('');
    } catch (err) {
      alert('Failed to log patient vitals.');
    }
  };

  const triggerTokenGeneration = async (tokenType: 'opd' | 'bill' | 'lab', tokenDetail: string) => {
    if (!selectedPatient) return;
    try {
      const data = await apiClient.post('/tokens', {
        type: tokenType,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        detail: tokenDetail
      });
      setPrintedToken(data);
      setIsPrintOpen(true);
    } catch (err) {
      alert('Error generating print token.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Patient Database</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Register new patients, view history records, log vital stats, and generate queue tickets.</p>
        </div>
        {user?.role !== 'accountant' && (
          <Button
            onClick={() => setIsAddOpen(true)}
            variant="primary"
            className="flex items-center gap-2 self-start sm:self-center"
          >
            <UserPlus className="h-4 w-4" />
            Register Patient
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, MR Number, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-250 dark:border-slate-800/80 bg-white dark:bg-dark-900 py-2 pl-10 pr-4 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      {/* Patients Data Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-dark-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-555 dark:text-slate-400">No patient files found.</p>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Try refining your search query or register a new patient.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">MR Number / Name</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Biological Info</th>
                <th className="px-6 py-3.5">Registered Date</th>
                <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {patients.map(p => (
                <tr key={p.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400">{p.mrNumber}</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{p.name}</span>
                    <span className="block text-[10px] text-slate-500 font-medium capitalize mt-0.5">{p.gender} • DOB: {p.dob}</span>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {p.phone}</span>
                    <span className="block text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 lowercase font-sans">{p.email || 'No email registered'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold">Blood Group: {p.bloodGroup || 'N/A'}</span>
                    <span className="block text-[10px] text-rose-500 max-w-[150px] truncate mt-0.5" title={p.allergies}>Allergies: {p.allergies || 'None'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handlePatientClick(p.id)}
                      className="inline-flex items-center gap-1 p-1.5 bg-slate-100 hover:bg-brand-500 dark:bg-dark-950 hover:text-white rounded-lg border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 text-[10px] font-bold transition-all"
                    >
                      <Eye className="h-3 w-3" /> EMR File
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Drawer Details Slide Over */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPatient ? `Patient EMR File: ${selectedPatient.name}` : 'Loading Records...'}
      >
        {drawerLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-200 dark:bg-dark-950 rounded-xl" />
            <div className="h-40 bg-slate-200 dark:bg-dark-950 rounded-xl" />
          </div>
        ) : selectedPatient ? (
          <div className="space-y-6 text-slate-700 dark:text-slate-350 max-h-[85vh] overflow-y-auto pr-1">
            {/* Quick Profile Summary */}
            <div className="flex items-center gap-4 bg-slate-150/40 dark:bg-dark-950/40 p-4 border border-slate-200/40 dark:border-slate-850 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-lg select-none shadow-sm shadow-brand-500/25">
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-mono text-[9px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded border border-brand-200/30">
                  {selectedPatient.mrNumber}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1">{selectedPatient.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{selectedPatient.phone} • Blood Type {selectedPatient.bloodGroup}</p>
              </div>
            </div>

            {/* Quick Action Queue Tokens Generator */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 block mb-2 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                Thermal Print Tokens Desk
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => triggerTokenGeneration('opd', 'Dr. Jane Smith (Room 12)')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-brand-200 bg-brand-500/5 hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold transition-all"
                >
                  <Ticket className="h-4.5 w-4.5 mb-1" />
                  OPD Ticket
                </button>
                <button
                  onClick={() => triggerTokenGeneration('lab', 'ECG Fixed Scan Local Test')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-violet-200 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold transition-all"
                >
                  <Activity className="h-4.5 w-4.5 mb-1" />
                  Lab Ticket
                </button>
                <button
                  onClick={() => triggerTokenGeneration('bill', 'IPD Advance Deposit - Rs 5000')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold transition-all"
                >
                  <Ticket className="h-4.5 w-4.5 mb-1" />
                  Bill Slip
                </button>
              </div>
            </div>

            {/* Demographics Block */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 block mb-2 border-b border-slate-200/50 dark:border-slate-800 pb-1">Demographics</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Date of Birth</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedPatient.dob}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Biological Gender</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200 capitalize">{selectedPatient.gender}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block"><MapPin className="inline h-3 w-3 mr-0.5" /> Address</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200 leading-relaxed">{selectedPatient.address}</span>
                </div>
              </div>
            </div>

            {/* Vitals History Tracking */}
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555">Vitals History Tracker</span>
                {user?.role !== 'accountant' && (
                  <button
                    onClick={() => setIsVitalsOpen(true)}
                    className="text-[9px] font-bold uppercase text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                  >
                    <Thermometer className="h-3 w-3" /> Log Vitals
                  </button>
                )}
              </div>

              {selectedPatient.patient_vitals?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No vital logs recorded yet. Please perform receptionist/nurse initial vital check.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {selectedPatient.patient_vitals?.map((v: any) => (
                    <div key={v.id} className="border border-slate-200/60 dark:border-slate-850 p-2.5 rounded-lg bg-slate-50/50 dark:bg-dark-950/20 text-[11px] space-y-1">
                      <div className="flex justify-between font-bold text-[9px] text-slate-500">
                        <span>Logged by: {v.logger?.name} ({v.logger?.role})</span>
                        <span>{new Date(v.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-y-1 gap-x-2 text-[10px] font-medium text-slate-800 dark:text-slate-350">
                        <div>BP: <strong className="text-slate-950 dark:text-white">{v.bp}</strong></div>
                        <div>Temp: <strong className="text-slate-950 dark:text-white">{v.temperature}°F</strong></div>
                        <div>Pulse: <strong className="text-slate-950 dark:text-white">{v.pulse} bpm</strong></div>
                        <div>SpO2: <strong className="text-slate-950 dark:text-white">{v.spo2}%</strong></div>
                        <div>Resp: <strong className="text-slate-950 dark:text-white">{v.respRate}</strong></div>
                        {v.weight && <div>Wt: <strong className="text-slate-950 dark:text-white">{v.weight}kg</strong></div>}
                      </div>
                      {v.notes && <p className="text-[10px] text-slate-500 mt-1 italic">Note: "{v.notes}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency & Insurance Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block mb-2 border-b border-slate-200/50 dark:border-slate-800 pb-1">Emergency Contact</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" /> {selectedPatient.emergencyContactName || 'N/A'}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedPatient.emergencyContactPhone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block mb-2 border-b border-slate-200/50 dark:border-slate-800 pb-1">Insurance Policy</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-brand-500" /> {selectedPatient.insuranceProvider || 'None'}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedPatient.insurancePolicyNum || 'N/A'}</p>
              </div>
            </div>

            {/* Medical Allergies warnings */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-450 block mb-2 border-b border-rose-100 dark:border-rose-950/20 pb-1">Allergies & Contraindications</span>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 leading-relaxed">
                {selectedPatient.allergies || 'No allergies recorded.'}
              </p>
            </div>

            {/* Clinical Visits and Prescriptions History */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block mb-3 border-b border-slate-200/50 dark:border-slate-800 pb-1">Prescription Records</span>
              {selectedPatient.appointments?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No medical consult records available.</p>
              ) : (
                <div className="space-y-4">
                  {selectedPatient.appointments?.map((appt: any) => appt.prescription && (
                    <div key={appt.id} className="border border-slate-200/50 dark:border-slate-800/80 p-3.5 rounded-xl bg-slate-50/50 dark:bg-dark-950/30">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-150">Diag: {appt.prescription.diagnosis}</span>
                        <span className="text-[9px] font-semibold text-slate-550">{new Date(appt.prescription.prescriptionDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed italic">Notes: {appt.prescription.notes || 'None'}</p>
                      
                      {/* Meds List */}
                      {appt.prescription.prescription_items?.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/80 space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Dispensed Drugs:</span>
                          {appt.prescription.prescription_items.map((med: any) => (
                            <div key={med.id} className="flex justify-between text-[11px] font-medium">
                              <span className="text-slate-800 dark:text-slate-200">{med.medicineName}</span>
                              <span className="text-slate-500">{med.dosage} ({med.frequency} • {med.duration})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bed admissions history */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block mb-3 border-b border-slate-200/50 dark:border-slate-800 pb-1">Inpatient Admissions (IPD)</span>
              {selectedPatient.admissions?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No admission history.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPatient.admissions?.map((adm: any) => (
                    <div key={adm.id} className="flex items-center justify-between border border-slate-200/40 dark:border-slate-800/60 p-3 rounded-lg bg-slate-50 dark:bg-dark-950/20 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{adm.bed?.bedNumber} ({adm.bed?.wardName})</p>
                        <p className="text-[10px] text-slate-550 mt-0.5">Condition: {adm.condition}</p>
                      </div>
                      <Badge type={adm.status === 'admitted' ? 'warning' : 'neutral'}>
                        {adm.status === 'admitted' ? 'Admitted' : 'Discharged'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Add Patient Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Patient File">
        <form onSubmit={handleAddPatient} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Patient Full Name" required value={name} onChange={e => setName(e.target.value)} />
            <Input label="Custom MR Number (Optional)" placeholder="Leave blank to auto-generate" value={mrNumber} onChange={e => setMrNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" type="email" placeholder="Optional" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Date of Birth" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <Input label="Address" required value={address} onChange={e => setAddress(e.target.value)} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <Input label="Allergies / Alerts" placeholder="e.g. Penicillin, Peanuts" value={allergies} onChange={e => setAllergies(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} />
            <Input label="Emergency Contact Phone" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Insurance Provider" placeholder="e.g. BlueCross" value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} />
            <Input label="Insurance Policy Number" value={insurancePolicyNum} onChange={e => setInsurancePolicyNum(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Patient File</Button>
          </div>
        </form>
      </Modal>

      {/* Log Vitals Modal */}
      <Modal isOpen={isVitalsOpen} onClose={() => setIsVitalsOpen(false)} title="Record Patient Intake Vitals">
        <form onSubmit={handleVitalsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Blood Pressure (BP)" required value={vitalsBP} onChange={e => setVitalsBP(e.target.value)} placeholder="e.g. 120/80" />
            <Input label="Body Temp (°F)" required type="number" step="0.1" value={vitalsTemp} onChange={e => setVitalsTemp(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Pulse (bpm)" required type="number" value={vitalsPulse} onChange={e => setVitalsPulse(Number(e.target.value))} />
            <Input label="Resp Rate (bpm)" required type="number" value={vitalsResp} onChange={e => setVitalsResp(Number(e.target.value))} />
            <Input label="SpO2 (%)" required type="number" value={vitalsSpo2} onChange={e => setVitalsSpo2(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Weight (kg)" type="number" step="0.1" value={vitalsWeight} onChange={e => setVitalsWeight(e.target.value)} placeholder="Optional" />
            <Input label="Height (cm)" type="number" step="0.1" value={vitalsHeight} onChange={e => setVitalsHeight(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Intake / Vitals Notes</label>
            <textarea
              value={vitalsNotes}
              onChange={e => setVitalsNotes(e.target.value)}
              placeholder="Vitals checked, patient stable. Clear consciousness."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
            <Button type="submit">Commit Vitals Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Simulated Thermal Printer Modal */}
      <ThermalPrinter
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        tokenData={printedToken}
      />
    </div>
  );
};
