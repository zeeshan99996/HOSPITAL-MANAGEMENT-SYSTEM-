import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Card } from '../components/UI';
import { HeartPulse, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">LifeFlow Medical Center</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enterprise Hospital Information Portal</p>
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
            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@lifeflow.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10"
              />
              <Mail className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10"
              />
              <Lock className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
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
