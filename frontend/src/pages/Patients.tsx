import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import {
  Search, UserPlus, Phone, Calendar, Heart, Shield, Activity, MapPin, Eye,
  ActivitySquare, Ticket, Thermometer, User, RotateCcw, BedDouble, Scissors,
  Stethoscope, Clock, Pill, Star, MessageSquare, AlertTriangle, CheckCircle2,
  ClipboardList, ThumbsUp, HelpCircle
} from 'lucide-react';
import { ThermalPrinter } from '../components/ThermalPrinter';
import { DoctorEMRModal } from '../components/DoctorEMRModal';

export const Patients: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Tab View: 'today' (Current Today Patients), 'admitted' (Admit Patients), 'all' (All Patients)
  const isNurse = user?.role === 'nurse';
  const [activeTab, setActiveTab] = useState<'today' | 'admitted' | 'all'>(isNurse ? 'admitted' : 'today');

  // Modal / Drawer controls
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  
  // Doctor EMR Suite Modal
  const [isDoctorEMROpen, setIsDoctorEMROpen] = useState(false);
  
  // Vitals form modal control
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);

  // Feedback form modal control
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('appreciation');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackPriority, setFeedbackPriority] = useState('normal');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  
  // Token printing simulator control
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printedToken, setPrintedToken] = useState<any>(null);

  // Form State - Patient Vitals
  const [vitalsBP, setVitalsBP] = useState('120/80');
  const [vitalsTemp, setVitalsTemp] = useState(98.6);
  const [vitalsPulse, setVitalsPulse] = useState(72);
  const [vitalsResp, setVitalsResp] = useState(16);
  const [vitalsSpo2, setVitalsSpo2] = useState(98);
  const [vitalsWeight, setVitalsWeight] = useState('');
  const [vitalsHeight, setVitalsHeight] = useState('');
  const [vitalsNotes, setVitalsNotes] = useState('');

  const fetchPatients = async (overrideParams?: { name?: string; phone?: string; area?: string; date?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const nameVal = overrideParams?.name !== undefined ? overrideParams.name : searchName;
      const phoneVal = overrideParams?.phone !== undefined ? overrideParams.phone : searchPhone;
      const areaVal = overrideParams?.area !== undefined ? overrideParams.area : searchArea;
      const dateVal = overrideParams?.date !== undefined ? overrideParams.date : searchDate;

      if (nameVal.trim()) params.append('name', nameVal.trim());
      if (phoneVal.trim()) params.append('phone', phoneVal.trim());
      if (areaVal.trim()) params.append('area', areaVal.trim());
      if (dateVal.trim()) params.append('date', dateVal.trim());

      const queryString = params.toString();
      const data = await apiClient.get(`/patients${queryString ? `?${queryString}` : ''}`);
      setPatients(data);

      const docsData = await apiClient.get('/doctors');
      setDoctors(docsData || []);
    } catch (err) {
      console.error('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleResetFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setSearchArea('');
    setSearchDate('');
    fetchPatients({ name: '', phone: '', area: '', date: '' });
  };

  const handlePatientClick = async (id: number) => {
    setSelectedPatientId(id);
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const data = await apiClient.get(`/patients/${id}`);
      setSelectedPatient(data);
    } catch (err) {
      console.error('Error fetching patient EMR details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleAddVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      await apiClient.post(`/patients/${selectedPatientId}/vitals`, {
        bp: vitalsBP,
        temperature: Number(vitalsTemp),
        pulse: Number(vitalsPulse),
        respRate: Number(vitalsResp),
        spo2: Number(vitalsSpo2),
        weight: vitalsWeight ? Number(vitalsWeight) : null,
        height: vitalsHeight ? Number(vitalsHeight) : null,
        notes: vitalsNotes,
      });

      setIsVitalsOpen(false);
      // Refresh drawer
      const updated = await apiClient.get(`/patients/${selectedPatientId}`);
      setSelectedPatient(updated);
      alert('Vitals logged successfully.');

      // Reset form
      setVitalsBP('120/80');
      setVitalsTemp(98.6);
      setVitalsPulse(72);
      setVitalsResp(16);
      setVitalsSpo2(98);
      setVitalsWeight('');
      setVitalsHeight('');
      setVitalsNotes('');
    } catch (err) {
      alert('Failed to log patient vitals.');
    }
  };

  const handleSaveFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (!feedbackComment.trim()) {
      alert('Please enter your feedback comments or details.');
      return;
    }

    setFeedbackSaving(true);
    try {
      await apiClient.post(`/patients/${selectedPatientId}/feedback`, {
        feedbackType,
        rating: Number(feedbackRating),
        comment: feedbackComment,
        priority: feedbackPriority
      });

      setIsFeedbackOpen(false);
      // Refresh patient drawer
      const updated = await apiClient.get(`/patients/${selectedPatientId}`);
      setSelectedPatient(updated);
      alert('Feedback logged successfully!');

      setFeedbackComment('');
      setFeedbackRating(5);
      setFeedbackType('appreciation');
      setFeedbackPriority('normal');
    } catch (err: any) {
      alert(err.message || 'Failed to submit patient feedback.');
    } finally {
      setFeedbackSaving(false);
    }
  };

  const triggerTokenGeneration = async (tokenType: 'opd' | 'bill' | 'lab', tokenDetail: string) => {
    if (!selectedPatient) return;
    try {
      const data = await apiClient.post('/tokens', {
        type: tokenType,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        detail: tokenDetail
      });
      setPrintedToken(data);
      setIsPrintOpen(true);
    } catch (err) {
      alert('Error generating print token.');
    }
  };

  const hasActiveFilters = searchName || searchPhone || searchArea || searchDate;

  // Filter Today's Patients vs Admitted Patients vs All
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todayPatients = patients.filter(p => {
    const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : '';
    const hasTodayToken = p.token_queues && p.token_queues.some((t: any) => t.createdAt && new Date(t.createdAt).toLocaleDateString('en-CA') === todayStr);
    const hasTodayAppt = p.appointments && p.appointments.some((a: any) => a.appointmentDate && new Date(a.appointmentDate).toLocaleDateString('en-CA') === todayStr);
    return createdDate === todayStr || hasTodayToken || hasTodayAppt;
  });

  const admittedPatients = patients.filter(p => {
    const hasAdmit = p.admissions && p.admissions.some((a: any) => a.status === 'admitted');
    if (!hasAdmit) return false;
    if (isNurse && searchName.trim()) {
      const q = searchName.toLowerCase();
      const activeAdmission = p.admissions.find((a: any) => a.status === 'admitted');
      const bedStr = activeAdmission?.bed?.bedNumber || '';
      const wardStr = activeAdmission?.bed?.wardName || '';
      return p.name.toLowerCase().includes(q) || 
             p.mrNumber.toLowerCase().includes(q) || 
             bedStr.toLowerCase().includes(q) || 
             wardStr.toLowerCase().includes(q);
    }
    return true;
  });

  const displayedPatients = isNurse || activeTab === 'admitted'
    ? admittedPatients
    : activeTab === 'today'
      ? todayPatients
      : patients;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isNurse ? 'Nurse Ward Monitoring & Inpatient Directory' : 'Patient Directory & EMR Records'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isNurse ? 'Active Admitted Inpatients requiring routine BP, Temperature, and Clinical Care logging.' : "Track Today's Intake Patients, Live OPD Doctor Tokens, and Active Inpatient Admissions."}
          </p>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {!isNurse && (
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'today'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-4 w-4" /> Current Today Patients ({todayPatients.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('admitted')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'admitted'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <BedDouble className="h-4 w-4" /> Admitted Inpatients ({admittedPatients.length})
        </button>

        {!isNurse && (
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <User className="h-4 w-4" /> All Master Patients ({patients.length})
          </button>
        )}
      </div>

      {/* Filter panel - Hidden for Nurse (Nurse only sees full Admitted Inpatients) */}
      {!isNurse ? (
        <Card className="p-4 bg-slate-50/50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Box 1: Name / MR Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <User className="h-3 w-3 text-brand-500" /> Patient Name / MR#
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Name or MR..."
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* Box 2: Phone Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <Phone className="h-3 w-3 text-brand-500" /> Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Phone..."
                    value={searchPhone}
                    onChange={e => setSearchPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* Box 3: Area */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <MapPin className="h-3 w-3 text-brand-500" /> Area / Colony
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Area..."
                    value={searchArea}
                    onChange={e => setSearchArea(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* Box 4: Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <Calendar className="h-3 w-3 text-brand-500" /> Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={e => setSearchDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-1">
              {hasActiveFilters && (
                <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters} className="flex items-center gap-1 text-slate-600">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
              <Button type="submit" size="sm" className="flex items-center gap-1">
                <Search className="h-3.5 w-3.5" /> Search Patient
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl">
          <div className="flex items-center gap-2.5 text-xs font-bold text-rose-800 dark:text-rose-300">
            <BedDouble className="h-5 w-5 text-rose-600" />
            <span>Currently Active Admitted Inpatients ({admittedPatients.length} Admitted in Ward Beds)</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Admitted Patient / Bed..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-dark-900 py-1.5 pl-8 pr-3 text-xs focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      )}

      {/* Patients Data Table */}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-dark-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayedPatients.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-555 dark:text-slate-400">
            {isNurse ? "No active admitted patients found in the inpatient ward." : `No patient records found in ${activeTab === 'today' ? "Today's Intake" : activeTab === 'admitted' ? "Admitted IPD Registry" : "Master Records"}.`}
          </p>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
            {isNurse ? "Admissions are processed by the Reception desk." : "Try switching tabs or refining your search parameters."}
          </p>
        </Card>
      ) : activeTab === 'admitted' || isNurse ? (
        /* ADMITTED PATIENTS TABLE */
        <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-850">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/20 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">MR Number & Name</th>
                <th className="px-6 py-3.5">Contact & Area</th>
                <th className="px-6 py-3.5">Category & Stay Duration</th>
                <th className="px-6 py-3.5">Alotted Bed & Ward</th>
                <th className="px-6 py-3.5">Attending Doctor</th>
                <th className="px-6 py-3.5">Condition / Diagnosis</th>
                <th className="px-6 py-3.5 text-right font-semibold">EMR & Vitals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {displayedPatients.map(p => {
                const activeAdmission = p.admissions && p.admissions.find((a: any) => a.status === 'admitted');
                const isSurgical = activeAdmission?.admissionCategory === 'surgical';
                const isLongStay = activeAdmission?.stayType === 'long';
                const doctorName = activeAdmission?.doctor?.user?.name || 'Assigned Physician';

                return (
                  <tr key={p.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400">{p.mrNumber}</span>
                      <span className="block font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{p.name}</span>
                      <span className="block text-[10px] text-slate-500 font-medium capitalize mt-0.5">{p.age ? `${p.age} Yrs` : 'N/A'} • {p.gender}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {p.phone}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans text-brand-600 dark:text-brand-400 mt-1 font-medium bg-brand-500/10 px-1.5 py-0.5 rounded">
                        <MapPin className="h-2.5 w-2.5" /> {p.area || p.address || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                          isSurgical
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {isSurgical ? <Scissors className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                          {isSurgical ? 'SURGICAL PATIENT' : 'MEDICAL PATIENT'}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded w-fit ${
                          isLongStay
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Clock className="h-2.5 w-2.5" />
                          {isLongStay ? 'Long Stay (3+ Days)' : 'Short Stay (< 48 hrs)'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" /> Bed: {activeAdmission?.bed?.bedNumber || 'Assigned'}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">{activeAdmission?.bed?.wardName || 'Ward Area'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-850 dark:text-slate-200">{doctorName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{activeAdmission?.condition || 'Under Observation'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handlePatientClick(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-bold transition-all shadow-sm"
                      >
                        <Thermometer className="h-3.5 w-3.5" /> Log Vitals / EMR
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        /* TODAY'S OPD PATIENTS / MASTER PATIENTS TABLE */
        <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-850">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">MR Number & Name</th>
                <th className="px-6 py-3.5">Contact Number</th>
                <th className="px-6 py-3.5">Area / Colony</th>
                <th className="px-6 py-3.5">Token Number</th>
                <th className="px-6 py-3.5">Doctor Name</th>
                <th className="px-6 py-3.5">Live Status</th>
                {(user?.role === 'doctor' || user?.role === 'admin') && (
                  <th className="px-6 py-3.5 text-right font-semibold">EMR Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {displayedPatients.map(p => {
                let latestTokenNum = 'No Token';
                let doctorName = 'Unassigned';
                let liveStatus = 'Registered';
                let statusBadgeType: 'info' | 'success' | 'warning' | 'error' = 'info';

                const tokens = p.token_queues || p.tokenQueues || p.TokenQueues || [];
                const appointments = p.appointments || p.Appointments || [];

                if (tokens.length > 0) {
                  const sortedTokens = [...tokens].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const topToken = sortedTokens[0];
                  latestTokenNum = topToken.tokenNumber;

                  const docObj = topToken.doctor || topToken.Doctor || doctors.find((d: any) => Number(d.id) === Number(topToken.doctorId) || Number(d.userId) === Number(topToken.doctorId));
                  const docUser = docObj?.user || docObj?.User;
                  const rawName = docUser?.name || docObj?.name || docObj?.specialization;
                  if (rawName) {
                    doctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
                  }

                  if (topToken.status === 'waiting') {
                    liveStatus = 'Waiting in Queue';
                    statusBadgeType = 'warning';
                  } else if (topToken.status === 'processing') {
                    liveStatus = 'In Doctor Consultation';
                    statusBadgeType = 'info';
                  } else if (topToken.status === 'completed') {
                    liveStatus = 'Consultation Completed';
                    statusBadgeType = 'success';
                  }
                } else if (appointments.length > 0) {
                  const sortedAppts = [...appointments].sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
                  const topAppt = sortedAppts[0];
                  latestTokenNum = topAppt.queueToken || 'Appt';

                  const docObj = topAppt.doctor || topAppt.Doctor || doctors.find((d: any) => d.id === topAppt.doctorId);
                  const docUser = docObj?.user || docObj?.User;
                  const rawName = docUser?.name || docObj?.name || docObj?.specialization;
                  if (rawName) {
                    doctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
                  }
                  liveStatus = topAppt.status;
                } else {
                  // Direct Patient Model Fallback
                  if (p.tokenNumber) {
                    latestTokenNum = `T-${String(p.tokenNumber).padStart(2, '0')}`;
                  }
                  const docObj = p.doctor || p.Doctor || (p.doctorId ? doctors.find((d: any) => Number(d.id) === Number(p.doctorId) || Number(d.userId) === Number(p.doctorId)) : null);
                  const docUser = docObj?.user || docObj?.User;
                  const rawName = docUser?.name || docObj?.name || docObj?.specialization;
                  if (rawName) {
                    doctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
                  }
                }

                if (doctorName === 'Unassigned') {
                  const docId = p.doctorId || (tokens.length > 0 ? tokens[0].doctorId : null);
                  const matchedDoc = doctors.find((d: any) => Number(d.id) === Number(docId) || Number(d.userId) === Number(docId));
                  const rawName = matchedDoc?.user?.name || matchedDoc?.name || (doctors.length > 0 ? (doctors[0].user?.name || doctors[0].name) : '');
                  if (rawName) {
                    doctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
                  }
                }

                // Check if patient is admitted
                if (p.admissions && p.admissions.some((a: any) => a.status === 'admitted')) {
                  liveStatus = 'Inpatient Admitted';
                  statusBadgeType = 'error';
                }

                return (
                  <tr key={p.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400">{p.mrNumber}</span>
                      <span className="block font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{p.name}</span>
                      <span className="block text-[10px] text-slate-500 font-medium capitalize mt-0.5">{p.age ? `${p.age} Yrs` : 'N/A'} • {p.gender}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {p.phone}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans text-brand-600 dark:text-brand-400 font-medium bg-brand-500/10 px-2 py-0.5 rounded">
                        <MapPin className="h-2.5 w-2.5" /> {p.area || p.address || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-dark-950 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-800">
                        {latestTokenNum}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-850 dark:text-slate-200">{doctorName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge type={statusBadgeType}>
                        {liveStatus}
                      </Badge>
                    </td>
                    {(user?.role === 'doctor' || user?.role === 'admin') && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handlePatientClick(p.id)}
                          className="inline-flex items-center gap-1 p-1.5 bg-slate-100 hover:bg-brand-500 dark:bg-dark-950 hover:text-white rounded-lg border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 text-[10px] font-bold transition-all"
                        >
                          <Eye className="h-3 w-3" /> EMR File
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Drawer Details Slide Over */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPatient ? `Patient EMR File: ${selectedPatient.name}` : 'Loading Records...'}
      >
        {drawerLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-200 dark:bg-dark-950 rounded-xl" />
            <div className="h-40 bg-slate-200 dark:bg-dark-950 rounded-xl" />
          </div>
        ) : selectedPatient ? (
          <div className="space-y-6 text-slate-700 dark:text-slate-350 max-h-[85vh] overflow-y-auto pr-1">
            {/* Quick Profile Summary */}
            <div className="flex items-center gap-4 bg-slate-150/40 dark:bg-dark-950/40 p-4 border border-slate-200/40 dark:border-slate-850 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-lg select-none shadow-sm shadow-brand-500/25">
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-mono text-[9px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded border border-brand-200/30">
                  {selectedPatient.mrNumber}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1">{selectedPatient.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{selectedPatient.phone} • Blood Type {selectedPatient.bloodGroup}</p>
              </div>
            </div>

            {/* Doctor Clinical Quick Action Toolbar */}
            <div className="bg-slate-100/60 dark:bg-dark-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Doctor Clinical Actions</span>
              
              {(user?.role === 'doctor' || user?.role === 'admin') && (
                <button
                  onClick={() => setIsDoctorEMROpen(true)}
                  className="w-full px-3 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-500/25 mb-1"
                >
                  <Stethoscope className="h-4 w-4" /> Start / Write Doctor EMR & Rx Prescription
                </button>
              )}

              <div className="flex flex-wrap gap-2">
                {user?.role !== 'accountant' && (
                  <button
                    onClick={() => setIsVitalsOpen(true)}
                    className="flex-1 px-3 py-2 rounded-lg border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Thermometer className="h-4 w-4" /> Log Vitals
                  </button>
                )}
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="flex-1 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-4 w-4" /> Add Feedback
                </button>
                <a
                  href="/laboratory"
                  className="flex-1 px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Activity className="h-4 w-4" /> Lab Test
                </a>
              </div>
            </div>

            {/* Current Vitals Snapshot Banner */}
            {selectedPatient.patient_vitals && selectedPatient.patient_vitals.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block border-b border-slate-200/50 dark:border-slate-850 pb-1">
                  Current Vital Signs Snapshot
                </span>
                {(() => {
                  const latest = selectedPatient.patient_vitals[0];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">BP</span>
                        <span className="text-sm font-black text-brand-600 dark:text-brand-400 font-mono">{latest.bp || '120/80'}</span>
                      </div>
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Temp</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{latest.temperature || 98.6} °F</span>
                      </div>
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Pulse</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{latest.pulse || 72} bpm</span>
                      </div>
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">SpO2</span>
                        <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">{latest.spo2 || 98}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Demographics Block */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555 block mb-2 border-b border-slate-200/50 dark:border-slate-850 pb-1">Demographics</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Date of Birth</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedPatient.dob}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Biological Gender</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200 capitalize">{selectedPatient.gender}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block"><MapPin className="inline h-3 w-3 mr-0.5" /> Address</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200 leading-relaxed">{selectedPatient.address}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Registered Date & Time</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200 font-mono text-[11px]">
                    {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Visits & Intake Records */}
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-emerald-600" /> Clinical Visits & Intake History
                </span>
                <span className="text-[10px] text-slate-450 font-mono">{selectedPatient.patient_visits?.length || 0} visits</span>
              </div>
              
              {selectedPatient.patient_visits && selectedPatient.patient_visits.length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.patient_visits.map((v: any) => (
                    <div key={v.id} className="p-3 bg-slate-100/60 dark:bg-dark-950/60 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-200/40 dark:border-slate-850 pb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{v.visitType?.replace('_', ' ')}</span>
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {v.reasonForVisit}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-slate-500 font-mono bg-white dark:bg-dark-900 p-2 rounded-lg">
                        <div>BP: {v.bp || 'N/A'}</div>
                        <div>Temp: {v.temperature || 'N/A'}°F</div>
                        <div>Pulse: {v.pulse || 'N/A'}</div>
                        <div>Weight: {v.weight ? `${v.weight}kg` : 'N/A'}</div>
                      </div>
                      {v.notes && <p className="text-[10px] text-slate-400 italic">Notes: {v.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-450 bg-slate-50/50 dark:bg-dark-950/30 rounded-xl border border-dashed border-slate-250">
                  No clinic intake records recorded yet.
                </div>
              )}
            </div>

            {/* Patient Feedback & Grievances Tracker */}
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Patient Feedback & Grievances
                </span>
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                >
                  <MessageSquare className="h-3 w-3" /> Log Feedback
                </button>
              </div>
              
              {selectedPatient.patient_feedbacks && selectedPatient.patient_feedbacks.length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.patient_feedbacks.map((fb: any) => (
                    <div key={fb.id} className="p-3 bg-slate-100/60 dark:bg-dark-950/60 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-200/40 dark:border-slate-850 pb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{fb.feedbackType?.replace('_', ' ')}</span>
                          <span className="text-amber-500 font-bold">
                            {'★'.repeat(fb.rating || 5)}{'☆'.repeat(5 - (fb.rating || 5))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={fb.status === 'resolved' ? 'success' : (fb.status === 'reviewed' ? 'info' : 'warning')}>
                            {fb.status}
                          </Badge>
                          <span className="font-mono">{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        "{fb.comment}"
                      </p>
                      {fb.resolutionNotes && (
                        <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-900">
                          <strong>Admin Resolution:</strong> {fb.resolutionNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-450 bg-slate-50/50 dark:bg-dark-950/30 rounded-xl border border-dashed border-slate-250">
                  No feedback or grievance logged for this patient yet.
                </div>
              )}
            </div>

            {/* Vitals History Tracking */}
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555">Vitals History Tracker</span>
                {user?.role !== 'accountant' && (
                  <button
                    onClick={() => setIsVitalsOpen(true)}
                    className="text-[9px] font-bold uppercase text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                  >
                    <Thermometer className="h-3 w-3" /> Log Vitals
                  </button>
                )}
              </div>
              
              {selectedPatient.patient_vitals && selectedPatient.patient_vitals.length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.patient_vitals.map((v: any) => (
                    <div key={v.id} className="p-3 bg-slate-100/60 dark:bg-dark-950/60 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-200/40 dark:border-slate-850 pb-1">
                        <span>{new Date(v.createdAt).toLocaleString()}</span>
                        <span>Logged by: {v.logger?.name || 'Staff Nurse'}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs font-semibold pt-0.5">
                        <div>BP: <strong className="text-slate-900 dark:text-slate-100">{v.bp}</strong></div>
                        <div>Temp: <strong className="text-slate-900 dark:text-slate-100">{v.temperature} °F</strong></div>
                        <div>Pulse: <strong className="text-slate-900 dark:text-slate-100">{v.pulse} bpm</strong></div>
                        <div>SpO2: <strong className="text-slate-900 dark:text-slate-100">{v.spo2}%</strong></div>
                      </div>
                      {v.notes && <p className="text-[10px] text-slate-500 italic">Notes: {v.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-450 bg-slate-50/50 dark:bg-dark-950/30 rounded-xl border border-dashed border-slate-250">
                  No vital signs logged for this patient yet.
                </div>
              )}
            </div>

            {/* Prescriptions & Dosage History */}
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555 flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-brand-500" /> Medicine Prescriptions & Dosage History
                </span>
              </div>
              
              {selectedPatient.invoices && selectedPatient.invoices.some((inv: any) => inv.items && inv.items.length > 0) ? (
                <div className="space-y-2">
                  {selectedPatient.invoices.flatMap((inv: any) => inv.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-100/60 dark:bg-dark-950/60 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs space-y-1 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">{item.itemName}</span>
                        <span className="text-[10px] text-slate-500">Category: {item.itemCategory || 'Pharmacy'} • Qty: {item.quantity || 1}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-brand-600 dark:text-brand-400 block text-xs">Rs. {Number(item.totalPrice || item.unitPrice || 0).toLocaleString()}</span>
                        <span className="text-[9px] text-slate-450">Item Total</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-450 bg-slate-50/50 dark:bg-dark-950/30 rounded-xl border border-dashed border-slate-250">
                  No medicine prescriptions logged for this patient yet.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Log Patient Vitals Modal */}
      <Modal isOpen={isVitalsOpen} onClose={() => setIsVitalsOpen(false)} title="Record Patient Vital Signs">
        <form onSubmit={handleAddVitalsSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="BP (Systolic/Diastolic)" required value={vitalsBP} onChange={e => setVitalsBP(e.target.value)} placeholder="120/80" />
            <Input label="Temp (°F)" required type="number" step="0.1" value={vitalsTemp} onChange={e => setVitalsTemp(Number(e.target.value))} placeholder="98.6" />
            <Input label="Pulse (bpm)" required type="number" value={vitalsPulse} onChange={e => setVitalsPulse(Number(e.target.value))} placeholder="72" />
            <Input label="SpO2 (%)" required type="number" value={vitalsSpo2} onChange={e => setVitalsSpo2(Number(e.target.value))} placeholder="98" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Weight (kg) - Optional" type="number" step="0.1" value={vitalsWeight} onChange={e => setVitalsWeight(e.target.value)} placeholder="e.g. 70" />
            <Input label="Height (cm) - Optional" type="number" step="0.1" value={vitalsHeight} onChange={e => setVitalsHeight(e.target.value)} placeholder="e.g. 175" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Care & Vitals Notes</label>
            <textarea
              rows={3}
              value={vitalsNotes}
              onChange={e => setVitalsNotes(e.target.value)}
              placeholder="e.g. Patient comfortable. Routine vital check."
              className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
            <Button type="submit">Commit Vitals Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Record Patient Feedback Modal */}
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="Record Patient Feedback & Grievance">
        <form onSubmit={handleSaveFeedbackSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Feedback Category</label>
              <select
                value={feedbackType}
                onChange={e => setFeedbackType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
              >
                <option value="appreciation">🌟 Appreciation & Compliment</option>
                <option value="complaint">⚠️ Service Complaint</option>
                <option value="billing_issue">💳 Billing / Charge Dispute</option>
                <option value="care_quality">🩺 Clinical Care Quality</option>
                <option value="suggestion">💡 Improvement Suggestion</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Star Rating (1 - 5)</label>
              <select
                value={feedbackRating}
                onChange={e => setFeedbackRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white font-bold"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4 - Good)</option>
                <option value={3}>⭐⭐⭐ (3 - Satisfactory)</option>
                <option value={2}>⭐⭐ (2 - Poor)</option>
                <option value={1}>⭐ (1 - Very Bad)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority / Severity</label>
            <div className="flex gap-3">
              {['low', 'normal', 'high', 'urgent'].map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs capitalize cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={feedbackPriority === p}
                    onChange={e => setFeedbackPriority(e.target.value)}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Feedback Remarks / Patient Statement <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              placeholder="Enter patient feedback, review of doctor consultation, nursing care, or grievance details..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsFeedbackOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={feedbackSaving} className="bg-amber-600 hover:bg-amber-700">
              Submit Feedback Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Thermal Slip Modal Simulator */}
      {isPrintOpen && printedToken && (
        <ThermalPrinter
          tokenNumber={printedToken.tokenNumber}
          type={printedToken.type}
          patientName={selectedPatient?.name || 'Patient'}
          mrNumber={selectedPatient?.mrNumber || 'MRN-000'}
          waitingTime={printedToken.waitingTime || 10}
          detail={printedToken.detail}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      {/* Doctor EMR Consultation Suite Modal */}
      <DoctorEMRModal
        isOpen={isDoctorEMROpen}
        onClose={() => setIsDoctorEMROpen(false)}
        patientId={selectedPatientId}
        onConsultationSaved={() => {
          if (selectedPatientId) fetchPatientDetails(selectedPatientId);
          fetchPatients();
        }}
      />
    </div>
  );
};
