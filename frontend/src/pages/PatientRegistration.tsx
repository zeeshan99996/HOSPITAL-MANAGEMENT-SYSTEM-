import React, { useState } from 'react';
import { Card, Input, Button } from '../components/UI';
import { Printer, Save, RefreshCw, Calendar, UserPlus } from 'lucide-react';
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
    bloodGroup: 'O+',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    insurancePolicyNum: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);

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
    setFormData({ ...formData, [key]: value });
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
      bloodGroup: 'O+',
      address: '',
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

    try {
      const response = await apiClient.post('/patients', {
        ...formData,
        emergencyContactName: formData.emergencyContactName || 'N/A',
        emergencyContactPhone: formData.emergencyContactPhone || 'N/A'
      });
      setRegisteredPatient(response);
      setSuccessMsg(`Patient successfully registered! MRN: ${response.mrNumber}`);
      if (andBook) {
        window.location.href = `/appointments?prefillName=${encodeURIComponent(response.name)}&prefillPhone=${encodeURIComponent(response.phone)}&prefillId=${response.id}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving patient.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = () => {
    if (!registeredPatient) return;
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 11px; padding: 10px; width: 280px; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .ticket-header { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="text-center ticket-header">LIFEFLOW MEDICAL CENTER</div>
          <div class="text-center">RECEPTION REGISTRATION DESK</div>
          <div class="divider"></div>
          <div><span class="bold">MRN Number:</span> \${registeredPatient.mrNumber}</div>
          <div><span class="bold">Patient Name:</span> \${registeredPatient.name}</div>
          <div><span class="bold">Guardian:</span> \${formData.guardianName || 'N/A'}</div>
          <div><span class="bold">Age / Gender:</span> \${formData.age} yrs / \${formData.gender.toUpperCase()}</div>
          <div><span class="bold">Phone:</span> \${registeredPatient.phone}</div>
          <div><span class="bold">Blood Group:</span> \${registeredPatient.bloodGroup || 'N/A'}</div>
          <div><span class="bold">Registered At:</span> \${new Date().toLocaleString()}</div>
          <div class="divider"></div>
          <div class="text-center bold" style="font-size: 9px;">PLEASE RE-PRESENT THIS SLIP IN CASE OF ANY MODIFICATIONS</div>
          <script>window.print(); window.close();</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
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
              placeholder="e.g. Alice Brown"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
            />
            <Input
              label="Father / Husband Name"
              placeholder="e.g. Robert Brown"
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
                label="Date of Birth"
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className="pl-10"
              />
              <Calendar className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <Input
              label="Age (Auto Calculated)"
              type="number"
              value={formData.age}
              onChange={e => handleInputChange('age', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CNIC / Passport Number"
              placeholder="e.g. 35202-xxxxxxx-x"
              value={formData.cnic}
              onChange={e => handleInputChange('cnic', e.target.value)}
            />
            <Input
              label="Mobile Phone Number"
              required
              placeholder="e.g. 555-0199"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. name@domain.com"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={e => handleInputChange('bloodGroup', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
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

          <Input
            label="Residential Address"
            placeholder="e.g. House 4-B, Lane 12, DHA"
            value={formData.address}
            onChange={e => handleInputChange('address', e.target.value)}
          />
        </Card>

        <Card className="p-5 md:p-6 space-y-5">
          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2">
            Emergency & Policy Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Relative Name"
              placeholder="e.g. John Doe"
              value={formData.emergencyContactName}
              onChange={e => handleInputChange('emergencyContactName', e.target.value)}
            />
            <Input
              label="Emergency Contact Phone"
              placeholder="e.g. 555-9821"
              value={formData.emergencyContactPhone}
              onChange={e => handleInputChange('emergencyContactPhone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Insurance Provider Name (Optional)"
              placeholder="e.g. BlueCross State Policy"
              value={formData.insuranceProvider}
              onChange={e => handleInputChange('insuranceProvider', e.target.value)}
            />
            <Input
              label="Insurance Card Policy Number (Optional)"
              placeholder="e.g. PLY-998811"
              value={formData.insurancePolicyNum}
              onChange={e => handleInputChange('insurancePolicyNum', e.target.value)}
            />
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-3.5 pt-2">
          <Button type="button" variant="secondary" onClick={handleReset} className="flex items-center gap-1.5 justify-center">
            <RefreshCw className="h-4 w-4" /> Reset Intake Form
          </Button>
          <Button type="button" onClick={e => handleSubmit(e, true)} isLoading={loading} className="flex items-center gap-1.5 justify-center bg-indigo-650 hover:bg-indigo-700 text-white">
            <Save className="h-4 w-4" /> Save & Book Visit
          </Button>
          <Button type="submit" isLoading={loading} className="flex items-center gap-1.5 justify-center">
            <Save className="h-4 w-4" /> Save Intake Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
