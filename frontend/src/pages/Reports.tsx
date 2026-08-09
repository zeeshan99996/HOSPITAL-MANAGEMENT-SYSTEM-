import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/UI';
import {
  Download, FileText, Calendar, Filter, Printer,
  Users, BedDouble, DollarSign, TrendingUp, TrendingDown,
  Coffee, AlertCircle, Sparkles, Receipt, Activity, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend, LineChart, Line, ComposedChart
} from 'recharts';

const escapeCsv = (val: any): string => {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

const escapeHtml = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Raw API Data
  const [patients, setPatients] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Daily Date Selector State
  const [selectedDailyDay, setSelectedDailyDay] = useState<number>(() => new Date().getDate());
  const [selectedDailyMonth, setSelectedDailyMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedDailyYear, setSelectedDailyYear] = useState<number>(() => new Date().getFullYear());

  // Month & Year Selector State
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Filter & Category State
  const [reportCategory, setReportCategory] = useState('summary');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const monthStr = String(month).padStart(2, '0');
    const firstDayStr = `${year}-${monthStr}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${monthStr}-${String(lastDayNum).padStart(2, '0')}`;

    setStartDate(firstDayStr);
    setEndDate(lastDayStr);
  };

  const handleResetToToday = () => {
    const now = new Date();
    setSelectedDailyDay(now.getDate());
    setSelectedDailyMonth(now.getMonth() + 1);
    setSelectedDailyYear(now.getFullYear());
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [patientsRes, tokensRes, admissionsRes, invoicesRes, expensesRes] = await Promise.all([
        apiClient.get('/patients').catch(() => []),
        apiClient.get('/tokens').catch(() => []),
        apiClient.get('/admissions').catch(() => []),
        apiClient.get('/invoices').catch(() => []),
        apiClient.get('/expenses').catch(() => [])
      ]);

      setPatients(Array.isArray(patientsRes) ? patientsRes : (patientsRes?.patients || []));
      setTokens(Array.isArray(tokensRes) ? tokensRes : []);
      setAdmissions(Array.isArray(admissionsRes) ? admissionsRes : []);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);
      setExpenses(Array.isArray(expensesRes) ? expensesRes : []);
    } catch (err) {
      console.error('Error fetching reports data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  // Dates Formatting Helpers (Strict Local Date Reset)
  const localNow = new Date();
  const todayStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
  
  const selectedDailyDateStr = `${selectedDailyYear}-${String(selectedDailyMonth).padStart(2, '0')}-${String(selectedDailyDay).padStart(2, '0')}`;
  const selectedDailyLabel = `${selectedDailyMonth}/${selectedDailyDay}/${selectedDailyYear}`;
  const isTodaySelected = selectedDailyDateStr === todayStr;

  const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedMonthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-US', { month: 'long' });

  // ----------------------------------------------------
  // DAILY (SELECTED DAY, MONTH & YEAR) CALCULATIONS
  // ----------------------------------------------------
  const todayTokenPatientIds = new Set(tokens.filter(t => t.createdAt && t.createdAt.startsWith(selectedDailyDateStr)).map(t => Number(t.patientId)));
  const todayPatientsList = patients.filter(p => {
    const isToday = p.createdAt && p.createdAt.startsWith(selectedDailyDateStr);
    return isToday || todayTokenPatientIds.has(Number(p.id));
  });
  const todayOpdCount = todayPatientsList.length;

  const todayAdmissionsList = admissions.filter(a => a.admissionDate && a.admissionDate.startsWith(selectedDailyDateStr));
  const todayIpdCount = todayAdmissionsList.length;

  const todayInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(selectedDailyDateStr));
  const todayInvoicePaid = todayInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
  const todayRegistrationPaid = todayPatientsList.reduce((acc, p) => acc + Number(p.paymentAmount || 0), 0);
  const todayRevenue = todayInvoicePaid + todayRegistrationPaid;

  const todayExpensesList = expenses.filter(e => e.expenseDate === selectedDailyDateStr);
  const todayExpensesTotal = todayExpensesList.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const todayUnpaidDue = todayInvoices.reduce((acc, inv) => {
    const due = Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0);
    return acc + Math.max(0, due);
  }, 0);

  // ----------------------------------------------------
  // MONTHLY (SELECTED MONTH & YEAR) CALCULATIONS
  // ----------------------------------------------------
  const monthTokenPatientIds = new Set(tokens.filter(t => t.createdAt && t.createdAt.startsWith(targetMonthStr)).map(t => Number(t.patientId)));
  const monthPatientsList = patients.filter(p => {
    const isMonth = p.createdAt && p.createdAt.startsWith(targetMonthStr);
    return isMonth || monthTokenPatientIds.has(Number(p.id));
  });
  const monthOpdCount = monthPatientsList.length;

  const monthAdmissionsList = admissions.filter(a => a.admissionDate && a.admissionDate.startsWith(targetMonthStr));
  const monthIpdCount = monthAdmissionsList.length;

  const monthInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(targetMonthStr));
  const monthInvoicePaid = monthInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
  const monthRegistrationPaid = monthPatientsList.reduce((acc, p) => acc + Number(p.paymentAmount || 0), 0);
  const monthRevenue = monthInvoicePaid + monthRegistrationPaid;

  const monthExpensesList = expenses.filter(e => e.expenseDate && e.expenseDate.startsWith(targetMonthStr));
  const monthExpensesTotal = monthExpensesList.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const monthUnpaidDue = monthInvoices.reduce((acc, inv) => {
    const due = Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0);
    return acc + Math.max(0, due);
  }, 0);

  // ----------------------------------------------------
  // CHART DATA SETUP
  // ----------------------------------------------------
  const financialComparisonData = [
    {
      name: `Today (${selectedDailyLabel})`,
      'Revenue Collected': todayRevenue,
      'Clinic Expenses': todayExpensesTotal,
      'Pending Balance Due': todayUnpaidDue
    },
    {
      name: `${selectedMonthName.substring(0, 3)} ${selectedYear}`,
      'Revenue Collected': monthRevenue,
      'Clinic Expenses': monthExpensesTotal,
      'Pending Balance Due': monthUnpaidDue
    }
  ];

  // Day-Wise Trends for Selected Month
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dailyMonthTrendData = Array.from({ length: daysInSelectedMonth }).map((_, i) => {
    const dayNum = i + 1;
    const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayLabel = `${dayNum} ${selectedMonthName.substring(0, 3)}`;

    const dayTokenPatientIds = new Set(tokens.filter(t => t.createdAt && t.createdAt.startsWith(dayStr)).map(t => Number(t.patientId)));
    const dayPatientsList = patients.filter(p => (p.createdAt && p.createdAt.startsWith(dayStr)) || dayTokenPatientIds.has(Number(p.id)));
    const dayOpd = dayPatientsList.length;

    const dayIpd = admissions.filter(a => a.admissionDate && a.admissionDate.startsWith(dayStr)).length;

    const dayInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(dayStr));
    const dayInvoicePaid = dayInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
    const dayRegistrationPaid = dayPatientsList.reduce((acc, p) => acc + Number(p.paymentAmount || 0), 0);
    const dayRev = dayInvoicePaid + dayRegistrationPaid;

    const dayExp = expenses.filter(e => e.expenseDate === dayStr).reduce((acc, e) => acc + Number(e.amount || 0), 0);

    return {
      day: dayLabel,
      'OPD Patients': dayOpd,
      'IPD Admissions': dayIpd,
      'Revenue (Rs.)': dayRev,
      'Expenses (Rs.)': dayExp
    };
  });

  // ----------------------------------------------------
  // GRAPH 2: MONTH-WISE TREND DATA FOR SELECTED YEAR
  // ----------------------------------------------------
  const monthlyYearTrendData = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ].map((mName, i) => {
    const mNum = i + 1;
    const mStr = `${selectedYear}-${String(mNum).padStart(2, '0')}`;

    const mTokenPatientIds = new Set(tokens.filter(t => t.createdAt && t.createdAt.startsWith(mStr)).map(t => Number(t.patientId)));
    const mPatientsList = patients.filter(p => (p.createdAt && p.createdAt.startsWith(mStr)) || mTokenPatientIds.has(Number(p.id)));
    const mOpd = mPatientsList.length;

    const mIpd = admissions.filter(a => a.admissionDate && a.admissionDate.startsWith(mStr)).length;

    const mInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(mStr));
    const mInvoicePaid = mInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
    const mRegistrationPaid = mPatientsList.reduce((acc, p) => acc + Number(p.paymentAmount || 0), 0);
    const mRev = mInvoicePaid + mRegistrationPaid;

    const mExp = expenses.filter(e => e.expenseDate && e.expenseDate.startsWith(mStr)).reduce((acc, e) => acc + Number(e.amount || 0), 0);

    return {
      month: `${mName} ${selectedYear}`,
      'Revenue (Rs.)': mRev,
      'Expenses (Rs.)': mExp,
      'OPD Patients': mOpd,
      'IPD Admissions': mIpd
    };
  });

  // ----------------------------------------------------
  // FILTERED TABLE REGISTER DATA
  // ----------------------------------------------------
  const getFilteredRecords = () => {
    let records: any[] = [];

    if (reportCategory === 'billing') {
      records = invoices.map(inv => ({
        id: `INV-#${inv.id}`,
        date: inv.createdAt ? inv.createdAt.split('T')[0] : 'N/A',
        particulars: `Patient Invoice #${inv.id}`,
        patientName: inv.patient?.name || `Patient #${inv.patientId}`,
        mrn: inv.patient?.mrNumber || 'MR-N/A',
        category: 'Billing Invoice',
        amount: Number(inv.grandTotal || 0),
        paidAmount: Number(inv.paidAmount || 0),
        dueAmount: Math.max(0, Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0)),
        status: inv.status || 'unpaid'
      }));
    } else if (reportCategory === 'expenses') {
      records = expenses.map(e => ({
        id: `EXP-#${e.id}`,
        date: e.expenseDate,
        particulars: e.description,
        patientName: e.spentBy || 'Staff',
        mrn: '-',
        category: e.category || 'Clinic Expense',
        amount: Number(e.amount || 0),
        paidAmount: Number(e.amount || 0),
        dueAmount: 0,
        status: 'completed'
      }));
    } else if (reportCategory === 'pending') {
      records = invoices.filter(inv => Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0) > 0).map(inv => ({
        id: `DUE-#${inv.id}`,
        date: inv.createdAt ? inv.createdAt.split('T')[0] : 'N/A',
        particulars: `Pending Balance Invoice #${inv.id}`,
        patientName: inv.patient?.name || `Patient #${inv.patientId}`,
        mrn: inv.patient?.mrNumber || 'MR-N/A',
        category: 'Unpaid Balance',
        amount: Number(inv.grandTotal || 0),
        paidAmount: Number(inv.paidAmount || 0),
        dueAmount: Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0),
        status: 'UNPAID'
      }));
    } else if (reportCategory === 'intake') {
      records = patients.map(p => ({
        id: `PAT-#${p.id}`,
        date: p.createdAt ? p.createdAt.split('T')[0] : 'N/A',
        particulars: `Patient Intake & OPD Registration`,
        patientName: p.name,
        mrn: p.mrNumber || 'MR-N/A',
        category: 'OPD Patient',
        amount: Number(p.paymentAmount || 100),
        paidAmount: Number(p.paymentAmount || 100),
        dueAmount: 0,
        status: 'registered'
      }));
    } else {
      // Summary / All Records
      records = [
        ...invoices.map(inv => ({
          id: `INV-#${inv.id}`,
          date: inv.createdAt ? inv.createdAt.split('T')[0] : 'N/A',
          particulars: `Billing Invoice #${inv.id}`,
          patientName: inv.patient?.name || `Patient #${inv.patientId}`,
          mrn: inv.patient?.mrNumber || 'MR-N/A',
          category: 'Billing',
          amount: Number(inv.grandTotal || 0),
          paidAmount: Number(inv.paidAmount || 0),
          dueAmount: Math.max(0, Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0)),
          status: inv.status
        })),
        ...expenses.map(e => ({
          id: `EXP-#${e.id}`,
          date: e.expenseDate,
          particulars: e.description,
          patientName: e.spentBy || 'Staff',
          mrn: '-',
          category: 'Expense',
          amount: Number(e.amount || 0),
          paidAmount: Number(e.amount || 0),
          dueAmount: 0,
          status: 'expense'
        }))
      ];
    }

    return records.filter(r => {
      const matchesDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      const matchesQuery = r.particulars.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesQuery;
    });
  };

  const filteredRecords = getFilteredRecords();

  // Export Handlers
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No report records to export.');
      return;
    }
    const headers = 'ID,Date,Particulars,Patient/Staff,MRN,Category,Total Amount,Paid Amount,Due Amount,Status\n';
    const rows = filteredRecords.map(r => 
      `${escapeCsv(r.id)},${escapeCsv(r.date)},${escapeCsv(r.particulars)},${escapeCsv(r.patientName)},${escapeCsv(r.mrn)},${escapeCsv(r.category)},${r.amount},${r.paidAmount},${r.dueAmount},${escapeCsv(r.status)}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_report_${reportCategory}_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Pop-up window blocked. Please allow pop-ups for LifeFlow EMR to print executive reports.');
      return;
    }

    const tableRows = filteredRecords.map(r => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${escapeHtml(r.id)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(r.date)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;"><strong>${escapeHtml(r.particulars)}</strong></td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(r.patientName)} (${escapeHtml(r.mrn)})</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;"><span style="font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-size: 10px;">${escapeHtml(r.category)}</span></td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Rs. ${Number(r.amount).toLocaleString()}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-weight: bold;">Rs. ${Number(r.paidAmount).toLocaleString()}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${r.dueAmount > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">Rs. ${Number(r.dueAmount).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Executive Operational Report - ${startDate} to ${endDate}</title>
        <style>
          @page { size: auto; margin: 12mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 22px; font-weight: 900; color: #0284c7; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; text-align: center; }
          .kpi-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
          .table-report { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          .table-report th { background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">DR. TALHA CLINIC</div>
            <div class="subtitle">Operational & Financial Analytics Executive Report</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>Report Date: <strong>${new Date().toLocaleDateString()}</strong></div>
            <div>Period: <strong>${startDate} to ${endDate}</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Today's OPD / IPD</div>
            <div class="kpi-val">${todayOpdCount} OPD • ${todayIpdCount} IPD</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Today's Revenue</div>
            <div class="kpi-val" style="color: #16a34a;">Rs. ${todayRevenue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Today's Expenses</div>
            <div class="kpi-val" style="color: #d97706;">Rs. ${todayExpensesTotal.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Today's Pending Due</div>
            <div class="kpi-val" style="color: #dc2626;">Rs. ${todayUnpaidDue.toLocaleString()}</div>
          </div>
        </div>

        <div class="kpi-grid" style="margin-top: -10px;">
          <div class="kpi-card">
            <div class="kpi-title">Monthly OPD / IPD</div>
            <div class="kpi-val">${monthOpdCount} OPD • ${monthIpdCount} IPD</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Monthly Revenue</div>
            <div class="kpi-val" style="color: #16a34a;">Rs. ${monthRevenue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Monthly Expenses</div>
            <div class="kpi-val" style="color: #d97706;">Rs. ${monthExpensesTotal.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Monthly Pending Due</div>
            <div class="kpi-val" style="color: #dc2626;">Rs. ${monthUnpaidDue.toLocaleString()}</div>
          </div>
        </div>

        <table class="table-report">
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>Date</th>
              <th>Particulars</th>
              <th>Patient / Staff</th>
              <th style="text-align: center;">Category</th>
              <th style="text-align: right;">Total (Rs.)</th>
              <th style="text-align: right;">Paid (Rs.)</th>
              <th style="text-align: right;">Due (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Official Computer Generated Executive Summary Report • LifeFlow EMR System
        </div>

        <script>
          window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-500" /> Operational & Financial Reporting Desk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily & monthly executive stats, patient volume tallies, revenue collections, clinic expenses, and outstanding balance ledgers.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExportCSV} variant="secondary" className="flex-1 sm:flex-none flex items-center gap-1.5 justify-center shadow-sm">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center gap-1.5 justify-center shadow-sm">
            <Printer className="h-4 w-4" /> Export / Print Report
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 1: DAILY EXECUTIVE SUMMARY CARDS (DAY/MON/YR) */}
      {/* ---------------------------------------------------- */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 bg-slate-100/80 dark:bg-dark-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-850">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Daily Summary ({selectedDailyLabel})
            </span>
          </div>

          {/* Day, Month, Year Selectors for Daily Summary */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Select Date:</span>
            
            {/* Day Dropdown */}
            <select
              value={selectedDailyDay}
              onChange={e => setSelectedDailyDay(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>

            {/* Month Dropdown */}
            <select
              value={selectedDailyMonth}
              onChange={e => setSelectedDailyMonth(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              {[
                { val: 1, name: 'Jan' },
                { val: 2, name: 'Feb' },
                { val: 3, name: 'Mar' },
                { val: 4, name: 'Apr' },
                { val: 5, name: 'May' },
                { val: 6, name: 'Jun' },
                { val: 7, name: 'Jul' },
                { val: 8, name: 'Aug' },
                { val: 9, name: 'Sep' },
                { val: 10, name: 'Oct' },
                { val: 11, name: 'Nov' },
                { val: 12, name: 'Dec' },
              ].map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={selectedDailyYear}
              onChange={e => setSelectedDailyYear(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {!isTodaySelected && (
              <button
                onClick={handleResetToToday}
                className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-extrabold transition-all shadow-sm"
              >
                Reset Today
              </button>
            )}

            <Badge type={isTodaySelected ? 'info' : 'warning'}>
              {isTodaySelected ? 'Daily Realtime' : 'Historical Day'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Today OPD Patients */}
          <Card className="p-3.5 border border-brand-500/20 bg-gradient-to-br from-white to-brand-500/[0.03] dark:from-dark-900 dark:to-dark-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today OPD Patients</span>
              <Users className="h-4 w-4 text-brand-500" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-2 block font-mono">{todayOpdCount}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">OPD consultations today</span>
          </Card>

          {/* Today IPD Admissions */}
          <Card className="p-3.5 border border-purple-500/20 bg-gradient-to-br from-white to-purple-500/[0.03] dark:from-dark-900 dark:to-dark-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today IPD Admit</span>
              <BedDouble className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-2 block font-mono">{todayIpdCount}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Ward bed admissions today</span>
          </Card>

          {/* Today Revenue Collected */}
          <Card className="p-3.5 border border-emerald-500/20 bg-gradient-to-br from-white to-emerald-500/[0.03] dark:from-dark-900 dark:to-dark-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today Revenue</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block font-mono">
              Rs. {todayRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-500 mt-1 block font-semibold">Cash collected today</span>
          </Card>

          {/* Today Clinic Expenses */}
          <Card className="p-3.5 border border-amber-500/20 bg-gradient-to-br from-white to-amber-500/[0.03] dark:from-dark-900 dark:to-dark-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today Expenses</span>
              <Coffee className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 block font-mono">
              Rs. {todayExpensesTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-500 mt-1 block font-semibold">Petty cash spent today</span>
          </Card>

          {/* Today Pending Due Balance */}
          <Card className="p-3.5 border border-rose-500/20 bg-gradient-to-br from-white to-rose-500/[0.03] dark:from-dark-900 dark:to-dark-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today Pending Due</span>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 block font-mono">
              Rs. {todayUnpaidDue.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-500 mt-1 block font-semibold">Uncollected balance today</span>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: MONTHLY (SELECTED MONTH & YEAR) SUMMARY  */}
      {/* ---------------------------------------------------- */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 bg-slate-100/80 dark:bg-dark-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-850">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Monthly Summary ({selectedMonthName.toUpperCase()} {selectedYear})
            </span>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Select Month/Year:</span>
            <select
              value={selectedMonth}
              onChange={e => handleMonthYearChange(Number(e.target.value), selectedYear)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              {[
                { val: 1, name: 'January' },
                { val: 2, name: 'February' },
                { val: 3, name: 'March' },
                { val: 4, name: 'April' },
                { val: 5, name: 'May' },
                { val: 6, name: 'June' },
                { val: 7, name: 'July' },
                { val: 8, name: 'August' },
                { val: 9, name: 'September' },
                { val: 10, name: 'October' },
                { val: 11, name: 'November' },
                { val: 12, name: 'December' },
              ].map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => handleMonthYearChange(selectedMonth, Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Badge type="info">{selectedMonthName} {selectedYear}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Monthly OPD Patients */}
          <Card className="p-3.5 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly OPD Patients</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-2 block font-mono">{monthOpdCount}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Total OPD visits this month</span>
          </Card>

          {/* Monthly IPD Admissions */}
          <Card className="p-3.5 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly IPD Admit</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-2 block font-mono">{monthIpdCount}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Total ward admissions this month</span>
          </Card>

          {/* Monthly Revenue Collected */}
          <Card className="p-3.5 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Revenue</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block font-mono">
              Rs. {monthRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-500 mt-1 block font-semibold">Total cash collected this month</span>
          </Card>

          {/* Monthly Expenses Total */}
          <Card className="p-3.5 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Expenses</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 block font-mono">
              Rs. {monthExpensesTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-500 mt-1 block font-semibold">Total clinic expenses this month</span>
          </Card>

          {/* Monthly Pending Due Balance */}
          <Card className="p-3.5 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Pending Due</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 block font-mono">
              Rs. {monthUnpaidDue.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-500 mt-1 block font-semibold">Total outstanding due balance</span>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 3: VISUAL ANALYTICS & DUAL SEPARATE CHARTS  */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Financial Analytics Comparison (Bar Chart) */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" /> Financial Analytics Comparison
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Compare Revenue Collected vs Clinic Expenses vs Pending Due Balances</p>
            </div>
            <Badge type="info">Financial Bar Graph</Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Revenue Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Clinic Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending Balance Due" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Day-Wise Patient Volume & Financial Trend (Line Chart) */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-500" /> Patient Volume & Revenue Trend ({selectedMonthName} {selectedYear})
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Daily trend analysis of OPD visits, IPD admissions, and revenue</p>
            </div>
            <Badge type="info">Patient Line Graph ({selectedMonthName})</Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMonthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={daysInSelectedMonth > 20 ? 1 : 0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(value: any, name: any) => [
                    name.includes('Rs.') ? `Rs. ${Number(value).toLocaleString()}` : `${value} Patients`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="OPD Patients" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="IPD Admissions" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Revenue (Rs.)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Expenses (Rs.)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 4: FILTERABLE REPORTS REGISTER TABLE         */}
      {/* ---------------------------------------------------- */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-full md:w-72">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Report Category</label>
            <select
              value={reportCategory}
              onChange={e => setReportCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="summary">📊 Daily & Monthly Executive Summary</option>
              <option value="billing">💵 Daily Billing Collection Log</option>
              <option value="expenses">☕ Daily & Monthly Clinic Expenses Log</option>
              <option value="pending">📉 Outstanding Pending Balances Ledger</option>
              <option value="intake">📋 Patient Registration & Intake Log</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Search</label>
              <input
                type="text"
                placeholder="Search ref ID, patient, MRN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase tracking-wider text-[10px] font-bold">
                <th className="px-4 py-3">Ref ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Particulars / Details</th>
                <th className="px-4 py-3">Patient / Staff</th>
                <th className="px-4 py-3 text-center">Category</th>
                <th className="px-4 py-3 text-right">Total (Rs.)</th>
                <th className="px-4 py-3 text-right">Paid (Rs.)</th>
                <th className="px-4 py-3 text-right">Due (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading operational report data...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No report records found matching the selected date range and filter criteria.</td>
                </tr>
              ) : (
                filteredRecords.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 transition-colors text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{row.id}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{row.particulars}</td>
                    <td className="px-4 py-3 font-semibold">
                      {row.patientName} <span className="text-[10px] text-slate-400 block font-mono">{row.mrn}</span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-dark-900 text-slate-700 dark:text-slate-300">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">Rs. {Number(row.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {Number(row.paidAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      Rs. {Number(row.dueAmount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
