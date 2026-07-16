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
  CalendarCheck
} from 'lucide-react';

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');

  // Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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

  // ==========================================
  // OPD QUICK BILLING STATE
  // ==========================================
  const [opdPatientId, setOpdPatientId] = useState('');
  const [opdSlot, setOpdSlot] = useState(100);
  const [opdProcedureDetails, setOpdProcedureDetails] = useState('General Consultation OPD');

  // ==========================================
  // DIAGNOSTICS & LABS STATE
  // ==========================================
  const [labTests, setLabTests] = useState<any[]>([]);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [isNewTestOpen, setIsNewTestOpen] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestCategory, setNewTestCategory] = useState('General');
  const [newTestRate, setNewTestRate] = useState('500');
  const [newTestOutsourced, setNewTestOutsourced] = useState(false);

  // ==========================================
  // PETTY CASH STATE
  // ==========================================
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Hospitality');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // ==========================================
  // PAYROLL STATE
  // ==========================================
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
      setInvoices(data);

      if (user?.role !== 'patient') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList);
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
      setLabTests(tests);
      const requests = await apiClient.get('/lab/requests');
      setLabRequests(requests);
    } catch (err) {
      console.error('Error fetching lab/diagnostics billing data', err);
    }
  };

  const fetchPettyCash = async () => {
    try {
      const exps = await apiClient.get('/expenses');
      setExpenses(exps);
    } catch (err) {
      console.error('Error fetching petty cash ledger', err);
    }
  };

  const fetchPayroll = async () => {
    try {
      const logs = await apiClient.get(`/payroll?month=${payrollMonth}`);
      setPayrollLogs(logs);
    } catch (err) {
      console.error('Error fetching payroll logs', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (user?.role === 'admin' || user?.role === 'accountant') {
      fetchLabDiagnostics();
      fetchPettyCash();
      fetchPayroll();
    }
  }, [user]);

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceLines];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceLines(updated);
  };

  const handleAddLine = () => {
    setInvoiceLines([...invoiceLines, { itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = invoiceLines.filter((_, i) => i !== index);
    setInvoiceLines(updated.length > 0 ? updated : [{ itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/invoices', {
        patientId,
        discount,
        items: invoiceLines.filter(line => line.itemName !== '')
      });
      setIsCreateOpen(false);
      fetchInvoices();
      // Reset
      setPatientId('');
      setDiscount(0);
      setInvoiceLines([{ itemName: '', itemCategory: 'Consultation', unitPrice: 0, quantity: 1 }]);
    } catch (err) {
      alert('Error creating invoice billing records.');
    }
  };

  // ==========================================
  // OPD QUICK BILL SUBMISSION
  // ==========================================
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

  // ==========================================
  // DIAGNOSTICS LAB TEST ACTIONS
  // ==========================================
  const handleCreateLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/lab/tests', {
        name: newTestName,
        category: newTestCategory,
        rate: Number(newTestRate),
        isOutsourced: newTestOutsourced
      });
      setIsNewTestOpen(false);
      fetchLabDiagnostics();
      setNewTestName('');
      setNewTestRate('500');
    } catch (err) {
      alert('Failed to save laboratory diagnostic rate config.');
    }
  };

  const handleDispatchSample = async (id: number) => {
    try {
      await apiClient.put(`/lab/requests/${id}/send`, {});
      fetchLabDiagnostics();
      alert('Specimen dispatch logged in sample tracking ledger.');
    } catch (err) {
      alert('Failed to log sample dispatch.');
    }
  };

  // ==========================================
  // PETTY CASH LEDGER ACTIONS
  // ==========================================
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/expenses', {
        description: expenseDesc,
        category: expenseCategory,
        amount: Number(expenseAmount),
        expenseDate
      });
      setIsNewExpenseOpen(false);
      fetchPettyCash();
      setExpenseDesc('');
      setExpenseAmount('');
    } catch (err) {
      alert('Failed to log petty cash expense.');
    }
  };

  // ==========================================
  // PAYROLL & FORECAST ACTIONS
  // ==========================================
  const handlePayrollMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value;
    setPayrollMonth(m);
    apiClient.get(`/payroll?month=${m}`).then(data => setPayrollLogs(data));
  };

  const handleGenerateForecast = async () => {
    try {
      const data = await apiClient.post('/payroll/forecast', { month: payrollMonth });
      setPayrollForecastData(data);
      fetchPayroll();
      alert(`Payroll forecast computed for month ${payrollMonth}.`);
    } catch (err) {
      alert('Failed to compile upcoming staff payroll forecast.');
    }
  };

  const handlePaySalary = async (id: number) => {
    if (window.confirm('Approve salary disbursement clearance for this staff member?')) {
      try {
        await apiClient.put(`/payroll/${id}/pay`, {});
        fetchPayroll();
        if (payrollForecastData) {
          const data = await apiClient.post('/payroll/forecast', { month: payrollMonth });
          setPayrollForecastData(data);
        }
        alert('Disbursement cleared. Activity logged.');
      } catch (err) {
        alert('Failed to process payroll clearance.');
      }
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
      setIsPayOpen(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Billing & Accounting</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Digitize manual registers: consultations, local diagnostic tests, IPD advances, petty cash logs, and payroll.</p>
        </div>
        {user?.role !== 'patient' && user?.role !== 'nurse' && user?.role !== 'doctor' && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Create Custom Invoice
          </Button>
        )}
      </div>

      {/* Tabs list (RBAC controlled) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'invoices' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Invoices Desk
        </button>
        <button
          onClick={() => setActiveTab('opd')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'opd' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          OPD Quick Billing
        </button>
        {(user?.role === 'admin' || user?.role === 'accountant') && (
          <>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'diagnostics' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Diagnostics Billing
            </button>
            <button
              onClick={() => setActiveTab('petty_cash')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'petty_cash' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Petty Cash ledger
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'payroll' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800'
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
          {/* TAB 1: INVOICES DESK */}
          {activeTab === 'invoices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {invoices.length === 0 ? (
                <Card className="col-span-2 flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No invoices compiled.</p>
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

                      {/* Amount Details */}
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

                      {/* Actions */}
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
          )}

          {/* TAB 2: OPD QUICK BILLING */}
          {activeTab === 'opd' && (
            <Card className="max-w-xl mx-auto border border-slate-200 dark:border-slate-850">
              <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-850">
                <div className="h-10 w-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center">
                  <BriefcaseMedical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">OPD & General Consult Fee Register</h3>
                  <p className="text-xs text-slate-500">Create instant consulting checkouts with pre-fixed billing slots.</p>
                </div>
              </div>
              
              <form onSubmit={handleOpdQuickBillSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
                  <select
                    required
                    value={opdPatientId}
                    onChange={e => setOpdPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="">-- Select Patient File --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.mrNumber || p.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">OPD Consult/Procedure Slot (Rs.)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[100, 200, 400, 500].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setOpdSlot(slot)}
                        className={`py-3 text-xs font-bold border rounded-lg transition-all ${
                          opdSlot === slot
                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-500/20'
                            : 'border-slate-250 text-slate-650 dark:border-slate-800 hover:bg-slate-100/50'
                        }`}
                      >
                        Rs. {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Consultation / Quick Procedure Details"
                  required
                  value={opdProcedureDetails}
                  onChange={e => setOpdProcedureDetails(e.target.value)}
                />

                <Button type="submit" className="w-full mt-4 flex items-center justify-center gap-1.5">
                  <CreditCard className="h-4 w-4" /> Issue OPD Invoice Receipt
                </Button>
              </form>
            </Card>
          )}

          {/* TAB 3: DIAGNOSTICS & LABS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {/* Test Catalog */}
              <Card className="border border-slate-200 dark:border-slate-850">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Diagnostics Fixed Rates Catalog</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage fixed rate local diagnostic scans (e.g. ECG fixed at Rs. 500)</p>
                  </div>
                  <Button onClick={() => setIsNewTestOpen(true)} size="sm" className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Config New Test
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {labTests.map(test => (
                    <div key={test.id} className="p-3 border border-slate-200/60 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-900/30 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{test.name}</h4>
                        <span className="text-[9px] text-slate-500 uppercase">{test.category} {test.isOutsourced && '• Outsourced'}</span>
                      </div>
                      <Badge type="info">Rs. {Number(test.rate).toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Lab Request & Sample Tracking Log */}
              <Card className="border border-slate-200 dark:border-slate-850">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Laboratory Specimen Tracking & Diagnostics Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-450 uppercase text-[9px] font-bold">
                        <th className="py-2.5">Patient Details</th>
                        <th className="py-2.5">Test Required</th>
                        <th className="py-2.5">Ordering Physician</th>
                        <th className="py-2.5">Sample Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                      {labRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 italic">No lab tests logged.</td>
                        </tr>
                      ) : (
                        labRequests.map(req => (
                          <tr key={req.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                            <td className="py-3">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{req.patient?.name}</span>
                              <span className="block text-[10px] text-slate-500 font-mono">{req.patient?.mrNumber}</span>
                            </td>
                            <td className="py-3 font-semibold">{req.testName}</td>
                            <td className="py-3 text-slate-550">{req.doctor?.user?.name || 'Unassigned'}</td>
                            <td className="py-3">
                              <Badge type={
                                req.sampleStatus === 'completed' ? 'success' :
                                req.sampleStatus === 'sent_to_lab' ? 'info' :
                                req.sampleStatus === 'collected' ? 'warning' : 'neutral'
                              }>
                                {req.sampleStatus === 'collected' ? 'Specimen Collected' : req.sampleStatus?.replace(/_/g, ' ')}
                              </Badge>
                              {req.sentToLabAt && (
                                <span className="block text-[8px] text-slate-500 mt-1">Sent: {new Date(req.sentToLabAt).toLocaleTimeString()}</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {req.sampleStatus === 'collected' && (
                                <button
                                  onClick={() => handleDispatchSample(req.id)}
                                  className="inline-flex items-center gap-1 p-1 px-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded text-[9px] font-bold shadow-sm transition-colors"
                                >
                                  <Send className="h-3 w-3" /> Dispatch Sample
                                </button>
                              )}
                              {req.sampleStatus !== 'collected' && (
                                <span className="text-[10px] text-slate-400 italic">Specimen Dispatched</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: PETTY CASH LEDGER */}
          {activeTab === 'petty_cash' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add petty cash log */}
              <Card className="lg:col-span-1 border border-slate-200 dark:border-slate-850 h-fit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850">
                  Log Petty Cash Expenditure
                </h3>
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <Input label="Expense Description / Vendor" required placeholder="e.g. Staff tea, Hospitality soft drinks" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                  <div>
                    <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Expense Category</label>
                    <select
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="Food">Food / Tea</option>
                      <option value="Hospitality">Guest Hospitality</option>
                      <option value="Maintenance">Facility Maintenance</option>
                      <option value="Office Supplies">Office Stationery Supplies</option>
                    </select>
                  </div>
                  <Input label="Amount (Rs.)" required type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                  <Input label="Expenditure Date" type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                  <Button type="submit" className="w-full mt-4 flex items-center justify-center gap-1.5">
                    <PlusCircle className="h-4 w-4" /> Save Ledger Entry
                  </Button>
                </form>
              </Card>

              {/* Petty Cash Table */}
              <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-850">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Daily Expenditures Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-450 uppercase text-[9px] font-bold">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Details</th>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5">Authorized By</th>
                        <th className="py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 italic">No petty cash records.</td>
                        </tr>
                      ) : (
                        expenses.map(exp => (
                          <tr key={exp.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                            <td className="py-3 font-mono">{exp.expenseDate}</td>
                            <td className="py-3 font-semibold">{exp.description}</td>
                            <td className="py-3">
                              <Badge type="neutral">{exp.category}</Badge>
                            </td>
                            <td className="py-3 text-slate-550">{exp.spentBy}</td>
                            <td className="py-3 text-right font-bold text-rose-600 font-mono">Rs. {Number(exp.amount).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: PAYROLL & SALARIES */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Forecast Card and Month selector */}
              <Card className="border border-slate-200 dark:border-slate-850">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-850">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Staff Salaries & Month End Forecasts</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Generate salary forecast invoice items one week prior to month end.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={payrollMonth}
                      onChange={handlePayrollMonthChange}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="2026-06">June 2026</option>
                      <option value="2026-07">July 2026</option>
                      <option value="2026-08">August 2026</option>
                    </select>
                    <Button onClick={handleGenerateForecast} size="sm" className="flex items-center gap-1.5">
                      <CalendarCheck className="h-4 w-4" /> Calculate Forecast Month
                    </Button>
                  </div>
                </div>

                {payrollForecastData && (
                  <div className="p-4 mb-4 bg-brand-500/5 border border-brand-500/20 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-600 block">Total Staff Forecast Expense ({payrollMonth})</span>
                      <p className="text-[10px] text-slate-450 mt-0.5">Calculated based on active employee basic rates & allowances.</p>
                    </div>
                    <span className="text-lg font-extrabold text-brand-600 font-mono">
                      Rs. {Number(payrollForecastData.totalProjectedExpense).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-450 uppercase text-[9px] font-bold">
                        <th className="py-2.5">Staff Name / Role</th>
                        <th className="py-2.5 font-mono">Basic Salary</th>
                        <th className="py-2.5 font-mono">Allowances</th>
                        <th className="py-2.5 font-mono">Deductions</th>
                        <th className="py-2.5 font-mono">Net Salary</th>
                        <th className="py-2.5">Clearance Status</th>
                        <th className="py-2.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                      {payrollLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 italic">No payroll entries computed for this month.</td>
                        </tr>
                      ) : (
                        payrollLogs.map(log => (
                          <tr key={log.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                            <td className="py-3">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{log.user?.name}</span>
                              <span className="block text-[10px] text-slate-500 uppercase mt-0.5">{log.user?.role}</span>
                            </td>
                            <td className="py-3 font-mono">Rs. {Number(log.basicSalary).toLocaleString()}</td>
                            <td className="py-3 font-mono text-emerald-600">+Rs. {Number(log.allowances).toLocaleString()}</td>
                            <td className="py-3 font-mono text-rose-500">-Rs. {Number(log.deductions).toLocaleString()}</td>
                            <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">Rs. {Number(log.netSalary).toLocaleString()}</td>
                            <td className="py-3">
                              <Badge type={log.status === 'paid' ? 'success' : 'warning'}>
                                {log.status}
                              </Badge>
                              {log.paymentDate && (
                                <span className="block text-[8px] text-slate-500 mt-1 font-mono">{new Date(log.paymentDate).toLocaleDateString()}</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {log.status === 'pending' ? (
                                <button
                                  onClick={() => handlePaySalary(log.id)}
                                  className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors"
                                >
                                  <Check className="h-3 w-3" /> Mark Paid
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Settled</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Invoice details sheet drawer */}
      <Drawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={selectedInvoice ? `Itemized Invoice: ID #${selectedInvoice.id}` : 'Invoice detail'}>
        {selectedInvoice && (
          <div className="space-y-6 text-xs text-slate-700 dark:text-slate-350">
            {/* Header branding info */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">LifeFlow EMR Hospital</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Bill Invoice for: {selectedInvoice.patient?.name}</p>
              {selectedInvoice.patient?.mrNumber && <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Patient MRN: {selectedInvoice.patient?.mrNumber}</p>}
              <p className="text-[10px] text-slate-500 mt-0.5">Date generated: {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
            </div>

            {/* Bill Lines */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-450 block">Bill Itemization:</span>
              <div className="border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50 dark:bg-dark-950/20">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-450 uppercase text-[9px] font-bold bg-slate-100/50 dark:bg-dark-950/40">
                      <th className="p-2.5 pl-3">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5 pr-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {selectedInvoice.invoice_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2.5 pl-3 font-semibold text-slate-900 dark:text-slate-200">{item.itemName}</td>
                        <td className="p-2.5">{item.itemCategory}</td>
                        <td className="p-2.5">{item.quantity}</td>
                        <td className="p-2.5 pr-3 text-right font-mono text-slate-900 dark:text-slate-100">Rs. {Number(item.totalPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary calculations */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5 max-w-[240px] ml-auto">
              <div className="flex justify-between">
                <span>Subtotal amount:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-250">Rs. {Number(selectedInvoice.totalAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Discount applied:</span>
                <span className="font-semibold">-Rs. {Number(selectedInvoice.discount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes (8%):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-250">Rs. {Number(selectedInvoice.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <span>Grand Total:</span>
                <span>Rs. {Number(selectedInvoice.grandTotal).toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={() => window.print()} variant="secondary" className="w-full flex items-center gap-1 justify-center mt-6">
              <Printer className="h-4 w-4" /> Print PDF Invoice
            </Button>
          </div>
        )}
      </Drawer>

      {/* Pay Invoice Checkout Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Log Payment Tender">
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {selectedInvoice && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Invoice Reference:</strong> ID #{selectedInvoice.id}</p>
              <p className="mt-1"><strong>Grand Total Bill:</strong> Rs. {Number(selectedInvoice.grandTotal).toLocaleString()}</p>
              <p className="mt-1"><strong>Total Paid Amount:</strong> Rs. {Number(selectedInvoice.paidAmount).toLocaleString()}</p>
            </div>
          )}

          <Input label="Tendering Payment Amount (Rs.)" type="number" step="0.01" required value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} />

          {/* Payment Method (If staff) */}
          <div>
            <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Payment Method</label>
            <select
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="cash">Cash Tendered</option>
              <option value="card">Credit / Debit Card</option>
              <option value="online">Online Payment Portal</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-400 select-none cursor-pointer pt-2">
            <input type="checkbox" checked={insuranceClaimed} onChange={e => setInsuranceClaimed(e.target.checked)} className="rounded border-slate-300 dark:border-slate-850 text-brand-500 focus:ring-brand-500" />
            Claim through Health Insurance Policy
          </label>

          {insuranceClaimed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850 animate-fadeIn">
              <Input label="Insurance Provider Name" required value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} />
              <Input label="Insurance Policy / Card ID" required value={insurancePolicyNum} onChange={e => setInsurancePolicyNum(e.target.value)} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsPayOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Payment Record</Button>
          </div>
        </form>
      </Modal>

      {/* Config New Diagnostics Test Modal */}
      <Modal isOpen={isNewTestOpen} onClose={() => setIsNewTestOpen(false)} title="Configure Diagnostic Test & Fixed Rate">
        <form onSubmit={handleCreateLabTest} className="space-y-4">
          <Input label="Test Name" required placeholder="e.g. Electrocardiogram (ECG)" value={newTestName} onChange={e => setNewTestName(e.target.value)} />
          <Input label="Test Category" required placeholder="e.g. Cardiology Scan" value={newTestCategory} onChange={e => setNewTestCategory(e.target.value)} />
          <Input label="Fixed Rate (Rs.)" required type="number" value={newTestRate} onChange={e => setNewTestRate(e.target.value)} />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 select-none cursor-pointer pt-2">
            <input type="checkbox" checked={newTestOutsourced} onChange={e => setNewTestOutsourced(e.target.checked)} className="rounded border-slate-300 dark:border-slate-850 text-brand-500 focus:ring-brand-500" />
            Mark test as Outsourced / External Lab
          </label>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsNewTestOpen(false)}>Cancel</Button>
            <Button type="submit">Save Rate Configuration</Button>
          </div>
        </form>
      </Modal>

      {/* Log Petty Cash Expense Modal */}
      <Modal isOpen={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} title="Log petty cash expense">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input label="Expense Description / Vendor" required placeholder="e.g. Staff tea, AC Repair" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
          <Input label="Amount (Rs.)" required type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsNewExpenseOpen(false)}>Cancel</Button>
            <Button type="submit">Log Expenditure</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
