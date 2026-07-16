import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { BedDouble, Plus, ClipboardList, CheckCircle, Search, UserMinus, Pill } from 'lucide-react';

export const Admissions: React.FC = () => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAdministerOpen, setIsAdministerOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);

  // Admit Form states
  const [patientId, setPatientId] = useState('');
  const [bedId, setBedId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [baselineCost, setBaselineCost] = useState('15000');
  const [advancePaid, setAdvancePaid] = useState('5000');
  const [discount, setDiscount] = useState('1000');

  // Administer Medication form states
  const [medId, setMedId] = useState('');
  const [medQty, setMedQty] = useState('1');

  const fetchData = async () => {
    setLoading(true);
    try {
      const bedList = await apiClient.get('/beds');
      setBeds(bedList);

      const admList = await apiClient.get('/admissions');
      setAdmissions(admList);

      if (user?.role !== 'patient') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList);

        const depts = await apiClient.get('/admin/departments');
        const docList: any[] = [];
        depts.forEach((d: any) => {
          if (d.doctors) {
            d.doctors.forEach((doc: any) => {
              docList.push({
                id: doc.id,
                name: doc.user?.name || `Dr. ${doc.specialization}`
              });
            });
          }
        });
        setDoctors(docList);

        const medList = await apiClient.get('/medicines');
        setMedicines(medList);
      }
    } catch (err) {
      console.error('Error fetching admission data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admissions', {
        patientId,
        bedId,
        doctorId,
        condition,
        notes,
        baselineCost: Number(baselineCost),
        advancePaid: Number(advancePaid),
        discount: Number(discount),
      });
      setIsAdmitOpen(false);
      fetchData();
      // Reset
      setPatientId('');
      setBedId('');
      setDoctorId('');
      setCondition('');
      setNotes('');
      setBaselineCost('15000');
      setAdvancePaid('5000');
      setDiscount('1000');
    } catch (err) {
      alert('Error admitting patient. Verify bed status.');
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

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">IPD Admission & Beds</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Allocate patient beds, track ward locations, and record clinical progress cards.</p>
        </div>
        {user?.role !== 'patient' && (
          <Button onClick={() => setIsAdmitOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Admit Patient
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Bed Allocation Visual Grid */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 block">Bed Layout Grid</span>
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
            {admissions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-xs font-bold text-slate-500">No active admitted patients.</p>
              </Card>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                      <th className="px-6 py-3.5">Patient / Ward</th>
                      <th className="px-6 py-3.5">Physician & Condition</th>
                      <th className="px-6 py-3.5">IPD Advances Detail</th>
                      <th className="px-6 py-3.5">Admission Time</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {admissions.map(adm => {
                      const dues = Number(adm.baselineCost) - Number(adm.advancePaid) - Number(adm.discount);
                      return (
                        <tr key={adm.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                            {adm.patient?.name}
                            <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{adm.patient?.mrNumber}</span>
                            <span className="block text-[10px] text-brand-500 mt-0.5">Bed: {adm.bed?.bedNumber} ({adm.bed?.wardName})</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-850 dark:text-slate-250">Condition: {adm.condition}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">Doctor: {adm.doctor?.user?.name || 'Unassigned'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] space-y-0.5 font-semibold text-slate-800 dark:text-slate-300">
                              <div>Cost: Rs. {Number(adm.baselineCost).toLocaleString()}</div>
                              <div>Advance: Rs. {Number(adm.advancePaid).toLocaleString()}</div>
                              <div className="text-rose-500">Dues: Rs. {dues.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                            {new Date(adm.admissionDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-6 py-4">
                            <Badge type={adm.status === 'admitted' ? 'warning' : 'success'}>
                              {adm.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-y-1.5 sm:space-y-0 sm:space-x-1.5 flex flex-col sm:flex-row justify-end items-center">
                            <button
                              onClick={() => handleNotesClick(adm)}
                              className="inline-flex items-center gap-1 p-1 px-2 bg-slate-100 dark:bg-dark-950 text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                            >
                              <ClipboardList className="h-3 w-3" /> Clinical Log
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
      <Modal isOpen={isAdmitOpen} onClose={() => setIsAdmitOpen(false)} title="Admit Patient (IPD Allocation)">
        <form onSubmit={handleAdmitSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Patient --</option>
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
                {beds.filter(b => b.status === 'available').map(b => (
                  <option key={b.id} value={b.id}>{b.bedNumber} - {b.wardName} ({b.type})</option>
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
                <option value="">-- Select Physician --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Baseline Cost (Rs.)" required type="number" value={baselineCost} onChange={e => setBaselineCost(e.target.value)} />
            <Input label="Advance Paid (Rs.)" required type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} />
            <Input label="Discount (Rs.)" required type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>

          <Input label="Admitting Diagnosis / Condition" required value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Post-op coronary bypass observation, pneumonia stabilization" />
          <Input label="Initial Clinical Vitals & Nursing Instructions" value={notes} onChange={e => setNotes(e.target.value)} placeholder="BP 120/80, HR 72. Check vitals every 4 hours." />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAdmitOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Admission Allocation</Button>
          </div>
        </form>
      </Modal>

      {/* Daily Notes / Progress Log Modal */}
      <Modal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} title="Clinical Progress & Nursing Notes">
        <form onSubmit={handleNotesSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient:</strong> {selectedAdmission.patient?.name}</p>
              <p className="mt-1"><strong>Ward Bed Location:</strong> {selectedAdmission.bed?.bedNumber} - {selectedAdmission.bed?.wardName}</p>
              <p className="mt-1"><strong>Reason for Admission:</strong> {selectedAdmission.condition}</p>
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
