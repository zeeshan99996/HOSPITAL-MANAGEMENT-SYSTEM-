import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Pill, Plus, ShoppingBag, Trash2, Package, Layers, Edit3,
  UserCheck, BedDouble, Check, AlertTriangle, Search, Syringe, Filter,
  FileText, CheckCircle2, Receipt, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Minus
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
      const medList = await apiClient.get('/medicines').catch(() => []);
      setMedicines(Array.isArray(medList) ? medList : []);

      // 2. Fetch Patients & Admissions safely
      const [patientsRes, tokensRes, admissionsRes] = await Promise.all([
        apiClient.get('/patients').catch(() => []),
        apiClient.get('/tokens').catch(() => []),
        apiClient.get('/admissions').catch(() => [])
      ]);

      const allPatients = Array.isArray(patientsRes) ? patientsRes : (patientsRes?.patients || []);
      const todayTokens = Array.isArray(tokensRes) ? tokensRes : [];
      const admissionsList = Array.isArray(admissionsRes) ? admissionsRes : [];

      // Filter Today Patients (Strictly OPD visit today or registered today)
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const todayTokenPatientIds = new Set(todayTokens.map((t: any) => Number(t.patientId)));
      const todayList = allPatients.filter((p: any) => {
        const pDateStr = p.createdAt ? p.createdAt.split('T')[0] : '';
        const isToday = pDateStr === localTodayStr;
        return isToday || todayTokenPatientIds.has(Number(p.id));
      });

      setTodayPatients(todayList);

      // Filter Admitted Patients (IPD active admissions only)
      const admittedList = admissionsList
        .filter((adm: any) => adm && adm.status === 'admitted' && !adm.dischargeDate)
        .map((adm: any) => ({
          ...(adm.patient || {}),
          id: adm.patientId || adm.patient?.id,
          name: adm.patient?.name || `Patient #${adm.patientId}`,
          mrNumber: adm.patient?.mrNumber || 'MR-N/A',
          phone: adm.patient?.phone || 'N/A',
          bedNumber: adm.bed?.bedNumber || 'IPD',
          wardName: adm.bed?.wardName || 'IPD Ward',
          admissionId: adm.id
        }));

      setAdmitPatients(admittedList);
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

  const selectedPatientObj = activePatientList.find(p => String(p.id) === String(selectedPatientId));
  const grandTotal = dispenseItems.reduce((sum, r) => sum + ((r.unitPrice || 0) * (r.quantity || 1)), 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* PROFESSIONAL EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl text-white">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Title & Subtitle */}
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              <span>Clinical Pharmacy & Store Management Suite</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Pill className="h-6 w-6" />
              </div>
              <span>Pharmacy Dispensary & Inventory Desk</span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time prescription dispensing console, automatic invoice charge posting, and live medicine inventory store stock control.
            </p>
          </div>

          {/* Right Column: Key Indicators & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-sm">
              <div className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-left min-w-[95px]">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Stock Types</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-white tracking-tight">{medicines.length}</span>
                  <span className="text-[11px] text-slate-400 font-normal">items</span>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-amber-500/20 text-left min-w-[95px]">
                <span className="text-[10px] text-amber-400/90 font-medium uppercase tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  Low Stock
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-amber-300 tracking-tight">{lowStockMeds.length}</span>
                  <span className="text-[11px] text-amber-400/70 font-normal">alert</span>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-emerald-500/20 text-left min-w-[95px]">
                <span className="text-[10px] text-emerald-400/90 font-medium uppercase tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  OPD/IPD
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-emerald-300 tracking-tight">{todayPatients.length + admitPatients.length}</span>
                  <span className="text-[11px] text-emerald-400/70 font-normal">active</span>
                </div>
              </div>
            </div>

            {/* Dedicated Action Button */}
            <button
              onClick={() => setMainTab(mainTab === 'patient' ? 'store' : 'patient')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm border whitespace-nowrap ${
                mainTab === 'store'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/20'
                  : 'bg-brand-600 hover:bg-brand-500 text-white border-brand-500 shadow-brand-900/20'
              }`}
            >
              {mainTab === 'patient' ? (
                <>
                  <Package className="h-4 w-4" />
                  <span>Store Inventory Register ({medicines.length})</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>← Dispensing Console</span>
                </>
              )}
            </button>

            {isSysAdmin && mainTab === 'store' && (
              <Button onClick={() => setIsAddMedOpen(true)} className="px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs border border-brand-500">
                <Plus className="h-4 w-4" />
                <span>Add Stock Item</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CLEAN FOCUSED DISPENSING CONSOLE TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-dark-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 px-3">
          <UserCheck className="h-4 w-4 text-brand-500" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            {mainTab === 'patient' ? 'Patient Medication Dispensing Console' : 'Store Inventory & Stock Register'}
          </h2>
        </div>

        {/* Sub-Tabs Pills (Only for Patient Tab) */}
        {mainTab === 'patient' && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-950 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-850 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Patient Category:</span>
            
            <button
              onClick={() => {
                setPatientSubTab('today');
                setSelectedPatientId('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                patientSubTab === 'today'
                  ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 border border-brand-200/50 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" /> Today OPD Patients ({todayPatients.length})
            </button>

            <button
              onClick={() => {
                setPatientSubTab('admit');
                setSelectedPatientId('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                patientSubTab === 'admit'
                  ? 'bg-white dark:bg-dark-900 text-purple-600 dark:text-purple-400 border border-purple-200/50 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> Admitted IPD Patients ({admitPatients.length})
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PATIENT DISPENSING & REAL-TIME BILLING SPLIT VIEW */}
      {/* ======================================================== */}
      {mainTab === 'patient' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 7 COLS: PRESCRIPTION BUILDER FORM */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="p-6 border border-slate-200/80 dark:border-slate-800 space-y-5 bg-white dark:bg-dark-900 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Pill className="h-4 w-4 text-brand-500" />
                    Dispense Prescription for {patientSubTab === 'today' ? 'Today OPD Patient' : 'Admitted IPD Patient'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select patient and add prescription medicine/injection items. Charges will post directly to billing invoice.
                  </p>
                </div>
                <Badge type="info" className="px-3 py-1 font-bold">Auto-Billing Active</Badge>
              </div>

              <form onSubmit={handleDispenseSubmit} className="space-y-5">
                {/* Patient Selection Dropdown */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Select {patientSubTab === 'today' ? 'Today OPD' : 'Admitted IPD'} Patient *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Showing {activePatientList.length} patients</span>
                  </label>
                  
                  <select
                    required
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 transition-all"
                  >
                    <option value="">-- Choose Patient from List --</option>
                    {activePatientList.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} • (MRN: {p.mrNumber || 'N/A'}) • {p.phone} {patientSubTab === 'admit' ? `• Bed: ${p.bedNumber || 'IPD'}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Selected Patient Quick Summary Card */}
                  {selectedPatientObj && (
                    <div className="p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
                      <div className="h-10 w-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                        {selectedPatientObj.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[9px] font-bold bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded">
                          MRN: {selectedPatientObj.mrNumber}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{selectedPatientObj.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Contact Phone: {selectedPatientObj.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prescription Items Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="flex items-center gap-1.5"><Syringe className="h-4 w-4 text-brand-500" /> 2. Prescription Items List</span>
                    <button
                      type="button"
                      onClick={handleAddDispenseRow}
                      className="text-brand-600 dark:text-brand-400 hover:text-brand-700 text-xs font-extrabold flex items-center gap-1 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </button>
                  </div>

                  {dispenseItems.map((row, idx) => {
                    const lineTotal = (row.unitPrice || 0) * (row.quantity || 1);
                    const matchedMed = medicines.find(m => String(m.id) === String(row.medicineId));

                    return (
                      <div key={idx} className="p-4 bg-slate-50/80 dark:bg-dark-950/80 rounded-xl border border-slate-200/80 dark:border-slate-850 space-y-3 hover:border-brand-500/30 transition-all">
                        <div className="grid grid-cols-12 gap-3 items-center">
                          {/* Medicine Dropdown */}
                          <div className="col-span-12 sm:col-span-6">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-1">
                              Select Medicine / Injection (Tekka) *
                            </label>
                            <select
                              required
                              value={row.medicineId}
                              onChange={e => handleItemChange(idx, 'medicineId', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-850 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
                            >
                              <option value="">-- Choose Stock Medicine --</option>
                              {medicines.map(m => (
                                <option key={m.id} value={m.id} disabled={m.stockLevel <= 0}>
                                  {m.name} ({m.category || 'Tab'}) • Stock: {m.stockLevel} • Rs. {m.price}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Dosage */}
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-1">
                              Dosage (mg)
                            </label>
                            <input
                              type="text"
                              value={row.dosageMg}
                              onChange={e => handleItemChange(idx, 'dosageMg', e.target.value)}
                              placeholder="e.g. 500 mg"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-850 dark:text-slate-100 font-bold"
                            />
                          </div>

                          {/* Quantity Counter */}
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-1">
                              Quantity
                            </label>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'quantity', Math.max(1, (row.quantity || 1) - 1))}
                                className="px-2.5 py-2 bg-slate-200 dark:bg-dark-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-l-lg font-bold text-xs"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                required
                                value={row.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                                className="w-full text-center py-2 border-y border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'quantity', (row.quantity || 1) + 1)}
                                className="px-2.5 py-2 bg-slate-200 dark:bg-dark-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-r-lg font-bold text-xs"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Line Footer Breakdown */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-850 text-xs">
                          <div className="flex items-center gap-2">
                            {matchedMed ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                matchedMed.stockLevel > matchedMed.lowStockThreshold
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                Stock Available: {matchedMed.stockLevel} units
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Select medicine to view stock</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-black text-brand-600 dark:text-brand-400">
                              Rs. {lineTotal.toLocaleString()}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveDispenseRow(idx)}
                              className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-all"
                              title="Remove Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </form>
            </Card>
          </div>

          {/* RIGHT 5 COLS: LIVE BILLING CHECKOUT SUMMARY CARD */}
          <div className="lg:col-span-5 space-y-5 sticky top-20">
            <Card className="p-6 border border-brand-500/30 bg-gradient-to-b from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950 shadow-lg rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="h-4.5 w-4.5 text-brand-500" /> Live Billing Invoice Summary
                </h3>
                <span className="text-[10px] font-mono font-bold bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded">
                  RECEIPT PREVIEW
                </span>
              </div>

              {/* Patient Banner */}
              <div className="p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase block tracking-wider">Patient Details</span>
                {selectedPatientObj ? (
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block text-sm">{selectedPatientObj.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">MRN: {selectedPatientObj.mrNumber} • {selectedPatientObj.phone}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-xs block py-1">No patient selected yet</span>
                )}
              </div>

              {/* Itemized Charges Breakdown */}
              <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase block tracking-wider">Items Breakdown</span>
                
                {dispenseItems.filter(i => i.medicineId).length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {dispenseItems.filter(i => i.medicineId).map((item, idx) => {
                      const med = medicines.find(m => String(m.id) === String(item.medicineId));
                      const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 bg-slate-100/60 dark:bg-dark-950/60 rounded-lg">
                          <div>
                            <span className="font-bold text-slate-850 dark:text-slate-200 block text-xs">{med?.name || 'Medicine'}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Qty: {item.quantity} × Rs. {item.unitPrice}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            Rs. {itemTotal.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs bg-slate-100/40 dark:bg-dark-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No prescription items added yet.
                  </div>
                )}
              </div>

              {/* Grand Total Calculation Box */}
              <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Subtotal Charges:</span>
                  <span className="font-mono font-bold">Rs. {grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-brand-500/20 pb-2">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Auto Posting Fee:</span>
                  <span className="font-mono text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">Net Bill Amount:</span>
                  <span className="text-xl font-mono font-black text-brand-600 dark:text-brand-400">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit & Auto-Bill Button */}
              <Button
                type="button"
                onClick={handleDispenseSubmit}
                disabled={dispensingLoading || !selectedPatientId || grandTotal <= 0}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30 transition-all"
              >
                {dispensingLoading ? (
                  <>Processing Dispense...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Dispense & Add Charges to Patient Bill (Rs. {grandTotal.toLocaleString()})
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: STORE INVENTORY REGISTER & MEDICINES MANAGEMENT  */}
      {/* ======================================================== */}
      {mainTab === 'store' && (
        <Card className="p-6 border border-slate-200/80 dark:border-slate-800 space-y-5 bg-white dark:bg-dark-900 shadow-sm rounded-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-500" /> Medicine & Injection Store Register ({medicines.length} Types)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Complete inventory list, stock level tracking, batch numbers, and price specifications.
              </p>
            </div>

            {/* Search Filter Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock medicines, batch..."
                value={storeSearchQuery}
                onChange={e => setStoreSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Medicines Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="px-5 py-3.5">Medicine Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Unit Dosage</th>
                  <th className="px-5 py-3.5">Unit Price (Rs.)</th>
                  <th className="px-5 py-3.5">Stock Available</th>
                  <th className="px-5 py-3.5">Batch / Expiry</th>
                  {isSysAdmin && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredStoreMeds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-450 text-xs">
                      No medicines found in store inventory.
                    </td>
                  </tr>
                ) : (
                  filteredStoreMeds.map((m: any) => {
                    const isLow = m.stockLevel <= (m.lowStockThreshold || 20);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-300">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          <span className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-brand-500" />
                            {m.name}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Badge type="info" className="capitalize text-[10px]">
                            {m.category || 'Tablet'}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 font-mono">
                          {m.unit || '500 mg'}
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          Rs. {Number(m.price || 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`font-extrabold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {m.stockLevel} units
                            </span>
                            {isLow && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[10px] text-slate-500 font-mono">
                          <div>Batch: {m.batchNumber || 'N/A'}</div>
                          <div>Exp: {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : 'N/A'}</div>
                        </td>

                        {isSysAdmin && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-dark-950 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 flex items-center gap-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMedicine(m.id, m.name)}
                                className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: ADD NEW MEDICINE TO STORE */}
      <Modal isOpen={isAddMedOpen} onClose={() => setIsAddMedOpen(false)} title="Add New Stock Medicine / Injection">
        <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
          <Input label="Medicine / Injection Name *" required value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Paracetamol 500mg or Inj Ceftriaxone" />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              <select value={medType} onChange={e => setMedType(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-xs font-bold dark:bg-dark-900">
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection (Tekka)</option>
                <option value="Ointment">Ointment / Cream</option>
                <option value="Drops">Eye/Ear Drops</option>
              </select>
            </div>
            <Input label="Unit Dosage (mg/ml)" value={medDosageMg} onChange={e => setMedDosageMg(e.target.value)} placeholder="e.g. 500 mg" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Initial Stock Quantity *" type="number" min="1" required value={medStock} onChange={e => setMedStock(Number(e.target.value))} />
            <Input label="Unit Price (Rs.) *" type="number" min="0" required value={medPrice} onChange={e => setMedPrice(Number(e.target.value))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Batch Number" value={medBatch} onChange={e => setMedBatch(e.target.value)} placeholder="e.g. BCH-9941" />
            <Input label="Expiry Date" type="date" value={medExpiry} onChange={e => setMedExpiry(e.target.value)} />
          </div>

          <Button type="submit" className="w-full py-2.5 text-xs font-bold">
            Add Stock Item to Inventory
          </Button>
        </form>
      </Modal>

      {/* MODAL: EDIT MEDICINE IN STORE */}
      <Modal isOpen={isEditMedOpen} onClose={() => setIsEditMedOpen(false)} title={`Edit Medicine: ${selectedMed?.name}`}>
        <form onSubmit={handleEditMedicineSubmit} className="space-y-4">
          <Input label="Medicine / Injection Name *" required value={editName} onChange={e => setEditName(e.target.value)} />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              <select value={editType} onChange={e => setEditType(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-xs font-bold dark:bg-dark-900">
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection (Tekka)</option>
                <option value="Ointment">Ointment / Cream</option>
                <option value="Drops">Eye/Ear Drops</option>
              </select>
            </div>
            <Input label="Unit Dosage (mg/ml)" value={editDosageMg} onChange={e => setEditDosageMg(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock Quantity *" type="number" min="0" required value={editStock} onChange={e => setEditStock(Number(e.target.value))} />
            <Input label="Unit Price (Rs.) *" type="number" min="0" required value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Batch Number" value={editBatch} onChange={e => setEditBatch(e.target.value)} />
            <Input label="Expiry Date" type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} />
          </div>

          <Button type="submit" className="w-full py-2.5 text-xs font-bold">
            Save Updated Inventory Specs
          </Button>
        </form>
      </Modal>
    </div>
  );
};
