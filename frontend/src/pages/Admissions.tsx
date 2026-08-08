import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { BedDouble, Plus, ClipboardList, Search, UserMinus, Pill, Stethoscope, Scissors, Clock, HeartPulse, Thermometer } from 'lucide-react';

export const Admissions: React.FC = () => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Category & Filter tabs
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'medical' | 'surgical'>('all');
  const [stayFilter, setStayFilter] = useState<'all' | 'short' | 'long'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal controls
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAdministerOpen, setIsAdministerOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);

  // Admit Form states
  const [patientId, setPatientId] = useState('');
  const [bedId, setBedId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [admissionCategory, setAdmissionCategory] = useState<'medical' | 'surgical'>('medical');
  const [stayType, setStayType] = useState<'short' | 'long'>('short');
  const [condition, setCondition] = useState('');
  const [surgeryDetails, setSurgeryDetails] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [baselineCost, setBaselineCost] = useState('15000');
  const [advancePaid, setAdvancePaid] = useState('5000');
  const [discount, setDiscount] = useState('1000');

  // Daily Vitals Logging Form state
  const [vitalBP, setVitalBP] = useState('120/80');
  const [vitalTemp, setVitalTemp] = useState('98.6');
  const [vitalPulse, setVitalPulse] = useState('72');
  const [vitalSpo2, setVitalSpo2] = useState('98');
  const [vitalNotes, setVitalNotes] = useState('');

  // Administer Medication form states
  const [medId, setMedId] = useState('');
  const [medQty, setMedQty] = useState('1');

  const fetchData = async () => {
    setLoading(true);
    try {
      const bedList = await apiClient.get('/beds');
      const bArr = Array.isArray(bedList) ? bedList : [];
      setBeds(bArr);
      if (bArr.length > 0 && !bedId) {
        const avail = bArr.find((b: any) => b.status === 'available' || !b.status);
        if (avail) setBedId(avail.id.toString());
      }

      const admList = await apiClient.get('/admissions');
      setAdmissions(Array.isArray(admList) ? admList : []);

      const patientList = await apiClient.get('/patients');
      const pArr = Array.isArray(patientList) ? patientList : [];
      setPatients(pArr);
      if (pArr.length > 0 && !patientId) {
        setPatientId(pArr[0].id.toString());
      }

      let docList: any[] = [];
      try {
        const rawDocs = await apiClient.get('/doctors');
        if (Array.isArray(rawDocs) && rawDocs.length > 0) {
          docList = rawDocs.map((doc: any) => ({
            id: doc.id,
            name: doc.user?.name ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`) : `Dr. ${doc.specialization || 'Physician'}`
          }));
        }
      } catch (e) {}

      if (docList.length === 0) {
        try {
          const depts = await apiClient.get('/admin/departments');
          if (Array.isArray(depts)) {
            depts.forEach((d: any) => {
              if (d.doctors) {
                d.doctors.forEach((doc: any) => {
                  docList.push({
                    id: doc.id,
                    name: doc.user?.name ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`) : `Dr. ${doc.specialization || 'Physician'}`
                  });
                });
              }
            });
          }
        } catch (e) {}
      }

      setDoctors(docList);
      if (docList.length > 0 && !doctorId) {
        setDoctorId(docList[0].id.toString());
      }

      const medList = await apiClient.get('/medicines');
      setMedicines(Array.isArray(medList) ? medList : []);
    } catch (err) {
      console.error('Error fetching admission data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admissions', {
        patientId: Number(patientId),
        bedId: Number(bedId),
        doctorId: Number(doctorId),
        admissionCategory,
        stayType,
        condition,
        surgeryDetails: admissionCategory === 'surgical' ? surgeryDetails : null,
        treatmentPlan,
        notes,
        baselineCost: Number(baselineCost),
        advancePaid: Number(advancePaid),
        discount: Number(discount),
      });

      // Optionally log initial vitals if patient file selected
      if (vitalBP) {
        try {
          await apiClient.post(`/patients/${patientId}/vitals`, {
            bp: vitalBP,
            temperature: Number(vitalTemp) || 98.6,
            pulse: Number(vitalPulse) || 72,
            respRate: 16,
            spo2: Number(vitalSpo2) || 98,
            notes: `Initial Admission Vitals (${admissionCategory.toUpperCase()} - ${stayType.toUpperCase()} STAY)`
          });
        } catch (e) {}
      }

      setIsAdmitOpen(false);
      fetchData();

      // Reset
      setPatientId('');
      setBedId('');
      setDoctorId('');
      setCondition('');
      setSurgeryDetails('');
      setTreatmentPlan('');
      setNotes('');
      setBaselineCost('15000');
      setAdvancePaid('5000');
      setDiscount('1000');
    } catch (err) {
      alert('Error admitting patient. Please verify bed availability and required fields.');
    }
  };

  const handleNotesClick = (adm: any) => {
    setSelectedAdmission(adm);
    setNotes(adm.notes || '');
    setIsNotesOpen(true);
  };

  const handleNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admissions/${selectedAdmission.id}/notes`, { notes });
      setIsNotesOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to update clinical logs.');
    }
  };

  const handleLogVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    try {
      await apiClient.post(`/patients/${selectedAdmission.patientId}/vitals`, {
        bp: vitalBP,
        temperature: Number(vitalTemp),
        pulse: Number(vitalPulse),
        respRate: 16,
        spo2: Number(vitalSpo2),
        notes: `Admitted Stay Log: ${vitalNotes || 'Routine vital check.'}`
      });
      setIsVitalsOpen(false);
      alert('Patient daily vitals logged successfully.');
      setVitalNotes('');
    } catch (err) {
      alert('Failed to log patient vitals.');
    }
  };

  const handleAdministerClick = (adm: any) => {
    setSelectedAdmission(adm);
    setMedId('');
    setMedQty('1');
    setIsAdministerOpen(true);
  };

  const handleAdministerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !medId) return;

    try {
      const selectedMed = medicines.find(m => m.id === Number(medId));
      const res = await apiClient.post('/medicines/administer', {
        patientId: selectedAdmission.patientId,
        medicineId: Number(medId),
        quantity: Number(medQty),
      });

      setIsAdministerOpen(false);
      fetchData();

      let alertMsg = `Administered ${medQty} ${selectedMed?.unit || 'units'} of ${selectedMed?.name || 'Medication'}. Patient bill updated.`;
      if (res.lowStockTriggered) {
        alertMsg += '\n\n⚠️ LOW STOCK ALERT TRIGGERED: Medicine inventory is running below threshold!';
      }
      alert(alertMsg);
    } catch (err: any) {
      alert(err.message || 'Failed to administer medication.');
    }
  };

  const handleDischarge = async (id: number) => {
    if (window.confirm('Approve discharge for this patient? This will release the allocated bed.')) {
      try {
        await apiClient.put(`/admissions/${id}/discharge`, {});
        fetchData();
      } catch (err) {
        alert('Failed to process discharge approval.');
      }
    }
  };

  const filteredAdmissions = admissions.filter(adm => {
    const matchesCategory = categoryFilter === 'all' || adm.admissionCategory === categoryFilter;
    const matchesStay = stayFilter === 'all' || adm.stayType === stayFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      adm.patient?.name?.toLowerCase().includes(searchLower) ||
      adm.patient?.mrNumber?.toLowerCase().includes(searchLower) ||
      adm.condition?.toLowerCase().includes(searchLower);
    return matchesCategory && matchesStay && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-brand-500" /> Patient Admissions & Inpatient Care
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage Medical vs. Surgical patients, Short/Long-term stays, and daily BP & vitals monitoring.
          </p>
        </div>
        {user?.role !== 'patient' && (
          <Button onClick={() => setIsAdmitOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Admit Patient
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4 space-y-3 bg-slate-50/50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              All Registries ({admissions.length})
            </button>
            <button
              onClick={() => setCategoryFilter('medical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'medical'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" /> Medical Patients ({admissions.filter(a => a.admissionCategory === 'medical').length})
            </button>
            <button
              onClick={() => setCategoryFilter('surgical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'surgical'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" /> Surgical Patients ({admissions.filter(a => a.admissionCategory === 'surgical').length})
            </button>
          </div>

          {/* Stay Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-450 uppercase">Stay Duration:</span>
            <select
              value={stayFilter}
              onChange={e => setStayFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 font-bold text-slate-800 dark:text-slate-100"
            >
              <option value="all">All Stay Types</option>
              <option value="short">Short Stay (&lt; 48 Hours)</option>
              <option value="long">Long-Term Stay (3+ Days)</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, MR Number, or condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Bed Allocation Visual Grid */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 block">Bed Layout Grid & Status</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {beds.map(bed => (
                <Card key={bed.id} className="p-4 flex flex-col justify-between items-center text-center gap-2 border border-slate-200/60 dark:border-slate-850">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center text-slate-500">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100">{bed.bedNumber}</h4>
                    <p className="text-[9px] text-slate-500 font-medium capitalize">{bed.type} • {bed.wardName}</p>
                  </div>
                  <Badge type={bed.status === 'available' ? 'success' : bed.status === 'occupied' ? 'warning' : 'error'}>
                    {bed.status}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>

          {/* Active Inpatients Table */}
          <div className="space-y-3 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 block">Active Inpatient Registry</span>
            {filteredAdmissions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-xs font-bold text-slate-500">No admitted patient records found for the selected filter.</p>
              </Card>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                      <th className="px-6 py-3.5">Patient / Ward Bed</th>
                      <th className="px-6 py-3.5">Category & Stay</th>
                      <th className="px-6 py-3.5">Physician & Diagnosis</th>
                      <th className="px-6 py-3.5">IPD Financial Dues</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Care Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {filteredAdmissions.map(adm => {
                      const dues = Number(adm.baselineCost) - Number(adm.advancePaid) - Number(adm.discount);
                      const isSurgical = adm.admissionCategory === 'surgical';
                      const isLongStay = adm.stayType === 'long';

                      return (
                        <tr key={adm.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                            {adm.patient?.name}
                            <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{adm.patient?.mrNumber}</span>
                            <span className="block text-[10px] text-brand-500 mt-0.5">Bed: {adm.bed?.bedNumber} ({adm.bed?.wardName})</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                                isSurgical
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {isSurgical ? <Scissors className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                                {isSurgical ? 'SURGICAL PATIENT' : 'MEDICAL PATIENT'}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded w-fit ${
                                isLongStay
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                              }`}>
                                <Clock className="h-2.5 w-2.5" />
                                {isLongStay ? 'Long Stay (3+ Days)' : 'Short Stay (< 48 hrs)'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-850 dark:text-slate-250">Diag: {adm.condition}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">Doctor: {adm.doctor?.user?.name || 'Unassigned'}</span>
                            {adm.surgeryDetails && (
                              <span className="block text-[10px] text-rose-500 font-medium truncate max-w-[180px] mt-0.5">Surg Notes: {adm.surgeryDetails}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] space-y-0.5 font-semibold text-slate-800 dark:text-slate-300">
                              <div>Cost: Rs. {Number(adm.baselineCost).toLocaleString()}</div>
                              <div>Advance: Rs. {Number(adm.advancePaid).toLocaleString()}</div>
                              <div className="text-rose-500">Dues: Rs. {dues.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge type={adm.status === 'admitted' ? 'warning' : 'success'}>
                              {adm.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-y-1.5 sm:space-y-0 sm:space-x-1.5 flex flex-col sm:flex-row justify-end items-center">
                            <button
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setVitalBP('120/80');
                                setVitalTemp('98.6');
                                setVitalPulse('72');
                                setVitalSpo2('98');
                                setVitalNotes('');
                                setIsVitalsOpen(true);
                              }}
                              className="inline-flex items-center gap-1 p-1 px-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              title="Log Daily Vitals (BP, Temp, Pulse)"
                            >
                              <HeartPulse className="h-3 w-3" /> Daily BP & Vitals
                            </button>
                            <button
                              onClick={() => handleNotesClick(adm)}
                              className="inline-flex items-center gap-1 p-1 px-2 bg-slate-100 dark:bg-dark-950 text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                            >
                              <ClipboardList className="h-3 w-3" /> Clinical Care Log
                            </button>
                            {adm.status === 'admitted' && user?.role !== 'patient' && (
                              <button
                                onClick={() => handleAdministerClick(adm)}
                                className="inline-flex items-center gap-1 p-1 px-2 bg-brand-50 dark:bg-brand-950/20 text-brand-600 border border-brand-200 dark:border-brand-900/50 rounded-lg text-[10px] font-bold hover:bg-brand-100 transition-colors"
                              >
                                <Pill className="h-3 w-3" /> Administer Meds
                              </button>
                            )}
                            {adm.status === 'admitted' && user?.role !== 'nurse' && user?.role !== 'patient' && (
                              <button
                                onClick={() => handleDischarge(adm.id)}
                                className="inline-flex items-center gap-1 p-1 px-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors"
                              >
                                <UserMinus className="h-3 w-3" /> Discharge
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Admit Patient Modal */}
      <Modal isOpen={isAdmitOpen} onClose={() => setIsAdmitOpen(false)} title="Admit Patient (Medical / Surgical Intake)">
        <form onSubmit={handleAdmitSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Admission Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-dark-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Admission Category
              </label>
              <select
                value={admissionCategory}
                onChange={e => setAdmissionCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-brand-400 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="medical">Medical Patient (Observation & Treatment)</option>
                <option value="surgical">Surgical Patient (Operation / Post-Op Stay)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Stay Duration Type
              </label>
              <select
                value={stayType}
                onChange={e => setStayType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-brand-400 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="short">Short Stay (&lt; 48 Hours)</option>
                <option value="long">Long-Term Stay (3+ Days / Multi-day Recovery)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Registered Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.mrNumber || p.phone})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Available Bed</label>
              <select
                required
                value={bedId}
                onChange={e => setBedId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Select Bed --</option>
                {(beds.filter(b => !b.status || b.status === 'available' || b.status !== 'occupied').length > 0
                  ? beds.filter(b => !b.status || b.status === 'available' || b.status !== 'occupied')
                  : beds
                ).map(b => (
                  <option key={b.id} value={b.id}>{b.bedNumber} - {b.wardName} ({b.type || 'general'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Admitting Doctor</label>
              <select
                required
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Select Attending Physician --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input label="Admitting Diagnosis / Condition" required value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Post-op coronary bypass, appendectomy recovery, pneumonia" />

          {admissionCategory === 'surgical' && (
            <Input
              label="Surgical Operation Details & Pre/Post-Op Directives"
              required
              value={surgeryDetails}
              onChange={e => setSurgeryDetails(e.target.value)}
              placeholder="e.g. Laparoscopic Appendectomy. Surgeon: Dr. Smith. Monitor incision site & drain."
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Long-Term Treatment & Nursing Care Plan
            </label>
            <textarea
              rows={2}
              value={treatmentPlan}
              onChange={e => setTreatmentPlan(e.target.value)}
              placeholder="e.g. IV fluids 100ml/hr, Pain management, BP check every 6 hours, Mobilization on Day 2."
              className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Initial Vitals Input Block */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Initial Intake Vitals (Blood Pressure & Temperature)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="BP (Systolic/Diastolic)" value={vitalBP} onChange={e => setVitalBP(e.target.value)} placeholder="120/80" />
              <Input label="Temp (°F)" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} placeholder="98.6" />
              <Input label="Pulse (bpm)" value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} placeholder="72" />
              <Input label="SpO2 (%)" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value)} placeholder="98" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Baseline Cost (Rs.)" required type="number" value={baselineCost} onChange={e => setBaselineCost(e.target.value)} />
            <Input label="Advance Paid (Rs.)" required type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} />
            <Input label="Discount (Rs.)" required type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAdmitOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Admission Allocation</Button>
          </div>
        </form>
      </Modal>

      {/* Daily BP & Vitals Log Modal */}
      <Modal isOpen={isVitalsOpen} onClose={() => setIsVitalsOpen(false)} title="Record Daily Patient BP & Vitals">
        <form onSubmit={handleLogVitalsSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p className="mt-1"><strong>Bed Location:</strong> {selectedAdmission.bed?.bedNumber} ({selectedAdmission.bed?.wardName})</p>
              <p className="mt-1"><strong>Category:</strong> <span className="uppercase font-bold">{selectedAdmission.admissionCategory}</span> ({selectedAdmission.stayType} stay)</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="Blood Pressure (BP)" required value={vitalBP} onChange={e => setVitalBP(e.target.value)} placeholder="120/80" />
            <Input label="Temp (°F)" required type="number" step="0.1" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} placeholder="98.6" />
            <Input label="Pulse (bpm)" required type="number" value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} placeholder="72" />
            <Input label="SpO2 (%)" required type="number" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value)} placeholder="98" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Care & Vitals Notes</label>
            <textarea
              rows={3}
              value={vitalNotes}
              onChange={e => setVitalNotes(e.target.value)}
              placeholder="e.g. Patient comfortable. BP stable after IV medication. Drainage checked."
              className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
            <Button type="submit">Commit Vitals Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Daily Notes / Progress Log Modal */}
      <Modal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} title="Clinical Progress & Nursing Care File">
        <form onSubmit={handleNotesSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850 space-y-1">
              <p><strong>Patient:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p><strong>Bed Location:</strong> {selectedAdmission.bed?.bedNumber} - {selectedAdmission.bed?.wardName}</p>
              <p><strong>Condition / Diagnosis:</strong> {selectedAdmission.condition}</p>
              {selectedAdmission.surgeryDetails && (
                <p className="text-rose-500 font-semibold"><strong>Surgery Details:</strong> {selectedAdmission.surgeryDetails}</p>
              )}
              {selectedAdmission.treatmentPlan && (
                <p className="text-brand-600 dark:text-brand-400 font-semibold"><strong>Long-Term Treatment Plan:</strong> {selectedAdmission.treatmentPlan}</p>
              )}
            </div>
          )}
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Care Notes & Progress Log</label>
            <textarea
              required
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Vitals monitored. BP 130/85, Temp 98.6 F. Medication administered as scheduled."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsNotesOpen(false)}>Close</Button>
            <Button type="submit">Commit Progress Notes</Button>
          </div>
        </form>
      </Modal>

      {/* Administer Medication Modal */}
      <Modal isOpen={isAdministerOpen} onClose={() => setIsAdministerOpen(false)} title="Administer Medication / Injection (Clinical Stock)">
        <form onSubmit={handleAdministerSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient EMR:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p className="mt-1"><strong>Condition:</strong> {selectedAdmission.condition}</p>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Stock Medicine / Injection</label>
            <select
              required
              value={medId}
              onChange={e => setMedId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Injection or Drug --</option>
              {medicines.map(m => (
                <option key={m.id} value={m.id} disabled={m.stockLevel <= 0}>
                  {m.name} ({m.stockLevel} {m.unit} available) - Rs. {m.price} per {m.unit}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity administered / Dosage count"
            required
            type="number"
            min="1"
            value={medQty}
            onChange={e => setMedQty(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAdministerOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm Clinical Administration</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
