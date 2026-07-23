import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import {
  ShieldCheck,
  Search,
  KeyRound,
  Lock,
  Mail,
  User,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const SecurityManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Selected user for credential edit
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/admin/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching user accounts:', err);
      setFeedback({ type: 'error', message: 'Failed to load user accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status || 'active');
    setPassword('');
    setShowPassword(false);
    setIsEditOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload: any = {
        name,
        email,
        role,
        status,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await apiClient.put(`/admin/users/${selectedUser.id}/credentials`, payload);
      setFeedback({ type: 'success', message: res.message || 'Credentials updated successfully.' });
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Error updating credentials.' });
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'System Admin',
    doctor: 'Medical Doctor',
    receptionist: 'Reception Staff',
    nurse: 'Ward Nurse',
    lab_technician: 'Lab Tech',
    pharmacist: 'Pharmacist',
    accountant: 'Accountant',
    patient: 'Patient Portal',
  };

  const roleBadges: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    doctor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    receptionist: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    nurse: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    lab_technician: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pharmacist: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    accountant: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    patient: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/20 border border-brand-400/30 text-brand-400 shadow-inner">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">System Security & Access Control</h2>
            <p className="text-xs text-slate-300 mt-0.5">Manage user credentials, edit usernames/emails, update passwords, and control access rights across all accounts.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
            Total System Accounts: <span className="text-brand-400 font-bold ml-1">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Alert Notifications */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Role Filters Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Input
              placeholder="Search accounts by name, username/email, or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
          </div>

          {/* Role Filter Select */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All User Accounts ({users.length})</option>
              <option value="admin">System Admin</option>
              <option value="doctor">Doctors</option>
              <option value="receptionist">Receptionists</option>
              <option value="nurse">Nurses</option>
              <option value="lab_technician">Lab Techs</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="accountant">Accountants</option>
              <option value="patient">Patients</option>
            </select>
          </div>
        </div>
      </Card>

      {/* User Accounts List */}
      {loading ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-3 animate-spin">
            <RefreshCw className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-500">Loading User Account Security Database...</span>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <Shield className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching user accounts found</h3>
          <p className="text-xs text-slate-400">Try adjusting your search keywords or role filters.</p>
        </Card>
      ) : (
        <>
          {/* Responsive Mobile Cards View (sm screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:hidden">
            {filteredUsers.map(u => (
              <Card key={u.id} className="p-4 space-y-3 relative hover:border-brand-300 dark:hover:border-brand-800 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-800">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{u.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">{u.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-b border-slate-100 dark:border-slate-850 py-2 text-xs">
                  <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${roleBadges[u.role] || 'bg-slate-100 text-slate-700'}`}>
                    {roleLabels[u.role] || u.role}
                  </span>

                  <Badge type={u.status === 'active' ? 'success' : 'error'}>
                    {u.status || 'active'}
                  </Badge>
                </div>

                <Button
                  onClick={() => handleOpenEdit(u)}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5 text-brand-500" /> Change Password & Credentials
                </Button>
              </Card>
            ))}
          </div>

          {/* Desktop & Tablet Responsive Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">User Details</th>
                  <th className="px-6 py-3.5">Email / Username</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-850/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-800 shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{u.name}</div>
                          <div className="text-[10px] text-slate-400">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{u.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider border ${roleBadges[u.role] || 'bg-slate-100 text-slate-700'}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <Badge type={u.status === 'active' ? 'success' : 'error'}>
                        {u.status || 'active'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        onClick={() => handleOpenEdit(u)}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5 font-bold text-xs border-slate-300 dark:border-slate-700 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-brand-500" /> Edit Credentials
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit User Credentials & Password Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Security & Credentials: ${selectedUser?.name}`}>
        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Account</span>
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900 dark:text-white">{selectedUser?.name}</span>
              <span className="font-mono text-slate-500 text-[11px]">{selectedUser?.email}</span>
            </div>
          </div>

          {/* Full Name */}
          <div className="relative">
            <Input
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="pl-10"
            />
            <User className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
          </div>

          {/* Email / Username */}
          <div className="relative">
            <Input
              label="Email Address / Username"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-10"
            />
            <Mail className="absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
          </div>

          {/* Role & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned System Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="admin">System Admin</option>
                <option value="doctor">Medical Doctor</option>
                <option value="receptionist">Reception Staff</option>
                <option value="nurse">Ward Nurse</option>
                <option value="lab_technician">Lab Tech</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="accountant">Accountant</option>
                <option value="patient">Patient Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Active (Granted Access)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Reset / New Password
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Auto-Generate
              </button>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Leave blank to keep existing password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[11px] text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Only enter a value if you wish to override the current user password.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting} className="font-bold">
              Save Account Credentials
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
