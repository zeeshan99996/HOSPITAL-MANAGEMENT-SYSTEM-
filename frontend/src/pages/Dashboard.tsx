import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Card, Button, Badge } from '../components/UI';
import {
  Users,
  Calendar,
  Bed,
  AlertCircle,
  Activity,
  FileSpreadsheet,
  Clock,
  BriefcaseMedical,
  Inbox,
  UserPlus,
  UserCheck,
  Ticket,
  Receipt,
  CheckCircle,
  Play,
  Eye,
  Pill,
  Stethoscope
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/stats');
      setStats(res);
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleDoctorTokenStatus = async (tokenId: number, status: 'waiting' | 'processing' | 'completed') => {
    try {
      await apiClient.put(`/tokens/${tokenId}/status`, { status });
      fetchStats();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

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
  const isDoctor = user?.role === 'doctor' || stats?.isDoctorView;
  const isReceptionist = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';

  // =========================================================================
  // DOCTOR SPECIFIC DASHBOARD VIEW
  // =========================================================================
  if (isDoctor) {
    const docInfo = stats?.doctorInfo || {};
    const queueList: any[] = stats?.doctorQueueList || [];

    return (
      <div className="space-y-6">
        {/* Doctor Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 text-white shadow-xl border border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-400/30 flex items-center justify-center font-black text-xl">
              <Stethoscope className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Welcome, {docInfo.name || 'Doctor Portal'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {docInfo.specialization || 'OPD Consultant Physician'} • Location: <span className="text-brand-400 font-bold">{docInfo.roomNumber || 'Room 101'}</span>
              </p>
            </div>
          </div>
          <Badge type="success">Active Doctor OPD Duty</Badge>
        </div>

        {/* Doctor-Specific KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="flex items-center gap-4 border border-brand-500/20">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Total Patients Today</p>
              <h3 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{stats.stats.todayPatients || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-4 border border-emerald-500/20">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Checkup Completed</p>
              <h3 className="text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{stats.stats.completedPatients || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-4 border border-amber-500/20">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remaining / Waiting</p>
              <h3 className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">{stats.stats.remainingPatients || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-4 border border-indigo-500/20">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Bed className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Admitted Patients</p>
              <h3 className="text-xl font-bold mt-0.5 text-indigo-600 dark:text-indigo-400">{stats.stats.activeAdmissions || 0}</h3>
            </div>
          </Card>
        </div>

        {/* Doctor's Today Patient OPD Queue Table */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Ticket className="h-4.5 w-4.5 text-brand-500" /> My OPD Consultation Queue Today ({queueList.length} Patients)
              </h3>
              <p className="text-[11px] text-slate-500">Live patient sequence assigned specifically to your consultation room.</p>
            </div>
            <Button onClick={fetchStats} variant="secondary" className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" /> Sync Queue
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-950/60 text-slate-450 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="px-5 py-3.5">Token #</th>
                  <th className="px-5 py-3.5">Patient Name & MR#</th>
                  <th className="px-5 py-3.5">Age / Gender</th>
                  <th className="px-5 py-3.5">Contact Phone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Doctor Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {queueList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-450 text-xs">
                      No patients in your consultation queue today yet.
                    </td>
                  </tr>
                ) : (
                  queueList.map((t: any) => {
                    const pat = t.patient || {};
                    const isProcessing = t.status === 'processing';
                    const isCompleted = t.status === 'completed';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                        <td className="px-5 py-4 font-mono">
                          <span className="px-2.5 py-1 rounded-md font-black text-xs bg-slate-100 dark:bg-dark-900 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-800">
                            {t.tokenNumber}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-extrabold text-slate-900 dark:text-white block text-xs">{pat.name || 'Patient'}</span>
                          <span className="text-[10px] font-mono text-slate-450 block mt-0.5">MRN: {pat.mrNumber || 'N/A'}</span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-slate-800 dark:text-slate-200 capitalize text-xs">
                            {pat.age ? `${pat.age} Yrs` : 'N/A'} • {pat.gender || 'male'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs">
                          {pat.phone || 'N/A'}
                        </td>

                        <td className="px-5 py-4">
                          <Badge type={isCompleted ? 'success' : isProcessing ? 'info' : 'warning'}>
                            {isCompleted ? 'COMPLETED' : isProcessing ? 'IN ROOM' : 'WAITING'}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {!isCompleted && !isProcessing && (
                              <button
                                onClick={() => handleDoctorTokenStatus(t.id, 'processing')}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <Play className="h-3.5 w-3.5" /> Call Next
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                onClick={() => handleDoctorTokenStatus(t.id, 'completed')}
                                className="px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Complete Checkup
                              </button>
                            )}

                            <button
                              onClick={() => window.location.href = `/patients`}
                              className="px-2 py-1.5 bg-slate-100 dark:bg-dark-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-all text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" /> EMR Record
                            </button>
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
    );
  }

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
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today Patient (OPD)</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.todayPatients || stats.stats.todayAppointments || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Bed className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admit Patient (IPD)</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.activeAdmissions || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Checkups</p>
            <h3 className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">{stats.stats.pendingCheckups || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered Patients</p>
            <h3 className="text-xl font-bold mt-0.5">{stats.stats.totalPatients}</h3>
          </div>
        </Card>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  onClick={() => window.location.href = '/old-patient'}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Old Patient</span>
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

      {/* Live OPD Doctor Token & Patient Queue Monitor */}
      {stats?.liveDoctorsQueue && stats.liveDoctorsQueue.length > 0 && (
        <Card className="p-5 border border-brand-500/30 bg-gradient-to-br from-white via-slate-50/50 to-brand-500/[0.03] dark:from-dark-900 dark:to-dark-950 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Ticket className="h-4.5 w-4.5 text-brand-500" /> Live OPD Doctor Tokens & Patient Queue Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time monitor showing active consultation tokens, patient names, and queue totals per doctor.
              </p>
            </div>
            <span className="p-1 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/25 flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Live Queue Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.liveDoctorsQueue.map((doc: any) => (
              <div key={doc.doctorId} className="p-4 bg-white dark:bg-dark-950 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                      {doc.doctorName}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500 block capitalize">
                      {doc.specialization} • {doc.roomNumber}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    doc.opdStatus === 'in_consultation'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                  }`}>
                    {doc.opdStatus === 'in_consultation' ? 'In Room' : 'Available'}
                  </span>
                </div>

                {/* Current Active Token Box */}
                <div className="p-3 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-100 dark:border-slate-850 space-y-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Current Running Token</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-black text-brand-600 dark:text-brand-400 tracking-tight font-mono">
                      {doc.currentToken}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[110px]" title={doc.currentPatientName}>
                      {doc.currentPatientName}
                    </span>
                  </div>
                </div>

                {/* Queue Summary Counter */}
                <div className="grid grid-cols-3 gap-1 text-center pt-1 border-t border-slate-100 dark:border-slate-850 text-[10px]">
                  <div>
                    <span className="text-[9px] text-slate-450 block font-bold">Total Today</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{doc.totalPatientsToday}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-bold">Waiting</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">{doc.waitingQueueCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-bold">Done</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{doc.completedCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity Logs Row - Only visible to Admin */}
      {isAdmin && (
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
                  {stats.recentActivity?.map((log: any) => (
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
      )}
    </div>
  );
};
