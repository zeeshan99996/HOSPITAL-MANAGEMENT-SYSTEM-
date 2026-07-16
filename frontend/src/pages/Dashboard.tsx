import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Card } from '../components/UI';
import {
  Users,
  Calendar,
  Bed,
  DollarSign,
  AlertCircle,
  Activity,
  FileSpreadsheet,
  Clock,
  BriefcaseMedical,
  Inbox,
  LayoutGrid,
  UserPlus,
  Ticket,
  Receipt
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/admin/stats');
        setStats(res);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          <div className="h-80 bg-slate-200 dark:bg-dark-900 rounded-xl" />
        </div>
      </div>
    );
  }

  const COLORS = ['#0ea0ea', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const isReceptionist = user?.role === 'receptionist';

  // Staff/Clinical Administrator View
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isReceptionist ? 'Receptionist Portal Dashboard' : 'Clinical Dashboard'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isReceptionist
              ? 'Register patients, log vital metrics, and issue queue tokens.'
              : 'Real-time stats monitor and administrative analytics.'}
          </p>
        </div>
      </div>

      {/* Widgets Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.totalPatients}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Visits</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.todayAppointments}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Bed className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Beds Occupied</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.activeAdmissions}</h3>
          </div>
        </Card>

        {isReceptionist ? (
          <Card className="flex items-center gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Check-in Terminal</p>
              <h3 className="text-xs font-bold mt-1.5 text-brand-600 dark:text-brand-400 uppercase">Vitals & Tokens Active</h3>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Revenue</p>
              <h3 className="text-xl font-bold mt-0.5">Rs. {Number(stats.stats.totalRevenue || 0).toLocaleString()}</h3>
            </div>
          </Card>
        )}
      </div>

      {/* Auxiliary Alerts Row */}
      <div className={`grid grid-cols-1 ${isReceptionist ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-5`}>
        {!isReceptionist && (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/25">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{stats.stats.lowStockMeds} Medicines under Stock Alert</span>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 rounded-xl border border-brand-500/25">
          <Clock className="h-5 w-5 text-brand-500" />
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">Sample tracking & requests active</span>
        </div>
        {!isReceptionist && (
          <div className="flex items-center gap-3 p-3 bg-rose-500/10 rounded-xl border border-rose-500/25">
            <Inbox className="h-5 w-5 text-rose-500" />
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{stats.stats.pendingBills} Pending Unpaid Bills</span>
          </div>
        )}
      </div>

      {/* Visual Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Flow - Hidden for receptionist */}
        {!isReceptionist ? (
          <Card className="lg:col-span-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">Monthly Revenue Flow</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.charts.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea0ea" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea0ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#0ea0ea" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2 mb-4">
                Reception Desk Quick Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/patient-registration'}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Register Patient</span>
                </button>

                <button
                  onClick={() => window.location.href = '/appointments'}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Book Appointment</span>
                </button>

                <button
                  onClick={() => window.location.href = '/token-queue'}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Generate Token</span>
                </button>

                <button
                  onClick={() => window.location.href = '/billing'}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Create Bill</span>
                </button>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 dark:bg-dark-950/40 border border-slate-100 dark:border-slate-850 rounded-lg text-2xs text-slate-550 dark:text-slate-400">
              <strong>System Notice:</strong> Only receptionist actions are authorized on this session. Medical profiles, laboratory results entry, settings configuration and payroll editing are disabled.
            </div>
          </Card>
        )}

        {/* Booking departments distribution */}
        <Card className="flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">Department Distribution</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0ea0ea" radius={[4, 4, 0, 0]}>
                  {stats.charts.departmentStats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Activity Logs Row */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">System Activity Stream</h3>
            <span className="p-1 px-2.5 bg-slate-100 dark:bg-dark-950 text-slate-550 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-850 flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-brand-500 animate-pulse" /> Live Monitoring
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Action</th>
                  <th className="py-2.5">Details</th>
                  <th className="py-2.5">Origin IP</th>
                  <th className="py-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {stats.recentActivity.map((log: any) => (
                  <tr key={log.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                    <td className="py-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{log.user?.name || 'Guest User'}</span>
                      <span className="block text-[10px] text-slate-500 uppercase mt-0.5">{log.user?.role || 'Guest'}</span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'Login' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 max-w-xs truncate">{log.details}</td>
                    <td className="py-3 font-mono text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 text-right text-slate-450">{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
