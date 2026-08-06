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

      {/* Global Summary Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-4 flex items-center gap-4 bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-slate-850">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400 rounded-xl">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Global Active</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{activeToken ? activeToken.tokenNumber : '--'}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-slate-850">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Global Next</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{nextToken ? nextToken.tokenNumber : '--'}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-slate-850">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-650 dark:text-amber-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Total Waiting</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{waitingTokens.length} patients</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-slate-850">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Completed Today</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {tokens.filter(t => t.status === 'completed').length} slots
            </h3>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Generator Form */}
        <Card className="p-5">
          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2 mb-4">
            Issue New Token
          </h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Patient Intake File</label>
              <select
                required
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Choose Registered Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.mrNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Consulting Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- General OPD (No Physician) --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : `Dr. ${d.specialization || 'Physician'}`} ({d.specialization || d.department?.name || 'OPD'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['opd', 'lab', 'billing'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTokenType(type)}
                  className={`p-2 py-2.5 border rounded-lg text-2xs font-extrabold uppercase tracking-wider transition-all ${
                    tokenType === type
                      ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-dark-950 text-slate-500'
                  }`}
                >
                  {type} Unit
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Token Memo / Note</label>
              <textarea
                placeholder="e.g. Follow-up consultation, ECG check"
                value={tokenDetail}
                onChange={e => setTokenDetail(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <Button type="submit" isLoading={submitting} className="w-full flex items-center gap-1.5 justify-center">
              <Ticket className="h-4 w-4" /> Dispatch Queue Slip
            </Button>
          </form>
        </Card>

        {/* Queue List Table */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest">Active Dispatch Log</h3>
              <span className="text-[10px] text-slate-450 font-medium">Showing {filteredTokens.length} queue records</span>
            </div>

            {/* Doctor Filter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Doctor:</span>
              <select
                value={filterDoctorId}
                onChange={e => setFilterDoctorId(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="all">All OPD Doctors ({tokens.length})</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : `Dr. Physician #${d.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Loading queue status...</div>
            ) : filteredTokens.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-450">No active queue tokens found.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="px-5 py-3">Token</th>
                    <th className="px-5 py-3">Patient File</th>
                    <th className="px-5 py-3">Assigned Doctor</th>
                    <th className="px-5 py-3">Wait Time</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {filteredTokens.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 font-mono">{t.tokenNumber}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold block">{t.patient?.name}</span>
                        <span className="text-[10px] text-slate-450 font-mono">{t.patient?.mrNumber}</span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-850 dark:text-slate-200">{t.doctor?.user?.name || 'General OPD'}</td>
                      <td className="px-5 py-3.5 font-mono">{t.waitingTime} mins</td>
                      <td className="px-5 py-3.5">
                        <Badge type={t.status === 'processing' ? 'info' : t.status === 'completed' ? 'success' : t.status === 'skipped' ? 'error' : 'warning'}>
                          {t.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right flex gap-1.5 justify-end">
                        {t.status === 'waiting' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'processing')}
                            className="p-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50 rounded text-[10px] font-bold"
                          >
                            Call Next
                          </button>
                        )}
                        {t.status === 'processing' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'completed')}
                            className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            Complete
                          </button>
                        )}
                        {t.status === 'skipped' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'waiting')}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-900 dark:text-slate-300 rounded text-[10px] font-bold"
                          >
                            Recall
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
