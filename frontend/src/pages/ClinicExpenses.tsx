import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Coffee, Plus, Trash2, DollarSign, Calendar, Filter,
  FileText, Search, Printer, Check, Sparkles, TrendingUp, AlertCircle
} from 'lucide-react';

export const ClinicExpenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tea & Refreshment');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/expenses');
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading clinic expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
      alert('Pop-up window blocked. Please allow pop-ups for LifeFlow EMR to print expense vouchers.');
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
          <div class="title">LIFEFLOW MEDICAL CENTER</div>
          <div class="subtitle">PETTY CASH & CLINIC EXPENSE VOUCHER</div>
        </div>

        <div class="box">
          <div class="row"><span class="label">Voucher Ref:</span> <span>EXP-#${exp.id}</span></div>
          <div class="row"><span class="label">Date:</span> <span>${exp.expenseDate}</span></div>
          <div class="row"><span class="label">Category:</span> <span>${exp.category}</span></div>
          <div class="row"><span class="label">Logged By:</span> <span>${exp.spentBy || 'Staff'}</span></div>
          <div class="row" style="margin-top: 8px;"><span class="label">Description:</span> <span>${exp.description}</span></div>
          
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

  // Aggregates Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.expenseDate === todayStr);
  const todayTotal = todayExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const monthStr = todayStr.substring(0, 7);
  const monthExpenses = expenses.filter(e => e.expenseDate && e.expenseDate.startsWith(monthStr));
  const monthTotal = monthExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const teaCount = todayExpenses.filter(e => e.category === 'Tea & Refreshment' || e.description.toLowerCase().includes('tea') || e.description.toLowerCase().includes('chai')).length;

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (e.spentBy && e.spentBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.category && e.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Tea & Refreshment':
        return <Badge type="info" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">☕ Tea & Refreshment</Badge>;
      case 'Stationery & Supplies':
        return <Badge type="info" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">📝 Stationery & Paper</Badge>;
      case 'Hygiene & Cleaning':
        return <Badge type="info" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">🧹 Cleaning & Hygiene</Badge>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Coffee className="h-6 w-6 text-amber-500" /> Clinic & Daily Expenses (Petty Cash Ledger)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record daily clinic expenditures such as Doctor & Staff Tea, Refreshments, Stationery, and Maintenance.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 shadow-md bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="h-4 w-4" /> + Record Daily Expense
        </Button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent dark:from-dark-900 dark:to-dark-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Today's Clinic Expenses</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">Rs. {todayTotal.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">☕ {teaCount} Tea / Refreshment orders today</span>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Coffee className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/[0.03] to-transparent dark:from-dark-900 dark:to-dark-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 block">This Month's Total Expenses</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">Rs. {monthTotal.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">{monthExpenses.length} Total recorded vouchers this month</span>
          </div>
          <div className="p-3 bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Ledger Entries</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">{expenses.length} Entries</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Accessible to Admin & Receptionist</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-300 rounded-2xl">
            <FileText className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* QUICK PRESET EXPENSE CHIPS */}
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
            onClick={() => handleQuickAdd('Evening Doctor & Visitor Tea & Samosa', 'Tea & Refreshment', 350)}
            className="px-3 py-1.5 rounded-lg border border-amber-400 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-all flex items-center gap-1.5"
          >
            ☕ Evening Tea & Snacks (Rs. 350)
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
            <DollarSign className="h-4 w-4 text-amber-500" /> Expense Register Ledger
          </h3>
          <span className="text-xs font-bold text-slate-500 font-mono">{filteredExpenses.length} Records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading daily expense register...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No clinic expense records found. Click "+ Record Daily Expense" to add one!</div>
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
                {filteredExpenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 transition-colors text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{exp.expenseDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getCategoryBadge(exp.category)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{exp.description}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-semibold">{exp.spentBy || 'Staff'}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* RECORD NEW EXPENSE MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record New Clinic Expense">
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

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Check className="h-4 w-4" /> Save Expense Record
          </Button>
        </form>
      </Modal>
    </div>
  );
};
