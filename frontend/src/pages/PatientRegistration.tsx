import React, { useState, useEffect } from 'react';
import { Card, Input, Button } from '../components/UI';
import { Printer, Save, Calendar, UserPlus, CreditCard, MapPin } from 'lucide-react';
import { apiClient } from '../services/api';

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
      val = value.replace(/\D/g, '').slice(0, 11);
    }
    if (key === 'cnic') val = value.slice(0, 20);
    if (key === 'email') val = value.slice(0, 50);
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

  const handleSubmit = async (e: React.FormEvent, andBook: boolean = false) => {
    e.preventDefault();
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

    if (formData.phone.length !== 11) {
      setErrorMsg('Please enter a valid 11-digit Mobile Phone Number (e.g. 03116353044).');
      setLoading(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMsg('Please enter a valid Email Address (e.g. name@domain.com).');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/patients', {
        ...formData,
        emergencyContactName: formData.emergencyContactName || 'N/A',
        emergencyContactPhone: formData.emergencyContactPhone || 'N/A'
      });
      const savedPatient = response.patient || response;
      setRegisteredPatient(savedPatient);

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

      // Auto-trigger print receipt window instantly upon saving
      setTimeout(() => {
        handlePrintSlip(savedPatient);
      }, 200);

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

      if (andBook) {
        window.location.href = `/appointments?prefillName=${encodeURIComponent(savedPatient.name)}&prefillPhone=${encodeURIComponent(savedPatient.phone)}&prefillId=${savedPatient.id}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving patient.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = (patientObj?: any) => {
    const target = patientObj || registeredPatient;
    if (!target) return;

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for LifeFlow EMR to print receipts automatically.');
      return;
    }

    printWindow.document.write(`
        <html>
        <head>
          <title>Receipt Ticket - ${target.mrNumber || 'MRN'}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; padding: 12px; width: 280px; margin: 0 auto; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .hospital-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
            .hospital-info { font-size: 10px; color: #222; line-height: 1.3; }
            .token-box { border: 2px solid #000; padding: 8px; margin: 10px 0; text-align: center; background-color: #f8f9fa; }
            .token-label { font-size: 10px; font-weight: bold; letter-spacing: 1px; }
            .token-number { font-size: 24px; font-weight: 900; margin-top: 3px; font-family: Arial, sans-serif; letter-spacing: 1px; }
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
            <div class="token-label">TODAY'S DAILY TOKEN</div>
            <div class="token-number">TOKEN # ${target.tokenNumber || 1}</div>
            <div style="font-size: 10px; margin-top: 3px; font-weight: bold; color: #333;">MRN: ${target.mrNumber || 'MR-N/A'}</div>
          </div>

          <div class="divider"></div>

          <div class="info-row"><span class="info-label">Patient Name:</span> <span>${target.name}</span></div>
          <div class="info-row"><span class="info-label">Age / Gender:</span> <span>${target.age || 'N/A'} Yrs / ${(target.gender || 'male').toUpperCase()}</span></div>
          <div class="info-row"><span class="info-label">Phone:</span> <span>${target.phone}</span></div>
          <div class="info-row"><span class="info-label">Area / Colony:</span> <span>${target.area || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Payment Mode:</span> <span>${target.paymentMethod || 'Initial Payment'}</span></div>
          <div class="info-row"><span class="info-label">Amount Paid:</span> <span>Rs. ${target.paymentAmount || '1500'}</span></div>
          <div class="info-row"><span class="info-label">Date & Time:</span> <span>${new Date().toLocaleString()}</span></div>

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
              maxLength={20}
              value={formData.cnic}
              onChange={e => handleInputChange('cnic', e.target.value)}
            />
            <Input
              label="Mobile Phone Number"
              required
              maxLength={11}
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
                    {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : `Dr. ${d.specialization || 'Physician'}`} ({d.specialization || d.department?.name || 'OPD'}) - Rs. {d.consultationFee || 1500}
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
              maxLength={11}
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
    </div>
  );
};
