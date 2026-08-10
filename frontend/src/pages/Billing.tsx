import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Receipt, Plus, CreditCard, Eye, ShieldCheck, Printer, Trash,
  DollarSign, Activity, Clock, Stethoscope, Bed, Sparkles, Check,
  Search, Pill, Beaker, FileText, UserCheck, HeartPulse, CheckCircle2,
  AlertCircle, ChevronRight, Filter, TrendingUp, Wallet
} from 'lucide-react';

const escapeHtml = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Primary Tab: 'opd_patient' | 'admit_patient' | 'petty_cash' | 'payroll'
  const [activeTab, setActiveTab] = useState<'opd_patient' | 'admit_patient' | 'petty_cash' | 'payroll'>('opd_patient');

  // Selected Patient for Comprehensive Statement Calculation
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [mrSearch, setMrSearch] = useState('');
  const [receptionistDiscount, setReceptionistDiscount] = useState<number | ''>('');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Printable Bill Receipt Modal
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false);

  // Standard Invoices & Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Admit Patient Deposit Settlement Modal
  const [isAdmissionPayOpen, setIsAdmissionPayOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [ipdDepositAmount, setIpdDepositAmount] = useState('');

  // Custom Invoice Creation State
  const [customPatientId, setCustomPatientId] = useState('');
  const [customDiscount, setCustomDiscount] = useState(0);
  const [invoiceLines, setInvoiceLines] = useState<Array<{ itemName: string; itemCategory: string; unitPrice: number; quantity: number }>>([
    { itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }
  ]);

  // Payment Form State
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');

  // Petty Cash State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Hospitality');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Payroll State
  const [payrollLogs, setPayrollLogs] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invoicesData, admissionsData, patientsData, labReqsData, labTestsData, expData, tokensData] = await Promise.all([
        apiClient.get('/invoices').catch(() => []),
        apiClient.get('/admissions').catch(() => []),
        apiClient.get('/patients').catch(() => []),
        apiClient.get('/lab/requests').catch(() => []),
        apiClient.get('/lab/tests').catch(() => []),
        apiClient.get('/expenses').catch(() => []),
        apiClient.get('/tokens').catch(() => [])
      ]);

      const pArr = Array.isArray(patientsData) ? patientsData : (patientsData?.patients || []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setAdmissions(Array.isArray(admissionsData) ? admissionsData : []);
      setPatients(pArr);
      setLabRequests(Array.isArray(labReqsData) ? labReqsData : []);
      setLabCatalog(Array.isArray(labTestsData) ? labTestsData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setTokens(Array.isArray(tokensData) ? tokensData : []);

      if (pArr.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pArr[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching billing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  // Filter Patients by Tab (Strict Today Filter for OPD Patients)
  const admittedPatientIds = new Set(
    admissions
      .filter((adm: any) => adm && adm.status === 'admitted')
      .map((adm: any) => Number(adm.patientId))
  );

  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayTokenPatientIds = new Set(tokens.map((t: any) => Number(t.patientId)));

  const opdPatientsList = patients.filter(p => {
    if (admittedPatientIds.has(Number(p.id))) return false;
    const pDateStr = p.createdAt ? p.createdAt.split('T')[0] : '';
    const isTodayCreated = pDateStr === localTodayStr;
    const hasTodayToken = todayTokenPatientIds.has(Number(p.id));
    return isTodayCreated || hasTodayToken;
  });

  const admitPatientsList = patients.filter(p => admittedPatientIds.has(Number(p.id)));
  const currentTabPatients = activeTab === 'opd_patient'
    ? opdPatientsList
    : admitPatientsList;

  // Real-time MR Number & Patient Search Filter
  const filteredTabPatients = currentTabPatients.filter(p => {
    if (!mrSearch.trim()) return true;
    const q = mrSearch.trim().toLowerCase();
    const mr = (p.mrNumber || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return mr.includes(q) || name.includes(q) || phone.includes(q);
  });

  const handleMrSearchChange = (val: string) => {
    setMrSearch(val);
    const q = val.trim().toLowerCase();
    if (!q) return;

    const exactMatch = currentTabPatients.find(p => {
      const mr = (p.mrNumber || '').toLowerCase();
      const seqOnly = mr.replace(/[^0-9]/g, '');
      return mr === q || (seqOnly.length > 0 && seqOnly.endsWith(q));
    });

    if (exactMatch) {
      setSelectedPatientId(String(exactMatch.id));
      return;
    }

    const matches = currentTabPatients.filter(p => {
      const mr = (p.mrNumber || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return mr.includes(q) || name.includes(q);
    });

    if (matches.length === 1) {
      setSelectedPatientId(String(matches[0].id));
    }
  };

  const selectedPatientObj = patients.find(p => String(p.id) === String(selectedPatientId));
  const selectedPatientAdmission = admissions.find(adm => String(adm.patientId) === String(selectedPatientId) && adm.status === 'admitted');

  // Compute Comprehensive Billing Breakdown
  const patientInvoices = invoices.filter(inv => String(inv.patientId) === String(selectedPatientId));
  const patientLabRequests = labRequests.filter(req => String(req.patientId) === String(selectedPatientId));

  const computedItems: Array<{ title: string; category: string; amount: number; qty: number; detail?: string }> = [];

  if (selectedPatientObj) {
    // 1. Doctor Consultation Fee
    const consultFee = 1500;
    computedItems.push({
      title: 'Doctor OPD Consultation & Registration Fee',
      category: 'Consultation Fee',
      amount: consultFee,
      qty: 1,
      detail: `Standard Consultation (Dr. Talha Clinic)`
    });

    // 2. Pharmacy Medicines & Prescriptions
    patientInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach((item: any) => {
          computedItems.push({
            title: item.itemName || item.description || 'Prescription Medicine',
            category: 'Pharmacy Medicine',
            amount: Number(item.totalPrice || item.unitPrice || 0) * Number(item.quantity || 1),
            qty: Number(item.quantity || 1),
            detail: `Pharmacy Bill #${inv.id} (${new Date(inv.createdAt).toLocaleDateString()})`
          });
        });
      } else {
        const amt = Number(inv.grandTotal || inv.totalAmount || 0);
        if (amt > 0) {
          computedItems.push({
            title: `Pharmacy Medicine & Prescription Charges`,
            category: 'Pharmacy',
            amount: amt,
            qty: 1,
            detail: `Invoice #${inv.id} (${new Date(inv.createdAt).toLocaleDateString()})`
          });
        }
      }
    });

    // 3. Laboratory Tests
    patientLabRequests.forEach(req => {
      const matchCatalog = labCatalog.find(t => t.name.toLowerCase() === req.testName.toLowerCase());
      const testRate = matchCatalog ? Number(matchCatalog.rate || 0) : 500;
      computedItems.push({
        title: `Laboratory Test: ${req.testName}`,
        category: 'Diagnostic Lab',
        amount: testRate,
        qty: 1,
        detail: `Ordered by Dr. ${req.doctor?.user?.name || 'Physician'}`
      });
    });

    // 4. IPD Admission / Bed Stay Charge
    if (selectedPatientAdmission) {
      const bedRate = Number(selectedPatientAdmission.bed?.rate || 1500);
      const days = Math.max(1, Math.ceil((Date.now() - new Date(selectedPatientAdmission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)));
      computedItems.push({
        title: `Inpatient Bed Stay (${selectedPatientAdmission.bed?.bedNumber || 'IPD Ward'} - ${days} Days)`,
        category: 'Ward Bed Charge',
        amount: bedRate * days,
        qty: days,
        detail: `Admitted on ${new Date(selectedPatientAdmission.admissionDate).toLocaleDateString()}`
      });
    }
  }

  // Subtotal & Net Total Math
  const grossSubtotal = Math.round(computedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100;
  const rawDisc = Number(receptionistDiscount);
  const discountVal = Math.max(0, isNaN(rawDisc) ? 0 : rawDisc);
  const netPayableTotal = Math.round(Math.max(0, grossSubtotal - discountVal) * 100) / 100;
  const totalPaidSoFar = Math.round((patientInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0) + (selectedPatientAdmission ? Number(selectedPatientAdmission.advancePaid || 0) : 0)) * 100) / 100;
  const netDueBalance = Math.round(Math.max(0, netPayableTotal - totalPaidSoFar) * 100) / 100;

  // Revenue KPI Stats
  const totalRevenueCollected = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
  const totalOutstandingUnpaid = invoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.grandTotal || inv.totalAmount || 0) - Number(inv.paidAmount || 0)), 0);

  const handlePrintProfessionalBill = () => {
    if (!selectedPatientObj) return;

    const printWindow = window.open('', '_blank', 'width=780,height=900');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for LifeFlow EMR to print billing receipts automatically.');
      return;
    }

    const itemsRows = computedItems.map((item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a; font-size: 12px; display: block;">${escapeHtml(item.title)}</strong>
          ${item.detail ? `<span style="font-size: 10px; color: #64748b; margin-top: 2px; display: block;">${escapeHtml(item.detail)}</span>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px; font-weight: 600; color: #475569;">${escapeHtml(item.category)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px; font-weight: 600;">${escapeHtml(item.qty)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; font-size: 12px; color: #0f172a;">Rs. ${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Invoice - ${selectedPatientObj.mrNumber || 'MRN'}</title>
        <style>
          @page { size: auto; margin: 12mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 24px; max-width: 760px; margin: 0 auto; background: #ffffff; }
          .header-table { width: 100%; border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .hospital-name { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
          .hospital-sub { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; line-height: 1.4; }
          .bill-title { text-align: right; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .patient-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 20px; }
          .info-col { font-size: 11px; line-height: 1.8; flex: 1; }
          .info-label { font-weight: 700; color: #475569; width: 115px; display: inline-block; }
          .table-invoice { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .table-invoice th { background: #f1f5f9; color: #334155; font-size: 10px; text-transform: uppercase; font-weight: 800; padding: 10px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; letter-spacing: 0.5px; }
          .summary-box { width: 300px; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #fafafa; font-size: 11px; margin-left: auto; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; color: #334155; }
          .summary-row.total { border-top: 2px solid #0284c7; font-weight: 900; font-size: 14px; color: #0284c7; padding-top: 8px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="hospital-name">DR. TALHA CLINIC</div>
              <div class="hospital-sub">Modern Hospital & Clinical Management EMR Suite</div>
            </td>
            <td style="text-align: right;">
              <div class="bill-title">OFFICIAL RECEIPT</div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">Date: ${new Date().toLocaleDateString()}</div>
            </td>
          </tr>
        </table>

        <div class="patient-box">
          <div class="info-col">
            <div><span class="info-label">Patient Name:</span> <strong>${escapeHtml(selectedPatientObj.name)}</strong></div>
            <div><span class="info-label">MR Number:</span> <strong>${escapeHtml(selectedPatientObj.mrNumber || 'N/A')}</strong></div>
          </div>
          <div class="info-col">
            <div><span class="info-label">Phone:</span> <strong>${escapeHtml(selectedPatientObj.phone || 'N/A')}</strong></div>
            <div><span class="info-label">Billing Type:</span> <strong>${activeTab === 'opd_patient' ? 'OPD Consultation' : 'IPD Bed Stay'}</strong></div>
          </div>
        </div>

        <table class="table-invoice">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Category</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row"><span>Gross Subtotal:</span> <strong>Rs. ${grossSubtotal.toLocaleString()}</strong></div>
          ${discountVal > 0 ? `<div class="summary-row" style="color: #e11d48;"><span>Discount:</span> <strong>- Rs. ${discountVal.toLocaleString()}</strong></div>` : ''}
          <div class="summary-row total"><span>Net Payable:</span> <span>Rs. ${netPayableTotal.toLocaleString()}</span></div>
          <div class="summary-row"><span>Paid So Far:</span> <strong>Rs. ${totalPaidSoFar.toLocaleString()}</strong></div>
          <div class="summary-row" style="font-weight: 800; color: ${netDueBalance > 0 ? '#e11d48' : '#16a34a'};">
            <span>Net Balance Due:</span> <span>Rs. ${netDueBalance.toLocaleString()}</span>
          </div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Create Custom Invoice submit
  const handleCreateCustomInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPatientId) {
      alert('Please select a patient.');
      return;
    }
    const validLines = invoiceLines.filter(l => l.itemName.trim() !== '' && l.unitPrice > 0);
    if (validLines.length === 0) {
      alert('Please add at least one valid invoice item.');
      return;
    }

    try {
      await apiClient.post('/invoices', {
        patientId: Number(customPatientId),
        discount: Number(customDiscount),
        items: validLines.map(l => ({
          description: l.itemName,
          category: l.itemCategory,
          unitPrice: Number(l.unitPrice),
          quantity: Number(l.quantity)
        }))
      });

      setIsCreateOpen(false);
      fetchBillingData();
      alert('Custom Billing Invoice Created Successfully!');
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message}`);
    }
  };

  // Payment Settlement submit
  const handlePayClick = (inv: any) => {
    setSelectedInvoice(inv);
    const balance = Math.max(0, Number(inv.grandTotal || inv.totalAmount || 0) - Number(inv.paidAmount || 0));
    setPayAmount(balance);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await apiClient.post(`/invoices/${selectedInvoice.id}/payment`, {
        amount: Number(payAmount),
        paymentMethod: payMethod
      });

      setIsPayOpen(false);
      fetchBillingData();
      alert(`Payment of Rs. ${payAmount} recorded successfully!`);
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (invoiceFilter === 'paid') return inv.status === 'paid' || Number(inv.paidAmount || 0) >= Number(inv.grandTotal || inv.totalAmount || 0);
    if (invoiceFilter === 'unpaid') return inv.status !== 'paid' && Number(inv.paidAmount || 0) < Number(inv.grandTotal || inv.totalAmount || 0);
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* EXECUTIVE FINANCIAL HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-6 shadow-xl border border-brand-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-2xs font-extrabold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-brand-400" /> Hospital Billing & Financial Operations Center
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Receipt className="h-7 w-7 text-brand-400" /> Billing & Accounting Center
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Complete billing breakdown of Initial Fee, Pharmacy Medicines, Lab Tests, and IPD Bed Stay.
            </p>
          </div>

          {/* Quick Financial KPI Cards Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Today Cash</span>
              <span className="text-lg font-black font-mono text-emerald-400">Rs. {totalRevenueCollected.toLocaleString()}</span>
            </div>

            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Total Invoices</span>
              <span className="text-lg font-black font-mono text-white">{invoices.length} Ledger</span>
            </div>

            <div className="px-4 py-2.5 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] text-rose-200 font-bold uppercase tracking-wider block">Outstanding Due</span>
              <span className="text-lg font-black font-mono text-rose-300">Rs. {totalOutstandingUnpaid.toLocaleString()}</span>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/30 text-xs"
            >
              <Plus className="h-4 w-4" /> Create Custom Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* SEGMENTED TAB SWITCHER & PATIENT CATEGORY TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-dark-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-dark-950 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-850 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('opd_patient');
              setMrSearch('');
            }}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'opd_patient'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Stethoscope className="h-4 w-4" /> OPD Patient Billing ({opdPatientsList.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('admit_patient');
              setMrSearch('');
            }}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'admit_patient'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bed className="h-4 w-4" /> Admit Patient (IPD) Billing ({admitPatientsList.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PATIENT FINANCIAL STATEMENT CONSOLE & INVOICE LEDGER */}
      {/* ======================================================== */}
      <div className="space-y-6">
        
        {/* SECTION 1: SEARCH & COMPREHENSIVE FINANCIAL STATEMENT */}
        <Card className="p-6 border border-slate-200/80 dark:border-slate-800 space-y-6 bg-white dark:bg-dark-900 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand-500" />
                Select {activeTab === 'opd_patient' ? 'OPD' : 'Admitted IPD'} Patient for Complete Fee Statement
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Displays Initial Fee + Pharmacy Medicines + Lab Tests (Ultrasound/LFT/CBC) + Bed Stay.
              </p>
            </div>
            <Badge type="info" className="px-3 py-1 font-bold">
              {activeTab === 'opd_patient' ? 'OPD Billing Console' : 'IPD Admission Billing'}
            </Badge>
          </div>

          {/* Search Bar & Dropdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-6 space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Type / Search MR Number *
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-500" />
                <input
                  type="text"
                  placeholder="Type MR Number (e.g. MR-2026-0020 or 0020)..."
                  value={mrSearch}
                  onChange={e => handleMrSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div className="md:col-span-6 space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Registered Patient File *
              </label>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">-- Choose Patient to View Complete Fee Breakdown --</option>
                {filteredTabPatients.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} • (MRN: {p.mrNumber || 'N/A'}) • {p.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* COMPREHENSIVE FEE STATEMENT SUMMARY DISPLAY */}
          {selectedPatientObj ? (
            <div className="p-6 bg-slate-50/80 dark:bg-dark-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-850 space-y-6 animate-in fade-in duration-200">
              
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-500/30">
                    {selectedPatientObj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedPatientObj.name}</h3>
                      <span className="font-mono text-[10px] font-bold bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2.5 py-0.5 rounded-full">
                        {selectedPatientObj.mrNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Phone: {selectedPatientObj.phone} • Age: {selectedPatientObj.age || 'N/A'} • Gender: {selectedPatientObj.gender || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsPrintReceiptOpen(true)}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-md shadow-brand-500/20"
                  >
                    <Printer className="h-4 w-4" /> Print Complete Statement
                  </Button>
                </div>
              </div>

              {/* Itemized Fee Breakdown Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Itemized Fee & Service Charges Breakdown
                </h4>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase text-[10px] tracking-wider font-bold">
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                      {computedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/40">
                          <td className="px-4 py-3 font-bold text-slate-850 dark:text-slate-100">
                            {item.title}
                            {item.detail && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{item.detail}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge type="info" className="text-[10px] uppercase font-bold">
                              {item.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {item.qty}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                            Rs. {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                <div className="md:col-span-7 p-4 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Special Discount Adjustment (If Any)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter discount amount in Rs."
                      value={receptionistDiscount}
                      onChange={e => setReceptionistDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 font-bold"
                    />
                    {discountVal > 0 && (
                      <span className="text-xs font-extrabold text-rose-500 whitespace-nowrap">
                        - Rs. {discountVal.toLocaleString()} Applied
                      </span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-5 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-semibold">
                    <span>Gross Subtotal:</span>
                    <span>Rs. {grossSubtotal.toLocaleString()}</span>
                  </div>
                  {discountVal > 0 && (
                    <div className="flex justify-between items-center text-rose-500 font-bold">
                      <span>Discount:</span>
                      <span>- Rs. {discountVal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-semibold border-t border-brand-500/20 pt-1.5">
                    <span>Total Paid So Far:</span>
                    <span className="text-emerald-600 font-bold">Rs. {totalPaidSoFar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white pt-1">
                    <span>Net Balance Due:</span>
                    <span className={netDueBalance > 0 ? 'text-rose-600 dark:text-rose-400 text-base' : 'text-emerald-600 dark:text-emerald-400 text-base'}>
                      Rs. {netDueBalance.toLocaleString()} {netDueBalance <= 0 ? '(PAID IN FULL)' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-dark-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Please select a patient from the dropdown above to view their complete initial fee, pharmacy, and lab test statement.
            </div>
          )}
        </Card>

        {/* SECTION 2: ISSUED INVOICES LEDGER */}
        <Card className="p-6 border border-slate-200/80 dark:border-slate-800 space-y-5 bg-white dark:bg-dark-900 shadow-sm rounded-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand-500" /> Issued Invoices Ledger ({filteredInvoices.length} Records)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Complete billing ledger history and payment status tracking.
              </p>
            </div>

            {/* Invoice Filter Pills */}
            <div className="flex bg-slate-100 dark:bg-dark-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-850 text-xs font-extrabold">
              <button
                onClick={() => setInvoiceFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  invoiceFilter === 'all'
                    ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Invoices
              </button>
              <button
                onClick={() => setInvoiceFilter('paid')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  invoiceFilter === 'paid'
                    ? 'bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setInvoiceFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  invoiceFilter === 'unpaid'
                    ? 'bg-white dark:bg-dark-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unpaid / Partial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvoices.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                No invoices found in ledger history.
              </div>
            ) : (
              filteredInvoices.map((inv: any) => {
                const total = Number(inv.grandTotal || inv.totalAmount || 0);
                const paid = Number(inv.paidAmount || 0);
                const balance = Math.max(0, total - paid);
                const isPaidFull = balance === 0;

                return (
                  <Card key={inv.id} className="p-4 border border-slate-200/80 dark:border-slate-800 space-y-3 bg-slate-50/40 dark:bg-dark-950/40 hover:border-brand-500/30 transition-all rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                          INVOICE ID: #{inv.id}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">
                          Patient: {inv.patient?.name || `ID #${inv.patientId}`}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">MRN: {inv.patient?.mrNumber || 'N/A'}</p>
                      </div>

                      <Badge type={isPaidFull ? 'success' : 'danger'} className="text-[10px] font-bold uppercase">
                        {isPaidFull ? 'PAID' : 'UNPAID'}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-dark-900 rounded-lg border border-slate-200/60 dark:border-slate-850 font-mono text-xs space-y-1">
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Invoice Date:</span>
                        <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Grand Total:</span>
                        <span>Rs. {total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-semibold text-[11px]">
                        <span>Amount Paid:</span>
                        <span>Rs. {paid.toLocaleString()}</span>
                      </div>
                      {balance > 0 && (
                        <div className="flex justify-between text-rose-500 font-bold text-[11px] border-t border-slate-100 dark:border-slate-850 pt-1">
                          <span>Balance Due:</span>
                          <span>Rs. {balance.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {balance > 0 && (
                        <Button onClick={() => handlePayClick(inv)} size="sm" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-xs flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" /> Settle Payment
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* PRINTABLE COMPLETE BILL RECEIPT MODAL */}
      <Modal isOpen={isPrintReceiptOpen} onClose={() => setIsPrintReceiptOpen(false)} title="Print Complete Patient Bill / Receipt">
        {selectedPatientObj && (
          <div className="space-y-4 p-2 bg-white dark:bg-dark-950 text-slate-900 dark:text-white" id="printable-receipt-area">
            <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex justify-center items-center gap-2 mb-1">
                <HeartPulse className="h-6 w-6 text-brand-500" />
                <h2 className="text-base font-extrabold tracking-tight">Dr. Talha Clinic</h2>
              </div>
              <p className="text-[10px] text-slate-500">Enterprise Hospital EMR & Diagnostic Billing Center</p>
              <p className="text-[9px] text-slate-400 font-mono">Date: {new Date().toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Patient Name:</span>
                <span className="font-bold">{selectedPatientObj.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">MR Number:</span>
                <span className="font-mono font-bold">{selectedPatientObj.mrNumber || 'MR-N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Phone:</span>
                <span className="font-mono">{selectedPatientObj.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Billing Type:</span>
                <span className="font-bold">{activeTab === 'opd_patient' ? 'OPD Patient' : 'IPD Admitted Patient'}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-dark-900 text-[10px] font-bold uppercase">
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-[11px]">
                  {computedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2">
                        <span className="font-bold">{item.title}</span>
                        {item.detail && <span className="block text-[9px] text-slate-400">{item.detail}</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{item.qty}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold">Rs. {item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-slate-900 dark:border-white pt-3 space-y-1.5 font-mono text-xs text-right">
              <div className="flex justify-between">
                <span>Gross Subtotal:</span>
                <span className="font-bold">Rs. {grossSubtotal.toLocaleString()}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Discount Subtracted:</span>
                  <span>- Rs. {discountVal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-brand-600 border-t border-slate-300 dark:border-slate-800 pt-1">
                <span>Net Total Amount:</span>
                <span>Rs. {netPayableTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Paid:</span>
                <span className="font-bold text-emerald-600">Rs. {totalPaidSoFar.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>Net Balance Due:</span>
                <span className={netDueBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  Rs. {netDueBalance.toLocaleString()} {netDueBalance <= 0 ? '(PAID IN FULL)' : ''}
                </span>
              </div>
            </div>

            <Button onClick={handlePrintProfessionalBill} className="w-full flex items-center justify-center gap-2 mt-4">
              <Printer className="h-4 w-4" /> Print Receipt Now
            </Button>
          </div>
        )}
      </Modal>

      {/* MODAL: CREATE CUSTOM INVOICE */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Custom Billing Invoice">
        <form onSubmit={handleCreateCustomInvoiceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Patient *</label>
            <select
              required
              value={customPatientId}
              onChange={e => setCustomPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs font-bold dark:bg-dark-900"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} • ({p.mrNumber})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Special Discount Amount (Rs.)"
            type="number"
            min="0"
            value={customDiscount}
            onChange={e => setCustomDiscount(Number(e.target.value))}
          />

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Invoice Items List</label>
            {invoiceLines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  placeholder="Item Name"
                  value={line.itemName}
                  onChange={e => {
                    const u = [...invoiceLines];
                    u[i].itemName = e.target.value;
                    setInvoiceLines(u);
                  }}
                  className="col-span-5 px-2 py-1.5 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Rate (Rs.)"
                  value={line.unitPrice}
                  onChange={e => {
                    const u = [...invoiceLines];
                    u[i].unitPrice = Number(e.target.value);
                    setInvoiceLines(u);
                  }}
                  className="col-span-3 px-2 py-1.5 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={e => {
                    const u = [...invoiceLines];
                    u[i].quantity = Number(e.target.value);
                    setInvoiceLines(u);
                  }}
                  className="col-span-2 px-2 py-1.5 border rounded text-xs"
                />
                <button
                  type="button"
                  onClick={() => setInvoiceLines(invoiceLines.filter((_, idx) => idx !== i))}
                  className="col-span-2 text-rose-500 text-xs font-bold"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setInvoiceLines([...invoiceLines, { itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }])}
              className="text-brand-500 text-xs font-bold mt-1"
            >
              + Add Item Line
            </button>
          </div>

          <Button type="submit" className="w-full py-2 text-xs font-bold">
            Create & Issue Invoice
          </Button>
        </form>
      </Modal>

      {/* MODAL: PAY INVOICE */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title={`Settle Payment for Invoice #${selectedInvoice?.id}`}>
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <Input
            label="Payment Amount (Rs.) *"
            type="number"
            min="1"
            required
            value={payAmount}
            onChange={e => setPayAmount(Number(e.target.value))}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
            <select
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs font-bold dark:bg-dark-900"
            >
              <option value="cash">Cash</option>
              <option value="card">Credit/Debit Card</option>
              <option value="bank_transfer">Bank Transfer / Online</option>
            </select>
          </div>

          <Button type="submit" className="w-full py-2.5 text-xs font-bold">
            Confirm Cash Payment Collection
          </Button>
        </form>
      </Modal>
    </div>
  );
};
