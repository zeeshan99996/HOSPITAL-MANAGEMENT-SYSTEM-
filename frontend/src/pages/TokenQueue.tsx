import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UI';
import { ArrowRight, RotateCw, SkipForward, Play, CheckCircle, RefreshCcw, Ticket, Users, Stethoscope, Search, Check, Printer } from 'lucide-react';
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
      setTokens(Array.isArray(data) ? data : []);
      setErrorMsg('');
    } catch (err: any) {
      console.error('Token fetch error:', err);
      setErrorMsg(err?.message || 'Failed to load queue registry.');
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

  const handlePrintTokenSlip = (tokenObj: any) => {
    const patObj = patients.find(p => p.id === tokenObj.patientId) || tokenObj.patient;
    const docObj = doctors.find(d => d.id === tokenObj.doctorId) || tokenObj.doctor;

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for LifeFlow EMR to print token slips automatically.');
      return;
    }
      printWindow.document.write(`
        <html>
        <head>
          <title>OPD Token Slip - ${tokenObj.tokenNumber}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; padding: 12px; width: 280px; margin: 0 auto; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .hospital-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
            .hospital-info { font-size: 10px; color: #222; line-height: 1.3; }
            .token-box { border: 2px solid #000; padding: 8px; margin: 10px 0; text-align: center; background-color: #f8f9fa; }
            .token-label { font-size: 10px; font-weight: bold; letter-spacing: 1px; }
            .token-number { font-size: 26px; font-weight: 900; margin-top: 3px; font-family: Arial, sans-serif; letter-spacing: 1px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .info-label { font-weight: bold; }
            .footer-text { font-size: 9px; text-align: center; margin-top: 12px; font-weight: bold; line-height: 1.3; }
          </style>
        </head>
        <body>
          <div class="text-center hospital-name">DR. TALHA CLINIC</div>
          <div class="text-center hospital-info">12-B, Main Boulevard, Gulberg III, Lahore</div>
          <div class="text-center hospital-info">Tel: (042) 35889900 | Mobile: 0311-6353044</div>
          
          <div class="divider"></div>

          <div class="token-box">
            <div class="token-label">OPD CONSULTATION TOKEN</div>
            <div class="token-number">${tokenObj.tokenNumber}</div>
            <div style="font-size: 10px; margin-top: 3px; font-weight: bold; color: #333;">MRN: ${patObj?.mrNumber || 'MR-N/A'}</div>
          </div>

          <div class="divider"></div>

          <div class="info-row"><span class="info-label">Patient Name:</span> <span>${patObj?.name || 'Patient'}</span></div>
          <div class="info-row"><span class="info-label">Doctor Name:</span> <span>${docObj?.user?.name || docObj?.name || 'General OPD'}</span></div>
          <div class="info-row"><span class="info-label">Room / Ward:</span> <span>${docObj?.roomNumber || 'Room 101'}</span></div>
          <div class="info-row"><span class="info-label">Date & Time:</span> <span>${new Date(tokenObj.createdAt || Date.now()).toLocaleString()}</span></div>

          <div class="divider"></div>

          <div class="footer-text">
            THANK YOU FOR VISITING DR. TALHA CLINIC<br/>
            PLEASE RETAIN THIS TOKEN SLIP FOR YOUR TURN
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSubmitting(true);
    try {
      const newTokenRes = await apiClient.post('/tokens', {
        type: tokenType,
        patientId: Number(selectedPatientId),
        doctorId: selectedDoctorId ? Number(selectedDoctorId) : null,
        detail: tokenDetail
      });
      
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setTokenDetail('');
      fetchQueue();

      if (newTokenRes) {
        handlePrintTokenSlip(newTokenRes);
      }
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
    
    const rawDocTokens = tokens.filter(t => t.doctorId === doc.id || (t.doctor && t.doctor.id === doc.id));
    
    // Deduplicate tokens by unique patient ID, prioritizing status: completed > processing > waiting
    const uniqueTokensMap = new Map<number, any>();
    const statusWeight: Record<string, number> = { completed: 3, processing: 2, waiting: 1 };

    rawDocTokens.forEach(t => {
      const pId = t.patientId || t.id;
      const existing = uniqueTokensMap.get(pId);
      if (!existing) {
        uniqueTokensMap.set(pId, t);
      } else {
        const currentWeight = statusWeight[t.status] || 0;
        const existingWeight = statusWeight[existing.status] || 0;
        if (currentWeight > existingWeight) {
          uniqueTokensMap.set(pId, t);
        }
      }
    });
    const docTokens = Array.from(uniqueTokensMap.values());

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

      {/* ISSUE NEW TOKEN FORM CARD */}
      <Card className="p-4 border border-brand-500/30 bg-gradient-to-r from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-brand-500" /> Issue OPD Queue Token & Thermal Slip
        </h3>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Patient *</label>
            <select
              required
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">-- Choose Registered Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} • (MRN: {p.mrNumber || 'N/A'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Doctor OPD *</label>
            <select
              required
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : `Dr. ${d.specialization || 'Physician'}`} ({d.specialization || 'General OPD'})
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-1.5 text-xs shadow-sm">
            <Ticket className="h-4 w-4" /> {submitting ? 'Generating...' : 'Issue Token & Print Slip'}
          </Button>
        </form>
      </Card>

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

              {/* Call Next & Print Slip Buttons */}
              <div className="flex gap-2 pt-1">
                {doc.nextToken && (
                  <button
                    onClick={() => handleStatusChange(doc.nextToken.id, 'processing')}
                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <Play className="h-3 w-3" /> Call Next ({doc.nextToken.tokenNumber})
                  </button>
                )}
                {doc.nextToken && (
                  <button
                    onClick={() => handlePrintTokenSlip(doc.nextToken)}
                    title="Print Token Slip"
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-dark-950 hover:bg-brand-500 hover:text-white rounded-lg text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-800 flex items-center justify-center"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
