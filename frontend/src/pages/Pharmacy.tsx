import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Pill, Plus, ShoppingBag, Trash2, Package, Layers, Edit3,
  UserCheck, BedDouble, Check, AlertTriangle, Search, Syringe, Filter
} from 'lucide-react';

export const Pharmacy: React.FC = () => {
  const { user } = useAuth();

  // Primary Tab: 'patient' | 'store'
  const [mainTab, setMainTab] = useState<'patient' | 'store'>('patient');

  // Patient Sub-Tab: 'today' | 'admit'
  const [patientSubTab, setPatientSubTab] = useState<'today' | 'admit'>('today');

  const [medicines, setMedicines] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [admitPatients, setAdmitPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient Dispensing State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dispenseItems, setDispenseItems] = useState<Array<{ medicineId: string; quantity: number; dosageMg: string; unitPrice: number }>>([
    { medicineId: '', quantity: 1, dosageMg: '', unitPrice: 0 }
  ]);
  const [dispensingLoading, setDispensingLoading] = useState(false);

  // Store Management State (Admin / Pharmacist)
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isEditMedOpen, setIsEditMedOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  // Add Medicine Form
  const [medName, setMedName] = useState('');
  const [medType, setMedType] = useState('Tablet');
  const [medDosageMg, setMedDosageMg] = useState('500 mg');
  const [medStock, setMedStock] = useState(100);
  const [medPrice, setMedPrice] = useState(50);
  const [medBatch, setMedBatch] = useState('');
  const [medExpiry, setMedExpiry] = useState('');
  const [medThreshold, setMedThreshold] = useState(20);

  // Edit Medicine Form
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Tablet');
  const [editDosageMg, setEditDosageMg] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editBatch, setEditBatch] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editThreshold, setEditThreshold] = useState(20);

  const fetchPharmacyData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Medicines Stock
      const medList = await apiClient.get('/medicines');
      setMedicines(Array.isArray(medList) ? medList : []);

      // 2. Fetch Patients & Admissions
      const [patientsRes, tokensRes, admissionsRes] = await Promise.all([
        apiClient.get('/patients'),
        apiClient.get('/tokens'),
        apiClient.get('/admissions')
      ]);

      const allPatients = Array.isArray(patientsRes) ? patientsRes : (patientsRes?.patients || []);
      const todayTokens = Array.isArray(tokensRes) ? tokensRes : [];
      const admissionsList = Array.isArray(admissionsRes) ? admissionsRes : [];

      // Filter Today Patients (OPD visit today)
      const todayTokenPatientIds = new Set(todayTokens.map((t: any) => t.patientId));
      const todayList = allPatients.filter((p: any) => {
        const isToday = new Date(p.createdAt).toDateString() === new Date().toDateString();
        return isToday || todayTokenPatientIds.has(p.id);
      });
      setTodayPatients(todayList.length > 0 ? todayList : allPatients.slice(0, 15));

      // Filter Admitted Patients (IPD active admissions)
      const admittedList = admissionsList
        .filter((adm: any) => adm.status === 'admitted' || !adm.dischargeDate)
        .map((adm: any) => ({
          ...adm.patient,
          bedNumber: adm.bed?.bedNumber || 'N/A',
          wardName: adm.bed?.wardName || 'IPD Ward',
          admissionId: adm.id
        }));

      // Fallback if no active admissions seeded
      setAdmitPatients(admittedList.length > 0 ? admittedList : allPatients.slice(0, 5));
    } catch (err) {
      console.error('Error fetching pharmacy records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacyData();
  }, []);

  // Handle Dispense Medicine Row Change
  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...dispenseItems];
    if (field === 'medicineId') {
      const med = medicines.find(m => String(m.id) === String(val));
      updated[index] = {
        ...updated[index],
        medicineId: val,
        unitPrice: med ? Number(med.price || 0) : 0,
        dosageMg: med ? (med.unit || '500 mg') : ''
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setDispenseItems(updated);
  };

  const handleAddDispenseRow = () => {
    setDispenseItems([...dispenseItems, { medicineId: '', quantity: 1, dosageMg: '', unitPrice: 0 }]);
  };

  const handleRemoveDispenseRow = (index: number) => {
    const updated = dispenseItems.filter((_, i) => i !== index);
    setDispenseItems(updated.length > 0 ? updated : [{ medicineId: '', quantity: 1, dosageMg: '', unitPrice: 0 }]);
  };

  // Submit Dispense Sale & Auto-Bill Patient
  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient first.');
      return;
    }

    const validItems = dispenseItems.filter(item => item.medicineId !== '');
    if (validItems.length === 0) {
      alert('Please select at least one medicine to dispense.');
      return;
    }

    setDispensingLoading(true);
    try {
      await apiClient.post('/medicines/sale', {
        patientId: Number(selectedPatientId),
        items: validItems.map(i => ({ medicineId: Number(i.medicineId), quantity: Number(i.quantity) }))
      });

      alert(`✅ Medicines dispensed successfully!\nCharges automatically added to patient's invoice bill.`);
      
      // Reset form & refresh data
      setSelectedPatientId('');
      setDispenseItems([{ medicineId: '', quantity: 1, dosageMg: '', unitPrice: 0 }]);
      fetchPharmacyData();
    } catch (err: any) {
      alert(`Failed to dispense medicines: ${err.message}`);
    } finally {
      setDispensingLoading(false);
    }
  };

  // Admin Add New Medicine to Store
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) return;

    try {
      await apiClient.post('/medicines', {
        name: medName,
        category: medType,
        stockLevel: Number(medStock),
        price: Number(medPrice),
        unit: medDosageMg,
        batchNumber: medBatch || `BCH-${Date.now().toString().slice(-4)}`,
        expiryDate: medExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        lowStockThreshold: Number(medThreshold),
      });

      setIsAddMedOpen(false);
      fetchPharmacyData();
      alert(`Medicine '${medName}' added to store inventory successfully!`);
      // Reset
      setMedName('');
      setMedStock(100);
      setMedPrice(50);
      setMedDosageMg('500 mg');
    } catch (err: any) {
      alert(`Failed to add medicine: ${err.message}`);
    }
  };

  // Admin Open Edit Modal
  const handleOpenEditModal = (med: any) => {
    setSelectedMed(med);
    setEditName(med.name);
    setEditType(med.category || 'Tablet');
    setEditDosageMg(med.unit || '500 mg');
    setEditStock(med.stockLevel);
    setEditPrice(Number(med.price || 0));
    setEditBatch(med.batchNumber || '');
    setEditExpiry(med.expiryDate ? new Date(med.expiryDate).toISOString().split('T')[0] : '');
    setEditThreshold(med.lowStockThreshold || 20);
    setIsEditMedOpen(true);
  };

  // Admin Save Edit Medicine
  const handleEditMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    try {
      await apiClient.put(`/medicines/${selectedMed.id}`, {
        name: editName,
        category: editType,
        stockLevel: Number(editStock),
        price: Number(editPrice),
        unit: editDosageMg,
        batchNumber: editBatch,
        expiryDate: editExpiry,
        lowStockThreshold: Number(editThreshold),
      });

      setIsEditMedOpen(false);
      fetchPharmacyData();
      alert(`Medicine '${editName}' information updated successfully!`);
    } catch (err: any) {
      alert(`Failed to update medicine: ${err.message}`);
    }
  };

  // Admin Delete Medicine
  const handleDeleteMedicine = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove '${name}' from Store inventory?`)) {
      try {
        await apiClient.delete(`/medicines/${id}`);
        fetchPharmacyData();
        alert(`Medicine '${name}' deleted from store.`);
      } catch (err: any) {
        alert(`Failed to delete medicine: ${err.message}`);
      }
    }
  };

  // Stats Breakdown
  const totalStoreStock = medicines.reduce((acc, m) => acc + (m.stockLevel || 0), 0);
  const lowStockMeds = medicines.filter(m => m.stockLevel <= (m.lowStockThreshold || 20));

  const filteredStoreMeds = medicines.filter(m =>
    m.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
    (m.category && m.category.toLowerCase().includes(storeSearchQuery.toLowerCase())) ||
    (m.unit && m.unit.toLowerCase().includes(storeSearchQuery.toLowerCase()))
  );

  const activePatientList = patientSubTab === 'today' ? todayPatients : admitPatients;
  const isSysAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'pharmacist';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Pill className="h-5 w-5 text-brand-500" /> Pharmacy & Medicine Store
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispense prescription medicines to Today/Admitted patients and manage complete store stock register.
          </p>
        </div>

        {isAdmin && mainTab === 'store' && (
          <Button onClick={() => setIsAddMedOpen(true)} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Add New Medicine / Injection Stock
          </Button>
        )}
      </div>

      {/* KPI STATS ROW - ADMIN ONLY */}
      {isSysAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3 py-3 border border-slate-200 dark:border-slate-850">
          <div className="p-2 bg-brand-500/10 text-brand-600 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Total Store Formulas</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{medicines.length} Types ({totalStoreStock} units)</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3 border border-slate-200 dark:border-slate-850">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Low Stock Warnings</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{lowStockMeds.length} Items under alert</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3 border border-slate-200 dark:border-slate-850">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Patients Eligible Today</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{todayPatients.length} OPD • {admitPatients.length} IPD Admitted</span>
          </div>
        </Card>
      </div>
      )}

      {/* MAIN NAVIGATION TABS: PATIENT vs STORE */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setMainTab('patient')}
          className={`px-6 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'patient'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="h-4 w-4" /> 1. Patient Medication Dispensing & Billing
        </button>

        <button
          onClick={() => setMainTab('store')}
          className={`px-6 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'store'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="h-4 w-4" /> 2. Store (Medicine & Injection Inventory Register)
        </button>
      </div>

      {/* TAB 1: PATIENT DISPENSING & BILLING */}
      {mainTab === 'patient' && (
        <div className="space-y-5">
          {/* SUB-TABS: TODAY PATIENT vs ADMIT PATIENT */}
          <div className="flex bg-slate-100 dark:bg-dark-900 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setPatientSubTab('today');
                setSelectedPatientId('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                patientSubTab === 'today'
                  ? 'bg-white dark:bg-dark-950 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" /> Today Patient (OPD) ({todayPatients.length})
            </button>

            <button
              onClick={() => {
                setPatientSubTab('admit');
                setSelectedPatientId('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                patientSubTab === 'admit'
                  ? 'bg-white dark:bg-dark-950 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> Admit Patient (IPD) ({admitPatients.length})
            </button>
          </div>

          {/* DISPENSING & AUTO-BILLING CONSOLE CARD */}
          <Card className="p-5 border border-slate-200 dark:border-slate-850 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Pill className="h-4 w-4 text-brand-500" />
                  Dispense Medicines for {patientSubTab === 'today' ? 'Today OPD Patient' : 'Admitted IPD Patient'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Selected medicines, mg dosage, and prices will be automatically added to the patient's bill invoice.
                </p>
              </div>
              <Badge type="info">Auto-Bill Enabled</Badge>
            </div>

            <form onSubmit={handleDispenseSubmit} className="space-y-4">
              {/* Patient Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select {patientSubTab === 'today' ? 'Today OPD' : 'Admitted IPD'} Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">-- Choose Patient --</option>
                  {activePatientList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} • (MR: {p.mrNumber || 'N/A'}) • {p.phone} {patientSubTab === 'admit' ? `• Bed: ${p.bedNumber || 'IPD'}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine Dispensing Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Prescription Medicine / Injection Items</span>
                  <button
                    type="button"
                    onClick={handleAddDispenseRow}
                    className="text-brand-500 hover:text-brand-600 flex items-center gap-1 font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Item
                  </button>
                </div>

                {dispenseItems.map((row, idx) => {
                  const lineTotal = (row.unitPrice || 0) * (row.quantity || 1);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2.5 items-center p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      {/* Medicine Select */}
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Select Medicine / Injection (Tekka)</label>
                        <select
                          required
                          value={row.medicineId}
                          onChange={e => handleItemChange(idx, 'medicineId', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 font-bold"
                        >
                          <option value="">-- Select Medicine / Injection --</option>
                          {medicines.map(m => (
                            <option key={m.id} value={m.id} disabled={m.stockLevel <= 0}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dosage mg */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Dosage (mg)</label>
                        <input
                          type="text"
                          value={row.dosageMg}
                          onChange={e => handleItemChange(idx, 'dosageMg', e.target.value)}
                          placeholder="e.g. 500 mg"
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 font-medium"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 font-mono font-bold"
                        />
                      </div>

                      {/* Total Price */}
                      <div className="col-span-3 sm:col-span-2 text-right">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Total (Rs.)</label>
                        <span className="text-xs font-mono font-extrabold text-brand-600 dark:text-brand-400 block py-1.5">
                          Rs. {lineTotal.toLocaleString()}
                        </span>
                      </div>

                      {/* Remove Row Button */}
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDispenseRow(idx)}
                          className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation Footer & Submit */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Net Amount Added to Patient Invoice Bill:{' '}
                  <span className="text-base font-mono font-extrabold text-brand-600 dark:text-brand-400">
                    Rs. {dispenseItems.reduce((sum, r) => sum + ((r.unitPrice || 0) * (r.quantity || 1)), 0).toLocaleString()}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={dispensingLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {dispensingLoading ? 'Processing...' : 'Dispense & Add Charges to Patient Bill'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 2: STORE (MEDICINE & INJECTION INVENTORY REGISTER) */}
      {mainTab === 'store' && (
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-500" /> Complete Store Medicine & Injection Inventory Register
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Record of available medicines, injections (tekka), syrups, dosage (mg), stock levels, and prices.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search medicine, injection, mg..."
                value={storeSearchQuery}
                onChange={e => setStoreSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-5 py-3.5">Medicine / Tekka Name</th>
                  <th className="px-5 py-3.5">Form / Type</th>
                  <th className="px-5 py-3.5">Dosage Strength (mg)</th>
                  <th className="px-5 py-3.5">Available Stock</th>
                  <th className="px-5 py-3.5">Unit Price (Rs.)</th>
                  <th className="px-5 py-3.5">Batch # / Expiry</th>
                  <th className="px-5 py-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredStoreMeds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-450 text-xs">
                      No medicines match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStoreMeds.map(m => {
                    const isLow = m.stockLevel <= (m.lowStockThreshold || 20);
                    const isInjection = (m.category || '').toLowerCase().includes('injection') || (m.category || '').toLowerCase().includes('tekka');

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white block text-xs flex items-center gap-1.5">
                            {isInjection ? <Syringe className="h-3.5 w-3.5 text-rose-500" /> : <Pill className="h-3.5 w-3.5 text-brand-500" />}
                            {m.name}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-300">
                            {m.category || 'Tablet'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {m.unit || '500 mg'}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-extrabold text-xs ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                              {m.stockLevel} units
                            </span>
                            {isLow && <Badge type="danger">Low Stock</Badge>}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono font-extrabold text-slate-900 dark:text-slate-100">
                          Rs. {Number(m.price || 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 font-mono text-[10px] text-slate-450">
                          <span className="block text-slate-700 dark:text-slate-300 font-semibold">{m.batchNumber || 'BCH-N/A'}</span>
                          <span>Exp: {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : 'N/A'}</span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isAdmin && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="p-1.5 bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMedicine(m.id, m.name)}
                                className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all text-xs font-bold"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ADMIN ADD MEDICINE / INJECTION MODAL */}
      <Modal isOpen={isAddMedOpen} onClose={() => setIsAddMedOpen(false)} title="Add New Medicine / Injection to Store">
        <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
          <Input
            label="Medicine / Injection Name"
            required
            value={medName}
            onChange={e => setMedName(e.target.value)}
            placeholder="e.g. Paracetamol, Ceftriaxone Injection, Augmentin, Gravinate"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Form / Type</label>
              <select
                value={medType}
                onChange={e => setMedType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
              >
                <option value="Tablet">Tablet</option>
                <option value="Tekka / Injection">Tekka / Injection</option>
                <option value="Syrup">Syrup</option>
                <option value="Capsule">Capsule</option>
                <option value="Drip / Infusion">Drip / Infusion</option>
                <option value="Drops / Ointment">Drops / Ointment</option>
              </select>
            </div>

            <Input
              label="Dosage Strength (mg)"
              value={medDosageMg}
              onChange={e => setMedDosageMg(e.target.value)}
              placeholder="e.g. 500 mg, 250 mg, 1000 mg / 1g"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Stock Level (Units)"
              type="number"
              required
              value={medStock}
              onChange={e => setMedStock(Number(e.target.value))}
            />

            <Input
              label="Unit Price (Rs.)"
              type="number"
              required
              value={medPrice}
              onChange={e => setMedPrice(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Batch Number"
              value={medBatch}
              onChange={e => setMedBatch(e.target.value)}
              placeholder="e.g. BCH-9941"
            />

            <Input
              label="Expiry Date"
              type="date"
              value={medExpiry}
              onChange={e => setMedExpiry(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Save Medicine to Store Register
          </Button>
        </form>
      </Modal>

      {/* ADMIN EDIT MEDICINE MODAL */}
      <Modal isOpen={isEditMedOpen} onClose={() => setIsEditMedOpen(false)} title={`Edit Store Record: ${selectedMed?.name || ''}`}>
        <form onSubmit={handleEditMedicineSubmit} className="space-y-4">
          <Input
            label="Medicine / Injection Name"
            required
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Form / Type</label>
              <select
                value={editType}
                onChange={e => setEditType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
              >
                <option value="Tablet">Tablet</option>
                <option value="Tekka / Injection">Tekka / Injection</option>
                <option value="Syrup">Syrup</option>
                <option value="Capsule">Capsule</option>
                <option value="Drip / Infusion">Drip / Infusion</option>
                <option value="Drops / Ointment">Drops / Ointment</option>
              </select>
            </div>

            <Input
              label="Dosage Strength (mg)"
              value={editDosageMg}
              onChange={e => setEditDosageMg(e.target.value)}
              placeholder="e.g. 500 mg, 1000 mg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Available Stock Count"
              type="number"
              required
              value={editStock}
              onChange={e => setEditStock(Number(e.target.value))}
            />

            <Input
              label="Unit Price (Rs.)"
              type="number"
              required
              value={editPrice}
              onChange={e => setEditPrice(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Batch Number"
              value={editBatch}
              onChange={e => setEditBatch(e.target.value)}
            />

            <Input
              label="Expiry Date"
              type="date"
              value={editExpiry}
              onChange={e => setEditExpiry(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Save Updated Medicine Info
          </Button>
        </form>
      </Modal>
    </div>
  );
};
