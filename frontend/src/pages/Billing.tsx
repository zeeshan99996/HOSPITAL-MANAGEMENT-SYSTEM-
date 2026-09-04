import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCachedClinicSettings } from '../utils/clinicSettings';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Receipt, Plus, CreditCard, Eye, ShieldCheck, Printer, Trash,
  DollarSign, Activity, Clock, Stethoscope, Bed, Sparkles, Check,
  Search, Pill, Beaker, FileText, UserCheck, HeartPulse, CheckCircle2,
  AlertCircle, ChevronRight, Filter, TrendingUp, Wallet, Undo2, RotateCcw,
  Ban, Percent, HelpCircle
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
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'paid' | 'unpaid' | 'voided'>('all');
  const [ledgerGrouping, setLedgerGrouping] = useState<'by_patient' | 'by_invoice'>('by_patient');
  const [cardDiscounts, setCardDiscounts] = useState<Record<string, number>>({});

  // Printable Bill Receipt Modal
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false);

  // Standard Invoices & Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Void Invoice Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // Issue Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundingInvoice, setRefundingInvoice] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Admit Patient Deposit Settlement Modal
  const [isAdmissionPayOpen, setIsAdmissionPayOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [ipdDepositAmount, setIpdDepositAmount] = useState('');

  // Custom Invoice Creation State
  const [customPatientId, setCustomPatientId] = useState('');
  const [customDiscount, setCustomDiscount] = useState(0);
  const [customTaxRate, setCustomTaxRate] = useState(0);
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
    if (!q) {
      setSelectedPatientId('');
      return;
    }

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

  const selectedPatientObj = selectedPatientId ? (currentTabPatients.find(p => String(p.id) === String(selectedPatientId)) || patients.find(p => String(p.id) === String(selectedPatientId))) : undefined;
  const selectedPatientAdmission = admissions.find(adm => String(adm.patientId) === String(selectedPatientId) && adm.status === 'admitted');

  // ==========================================
  // COMPREHENSIVE PATIENT BREAKDOWN ENGINE
  // ==========================================
  const getPatientBillingBreakdown = (pId: number | string, customDisc?: number) => {
    const pIdStr = String(pId);
    const patientObj = patients.find(p => String(p.id) === pIdStr);
    const activeInvs = invoices.filter(inv => String(inv.patientId) === pIdStr && !inv.isVoided && inv.status !== 'voided');
    const pLabs = labRequests.filter(req => String(req.patientId) === pIdStr);
    const pAdmission = admissions.find(adm => String(adm.patientId) === pIdStr && adm.status === 'admitted');
    const pToken = tokens.find(t => String(t.patientId) === pIdStr);

    const items: Array<{ 
      title: string; 
      category: 'Initial Consultation Fee' | 'Pharmacy Medicine' | 'Ultrasound' | 'Diagnostic Lab' | 'Ward Bed Charge' | 'General'; 
      amount: number; 
      qty: number; 
      status: 'PAID' | 'UNPAID';
      detail?: string 
    }> = [];

    let hasConsultationItem = false;
    let initialConsultFee = 0;
    const handledLabTitles = new Set<string>();

    activeInvs.forEach(inv => {
      const invIsPaid = inv.status === 'paid' || Number(inv.paidAmount || 0) >= Number(inv.grandTotal || inv.totalAmount || 0);
      const invItems = (inv.items && Array.isArray(inv.items) && inv.items.length > 0)
        ? inv.items
        : ((inv.invoice_items && Array.isArray(inv.invoice_items) && inv.invoice_items.length > 0)
            ? inv.invoice_items
            : (inv.InvoiceItems && Array.isArray(inv.InvoiceItems) && inv.InvoiceItems.length > 0 ? inv.InvoiceItems : []));

      if (invItems && invItems.length > 0) {
        invItems.forEach((item: any) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const uPrice = Number(item.unitPrice) || 0;
          const itemTotal = Number(item.totalPrice) > 0 ? Number(item.totalPrice) : (uPrice * qty);
          const nameLower = (item.itemName || '').toLowerCase();
          const catLower = (item.itemCategory || '').toLowerCase();

          let cat: 'Initial Consultation Fee' | 'Pharmacy Medicine' | 'Ultrasound' | 'Diagnostic Lab' | 'Ward Bed Charge' | 'General' = 'General';
          let itemStatus: 'PAID' | 'UNPAID' = invIsPaid ? 'PAID' : 'UNPAID';

          if (catLower.includes('consult') || nameLower.includes('consultation')) {
            cat = 'Initial Consultation Fee';
            hasConsultationItem = true;
            initialConsultFee += itemTotal;
            itemStatus = 'PAID';
          } else if (catLower.includes('ultrasound') || nameLower.includes('ultrasound')) {
            cat = 'Ultrasound';
            handledLabTitles.add(nameLower);
          } else if (catLower.includes('diagnostic') || catLower.includes('lab') || catLower.includes('pathology')) {
            cat = 'Diagnostic Lab';
            handledLabTitles.add(nameLower);
          } else if (catLower.includes('pharmacy') || nameLower.includes('dispense')) {
            cat = 'Pharmacy Medicine';
          } else if (catLower.includes('bed') || catLower.includes('ward')) {
            cat = 'Ward Bed Charge';
          }

          items.push({
            title: item.itemName || 'Medical Charge',
            category: cat,
            amount: itemTotal,
            qty: qty,
            status: itemStatus,
            detail: `Invoice #${inv.id}`
          });
        });
      } else {
        const amt = Number(inv.grandTotal || inv.totalAmount || 0);
        if (amt > 0) {
          if (!hasConsultationItem) {
            // This itemless invoice represents the initial doctor consultation fee
            hasConsultationItem = true;
            initialConsultFee += amt;
            items.push({
              title: 'Doctor OPD Consultation & Registration Fee',
              category: 'Initial Consultation Fee',
              amount: amt,
              qty: 1,
              status: invIsPaid ? 'PAID' : 'UNPAID',
              detail: `Invoice #${inv.id}`
            });
          } else {
            items.push({
              title: 'Clinical & Hospital Services',
              category: 'General',
              amount: amt,
              qty: 1,
              status: invIsPaid ? 'PAID' : 'UNPAID',
              detail: `Invoice #${inv.id}`
            });
          }
        }
      }
    });

    // 1. Initial Doctor OPD Consultation Fee (Ensure listed if not in invoice items)
    if (!hasConsultationItem) {
      const consultFee = pToken?.fee !== undefined 
        ? Number(pToken.fee) 
        : (patientObj?.doctor?.consultationFee ? Number(patientObj.doctor.consultationFee) : 500);
      initialConsultFee = consultFee;
      items.unshift({
        title: consultFee === 0 
          ? 'Doctor OPD Consultation (Followup Re-visit - FREE)' 
          : 'Doctor OPD Consultation & Registration Fee',
        category: 'Initial Consultation Fee',
        amount: consultFee,
        qty: 1,
        status: 'PAID',
        detail: pToken?.detail || (pToken?.tokenNumber ? `Token #${pToken.tokenNumber}` : 'OPD Token Desk')
      });
    }

    // 2. Diagnostics / Ultrasound tests not yet in invoice items
    pLabs.forEach(req => {
      const reqName = (req.testName || '').toLowerCase();
      const alreadyIn = Array.from(handledLabTitles).some(t => t.includes(reqName) || reqName.includes(t));
      if (!alreadyIn) {
        const matchCatalog = labCatalog.find(t => t.name.toLowerCase() === req.testName.toLowerCase());
        const isUS = req.testName.toLowerCase().includes('ultrasound') || (req.category && req.category.toLowerCase().includes('ultrasound'));
        const testRate = matchCatalog ? Number(matchCatalog.rate || 0) : (isUS ? 1500 : 500);
        items.push({
          title: `${req.testName} (${isUS ? 'Ultrasound Diagnostic' : 'Lab Diagnostic'})`,
          category: isUS ? 'Ultrasound' : 'Diagnostic Lab',
          amount: testRate,
          qty: 1,
          status: req.status === 'completed' ? 'PAID' : 'UNPAID',
          detail: `Ordered by Dr. ${req.doctor?.user?.name || 'Physician'}`
        });
      }
    });

    // 3. Inpatient Bed Stay (if admitted)
    if (pAdmission) {
      const bedRate = Number(pAdmission.bed?.rate || 1500);
      const days = Math.max(1, Math.ceil((Date.now() - new Date(pAdmission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)));
      const isBedPaid = Number(pAdmission.advancePaid || 0) >= bedRate * days;
      items.push({
        title: `Inpatient Bed Stay (${pAdmission.bed?.bedNumber || 'IPD Ward'} - ${days} Days)`,
        category: 'Ward Bed Charge',
        amount: bedRate * days,
        qty: days,
        status: isBedPaid ? 'PAID' : 'UNPAID',
        detail: `Admitted on ${new Date(pAdmission.admissionDate).toLocaleDateString()}`
      });
    }

    const grossTotal = Math.round(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100;
    const rawDisc = customDisc !== undefined 
      ? Number(customDisc) 
      : (cardDiscounts[pIdStr] !== undefined ? Number(cardDiscounts[pIdStr]) : (Number(receptionistDiscount) || 0));
    const discountVal = Math.max(0, isNaN(rawDisc) ? 0 : rawDisc);
    const netPayableTotal = Math.round(Math.max(0, grossTotal - discountVal) * 100) / 100;
    const totalPaidInvoices = activeInvs.reduce((sum, inv) => sum + Number(inv.paidAmount || 0) - Number(inv.refundAmount || 0), 0);
    const admissionPaid = pAdmission ? Number(pAdmission.advancePaid || 0) : 0;
    const effectiveTotalPaid = Math.round((totalPaidInvoices + admissionPaid + (hasConsultationItem ? 0 : initialConsultFee)) * 100) / 100;
    const remainingBalance = Math.round(Math.max(0, netPayableTotal - effectiveTotalPaid) * 100) / 100;

    return {
      patient: patientObj,
      items,
      grossTotal,
      initialConsultFee,
      discountVal,
      netPayableTotal,
      totalPaid: effectiveTotalPaid,
      remainingBalance,
      masterInvoice: activeInvs[0] || null
    };
  };

  const selectedPatientBreakdown = selectedPatientId ? getPatientBillingBreakdown(selectedPatientId, receptionistDiscount === '' ? 0 : Number(receptionistDiscount)) : null;
  const computedItems = selectedPatientBreakdown ? selectedPatientBreakdown.items : [];
  const grossSubtotal = selectedPatientBreakdown ? selectedPatientBreakdown.grossTotal : 0;
  const rawDisc = Number(receptionistDiscount);
  const discountVal = Math.max(0, isNaN(rawDisc) ? 0 : rawDisc);
  const netPayableTotal = selectedPatientBreakdown ? selectedPatientBreakdown.netPayableTotal : 0;
  const totalPaidSoFar = selectedPatientBreakdown ? selectedPatientBreakdown.totalPaid : 0;
  const netDueBalance = selectedPatientBreakdown ? selectedPatientBreakdown.remainingBalance : 0;
  const initialConsultFeePaid = selectedPatientBreakdown ? selectedPatientBreakdown.initialConsultFee : 0;

  // Consolidated Patient Accounts Calculation (Groups all scattered invoices by MR Number)
  const consolidatedPatientAccounts = React.useMemo(() => {
    const map = new Map<string, {
      patientId: number;
      patientName: string;
      mrNumber: string;
      phone: string;
      totalInvoiced: number;
      totalPaid: number;
      totalRefunded: number;
      netBalance: number;
      invoiceCount: number;
      invoiceIds: number[];
      latestDate: string;
      status: 'paid' | 'unpaid' | 'partially_paid' | 'voided';
    }>();

    invoices.forEach(inv => {
      const pId = String(inv.patientId || inv.patient?.id || 'unknown');
      const pName = inv.patient?.name || `Patient #${pId}`;
      const mrn = inv.patient?.mrNumber || 'N/A';
      const phone = inv.patient?.phone || 'N/A';
      const isVoid = inv.isVoided || inv.status === 'voided';

      if (!map.has(pId)) {
        map.set(pId, {
          patientId: Number(pId),
          patientName: pName,
          mrNumber: mrn,
          phone: phone,
          totalInvoiced: 0,
          totalPaid: 0,
          totalRefunded: 0,
          netBalance: 0,
          invoiceCount: 0,
          invoiceIds: [],
          latestDate: inv.createdAt,
          status: 'unpaid'
        });
      }

      const acc = map.get(pId)!;
      acc.invoiceCount += 1;
      acc.invoiceIds.push(inv.id);
      if (!isVoid) {
        const invTotal = Number(inv.grandTotal || inv.totalAmount || 0);
        const invPaid = Math.min(invTotal, Math.max(0, Number(inv.paidAmount || 0)));
        const invRef = Number(inv.refundAmount || 0);
        acc.totalInvoiced += invTotal;
        acc.totalPaid += invPaid;
        acc.totalRefunded += invRef;
      }
      if (new Date(inv.createdAt) > new Date(acc.latestDate)) {
        acc.latestDate = inv.createdAt;
      }
    });

    return Array.from(map.values()).map(acc => {
      acc.totalInvoiced = Math.round(acc.totalInvoiced * 100) / 100;
      acc.totalPaid = Math.round(acc.totalPaid * 100) / 100;
      acc.totalRefunded = Math.round(acc.totalRefunded * 100) / 100;
      acc.netBalance = Math.round(Math.max(0, acc.totalInvoiced - acc.totalPaid) * 100) / 100;
      
      if (acc.netBalance === 0 && acc.totalInvoiced > 0) {
        acc.status = 'paid';
      } else if (acc.totalPaid > 0 && acc.netBalance > 0) {
        acc.status = 'partially_paid';
      } else {
        acc.status = 'unpaid';
      }
      return acc;
    }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [invoices]);

  // Revenue KPI Stats (Strictly exclude voided invoices, deduct refunds)
  const totalRevenueCollected = invoices
    .filter(inv => !inv.isVoided && inv.status !== 'voided')
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.paidAmount || 0) - Number(inv.refundAmount || 0)), 0);

  const totalOutstandingUnpaid = invoices
    .filter(inv => !inv.isVoided && inv.status !== 'voided')
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.grandTotal || inv.totalAmount || 0) - Number(inv.paidAmount || 0)), 0);

  // 80mm POS Thermal Receipt Print Engine
  const handlePrintThermalReceipt = (patientOverride?: any, itemsOverride?: any[], mathOverride?: any) => {
    const targetPatient = patientOverride || selectedPatientObj;
    if (!targetPatient) {
      alert('Please select a patient first to print thermal slip.');
      return;
    }

    const pId = targetPatient.id || targetPatient.patientId;
    let itemsToPrint = itemsOverride;
    let mathToPrint = mathOverride;

    if (!itemsToPrint || !mathToPrint) {
      const b = getPatientBillingBreakdown(pId, cardDiscounts[String(pId)] || 0);
      itemsToPrint = b.items;
      mathToPrint = {
        grossSubtotal: b.grossTotal,
        discountVal: b.discountVal,
        initialFee: b.initialConsultFee,
        netPayableTotal: b.netPayableTotal,
        totalPaidSoFar: b.totalPaid,
        netDueBalance: b.remainingBalance
      };
    }

    const clinic = getCachedClinicSettings();

    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) {
      alert('Pop-up window was blocked. Please allow pop-ups for thermal receipt printing.');
      return;
    }

    const receiptRows = itemsToPrint.map((item: any) => `
      <tr>
        <td style="padding: 3px 0; border-bottom: 0.5px dotted #9ca3af; vertical-align: top;">
          <strong style="color: #000; font-size: 10px; display: block;">${escapeHtml(item.title)}</strong>
          <span style="font-size: 8.5px; color: #4b5563;">${escapeHtml(item.category)}</span>
        </td>
        <td style="padding: 3px 0; border-bottom: 0.5px dotted #9ca3af; text-align: center; font-size: 10px; vertical-align: top;">${escapeHtml(item.qty || 1)}</td>
        <td style="padding: 3px 0; border-bottom: 0.5px dotted #9ca3af; text-align: right; font-size: 10px; font-weight: 700; vertical-align: top;">Rs. ${Number(item.amount || 0).toLocaleString()}</td>
        <td style="padding: 3px 0; border-bottom: 0.5px dotted #9ca3af; text-align: right; font-size: 9px; font-weight: 800; vertical-align: top; color: #111827;">[${item.status}]</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${targetPatient.mrNumber || 'MRN'}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          @media print {
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.25;
              height: auto !important;
              max-height: max-content !important;
              overflow: hidden !important;
            }
            .no-print { display: none !important; }
          }
          body {
            width: 76mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px 4px 14px 4px;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10.5px;
            line-height: 1.3;
          }
          .header { text-align: center; border-bottom: 2px dashed #111827; padding-bottom: 6px; margin-bottom: 6px; }
          .clinic-title { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.3px; line-height: 1.2; }
          .clinic-sub { font-size: 9.5px; color: #4b5563; margin-top: 2px; }
          .clinic-contact { font-size: 9px; color: #111827; font-weight: 700; margin-top: 2px; }
          .doc-type { font-size: 11px; font-weight: 900; text-transform: uppercase; margin-top: 5px; letter-spacing: 0.5px; background: #000; color: #fff; padding: 2px 0; border-radius: 4px; }
          
          .meta-box { border-bottom: 1px dashed #4b5563; padding-bottom: 5px; margin-bottom: 6px; font-size: 10px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .meta-label { font-weight: 700; color: #4b5563; }
          .meta-val { font-weight: 800; color: #111827; }

          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
          .items-table th { border-bottom: 1.5px solid #111827; text-align: left; padding: 3px 0; font-size: 9px; text-transform: uppercase; font-weight: 900; }

          .summary-section { border-top: 1.5px dashed #111827; padding-top: 5px; font-size: 10.5px; font-family: monospace; }
          .sum-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .sum-row.total { font-weight: 900; font-size: 12px; border-top: 1px solid #111827; padding-top: 3px; margin-top: 3px; }
          .sum-row.due { font-weight: 900; font-size: 12.5px; border-top: 1.5px dashed #111827; padding-top: 3px; margin-top: 3px; }

          .footer { text-align: center; border-top: 1px dashed #4b5563; margin-top: 8px; padding-top: 6px; font-size: 8.5px; color: #4b5563; }
          .erha-tag { font-size: 8px; font-weight: 800; color: #111827; margin-top: 4px; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-title">${escapeHtml(clinic.clinicName)}</div>
          <div class="clinic-sub">${escapeHtml(clinic.clinicAddress)}</div>
          <div class="clinic-contact">Tel: ${escapeHtml(clinic.clinicPhone)} | Mob: ${escapeHtml(clinic.clinicMobile)}</div>
          <div class="doc-type">OFFICIAL BILLING RECEIPT</div>
        </div>

        <div class="meta-box">
          <div class="meta-row"><span class="meta-label">Patient Name:</span> <span class="meta-val">${escapeHtml(targetPatient.name || targetPatient.patientName)}</span></div>
          <div class="meta-row"><span class="meta-label">MR Number:</span> <span class="meta-val">${escapeHtml(targetPatient.mrNumber || 'N/A')}</span></div>
          <div class="meta-row"><span class="meta-label">Phone:</span> <span class="meta-val">${escapeHtml(targetPatient.phone || 'N/A')}</span></div>
          <div class="meta-row"><span class="meta-label">Date & Time:</span> <span class="meta-val">${new Date().toLocaleString()}</span></div>
          <div class="meta-row"><span class="meta-label">Billing Type:</span> <span class="meta-val">${activeTab === 'opd_patient' ? 'OPD Visit' : 'IPD Bed Stay'}</span></div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 48%;">Description</th>
              <th style="width: 14%; text-align: center;">Qty</th>
              <th style="width: 22%; text-align: right;">Amount</th>
              <th style="width: 16%; text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>${receiptRows}</tbody>
        </table>

        <div class="summary-section">
          <div class="sum-row"><span>Gross Total:</span> <span>Rs. ${mathToPrint.grossSubtotal.toLocaleString()}</span></div>
          ${mathToPrint.discountVal > 0 ? `<div class="sum-row"><span>Special Discount:</span> <span>- Rs. ${mathToPrint.discountVal.toLocaleString()}</span></div>` : ''}
          <div class="sum-row total"><span>Net Total Bill:</span> <span>Rs. ${mathToPrint.netPayableTotal.toLocaleString()}</span></div>
          <div class="sum-row" style="color: #111827; font-weight: 700;"><span>Total Paid:</span> <span>Rs. ${mathToPrint.totalPaidSoFar.toLocaleString()}</span></div>
          <div class="sum-row due" style="color: #111827;">
            <span>${mathToPrint.totalPaidSoFar > mathToPrint.netPayableTotal ? 'Refund / Return:' : 'Net Balance Due:'}</span>
            <span>
              ${mathToPrint.totalPaidSoFar > mathToPrint.netPayableTotal
                ? `Rs. ${(mathToPrint.totalPaidSoFar - mathToPrint.netPayableTotal).toLocaleString()} (REFUND)`
                : `Rs. ${mathToPrint.netDueBalance.toLocaleString()} ${mathToPrint.netDueBalance <= 0 ? '(PAID IN FULL)' : ''}`
              }
            </span>
          </div>
        </div>

        <div class="footer">
          <div>${clinic.receiptFooter.replace(/\n/g, '<br/>')}</div>
          <div class="erha-tag">Developed by Erha Technologies</div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ONE-CLICK "PAY & PRINT THERMAL SLIP" ACTION
  const handlePayAndPrint = async (patientIdToPay: number | string, customDisc?: number) => {
    const pIdStr = String(patientIdToPay);
    const disc = customDisc !== undefined 
      ? Number(customDisc) 
      : (cardDiscounts[pIdStr] !== undefined ? Number(cardDiscounts[pIdStr]) : (Number(receptionistDiscount) || 0));
    
    const breakdown = getPatientBillingBreakdown(patientIdToPay, disc);
    const targetPatient = breakdown.patient || patients.find(p => String(p.id) === pIdStr) || selectedPatientObj;
    if (!targetPatient) return;

    const remaining = breakdown.remainingBalance;

    if (remaining > 0) {
      try {
        let masterInv = breakdown.masterInvoice;
        if (masterInv) {
          await apiClient.post(`/invoices/${masterInv.id}/payment`, {
            amount: remaining,
            discount: disc,
            paymentMethod: 'cash'
          });
        } else {
          // Create master invoice with valid line items and pay
          const validItems = breakdown.items.map(it => ({
            itemName: it.title,
            itemCategory: it.category,
            unitPrice: it.amount,
            quantity: it.qty || 1
          }));
          const createRes: any = await apiClient.post('/invoices', {
            patientId: Number(patientIdToPay),
            discount: disc,
            tax: 0,
            items: validItems.length > 0 ? validItems : [{ itemName: 'Medical & Clinical Services Settlement', itemCategory: 'General', unitPrice: remaining, quantity: 1 }]
          });
          const invId = createRes?.invoice?.id || createRes?.id;
          if (invId) {
            await apiClient.post(`/invoices/${invId}/payment`, {
              amount: remaining,
              paymentMethod: 'cash'
            });
          }
        }
        await fetchBillingData();
      } catch (err: any) {
        alert(`Payment collection failed: ${err.message}`);
        return;
      }
    }

    // Immediately trigger 80mm thermal receipt printed as PAID
    const clearedItems = breakdown.items.map(it => ({ ...it, status: 'PAID' as const }));
    const clearedMath = {
      grossSubtotal: breakdown.grossTotal,
      discountVal: disc,
      initialFee: breakdown.initialConsultFee,
      netPayableTotal: Math.max(0, breakdown.grossTotal - disc),
      totalPaidSoFar: Math.max(0, breakdown.grossTotal - disc),
      netDueBalance: 0
    };

    setTimeout(() => {
      handlePrintThermalReceipt(targetPatient, clearedItems, clearedMath);
    }, 150);
  };

  const handlePrintProfessionalBill = () => {
    if (!selectedPatientObj) return;

    const clinic = getCachedClinicSettings();

    const printWindow = window.open('', '_blank', 'width=780,height=900');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for Dr. Talha Clinic EMR to print billing receipts automatically.');
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
          .hospital-name { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; text-transform: uppercase; }
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
              <div class="hospital-name">${escapeHtml(clinic.clinicName)}</div>
              <div class="hospital-sub">${escapeHtml(clinic.clinicAddress)} • Tel: ${escapeHtml(clinic.clinicPhone)} | Mobile: ${escapeHtml(clinic.clinicMobile)}</div>
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

        <div style="text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #64748b; font-weight: bold;">
          ${clinic.receiptFooter.replace(/\n/g, '<br/>')}
          <div style="font-size: 8px; color: #475569; margin-top: 6px; letter-spacing: 0.5px;">
            Developed by Erha Technologies
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
        tax: Number(customTaxRate),
        items: validLines.map(l => ({
          itemName: l.itemName,
          itemCategory: l.itemCategory,
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

  // Void Invoice Handler
  const handleOpenVoidModal = (inv: any) => {
    setVoidingInvoice(inv);
    setVoidReason('');
    setIsVoidModalOpen(true);
  };

  const handleExecuteVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingInvoice) return;
    if (!voidReason.trim()) {
      alert('Please specify an official reason for voiding this invoice.');
      return;
    }

    setVoidLoading(true);
    try {
      await apiClient.post(`/invoices/${voidingInvoice.id}/void`, {
        voidReason: voidReason.trim(),
        reason: voidReason.trim()
      });
      alert('✅ Invoice successfully marked as VOIDED.');
      setIsVoidModalOpen(false);
      setVoidingInvoice(null);
      fetchBillingData();
    } catch (err: any) {
      alert(err.message || 'Failed to void invoice.');
    } finally {
      setVoidLoading(false);
    }
  };

  // Issue Refund Handler
  const handleOpenRefundModal = (inv: any) => {
    setRefundingInvoice(inv);
    const maxRefund = Number(inv.paidAmount || 0);
    setRefundAmount(maxRefund);
    setRefundReason('');
    setIsRefundModalOpen(true);
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingInvoice || !refundAmount || Number(refundAmount) <= 0) {
      alert('Please enter a valid refund amount.');
      return;
    }

    setRefundLoading(true);
    try {
      await apiClient.post(`/invoices/${refundingInvoice.id}/refund`, {
        refundAmount: Number(refundAmount),
        amount: Number(refundAmount),
        refundReason: refundReason.trim(),
        reason: refundReason.trim()
      });
      alert(`✅ Successfully processed customer refund of Rs. ${Number(refundAmount).toLocaleString()}.`);
      setIsRefundModalOpen(false);
      setRefundingInvoice(null);
      fetchBillingData();
    } catch (err: any) {
      alert(err.message || 'Failed to process refund.');
    } finally {
      setRefundLoading(false);
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
      // Automatically trigger 80mm thermal POS receipt
      setTimeout(() => {
        handlePrintThermalReceipt();
      }, 350);
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (invoiceFilter === 'voided') return inv.isVoided || inv.status === 'voided';
    if (invoiceFilter === 'paid') return !inv.isVoided && (inv.status === 'paid' || Number(inv.paidAmount || 0) >= Number(inv.grandTotal || inv.totalAmount || 0));
    if (invoiceFilter === 'unpaid') return !inv.isVoided && inv.status !== 'paid' && Number(inv.paidAmount || 0) < Number(inv.grandTotal || inv.totalAmount || 0);
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

          {/* Action Button */}
          <div className="flex items-center gap-3">
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
              setSelectedPatientId('');
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
              setSelectedPatientId('');
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

                <div className="flex items-center gap-2 flex-wrap">
                  {netDueBalance > 0 ? (
                    <Button
                      type="button"
                      onClick={() => handlePayAndPrint(selectedPatientId, discountVal)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/20"
                    >
                      <CreditCard className="h-4 w-4" /> Pay & Print Slip (Rs. {netDueBalance.toLocaleString()})
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handlePrintThermalReceipt()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/20"
                    >
                      <Printer className="h-4 w-4" /> Print 80mm POS Thermal Slip (Paid)
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsPrintReceiptOpen(true)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <FileText className="h-4 w-4" /> Full Statement (A4)
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
                        <th className="px-4 py-3 text-center">Status</th>
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black border ${
                              item.category === 'Initial Consultation Fee'
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                : item.category === 'Pharmacy Medicine'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                : item.category === 'Ultrasound'
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                : item.category === 'Diagnostic Lab'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {item.qty}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                            Rs. {item.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            }`}>
                              {item.status}
                            </span>
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
                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-bold">
                    <span>Total Gross Amount:</span>
                    <span>Rs. {grossSubtotal.toLocaleString()}</span>
                  </div>
                  {discountVal > 0 && (
                    <div className="flex justify-between items-center text-rose-500 font-bold">
                      <span>Special Discount:</span>
                      <span>- Rs. {discountVal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-900 dark:text-white font-extrabold border-t border-brand-500/20 pt-1.5 text-xs">
                    <span>Net Total Bill (After Discount):</span>
                    <span className="text-brand-600 dark:text-brand-400 font-black">Rs. {netPayableTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-semibold border-t border-brand-500/20 pt-1.5">
                    <span>Total Paid So Far:</span>
                    <span className="text-emerald-600 font-bold">Rs. {totalPaidSoFar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white pt-1 border-t border-brand-500/20">
                    <span>{totalPaidSoFar > netPayableTotal ? 'Refund / Return to Patient:' : 'Remaining Balance Due:'}</span>
                    <span className={netDueBalance > 0 ? 'text-rose-600 dark:text-rose-400 text-base font-black' : 'text-emerald-600 dark:text-emerald-400 text-base font-black'}>
                      {totalPaidSoFar > netPayableTotal
                        ? `Rs. ${(totalPaidSoFar - netPayableTotal).toLocaleString()} (REFUND)`
                        : `Rs. ${netDueBalance.toLocaleString()} ${netDueBalance <= 0 ? '(PAID IN FULL)' : ''}`
                      }
                    </span>
                  </div>

                  {netDueBalance > 0 ? (
                    <div className="pt-2 border-t border-brand-500/20">
                      <Button
                        type="button"
                        onClick={() => handlePayAndPrint(selectedPatientId, discountVal)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-emerald-600/20 font-sans transition-all tracking-wide uppercase"
                      >
                        <CreditCard className="h-4 w-4" /> Pay Rs. {netDueBalance.toLocaleString()} & Print Slip
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-brand-500/20">
                      <Button
                        type="button"
                        onClick={() => handlePrintThermalReceipt()}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs font-sans transition-all"
                      >
                        <Printer className="h-4 w-4" /> Print Thermal Slip (Paid)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-dark-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Please select a patient from the dropdown above to view their complete initial fee, pharmacy, and lab test statement.
            </div>
          )}
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Special Discount (Rs.)"
              type="number"
              min="0"
              value={customDiscount}
              onChange={e => setCustomDiscount(Number(e.target.value))}
            />
            <Input
              label="Tax Rate (%) - Optional"
              type="number"
              min="0"
              max="100"
              value={customTaxRate}
              onChange={e => setCustomTaxRate(Number(e.target.value))}
              placeholder="e.g. 16"
            />
          </div>

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

      {/* MODAL: VOID INVOICE */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title={`Void Invoice #${voidingInvoice?.id}`}
      >
        {voidingInvoice && (
          <form onSubmit={handleExecuteVoid} className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs space-y-1">
              <span className="font-extrabold text-rose-800 dark:text-rose-300 block">
                ⚠️ Caution: Voiding this Invoice is irreversible.
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Patient: <strong>{voidingInvoice.patient?.name || `ID #${voidingInvoice.patientId}`}</strong> (MRN: {voidingInvoice.patient?.mrNumber || 'N/A'})
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Amount: <strong>Rs. {Number(voidingInvoice.grandTotal || voidingInvoice.totalAmount || 0).toLocaleString()}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Official Void Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate invoice entry, billing error, cancelled consultation, incorrect charge applied..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsVoidModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={voidLoading} className="bg-rose-600 hover:bg-rose-700">
                Confirm Void Invoice
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: ISSUE REFUND */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title={`Process Refund for Invoice #${refundingInvoice?.id}`}
      >
        {refundingInvoice && (
          <form onSubmit={handleExecuteRefund} className="space-y-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl text-xs space-y-1">
              <span className="font-extrabold text-purple-800 dark:text-purple-300 block">
                💰 Patient Payment Refund Settlement
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Patient: <strong>{refundingInvoice.patient?.name || `ID #${refundingInvoice.patientId}`}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Total Paid: <strong>Rs. {Number(refundingInvoice.paidAmount || 0).toLocaleString()}</strong>
              </p>
            </div>

            <Input
              label="Refund Amount (Rs.) *"
              type="number"
              min="1"
              max={Number(refundingInvoice.paidAmount || 0)}
              required
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Refund Reason / Audit Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="e.g. Test cancelled by physician, patient discharged early, overpayment settlement..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={refundLoading} className="bg-purple-600 hover:bg-purple-700">
                Confirm & Issue Refund
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
