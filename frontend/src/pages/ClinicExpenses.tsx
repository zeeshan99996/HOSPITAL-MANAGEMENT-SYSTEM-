import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Coffee, Plus, Trash2, DollarSign, Calendar, Filter,
  FileText, Search, Printer, Check, Sparkles, TrendingUp, AlertCircle,
  Users, Briefcase, Wallet, CreditCard, CheckCircle2, Clock
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

export const ClinicExpenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'clinic' | 'payroll' | 'all'>('clinic');

  // Month selector for payroll
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Daily Expense Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tea & Refreshment');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Staff Salary Form State
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(currentMonthStr);
  const [basicSalary, setBasicSalary] = useState('25000');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [salaryNotes, setSalaryNotes] = useState('');
  const [salarySubmitting, setSalarySubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [expensesRes, payrollRes, staffRes] = await Promise.allSettled([
        apiClient.get('/expenses'),
        apiClient.get(`/payroll?month=${selectedMonth}`),
        apiClient.get('/admin/staff')
      ]);

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        setExpenses(Array.isArray(expensesRes.value) ? expensesRes.value : []);
      }

      let loadedStaff: any[] = [];

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        loadedStaff = staffRes.value;
      }

      if (payrollRes.status === 'fulfilled' && payrollRes.value) {
        const pData = payrollRes.value;
        const pList = Array.isArray(pData.payroll) ? pData.payroll : (Array.isArray(pData) ? pData : []);
        setPayrolls(pList);

        if (loadedStaff.length === 0 && Array.isArray(pData.staffMembers)) {
          loadedStaff = pData.staffMembers;
        }
      }

      // If still empty, try fallback to /staff
      if (loadedStaff.length === 0) {
        try {
          const fallbackStaff = await apiClient.get('/staff');
          if (Array.isArray(fallbackStaff)) loadedStaff = fallbackStaff;
        } catch (_) {}
      }

      setStaffList(loadedStaff);
    } catch (err) {
      console.error('Error loading clinic expenses & payroll', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  // Handle staff selection in Salary Modal
  const handleStaffSelect = (staffIdStr: string) => {
    setSelectedStaffId(staffIdStr);
    const staff = staffList.find(s => String(s.id) === staffIdStr);
    if (staff) {
      setBasicSalary(staff.salary ? String(staff.salary) : '25000');
      setAllowances('0');
      setDeductions('0');
    }
  };

  const handleOpenSalaryModal = (prefillStaff?: any) => {
    if (prefillStaff) {
      setSelectedStaffId(String(prefillStaff.id || prefillStaff.staffId));
      setBasicSalary(prefillStaff.salary ? String(prefillStaff.salary) : (prefillStaff.basicSalary ? String(prefillStaff.basicSalary) : '25000'));
      setAllowances(prefillStaff.allowances ? String(prefillStaff.allowances) : '0');
      setDeductions(prefillStaff.deductions ? String(prefillStaff.deductions) : '0');
    } else if (staffList.length > 0) {
      setSelectedStaffId(String(staffList[0].id));
      setBasicSalary(staffList[0].salary ? String(staffList[0].salary) : '25000');
      setAllowances('0');
      setDeductions('0');
    }
    setSalaryMonth(selectedMonth);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setSalaryNotes('');
    setIsSalaryModalOpen(true);
  };

  const handleDisburseSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      alert('Please choose a staff member.');
      return;
    }

    const staff = staffList.find(s => String(s.id) === selectedStaffId);
    const staffName = staff?.name || 'Staff Member';
    const designation = staff?.designation || 'Staff';

    const bSalary = Number(basicSalary) || 0;
    const allow = Number(allowances) || 0;
    const deduct = Number(deductions) || 0;
    const net = bSalary + allow - deduct;

    setSalarySubmitting(true);
    try {
      await apiClient.post('/payroll/disburse', {
        staffId: Number(selectedStaffId),
        staffName,
        designation,
        month: salaryMonth,
        basicSalary: bSalary,
        allowances: allow,
        deductions: deduct,
        netSalary: net,
        paymentDate,
        paymentMethod,
        notes: salaryNotes,
      });

      setIsSalaryModalOpen(false);
      fetchExpenses();
      alert(`✅ Salary of Rs. ${net.toLocaleString()} for ${staffName} disbursed and recorded in Clinic Expenses!`);
    } catch (err: any) {
      alert(`Failed to disburse salary: ${err.message}`);
    } finally {
      setSalarySubmitting(false);
    }
  };

  const handleGenerateForecast = async () => {
    setPayrollLoading(true);
    try {
      await apiClient.post('/payroll/forecast', { month: selectedMonth });
      fetchExpenses();
      alert(`✅ Salary forecast generated for ${selectedMonth}.`);
    } catch (err: any) {
      alert(`Failed to generate forecast: ${err.message}`);
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Please fill in expense description and amount.');
      return;
    }

    try {
      await apiClient.post('/expenses', {
        description,
        category,
        amount: Number(amount),
        expenseDate
      });

      setIsAddModalOpen(false);
      setDescription('');
      setAmount('');
      setCategory('Tea & Refreshment');
      fetchExpenses();
      alert('✅ Clinic expense logged successfully!');
    } catch (err: any) {
      alert(`Failed to log expense: ${err.message}`);
    }
  };

  const handleQuickAdd = async (desc: string, cat: string, amt: number) => {
    try {
      await apiClient.post('/expenses', {
        description: desc,
        category: cat,
        amount: amt,
        expenseDate: new Date().toISOString().split('T')[0]
      });

      fetchExpenses();
      alert(`✅ Quick Expense logged: "${desc}" (Rs. ${amt})`);
    } catch (err: any) {
      alert(`Failed to log quick expense: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (id: number, desc: string) => {
    if (window.confirm(`Are you sure you want to remove expense record "${desc}"?`)) {
      try {
        await apiClient.delete(`/expenses/${id}`);
        fetchExpenses();
      } catch (err: any) {
        alert(`Failed to delete expense: ${err.message}`);
      }
    }
  };

  const handlePrintVoucher = (exp: any) => {
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) {
      alert('Pop-up window blocked. Please allow pop-ups to print expense vouchers.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Voucher - EXP-#${exp.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 440px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #0284c7; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 900; color: #0284c7; }
          .subtitle { font-size: 10px; color: #64748b; }
          .box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 15px 0; background: #f8fafc; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
          .label { font-weight: bold; color: #475569; }
          .amount { font-size: 22px; font-weight: 900; color: #0f172a; text-align: center; margin: 10px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; font-size: 10px; border-top: 1px solid #cbd5e1; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DR. TALHA CLINIC</div>
          <div class="subtitle">PETTY CASH & CLINIC EXPENSE VOUCHER</div>
        </div>

        <div class="box">
          <div class="row"><span class="label">Voucher Ref:</span> <span>EXP-#${escapeHtml(exp.id)}</span></div>
          <div class="row"><span class="label">Date:</span> <span>${escapeHtml(exp.expenseDate)}</span></div>
          <div class="row"><span class="label">Category:</span> <span>${escapeHtml(exp.category)}</span></div>
          <div class="row"><span class="label">Logged By:</span> <span>${escapeHtml(exp.spentBy || 'Staff')}</span></div>
          <div class="row" style="margin-top: 8px;"><span class="label">Description:</span> <span>${escapeHtml(exp.description)}</span></div>
          
          <div class="amount">Rs. ${Number(exp.amount).toLocaleString()}</div>
        </div>

        <div class="footer">
          <div>Claimant Sign: ____________</div>
          <div>Authorized Sign: ____________</div>
        </div>

        <script>
          window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintPaySlip = (pay: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=750');
    if (!printWindow) {
      alert('Pop-up window blocked. Please allow pop-ups to print staff pay slips.');
      return;
    }

    const sName = pay.staffMember?.name || pay.user?.name || pay.staffName || 'Staff Member';
    const sDesig = pay.staffMember?.designation || pay.designation || 'Staff';
    const basic = Number(pay.basicSalary || 0);
    const allow = Number(pay.allowances || 0);
    const deduct = Number(pay.deductions || 0);
    const net = Number(pay.netSalary || 0);
    const pDate = pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Pay Slip - ${sName} (${pay.month})</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; max-width: 550px; margin: 0 auto; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 20px; font-weight: 900; color: #0284c7; }
          .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .badge { display: inline-block; background: #0f172a; color: #fff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 4px; text-transform: uppercase; margin-top: 8px; }
          .emp-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 15px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: 700; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
          .table th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 1px solid #cbd5e1; font-weight: 700; }
          .table td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; font-size: 14px; font-weight: 800; display: flex; justify-content: space-between; color: #166534; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 10px; }
          .sig-line { width: 160px; border-top: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DR. TALHA CLINIC</div>
          <div class="sub">12-B, Main Boulevard, Gulberg III, Lahore • Tel: (042) 35889900</div>
          <div class="badge">OFFICIAL STAFF SALARY PAYMENT SLIP</div>
        </div>

        <div class="emp-box">
          <div class="row"><span class="label">Staff Name:</span> <span class="val">${escapeHtml(sName)}</span></div>
          <div class="row"><span class="label">Designation:</span> <span class="val">${escapeHtml(sDesig)}</span></div>
          <div class="row"><span class="label">Salary Month:</span> <span class="val">${escapeHtml(pay.month)}</span></div>
          <div class="row"><span class="label">Disbursement Date:</span> <span class="val">${pDate}</span></div>
          <div class="row"><span class="label">Payment Mode:</span> <span class="val" style="text-transform: uppercase;">${escapeHtml(pay.paymentMethod || 'CASH')}</span></div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Earnings & Allowances</th>
              <th style="text-align: right;">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary Package</td>
              <td style="text-align: right;">Rs. ${basic.toLocaleString()}</td>
            </tr>
            ${allow > 0 ? `<tr><td>Allowances / Bonus / Overtime</td><td style="text-align: right;">+ Rs. ${allow.toLocaleString()}</td></tr>` : ''}
            ${deduct > 0 ? `<tr><td style="color: #e11d48;">Deductions / Advance Loan Cut</td><td style="text-align: right; color: #e11d48;">- Rs. ${deduct.toLocaleString()}</td></tr>` : ''}
          </tbody>
        </table>

        <div class="total-box">
          <span>Net Salary Disbursed:</span>
          <span>Rs. ${net.toLocaleString()}</span>
        </div>

        <div class="sig-row">
          <div class="sig-line">Employee Signature</div>
          <div class="sig-line">Authorized Sign / Accounts</div>
        </div>

        <script>
          window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Aggregates Calculation
  const todayStr = new Date().toISOString().split('T')[0];

  // Clinic Operating Expenses (Excluding Salary Category)
  const clinicOnlyExpenses = expenses.filter(e => e.category !== 'Staff Salary & Payroll');
  const todayClinicTotal = clinicOnlyExpenses.filter(e => e.expenseDate === todayStr).reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const monthClinicTotal = clinicOnlyExpenses.filter(e => e.expenseDate && e.expenseDate.startsWith(selectedMonth)).reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // Staff Salary Expenses
  const salaryExpenses = expenses.filter(e => e.category === 'Staff Salary & Payroll');
  const monthSalaryTotal = salaryExpenses.filter(e => e.expenseDate && e.expenseDate.startsWith(selectedMonth)).reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // Grand Total Clinic Outflow (Operating + Payroll)
  const grandTotalOutflow = monthClinicTotal + monthSalaryTotal;

  const teaCount = clinicOnlyExpenses.filter(e => (e.category === 'Tea & Refreshment' || e.description.toLowerCase().includes('tea') || e.description.toLowerCase().includes('chai')) && e.expenseDate === todayStr).length;

  // Filtered lists based on current active tab
  const getDisplayExpenses = () => {
    let list = expenses;
    if (activeTab === 'clinic') {
      list = clinicOnlyExpenses;
    } else if (activeTab === 'payroll') {
      list = salaryExpenses;
    }

    return list.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (e.spentBy && e.spentBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (e.category && e.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  };

  const displayExpensesList = getDisplayExpenses();

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Staff Salary & Payroll':
        return <Badge type="success" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">💼 Staff Salary / Pay</Badge>;
      case 'Tea & Refreshment':
        return <Badge type="info" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">☕ Tea & Refreshment</Badge>;
      case 'Stationery & Supplies':
        return <Badge type="info" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold">📝 Stationery & Paper</Badge>;
      case 'Hygiene & Cleaning':
        return <Badge type="info" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-bold">🧹 Cleaning & Hygiene</Badge>;
      case 'Maintenance & Repairs':
        return <Badge type="warning" className="font-bold">🔧 Repairs & Maintenance</Badge>;
      case 'Utilities':
        return <Badge type="danger" className="font-bold">💡 Utility Bills</Badge>;
      default:
        return <Badge type="info" className="font-bold">📦 Clinic Expense</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* PROFESSIONAL EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl text-white">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left Column: Title & Subtitle */}
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Financial Outflow, Petty Cash & Monthly Payroll Suite</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
              <span>Clinic Expenses & Staff Payroll Hub</span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Segregated ledgers for daily clinic petty cash (Tea, Refreshments, Maintenance) and monthly staff salary disbursements.
            </p>
          </div>

          {/* Right Column: Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenSalaryModal()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm border whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/20"
            >
              <Briefcase className="h-4 w-4" />
              <span>Pay Staff Salary</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm border whitespace-nowrap bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-900/20"
            >
              <Plus className="h-4 w-4" />
              <span>Record Daily Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS (SEGREGATED FOR CLINIC VS PAYROLL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Petty Cash */}
        <Card className="p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-transparent dark:from-dark-900 dark:to-dark-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Today's Clinic Expenses</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block font-mono">Rs. {todayClinicTotal.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">☕ {teaCount} Tea / Snack orders</span>
          </div>
          <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Coffee className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 2: This Month's Operating Expenses */}
        <Card className="p-4 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/[0.03] to-transparent dark:from-dark-900 dark:to-dark-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Clinic Expenses ({selectedMonth})</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block font-mono">Rs. {monthClinicTotal.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Excluding staff salaries</span>
          </div>
          <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 3: Staff Salaries Paid This Month */}
        <Card className="p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent dark:from-dark-900 dark:to-dark-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Staff Salaries Paid ({selectedMonth})</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">Rs. {monthSalaryTotal.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Staff Payroll Outflow</span>
          </div>
          <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 4: Combined Total Outflow */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Outflow ({selectedMonth})</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block font-mono">Rs. {grandTotalOutflow.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Clinic + Staff Total</span>
          </div>
          <div className="p-2.5 bg-slate-200/80 dark:bg-dark-800 text-slate-700 dark:text-slate-300 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* DISTINCT TABS NAVIGATION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('clinic')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'clinic'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Clinic Operating Expenses ({clinicOnlyExpenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Staff Salaries & Payroll ({payrolls.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>All Combined Expenses ({expenses.length})</span>
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salary Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-950 font-bold text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* QUICK PRESET EXPENSE CHIPS (Only in Clinic Tab) */}
      {activeTab === 'clinic' && (
        <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" /> Quick Add Common Daily Expenses
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => handleQuickAdd('Staff & Doctor Morning Tea & Biscuits', 'Tea & Refreshment', 200)}
              className="px-3 py-1.5 rounded-lg border border-amber-400 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-all flex items-center gap-1.5"
            >
              ☕ Morning Tea (Rs. 200)
            </button>
            <button
              onClick={() => handleQuickAdd('Evening Doctor & Visitor Tea & Snacks', 'Tea & Refreshment', 350)}
              className="px-3 py-1.5 rounded-lg border border-amber-400 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-all flex items-center gap-1.5"
            >
              ☕ Evening Tea (Rs. 350)
            </button>
            <button
              onClick={() => handleQuickAdd('Reception Paper Rim & Files', 'Stationery & Supplies', 500)}
              className="px-3 py-1.5 rounded-lg border border-blue-400 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-all flex items-center gap-1.5"
            >
              📝 Reception Paper (Rs. 500)
            </button>
            <button
              onClick={() => handleQuickAdd('Cleaning Phenyl & Mop Supplies', 'Hygiene & Cleaning', 300)}
              className="px-3 py-1.5 rounded-lg border border-emerald-400 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
            >
              🧹 Cleaning Supplies (Rs. 300)
            </button>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 2: STAFF SALARIES & PAYROLL REGISTER */}
      {/* ======================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <Card className="p-4 border border-emerald-500/30 bg-emerald-50/30 dark:bg-dark-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Staff Salary Payouts for Month: {selectedMonth}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Disburse salaries for registered Doctors, Nurses, and Staff Members. Paid records automatically log in Clinic Expenses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateForecast}
                disabled={payrollLoading}
                className="text-xs font-bold"
              >
                {payrollLoading ? 'Generating...' : 'Auto-Sync Active Staff'}
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenSalaryModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> + Pay New Salary
              </Button>
            </div>
          </Card>

          {/* Staff Salary Table */}
          <Card className="p-0 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase tracking-wider text-[10px] font-bold">
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3 text-right">Basic Pay</th>
                    <th className="px-4 py-3 text-right">Allowances</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Paid (PKR)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Date & Mode</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No salary records generated for {selectedMonth}. Click "Auto-Sync Active Staff" or "+ Pay New Salary" to disburse!
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((pay: any) => {
                      const sName = pay.staffMember?.name || pay.user?.name || pay.staffName || `Staff #${pay.staffId || pay.userId}`;
                      const sDesig = pay.staffMember?.designation || pay.designation || 'Staff';
                      const isPaid = pay.status === 'paid';

                      return (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-300">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {sName}
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              {pay.staffMember?.phone || pay.user?.phone || 'No Phone'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {sDesig}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold">
                            Rs. {Number(pay.basicSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            +Rs. {Number(pay.allowances || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                            -Rs. {Number(pay.deductions || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            Rs. {Number(pay.netSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <Badge type={isPaid ? 'success' : 'warning'}>
                              {isPaid ? 'Paid' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap text-[11px]">
                            {isPaid ? (
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                  {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : 'Paid'}
                                </span>
                                <span className="text-[9px] uppercase font-bold text-slate-400">
                                  {pay.paymentMethod || 'Cash'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-500 font-bold">Unpaid</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPaid ? (
                                <button
                                  onClick={() => handlePrintPaySlip(pay)}
                                  title="Print Salary Pay Slip"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-500/20"
                                >
                                  <Printer className="h-3.5 w-3.5" /> Pay Slip
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenSalaryModal(pay)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                                >
                                  <DollarSign className="h-3.5 w-3.5" /> Disburse Now
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1 & 3: EXPENSE REGISTER LEDGER (CLINIC / ALL) */}
      {/* ======================================================== */}
      {(activeTab === 'clinic' || activeTab === 'all') && (
        <div className="space-y-4">
          {/* FILTER & SEARCH ROW */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search expense description, spent by..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="all">All Expense Categories</option>
                <option value="Staff Salary & Payroll">💼 Staff Salary & Payroll</option>
                <option value="Tea & Refreshment">☕ Tea & Refreshment</option>
                <option value="Stationery & Supplies">📝 Stationery & Supplies</option>
                <option value="Hygiene & Cleaning">🧹 Hygiene & Cleaning</option>
                <option value="Maintenance & Repairs">🔧 Maintenance & Repairs</option>
                <option value="Utilities">💡 Utilities</option>
                <option value="Miscellaneous">📦 Miscellaneous</option>
              </select>
            </div>
          </Card>

          {/* EXPENSE TABLE REGISTER */}
          <Card className="p-0 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-900/50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                {activeTab === 'clinic' ? 'Clinic Petty Cash Ledger' : 'All Combined Clinic & Payroll Expenses'}
              </h3>
              <span className="text-xs font-bold text-slate-500 font-mono">{displayExpensesList.length} Records</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading expense register...</div>
            ) : displayExpensesList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No expense records found. Click "+ Record Daily Expense" to add one!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase tracking-wider text-[10px] font-bold">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Expense Particulars / Details</th>
                      <th className="px-4 py-3">Logged By</th>
                      <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {displayExpensesList.map((exp: any) => {
                      const isSalaryExp = exp.category === 'Staff Salary & Payroll';
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 transition-colors text-slate-700 dark:text-slate-300">
                          <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{exp.expenseDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{getCategoryBadge(exp.category)}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{exp.description}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-semibold">{exp.spentBy || 'Staff'}</td>
                          <td className={`px-4 py-3 text-right font-mono font-black text-sm ${isSalaryExp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            Rs. {Number(exp.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handlePrintVoucher(exp)}
                                title="Print Expense Voucher"
                                className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-brand-500/10 transition-colors"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id, exp.description)}
                                title="Delete Expense"
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* DISBURSE STAFF SALARY MODAL */}
      <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title="Disburse Staff Salary & Log Pay Expense">
        <form onSubmit={handleDisburseSalarySubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Select Staff Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Select Staff Member *
            </label>
            <select
              required
              value={selectedStaffId}
              onChange={e => handleStaffSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-400 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Select Registered Staff ({staffList.length} Available) --</option>
              {staffList.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} • ({s.designation || 'Staff'}) • Salary: Rs. {Number(s.salary || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Salary Month (YYYY-MM) *
              </label>
              <input
                type="month"
                required
                value={salaryMonth}
                onChange={e => setSalaryMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Disbursement Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Salary Breakdown (PKR)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Basic Salary (Rs.)"
                type="number"
                min="0"
                required
                value={basicSalary}
                onChange={e => setBasicSalary(e.target.value)}
              />
              <Input
                label="Allowances / Bonus (+)"
                type="number"
                min="0"
                value={allowances}
                onChange={e => setAllowances(e.target.value)}
              />
              <Input
                label="Deductions / Advance (-)"
                type="number"
                min="0"
                value={deductions}
                onChange={e => setDeductions(e.target.value)}
              />
            </div>

            {/* Net Salary Calculation Preview */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase">
                Net Pay to Disburse:
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                Rs. {(Math.max(0, (Number(basicSalary) || 0) + (Number(allowances) || 0) - (Number(deductions) || 0))).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="cash">💵 Cash Payment</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📝 Cheque</option>
                <option value="online">📱 Online / JazzCash / EasyPaisa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Remarks / Payment Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared full month salary via bank"
                value={salaryNotes}
                onChange={e => setSalaryNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={salarySubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              {salarySubmitting ? 'Processing Payout...' : 'Confirm Salary Payout & Post Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECORD NEW PETTY CASH EXPENSE MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record New Clinic Operating Expense">
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <Input
            label="Expense Date *"
            type="date"
            required
            value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Expense Category *</label>
            <select
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-bold"
            >
              <option value="Tea & Refreshment">☕ Tea & Staff Refreshments</option>
              <option value="Stationery & Supplies">📝 Office Stationery & Files</option>
              <option value="Hygiene & Cleaning">🧹 Cleaning & Hygiene Supplies</option>
              <option value="Maintenance & Repairs">🔧 Repairs & Equipment Maintenance</option>
              <option value="Utilities">💡 Electricity / Water / Utility Bills</option>
              <option value="Miscellaneous">📦 Other Clinic Expense</option>
            </select>
          </div>

          <Input
            label="Expense Particulars / Description *"
            placeholder="e.g. Doctor & Staff Evening Tea & Biscuits"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <Input
            label="Amount Spent (Rs.) *"
            type="number"
            placeholder="e.g. 250"
            required
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold">
            <Check className="h-4 w-4" /> Save Clinic Expense
          </Button>
        </form>
      </Modal>
    </div>
  );
};
