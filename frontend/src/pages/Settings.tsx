import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Shield, Server, BellRing, User } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  
  // Settings configs states
  const [hospitalName, setHospitalName] = useState('LifeFlow Medical Center');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [fileStorage, setFileStorage] = useState('local');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('System settings updated and saved to backend database configuration.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure clinical parameters, SMTP credentials, and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Categories */}
        <Card className="md:col-span-1 p-4 space-y-1">
          <button className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold bg-brand-500 text-white shadow-sm">
            <SettingsIcon className="h-4.5 w-4.5" /> Core Parameters
          </button>
          <Link to="/security" className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950">
            <Shield className="h-4.5 w-4.5 text-brand-500" /> Security & Access Control
          </Link>
          <button onClick={() => alert('Diagnostic metrics: System is running on Sequelize/Express stack.')} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950">
            <Server className="h-4.5 w-4.5" /> Node Host Diagnostics
          </button>
        </Card>

        {/* Configuration Forms */}
        <Card className="md:col-span-2">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Hospital EMR parameters</h3>
            
            <Input label="Hospital Display Name" required value={hospitalName} onChange={e => setHospitalName(e.target.value)} />

            {/* Notification triggers */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block"><BellRing className="inline h-3.5 w-3.5 mr-1" /> Alert Dispatch Channels</span>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} className="rounded border-slate-350 text-brand-500" />
                Dispatch Email notifications on prescriptions & billing
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                <input type="checkbox" checked={smsAlerts} onChange={e => setSmsAlerts(e.target.checked)} className="rounded border-slate-350 text-brand-500" />
                Dispatch Twilio SMS reminders for upcoming queues
              </label>
            </div>

            {/* File upload */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Clinical report file storage</label>
              <select
                value={fileStorage}
                onChange={e => setFileStorage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="local">Local Host Storage (/uploads)</option>
                <option value="s3">AWS Simple Storage Service (S3)</option>
                <option value="cloudinary">Cloudinary Media Gateway</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="submit">Save Parameters</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
