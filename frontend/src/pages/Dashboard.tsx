import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Card, Button, Badge, Drawer } from '../components/UI';
import { DoctorEMRModal } from '../components/DoctorEMRModal';
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
  CheckCircle,
  CheckCircle2,
  Play,
  Eye,
  Pill,
  Stethoscope,
  Thermometer,
  MapPin,
  Search,
  Plus,
  RefreshCw,
  ArrowRight,
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // EMR Drawer & Modal State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Doctor Interactive EMR Modal State
  const [isDoctorEMROpen, setIsDoctorEMROpen] = useState(false);
  const [emrPatientId, setEmrPatientId] = useState<number | null>(null);
  const [emrTokenId, setEmrTokenId] = useState<number | null>(null);
  const [emrTokenNumber, setEmrTokenNumber] = useState<string | null>(null);

  // Doctor Patient Quick Search
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [doctorQueueFilter, setDoctorQueueFilter] = useState<'all' | 'in_room' | 'waiting' | 'completed'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOpenDoctorEMR = (pId: number, tId?: number, tNum?: string) => {
    setEmrPatientId(pId);
    setEmrTokenId(tId || null);
    setEmrTokenNumber(tNum || null);
    setIsDoctorEMROpen(true);
  };

  const handleDoctorSearch = async (q: string) => {
    setDoctorSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient.get('/patients');
      const all: any[] = Array.isArray(res) ? res : (res?.patients || []);
      const lower = q.toLowerCase();
      const matched = all.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.mrNumber && p.mrNumber.toLowerCase().includes(lower)) ||
        (p.phone && p.phone.includes(q))
      ).slice(0, 6);
      setSearchResults(matched);
    } catch (e) {
      console.warn('Doctor search error', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenEMR = async (patientId: number) => {
    if (!patientId) return;
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const data = await apiClient.get(`/patients/${patientId}`);
      setSelectedPatient(data);
    } catch (err) {
      console.error('Error fetching patient EMR details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/stats');
      setStats(res || {});
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
      setStats({});
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
  const safeStats = stats?.stats || {};
  const safeCharts = stats?.charts || { monthlyRevenue: [], departmentStats: [] };
  const safeDoctorsQueue = stats?.liveDoctorsQueue || [];
  const safeRecentActivity = stats?.recentActivity || [];

  const isDoctor = user?.role === 'doctor' || stats?.isDoctorView;
  const isReceptionist = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';

  // =========================================================================
  // DOCTOR SPECIFIC DASHBOARD VIEW
  // =========================================================================
  if (isDoctor) {
    const docInfo = stats?.doctorInfo || {};
    const queueList: any[] = stats?.doctorQueueList || [];

    const inRoomList = queueList.filter((t: any) => t.status === 'processing');
    const waitingList = queueList.filter((t: any) => t.status === 'waiting' || !t.status);
    const completedList = queueList.filter((t: any) => t.status === 'completed');

    const filteredQueue = queueList.filter((t: any) => {
      if (doctorQueueFilter === 'in_room') return t.status === 'processing';
      if (doctorQueueFilter === 'waiting') return t.status === 'waiting' || !t.status;
      if (doctorQueueFilter === 'completed') return t.status === 'completed';
      return true;
    });

    const completionRate = (safeStats.todayPatients && safeStats.todayPatients > 0)
      ? Math.round(((safeStats.completedPatients || 0) / safeStats.todayPatients) * 100)
      : 0;

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* EXECUTIVE DOCTOR HERO BANNER */}
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white shadow-2xl border border-slate-800/80">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -top-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Doctor Identity Block */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-500/30 ring-4 ring-white/10 shrink-0">
                <Stethoscope className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Welcome, {docInfo.name || user?.name || 'Dr. Talha'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> On OPD Duty
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-2 flex-wrap">
                  <span>{docInfo.specialization || 'OPD Consultant Physician'}</span>
                  <span className="text-slate-500">•</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-brand-400 font-bold border border-slate-700/60 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location: {docInfo.roomNumber || 'Room 101'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Action Hub */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <button
                onClick={() => {
                  fetchStats();
                  setIsSyncing(true);
                  setTimeout(() => setIsSyncing(false), 600);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 hover:shadow-lg"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-brand-400' : ''}`} />
                <span>Sync Queue</span>
              </button>

              <button
                onClick={() => {
                  if (queueList.length > 0) {
                    const firstWaiting = queueList.find(t => t.status !== 'completed');
                    if (firstWaiting) {
                      handleOpenDoctorEMR(firstWaiting.patient?.id || firstWaiting.patientId, firstWaiting.id, firstWaiting.tokenNumber);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-brand-500/25"
              >
                <Plus className="h-4 w-4" />
                <span>Direct EMR Consult</span>
              </button>
            </div>

          </div>
        </div>

        {/* SPOTLIGHT COMMAND SEARCH BAR */}
        <div className="relative">
          <div className="flex items-center gap-3 bg-white dark:bg-dark-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-500 shrink-0">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search any hospital patient by Name, MR Number, or Phone to launch EMR consultation..."
              value={doctorSearchQuery}
              onChange={e => handleDoctorSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-semibold"
            />
            {isSearching && <span className="text-[10px] text-slate-400 animate-pulse font-medium">Searching Patient Records...</span>}
            {doctorSearchQuery && (
              <button
                onClick={() => { setDoctorSearchQuery(''); setSearchResults([]); }}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 font-bold"
              >
                Clear
              </button>
            )}
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-950 text-slate-400 text-[10px] font-mono border border-slate-200 dark:border-slate-800">
              Instant Search
            </span>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-100 dark:divide-slate-850 animate-in fade-in zoom-in-95 duration-150">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    handleOpenDoctorEMR(p.id);
                    setDoctorSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-3.5 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black flex items-center justify-center text-xs border border-brand-500/20">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white text-xs block font-bold">{p.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        MRN: <strong className="text-brand-600">{p.mrNumber}</strong> • Phone: {p.phone || 'N/A'} • {p.age ? `${p.age} Yrs` : ''} ({p.gender || 'N/A'})
                      </span>
                    </div>
                  </div>
                  <Button size="sm" className="text-[11px] font-black py-1.5 px-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-sm flex items-center gap-1">
                    <span>Open EMR</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4 EXECUTIVE KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Total Patients */}
          <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Assigned Patients</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{safeStats.todayPatients || 0}</h3>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 font-medium">Total OPD tokens allocated today</p>
          </div>

          {/* Checkup Completed */}
          <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-emerald-500/20 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checkups Completed</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{safeStats.completedPatients || 0}</h3>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{completionRate}% Completed</span>
              <div className="w-20 bg-slate-100 dark:bg-dark-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Remaining / Waiting */}
          <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-amber-500/20 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting In Queue</p>
                <h3 className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">{safeStats.remainingPatients || 0}</h3>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-3 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Patients waiting in lobby
            </p>
          </div>

          {/* Admitted Inpatients */}
          <div
            onClick={() => navigate('/admissions')}
            className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-indigo-500/20 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer hover:border-indigo-500/50"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admitted Inpatients</p>
                <h3 className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">{safeStats.activeAdmissions || 0}</h3>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Bed className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-indigo-500/80 dark:text-indigo-400/80 mt-3 font-semibold flex items-center justify-between">
              <span>Under active ward care</span>
              <span className="text-[10px] font-bold text-brand-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Ward →
              </span>
            </p>
          </div>

        </div>

        {/* DOCTOR LIVE CONSULTATION QUEUE WORKSPACE */}
        <div className="p-6 bg-white dark:bg-dark-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          
          {/* Table Header & Filter Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Ticket className="h-4 w-4 text-brand-500" />
                <span>Live OPD Consultation Queue Today</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-[10px] font-black border border-brand-500/20">
                  {queueList.length} Patients
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Live queue of patients assigned specifically to your consultation room.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-dark-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDoctorQueueFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  doctorQueueFilter === 'all'
                    ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({queueList.length})
              </button>

              <button
                type="button"
                onClick={() => setDoctorQueueFilter('in_room')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  doctorQueueFilter === 'in_room'
                    ? 'bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                In Room ({inRoomList.length})
              </button>

              <button
                type="button"
                onClick={() => setDoctorQueueFilter('waiting')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  doctorQueueFilter === 'waiting'
                    ? 'bg-white dark:bg-dark-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Waiting ({waitingList.length})
              </button>

              <button
                type="button"
                onClick={() => setDoctorQueueFilter('completed')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  doctorQueueFilter === 'completed'
                    ? 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Completed ({completedList.length})
              </button>
            </div>
          </div>

          {/* Queue Data Table */}
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-dark-950 text-slate-450 uppercase text-[10px] tracking-wider font-bold">
                  <th className="px-5 py-3.5">Token #</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Age / Gender</th>
                  <th className="px-5 py-3.5">Contact Phone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Clinical EMR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-dark-950 text-slate-400">
                          <Ticket className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">No patients match this filter</p>
                        <p className="text-[11px] text-slate-400">Patients will appear here automatically when reception issues OPD tokens for your room.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((t: any) => {
                    const pat = t.patient || {};
                    const isProcessing = t.status === 'processing';
                    const isCompleted = t.status === 'completed';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-950/40 text-slate-700 dark:text-slate-300 transition-colors">
                        
                        {/* Token Number */}
                        <td className="px-5 py-4 font-mono">
                          <span className="px-3 py-1.5 rounded-xl font-black text-xs bg-slate-900 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
                            {t.tokenNumber}
                          </span>
                        </td>

                        {/* Patient Name & MRN */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-500/10 to-indigo-500/10 text-brand-600 dark:text-brand-400 font-black flex items-center justify-center text-xs border border-brand-500/20 shrink-0">
                              {(pat.name || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 dark:text-white block text-xs">{pat.name || 'Patient'}</span>
                              <span className="text-[10px] font-mono text-slate-400 block">MRN: {pat.mrNumber || 'N/A'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Age & Gender */}
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-950 text-slate-700 dark:text-slate-300 text-xs font-semibold capitalize border border-slate-200/50 dark:border-slate-800">
                            {pat.age ? `${pat.age} Yrs` : 'N/A'} • {pat.gender || 'male'}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {pat.phone || 'N/A'}
                        </td>

                        {/* Status Pill */}
                        <td className="px-5 py-4">
                          {isCompleted ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800">
                              ✓ Completed
                            </span>
                          ) : isProcessing ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> In Room (Active)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                              ⏳ Waiting
                            </span>
                          )}
                        </td>

                        {/* Clinical Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!isCompleted && !isProcessing && (
                              <button
                                onClick={() => {
                                  handleDoctorTokenStatus(t.id, 'processing');
                                  handleOpenDoctorEMR(pat.id || t.patientId, t.id, t.tokenNumber);
                                }}
                                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                              >
                                <Play className="h-3.5 w-3.5" /> Call & Consult
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                onClick={() => handleOpenDoctorEMR(pat.id || t.patientId, t.id, t.tokenNumber)}
                                className="px-3.5 py-2 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white rounded-xl transition-all text-xs font-black flex items-center gap-1.5 shadow-lg shadow-brand-500/30 animate-pulse"
                              >
                                <Stethoscope className="h-3.5 w-3.5" /> Write EMR & Rx
                              </button>
                            )}

                            {isCompleted && (
                              <button
                                onClick={() => handleOpenDoctorEMR(pat.id || t.patientId, t.id, t.tokenNumber)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-dark-950 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800"
                              >
                                <Eye className="h-3.5 w-3.5" /> View EMR File
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

        </div>

        {/* INTERACTIVE DOCTOR EMR CLINICAL CONSULTATION SUITE */}
        <DoctorEMRModal
          isOpen={isDoctorEMROpen}
          onClose={() => setIsDoctorEMROpen(false)}
          patientId={emrPatientId}
          tokenId={emrTokenId}
          tokenNumber={emrTokenNumber}
          doctorInfo={docInfo}
          onConsultationSaved={fetchStats}
        />

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
            <h3 className="text-xl font-bold mt-0.5">{safeStats.todayPatients || safeStats.todayAppointments || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Bed className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admit Patient (IPD)</p>
            <h3 className="text-xl font-bold mt-0.5">{safeStats.activeAdmissions || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Checkups</p>
            <h3 className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">{safeStats.pendingCheckups || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered Patients</p>
            <h3 className="text-xl font-bold mt-0.5">{safeStats.totalPatients || 0}</h3>
          </div>
        </Card>
      </div>

      {/* Auxiliary Alerts Row */}
      <div className={`grid grid-cols-1 ${isReceptionist ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-5`}>
        {!isReceptionist && (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/25">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{safeStats.lowStockMeds || 0} Medicines under Stock Alert</span>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 rounded-xl border border-brand-500/25">
          <Clock className="h-5 w-5 text-brand-500" />
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">Sample tracking & requests active</span>
        </div>
        {!isReceptionist && (
          <div className="flex items-center gap-3 p-3 bg-rose-500/10 rounded-xl border border-rose-500/25">
            <Inbox className="h-5 w-5 text-rose-500" />
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{safeStats.pendingBills || 0} Pending Unpaid Bills</span>
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
                <AreaChart data={safeCharts.monthlyRevenue || []}>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => window.location.href = '/patient-registration'}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <UserPlus className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Register</span>
                </button>

                <button
                  onClick={() => window.location.href = '/old-patient'}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Old Patient</span>
                </button>

                <button
                  onClick={() => window.location.href = '/admissions'}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 group-hover:scale-110 transition-transform rounded-xl">
                    <Bed className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-350">Admit Patient</span>
                </button>

                <button
                  onClick={() => window.location.href = '/billing'}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-brand-50/20 dark:hover:bg-dark-950/25 transition-all text-center gap-2 group"
                >
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 group-hover:scale-110 transition-transform rounded-xl">
                    <Receipt className="h-4.5 w-4.5" />
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
              <BarChart data={safeCharts.departmentStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0ea0ea" radius={[4, 4, 0, 0]}>
                  {(safeCharts.departmentStats || []).map((entry: any, index: number) => (
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
                  {(safeRecentActivity || []).map((log: any) => (
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
