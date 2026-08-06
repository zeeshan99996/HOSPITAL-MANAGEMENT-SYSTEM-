import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UI';
import { ArrowRight, RotateCw, SkipForward, Play, CheckCircle, RefreshCcw, Ticket, Users, Stethoscope, Search, Check } from 'lucide-react';
import { apiClient } from '../services/api';

export const TokenQueue: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter by Doctor
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [tokenType, setTokenType] = useState<'opd' | 'lab' | 'billing'>('opd');
  const [tokenDetail, setTokenDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/tokens');
      setTokens(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load queue registry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [patientsData, rawDocs] = await Promise.all([
        apiClient.get('/patients'),
        apiClient.get('/doctors')
      ]);
      setPatients(patientsData || []);

      if (Array.isArray(rawDocs) && rawDocs.length > 0) {
        setDoctors(rawDocs);
      } else {
        const depts = await apiClient.get('/admin/departments');
        const docList: any[] = [];
        depts.forEach((d: any) => {
          if (d.doctors) {
            d.doctors.forEach((doc: any) => docList.push(doc));
          }
        });
        setDoctors(docList);
      }
    } catch (err) {
      console.error('Dropdown fetch error', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchDropdowns();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSubmitting(true);
    try {
      await apiClient.post('/tokens', {
        type: tokenType,
        patientId: Number(selectedPatientId),
        doctorId: selectedDoctorId ? Number(selectedDoctorId) : null,
        detail: tokenDetail
      });
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setTokenDetail('');
      fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating token.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'waiting' | 'processing' | 'completed' | 'skipped') => {
    try {
      await apiClient.put(`/tokens/${id}/status`, { status });
      fetchQueue();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  };

  // Compute Doctor-Wise Queue Cards Data
  const doctorQueues = doctors.map((doc: any) => {
    const docName = doc.user?.name
      ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`)
      : `Dr. Physician #${doc.id}`;
    
    const docTokens = tokens.filter(t => t.doctorId === doc.id || (t.doctor && t.doctor.id === doc.id));
    const active = docTokens.find(t => t.status === 'processing');
    const waiting = docTokens.filter(t => t.status === 'waiting');
    const completed = docTokens.filter(t => t.status === 'completed');

    return {
      doctorId: doc.id,
      doctorName: docName,
      specialization: doc.specialization || doc.department?.name || 'General OPD',
      roomNumber: doc.roomNumber || `Room 10${doc.id}`,
      activeToken: active,
      nextToken: waiting[0],
      totalToday: docTokens.length,
      waitingCount: waiting.length,
      completedCount: completed.length,
    };
  });

  // Filter tokens list for table view
  const filteredTokens = filterDoctorId === 'all'
    ? tokens
    : tokens.filter(t => String(t.doctorId) === filterDoctorId || (t.doctor && String(t.doctor.id) === filterDoctorId));

  // Global Queue Calculations
  const waitingTokens = tokens.filter(t => t.status === 'waiting');
  const activeToken = tokens.find(t => t.status === 'processing');
  const nextToken = waitingTokens[0];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Ticket className="h-5 w-5 text-brand-500" /> Token Queue Dispatch & Live Doctor Monitors
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time OPD Doctor tokens status, active consultation lines, and patient queue dispatch.
          </p>
        </div>
        <Button onClick={fetchQueue} variant="secondary" className="flex items-center gap-1">
          <RotateCw className="h-3.5 w-3.5" /> Refresh Queue
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* DOCTOR-WISE LIVE TOKEN QUEUE MONITOR CARDS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-brand-500" /> Doctor Live Token Queue Status ({doctorQueues.length} OPD Doctors)
          </h3>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Auto Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {doctorQueues.map((doc: any) => (
            <Card key={doc.doctorId} className="p-4 space-y-3 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                    {doc.doctorName}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    {doc.specialization} • {doc.roomNumber}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  doc.activeToken
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                }`}>
                  {doc.activeToken ? 'In Room' : 'Available'}
                </span>
              </div>

              {/* Running Token Display */}
              <div className="p-2.5 bg-slate-50 dark:bg-dark-950 rounded-lg border border-slate-150 dark:border-slate-850 space-y-1">
                <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Current Running Token</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-brand-600 dark:text-brand-400 font-mono tracking-tight">
                    {doc.activeToken ? doc.activeToken.tokenNumber : '--'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={doc.activeToken?.patient?.name}>
                    {doc.activeToken?.patient?.name || 'No Active Patient'}
                  </span>
                </div>
              </div>

              {/* Next Patient */}
              <div className="flex justify-between items-center text-xs font-medium px-1">
                <span className="text-[10px] text-slate-450">Next Up:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate max-w-[120px]">
                  {doc.nextToken ? `${doc.nextToken.tokenNumber} (${doc.nextToken.patient?.name || 'Patient'})` : 'None'}
                </span>
              </div>

              {/* Doctor Queue Totals Summary */}
              <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-slate-100 dark:border-slate-850 text-[10px]">
                <div>
                  <span className="text-[9px] text-slate-450 block font-bold">Total Today</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">{doc.totalToday}</span>
                </div>
                <div>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-bold">Waiting</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{doc.waitingCount}</span>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-bold">Completed</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{doc.completedCount}</span>
                </div>
              </div>

              {/* Call Next Button for Doctor */}
              {doc.nextToken && (
                <button
                  onClick={() => handleStatusChange(doc.nextToken.id, 'processing')}
                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 mt-1"
                >
                  <Play className="h-3 w-3" /> Call Next ({doc.nextToken.tokenNumber})
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
