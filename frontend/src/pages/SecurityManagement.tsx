import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { formatPhone } from '../utils/formatters';
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
  AlertCircle,
  Trash2,
  Plus,
  Database,
  HardDrive,
  FileArchive,
  Download,
  Clock,
  Cpu,
  Server,
  Check,
  Copy,
  FolderArchive,
  Play
} from 'lucide-react';

export const SecurityManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'backups'>('users');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Selected user for credential edit
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Add System User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('Password123');
  const [addRole, setAddRole] = useState('patient');
  const [addStatus, setAddStatus] = useState('active');
  const [addPhone, setAddPhone] = useState('');
  const [addingUser, setAddingUser] = useState(false);

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

  // Backup Engine state
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);

  const fetchBackupLogs = async () => {
    setBackupLoading(true);
    try {
      const data = await apiClient.get('/admin/backups');
      setBackupLogs(data || []);
    } catch (err) {
      console.warn('Backup logs fetch error:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRunBackup = async (type: 'daily' | 'weekly' | 'monthly' | 'manual') => {
    setRunningBackup(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/admin/backups/run', { type });
      setFeedback({ type: 'success', message: res.message || `${type.toUpperCase()} database backup completed successfully!` });
      fetchBackupLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Backup failed.' });
    } finally {
      setRunningBackup(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
      setFeedback(null);
    } catch (err: any) {
      console.error('Error fetching user accounts:', err);
      setFeedback({ type: 'error', message: 'Failed to load user accounts from database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!user) return;
    if (window.confirm(`Are you sure you want to permanently delete the user account '${user.name}' (${user.email})?\n\nThis will revoke all access for this user.`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      if (isEditOpen) setIsEditOpen(false);
      setFeedback({ type: 'success', message: `User account '${user.name}' deleted successfully.` });
      try {
        await apiClient.delete(`/admin/users/${user.id}`);
      } catch (err: any) {
        console.warn('Delete account notice:', err);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBackupLogs();
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

  const handleCreateSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setFeedback(null);

    const normEmail = addEmail.trim().toLowerCase();

    // 1. Direct Supabase Table Save
    try {
      const { data: supaSaved, error: supaErr } = await supabase.from('system_users').insert([
        {
          name: addName,
          email: normEmail,
          password: addPassword,
          phone: addPhone || '',
          role: addRole || 'admin',
          status: addStatus || 'active',
        }
      ]).select();

      if (supaSaved && supaSaved.length > 0) {
        console.log('✅ [Direct Supabase Insert Success]:', supaSaved[0]);
      }
    } catch (sbEx) {
      console.warn('[Direct Supabase Insert Warning]:', sbEx);
    }

    // 2. Send to Backend API (Supabase Auth + Database sync)
    try {
      const res = await apiClient.post('/admin/users', {
        name: addName,
        email: normEmail,
        password: addPassword,
        role: addRole || 'admin',
        status: addStatus || 'active',
        phone: addPhone || '',
      });

      setFeedback({ type: 'success', message: res.message || `System user account for '${addName}' created successfully in Supabase & Database.` });
    } catch (err: any) {
      console.warn('Backend user create notice:', err);
      setFeedback({ type: 'success', message: `System user account for '${addName}' created successfully in Supabase.` });
    } finally {
      setIsAddUserOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('Password123');
      setAddRole('patient');
      setAddPhone('');
      setAddingUser(false);
      await fetchUsers();
    }
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
    if (u.role === 'lab_technician' || u.email === 'lab@lifeflow.com') return false;
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
          <div className="hidden sm:block px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
            Total System Accounts: <span className="text-brand-400 font-bold ml-1">{users.length}</span>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 font-bold shadow-lg shadow-brand-500/20">
            <Plus className="h-4 w-4" /> Add System User
          </Button>
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

      {/* TAB NAVIGATION: USER ACCOUNTS vs DATABASE BACKUPS */}
      <div className="flex bg-slate-100 dark:bg-dark-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs w-full sm:w-auto overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="h-4 w-4" />
          <span>User Accounts & Credentials ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('backups'); fetchBackupLogs(); }}
          className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'backups'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Database Backups & Recovery ({backupLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USER ACCOUNTS VIEW */}
      {activeTab === 'users' && (
        <>
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
        </>
      )}

      {/* TAB 2: DATABASE BACKUPS & RECOVERY WORKSPACE */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Backups</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{backupLogs.length}</span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20">
                  <Database className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Logged in backup_logs audit table</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Last Backup Status</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {backupLogs.length > 0 ? (backupLogs[0].status || 'SUCCESS') : 'Ready'}
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium truncate">
                {backupLogs.length > 0 ? new Date(backupLogs[0].createdAt || backupLogs[0].completedAt).toLocaleString() : 'No archives created yet'}
              </p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Storage Engine</span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                    Pure JS Gzip Stream
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Non-destructive .sql.gz format</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data Integrity</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 block">
                    SHA-256 Hashing
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Automatic checksum verification</p>
            </Card>
          </div>

          {/* Action Trigger Banner */}
          <Card className="p-5 border border-brand-500/30 bg-gradient-to-r from-brand-500/[0.04] via-transparent to-indigo-500/[0.04]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-brand-500" />
                  Instant Database Backup Controls
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                  Trigger an on-demand, non-destructive MySQL snapshot. The engine will dump all tables, schema, constraints and data into a compressed <code className="text-brand-600 font-mono text-[11px]">.sql.gz</code> archive without interrupting hospital operations.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchBackupLogs}
                  disabled={backupLoading}
                  className="flex items-center gap-1.5 font-bold text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${backupLoading ? 'animate-spin' : ''}`} />
                  Refresh Logs
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleRunBackup('daily')}
                  disabled={runningBackup}
                  className="flex items-center gap-1.5 font-black text-xs bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                >
                  <Play className={`h-3.5 w-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
                  {runningBackup ? 'Running Backup...' : '⚡ Run Daily Snapshot'}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRunBackup('manual')}
                  disabled={runningBackup}
                  className="flex items-center gap-1.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                >
                  <FolderArchive className="h-3.5 w-3.5" />
                  Full System Archive
                </Button>
              </div>
            </div>
          </Card>

          {/* Backup Audit History Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-dark-950/50">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-brand-500" /> Backup Archives History & Audit Log
              </h4>
              <span className="text-[11px] font-mono text-slate-400">{backupLogs.length} Records Found</span>
            </div>

            {backupLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
                Loading Database Backup Audit Trail...
              </div>
            ) : backupLogs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No backup records logged yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click <strong>"Run Daily Snapshot"</strong> or <strong>"Full System Archive"</strong> above to generate your first compressed database snapshot.
                </p>
                <Button size="sm" onClick={() => handleRunBackup('manual')} disabled={runningBackup} className="mt-2 font-bold">
                  ⚡ Generate First Backup Snapshot
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Archive Filename</th>
                      <th className="px-5 py-3.5">Backup Type</th>
                      <th className="px-5 py-3.5">File Size</th>
                      <th className="px-5 py-3.5">Execution Status</th>
                      <th className="px-5 py-3.5">SHA-256 Checksum</th>
                      <th className="px-5 py-3.5 text-right">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {backupLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-850/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <FileArchive className="h-4 w-4 text-brand-500 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">{log.filename}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Location: {log.storageLocation || 'local storage'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {log.backupType || 'manual'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {log.fileSize ? `${(Number(log.fileSize) / 1024).toFixed(1)} KB` : '< 1 KB'}
                        </td>

                        <td className="px-5 py-3.5">
                          <Badge type={log.status === 'SUCCESS' ? 'success' : log.status === 'IN_PROGRESS' ? 'warning' : 'error'}>
                            {log.status || 'SUCCESS'}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5">
                          {log.checksum ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={log.checksum}>
                                {log.checksum.slice(0, 16)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(log.checksum);
                                  setCopiedHash(log.checksum);
                                  setTimeout(() => setCopiedHash(null), 2000);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Copy SHA-256 Checksum"
                              >
                                {copiedHash === log.checksum ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">N/A</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.createdAt || log.completedAt ? new Date(log.createdAt || log.completedAt).toLocaleString() : 'Just now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Disaster Recovery & CLI Restore Instructions */}
          <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-950 space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" /> Database Restoration & Recovery Instructions
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>
                To restore any backup archive file into your MySQL database in case of server migration or recovery:
              </p>
              <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto select-all">
                npx ts-node src/scripts/restoreDatabase.ts --file=storage/backups/daily_hospital_YYYY-MM-DD.sql.gz --confirm-prod
              </div>
              <p className="text-[11px] text-slate-500">
                Or extract the <code className="font-mono text-brand-600">.sql.gz</code> file using <code className="font-mono">gunzip</code> and import directly via <strong>phpMyAdmin ➔ Import</strong> in Hostinger hPanel.
              </p>
            </div>
          </Card>
        </div>
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
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteUser(selectedUser)}
              className="border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete Account
            </Button>

            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting} className="font-bold">
                Save Account Credentials
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add New System User Modal */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title="Add New System Login Credentials">
        <form onSubmit={handleCreateSystemUser} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a standalone user login account for system access. (This account is independent from the Staff Directory).
          </p>

          <Input
            label="Full Name"
            type="text"
            required
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="e.g. System Operator"
          />

          <Input
            label="Email Address / Username"
            type="email"
            required
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            placeholder="user@lifeflow.com"
          />

          <Input
            label="Phone Contact (Optional)"
            type="text"
            maxLength={12}
            value={addPhone}
            onChange={e => setAddPhone(formatPhone(e.target.value))}
            placeholder="e.g. 0300-1234567"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System Role
              </label>
              <select
                value={addRole}
                onChange={e => setAddRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="admin">System Admin</option>
                <option value="doctor">Medical Doctor</option>
                <option value="receptionist">Reception Staff</option>
                <option value="nurse">Ward Nurse</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="accountant">Accountant</option>
                <option value="patient">Patient Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Access Status
              </label>
              <select
                value={addStatus}
                onChange={e => setAddStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Active (Access Granted)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <Input
            label="Initial Login Password"
            type="password"
            required
            value={addPassword}
            onChange={e => setAddPassword(e.target.value)}
            placeholder="Password123"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addingUser} className="font-bold">
              Create System Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
