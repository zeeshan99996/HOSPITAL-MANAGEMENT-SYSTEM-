import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Beaker, Check, Plus, Printer, FileText, Search, Activity, Calendar, ShieldCheck, CheckSquare, Square, ChevronDown, Trash2, Settings } from 'lucide-react';

const DEFAULT_LAB_TESTS = [
  { id: 1, name: 'Complete Blood Count (CBC)', category: 'Hematology', rate: 600 },
  { id: 2, name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'Hematology', rate: 300 },
  { id: 3, name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', rate: 250 },
  { id: 4, name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', rate: 250 },
  { id: 5, name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', rate: 1200 },
  { id: 6, name: 'Liver Function Tests (LFT)', category: 'Biochemistry', rate: 1200 },
  { id: 7, name: 'Renal Function Tests / Creatinine (RFT)', category: 'Biochemistry', rate: 1000 },
  { id: 8, name: 'Lipid Profile', category: 'Biochemistry', rate: 1400 },
  { id: 9, name: 'Urine Complete Examination (R/E)', category: 'Clinical Pathology', rate: 400 },
  { id: 10, name: 'Typhidot / Widal Test', category: 'Serology', rate: 700 },
  { id: 11, name: 'Dengue NS1 Antigen', category: 'Serology', rate: 1200 },
  { id: 12, name: 'Serum Electrolytes (Na, K, Cl)', category: 'Biochemistry', rate: 900 },
  { id: 13, name: 'H. Pylori Antigen / Antibody', category: 'Serology', rate: 800 },
  { id: 14, name: 'Serum Uric Acid', category: 'Biochemistry', rate: 450 },
  { id: 15, name: 'ECG (12-Lead)', category: 'Cardiology', rate: 600 },
  { id: 16, name: 'Chest X-Ray (PA View)', category: 'Radiology', rate: 800 },
  { id: 17, name: 'Ultrasound Abdomen & Pelvis', category: 'Ultrasound', rate: 1500 },
  { id: 18, name: 'Thyroid Profile (TSH, FT3, FT4)', category: 'Endocrinology', rate: 1800 }
];

export const Laboratory: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [testCatalog, setTestCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab View
  const [viewTab, setViewTab] = useState<'today' | 'history' | 'catalog'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown State for open patient dropdown
  const [openDropdownPatientId, setOpenDropdownPatientId] = useState<number | null>(null);

  // Admin Catalog Form State
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestRate, setNewTestRate] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownPatientId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLabData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Lab Requests
      const reqData = await apiClient.get('/lab/requests');
      setRequests(Array.isArray(reqData) ? reqData : []);

      // 2. Fetch Dynamic Catalog Tests
      const catalogData = await apiClient.get('/lab/tests');
      if (Array.isArray(catalogData) && catalogData.length > 0) {
        setTestCatalog(catalogData);
      } else {
        setTestCatalog(DEFAULT_LAB_TESTS);
      }

      // 3. Fetch Patients & Today Tokens
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
  const handleToggleTest = async (patient: any, testNameStr: string) => {
    const existingReq = requests.find(
      r => r.patientId === patient.id && r.testName.toLowerCase() === testNameStr.toLowerCase()
    );

    try {
      if (existingReq) {
        // Cancel/Remove request
        await apiClient.put(`/lab/requests/${existingReq.id}/result`, {
          resultDetails: 'Cancelled / Removed by Receptionist'
        });
      } else {
        const resolvedDocId = patient.doctorId || patient.tokens?.[0]?.doctorId || null;
        await apiClient.post('/lab/requests', {
          patientId: patient.id,
          doctorId: resolvedDocId,
          testName: testNameStr,
          category: 'Pathology',
        });
      }
      fetchLabData();
    } catch (err: any) {
      alert(`Failed to update test record: ${err.message}`);
    }
  };

  // Admin Add New Test to Catalog
  const handleAddTestToCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName) return;

    try {
      await apiClient.post('/lab/tests', {
        name: newTestName,
        category: 'Pathology',
        rate: newTestRate ? Number(newTestRate) : 0
      });
      setIsAddTestOpen(false);
      setNewTestName('');
      setNewTestRate('');
      fetchLabData();
      alert(`Test '${newTestName}' added to Lab Catalog successfully!`);
    } catch (err: any) {
      alert(`Failed to add test to catalog: ${err.message}`);
    }
  };

  // Admin Delete Test from Catalog
  const handleDeleteTestFromCatalog = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove '${name}' from the Lab Catalog?`)) {
      try {
        await apiClient.delete(`/lab/tests/${id}`);
        fetchLabData();
        alert(`Test '${name}' removed from catalog.`);
      } catch (err: any) {
        alert(`Failed to delete test: ${err.message}`);
      }
    }
  };

  // Statistics Computations
  const totalTestsToday = requests.length;
  const testBreakdown = testCatalog.reduce((acc: any, t) => {
    acc[t.name] = requests.filter(r => r.testName.toLowerCase() === t.name.toLowerCase()).length;
    return acc;
  }, {});

  const filteredPatients = todayPatients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mrNumber && p.mrNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Beaker className="h-5 w-5 text-brand-500" /> Laboratory Tests Desk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage dynamic lab test catalog, patient test checklists, and daily audit reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={() => setIsAddTestOpen(true)} className="flex items-center gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" /> Add New Test to Catalog
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" size="sm" className="flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print Summary Report
          </Button>
        </div>
      </div>

      {/* TODAY LAB SUMMARY BREAKDOWN BOARD */}
      <Card className="p-4 border border-brand-500/30 bg-gradient-to-r from-white via-slate-50/50 to-brand-500/[0.02] dark:from-dark-900 dark:to-dark-950 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" /> Daily Lab Tests Breakdown Audit ({totalTestsToday} Conducted Today)
          </h3>
          <Badge type="info">Active Test Types: {testCatalog.length}</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {testCatalog.slice(0, 6).map(t => (
            <div key={t.id} className="p-2.5 bg-white dark:bg-dark-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[9px] font-bold text-slate-450 uppercase block truncate" title={t.name}>{t.name}</span>
              <span className="text-base font-extrabold text-brand-600 dark:text-brand-400 font-mono">
                {testBreakdown[t.name] || 0}
              </span>
            </div>
          ))}
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
            <FileText className="h-4 w-4" /> Lab Audit History ({requests.length})
          </button>

          {isAdmin && (
            <button
              onClick={() => setViewTab('catalog')}
              className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                viewTab === 'catalog'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-4 w-4" /> Admin Tests Catalog ({testCatalog.length})
            </button>
          )}
        </div>

        {viewTab === 'today' && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient..."
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
        /* TODAY PATIENTS TABLE WITH MULTI-SELECT CHECKBOX DROPDOWN */
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Today Patient Lab Test Selection
            </h3>
            <span className="text-[10px] text-slate-450 font-semibold">Click 'Select Lab Tests' dropdown to check/uncheck tests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-5 py-3.5">MR# / Patient File</th>
                  <th className="px-5 py-3.5">Attending Doctor</th>
                  <th className="px-5 py-3.5">Selected Tests</th>
                  <th className="px-5 py-3.5 text-right">Lab Test Selection Dropdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-450 text-xs">
                      No patients registered today.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map(p => {
                    const patientReqs = requests.filter(r => r.patientId === p.id);
                    const isOpen = openDropdownPatientId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white block text-xs">{p.name}</span>
                          <span className="text-[10px] text-slate-450 font-mono">
                            {p.mrNumber || 'MR-N/A'} • {p.phone}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          {p.doctorName || p.tokens?.[0]?.doctor?.user?.name || 'OPD Physician'}
                        </td>

                        {/* Selected Test Badges Pills */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {patientReqs.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">No tests selected</span>
                            ) : (
                              patientReqs.map(r => (
                                <span key={r.id} className="px-2.5 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                  <Check className="h-3 w-3" /> {r.testName}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* CHECKBOX MULTI-SELECT DROPDOWN */}
                        <td className="px-5 py-4 text-right relative">
                          <div className="inline-block text-left" ref={isOpen ? dropdownRef : null}>
                            <button
                              type="button"
                              onClick={() => setOpenDropdownPatientId(isOpen ? null : p.id)}
                              className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <Beaker className="h-3.5 w-3.5" /> Select Lab Tests ({patientReqs.length}) <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isOpen && (
                              <div className="origin-top-right absolute right-5 mt-2 w-64 rounded-xl shadow-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-850">
                                <div className="p-2 text-[10px] font-extrabold text-slate-450 uppercase tracking-wider flex justify-between items-center">
                                  <span>Check Tests for {p.name}</span>
                                  <span className="text-brand-500">{patientReqs.length} Selected</span>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                                  {testCatalog.map(t => {
                                    const checked = isTestChecked(p.id, t.name);
                                    return (
                                      <label
                                        key={t.id}
                                        onClick={() => handleToggleTest(p, t.name)}
                                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                          checked
                                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                                            : 'hover:bg-slate-50 dark:hover:bg-dark-950 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {checked ? (
                                            <CheckSquare className="h-4 w-4 text-brand-500" />
                                          ) : (
                                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                                          )}
                                          <span>{t.name}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
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
      ) : viewTab === 'catalog' ? (
        /* ADMIN EDITABLE TEST CATALOG MANAGEMENT TABLE */
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Admin Dynamic Lab Test Catalog
              </h3>
              <p className="text-[10px] text-slate-500">Configure tests available in receptionist dropdown menu.</p>
            </div>
            <Button onClick={() => setIsAddTestOpen(true)} size="sm" className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add New Test
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-5 py-3">Test Name</th>
                  <th className="px-5 py-3">Standard Fee (Rs.)</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {testCatalog.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-xs">{t.name}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">Rs. {Number(t.rate || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteTestFromCatalog(t.id, t.name)}
                        className="p-1 px-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="h-3 w-3" /> Remove Test
                      </button>
                    </td>
                  </tr>
                ))}
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
                  <th className="px-5 py-3">Ordered By</th>
                  <th className="px-5 py-3 text-right">Status</th>
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
                    <td className="px-5 py-3.5">{req.doctor?.user?.name || 'Receptionist'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Badge type="success">COMPLETED</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ADMIN ADD TEST TO CATALOG MODAL */}
      <Modal isOpen={isAddTestOpen} onClose={() => setIsAddTestOpen(false)} title="Add New Lab Test to Catalog">
        <form onSubmit={handleAddTestToCatalog} className="space-y-4">
          <Input
            label="Lab Test Name"
            required
            value={newTestName}
            onChange={e => setNewTestName(e.target.value)}
            placeholder="e.g. Lipid Profile, ECG, Urine RE, Vitamin D"
          />

          <Input
            label="Standard Test Rate / Fee (Rs.) - Optional"
            type="number"
            placeholder="e.g. 500 (Leave blank if Free / Included)"
            value={newTestRate}
            onChange={e => setNewTestRate(e.target.value)}
          />

          <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Save to Catalog
          </Button>
        </form>
      </Modal>
    </div>
  );
};
