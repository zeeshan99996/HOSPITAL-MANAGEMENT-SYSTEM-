import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Search, UserCheck, Calendar, Phone, MapPin, Printer, Ticket, CheckCircle, Stethoscope, AlertCircle, Clock } from 'lucide-react';

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
  // Search Inputs (Image 02)
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Patient & Token Workflow
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [chargedFee, setChargedFee] = useState<number>(0);
  const [isWithin5Days, setIsWithin5Days] = useState<boolean>(false);
  const [daysDifference, setDaysDifference] = useState<number>(999);

  // Modal / Receipt state
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<any>(null);

  const fetchDoctors = async () => {
    try {
      const rawDocs = await apiClient.get('/doctors');
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
      console.error('Error loading doctors', err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (searchPhone) params.append('phone', searchPhone);
      if (searchArea) params.append('area', searchArea);
      if (searchDate) params.append('date', searchDate);

      const data = await apiClient.get(`/patients?${params.toString()}`);
      setPatients(data);
    } catch (err) {
      console.error('Error searching old patients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);

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
      const fee = Number(matchedDoc.consultationFee) || 1500;
      setChargedFee(isWithin ? 0 : fee);
    } else {
      setSelectedDoctorId('');
      setSelectedDoctor(null);
      setChargedFee(isWithin ? 0 : 1500);
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
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for LifeFlow EMR to print token slips automatically.');
      return;
    }

    printWindow.document.write(`
      <html>
      <head>
        <title>OPD Token Ticket - ${tokenObj.tokenNumber || 'TOKEN'}</title>
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
          <div class="token-label">OPD RE-VISIT TOKEN</div>
          <div class="token-number">${escapeHtml(tokenObj.tokenNumber || 'T-01')}</div>
          <div style="font-size: 10px; margin-top: 3px; font-weight: bold; color: #333;">MRN: ${escapeHtml(selectedPatient?.mrNumber || 'MR-N/A')}</div>
        </div>

        <div class="divider"></div>

        <div class="info-row"><span class="info-label">Patient Name:</span> <span>${escapeHtml(selectedPatient?.name || 'Patient')}</span></div>
        <div class="info-row"><span class="info-label">Assigned Doctor:</span> <span>${escapeHtml(docTitle)}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span> <span>${escapeHtml(selectedPatient?.phone || 'N/A')}</span></div>
        <div class="info-row"><span class="info-label">Visit Type:</span> <span>${isWithin5Days ? '5-Day Free Re-visit' : 'Regular OPD Visit'}</span></div>
        <div class="info-row"><span class="info-label">Fee Charged:</span> <span>Rs. ${escapeHtml(chargedFee)}</span></div>
        <div class="info-row"><span class="info-label">Date & Time:</span> <span>${escapeHtml(new Date().toLocaleString())}</span></div>

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
        detail: isWithin5Days ? '5-Day Free Follow-Up Visit' : 'Regular OPD Visit'
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

      {/* Search Bar Panel (Image 02 Layout) */}
      <Card className="p-5 bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-slate-850 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          Patient Database Search
        </h3>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-brand-500" /> Patient Name / MR#
            </label>
            <Input
              placeholder="Search Name or MR..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3 text-brand-500" /> Phone Number
            </label>
            <Input
              placeholder="Search Phone..."
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
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
              <Calendar className="h-3 w-3 text-brand-500" /> Date
            </label>
            <Input
              type="date"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <Button type="submit" className="flex items-center gap-2 shadow-sm">
              <Search className="h-4 w-4" /> Search Patient
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
            <Card className="p-8 text-center text-xs text-slate-500">
              No existing patient files found matching the search criteria. Please register as a New Patient.
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-850">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-dark-950/20 text-slate-450 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3">Patient Name & MR#</th>
                    <th className="px-5 py-3">Contact Phone</th>
                    <th className="px-5 py-3">Age / Gender</th>
                    <th className="px-5 py-3">Last Date of Visit</th>
                    <th className="px-5 py-3">Doctor Last Checked</th>
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

      {/* Fee Calculation & Token Generation Panel */}
      {selectedPatient && (
        <Card className="p-6 space-y-5 bg-slate-50/50 dark:bg-dark-900/50 border border-brand-500/30 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="h-4 w-4 text-brand-500" /> Patient Selection & Doctor Token Fee Panel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Patient: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong> ({selectedPatient.mrNumber})
              </p>
            </div>
            <Badge type={isWithin5Days ? 'success' : 'info'}>
              {isWithin5Days ? `5-Day Free Follow-Up (${daysDifference} days ago)` : `Regular Visit (${daysDifference === 999 ? 'First' : `${daysDifference} days ago`})`}
            </Badge>
          </div>

          <form onSubmit={handleGenerateToken} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select Available OPD Physician
                </label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={e => handleDoctorChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : `Dr. ${d.specialization || 'Physician'}`} ({d.specialization || d.department?.name || 'General OPD'}) - Fee: Rs. {d.consultationFee || 1500}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fee Breakdown Box */}
              <div className="p-4 bg-white dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Consultation Fee Charge</span>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Charged Amount:</span>
                  <span className={`text-xl font-extrabold ${isWithin5Days ? 'text-emerald-500' : 'text-brand-600 dark:text-brand-400'}`}>
                    Rs. {chargedFee.toLocaleString()}
                  </span>
                </div>
                {isWithin5Days ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Fee Exempted: Patient visited within 5 days.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-450 font-semibold mt-1">
                    Standard doctor consultation fee applied.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="submit" disabled={!selectedDoctorId} className="flex items-center gap-2 shadow-md">
                <Printer className="h-4 w-4" /> Issue OPD Token & Print Slip
              </Button>
            </div>
          </form>
        </Card>
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
