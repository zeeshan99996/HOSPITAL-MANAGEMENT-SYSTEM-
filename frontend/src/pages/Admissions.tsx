import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { BedDouble, Plus, ClipboardList, Search, UserMinus, Pill, Stethoscope, Scissors, Clock, HeartPulse, Thermometer, Printer, Receipt, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export const Admissions: React.FC = () => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Category & Filter tabs
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'medical' | 'surgical'>('all');
  const [stayFilter, setStayFilter] = useState<'all' | 'short' | 'long'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal controls
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAdministerOpen, setIsAdministerOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);

  // Discharge & Inpatient Billing Modal States
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [dischargeDate, setDischargeDate] = useState('');
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [dischargeStayDays, setDischargeStayDays] = useState(1);
  const [dischargeBedCharges, setDischargeBedCharges] = useState('2500');
  const [dischargeDoctorFee, setDischargeDoctorFee] = useState('1500');
  const [dischargeNursingFee, setDischargeNursingFee] = useState('1000');
  const [dischargeMedCharges, setDischargeMedCharges] = useState('0');
  const [dischargeOtherCharges, setDischargeOtherCharges] = useState('0');
  const [dischargeDiscount, setDischargeDiscount] = useState('0');
  const [dischargeAdvancePaid, setDischargeAdvancePaid] = useState('0');
  const [dischargePaidAmount, setDischargePaidAmount] = useState('0');
  const [dischargePaymentMethod, setDischargePaymentMethod] = useState('cash');
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false);
  const [generatedDischargeInvoice, setGeneratedDischargeInvoice] = useState<any>(null);
  const [isDischargeSuccessOpen, setIsDischargeSuccessOpen] = useState(false);

  // Admit Form states
  const [patientId, setPatientId] = useState('');
  const [bedId, setBedId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [admissionCategory, setAdmissionCategory] = useState<'medical' | 'surgical'>('medical');
  const [stayType, setStayType] = useState<'short' | 'long'>('short');
  const [condition, setCondition] = useState('');
  const [surgeryDetails, setSurgeryDetails] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [baselineCost, setBaselineCost] = useState('15000');
  const [advancePaid, setAdvancePaid] = useState('5000');
  const [discount, setDiscount] = useState('1000');

  // Daily Vitals Logging Form state
  const [vitalBP, setVitalBP] = useState('120/80');
  const [vitalTemp, setVitalTemp] = useState('98.6');
  const [vitalPulse, setVitalPulse] = useState('72');
  const [vitalSpo2, setVitalSpo2] = useState('98');
  const [vitalNotes, setVitalNotes] = useState('');

  // Administer Medication form states
  const [medId, setMedId] = useState('');
  const [medQty, setMedQty] = useState('1');

  const fetchData = async () => {
    setLoading(true);
    try {
      const bedList = await apiClient.get('/beds');
      const bArr = Array.isArray(bedList) ? bedList : [];
      setBeds(bArr);
      if (bArr.length > 0 && !bedId) {
        const avail = bArr.find((b: any) => b.status === 'available' || !b.status);
        if (avail) setBedId(avail.id.toString());
      }

      const admList = await apiClient.get('/admissions');
      setAdmissions(Array.isArray(admList) ? admList : []);

      const patientList = await apiClient.get('/patients');
      const pArr = Array.isArray(patientList) ? patientList : [];
      setPatients(pArr);
      if (pArr.length > 0 && !patientId) {
        setPatientId(pArr[0].id.toString());
      }

      let docList: any[] = [];
      try {
        const rawDocs = await apiClient.get('/doctors');
        if (Array.isArray(rawDocs) && rawDocs.length > 0) {
          docList = rawDocs.map((doc: any) => ({
            id: doc.id,
            name: doc.user?.name ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`) : `Dr. ${doc.specialization || 'Physician'}`
          }));
        }
      } catch (e) {}

      if (docList.length === 0) {
        try {
          const depts = await apiClient.get('/admin/departments');
          if (Array.isArray(depts)) {
            depts.forEach((d: any) => {
              if (d.doctors) {
                d.doctors.forEach((doc: any) => {
                  docList.push({
                    id: doc.id,
                    name: doc.user?.name ? (doc.user.name.startsWith('Dr.') ? doc.user.name : `Dr. ${doc.user.name}`) : `Dr. ${doc.specialization || 'Physician'}`
                  });
                });
              }
            });
          }
        } catch (e) {}
      }

      setDoctors(docList);
      if (docList.length > 0 && !doctorId) {
        setDoctorId(docList[0].id.toString());
      }

      const medList = await apiClient.get('/medicines');
      setMedicines(Array.isArray(medList) ? medList : []);
    } catch (err) {
      console.error('Error fetching admission data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admissions', {
        patientId: Number(patientId),
        bedId: Number(bedId),
        doctorId: Number(doctorId),
        admissionCategory,
        stayType,
        condition,
        surgeryDetails: admissionCategory === 'surgical' ? surgeryDetails : null,
        treatmentPlan,
        notes,
        baselineCost: Number(baselineCost),
        advancePaid: Number(advancePaid),
        discount: Number(discount),
      });

      // Optionally log initial vitals if patient file selected
      if (vitalBP) {
        try {
          await apiClient.post(`/patients/${patientId}/vitals`, {
            bp: vitalBP,
            temperature: Number(vitalTemp) || 98.6,
            pulse: Number(vitalPulse) || 72,
            respRate: 16,
            spo2: Number(vitalSpo2) || 98,
            notes: `Initial Admission Vitals (${admissionCategory.toUpperCase()} - ${stayType.toUpperCase()} STAY)`
          });
        } catch (e) {}
      }

      setIsAdmitOpen(false);
      fetchData();

      // Reset
      setPatientId('');
      setBedId('');
      setDoctorId('');
      setCondition('');
      setSurgeryDetails('');
      setTreatmentPlan('');
      setNotes('');
      setBaselineCost('15000');
      setAdvancePaid('5000');
      setDiscount('1000');
    } catch (err) {
      alert('Error admitting patient. Please verify bed availability and required fields.');
    }
  };

  const handleNotesClick = (adm: any) => {
    setSelectedAdmission(adm);
    setNotes(adm.notes || '');
    setIsNotesOpen(true);
  };

  const handleNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admissions/${selectedAdmission.id}/notes`, { notes });
      setIsNotesOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to update clinical logs.');
    }
  };

  const handleLogVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    try {
      await apiClient.post(`/patients/${selectedAdmission.patientId}/vitals`, {
        bp: vitalBP,
        temperature: Number(vitalTemp),
        pulse: Number(vitalPulse),
        respRate: 16,
        spo2: Number(vitalSpo2),
        notes: `Admitted Stay Log: ${vitalNotes || 'Routine vital check.'}`
      });
      setIsVitalsOpen(false);
      alert('Patient daily vitals logged successfully.');
      setVitalNotes('');
    } catch (err) {
      alert('Failed to log patient vitals.');
    }
  };

  const handleAdministerClick = (adm: any) => {
    setSelectedAdmission(adm);
    setMedId('');
    setMedQty('1');
    setIsAdministerOpen(true);
  };

  const handleAdministerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !medId) return;

    try {
      const selectedMed = medicines.find(m => m.id === Number(medId));
      const res = await apiClient.post('/medicines/administer', {
        patientId: selectedAdmission.patientId,
        medicineId: Number(medId),
        quantity: Number(medQty),
      });

      setIsAdministerOpen(false);
      fetchData();

      let alertMsg = `Administered ${medQty} ${selectedMed?.unit || 'units'} of ${selectedMed?.name || 'Medication'}. Patient bill updated.`;
      if (res.lowStockTriggered) {
        alertMsg += '\n\n⚠️ LOW STOCK ALERT TRIGGERED: Medicine inventory is running below threshold!';
      }
      alert(alertMsg);
    } catch (err: any) {
      alert(err.message || 'Failed to administer medication.');
    }
  };

  const handleOpenDischarge = (adm: any) => {
    setSelectedAdmission(adm);
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 16);
    setDischargeDate(nowStr);

    const admDate = new Date(adm.admissionDate || adm.createdAt);
    const diffTime = Math.abs(now.getTime() - admDate.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setDischargeStayDays(diffDays);

    const dailyBedRate = adm.bed?.type === 'icu' ? 5000 : adm.bed?.type === 'private' ? 3500 : 2000;
    const initialBedCost = Number(adm.baselineCost) > 0 ? Number(adm.baselineCost) : (diffDays * dailyBedRate);
    setDischargeBedCharges(String(initialBedCost));
    setDischargeDoctorFee(adm.doctor?.consultationFee ? String(adm.doctor.consultationFee) : '1500');
    setDischargeNursingFee('1000');
    setDischargeMedCharges('0');
    setDischargeOtherCharges('0');
    setDischargeDiscount(adm.discount ? String(adm.discount) : '0');
    setDischargeAdvancePaid(adm.advancePaid ? String(adm.advancePaid) : '0');
    setDischargePaidAmount(adm.advancePaid ? String(adm.advancePaid) : '0');
    setDischargePaymentMethod('cash');
    setDischargeNotes('Patient has completed the course of clinical treatment, vitals are stable, and is cleared for discharge.');
    setIsDischargeOpen(true);
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setDischargeSubmitting(true);

    try {
      const payload = {
        dischargeDate,
        dischargeNotes,
        bedCharges: Number(dischargeBedCharges) || 0,
        doctorFee: Number(dischargeDoctorFee) || 0,
        nursingFee: Number(dischargeNursingFee) || 0,
        medicationCharges: Number(dischargeMedCharges) || 0,
        otherCharges: Number(dischargeOtherCharges) || 0,
        discount: Number(dischargeDiscount) || 0,
        advancePaid: Number(dischargeAdvancePaid) || 0,
        paidAmount: Number(dischargePaidAmount) || 0,
        paymentMethod: dischargePaymentMethod,
        createInvoice: true,
      };

      const res = await apiClient.put(`/admissions/${selectedAdmission.id}/discharge`, payload);

      setIsDischargeOpen(false);
      fetchData();

      if (res?.invoice) {
        setGeneratedDischargeInvoice(res.invoice);
        setIsDischargeSuccessOpen(true);
      } else {
        alert('Patient discharged successfully. Inpatient invoice generated in Billing section.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process patient discharge.');
    } finally {
      setDischargeSubmitting(false);
    }
  };

  const handlePrintDischargeSlip = () => {
    if (!selectedAdmission) return;
    const printWindow = window.open('', '_blank', 'width=750,height=900');
    if (!printWindow) {
      alert('Pop-up window blocked. Please allow pop-ups to print the discharge summary slip.');
      return;
    }

    const adm = selectedAdmission;
    const patientName = adm.patient?.name || 'Patient';
    const mrn = adm.patient?.mrNumber || 'MR-N/A';
    const bedName = `${adm.bed?.bedNumber || 'Bed'} (${adm.bed?.wardName || 'Ward'})`;
    const docName = adm.doctor?.user?.name || adm.doctor?.staffMember?.name || adm.doctor?.name || 'Assigned Consultant';
    const admDateStr = new Date(adm.admissionDate || adm.createdAt).toLocaleString();
    const disDateStr = new Date(dischargeDate || Date.now()).toLocaleString();

    const roomC = Number(dischargeBedCharges) || 0;
    const docC = Number(dischargeDoctorFee) || 0;
    const nurseC = Number(dischargeNursingFee) || 0;
    const medC = Number(dischargeMedCharges) || 0;
    const otherC = Number(dischargeOtherCharges) || 0;
    const discC = Number(dischargeDiscount) || 0;
    const advC = Number(dischargeAdvancePaid) || 0;
    const grandT = Math.max(0, (roomC + docC + nurseC + medC + otherC) - discC);
    const paidA = Number(dischargePaidAmount) || 0;
    const duesA = Math.max(0, grandT - paidA);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Discharge Summary & Final Bill - ${mrn}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; max-width: 700px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .clinic-name { font-size: 22px; font-weight: 900; color: #0284c7; letter-spacing: 0.5px; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .title-badge { display: inline-block; background: #0f172a; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 4px; text-transform: uppercase; margin-top: 8px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; color: #334155; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; font-size: 12px; }
          .grid-row { display: flex; justify-content: space-between; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: 700; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
          .table th { background: #f1f5f9; padding: 6px 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
          .table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
          .table tr:last-child td { border-bottom: none; }
          .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 14px; }
          .summary-total { font-size: 14px; font-weight: 800; display: flex; justify-content: space-between; border-top: 1px dashed #94a3b8; padding-top: 6px; margin-top: 6px; }
          .notes-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; font-size: 12px; margin-top: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
          .sig-line { width: 180px; border-top: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">DR. TALHA CLINIC</div>
          <div class="clinic-sub">12-B, Main Boulevard, Gulberg III, Lahore • Tel: (042) 35889900 • Emergency: 0311-6353044</div>
          <div class="title-badge">INPATIENT DISCHARGE SUMMARY & FINAL BILL</div>
        </div>

        <div class="section">
          <div class="section-title">Patient & Admission Details</div>
          <div class="grid">
            <div class="grid-row"><span class="label">Patient Name:</span> <span class="val">${patientName}</span></div>
            <div class="grid-row"><span class="label">MR Number:</span> <span class="val">${mrn}</span></div>
            <div class="grid-row"><span class="label">Admission Date:</span> <span class="val">${admDateStr}</span></div>
            <div class="grid-row"><span class="label">Discharge Date:</span> <span class="val">${disDateStr}</span></div>
            <div class="grid-row"><span class="label">Ward & Bed:</span> <span class="val">${bedName}</span></div>
            <div class="grid-row"><span class="label">Total Stay Duration:</span> <span class="val">${dischargeStayDays} Day(s)</span></div>
            <div class="grid-row"><span class="label">Consultant Doctor:</span> <span class="val">${docName}</span></div>
            <div class="grid-row"><span class="label">Clinical Category:</span> <span class="val" style="text-transform: capitalize;">${adm.admissionCategory || 'Medical'} (${adm.stayType || 'Short'} Stay)</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Inpatient Itemized Bill Statement</div>
          <table class="table">
            <thead>
              <tr>
                <th>Service / Charge Description</th>
                <th style="text-align: center;">Duration / Qty</th>
                <th style="text-align: right;">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Room & Bed Stay Charges (${bedName})</td>
                <td style="text-align: center;">${dischargeStayDays} Day(s)</td>
                <td style="text-align: right;">Rs. ${roomC.toLocaleString()}</td>
              </tr>
              ${docC > 0 ? `<tr><td>Doctor & Consultant Visitation Fees</td><td style="text-align: center;">-</td><td style="text-align: right;">Rs. ${docC.toLocaleString()}</td></tr>` : ''}
              ${nurseC > 0 ? `<tr><td>Nursing Care & Clinical Monitoring</td><td style="text-align: center;">-</td><td style="text-align: right;">Rs. ${nurseC.toLocaleString()}</td></tr>` : ''}
              ${medC > 0 ? `<tr><td>Medications, Injections & IV Supplies</td><td style="text-align: center;">-</td><td style="text-align: right;">Rs. ${medC.toLocaleString()}</td></tr>` : ''}
              ${otherC > 0 ? `<tr><td>Miscellaneous Hospital Services</td><td style="text-align: center;">-</td><td style="text-align: right;">Rs. ${otherC.toLocaleString()}</td></tr>` : ''}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="grid-row" style="margin-bottom: 4px;"><span class="label">Total Gross Bill:</span> <span>Rs. ${(roomC + docC + nurseC + medC + otherC).toLocaleString()}</span></div>
            ${discC > 0 ? `<div class="grid-row" style="margin-bottom: 4px; color: #e11d48;"><span class="label" style="color: #e11d48;">Special Discount:</span> <span>- Rs. ${discC.toLocaleString()}</span></div>` : ''}
            ${advC > 0 ? `<div class="grid-row" style="margin-bottom: 4px; color: #0284c7;"><span class="label" style="color: #0284c7;">Advance Deposit Paid:</span> <span>- Rs. ${advC.toLocaleString()}</span></div>` : ''}
            <div class="summary-total">
              <span>Grand Total Payable:</span>
              <span style="color: #0284c7;">Rs. ${grandT.toLocaleString()}</span>
            </div>
            <div class="grid-row" style="margin-top: 6px; font-weight: 700;">
              <span>Amount Paid at Discharge:</span>
              <span style="color: #16a34a;">Rs. ${paidA.toLocaleString()}</span>
            </div>
            <div class="grid-row" style="margin-top: 4px; font-weight: 700;">
              <span>Remaining Balance / Dues:</span>
              <span style="color: ${duesA > 0 ? '#e11d48' : '#16a34a'};">Rs. ${duesA.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="notes-box">
          <div style="font-weight: 800; color: #166534; margin-bottom: 4px; text-transform: uppercase;">Doctor's Discharge Summary & Advice:</div>
          <div>${dischargeNotes || 'Patient is discharged in a stable condition with advice for follow-up.'}</div>
        </div>

        <div class="sig-row">
          <div class="sig-line">Patient / Attendant Signature</div>
          <div class="sig-line">Medical Officer / Consultant</div>
        </div>

        <div class="footer">
          This is an official computer-generated Discharge Summary and Invoice from LifeFlow HMS.<br/>
          Thank you for choosing Dr. Talha Clinic. We wish you a speedy recovery!
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredAdmissions = admissions.filter(adm => {
    const matchesCategory = categoryFilter === 'all' || adm.admissionCategory === categoryFilter;
    const matchesStay = stayFilter === 'all' || adm.stayType === stayFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      adm.patient?.name?.toLowerCase().includes(searchLower) ||
      adm.patient?.mrNumber?.toLowerCase().includes(searchLower) ||
      adm.condition?.toLowerCase().includes(searchLower);
    return matchesCategory && matchesStay && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-brand-500" /> Patient Admissions & Inpatient Care
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage Medical vs. Surgical patients, Short/Long-term stays, and daily BP & vitals monitoring.
          </p>
        </div>
        {user?.role !== 'patient' && (
          <Button onClick={() => setIsAdmitOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Admit Patient
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4 space-y-3 bg-slate-50/50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              All Registries ({admissions.length})
            </button>
            <button
              onClick={() => setCategoryFilter('medical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'medical'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" /> Medical Patients ({admissions.filter(a => a.admissionCategory === 'medical').length})
            </button>
            <button
              onClick={() => setCategoryFilter('surgical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'surgical'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" /> Surgical Patients ({admissions.filter(a => a.admissionCategory === 'surgical').length})
            </button>
          </div>

          {/* Stay Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-450 uppercase">Stay Duration:</span>
            <select
              value={stayFilter}
              onChange={e => setStayFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 font-bold text-slate-800 dark:text-slate-100"
            >
              <option value="all">All Stay Types</option>
              <option value="short">Short Stay (&lt; 48 Hours)</option>
              <option value="long">Long-Term Stay (3+ Days)</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, MR Number, or condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-950 py-1.5 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-dark-900 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Bed Allocation Visual Grid */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 block">Bed Layout Grid & Status</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {beds.map(bed => (
                <Card key={bed.id} className="p-4 flex flex-col justify-between items-center text-center gap-2 border border-slate-200/60 dark:border-slate-850">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center text-slate-500">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100">{bed.bedNumber}</h4>
                    <p className="text-[9px] text-slate-500 font-medium capitalize">{bed.type} • {bed.wardName}</p>
                  </div>
                  <Badge type={bed.status === 'available' ? 'success' : bed.status === 'occupied' ? 'warning' : 'error'}>
                    {bed.status}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>

          {/* Active Inpatients Table */}
          <div className="space-y-3 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 block">Active Inpatient Registry</span>
            {filteredAdmissions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-xs font-bold text-slate-500">No admitted patient records found for the selected filter.</p>
              </Card>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                      <th className="px-6 py-3.5">Patient / Ward Bed</th>
                      <th className="px-6 py-3.5">Category & Stay</th>
                      <th className="px-6 py-3.5">Physician & Diagnosis</th>
                      <th className="px-6 py-3.5">IPD Financial Dues</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Care Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {filteredAdmissions.map(adm => {
                      const dues = Number(adm.baselineCost) - Number(adm.advancePaid) - Number(adm.discount);
                      const isSurgical = adm.admissionCategory === 'surgical';
                      const isLongStay = adm.stayType === 'long';

                      return (
                        <tr key={adm.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                            {adm.patient?.name}
                            <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{adm.patient?.mrNumber}</span>
                            <span className="block text-[10px] text-brand-500 mt-0.5">Bed: {adm.bed?.bedNumber} ({adm.bed?.wardName})</span>
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
                            <span className="font-semibold text-slate-850 dark:text-slate-250">Diag: {adm.condition}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">Doctor: {adm.doctor?.user?.name || 'Unassigned'}</span>
                            {adm.surgeryDetails && (
                              <span className="block text-[10px] text-rose-500 font-medium truncate max-w-[180px] mt-0.5">Surg Notes: {adm.surgeryDetails}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] space-y-0.5 font-semibold text-slate-800 dark:text-slate-300">
                              <div>Cost: Rs. {Number(adm.baselineCost).toLocaleString()}</div>
                              <div>Advance: Rs. {Number(adm.advancePaid).toLocaleString()}</div>
                              <div className="text-rose-500">Dues: Rs. {dues.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge type={adm.status === 'admitted' ? 'warning' : 'success'}>
                              {adm.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-y-1.5 sm:space-y-0 sm:space-x-1.5 flex flex-col sm:flex-row justify-end items-center">
                            <button
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setVitalBP('120/80');
                                setVitalTemp('98.6');
                                setVitalPulse('72');
                                setVitalSpo2('98');
                                setVitalNotes('');
                                setIsVitalsOpen(true);
                              }}
                              className="inline-flex items-center gap-1 p-1 px-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              title="Log Daily Vitals (BP, Temp, Pulse)"
                            >
                              <HeartPulse className="h-3 w-3" /> Daily BP & Vitals
                            </button>
                            <button
                              onClick={() => handleNotesClick(adm)}
                              className="inline-flex items-center gap-1 p-1 px-2 bg-slate-100 dark:bg-dark-950 text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                            >
                              <ClipboardList className="h-3 w-3" /> Clinical Care Log
                            </button>
                            {adm.status === 'admitted' && user?.role !== 'patient' && (
                              <button
                                onClick={() => handleAdministerClick(adm)}
                                className="inline-flex items-center gap-1 p-1 px-2 bg-brand-50 dark:bg-brand-950/20 text-brand-600 border border-brand-200 dark:border-brand-900/50 rounded-lg text-[10px] font-bold hover:bg-brand-100 transition-colors"
                              >
                                <Pill className="h-3 w-3" /> Administer Meds
                              </button>
                            )}
                            {adm.status === 'admitted' && user?.role !== 'nurse' && user?.role !== 'patient' && (
                              <button
                                onClick={() => handleOpenDischarge(adm)}
                                className="inline-flex items-center gap-1 p-1 px-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                title="Discharge Patient & Generate Inpatient Bill"
                              >
                                <UserMinus className="h-3 w-3" /> Discharge & Bill
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Admit Patient Modal */}
      <Modal isOpen={isAdmitOpen} onClose={() => setIsAdmitOpen(false)} title="Admit Patient (Medical / Surgical Intake)">
        <form onSubmit={handleAdmitSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Admission Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-dark-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Admission Category
              </label>
              <select
                value={admissionCategory}
                onChange={e => setAdmissionCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-brand-400 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="medical">Medical Patient (Observation & Treatment)</option>
                <option value="surgical">Surgical Patient (Operation / Post-Op Stay)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Stay Duration Type
              </label>
              <select
                value={stayType}
                onChange={e => setStayType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-brand-400 text-xs bg-white dark:bg-dark-900 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="short">Short Stay (&lt; 48 Hours)</option>
                <option value="long">Long-Term Stay (3+ Days / Multi-day Recovery)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Registered Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.mrNumber || p.phone})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Available Bed</label>
              <select
                required
                value={bedId}
                onChange={e => setBedId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Select Bed --</option>
                {(beds.filter(b => !b.status || b.status === 'available' || b.status !== 'occupied').length > 0
                  ? beds.filter(b => !b.status || b.status === 'available' || b.status !== 'occupied')
                  : beds
                ).map(b => (
                  <option key={b.id} value={b.id}>{b.bedNumber} - {b.wardName} ({b.type || 'general'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Admitting Doctor</label>
              <select
                required
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Select Attending Physician --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input label="Admitting Diagnosis / Condition" required value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Post-op coronary bypass, appendectomy recovery, pneumonia" />

          {admissionCategory === 'surgical' && (
            <Input
              label="Surgical Operation Details & Pre/Post-Op Directives"
              required
              value={surgeryDetails}
              onChange={e => setSurgeryDetails(e.target.value)}
              placeholder="e.g. Laparoscopic Appendectomy. Surgeon: Dr. Smith. Monitor incision site & drain."
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Long-Term Treatment & Nursing Care Plan
            </label>
            <textarea
              rows={2}
              value={treatmentPlan}
              onChange={e => setTreatmentPlan(e.target.value)}
              placeholder="e.g. IV fluids 100ml/hr, Pain management, BP check every 6 hours, Mobilization on Day 2."
              className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Initial Vitals Input Block */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Initial Intake Vitals (Blood Pressure & Temperature)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="BP (Systolic/Diastolic)" value={vitalBP} onChange={e => setVitalBP(e.target.value)} placeholder="120/80" />
              <Input label="Temp (°F)" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} placeholder="98.6" />
              <Input label="Pulse (bpm)" value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} placeholder="72" />
              <Input label="SpO2 (%)" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value)} placeholder="98" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Baseline Cost (Rs.)" required type="number" value={baselineCost} onChange={e => setBaselineCost(e.target.value)} />
            <Input label="Advance Paid (Rs.)" required type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} />
            <Input label="Discount (Rs.)" required type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAdmitOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Admission Allocation</Button>
          </div>
        </form>
      </Modal>

      {/* Daily BP & Vitals Log Modal */}
      <Modal isOpen={isVitalsOpen} onClose={() => setIsVitalsOpen(false)} title="Record Daily Patient BP & Vitals">
        <form onSubmit={handleLogVitalsSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p className="mt-1"><strong>Bed Location:</strong> {selectedAdmission.bed?.bedNumber} ({selectedAdmission.bed?.wardName})</p>
              <p className="mt-1"><strong>Category:</strong> <span className="uppercase font-bold">{selectedAdmission.admissionCategory}</span> ({selectedAdmission.stayType} stay)</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="Blood Pressure (BP)" required value={vitalBP} onChange={e => setVitalBP(e.target.value)} placeholder="120/80" />
            <Input label="Temp (°F)" required type="number" step="0.1" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} placeholder="98.6" />
            <Input label="Pulse (bpm)" required type="number" value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} placeholder="72" />
            <Input label="SpO2 (%)" required type="number" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value)} placeholder="98" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Care & Vitals Notes</label>
            <textarea
              rows={3}
              value={vitalNotes}
              onChange={e => setVitalNotes(e.target.value)}
              placeholder="e.g. Patient comfortable. BP stable after IV medication. Drainage checked."
              className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
            <Button type="submit">Commit Vitals Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Daily Notes / Progress Log Modal */}
      <Modal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} title="Clinical Progress & Nursing Care File">
        <form onSubmit={handleNotesSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850 space-y-1">
              <p><strong>Patient:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p><strong>Bed Location:</strong> {selectedAdmission.bed?.bedNumber} - {selectedAdmission.bed?.wardName}</p>
              <p><strong>Condition / Diagnosis:</strong> {selectedAdmission.condition}</p>
              {selectedAdmission.surgeryDetails && (
                <p className="text-rose-500 font-semibold"><strong>Surgery Details:</strong> {selectedAdmission.surgeryDetails}</p>
              )}
              {selectedAdmission.treatmentPlan && (
                <p className="text-brand-600 dark:text-brand-400 font-semibold"><strong>Long-Term Treatment Plan:</strong> {selectedAdmission.treatmentPlan}</p>
              )}
            </div>
          )}
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nursing Care Notes & Progress Log</label>
            <textarea
              required
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Vitals monitored. BP 130/85, Temp 98.6 F. Medication administered as scheduled."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsNotesOpen(false)}>Close</Button>
            <Button type="submit">Commit Progress Notes</Button>
          </div>
        </form>
      </Modal>

      {/* Administer Medication Modal */}
      <Modal isOpen={isAdministerOpen} onClose={() => setIsAdministerOpen(false)} title="Administer Medication / Injection (Clinical Stock)">
        <form onSubmit={handleAdministerSubmit} className="space-y-4">
          {selectedAdmission && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient EMR:</strong> {selectedAdmission.patient?.name} ({selectedAdmission.patient?.mrNumber})</p>
              <p className="mt-1"><strong>Condition:</strong> {selectedAdmission.condition}</p>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Stock Medicine / Injection</label>
            <select
              required
              value={medId}
              onChange={e => setMedId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Injection or Drug --</option>
              {medicines.map(m => (
                <option key={m.id} value={m.id} disabled={m.stockLevel <= 0}>
                  {m.name} ({m.stockLevel} {m.unit} available) - Rs. {m.price} per {m.unit}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity administered / Dosage count"
            required
            type="number"
            min="1"
            value={medQty}
            onChange={e => setMedQty(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAdministerOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm Clinical Administration</Button>
          </div>
        </form>
      </Modal>

      {/* Discharge Patient & Final Inpatient Billing Modal */}
      <Modal
        isOpen={isDischargeOpen}
        onClose={() => setIsDischargeOpen(false)}
        title="Discharge Patient & Generate Final Inpatient Bill"
      >
        <form onSubmit={handleDischargeSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {selectedAdmission && (
            <div className="p-3.5 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdmission.patient?.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    MRN: {selectedAdmission.patient?.mrNumber || 'N/A'} • {selectedAdmission.patient?.gender || 'N/A'}
                  </span>
                </div>
                <Badge type="warning">Inpatient Admission</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-500 block">Allocated Bed:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {selectedAdmission.bed?.bedNumber} ({selectedAdmission.bed?.wardName})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Admission Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedAdmission.admissionDate || selectedAdmission.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Stay Duration:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {dischargeStayDays} Day(s) Stayed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Discharge Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Discharge Date & Time *
              </label>
              <input
                required
                type="datetime-local"
                value={dischargeDate}
                onChange={e => {
                  setDischargeDate(e.target.value);
                  if (selectedAdmission && e.target.value) {
                    const admDate = new Date(selectedAdmission.admissionDate || selectedAdmission.createdAt);
                    const disDate = new Date(e.target.value);
                    const diffDays = Math.max(1, Math.ceil(Math.abs(disDate.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24)));
                    setDischargeStayDays(diffDays);
                    const dailyBedRate = selectedAdmission.bed?.type === 'icu' ? 5000 : selectedAdmission.bed?.type === 'private' ? 3500 : 2000;
                    setDischargeBedCharges(String(diffDays * dailyBedRate));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Payment Method
              </label>
              <select
                value={dischargePaymentMethod}
                onChange={e => setDischargePaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="cash">Cash Counter</option>
                <option value="card">Debit / Credit Card</option>
                <option value="online">Online / Bank Transfer</option>
                <option value="pending">Pending / Due at Checkout</option>
              </select>
            </div>
          </div>

          {/* Itemized Inpatient Bill Breakdown */}
          <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-brand-500" />
              Itemized Inpatient Hospital Charges (PKR)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={`Room / Bed Charges (${dischargeStayDays} days)`}
                type="number"
                min="0"
                value={dischargeBedCharges}
                onChange={e => setDischargeBedCharges(e.target.value)}
                required
              />
              <Input
                label="Doctor & Consultant Fee"
                type="number"
                min="0"
                value={dischargeDoctorFee}
                onChange={e => setDischargeDoctorFee(e.target.value)}
                required
              />
              <Input
                label="Nursing & Care Services"
                type="number"
                min="0"
                value={dischargeNursingFee}
                onChange={e => setDischargeNursingFee(e.target.value)}
                required
              />
              <Input
                label="Medications & Injections"
                type="number"
                min="0"
                value={dischargeMedCharges}
                onChange={e => setDischargeMedCharges(e.target.value)}
              />
              <Input
                label="Other Clinical Charges"
                type="number"
                min="0"
                value={dischargeOtherCharges}
                onChange={e => setDischargeOtherCharges(e.target.value)}
              />
              <Input
                label="Discount Allowed (Rs.)"
                type="number"
                min="0"
                value={dischargeDiscount}
                onChange={e => setDischargeDiscount(e.target.value)}
              />
            </div>

            {/* Inpatient Billing Calculation Summary */}
            {(() => {
              const rC = Number(dischargeBedCharges) || 0;
              const dC = Number(dischargeDoctorFee) || 0;
              const nC = Number(dischargeNursingFee) || 0;
              const mC = Number(dischargeMedCharges) || 0;
              const oC = Number(dischargeOtherCharges) || 0;
              const disc = Number(dischargeDiscount) || 0;
              const adv = Number(dischargeAdvancePaid) || 0;
              const gross = rC + dC + nC + mC + oC;
              const netPayable = Math.max(0, gross - disc);
              const remainingDues = Math.max(0, netPayable - Number(dischargePaidAmount || 0));

              return (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Gross Bill:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Rs. {gross.toLocaleString()}</span>
                  </div>
                  {disc > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>Discount Deducted:</span>
                      <span>- Rs. {disc.toLocaleString()}</span>
                    </div>
                  )}
                  {adv > 0 && (
                    <div className="flex justify-between text-brand-600 dark:text-brand-400">
                      <span>Advance Deposit Paid at Admission:</span>
                      <span>- Rs. {adv.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-brand-600 dark:text-brand-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <span>Net Grand Total:</span>
                    <span>Rs. {netPayable.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Input
                      label="Amount Paid at Discharge Counter (Rs.)"
                      type="number"
                      min="0"
                      value={dischargePaidAmount}
                      onChange={e => setDischargePaidAmount(e.target.value)}
                    />
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Remaining Balance / Dues</span>
                      <span className={`text-sm font-black ${remainingDues > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        Rs. {remainingDues.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Discharge Clinical Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Discharge Summary & Physician Advice
            </label>
            <textarea
              rows={3}
              value={dischargeNotes}
              onChange={e => setDischargeNotes(e.target.value)}
              placeholder="e.g. Patient recovered from acute condition. Vitals stable. Prescribed follow-up medications."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsDischargeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={dischargeSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5">
              <UserMinus className="h-4 w-4" />
              {dischargeSubmitting ? 'Processing Discharge...' : 'Confirm Discharge & Send to Billing'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discharge Success & Invoice Slip Modal */}
      <Modal
        isOpen={isDischargeSuccessOpen}
        onClose={() => setIsDischargeSuccessOpen(false)}
        title="Discharge Approved & Inpatient Invoice Generated"
      >
        <div className="space-y-4 text-center py-2">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Patient Successfully Discharged!
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Bed has been released to available status. The final inpatient bill has been created and synced directly into the <strong>Billing</strong> section.
            </p>
          </div>

          {generatedDischargeInvoice && (
            <div className="p-3.5 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-850 text-left text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Invoice ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">INV-#{generatedDischargeInvoice.id}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Grand Total:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">Rs. {Number(generatedDischargeInvoice.grandTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {Number(generatedDischargeInvoice.paidAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Billing Status:</span>
                <Badge type={generatedDischargeInvoice.status === 'paid' ? 'success' : 'warning'}>
                  {generatedDischargeInvoice.status}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrintDischargeSlip}
              className="flex items-center justify-center gap-1.5 text-xs"
            >
              <Printer className="h-4 w-4" /> Print Discharge Summary Slip
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsDischargeSuccessOpen(false);
                window.location.href = '/billing';
              }}
              className="flex items-center justify-center gap-1.5 text-xs"
            >
              <ArrowRight className="h-4 w-4" /> View in Billing Section
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
