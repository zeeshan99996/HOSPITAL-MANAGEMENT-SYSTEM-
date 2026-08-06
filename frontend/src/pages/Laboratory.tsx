import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Beaker, Check, Plus, Printer, FileText, Search, Activity, Calendar, ShieldCheck, CheckSquare, Square } from 'lucide-react';

const STANDARD_TESTS = [
  { id: 'LFT', name: 'LFT', label: 'LFT (Liver Function)', category: 'Blood Chemistry' },
  { id: 'RFT', name: 'RFT', label: 'RFT (Renal Function)', category: 'Kidney Panel' },
  { id: 'CBC', name: 'CBC', label: 'CBC (Blood Count)', category: 'Hematology' },
  { id: 'Blood Sugar', name: 'Blood Sugar', label: 'Blood Sugar (F/R)', category: 'Diabetic Panel' },
  { id: 'Uric Acid', name: 'Uric Acid', label: 'Uric Acid', category: 'Metabolic Panel' },
];

export const Laboratory: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab View: Today Checklist vs Full History
  const [viewTab, setViewTab] = useState<'today' | 'history'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Test Modal
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customPatientId, setCustomPatientId] = useState<number | null>(null);
  const [customTestName, setCustomTestName] = useState('');
  const [customCategory, setCustomCategory] = useState('Pathology');

  const fetchLabData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Lab Requests
      const reqData = await apiClient.get('/lab/requests');
      setRequests(Array.isArray(reqData) ? reqData : []);

      // 2. Fetch Patients & Today Tokens
      const [patientsData, tokensData] = await Promise.all([
        apiClient.get('/patients'),
        apiClient.get('/tokens')
      ]);

      const allPatients = Array.isArray(patientsData) ? patientsData : (patientsData?.patients || []);
      const todayTokens = Array.isArray(tokensData) ? tokensData : [];

      // Filter patients who visited today
      const todayPatientIds = new Set(todayTokens.map((t: any) => t.patientId));
      const todayList = allPatients.filter((p: any) => {
        const createdDate = new Date(p.createdAt).toDateString();
        const isTodayCreated = createdDate === new Date().toDateString();
        return isTodayCreated || todayPatientIds.has(p.id);
      });

      setTodayPatients(todayList.length > 0 ? todayList : allPatients.slice(0, 15));
    } catch (err) {
      console.error('Error fetching lab data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, []);

  // Check if a specific test is checked for a patient
  const isTestChecked = (patientId: number, testNameStr: string) => {
    return requests.some(
      r => r.patientId === patientId && r.testName.toLowerCase() === testNameStr.toLowerCase()
    );
  };

  // Toggle test checkbox for a patient
  const handleToggleTest = async (patient: any, testNameStr: string, categoryStr: string) => {
    const existingReq = requests.find(
      r => r.patientId === patient.id && r.testName.toLowerCase() === testNameStr.toLowerCase()
    );

    try {
      if (existingReq) {
        // Mark result or delete request
        await apiClient.put(`/lab/requests/${existingReq.id}/result`, {
          resultDetails: 'Cancelled / Removed by Receptionist'
        });
      } else {
        // Create new lab request for patient
        await apiClient.post('/lab/requests', {
          patientId: patient.id,
          doctorId: patient.tokens?.[0]?.doctorId || null,
          testName: testNameStr,
          category: categoryStr,
        });
      }
      fetchLabData();
    } catch (err: any) {
      alert(`Failed to update test record: ${err.message}`);
    }
  };

  // Custom Test Submission
  const handleAddCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPatientId || !customTestName) return;

    try {
      await apiClient.post('/lab/requests', {
        patientId: customPatientId,
        testName: customTestName,
        category: customCategory,
      });
      setIsCustomOpen(false);
      setCustomTestName('');
      fetchLabData();
    } catch (err: any) {
      alert(`Error adding custom test: ${err.message}`);
    }
  };

  // Statistics Computations
  const totalTestsToday = requests.length;
  const testBreakdown = STANDARD_TESTS.reduce((acc: any, t) => {
    acc[t.name] = requests.filter(r => r.testName.toLowerCase() === t.name.toLowerCase()).length;
    return acc;
  }, {});

  const filteredPatients = todayPatients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mrNumber && p.mrNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Beaker className="h-5 w-5 text-brand-500" /> Laboratory Tests & Diagnostics Checklist
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Receptionist & Clinical Pathology register: select ordered lab tests per patient for daily/monthly records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Summary Report
          </Button>
        </div>
      </div>

      {/* TODAY LAB SUMMARY BREAKDOWN BOARD */}
      <Card className="p-4 border border-brand-500/30 bg-gradient-to-r from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" /> Daily Laboratory Tests Counter & Audit Record
          </h3>
          <Badge type="info">Total Conducted: {totalTestsToday} Tests</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {STANDARD_TESTS.map(t => (
            <div key={t.id} className="p-2.5 bg-white dark:bg-dark-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[9px] font-bold text-slate-450 uppercase block">{t.name}</span>
              <span className="text-base font-extrabold text-brand-600 dark:text-brand-400 font-mono">
                {testBreakdown[t.name] || 0}
              </span>
            </div>
          ))}
          <div className="p-2.5 bg-white dark:bg-dark-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-450 uppercase block">Other Tests</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {requests.filter(r => !STANDARD_TESTS.some(st => st.name.toLowerCase() === r.testName.toLowerCase())).length}
            </span>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab('today')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              viewTab === 'today'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" /> Today Patients Checklist ({todayPatients.length})
          </button>
          <button
            onClick={() => setViewTab('history')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              viewTab === 'history'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" /> All Lab Records History ({requests.length})
          </button>
        </div>

        {viewTab === 'today' && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient by Name or MR#..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
      ) : viewTab === 'today' ? (
        /* TODAY PATIENTS LAB CHECKLIST TABLE */
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Today Patient Lab Test Selection & Checklist
            </h3>
            <span className="text-[10px] text-slate-450 font-semibold">Check boxes to save lab tests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-4 py-3">MR# / Patient File</th>
                  <th className="px-4 py-3">Attending Doctor</th>
                  {STANDARD_TESTS.map(t => (
                    <th key={t.id} className="px-3 py-3 text-center bg-brand-500/5 font-extrabold text-brand-600 dark:text-brand-400">
                      {t.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Custom Tests / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-450 text-xs">
                      No patients registered today.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map(p => {
                    const patientReqs = requests.filter(r => r.patientId === p.id);
                    const customReqs = patientReqs.filter(
                      r => !STANDARD_TESTS.some(st => st.name.toLowerCase() === r.testName.toLowerCase())
                    );

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                          <span className="text-[10px] text-slate-450 font-mono">
                            {p.mrNumber || 'MR-N/A'} • {p.phone}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {p.doctorName || p.tokens?.[0]?.doctor?.user?.name || 'OPD Physician'}
                        </td>

                        {/* Standard Test Checkboxes */}
                        {STANDARD_TESTS.map(t => {
                          const checked = isTestChecked(p.id, t.name);
                          return (
                            <td key={t.id} className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleTest(p, t.name, t.category)}
                                className={`p-2 rounded-lg transition-all flex items-center justify-center mx-auto border ${
                                  checked
                                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/30'
                                    : 'bg-white dark:bg-dark-900 text-slate-300 dark:text-slate-700 border-slate-200 dark:border-slate-800 hover:border-brand-500/50'
                                }`}
                                title={`Toggle ${t.name} for ${p.name}`}
                              >
                                {checked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              </button>
                            </td>
                          );
                        })}

                        {/* Custom Tests & Add Button */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {customReqs.map(cr => (
                              <Badge key={cr.id} type="info" className="text-[9px]">
                                {cr.testName}
                              </Badge>
                            ))}
                            <button
                              onClick={() => {
                                setCustomPatientId(p.id);
                                setIsCustomOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 dark:bg-dark-900 hover:bg-brand-500 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Test
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
      ) : (
        /* ALL LAB RECORDS HISTORY LEDGER TABLE */
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Historical Laboratory Tests Audit Register
            </h3>
            <Badge type="info">{requests.length} Total Records</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-5 py-3">Patient File</th>
                  <th className="px-5 py-3">Lab Test Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Ordered By</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                    <td className="px-5 py-3.5 font-mono text-[10px]">
                      {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white block">{req.patient?.name}</span>
                      <span className="text-[10px] text-slate-450 font-mono">{req.patient?.mrNumber}</span>
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-brand-600 dark:text-brand-400">{req.testName}</td>
                    <td className="px-5 py-3.5">{req.category}</td>
                    <td className="px-5 py-3.5">{req.doctor?.user?.name || 'Receptionist'}</td>
                    <td className="px-5 py-3.5">
                      <Badge type="success">COMPLETED</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CUSTOM TEST MODAL */}
      <Modal isOpen={isCustomOpen} onClose={() => setIsCustomOpen(false)} title="Add Custom Lab Test for Patient">
        <form onSubmit={handleAddCustomTest} className="space-y-4">
          <Input
            label="Custom Test Name"
            required
            value={customTestName}
            onChange={e => setCustomTestName(e.target.value)}
            placeholder="e.g. Lipid Profile, Urine RE, Serum Electrolytes"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1">Test Category</label>
            <select
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200"
            >
              <option value="Pathology">Pathology</option>
              <option value="Blood Chemistry">Blood Chemistry</option>
              <option value="Radiology & Scan">Radiology & Scan</option>
              <option value="Microbiology">Microbiology</option>
            </select>
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Save Lab Test Record
          </Button>
        </form>
      </Modal>
    </div>
  );
};
