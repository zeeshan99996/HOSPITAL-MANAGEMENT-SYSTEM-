import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Receipt, Plus, CreditCard, Eye, ShieldCheck, Printer, Trash,
  DollarSign, Activity, Clock, Stethoscope, Bed, Sparkles, Check,
  Search, Pill, Beaker, FileText, UserCheck, HeartPulse
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
  const [payrollMonth, setPayrollMonth] = useState('2026-07');

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invoicesData, admissionsData, patientsData, labReqsData, labTestsData, expData] = await Promise.all([
        apiClient.get('/invoices').catch(() => []),
        apiClient.get('/admissions').catch(() => []),
        apiClient.get('/patients').catch(() => []),
        apiClient.get('/lab/requests').catch(() => []),
        apiClient.get('/lab/tests').catch(() => []),
        apiClient.get('/expenses').catch(() => [])
      ]);

      const pArr = Array.isArray(patientsData) ? patientsData : (patientsData?.patients || []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setAdmissions(Array.isArray(admissionsData) ? admissionsData : []);
      setPatients(pArr);
      setLabRequests(Array.isArray(labReqsData) ? labReqsData : []);
      setLabCatalog(Array.isArray(labTestsData) ? labTestsData : []);
      setExpenses(Array.isArray(expData) ? expData : []);

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

  // Filter Patients by Tab
  const admittedPatientIds = new Set(
    admissions
      .filter((adm: any) => adm && adm.status === 'admitted')
      .map((adm: any) => Number(adm.patientId))
  );

  const opdPatientsList = patients.filter(p => !admittedPatientIds.has(Number(p.id)));
  const admitPatientsList = patients.filter(p => admittedPatientIds.has(Number(p.id)));
  const currentTabPatients = activeTab === 'opd_patient'
    ? (opdPatientsList.length > 0 ? opdPatientsList : patients)
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

    // Exact MR Number or tail sequence match (e.g. MR-2026-0020 or 0020 or 20)
    const exactMatch = currentTabPatients.find(p => {
      const mr = (p.mrNumber || '').toLowerCase();
      const seqOnly = mr.replace(/[^0-9]/g, '');
      return mr === q || (seqOnly.length > 0 && seqOnly.endsWith(q));
    });

    if (exactMatch) {
      setSelectedPatientId(String(exactMatch.id));
      return;
    }

    // Single result search match
    const matches = currentTabPatients.filter(p => {
      const mr = (p.mrNumber || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return mr.includes(q) || name.includes(q) || phone.includes(q);
    });

    if (matches.length === 1) {
      setSelectedPatientId(String(matches[0].id));
    }
  };

  // Selected Patient Details
  const selectedPatientObj = patients.find(p => String(p.id) === String(selectedPatientId));
  const selectedPatientAdmission = admissions.find(
    adm => String(adm.patientId) === String(selectedPatientId) && (adm.status === 'admitted' || !adm.dischargeDate)
  );

  // Compute Itemized Charges for Selected Patient
  const patientInvoices = invoices.filter(inv => String(inv.patientId) === String(selectedPatientId));
  const patientLabRequests = labRequests.filter(req => String(req.patientId) === String(selectedPatientId));

  // Build All Line Items
  const computedItems: Array<{ title: string; category: string; amount: number; qty: number; detail?: string }> = [];

  if (selectedPatientObj) {
    // 1. Initial OPD Registration / Consulting Fee
    const initFee = Number(selectedPatientObj.paymentAmount || 100);
    computedItems.push({
      title: 'Initial OPD Consultation & Registration Fee',
      category: 'Registration Fee',
      amount: initFee,
      qty: 1,
      detail: `Paid at reception desk on ${new Date(selectedPatientObj.createdAt).toLocaleDateString()}`
    });

    // 2. Pharmacy Medicines & Injections (Tekka) & All Patient Invoices
    patientInvoices.forEach(inv => {
      const itemsList = inv.invoiceItems || inv.items;
      if (Array.isArray(itemsList) && itemsList.length > 0) {
        itemsList.forEach((item: any) => {
          // Avoid duplicating consultation registration fee
          const iName = item.itemName ? String(item.itemName) : 'Pharmacy Item';
          if (item.itemCategory === 'Consultation' || iName.toLowerCase().includes('registration fee')) {
            return;
          }
          computedItems.push({
            title: iName,
            category: item.itemCategory || 'Pharmacy',
            amount: Number(item.totalPrice || item.unitPrice || 0),
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

    // 3. Laboratory & Radiology (Ultrasound, LFT, CBC, etc.) Tests
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

  const handlePrintProfessionalBill = () => {
    if (!selectedPatientObj) return;

    const printWindow = window.open('', '_blank', 'width=780,height=900');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for LifeFlow EMR to print billing receipts automatically.');
      return;
    }

    const discountVal = Number(receptionistDiscount) || 0;
    const grossSubtotal = computedItems.reduce((acc, item) => acc + item.amount, 0);
    const netPayableTotal = Math.max(0, grossSubtotal - discountVal);
    const totalPaidSoFar = patientInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0) + (selectedPatientAdmission ? Number(selectedPatientAdmission.advancePaid || 0) : 0);
    const netDueBalance = Math.max(0, netPayableTotal - totalPaidSoFar);

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
          .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .notes-box { font-size: 10px; color: #64748b; max-width: 320px; line-height: 1.5; background: #f8fafc; padding: 12px; rounded: 8px; border: 1px solid #e2e8f0; }
          .summary-box { width: 300px; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #fafafa; font-size: 11px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; color: #334155; }
          .summary-row.total { border-top: 2px solid #0284c7; font-weight: 900; font-size: 14px; color: #0284c7; padding-top: 8px; margin-top: 4px; }
          .stamp-box { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 10px; color: #64748b; }
          .stamp-line { border-top: 1.5px solid #334155; width: 160px; text-align: center; padding-top: 6px; font-weight: 800; color: #0f172a; font-size: 11px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="hospital-name">LIFEFLOW MEDICAL CENTER</div>
              <div class="hospital-sub">12-B, Main Boulevard, Gulberg III, Lahore, Pakistan</div>
              <div class="hospital-sub">UAN: (042) 35889900 | Helpline: 0311-6353044 | Tax NTN: 4920194-7</div>
            </td>
            <td style="vertical-align: top;">
              <div class="bill-title">MEDICAL INVOICE</div>
              <div style="font-size: 11px; text-align: right; color: #475569; margin-top: 6px; line-height: 1.5;">
                Statement Date: <strong>${new Date().toLocaleDateString()}</strong><br/>
                Bill Ref: <strong>INV-${Date.now().toString().slice(-6)}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div class="patient-box">
          <div class="info-col">
            <div><span class="info-label">Patient Name:</span> <strong style="color: #0f172a; font-size: 12px;">${escapeHtml(selectedPatientObj.name)}</strong></div>
            <div><span class="info-label">MR Number:</span> <strong style="color: #0284c7;">${escapeHtml(selectedPatientObj.mrNumber || 'MR-N/A')}</strong></div>
            <div><span class="info-label">Age / Gender:</span> <span>${escapeHtml(selectedPatientObj.age || 'N/A')} Yrs / ${escapeHtml((selectedPatientObj.gender || 'male').toUpperCase())}</span></div>
            <div><span class="info-label">Phone Contact:</span> <span>${escapeHtml(selectedPatientObj.phone)}</span></div>
          </div>
          <div class="info-col">
            <div><span class="info-label">Billing Category:</span> <strong>${activeTab === 'opd_patient' ? 'OPD Outpatient Visit' : 'IPD Inpatient Stay'}</strong></div>
            ${selectedPatientAdmission ? `<div><span class="info-label">Ward / Bed:</span> <span>${escapeHtml(selectedPatientAdmission.bed?.wardName || 'Ward')} (${escapeHtml(selectedPatientAdmission.bed?.bedNumber)})</span></div>` : ''}
            <div><span class="info-label">Payment Status:</span> <strong style="color: ${netDueBalance <= 0 ? '#16a34a' : '#dc2626'}; font-size: 12px;">${netDueBalance <= 0 ? 'PAID IN FULL' : 'PARTIAL / BALANCE DUE'}</strong></div>
          </div>
        </div>

        <table class="table-invoice">
          <thead>
            <tr>
              <th>Description / Particulars</th>
              <th style="text-align: center;">Service Category</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="notes-box">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Terms & Authorization:</strong>
            - Official computer-generated hospital statement.<br/>
            - Valid for insurance reimbursement & health audit.<br/>
            - Retain receipt for any refund or query.
          </div>
          <div class="summary-box">
            <div class="summary-row"><span>Gross Subtotal:</span> <strong>Rs. ${grossSubtotal.toLocaleString()}</strong></div>
            ${discountVal > 0 ? `<div class="summary-row" style="color: #dc2626;"><span>Receptionist Discount:</span> <strong>- Rs. ${discountVal.toLocaleString()}</strong></div>` : ''}
            <div class="summary-row total"><span>Net Total Amount:</span> <span>Rs. ${netPayableTotal.toLocaleString()}</span></div>
            <div class="summary-row" style="color: #16a34a;"><span>Total Amount Paid:</span> <strong>Rs. ${totalPaidSoFar.toLocaleString()}</strong></div>
            <div class="summary-row" style="font-weight: 800; font-size: 12px; color: ${netDueBalance > 0 ? '#dc2626' : '#16a34a'}; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px;">
              <span>Net Balance Due:</span> <span>Rs. ${netDueBalance.toLocaleString()} ${netDueBalance <= 0 ? '(CLEARED)' : ''}</span>
            </div>
          </div>
        </div>

        <div class="stamp-box">
          <div>
            <div style="font-weight: 700; color: #334155;">Issued By: Reception Desk Cashier</div>
            <div>Thank you for choosing LifeFlow Medical Center.</div>
          </div>
          <div class="stamp-line">Authorized Stamp & Sign</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Settlement & Payment Submit
  const handlePayInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await apiClient.put(`/invoices/${selectedInvoice.id}/pay`, {
        amount: payAmount,
        paymentMethod: payMethod,
      });
      setIsPayOpen(false);
      fetchBillingData();
      alert('Payment settled successfully.');
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPatientId) {
      alert('Please select a patient file.');
      return;
    }

    try {
      await apiClient.post('/invoices', {
        patientId: Number(customPatientId),
        discount: Number(customDiscount || 0),
        items: [
          {
            itemName: 'Custom Hospital Billing Invoice',
            itemCategory: 'General',
            unitPrice: 500,
            quantity: 1
          }
        ]
      });

      setIsCreateOpen(false);
      setCustomPatientId('');
      setCustomDiscount(0);
      fetchBillingData();
      alert('Custom invoice issued successfully.');
    } catch (err: any) {
      alert(`Invoice compilation failed: ${err.message}`);
    }
  };

  const handlePayClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    const balance = Number(invoice.grandTotal) - Number(invoice.paidAmount);
    setPayAmount(balance);
    setPayMethod('cash');
    setIsPayOpen(true);
  };

  // Submit IPD Advance Settlement
  const handleAdmissionPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !ipdDepositAmount) return;
    try {
      const depositNum = Number(ipdDepositAmount);
      const newAdvance = Number(selectedAdmission.advancePaid || 0) + depositNum;

      await apiClient.put(`/medical/admissions/${selectedAdmission.id}/notes`, {
        advancePaid: newAdvance
      });

      alert(`Rs. ${depositNum.toLocaleString()} IPD Deposit recorded successfully!`);
      setIsAdmissionPayOpen(false);
      setIpdDepositAmount('');
      fetchBillingData();
    } catch (err: any) {
      alert(`Error updating IPD deposit: ${err.message}`);
    }
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
            Complete billing breakdown of Initial Fee, Pharmacy Medicines, Lab Tests, and IPD Bed Stay.
          </p>
        </div>

        {user?.role !== 'patient' && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Create Custom Invoice
          </Button>
        )}
      </div>

      {/* TWO PRIMARY NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => {
            setActiveTab('opd_patient');
            setSelectedPatientId('');
            setReceptionistDiscount('');
          }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 rounded-t-lg ${
            activeTab === 'opd_patient'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="h-4 w-4" /> 🩺 OPD Patient Billing ({opdPatientsList.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('admit_patient');
            setSelectedPatientId('');
            setReceptionistDiscount('');
          }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 rounded-t-lg ${
            activeTab === 'admit_patient'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bed className="h-4 w-4" /> 🛌 Admit Patient (IPD) Billing ({admitPatientsList.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* COMPREHENSIVE PATIENT BILLING & RECEIPT CALCULATOR BOARD */}
          <Card className="p-5 border border-brand-500/30 bg-gradient-to-r from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-brand-500" />
                  Select {activeTab === 'opd_patient' ? 'OPD Patient' : 'Admitted IPD Patient'} for Complete Fee Statement
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Displays Initial Fee + Pharmacy Medicines + Lab Tests (Ultrasound/LFT/CBC) + Bed Stay.
                </p>
              </div>
              <Badge type="info">{activeTab === 'opd_patient' ? 'OPD Billing' : 'IPD Admission Billing'}</Badge>
            </div>

            {/* PATIENT SELECTION DROPDOWN & REAL-TIME MR NUMBER SEARCH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* MR Number Direct Search Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Type / Search MR Number *</span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-normal">e.g. MR-2026-0020 or 0020</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Type MR Number (e.g. MR-2026-0020 or 0020)..."
                    value={mrSearch}
                    onChange={e => handleMrSearchChange(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-brand-500/40 dark:border-brand-500/30 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
                  />
                  {mrSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMrSearch('');
                        setSelectedPatientId('');
                      }}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Patient Dropdown Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select Registered {activeTab === 'opd_patient' ? 'OPD' : 'Admitted IPD'} Patient File *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">-- Choose Patient to View Complete Fee Breakdown --</option>
                  {filteredTabPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} • (MRN: {p.mrNumber || 'N/A'}) • {p.phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ITEMIZED STATEMENT TABLE IF PATIENT SELECTED */}
            {selectedPatientObj ? (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-slate-100 dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{selectedPatientObj.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      MRN: {selectedPatientObj.mrNumber || 'MR-N/A'} • Contact: {selectedPatientObj.phone}
                      {selectedPatientAdmission ? ` • Ward: ${selectedPatientAdmission.bed?.wardName || 'IPD'} (Bed: ${selectedPatientAdmission.bed?.bedNumber})` : ''}
                    </span>
                  </div>

                  <Button onClick={handlePrintProfessionalBill} className="flex items-center gap-1.5 text-xs shadow-sm">
                    <Printer className="h-4 w-4" /> Print Complete Bill Receipt
                  </Button>
                </div>

                {/* TABLE OF ALL CHARGES */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                        <th className="px-4 py-3">Description / Line Item</th>
                        <th className="px-4 py-3">Fee Category</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                      {computedItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">{item.title}</span>
                            {item.detail && <span className="text-[10px] text-slate-450 italic">{item.detail}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{item.qty}</td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                            Rs. {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* RECEPTIONIST DISCOUNT & GRAND TOTAL SUMMARY CARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white dark:bg-dark-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {/* Receptionist Discount Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                      Receptionist Discount (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 200 (Subtract from Total)"
                      value={receptionistDiscount}
                      onChange={e => setReceptionistDiscount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-dark-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-[10px] text-slate-450 mt-0.5 block">Discount will be subtracted from Gross Subtotal.</span>
                  </div>

                  {/* Net Summary Calculation */}
                  <div className="space-y-1.5 text-right font-mono">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Gross Subtotal:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">Rs. {grossSubtotal.toLocaleString()}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between text-xs text-rose-500 font-bold">
                        <span>Discount Subtracted:</span>
                        <span>- Rs. {discountVal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-brand-600 dark:text-brand-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                      <span>Net Total Payable:</span>
                      <span>Rs. {netPayableTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Amount Paid So Far:</span>
                      <span className="font-bold text-emerald-600">Rs. {totalPaidSoFar.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>Net Due Balance:</span>
                      <span className={netDueBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        Rs. {netDueBalance.toLocaleString()} {netDueBalance <= 0 ? '(FULLY CLEAR)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-450 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Please select a patient from the dropdown above to view their complete initial fee, pharmacy, and lab test statement.
              </div>
            )}
          </Card>

          {/* INVOICES HISTORICAL LEDGER GRID */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Issued Invoices Ledger ({invoices.length} Records)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoices.map(inv => {
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
                      </div>
                      <Badge type={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'danger'}>
                        {inv.status ? inv.status.toUpperCase() : 'UNPAID'}
                      </Badge>
                    </div>

                    <div className="border-y border-slate-100 dark:border-slate-850 py-2.5 my-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Invoice Date:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Grand Total:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">Rs. {Number(inv.grandTotal).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Amount Paid:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {Number(inv.paidAmount).toLocaleString()}</span>
                      </div>
                      {balance > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Net Due:</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {balance.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {balance > 0 && user?.role !== 'patient' && (
                        <Button onClick={() => handlePayClick(inv)} size="sm" className="flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" /> Settle Payment
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE COMPLETE BILL RECEIPT MODAL */}
      <Modal isOpen={isPrintReceiptOpen} onClose={() => setIsPrintReceiptOpen(false)} title="Print Complete Patient Bill / Receipt">
        {selectedPatientObj && (
          <div className="space-y-4 p-2 bg-white dark:bg-dark-950 text-slate-900 dark:text-white" id="printable-receipt-area">
            {/* Hospital Header Logo */}
            <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex justify-center items-center gap-2 mb-1">
                <HeartPulse className="h-6 w-6 text-brand-500" />
                <h2 className="text-base font-extrabold tracking-tight">LifeFlow Medical Center</h2>
              </div>
              <p className="text-[10px] text-slate-500">Enterprise Hospital EMR & Diagnostic Billing Center</p>
              <p className="text-[9px] text-slate-400 font-mono">Date: {new Date().toLocaleString()}</p>
            </div>

            {/* Patient File Details */}
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

            {/* Itemized Table of Charges */}
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

            {/* Calculations Footer */}
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

            {/* Footer Signature */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 dark:border-slate-800 text-[10px]">
              <div>
                <span className="block font-semibold">Issued By: Reception Desk Staff</span>
                <span className="text-slate-400">Thank you for choosing LifeFlow Hospital.</span>
              </div>
              <div className="text-center border-t border-slate-400 w-32 pt-1 font-semibold">
                Authorized Stamp
              </div>
            </div>

            <Button onClick={handlePrintProfessionalBill} className="w-full flex items-center justify-center gap-2 mt-4">
              <Printer className="h-4 w-4" /> Print Receipt Now
            </Button>
          </div>
        )}
      </Modal>

      {/* CREATE CUSTOM INVOICE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Custom Billing Invoice">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Select Patient *</label>
            <select
              required
              value={customPatientId}
              onChange={e => setCustomPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.mrNumber || p.phone})</option>
              ))}
            </select>
          </div>

          <Input
            label="Invoice Discount (Rs.)"
            type="number"
            value={customDiscount}
            onChange={e => setCustomDiscount(Number(e.target.value))}
          />

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Issue Custom Invoice
          </Button>
        </form>
      </Modal>

      {/* SETTLE PAYMENT MODAL */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title={`Settle Invoice #${selectedInvoice?.id || ''}`}>
        <form onSubmit={handlePayInvoiceSubmit} className="space-y-4">
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
              <option value="cash">Cash</option>
              <option value="card">Credit / Debit Card</option>
              <option value="online">Online Transfer</option>
            </select>
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Confirm & Record Payment
          </Button>
        </form>
      </Modal>
    </div>
  );
};
