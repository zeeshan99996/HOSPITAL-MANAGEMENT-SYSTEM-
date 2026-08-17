import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  Check,
  Stethoscope,
  Crown,
  UserCheck,
  Pill,
  Receipt,
  HeartPulse,
  Sparkles,
  ArrowRight,
  Shield,
  KeyRound
} from 'lucide-react';

interface SystemAccount {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic registered system users
  const [systemUsers, setSystemUsers] = useState<SystemAccount[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  // Login form fields & selection
  const [selectedUser, setSelectedUser] = useState<SystemAccount | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadRegisteredUsers = async () => {
      try {
        const data = await apiClient.get('/auth/system-users');
        if (Array.isArray(data) && data.length > 0) {
          setSystemUsers(data);
          setSelectedUser(data[0]);
          setEmail(data[0].email);
          setIsCustomEmail(false);
        } else {
          setIsCustomEmail(true);
          setEmail('');
        }
      } catch (err) {
        console.warn('Error loading registered users:', err);
        setIsCustomEmail(true);
        setEmail('');
      } finally {
        setFetchingUsers(false);
      }
    };

    loadRegisteredUsers();
  }, []);

  const handleSelectAccount = (userAccount: SystemAccount) => {
    setSelectedUser(userAccount);
    setEmail(userAccount.email);
    setIsCustomEmail(false);
    setIsDropdownOpen(false);
  };

  const handleToggleCustomMode = () => {
    if (!isCustomEmail) {
      setIsCustomEmail(true);
      setSelectedUser(null);
      setEmail('');
    } else {
      if (systemUsers.length > 0) {
        handleSelectAccount(systemUsers[0]);
      } else {
        setIsCustomEmail(false);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = (role: string = '') => {
    const r = role.toLowerCase();
    switch (r) {
      case 'admin':
        return {
          label: 'System Admin',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          avatarBg: 'from-amber-500 to-orange-500 text-white',
          icon: Crown,
        };
      case 'doctor':
        return {
          label: 'Medical Doctor',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          avatarBg: 'from-emerald-500 to-teal-600 text-white',
          icon: Stethoscope,
        };
      case 'receptionist':
        return {
          label: 'Front Desk / Reception',
          badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          avatarBg: 'from-indigo-500 to-brand-600 text-white',
          icon: UserCheck,
        };
      case 'pharmacist':
        return {
          label: 'Pharmacy Dispensary',
          badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          avatarBg: 'from-purple-500 to-fuchsia-600 text-white',
          icon: Pill,
        };
      case 'accountant':
        return {
          label: 'Finance & Billing',
          badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
          avatarBg: 'from-cyan-500 to-blue-600 text-white',
          icon: Receipt,
        };
      case 'nurse':
        return {
          label: 'Clinical Nurse',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          avatarBg: 'from-rose-500 to-pink-600 text-white',
          icon: HeartPulse,
        };
      default:
        return {
          label: role.toUpperCase() || 'Staff User',
          badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
          avatarBg: 'from-slate-600 to-slate-800 text-white',
          icon: ShieldCheck,
        };
    }
  };

  const selectedRoleConfig = selectedUser ? getRoleConfig(selectedUser.role) : null;
  const SelectedIcon = selectedRoleConfig?.icon || ShieldCheck;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/40 dark:from-dark-950 dark:via-dark-900 dark:to-slate-950 p-4 sm:p-6 relative overflow-hidden selection:bg-brand-500 selection:text-white">
      {/* Decorative High-End Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[420px] h-[420px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-72 h-72 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      {/* Main Login Container */}
      <div className="w-full max-w-[440px] z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="relative group">
            <div className="h-16 w-16 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-slate-800 p-2 shadow-xl shadow-brand-500/10 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
              <img src="/logo.png" alt="Dr. Talha Clinic Logo" className="h-full w-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-900 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>Dr. Talha Clinic</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase mt-0.5">
              Clinical EMR & Healthcare Portal
            </p>
          </div>
        </div>

        {/* Auth Glassmorphic Card */}
        <div className="relative rounded-3xl bg-white/95 dark:bg-dark-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-dark-950/80 p-6 sm:p-8 transition-all">
          
          {/* Card Title & Portal Mode */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Staff Authentication
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Sign in to your clinical role workspace
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-[10px] font-bold border border-brand-500/20 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Secure EMR
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-start gap-2.5 animate-in fade-in duration-200">
              <div className="p-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* ======================================================== */}
            {/* ULTRA-PROFESSIONAL CUSTOM ACCOUNT ROLE SELECTOR */}
            {/* ======================================================== */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                  Select Staff Account
                </label>
                <button
                  type="button"
                  onClick={handleToggleCustomMode}
                  className="text-[11px] font-bold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {isCustomEmail ? '← Registered List' : 'Enter Custom Email'}
                </button>
              </div>

              {!isCustomEmail ? (
                <div className="relative">
                  {/* Interactive Selected Account Card / Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={fetchingUsers}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                      isDropdownOpen
                        ? 'border-brand-500 ring-4 ring-brand-500/10 bg-white dark:bg-dark-950 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-dark-950/60 hover:bg-white dark:hover:bg-dark-950 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Role Avatar Pill */}
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${selectedRoleConfig?.avatarBg || 'from-slate-500 to-slate-700'} flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0`}>
                        <SelectedIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Account Identity Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                            {selectedUser?.name || 'Select Account'}
                          </span>
                          {selectedRoleConfig && (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${selectedRoleConfig.badge}`}>
                              {selectedUser?.role || 'Staff'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                          {selectedUser?.email || 'Loading registered staff...'}
                        </span>
                      </div>
                    </div>

                    {/* Chevron Indicator */}
                    <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-brand-500' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Floating Options Menu */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/20 dark:shadow-black/60 overflow-hidden divide-y divide-slate-100 dark:divide-slate-850 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                      <div className="p-2 bg-slate-50/80 dark:bg-dark-900/60 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                          Available Clinical Accounts ({systemUsers.length})
                        </span>
                      </div>

                      <div className="p-1.5 space-y-1">
                        {systemUsers.map((u) => {
                          const config = getRoleConfig(u.role);
                          const IconComp = config.icon;
                          const isSelected = selectedUser?.email === u.email;

                          return (
                            <div
                              key={u.email}
                              onClick={() => handleSelectAccount(u)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                                  : 'hover:bg-slate-100/80 dark:hover:bg-dark-900 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${config.avatarBg} flex items-center justify-center shrink-0`}>
                                  <IconComp className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {u.name}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${config.badge}`}>
                                      {u.role}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                                    {u.email}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Option for custom manual email */}
                      <div
                        onClick={handleToggleCustomMode}
                        className="p-2.5 hover:bg-slate-100/80 dark:hover:bg-dark-900 cursor-pointer flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-400"
                      >
                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-dark-850 flex items-center justify-center text-slate-500">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block text-slate-900 dark:text-white">Custom / Other Email</span>
                          <span className="text-[10px] text-slate-400 font-normal">Type another email address manually</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Email Input Mode */
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter staff account email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-350 dark:border-slate-800 text-xs sm:text-sm bg-white dark:bg-dark-950 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Email Display / Input Field when in Registered Mode */}
            {!isCustomEmail && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                  Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    readOnly
                    value={email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs sm:text-sm bg-slate-100/60 dark:bg-dark-950/60 text-slate-600 dark:text-slate-400 font-mono focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Please contact the Clinic System Administrator or IT Desk to reset staff credentials.')}
                  className="text-[11px] font-semibold text-slate-400 hover:text-brand-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-350 dark:border-slate-800 text-xs sm:text-sm bg-white dark:bg-dark-950 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 text-brand-500 focus:ring-brand-500"
                />
                <span>Remember this terminal session</span>
              </label>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600 hover:from-brand-600 hover:via-brand-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to EMR Portal</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Standards Info */}
        <div className="text-center space-y-1 text-[11px] text-slate-400 font-medium">
          <p className="flex items-center justify-center gap-1 text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>256-Bit Encrypted Healthcare Management System</span>
          </p>
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} Dr. Talha Clinic. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
