import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Modal, Button, Badge, Card } from './UI';
import {
  Stethoscope,
  Pill,
  TestTube2,
  Clock,
  Printer,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Activity,
  Heart,
  Thermometer,
  Calendar,
  User,
  Phone,
  Sparkles,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface MedicineRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface DoctorEMRModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number | null;
  tokenId?: number | null;
  tokenNumber?: string | null;
  doctorInfo?: any;
  onConsultationSaved?: () => void;
}

const COMMON_SYMPTOMS = [
  'Fever', 'Dry Cough', 'Productive Cough', 'Chest Pain', 'Shortness of Breath',
  'Headache', 'Abdominal Pain', 'Nausea / Vomiting', 'Diarrhea', 'Throat Pain',
  'Body Aches', 'Generalized Weakness', 'Dizziness', 'Back Pain', 'Joint Pain',
  'Burning Micturition (UTI)', 'Skin Rash / Itching'
];

const COMMON_DIAGNOSES = [
  'Acute Viral Upper Respiratory Infection (URI)',
  'Acute Bronchitis',
  'Enteric Fever / Typhoid',
  'Acute Gastroenteritis',
  'Essential Hypertension (High BP)',
  'Type 2 Diabetes Mellitus',
  'Acute Tonsillitis / Pharyngitis',
  'Acid Peptic Disease / Gastritis (GERD)',
  'Urinary Tract Infection (UTI)',
  'Migraine / Tension Headache',
  'Musculoskeletal Pain / Spondylosis',
  'Allergic Dermatitis'
];

const COMMON_LAB_TESTS = [
  'Complete Blood Count (CBC)',
  'ESR',
  'Blood Sugar Fasting / Random (BSF/BSR)',
  'HbA1c (Glycated Hemoglobin)',
  'Liver Function Tests (LFT)',
  'Renal Function Tests / Creatinine (RFT)',
  'Lipid Profile',
  'Urine Complete Examination (R/E)',
  'Typhidot / Widal Test',
  'Dengue NS1 Antigen',
  'Serum Electrolytes',
  'H. Pylori Antigen',
  'ECG (12-Lead)',
  'Chest X-Ray (PA View)',
  'Ultrasound Abdomen & Pelvis'
];

const COMMON_ALLERGIES = [
  'No Known Drug Allergies (NKDA)',
  'Penicillin Allergy',
  'Sulfa Drugs Allergy',
  'NSAIDs / Aspirin Allergy',
  'Ciprofloxacin Allergy'
];

