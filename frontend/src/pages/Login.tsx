import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Input, Button, Card } from '../components/UI';
import { HeartPulse, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic registered system users
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  // Login form fields & selection
  const [selectedRole, setSelectedRole] = useState('custom');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadRegisteredUsers = async () => {
      try {
        const data = await apiClient.get('/auth/system-users');
        if (Array.isArray(data) && data.length > 0) {
          setSystemUsers(data);
          setSelectedRole(data[0].email);
          setEmail(data[0].email);
        } else {
          setSelectedRole('custom');
          setEmail('');
        }
      } catch (err) {
        console.warn('Error loading registered users:', err);
        setSelectedRole('custom');
        setEmail('');
      } finally {
        setFetchingUsers(false);
      }
    };

    loadRegisteredUsers();
  }, []);

  const handleRoleChange = (val: string) => {
    setSelectedRole(val);
    if (val !== 'custom') {
      setEmail(val);
    } else {
      setEmail('');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950 p-4 relative overflow-hidden animate-gradient">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-400/10 dark:bg-brand-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-emerald-400/10 dark:bg-emerald-500/5 blur-3xl" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 mb-3">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dr. Talha Clinic</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clinical Medical EMR Portal</p>
        </div>

        {/* Auth Forms Card */}
        <Card className="p-6 md:p-8">
          <div className="text-center mb-6 border-b border-slate-100 dark:border-slate-850 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Staff Account Sign In</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-3.5">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Account Role Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Select Registered Account
              </label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={fetchingUsers}
                  className="w-full px-3.5 py-2.5 pl-10 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium disabled:opacity-60"
                >
                  {systemUsers.map((u: any) => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email}) - {String(u.role || 'User').toUpperCase()}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Email</option>
                </select>
                <ShieldCheck className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@clinic.com"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setSelectedRole('custom');
                }}
                className="pl-10"
              />
              <Mail className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <Lock className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs mt-2">
              <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-800 text-brand-500 focus:ring-brand-500" />
                Remember credentials
              </label>
              <button
                type="button"
                onClick={() => alert('Password recovery flow: Please contact your system administrator to reset credentials.')}
                className="font-semibold text-brand-500 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              Access System Account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
