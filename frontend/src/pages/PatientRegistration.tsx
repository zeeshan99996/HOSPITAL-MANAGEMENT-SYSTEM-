import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal, Badge } from '../components/UI';
import {
  Printer, Save, Calendar, UserPlus, CreditCard, MapPin,
  AlertTriangle, UserCheck, Ticket, BedDouble, ExternalLink,
  CheckCircle2, ArrowRight, Stethoscope, Clock, ShieldAlert
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatCNIC, formatPhone } from '../utils/formatters';

export const PatientRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    guardianName: '',
    gender: 'male',
    dob: '',
    age: '',
    cnic: '',
    phone: '',
    email: '',
    bloodGroup: '',
    address: '',
    area: '',
    paymentMethod: 'Initial Payment',
    paymentAmount: '1500',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    insurancePolicyNum: '',
  });

  const [areas, setAreas] = useState<any[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);

  // Duplicate Check Modal State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicatePatients, setDuplicatePatients] = useState<any[]>([]);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  // Post-Registration Next Actions Modal State
  const [isNextActionsOpen, setIsNextActionsOpen] = useState(false);
  const [savedPatientRecord, setSavedPatientRecord] = useState<any>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [areasRes, paymentsRes, rawDocs] = await Promise.all([
        apiClient.get('/settings/areas'),
        apiClient.get('/settings/payment-modes'),
        apiClient.get('/doctors')
      ]);
      setAreas(areasRes || []);
      let modes = paymentsRes || [];
      if (!modes.some((pm: any) => pm.name === 'Initial Payment')) {
        modes = [{ id: 'init-default', name: 'Initial Payment' }, ...modes];
      }
      setPaymentModes(modes);
      const docList = rawDocs || [];
      setDoctors(docList);
      if (docList.length > 0) {
        setSelectedDoctorId(String(docList[0].id));
        const initialFee = docList[0].consultationFee ? String(docList[0].consultationFee) : '1500';
        setFormData(prev => ({ ...prev, paymentAmount: initialFee }));
      }

      if (modes.length > 0) {
        setFormData(prev => ({ ...prev, paymentMethod: prev.paymentMethod || 'Initial Payment' }));
      }
    } catch (err) {
      console.error('Failed to load area/payment settings options:', err);
    }
  };

  const handleDoctorSelect = (docIdStr: string) => {
    setSelectedDoctorId(docIdStr);
    const docObj = doctors.find(d => String(d.id) === docIdStr);
    if (docObj) {
      const fee = docObj.consultationFee ? String(docObj.consultationFee) : '1500';
      setFormData(prev => ({ ...prev, paymentAmount: fee }));
    }
  };

  // Auto calculate age from date of birth
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobVal = e.target.value;
    let calculatedAge = '';
    if (dobVal) {
      const birthDate = new Date(dobVal);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      calculatedAge = age >= 0 ? age.toString() : '0';
    }
    setFormData({
      ...formData,
      dob: dobVal,
      age: calculatedAge
    });
  };

  const handleInputChange = (key: string, value: string) => {
    let val = value;
    if (key === 'phone' || key === 'emergencyContactPhone') {
      val = formatPhone(value);
    } else if (key === 'cnic') {
      val = formatCNIC(value);
    } else if (key === 'email') {
      val = value.slice(0, 50);
    }
    setFormData({ ...formData, [key]: val });
  };

  const handleReset = () => {
    setFormData({
      name: '',
      guardianName: '',
      gender: 'male',
      dob: '',
      age: '',
      cnic: '',
      phone: '',
      email: '',
      bloodGroup: '',
      address: '',
      area: '',
      paymentMethod: 'Initial Payment',
      paymentAmount: '1500',
      emergencyContactName: '',
      emergencyContactPhone: '',
      insuranceProvider: '',
      insurancePolicyNum: '',
    });
    setRegisteredPatient(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmit = async (e?: React.FormEvent, andBook: boolean = false, skipDupCheck: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Quick validation
    if (!formData.name || !formData.phone) {
      setErrorMsg('Full Name and Phone Number are required fields.');
      setLoading(false);
      return;
    }

    if (formData.age === undefined || formData.age === null || formData.age.trim() === '') {
      setErrorMsg('Age is compulsory. Please enter the patient age.');
      setLoading(false);
      return;
    }

    if (!formData.paymentMethod) {
      setErrorMsg('Payment Method is compulsory. Please select a payment option.');
      setLoading(false);
      return;
    }

    const phoneDigits = (formData.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      setErrorMsg('Please enter a valid 11-digit Mobile Phone Number (e.g. 0300-1234567).');
      setLoading(false);
      return;
    }

    const cnicDigits = (formData.cnic || '').replace(/\D/g, '');
    if (cnicDigits.length > 0 && cnicDigits.length !== 13) {
      setErrorMsg('Please enter a valid 13-digit CNIC Number (e.g. 42101-1234567-1).');
      setLoading(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMsg('Please enter a valid Email Address (e.g. name@domain.com).');
      setLoading(false);
      return;
    }

    // Check for duplicate patient if not bypassed
    if (!skipDupCheck && !bypassDuplicate) {
      try {
        const dupRes = await apiClient.get(`/patients/check-duplicate?phone=${encodeURIComponent(formData.phone)}&cnic=${encodeURIComponent(formData.cnic || '')}`);
        if (dupRes && dupRes.isDuplicate && dupRes.duplicates?.length > 0) {
          setDuplicatePatients(dupRes.duplicates);
          setIsDuplicateModalOpen(true);
          setLoading(false);
          return;
        }
      } catch (dupErr) {
        console.warn('Duplicate check check warning:', dupErr);
      }
    }

    try {
      const response = await apiClient.post('/patients', {
        ...formData,
        doctorId: selectedDoctorId ? Number(selectedDoctorId) : null,
        emergencyContactName: formData.emergencyContactName || 'N/A',
        emergencyContactPhone: formData.emergencyContactPhone || 'N/A'
      });
      const savedPatient = response.patient || response;
      setRegisteredPatient(savedPatient);

      const assignedDoc = doctors.find(d => String(d.id) === String(selectedDoctorId));
      const doctorDisplayName = assignedDoc 
        ? (assignedDoc.staffMember?.name || assignedDoc.name || assignedDoc.user?.name || `Dr. ${assignedDoc.name}`)
        : 'General OPD';
      const doctorSpec = assignedDoc?.specialization || assignedDoc?.department?.name || '';
      const doctorRoom = assignedDoc?.roomNumber || '';

      savedPatient.doctorId = selectedDoctorId;
      savedPatient.doctorName = doctorDisplayName;
      savedPatient.doctorSpecialization = doctorSpec;
      savedPatient.doctorRoom = doctorRoom;

      let tokenInfoStr = `MRN: ${savedPatient.mrNumber}`;

      if (selectedDoctorId) {
        try {
          const tokenRes = await apiClient.post('/tokens', {
            type: 'opd',
            patientId: savedPatient.id,
            doctorId: Number(selectedDoctorId),
            fee: Number(formData.paymentAmount) || 1500,
            detail: 'New Patient Registration Visit'
          });
          if (tokenRes && tokenRes.tokenNumber) {
            tokenInfoStr += ` • Token: ${tokenRes.tokenNumber}`;
            savedPatient.tokenNumber = tokenRes.tokenNumber;
          }
        } catch (tErr) {}
      }

      setSuccessMsg(`Patient successfully registered! (${tokenInfoStr})`);
      setSavedPatientRecord(savedPatient);
      setIsNextActionsOpen(true);

      // Auto-trigger print receipt window instantly upon saving
      setTimeout(() => {
        handlePrintSlip(savedPatient);
      }, 300);

      // Reset form input values for next patient intake
      setFormData({
        name: '',
        guardianName: '',
        gender: 'male',
        dob: '',
        age: '',
        cnic: '',
        phone: '',
        email: '',
        bloodGroup: '',
        address: '',
        area: '',
        paymentMethod: 'Initial Payment',
        paymentAmount: '1500',
        emergencyContactName: '',
        emergencyContactPhone: '',
        insuranceProvider: '',
        insurancePolicyNum: '',
      });
      setSelectedDoctorId('');
      setBypassDuplicate(false);

      if (andBook) {
        window.location.href = `/appointments?prefillName=${encodeURIComponent(savedPatient.name)}&prefillPhone=${encodeURIComponent(savedPatient.phone)}&prefillId=${savedPatient.id}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedDuplicateRegistration = () => {
    setIsDuplicateModalOpen(false);
    setBypassDuplicate(true);
    handleSubmit(undefined, false, true);
  };

  const handlePrintSlip = (patientObj?: any) => {
    const target = patientObj || registeredPatient;
    if (!target) return;

    // Resolve assigned Doctor Name
    const assignedDoc = doctors.find(d => String(d.id) === String(target.doctorId || selectedDoctorId));
    const doctorName = target.doctorName || (assignedDoc 
      ? (assignedDoc.staffMember?.name || assignedDoc.name || assignedDoc.user?.name || `Dr. ${assignedDoc.name}`)
      : 'General OPD');
    const rawSpec = target.doctorSpecialization || assignedDoc?.specialization || assignedDoc?.department?.name || '';
    const cleanSpec = (rawSpec && rawSpec.toLowerCase() !== 'opd' && rawSpec.toLowerCase() !== 'general') ? rawSpec : '';
    const roomNumber = target.doctorRoom || (assignedDoc?.roomNumber ? `Room: ${assignedDoc.roomNumber}` : '');

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for Dr. Talha Clinic EMR to print receipts automatically.');
      return;
    }

    printWindow.document.write(`
        <html>
        <head>
          <title>Receipt Ticket - ${target.mrNumber || 'MRN'}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: 76mm !important;
                max-width: 76mm !important;
                margin: 0 auto !important;
                padding: 2mm 2mm 6mm 2mm !important;
                background: #fff !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              width: 76mm;
              max-width: 76mm;
              margin: 0 auto;
              padding: 4mm 3mm;
              color: #000;
              font-size: 11px;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .hospital-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; }
            .hospital-info { font-size: 9.5px; color: #000; line-height: 1.2; }
            .token-box { border: 2px solid #000; padding: 6px 4px; margin: 7px 0; text-align: center; background-color: #fff; }
            .token-label { font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
            .token-number { font-size: 28px; font-weight: 900; margin: 3px 0; font-family: Arial, sans-serif; letter-spacing: 1.5px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10.5px; }
            .info-label { font-weight: bold; }
            .footer-text { font-size: 9px; text-align: center; margin-top: 8px; font-weight: bold; line-height: 1.2; }
          </style>
        </head>
        <body>
          <div class="text-center hospital-name">DR. TALHA CLINIC</div>
          <div class="text-center hospital-info">12-B, Main Boulevard, Gulberg III, Lahore</div>
          <div class="text-center hospital-info">Tel: (042) 35889900 | Mobile: 0311-6353044</div>
          
          <div class="divider"></div>

          <div class="token-box">
            <div class="token-label">TODAY'S DAILY TOKEN</div>
            <div class="token-number">TOKEN # ${target.tokenNumber || 'T-01'}</div>
            <div style="font-size: 12px; margin-top: 3px; font-weight: 900; color: #000;">
              👨‍⚕️ ${doctorName}
            </div>
            ${cleanSpec ? `<div style="font-size: 9px; font-weight: bold;">(${cleanSpec})</div>` : ''}
            <div style="font-size: 10px; margin-top: 3px; font-weight: bold;">MRN: ${target.mrNumber || 'MR-N/A'}</div>
          </div>

          <div class="divider"></div>

          <div class="info-row"><span class="info-label">Patient Name:</span> <span>${target.name}</span></div>
          <div class="info-row"><span class="info-label">Age / Gender:</span> <span>${target.age || 'N/A'} Yrs / ${(target.gender || 'male').toUpperCase()}</span></div>
          <div class="info-row"><span class="info-label">Phone:</span> <span>${target.phone}</span></div>
          <div class="info-row"><span class="info-label">Amount Paid:</span> <span>Rs. ${target.paymentAmount || '1500'}</span></div>
          <div class="info-row"><span class="info-label">Date & Time:</span> <span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>

          <div class="divider"></div>

          <div class="footer-text">
            THANK YOU FOR VISITING DR. TALHA CLINIC<br/>
            PLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-500" /> Patient Registration Intake
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Open a new medical folder and issue token slips instantly.</p>
        </div>
        {registeredPatient && (
          <Button onClick={handlePrintSlip} variant="secondary" className="flex items-center gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" /> Print Ticket Slip
          </Button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-400 text-xs font-semibold animate-fadeIn">
          {errorMsg}
        </div>
      )}

      <form onSubmit={e => handleSubmit(e)} className="space-y-6">
        <Card className="p-5 md:p-6 space-y-5">
          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2">
            Folder Intake Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Patient Name"
              required
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
            />
            <Input
              label="Father / Husband Name"
              value={formData.guardianName}
              onChange={e => handleInputChange('guardianName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Gender</label>
              <select
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="relative">
              <Input
                label="Date of Birth (Optional)"
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className="pl-10"
              />
              <Calendar className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <Input
              label="Age (Years)"
              type="number"
              required
              placeholder="e.g. 35"
              value={formData.age}
              onChange={e => handleInputChange('age', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CNIC / Passport Number (Optional)"
              maxLength={15}
              placeholder="e.g. 42101-1234567-1"
              value={formData.cnic}
              onChange={e => handleInputChange('cnic', e.target.value)}
            />
            <Input
              label="Mobile Phone Number"
              required
              maxLength={12}
              placeholder="e.g. 0300-1234567"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address (Optional)"
              type="email"
              maxLength={50}
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Blood Group (Optional)</label>
              <select
                value={formData.bloodGroup}
                onChange={e => handleInputChange('bloodGroup', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Select Blood Group (Optional)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Residential Address"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand-500" /> Area / Colony
              </label>
              <select
                value={formData.area}
                onChange={e => handleInputChange('area', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Select Area / Colony (Optional)</option>
                {areas.map((a: any) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* PAYMENT DETAILS COMPULSORY BOX */}
        <Card className="p-5 md:p-6 space-y-5 border-2 border-brand-500/30 bg-brand-500/[0.02]">
          <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest border-b border-brand-500/20 pb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-500" /> Payment Details (Compulsory)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Assigned OPD Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={e => handleDoctorSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-brand-400 dark:border-brand-600 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
              >
                <option value="">-- Select Available Doctor --</option>
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.user?.name || `Dr. ${d.specialization || 'Doctor'}`} ({d.specialization || d.department?.name || 'General OPD'}) - Rs. {d.consultationFee || 500}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Payment <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.paymentMethod}
                onChange={e => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-brand-400 dark:border-brand-600 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
              >
                {paymentModes.map((pm: any) => (
                  <option key={pm.id} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Amount (Rs.)"
              type="number"
              placeholder="e.g. 1500"
              value={formData.paymentAmount}
              onChange={e => handleInputChange('paymentAmount', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-5 md:p-6 space-y-5">
          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2">
            Emergency & Policy Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Relative Name"
              value={formData.emergencyContactName}
              onChange={e => handleInputChange('emergencyContactName', e.target.value)}
            />
            <Input
              label="Emergency Contact Phone"
              maxLength={12}
              placeholder="e.g. 0300-1234567"
              value={formData.emergencyContactPhone}
              onChange={e => handleInputChange('emergencyContactPhone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Insurance Provider Name (Optional)"
              value={formData.insuranceProvider}
              onChange={e => handleInputChange('insuranceProvider', e.target.value)}
            />
            <Input
              label="Insurance Card Policy Number (Optional)"
              value={formData.insurancePolicyNum}
              onChange={e => handleInputChange('insurancePolicyNum', e.target.value)}
            />
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-3.5 pt-2">
          <Button type="submit" isLoading={loading} className="flex items-center gap-1.5 justify-center">
            <Save className="h-4 w-4" /> Save Patient
          </Button>
        </div>
      </form>

      {/* 1. DUPLICATE PATIENT WARNING MODAL */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Potential Duplicate Patient Detected"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-300 text-xs">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Existing Patient Records Found with Matching Mobile / CNIC</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                The mobile number or CNIC you entered is already registered with {duplicatePatients.length} existing patient record(s). Please review below before proceeding to avoid creating duplicate medical records.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {duplicatePatients.map((dup: any) => (
              <div key={dup.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-dark-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{dup.name}</span>
                    <Badge variant="brand">{dup.mrNumber}</Badge>
                    <span className="text-[10px] text-slate-500 font-medium capitalize">({dup.age || 'N/A'} Yrs, {dup.gender})</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>📞 {dup.phone}</span>
                    {dup.cnic && dup.cnic !== 'N/A' && <span>🪪 CNIC: {dup.cnic}</span>}
                    <span>📍 {dup.area || dup.address || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`/patients`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white rounded-lg text-[11px] font-bold transition-all border border-brand-200 dark:border-brand-900/40"
                  >
                    <ExternalLink className="h-3 w-3" /> View Profile
                  </a>
                  <a
                    href={`/old-patient`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[11px] font-bold transition-all border border-emerald-200 dark:border-emerald-900/40"
                  >
                    <Ticket className="h-3 w-3" /> Re-Visit Intake
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsDuplicateModalOpen(false)}>
              Cancel / Modify Info
            </Button>
            <Button variant="primary" size="sm" onClick={handleProceedDuplicateRegistration} className="bg-amber-600 hover:bg-amber-700">
              Proceed & Register Anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. POST-REGISTRATION NEXT ACTIONS LAUNCHPAD MODAL */}
      <Modal
        isOpen={isNextActionsOpen}
        onClose={() => setIsNextActionsOpen(false)}
        title="Patient Registered Successfully!"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-emerald-950 dark:text-emerald-300 text-sm">
                {savedPatientRecord?.name} Registered Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                MR Number: <strong>{savedPatientRecord?.mrNumber}</strong> • Phone: {savedPatientRecord?.phone}
                {savedPatientRecord?.tokenNumber && ` • Daily Token #${savedPatientRecord.tokenNumber}`}
              </p>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Next Action for this Patient:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Action 1: Print Ticket */}
            <button
              onClick={() => handlePrintSlip(savedPatientRecord)}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-left transition-all group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-all">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Print Ticket Slip</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Re-print thermal / paper receipt slip</p>
              </div>
            </button>

            {/* Action 2: Start Intake */}
            <a
              href={`/old-patient`}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Start Intake / Re-Visit</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capture symptoms & initial vitals</p>
              </div>
            </a>

            {/* Action 3: Token Queue Monitor */}
            <a
              href={`/token-queue`}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left transition-all group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Live Token Queue</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Monitor doctor line & consultation</p>
              </div>
            </a>

            {/* Action 4: Admit Patient */}
            <a
              href={`/admissions`}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 hover:border-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 text-left transition-all group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                <BedDouble className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Admit to Inpatient Bed</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Assign ward room & surgical care</p>
              </div>
            </a>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
            <a
              href={`/patients`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Patient Directory
            </a>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsNextActionsOpen(false);
                setSavedPatientRecord(null);
              }}
              className="flex items-center gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" /> Register Another Patient
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
