import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import {
  Receipt,
  Plus,
  CreditCard,
  Eye,
  ShieldCheck,
  Printer,
  Trash,
  DollarSign,
  Activity,
  Clock,
  PlusCircle,
  BriefcaseMedical,
  Users,
  Check,
  Send,
  CalendarCheck,
  Stethoscope,
  Bed,
  Sparkles
} from 'lucide-react';

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default tab: OPD Patient
  const [activeTab, setActiveTab] = useState<'opd_patient' | 'admit_patient' | 'diagnostics' | 'petty_cash' | 'payroll'>('opd_patient');

  // Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Admit Patient Deposit Settlement Modal
  const [isAdmissionPayOpen, setIsAdmissionPayOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [ipdDepositAmount, setIpdDepositAmount] = useState('');

  // Invoice creation form state
  const [patientId, setPatientId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [invoiceLines, setInvoiceLines] = useState<Array<{ itemName: string; itemCategory: string; unitPrice: number; quantity: number }>>([
    { itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }
  ]);

  // Payment form state
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [insuranceClaimed, setInsuranceClaimed] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNum, setInsurancePolicyNum] = useState('');

  // OPD QUICK BILLING STATE
  const [opdPatientId, setOpdPatientId] = useState('');
  const [opdSlot, setOpdSlot] = useState(100);
  const [opdProcedureDetails, setOpdProcedureDetails] = useState('General Consultation OPD');

  // DIAGNOSTICS & LABS STATE
  const [labTests, setLabTests] = useState<any[]>([]);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [isNewTestOpen, setIsNewTestOpen] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestCategory, setNewTestCategory] = useState('General');
  const [newTestRate, setNewTestRate] = useState('500');
  const [newTestOutsourced, setNewTestOutsourced] = useState(false);

  // PETTY CASH STATE
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Hospitality');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // PAYROLL STATE
  const [payrollLogs, setPayrollLogs] = useState<any[]>([]);
  const [payrollMonth, setPayrollMonth] = useState('2026-07');
  const [payrollForecastData, setPayrollForecastData] = useState<any>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = '';
      if (user?.role === 'patient' && user.profileId) {
        query = `?patientId=${user.profileId}`;
      }
      const data = await apiClient.get(`/invoices${query}`);
      setInvoices(data || []);

      const admissionsData = await apiClient.get('/medical/admissions');
      setAdmissions(admissionsData || []);

      if (user?.role !== 'patient') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList || []);
      }
    } catch (err) {
      console.error('Error fetching billing registry', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabDiagnostics = async () => {
    try {
      const tests = await apiClient.get('/lab/tests');
      setLabTests(tests || []);
      const requests = await apiClient.get('/lab/requests');
      setLabRequests(requests || []);
    } catch (err) {
      console.error('Error fetching lab/diagnostics billing data', err);
    }
  };

  const fetchPettyCash = async () => {
    try {
      const exps = await apiClient.get('/expenses');
      setExpenses(exps || []);
    } catch (err) {
      console.error('Error fetching petty cash ledger', err);
    }
  };

  const fetchPayroll = async () => {
    try {
      const logs = await apiClient.get(`/payroll?month=${payrollMonth}`);
      setPayrollLogs(logs || []);
    } catch (err) {
      console.error('Error fetching payroll', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (user?.role === 'admin' || user?.role === 'accountant') {
      fetchLabDiagnostics();
      fetchPettyCash();
      fetchPayroll();
    }
  }, []);

  const handleAddLine = () => {
    setInvoiceLines([...invoiceLines, { itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (invoiceLines.length === 1) return;
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...invoiceLines];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceLines(updated);
  };

  const calculateSubtotal = () => {
    return invoiceLines.reduce((acc, line) => acc + Number(line.unitPrice || 0) * Number(line.quantity || 1), 0);
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - Number(discount || 0));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      alert('Please select a patient file.');
      return;
    }

    try {
      await apiClient.post('/invoices', {
        patientId: Number(patientId),
        discount: Number(discount),
        items: invoiceLines.map(line => ({
          ...line,
          unitPrice: Number(line.unitPrice),
          quantity: Number(line.quantity)
        }))
      });

      setIsCreateOpen(false);
      setPatientId('');
      setDiscount(0);
      setInvoiceLines([{ itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }]);
      fetchInvoices();
    } catch (err: any) {
      alert(`Invoice compilation failed: ${err.message}`);
    }
  };

  const handleOpdQuickBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opdPatientId) {
      alert('Please select a patient.');
      return;
    }

    try {
      await apiClient.post('/invoices', {
        patientId: opdPatientId,
        discount: 0,
        items: [
          {
            itemName: `${opdProcedureDetails} (Slot: Rs. ${opdSlot})`,
            itemCategory: 'Consultation',
            unitPrice: opdSlot,
            quantity: 1
          }
        ]
      });

      alert(`OPD Consulting bill of Rs. ${opdSlot} created successfully.`);
      setOpdPatientId('');
      fetchInvoices();
    } catch (err) {
      alert('Failed to generate quick OPD invoice.');
    }
  };

  const handleAdmissionPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !ipdDepositAmount) return;
    try {
      const depositNum = Number(ipdDepositAmount);
      const newAdvance = Number(selectedAdmission.advancePaid || 0) + depositNum;

      await apiClient.put(`/medical/admissions/${selectedAdmission.id}/notes`, {
        advancePaid: newAdvance
      });

      await apiClient.post('/invoices', {
        patientId: selectedAdmission.patientId,
        discount: 0,
        items: [
          {
            itemName: `IPD Admission Deposit Clearance (Bed: ${selectedAdmission.bed?.bedNumber || 'Inpatient'})`,
            itemCategory: 'Room Charge',
            unitPrice: depositNum,
            quantity: 1
          }
        ]
      });

      alert(`Rs. ${depositNum.toLocaleString()} IPD Deposit recorded successfully!`);
      setIsAdmissionPayOpen(false);
      setIpdDepositAmount('');
      fetchInvoices();
    } catch (err: any) {
      alert(`Error updating IPD deposit: ${err.message}`);
    }
  };

  const handlePayClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    const balance = Number(invoice.grandTotal) - Number(invoice.paidAmount);
    setPayAmount(balance);
    setPayMethod(user?.role === 'patient' ? 'online' : 'cash');
    setInsuranceClaimed(invoice.insuranceClaimed || false);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/invoices/${selectedInvoice.id}/pay`, {
        amount: payAmount,
        paymentMethod: payMethod,
        insuranceClaimed,
        insuranceProvider: insuranceClaimed ? insuranceProvider : undefined,
        policyNumber: insuranceClaimed ? insurancePolicyNum : undefined,
      });
      setIsPayOpen(false);
      fetchInvoices();
      alert('Payment settled and recorded.');
    } catch (err) {
      alert('Failed to register bill payment.');
    }
  };

  const handleViewInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-500" /> Billing & Accounting Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive billing management for OPD Consultations and Inpatient (IPD) Admissions.
          </p>
        </div>
        
        {user?.role !== 'patient' && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Create Custom Invoice
          </Button>
        )}
      </div>

      {/* TWO PRIMARY OPTIONS NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        {/* OPTION 1: OPD PATIENT */}
        <button
          onClick={() => setActiveTab('opd_patient')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 rounded-t-lg ${
            activeTab === 'opd_patient'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="h-4 w-4" /> OPD Patient Billing
        </button>

        {/* OPTION 2: ADMIT PATIENT */}
        <button
          onClick={() => setActiveTab('admit_patient')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 rounded-t-lg ${
            activeTab === 'admit_patient'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bed className="h-4 w-4" /> Admit Patient (IPD) Billing
        </button>

        {(user?.role === 'admin' || user?.role === 'accountant') && (
          <>
            <button
              onClick={() => setActiveTab('petty_cash')}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'petty_cash' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500'
              }`}
            >
              Petty Cash Ledger
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'payroll' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500'
              }`}
            >
              Staff Payroll
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* OPTION 1: OPD PATIENT BILLING DESK */}
          {/* ========================================================================= */}
          {activeTab === 'opd_patient' && (
            <div className="space-y-6">
              {/* Quick OPD Consultation Bill Generator Box */}
              <Card className="border border-brand-500/30 bg-gradient-to-r from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950 p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="h-9 w-9 bg-brand-500/10 text-brand-500 rounded-lg flex items-center justify-center font-bold">
                    <Stethoscope className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Quick OPD Consultation Receipt</h3>
                    <p className="text-[11px] text-slate-500">Issue instant OPD consultation receipts and fee checkouts.</p>
                  </div>
                </div>

                <form onSubmit={handleOpdQuickBillSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Select Patient File</label>
                    <select
                      required
                      value={opdPatientId}
                      onChange={e => setOpdPatientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.mrNumber || p.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Fee Slot (Rs.)</label>
                    <select
                      value={opdSlot}
                      onChange={e => setOpdSlot(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none"
                    >
                      <option value={100}>Rs. 100 (Standard)</option>
                      <option value={200}>Rs. 200 (Consulting)</option>
                      <option value={400}>Rs. 400 (Senior Specialist)</option>
                      <option value={500}>Rs. 500 (Executive OPD)</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full flex items-center justify-center gap-1.5 text-xs">
                    <Receipt className="h-4 w-4" /> Issue OPD Receipt
                  </Button>
                </form>
              </Card>

              {/* OPD Invoices List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    OPD Consultation Invoices Ledger ({invoices.length} Records)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoices.length === 0 ? (
                    <Card className="col-span-2 flex flex-col items-center justify-center p-12 text-center">
                      <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No OPD invoices generated yet.</p>
                    </Card>
                  ) : (
                    invoices.map(inv => {
                      const balance = Number(inv.grandTotal) - Number(inv.paidAmount);
                      return (
                        <Card key={inv.id} className="flex flex-col justify-between gap-4 border border-slate-200 dark:border-slate-850">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-mono bg-slate-100 dark:bg-dark-950 font-bold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                INVOICE ID: #{inv.id}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">Patient: {inv.patient?.name}</h4>
                              {inv.patient?.mrNumber && <p className="text-[10px] text-slate-500 mt-0.5 font-mono">MRN: {inv.patient?.mrNumber}</p>}
                              <p className="text-[10px] text-slate-450 mt-1 font-medium">Date: {new Date(inv.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge type={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'error'}>
                              {inv.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center bg-slate-100/50 dark:bg-dark-950/20 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-850">
                            <div>
                              <span className="text-[9px] text-slate-450 block uppercase font-bold">Total Bill</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-250">Rs. {Number(inv.grandTotal).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-450 block uppercase font-bold">Paid</span>
                              <span className="text-xs font-bold text-emerald-600">Rs. {Number(inv.paidAmount).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-450 block uppercase font-bold">Balance</span>
                              <span className="text-xs font-bold text-rose-500">Rs. {balance.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-850 pt-3">
                            <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                              {inv.insuranceClaimed ? (
                                <span className="text-emerald-600 flex items-center gap-0.5"><ShieldCheck className="h-3.5 w-3.5" /> Insurance Claimed</span>
                              ) : (
                                <span>No Insurance applied</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleViewInvoiceDetails(inv)} variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" /> Details
                              </Button>
                              {inv.status !== 'paid' && user?.role !== 'patient' && (
                                <Button onClick={() => handlePayClick(inv)} variant="primary" size="sm" className="flex items-center gap-1">
                                  <CreditCard className="h-3.5 w-3.5" /> Log Payment
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 2: ADMIT PATIENT (IPD) BILLING DESK */}
          {/* ========================================================================= */}
          {activeTab === 'admit_patient' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Bed className="h-4 w-4 text-brand-500" /> Currently Admitted Inpatient (IPD) Billing Registry
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Track admitted patient room charges, baseline cost, advance deposit payments, and discharge settlement.
                  </p>
                </div>
                <Badge type="info">{admissions.length} Active Admissions</Badge>
              </div>

              {admissions.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-sm font-semibold text-slate-500">No patients currently admitted in IPD wards.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {admissions.map(adm => {
                    const baseline = Number(adm.baselineCost || 0);
                    const advance = Number(adm.advancePaid || 0);
                    const disc = Number(adm.discount || 0);
                    const netDue = Math.max(0, baseline - advance - disc);

                    return (
                      <Card key={adm.id} className="p-5 border border-slate-200 dark:border-slate-800 space-y-4 relative overflow-hidden">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-450 block font-bold">
                              ADMISSION FILE #{adm.id}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                              {adm.patient?.name}
                            </h4>
                            <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400 font-bold block">
                              MRN: {adm.patient?.mrNumber || 'MR-N/A'} • {adm.patient?.phone}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            adm.admissionCategory === 'surgical'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                          }`}>
                            {adm.admissionCategory || 'Medical'}
                          </span>
                        </div>

                        {/* Bed & Ward Allotment Info */}
                        <div className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-150 dark:border-slate-850 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-slate-450 uppercase block">Bed & Ward Alloted</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              Bed #{adm.bed?.bedNumber || 'N/A'} ({adm.bed?.ward || 'General Ward'})
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-450 uppercase block">Attending Doctor</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                              {adm.doctor?.user?.name || 'Inpatient Team'}
                            </span>
                          </div>
                        </div>

                        {/* Financial Ledger */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-100/50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                          <div>
                            <span className="text-[9px] text-slate-450 block font-extrabold uppercase">Baseline Cost</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">Rs. {baseline.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-extrabold uppercase">Advance Paid</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Rs. {advance.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-rose-500 block font-extrabold uppercase">Net Due</span>
                            <span className="text-xs font-black text-rose-500">Rs. {netDue.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                          <button
                            onClick={() => {
                              setSelectedAdmission(adm);
                              setIpdDepositAmount('');
                              setIsAdmissionPayOpen(true);
                            }}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Clear IPD Deposit / Pay
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* OTHER ADMINISTRATIVE TABS */}
          {/* ========================================================================= */}
          {activeTab === 'petty_cash' && (
            <Card className="p-5 border border-slate-200 dark:border-slate-850">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Petty Cash Daily Outflow Ledger</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Log daily hospital operational expenses (hospitality, minor maintenance, transport)</p>
                </div>
                <Button onClick={() => setIsNewExpenseOpen(true)} size="sm" className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Log New Expense
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase text-[10px]">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="py-2.5 font-mono">{e.expenseDate}</td>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{e.category}</td>
                        <td className="py-2.5">{e.description}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">Rs. {Number(e.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'payroll' && (
            <Card className="p-5 border border-slate-200 dark:border-slate-850 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Hospital Staff Payroll Management</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Clear monthly staff salary disbursements and payroll records.</p>
                </div>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={e => {
                    setPayrollMonth(e.target.value);
                    fetchPayroll();
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase text-[10px]">
                      <th className="py-2.5">Staff Member</th>
                      <th className="py-2.5">Role</th>
                      <th className="py-2.5">Base Salary</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {payrollLogs.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{p.user?.name}</td>
                        <td className="py-2.5 capitalize">{p.user?.role}</td>
                        <td className="py-2.5 font-mono">Rs. {Number(p.baseSalary || 50000).toLocaleString()}</td>
                        <td className="py-2.5">
                          <Badge type={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ADMISSION IPD DEPOSIT / CLEARANCE MODAL */}
      <Modal isOpen={isAdmissionPayOpen} onClose={() => setIsAdmissionPayOpen(false)} title="IPD Admission Deposit & Payment Clearance">
        {selectedAdmission && (
          <form onSubmit={handleAdmissionPaySubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-dark-900 rounded-lg text-xs space-y-1">
              <span className="font-bold block text-slate-900 dark:text-white">Patient: {selectedAdmission.patient?.name}</span>
              <span className="text-slate-500 block font-mono">Bed #{selectedAdmission.bed?.bedNumber} ({selectedAdmission.bed?.ward})</span>
              <div className="pt-2 flex justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>Already Paid: Rs. {Number(selectedAdmission.advancePaid || 0).toLocaleString()}</span>
                <span>Baseline: Rs. {Number(selectedAdmission.baselineCost || 0).toLocaleString()}</span>
              </div>
            </div>

            <Input
              label="Enter Deposit Payment Amount (Rs.)"
              type="number"
              required
              min={1}
              value={ipdDepositAmount}
              onChange={e => setIpdDepositAmount(e.target.value)}
              placeholder="e.g. 5000"
            />

            <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" /> Record IPD Deposit Payment
            </Button>
          </form>
        )}
      </Modal>

      {/* MODAL: PAYMENT LOG */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Register Payment Settlement">
        {selectedInvoice && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="p-3 bg-slate-100 dark:bg-dark-900 rounded-lg text-xs">
              <span className="font-bold">Invoice #{selectedInvoice.id}</span>
              <span className="block text-slate-500 mt-0.5">Grand Total: Rs. {Number(selectedInvoice.grandTotal).toLocaleString()}</span>
            </div>

            <Input
              label="Payment Amount (Rs.)"
              type="number"
              required
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
              >
                <option value="cash">Cash Settlement</option>
                <option value="card">Credit / Debit Card</option>
                <option value="online">Online Banking / UPI</option>
              </select>
            </div>

            <Button type="submit" className="w-full">
              Submit Settlement
            </Button>
          </form>
        )}
      </Modal>

      {/* INVOICE DETAILS DRAWER */}
      <Drawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Invoice Details">
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-dark-900 rounded-xl space-y-2">
              <div className="flex justify-between font-bold">
                <span>Invoice #{selectedInvoice.id}</span>
                <Badge type={selectedInvoice.status === 'paid' ? 'success' : 'warning'}>{selectedInvoice.status}</Badge>
              </div>
              <p className="text-slate-500 font-semibold">Patient: {selectedInvoice.patient?.name}</p>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h4 className="font-bold mb-2">Itemized Charges</h4>
              {selectedInvoice.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-850">
                  <span>{item.itemName}</span>
                  <span className="font-bold">Rs. {Number(item.unitPrice).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
