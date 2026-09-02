import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { getCachedClinicSettings } from '../utils/clinicSettings';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  Search, UserCheck, Calendar, Phone, MapPin, Printer, Ticket,
  CheckCircle, Stethoscope, AlertCircle, Clock, Receipt, BedDouble,
  FileText, Activity, HeartPulse, User, PlusCircle, ExternalLink, ArrowRight
} from 'lucide-react';

const escapeHtml = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const OldPatient: React.FC = () => {
  // Search Inputs
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchCnic, setSearchCnic] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Patient & Token Workflow
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [chargedFee, setChargedFee] = useState<number>(0);
  const [isWithin5Days, setIsWithin5Days] = useState<boolean>(false);
  const [daysDifference, setDaysDifference] = useState<number>(999);

  // New Visit Intake Form State
  const [visitType, setVisitType] = useState('consultation');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [vitalBP, setVitalBP] = useState('120/80');
  const [vitalTemp, setVitalTemp] = useState('98.6');
  const [vitalPulse, setVitalPulse] = useState('72');
  const [vitalWeight, setVitalWeight] = useState('');
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitSuccessMsg, setVisitSuccessMsg] = useState('');
  const [patientPastVisits, setPatientPastVisits] = useState<any[]>([]);

  // Modal / Receipt state
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<any>(null);

  const fetchDoctorsAndDepts = async () => {
    try {
      const [rawDocs, depts] = await Promise.all([
        apiClient.get('/doctors').catch(() => []),
        apiClient.get('/admin/departments').catch(() => [])
      ]);
      setDepartments(Array.isArray(depts) ? depts : []);
      if (Array.isArray(rawDocs) && rawDocs.length > 0) {
        setDoctors(rawDocs);
      } else {
        const docList: any[] = [];
        (depts || []).forEach((d: any) => {
          if (d.doctors) {
            d.doctors.forEach((doc: any) => docList.push(doc));
          }
        });
        setDoctors(docList);
      }
    } catch (err) {
      console.error('Error loading doctors and departments', err);
    }
  };

  useEffect(() => {
    fetchDoctorsAndDepts();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (searchPhone) params.append('phone', searchPhone);
      if (searchCnic) params.append('cnic', searchCnic);
      if (searchArea) params.append('area', searchArea);
      if (searchDate) params.append('date', searchDate);

      const data = await apiClient.get(`/patients?${params.toString()}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error searching old patients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setVisitSuccessMsg('');

    // Fetch patient past visits
    try {
      const visitsRes = await apiClient.get(`/patients/${patient.id}/visits`).catch(() => []);
      setPatientPastVisits(Array.isArray(visitsRes) ? visitsRes : []);
    } catch (e) {
      setPatientPastVisits([]);
    }

    // Calculate Last Visit Date and 5-Day Fee Rule
    let lastVisit: Date | null = null;
    let doctorName = 'N/A';
    let assignedDocId: number | null = null;

    if (patient.token_queues && patient.token_queues.length > 0) {
      const sortedTokens = [...patient.token_queues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      lastVisit = new Date(sortedTokens[0].createdAt);
      assignedDocId = sortedTokens[0].doctorId || sortedTokens[0].doctor?.id || null;
      if (sortedTokens[0].doctor?.user?.name) {
        doctorName = sortedTokens[0].doctor.user.name;
      } else if (sortedTokens[0].doctor?.name) {
        doctorName = sortedTokens[0].doctor.name;
      }
    } else if (patient.appointments && patient.appointments.length > 0) {
      const sortedAppts = [...patient.appointments].sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
      lastVisit = new Date(sortedAppts[0].appointmentDate);
      assignedDocId = sortedAppts[0].doctorId || sortedAppts[0].doctor?.id || null;
      if (sortedAppts[0].doctor?.user?.name) {
        doctorName = sortedAppts[0].doctor.user.name;
      }
    } else if (patient.createdAt) {
      lastVisit = new Date(patient.createdAt);
      assignedDocId = patient.doctorId || patient.doctor?.id || null;
    }

    patient.computedLastVisitDate = lastVisit;
    patient.computedLastDoctor = doctorName;

    // Determine 5-day fee exemption rule cleanly using calendar date differences
    let isWithin = false;
    if (lastVisit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const vDateStr = typeof lastVisit === 'string' ? lastVisit.split('T')[0] : new Date(lastVisit).toISOString().split('T')[0];
      const visitDate = new Date(`${vDateStr}T00:00:00.000`);

      const diffTime = Math.max(0, today.getTime() - visitDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      setDaysDifference(diffDays);
      isWithin = diffDays <= 5;
      setIsWithin5Days(isWithin);
    } else {
      setIsWithin5Days(false);
      setDaysDifference(999);
    }

    // Auto pre-select assigned doctor or first available doctor by default
    let matchedDoc = null;
    if (assignedDocId) {
      matchedDoc = doctors.find(d => Number(d.id) === Number(assignedDocId));
    }
    if (!matchedDoc && doctorName && doctorName !== 'N/A') {
      const cleanDocName = doctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      matchedDoc = doctors.find(d => {
        const uName = (d.user?.name || d.name || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
        return uName === cleanDocName;
      });
    }
    if (!matchedDoc && doctors.length > 0) {
      matchedDoc = doctors[0];
    }

    if (matchedDoc) {
      setSelectedDoctorId(String(matchedDoc.id));
      setSelectedDoctor(matchedDoc);
      setSelectedDepartmentId(String(matchedDoc.departmentId || '1'));
      const fee = Number(matchedDoc.consultationFee) || 1500;
      setChargedFee(isWithin ? 0 : fee);
    } else {
      setSelectedDoctorId('');
      setSelectedDoctor(null);
      setChargedFee(isWithin ? 0 : 1500);
    }
  };

  const handleSaveVisitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!reasonForVisit.trim()) {
      alert('Please enter reason for visit / chief complaints.');
      return;
    }

    setVisitSaving(true);
    try {
      await apiClient.post(`/patients/${selectedPatient.id}/visits`, {
        doctorId: selectedDoctorId ? Number(selectedDoctorId) : null,
        departmentId: selectedDepartmentId ? Number(selectedDepartmentId) : null,
        visitType,
        reasonForVisit,
        notes: visitNotes,
        bp: vitalBP,
        temperature: vitalTemp,
        pulse: vitalPulse,
        weight: vitalWeight
      });

      setVisitSuccessMsg('✅ New Clinical Visit & Intake logged successfully in patient folder!');
      // Refresh past visits
      const visitsRes = await apiClient.get(`/patients/${selectedPatient.id}/visits`).catch(() => []);
      setPatientPastVisits(Array.isArray(visitsRes) ? visitsRes : []);
    } catch (err: any) {
      alert(err.message || 'Failed to record visit intake.');
    } finally {
      setVisitSaving(false);
    }
  };

  const handleDoctorChange = (docIdStr: string) => {
    setSelectedDoctorId(docIdStr);
    const docObj = doctors.find(d => String(d.id) === docIdStr);
    setSelectedDoctor(docObj);

    if (docObj) {
      const regFee = Number(docObj.consultationFee) || 1500;
      if (isWithin5Days) {
        setChargedFee(0);
      } else {
        setChargedFee(regFee);
      }
    }
  };

  const handlePrintSlip = (tokenObj: any) => {
    const targetDoc = selectedDoctor || doctors.find(d => Number(d.id) === Number(selectedDoctorId));
    const docName = targetDoc?.user?.name || targetDoc?.name || 'General OPD';
    const docTitle = docName.startsWith('Dr.') ? docName : `Dr. ${docName}`;

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for Dr. Talha Clinic EMR to print token slips automatically.');
      return;
    }

    const clinic = getCachedClinicSettings();

    printWindow.document.write(`
      <html>
      <head>
        <title>OPD Token Ticket - ${tokenObj.tokenNumber || 'TOKEN'}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          @media print {
            html, body {
              width: 72mm !important;
              max-width: 72mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: max-content !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #fff !important;
              color: #000 !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .ticket-wrap {
              width: 72mm !important;
              margin: 0 auto !important;
              padding: 1.5mm 1mm 1.5mm 1mm !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 1.5mm 1mm;
            color: #000;
            font-size: 10.5px;
            line-height: 1.2;
          }
          .text-center { text-align: center; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 4px; }
          .clinic-name { font-size: 14px; font-weight: 900; margin: 0; text-transform: uppercase; }
          .sub { font-size: 9px; margin: 1px 0 0 0; color: #000; }
          .token-box {
            border: 1.5px solid #000;
            padding: 4px 2px;
            margin: 5px 0;
            text-align: center;
          }
          .token-lbl { font-size: 9.5px; font-weight: 900; text-transform: uppercase; }
          .token-num { font-size: 26px; font-weight: 900; margin: 2px 0; font-family: Arial, sans-serif; letter-spacing: 1.5px; }
          .doc-name { font-size: 11px; font-weight: bold; margin-top: 2px; }
          .doc-spec { font-size: 8.5px; font-style: italic; }
          .meta-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 3px; }
          .meta-table td { padding: 1.5px 0; vertical-align: top; }
          .meta-table td.lbl { width: 40%; font-weight: bold; }
          .footer {
            border-top: 1px dashed #000;
            margin-top: 5px;
            padding-top: 4px;
            text-align: center;
            font-size: 8.5px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="ticket-wrap">
          <div class="header text-center">
            <h1 class="clinic-name">${clinic.clinicName}</h1>
            <p class="sub">${clinic.clinicAddress}</p>
            <p class="sub">Tel: ${clinic.clinicPhone} | Mobile: ${clinic.clinicMobile}</p>
          </div>

          <div class="token-box">
            <div class="token-lbl">Doctor OPD Token Sequence</div>
            <div class="token-num">${escapeHtml(tokenObj.tokenNumber || 'T-01')}</div>
            <div class="doc-name">${escapeHtml(docTitle)}</div>
            <div class="doc-spec">${escapeHtml(targetDoc?.specialization || 'Consultant Physician')}</div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="lbl">Patient Name:</td>
              <td><strong>${escapeHtml(selectedPatient?.name || 'N/A')}</strong></td>
            </tr>
            <tr>
              <td class="lbl">MR Number:</td>
              <td>${escapeHtml(selectedPatient?.mrNumber || 'N/A')}</td>
            </tr>
            <tr>
              <td class="lbl">Contact Phone:</td>
              <td>${escapeHtml(selectedPatient?.phone || 'N/A')}</td>
            </tr>
            <tr>
              <td class="lbl">Fee Charged:</td>
              <td><strong>${chargedFee === 0 ? 'FREE (5-Day Re-visit)' : `Rs. ${chargedFee}`}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Issued Time:</td>
              <td>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date().toLocaleDateString()}</td>
            </tr>
          </table>

          <div class="footer">
            <p>${clinic.receiptFooter ? clinic.receiptFooter.replace(/\n/g, '<br/>') : 'Please wait for your token number to be announced on the queue monitor.'}</p>
          </div>
          <div style="font-size: 7px; text-align: center; margin-top: 4px; color: #444; letter-spacing: 0.3px; font-weight: bold;">
            Developed by Erha Technologies
          </div>
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

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId) {
      alert('Please select a patient and a consulting doctor.');
      return;
    }

    try {
      const tokenRes = await apiClient.post('/tokens', {
        type: 'opd',
        patientId: selectedPatient.id,
        doctorId: Number(selectedDoctorId),
        fee: chargedFee,
        detail: isWithin5Days ? `Followup within ${daysDifference <= 1 ? '1 day' : `${daysDifference} days`}` : 'Regular OPD Visit'
      });

      setGeneratedToken(tokenRes);
      setIsTokenModalOpen(true);

      setTimeout(() => {
        handlePrintSlip(tokenRes);
      }, 150);
    } catch (err: any) {
      alert(err.message || 'Failed to generate token for Old Patient.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-brand-500" /> Old Patient OPD Intake & Token Generation
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search existing patient records, calculate 5-day follow-up fee exemptions, and issue doctor-specific OPD tokens.
        </p>
      </div>

      {/* Search Bar Panel (Workflow Architecture Layout) */}
      <Card className="p-5 bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-slate-850 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-brand-500" /> Patient Database Search
          </h3>
          <span className="text-[11px] text-slate-400">Search by MRN, Name, Mobile, CNIC or Area</span>
        </div>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-brand-500" /> Name / MR#
            </label>
            <Input
              placeholder="e.g. John / MRN-001..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3 text-brand-500" /> Phone
            </label>
            <Input
              placeholder="0300-1234567..."
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3 text-brand-500" /> CNIC Number
            </label>
            <Input
              placeholder="42101-1234567-1..."
              value={searchCnic}
              onChange={e => setSearchCnic(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-brand-500" /> Area / Colony
            </label>
            <Input
              placeholder="Search Area..."
              value={searchArea}
              onChange={e => setSearchArea(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-brand-500" /> Reg. Date
            </label>
            <Input
              type="date"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div className="lg:col-span-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchName('');
                setSearchPhone('');
                setSearchCnic('');
                setSearchArea('');
                setSearchDate('');
              }}
            >
              Clear
            </Button>
            <Button type="submit" size="sm" className="flex items-center gap-1.5 shadow-sm">
              <Search className="h-3.5 w-3.5" /> Search Patient Database
            </Button>
          </div>
        </form>
      </Card>

      {/* Search Results Table */}
      {loading ? (
        <div className="text-center p-8 text-xs text-slate-450">Searching patient files...</div>
      ) : hasSearched && (
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Matching Patients Found ({patients.length})
          </h3>
          {patients.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p>No existing patient files found matching the search criteria.</p>
              <a
                href="/registration"
                className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Register as a New Patient
              </a>
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-850">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-dark-950/20 text-slate-450 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3">Patient Name & MR#</th>
                    <th className="px-5 py-3">Contact Phone</th>
                    <th className="px-5 py-3">CNIC</th>
                    <th className="px-5 py-3">Age / Gender</th>
                    <th className="px-5 py-3">Last Visit</th>
                    <th className="px-5 py-3">Last Doctor</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {patients.map(p => {
                    let lastVisitStr = 'N/A';
                    let lastDocStr = 'N/A';

                    if (p.token_queues && p.token_queues.length > 0) {
                      const sortedTokens = [...p.token_queues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      lastVisitStr = new Date(sortedTokens[0].createdAt).toLocaleDateString();
                      if (sortedTokens[0].doctor?.user?.name) {
                        lastDocStr = sortedTokens[0].doctor.user.name;
                      } else if (sortedTokens[0].doctor?.name) {
                        lastDocStr = sortedTokens[0].doctor.name;
                      }
                    } else if (p.appointments && p.appointments.length > 0) {
                      const sortedAppts = [...p.appointments].sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
                      lastVisitStr = new Date(sortedAppts[0].appointmentDate).toLocaleDateString();
                      if (sortedAppts[0].doctor?.user?.name) {
                        lastDocStr = sortedAppts[0].doctor.user.name;
                      }
                    } else if (p.createdAt) {
                      lastVisitStr = new Date(p.createdAt).toLocaleDateString();
                    }

                    const isSelected = selectedPatient?.id === p.id;

                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-dark-900/50 ${isSelected ? 'bg-brand-500/10 dark:bg-brand-500/20' : ''}`}>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {p.name}
                          <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{p.mrNumber}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">{p.phone || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{p.cnic || 'N/A'}</td>
                        <td className="px-5 py-3.5 capitalize">{p.age ? `${p.age} Yrs` : 'N/A'} • {p.gender || 'male'}</td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{lastVisitStr}</td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{lastDocStr}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleSelectPatient(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-dark-950 text-slate-700 dark:text-slate-300 hover:bg-brand-500 hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : 'Select Patient'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* SELECTED PATIENT PROFILE & ACTION SUITE */}
      {selectedPatient && (
        <div className="space-y-6">
          {/* Patient Overview Card */}
          <Card className="p-5 bg-gradient-to-r from-slate-50 via-brand-50/20 to-white dark:from-dark-900 dark:via-brand-950/10 dark:to-dark-900 border border-brand-500/30 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-brand-500/20">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedPatient.name}</h3>
                    <Badge variant="brand">{selectedPatient.mrNumber}</Badge>
                    <Badge variant={isWithin5Days ? 'success' : 'neutral'}>
                      {isWithin5Days ? `Free Re-visit (${daysDifference <= 1 ? '1 day' : `${daysDifference} days`})` : `Standard Fee (${daysDifference === 999 ? 'First' : `${daysDifference} days ago`})`}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>📞 {selectedPatient.phone}</span>
                    {selectedPatient.cnic && <span>🪪 CNIC: {selectedPatient.cnic}</span>}
                    <span>🎂 {selectedPatient.age || 'N/A'} Yrs ({selectedPatient.gender})</span>
                    <span>🩸 {selectedPatient.bloodGroup || 'Blood: N/A'}</span>
                    <span>📍 {selectedPatient.area || selectedPatient.address || 'N/A'}</span>
                  </p>
                </div>
              </div>

              {/* Quick Jump Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/billing`}
                  className="px-3 py-1.5 bg-white dark:bg-dark-950 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Direct Bill
                </a>
                <a
                  href={`/admissions`}
                  className="px-3 py-1.5 bg-white dark:bg-dark-950 hover:bg-rose-50 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <BedDouble className="h-3.5 w-3.5 text-rose-600" /> Admit IPD
                </a>
                <a
                  href={`/patients`}
                  className="px-3 py-1.5 bg-white dark:bg-dark-950 hover:bg-brand-50 hover:text-brand-700 dark:hover:text-brand-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-brand-600" /> View EMR
                </a>
              </div>
            </div>

            {/* Sub-panels Grid: 1. New Visit Intake Form  2. Token Generation & 5-Day Exemption */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
              
              {/* Left Column: New Clinical Visit Intake Form (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 bg-white dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-emerald-600" /> Log Clinical Visit / Intake Record
                    </h4>
                    <span className="text-[10px] text-slate-450">OPD & Triage Intake</span>
                  </div>

                  {visitSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {visitSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleSaveVisitIntake} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Visit Type</label>
                        <select
                          value={visitType}
                          onChange={e => setVisitType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                        >
                          <option value="consultation">OPD Doctor Consultation</option>
                          <option value="follow_up">Follow-Up Visit</option>
                          <option value="emergency">Emergency / Triage</option>
                          <option value="routine_checkup">Routine Checkup</option>
                          <option value="vaccination">Vaccination / Immunization</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Attending Doctor</label>
                        <select
                          value={selectedDoctorId}
                          onChange={e => {
                            setSelectedDoctorId(e.target.value);
                            const d = doctors.find(doc => String(doc.id) === e.target.value);
                            if (d) {
                              setSelectedDoctor(d);
                              setSelectedDepartmentId(String(d.departmentId || '1'));
                              setChargedFee(isWithin5Days ? 0 : (Number(d.consultationFee) || 1500));
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                        >
                          <option value="">-- Select Doctor --</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.user?.name || d.name || `Dr. #${d.id}`} ({d.specialization || d.department?.name || 'OPD'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Reason for Visit / Chief Complaints <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Severe headache, persistent cough for 3 days, high fever..."
                        value={reasonForVisit}
                        onChange={e => setReasonForVisit(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Quick Vitals Triage Row */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Activity className="h-3 w-3 text-brand-500" /> Triage Vitals
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Input
                          label="BP (mmHg)"
                          placeholder="120/80"
                          value={vitalBP}
                          onChange={e => setVitalBP(e.target.value)}
                          className="!py-1.5 text-xs"
                        />
                        <Input
                          label="Temp (°F)"
                          placeholder="98.6"
                          value={vitalTemp}
                          onChange={e => setVitalTemp(e.target.value)}
                          className="!py-1.5 text-xs"
                        />
                        <Input
                          label="Pulse (bpm)"
                          placeholder="72"
                          value={vitalPulse}
                          onChange={e => setVitalPulse(e.target.value)}
                          className="!py-1.5 text-xs"
                        />
                        <Input
                          label="Weight (kg)"
                          placeholder="e.g. 68"
                          value={vitalWeight}
                          onChange={e => setVitalWeight(e.target.value)}
                          className="!py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button type="submit" size="sm" isLoading={visitSaving} className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Save Visit Intake Record
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Recent Visits History list */}
                {patientPastVisits.length > 0 && (
                  <div className="p-3 bg-white dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Recent Recorded Visits ({patientPastVisits.length})
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {patientPastVisits.slice(0, 3).map((v: any) => (
                        <div key={v.id} className="p-2 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-slate-800 text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{v.visitType?.replace('_', ' ')}: </span>
                            <span className="text-slate-600 dark:text-slate-400">{v.reasonForVisit}</span>
                            <div className="text-[10px] text-slate-450 mt-0.5 flex gap-2">
                              <span>BP: {v.bp || 'N/A'}</span>
                              <span>Temp: {v.temperature || 'N/A'}°F</span>
                              <span>Pulse: {v.pulse || 'N/A'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: OPD Token Fee Calculation & Issue Slip (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-white dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="h-4 w-4 text-brand-500" /> OPD Doctor Queue Token
                    </h4>
                    <span className="text-[10px] text-slate-450">5-Day Exemption Engine</span>
                  </div>

                  <form onSubmit={handleGenerateToken} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Select Doctor
                      </label>
                      <select
                        required
                        value={selectedDoctorId}
                        onChange={e => {
                          setSelectedDoctorId(e.target.value);
                          const d = doctors.find(doc => String(doc.id) === e.target.value);
                          if (d) {
                            setSelectedDoctor(d);
                            setSelectedDepartmentId(String(d.departmentId || '1'));
                            setChargedFee(isWithin5Days ? 0 : (Number(d.consultationFee) || 1500));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                      >
                        <option value="">-- Select Doctor --</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.user?.name || d.name || `Dr. #${d.id}`} - Rs. {d.consultationFee || 1500}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fee Calculation Badge */}
                    <div className="p-3 bg-slate-50 dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Consultation Fee:</span>
                        <span className={`text-lg font-black ${isWithin5Days ? 'text-emerald-600' : 'text-brand-600'}`}>
                          Rs. {chargedFee.toLocaleString()}
                        </span>
                      </div>
                      {isWithin5Days ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Follow-up within 5 days ({daysDifference <= 1 ? '1 day' : `${daysDifference} days`}) - Free OPD Token</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-450">
                          {daysDifference === 999 ? 'First visit on record' : `Last checked ${daysDifference} days ago (exceeds 5-day limit)`}. Standard consultation fee applies.
                        </p>
                      )}
                    </div>

                    <Button type="submit" disabled={!selectedDoctorId} className="w-full flex items-center justify-center gap-2 shadow-md">
                      <Printer className="h-4 w-4" /> Issue Token & Print Slip
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Print Thermal Token Slip Modal */}
      <Modal isOpen={isTokenModalOpen} onClose={() => setIsTokenModalOpen(false)} title="OPD Token Slip Printed">
        {generatedToken && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-5 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-inner space-y-3 text-center">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">Dr. Talha Clinic</h3>
                <p className="text-[10px] text-slate-500">Enterprise OPD Queue Ticket</p>
              </div>

              <div className="py-2 space-y-1">
                <span className="text-[10px] uppercase text-slate-500 block">Doctor OPD Token Sequence</span>
                <span className="text-2xl font-black text-brand-600 block tracking-tight">{generatedToken.tokenNumber}</span>
                <span className="text-[10px] text-slate-600 block font-sans font-bold">{generatedToken.doctor?.user?.name || 'General OPD'}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 text-left space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Patient:</span> <strong>{generatedToken.patient?.name}</strong></div>
                <div className="flex justify-between"><span>MR#:</span> <strong>{generatedToken.patient?.mrNumber}</strong></div>
                <div className="flex justify-between"><span>Fee Charged:</span> <strong>Rs. {chargedFee}</strong></div>
                <div className="flex justify-between"><span>Date:</span> <span>{new Date().toLocaleTimeString()}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => window.print()} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Print Thermal Ticket
              </Button>
              <Button variant="secondary" onClick={() => setIsTokenModalOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