export const DoctorEMRModal: React.FC<DoctorEMRModalProps> = ({
  isOpen,
  onClose,
  patientId,
  tokenId,
  tokenNumber,
  doctorInfo,
  onConsultationSaved
}) => {
  const [activeTab, setActiveTab] = useState<'consultation' | 'history'>('consultation');
  const [patientData, setPatientData] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stockMedicines, setStockMedicines] = useState<any[]>([]);

  // --- EMR Clinical State ---
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('No Known Drug Allergies (NKDA)');
  
  // Vitals
  const [bp, setBp] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [sugar, setSugar] = useState('');

  // Clinical Exam & Diagnosis
  const [physicalExam, setPhysicalExam] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Prescription Rx Medicines
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    { name: '', dosage: '1 Tablet', frequency: '1-0-1 (Morning & Night)', duration: '5 Days', instructions: 'After food (Khaney ke baad)' }
  ]);

  // Advised Labs & Advice
  const [advisedLabs, setAdvisedLabs] = useState<string[]>([]);
  const [customLab, setCustomLab] = useState('');
  const [dietAdvice, setDietAdvice] = useState('Avoid cold/spicy food. Drink plenty of warm water. Complete bed rest.');
  const [followUpDays, setFollowUpDays] = useState('3');

  // Load Patient EMR Data
  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatientEMR(patientId);
      fetchPharmacyStock();
    }
  }, [isOpen, patientId]);

  const fetchPharmacyStock = async () => {
    try {
      const res = await apiClient.get('/medicines');
      setStockMedicines(Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn('Could not fetch stock medicines', err);
    }
  };

  const fetchPatientEMR = async (pId: number) => {
    setLoadingPatient(true);
    try {
      const data = await apiClient.get(`/patients/${pId}`);
      setPatientData(data);

      // Pre-fill latest vitals if available
      if (data?.patient_vitals && data.patient_vitals.length > 0) {
        const latest = data.patient_vitals[0];
        setBp(latest.bp || '');
        setTemperature(latest.temperature ? String(latest.temperature) : '');
        setPulse(latest.pulse ? String(latest.pulse) : '');
        setSpo2(latest.spo2 ? String(latest.spo2) : '');
        setWeight(latest.weight ? String(latest.weight) : '');
      } else {
        setBp('120/80');
        setTemperature('98.6');
        setPulse('72');
        setSpo2('98');
        setWeight('');
      }
    } catch (err) {
      console.error('Error fetching patient details for EMR', err);
    } finally {
      setLoadingPatient(false);
    }
  };

  // Symptom toggle
  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  // Lab test toggle
  const toggleLabTest = (test: string) => {
    if (advisedLabs.includes(test)) {
      setAdvisedLabs(advisedLabs.filter(t => t !== test));
    } else {
      setAdvisedLabs([...advisedLabs, test]);
    }
  };

  // Medicine Row Handlers
  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '1 Tablet', frequency: '1-0-1 (Morning & Night)', duration: '5 Days', instructions: 'After food (Khaney ke baad)' }
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated.length > 0 ? updated : [{ name: '', dosage: '1 Tablet', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' }]);
  };

  const handleMedicineChange = (index: number, field: keyof MedicineRow, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Submit Consultation
  const handleSaveConsultation = async (shouldPrint = false) => {
    if (!diagnosis.trim()) {
      alert('Please enter or select a Clinical Diagnosis (Tashkhees) for the patient.');
      return;
    }

    const validMedicines = medicines.filter(m => m.name.trim() !== '');

    const allAdvisedLabs = [...advisedLabs];
    if (customLab.trim()) {
      allAdvisedLabs.push(customLab.trim());
    }

    const payload = {
      patientId: patientId,
      tokenId: tokenId || null,
      symptoms: customSymptoms.trim(),
      symptomTags: selectedSymptoms,
      medicalHistory: medicalHistory.trim(),
      allergies: allergies.trim(),
      vitals: {
        bp: bp || null,
        temperature: temperature || null,
        pulse: pulse || null,
        spo2: spo2 || null,
        weight: weight || null,
        notes: sugar ? `Blood Sugar / RBS: ${sugar} mg/dL` : null
      },
      physicalExam: physicalExam.trim(),
      diagnosis: diagnosis.trim(),
      clinicalNotes: clinicalNotes.trim(),
      dietAdvice: dietAdvice.trim(),
      followUpDays: followUpDays,
      medicines: validMedicines,
      advisedLabTests: allAdvisedLabs
    };

    setSaving(true);
    try {
      await apiClient.post('/doctor/consultation', payload);
      alert('✅ Clinical EMR Consultation and Prescription saved successfully!');

      if (shouldPrint) {
        handlePrintPrescription(payload);
      }

      if (onConsultationSaved) {
        onConsultationSaved();
      }
      onClose();
    } catch (err: any) {
      alert(`Failed to save consultation: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Print Prescription Slip
  const handlePrintPrescription = (data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const patientName = patientData?.name || 'Patient';
    const patientAge = patientData?.age ? `${patientData.age} Yrs` : 'N/A';
    const patientGender = patientData?.gender || 'N/A';
    const patientMrn = patientData?.mrNumber || 'MRN-N/A';
    const patientPhone = patientData?.phone || 'N/A';
    const docName = doctorInfo?.name || 'Dr. Talha';
    const docSpec = doctorInfo?.specialization || 'Consultant Physician';
    const docRoom = doctorInfo?.roomNumber || 'Room 101';
    const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const medRowsHtml = (data.medicines || []).map((m: any, idx: number) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${idx + 1}. ${m.name}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m.dosage}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #0284c7; font-weight: 700;">${m.frequency}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m.duration}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${m.instructions}</td>
      </tr>
    `).join('');

    const labTestsHtml = (data.advisedLabTests || []).length > 0
      ? `<div style="margin-top: 12px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong style="color: #4338ca; font-size: 12px; text-transform: uppercase;">Advised Lab Investigations (Test Sifarish):</strong>
          <div style="margin-top: 4px; font-size: 12px; font-weight: 600; color: #1e293b;">${data.advisedLabTests.join(' • ')}</div>
        </div>`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription Rx - ${patientName} (${patientMrn})</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 14px; }
          .clinic-title { font-size: 20px; font-weight: 900; color: #0284c7; text-transform: uppercase; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .doc-box { text-align: right; }
          .doc-name { font-size: 15px; font-weight: 800; color: #0f172a; }
          .doc-spec { font-size: 11px; color: #475569; }
          .patient-box { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px; }
          .vitals-bar { display: flex; gap: 12px; background: #e0f2fe; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 11px; font-weight: 700; color: #0369a1; }
          .diagnosis-box { margin-bottom: 12px; padding: 8px 12px; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 6px; font-size: 12px; }
          .rx-symbol { font-size: 24px; font-weight: 900; color: #0284c7; font-family: serif; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
          th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .advice-box { margin-top: 12px; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .sig-line { border-top: 1px dashed #475569; width: 180px; text-align: center; padding-top: 4px; font-size: 11px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-title">Dr. Talha Clinic & Healthcare Center</div>
            <div class="clinic-sub">Primary & Specialized Medical Care • EMR Clinical System</div>
          </div>
          <div class="doc-box">
            <div class="doc-name">${docName}</div>
            <div class="doc-spec">${docSpec}</div>
            <div class="clinic-sub">Consultation Desk: ${docRoom}</div>
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Patient:</strong> ${patientName}</div>
          <div><strong>MRN:</strong> ${patientMrn}</div>
          <div><strong>Age/Gender:</strong> ${patientAge} / ${patientGender}</div>
          <div><strong>Date:</strong> ${nowStr}</div>
          <div><strong>Phone:</strong> ${patientPhone}</div>
          ${tokenNumber ? `<div><strong>Token:</strong> #${tokenNumber}</div>` : ''}
          <div><strong>Allergies:</strong> ${data.allergies || 'NKDA'}</div>
          <div><strong>Blood Group:</strong> ${patientData?.bloodGroup || 'N/A'}</div>
        </div>

        <div class="vitals-bar">
          <div>BP: ${data.vitals?.bp || '120/80'}</div>
          <div>Pulse: ${data.vitals?.pulse || '72'} bpm</div>
          <div>Temp: ${data.vitals?.temperature || '98.6'} °F</div>
          <div>SpO2: ${data.vitals?.spo2 || '98'}%</div>
          ${data.vitals?.weight ? `<div>Weight: ${data.vitals.weight} kg</div>` : ''}
        </div>

        <div class="diagnosis-box">
          <strong>Diagnosis / Assessment:</strong> <span style="color: #9d174d; font-weight: 800;">${data.diagnosis}</span>
          ${data.symptoms ? `<div style="margin-top: 3px; font-size: 11px; color: #475569;"><strong>Complaints:</strong> ${data.symptoms}</div>` : ''}
        </div>

        <div class="rx-symbol">℞</div>
        <table>
          <thead>
            <tr>
              <th>Medicine / Formulation</th>
              <th style="text-align: center;">Dosage</th>
              <th style="text-align: center;">Frequency</th>
              <th style="text-align: center;">Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${medRowsHtml || '<tr><td colspan="5" style="padding: 10px; text-align: center;">No prescription medicines added.</td></tr>'}
          </tbody>
        </table>

        ${labTestsHtml}

        <div class="advice-box">
          <strong style="color: #065f46; font-size: 11px; text-transform: uppercase;">Dietary Advice & Precautions:</strong>
          <div style="font-size: 11px; color: #1e293b; margin-top: 2px;">${data.dietAdvice || 'Drink plenty of water and take regular rest.'}</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-top: 4px;">Follow-up: Within ${data.followUpDays || '3'} Days or SOS.</div>
        </div>

        <div class="footer">
          <div style="font-size: 10px; color: #94a3b8;">
            * This is an official electronic prescription generated by LifeFlow HMS.<br/>
            For medical queries, contact clinic front desk.
          </div>
          <div class="sig-line">
            Doctor's Signature & Stamp
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER: PATIENT BANNER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center font-bold text-lg shrink-0">
              <Stethoscope className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  {loadingPatient ? 'Loading Patient File...' : (patientData?.name || 'Patient EMR')}
                </h3>
                {tokenNumber && (
                  <span className="px-2 py-0.5 rounded bg-brand-500 text-white font-mono text-[10px] font-black">
                    Token #{tokenNumber}
                  </span>
                )}
                {patientData?.mrNumber && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                    MRN: {patientData.mrNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {patientData?.age ? `${patientData.age} Yrs` : 'N/A'} • {patientData?.gender || 'N/A'} • Phone: {patientData?.phone || 'N/A'} • Blood: <strong className="text-rose-400">{patientData?.bloodGroup || 'N/A'}</strong>
              </p>
            </div>
          </div>

          {/* Tab Switcher & Close */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('consultation')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'consultation'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Consultation & Rx</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Past Medical History</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {loadingPatient ? (
            <div className="space-y-4 animate-pulse py-8 text-center text-slate-400">
              <div className="h-8 bg-slate-100 dark:bg-dark-950 rounded-xl max-w-sm mx-auto" />
              <div className="h-32 bg-slate-100 dark:bg-dark-950 rounded-xl" />
            </div>
          ) : activeTab === 'consultation' ? (
            <div className="space-y-6">
              
              {/* SECTION 1: VITALS CHECK & REAL-TIME ENTRY */}
              <div className="p-4 bg-slate-50 dark:bg-dark-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> 1. Patient Vital Signs (Alamaat-e-Hayaat)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Blood Pressure (BP)</label>
                    <input
                      type="text"
                      placeholder="e.g. 120/80"
                      value={bp}
                      onChange={e => setBp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Temperature (°F)</label>
                    <input
                      type="text"
                      placeholder="98.6"
                      value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs text-amber-600 dark:text-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Pulse (HR bpm)</label>
                    <input
                      type="text"
                      placeholder="72"
                      value={pulse}
                      onChange={e => setPulse(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">SpO2 Oxygen (%)</label>
                    <input
                      type="text"
                      placeholder="98"
                      value={spo2}
                      onChange={e => setSpo2(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs text-purple-600 dark:text-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Weight (Kg)</label>
                    <input
                      type="text"
                      placeholder="70"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Blood Sugar (RBS)</label>
                    <input
                      type="text"
                      placeholder="110 mg/dL"
                      value={sugar}
                      onChange={e => setSugar(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CHIEF COMPLAINTS / SYMPTOMS (ELAMAAT) */}
              <div className="space-y-2.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>2. Chief Complaints & Symptoms (Mareez ki Elamaat)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click quick tags or type below</span>
                </label>

                {/* Quick Symptom Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMPTOMS.map((sym, i) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{sym}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={2}
                  placeholder="Describe patient's symptoms in detail (e.g. High grade fever x 3 days with chills, dry hacking cough, sore throat)..."
                  value={customSymptoms}
                  onChange={e => setCustomSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* SECTION 3: MEDICAL HISTORY & ALLERGIES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Past Medical History (Pehle ki Beemariyan)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Known Diabetic x 4 yrs, Hypertensive on tab amlodipine"
                    value={medicalHistory}
                    onChange={e => setMedicalHistory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Drug Allergies (Dawaon se allergy)
                  </label>
                  <select
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs font-semibold"
                  >
                    {COMMON_ALLERGIES.map((alg, i) => (
                      <option key={i} value={alg}>{alg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 4: DIAGNOSIS & ISSUE KIA HAI */}
              <div className="space-y-2.5 p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 rounded-xl">
                <label className="block text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  3. Clinical Diagnosis / Tashkhees (Issue Kia Hai) *
                </label>

                {/* Common Diagnosis Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DIAGNOSES.map((diag, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDiagnosis(diag)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        diagnosis === diag
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100'
                      }`}
                    >
                      {diag}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Primary Diagnosis Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Acute Viral Bronchitis / Enteric Fever"
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-dark-950 font-bold text-xs text-rose-950 dark:text-rose-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Physical Examination Findings</label>
                    <input
                      type="text"
                      placeholder="e.g. Throat congested, chest clear, soft non-tender abdomen"
                      value={physicalExam}
                      onChange={e => setPhysicalExam(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: RX PRESCRIPTION & MEDICINES BUILDER */}
              <div className="space-y-3 p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-blue-600" /> 4. Prescription & Advised Medicines (Dawaiyaan)
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddMedicineRow}
                    className="flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-dark-900 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> + Add Medicine
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {medicines.map((row, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Medicine Name / Stock Selector */}
                        <div className="sm:col-span-4">
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Medicine Name</label>
                          <input
                            type="text"
                            list={`stock-meds-${idx}`}
                            placeholder="Type or select medicine..."
                            value={row.name}
                            onChange={e => handleMedicineChange(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-dark-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                          />
                          <datalist id={`stock-meds-${idx}`}>
                            {stockMedicines.map(m => (
                              <option key={m.id} value={m.name}>{m.name} ({m.category || 'Tab'})</option>
                            ))}
                          </datalist>
                        </div>

                        {/* Dosage */}
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Dosage</label>
                          <input
                            type="text"
                            placeholder="1 Tab / 500mg"
                            value={row.dosage}
                            onChange={e => handleMedicineChange(idx, 'dosage', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-dark-900 text-xs font-semibold"
                          />
                        </div>

                        {/* Frequency */}
                        <div className="sm:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Frequency (Auqaat)</label>
                          <select
                            value={row.frequency}
                            onChange={e => handleMedicineChange(idx, 'frequency', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-dark-900 text-xs font-bold text-brand-600 dark:text-brand-400"
                          >
                            <option value="1-0-1 (Morning & Night)">1-0-1 (Subah & Shaam)</option>
                            <option value="1-1-1 (Thrice a Day)">1-1-1 (Subah, Dopehar, Shaam)</option>
                            <option value="1-0-0 (Morning / Nahaar Munh)">1-0-0 (Subah Nahaar Munh)</option>
                            <option value="0-0-1 (Night only)">0-0-1 (Raat ko)</option>
                            <option value="1x Daily (Rozana 1 bar)">1x Daily (Rozana 1 bar)</option>
                            <option value="SOS (As needed / Zaroorat par)">SOS (Zaroorat par)</option>
                            <option value="Every 8 Hours (Q8H)">Every 8 Hours</option>
                          </select>
                        </div>

                        {/* Duration */}
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Duration</label>
                          <select
                            value={row.duration}
                            onChange={e => handleMedicineChange(idx, 'duration', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-dark-900 text-xs font-semibold"
                          >
                            <option value="3 Days">3 Days</option>
                            <option value="5 Days">5 Days</option>
                            <option value="7 Days">7 Days</option>
                            <option value="10 Days">10 Days</option>
                            <option value="14 Days">14 Days</option>
                            <option value="1 Month">1 Month</option>
                            <option value="SOS">SOS</option>
                          </select>
                        </div>

                        {/* Delete Button */}
                        <div className="sm:col-span-1 text-center pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Remove medicine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div>
                        <input
                          type="text"
                          placeholder="Instructions (e.g. Khaney ke baad / After meals with water)..."
                          value={row.instructions}
                          onChange={e => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-full px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-dark-900 text-[11px] text-slate-600 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 6: ADVISED LAB INVESTIGATIONS */}
              <div className="space-y-2.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><TestTube2 className="h-3.5 w-3.5 text-indigo-500" /> 5. Advised Lab Investigations (Test Sifarish)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-dispatches to lab queue</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_LAB_TESTS.map((test, i) => {
                    const isSelected = advisedLabs.includes(test);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleLabTest(test)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{test}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Type any additional custom lab test (e.g. Serum Ferritin, Vitamin D3)..."
                  value={customLab}
                  onChange={e => setCustomLab(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs"
                />
              </div>

              {/* SECTION 7: DIET ADVICE & FOLLOW-UP TIMELINE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Dietary Advice & Clinical Precautions (Parhez / Hidayat)
                  </label>
                  <input
                    type="text"
                    value={dietAdvice}
                    onChange={e => setDietAdvice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Follow-up (Agli Mulaqat)
                  </label>
                  <select
                    value={followUpDays}
                    onChange={e => setFollowUpDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-950 text-xs font-bold text-brand-600 dark:text-brand-400"
                  >
                    <option value="1">Follow-up in 1 Day</option>
                    <option value="2">Follow-up in 2 Days</option>
                    <option value="3">Follow-up in 3 Days</option>
                    <option value="5">Follow-up in 5 Days</option>
                    <option value="7">Follow-up in 7 Days (1 Week)</option>
                    <option value="10">Follow-up in 10 Days</option>
                    <option value="15">Follow-up in 15 Days</option>
                    <option value="SOS">SOS (In Emergency)</option>
                  </select>
                </div>
              </div>

            </div>
          ) : (
            /* TAB 2: PAST MEDICAL HISTORY & TIMELINE */
            <div className="space-y-6">
              {/* Vitals History */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-brand-500" /> Vital Signs Record Log
                </h4>
                {patientData?.patient_vitals && patientData.patient_vitals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {patientData.patient_vitals.map((v: any) => (
                      <div key={v.id} className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-200/50 pb-1">
                          <span>{new Date(v.createdAt).toLocaleString()}</span>
                          <span>Logged by: {v.logger?.name || 'Staff Nurse'}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 font-mono font-bold text-slate-800 dark:text-slate-200 pt-1">
                          <div>BP: <span className="text-brand-600 dark:text-brand-400">{v.bp || 'N/A'}</span></div>
                          <div>Temp: <span className="text-amber-600">{v.temperature ? `${v.temperature}°F` : 'N/A'}</span></div>
                          <div>Pulse: <span className="text-emerald-600">{v.pulse || 'N/A'}</span></div>
                          <div>SpO2: <span className="text-purple-600">{v.spo2 ? `${v.spo2}%` : 'N/A'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-dark-950 rounded-xl text-center">No past vitals logged.</p>
                )}
              </div>

              {/* Past Prescriptions */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-emerald-500" /> Past Doctor Consultations & Prescriptions
                </h4>
                {patientData?.appointments && patientData.appointments.some((a: any) => a.prescription) ? (
                  <div className="space-y-3">
                    {patientData.appointments.filter((a: any) => a.prescription).map((apt: any) => (
                      <div key={apt.id} className="p-4 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">Diagnosis: {apt.prescription.diagnosis}</span>
                            <p className="text-[10px] text-slate-400">Doctor: {apt.doctor?.user?.name || 'Dr. Talha'}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(apt.appointmentDate || apt.createdAt).toLocaleDateString()}</span>
                        </div>

                        {apt.prescription.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white dark:bg-dark-900 p-2 rounded-lg border border-slate-200/40">
                            {apt.prescription.notes}
                          </p>
                        )}

                        {apt.prescription.prescription_items && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribed Medicines:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {apt.prescription.prescription_items.map((pi: any) => (
                                <div key={pi.id} className="px-2.5 py-1.5 bg-white dark:bg-dark-900 rounded-lg border border-slate-200 text-xs flex justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{pi.medicineName} ({pi.dosage})</span>
                                  <span className="text-brand-600 font-mono font-bold text-[10px]">{pi.frequency} • {pi.duration}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-dark-950 rounded-xl text-center">No past prescriptions on record for this patient.</p>
                )}
              </div>

              {/* Past Lab Requests */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <TestTube2 className="h-4 w-4 text-indigo-500" /> Laboratory Investigations Record
                </h4>
                {patientData?.lab_requests && patientData.lab_requests.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {patientData.lab_requests.map((lr: any) => (
                      <div key={lr.id} className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100 block">{lr.testType}</strong>
                          <span className="text-[10px] text-slate-400">Date: {new Date(lr.createdAt).toLocaleDateString()}</span>
                        </div>
                        <Badge type={lr.status === 'completed' ? 'success' : 'warning'}>
                          {lr.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-dark-950 rounded-xl text-center">No lab investigations requested yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 bg-slate-100/80 dark:bg-dark-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'consultation'
              ? 'Saving will complete consultation, log vitals, and queue prescribed medicines & tests.'
              : 'Reviewing historical medical records for patient.'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>

            {activeTab === 'consultation' && (
              <>
                <Button
                  type="button"
                  onClick={() => handleSaveConsultation(true)}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Save & Print Rx</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSaveConsultation(false)}
                  disabled={saving}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-black flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save & Complete'}</span>
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
