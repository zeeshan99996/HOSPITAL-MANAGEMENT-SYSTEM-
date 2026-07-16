import React, { useState } from 'react';
import { Card, Input, Button } from '../components/UI';
import { User, Lock, Phone, Save, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  
  // Password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await apiClient.put('/auth/profile', { name, phone });
      setSuccessMsg('Profile details updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!password) {
      setErrorMsg('Please specify a new password.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await apiClient.put('/auth/profile', { password });
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('Security credentials updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-brand-500" /> Staff Profile Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your personal contact details, email addresses, and security passwords.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info card */}
        <Card className="p-5 flex flex-col items-center text-center space-y-4 md:col-span-1 border border-slate-200/60 dark:border-slate-850">
          <div className="h-20 w-20 rounded-full bg-brand-100 dark:bg-brand-950/60 border-2 border-brand-500 text-brand-650 dark:text-brand-400 flex items-center justify-center font-extrabold text-2xl select-none shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-950 dark:text-slate-100">{user.name}</h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">{user.role}</p>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-850 text-left text-2xs space-y-2.5 text-slate-500 dark:text-slate-400 font-semibold">
            <div>
              <span className="block text-slate-400 font-bold uppercase text-[8px] tracking-widest">Email Address</span>
              <span className="text-slate-800 dark:text-slate-250 truncate block">{user.email}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold uppercase text-[8px] tracking-widest">User Account ID</span>
              <span className="text-slate-800 dark:text-slate-250 font-mono">UID-2026-00{user.id}</span>
            </div>
          </div>
        </Card>

        {/* Editing columns */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-5 md:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2">
              Edit General Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="relative">
                <Input
                  label="Display Full Name"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-10"
                />
                <User className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
              </div>

              <div className="relative">
                <Input
                  label="Mobile Contact Phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="pl-10"
                />
                <Phone className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={loading} className="flex items-center gap-1.5 justify-center">
                  <Save className="h-4 w-4" /> Save Profile Details
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-brand-500" /> Security Credentials
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative">
                <Input
                  label="Specify New Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                />
                <Lock className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
                <Lock className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={loading} className="flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-700">
                  <Lock className="h-4 w-4" /> Update Security Credentials
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
