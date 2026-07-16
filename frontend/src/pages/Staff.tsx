import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { UsersRound, Plus, ShieldCheck, Mail, Phone, Briefcase } from 'lucide-react';

export const Staff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123');
  const [role, setRole] = useState('doctor');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [consultationFee, setConsultationFee] = useState(50.00);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const staffList = await apiClient.get('/admin/staff');
      setStaff(staffList);

      const deptList = await apiClient.get('/admin/departments');
      setDepartments(deptList);
      if (deptList.length > 0) {
        setDepartmentId(deptList[0].id.toString());
      }
    } catch (err) {
      console.error('Error loading employee registry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/staff', {
        name,
        email,
        password,
        role,
        phone,
        departmentId: Number(departmentId),
        specialization,
        consultationFee: Number(consultationFee),
      });
      setIsAddOpen(false);
      fetchStaffData();
      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setSpecialization('');
    } catch (err) {
      alert('Error creating staff member credentials.');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (window.confirm(`Are you sure you want to mark this staff account as ${nextStatus}?`)) {
      try {
        await apiClient.put(`/admin/staff/${id}/status`, { status: nextStatus });
        fetchStaffData();
      } catch (err) {
        alert('Failed to update employee status.');
      }
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    doctor: 'Medical Doctor',
    receptionist: 'Reception Staff',
    nurse: 'Ward Nurse',
    lab_technician: 'Laboratory Tech',
    pharmacist: 'Pharmacist',
    accountant: 'Accountant',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Staff Employee Registry</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage clinical teams, update department listings, and assign roles.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
          <Plus className="h-4 w-4" /> Add Staff Member
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No staff registered.</p>
        </Card>
      ) : (
        /* Staff Grid Table */
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Clinical Assignments</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right font-semibold">Credentials Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {staff.map(s => (
                <tr key={s.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                    {s.name}
                    <span className="block text-[10px] text-slate-550 lowercase font-mono font-normal mt-0.5">{s.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {roleLabels[s.role] || s.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.role === 'doctor' && s.doctor ? (
                      <>
                        <span className="font-bold">{s.doctor.specialization}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">Dept: {s.doctor.department?.name} • Fee: ${Number(s.doctor.consultationFee).toFixed(2)}</span>
                      </>
                    ) : s.role === 'nurse' && s.nurse ? (
                      <span className="font-semibold">Dept: {s.nurse.department?.name || 'General Wards'}</span>
                    ) : (
                      <span className="text-slate-450 italic">Non-clinical Administration</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge type={s.status === 'active' ? 'success' : 'neutral'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(s.id, s.status)}
                      className={`inline-flex items-center gap-1 p-1 px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        s.status === 'active'
                          ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-650 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                          : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
                      }`}
                    >
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Employee Credentials">
        <form onSubmit={handleCreateStaff} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Full Name" required value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Mark Spencer" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="mspencer@lifeflow.com" />
            <Input label="Login Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">System Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="doctor">Medical Doctor</option>
                <option value="nurse">Ward Nurse</option>
                <option value="receptionist">Receptionist</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="lab_technician">Laboratory Technician</option>
                <option value="accountant">Accountant</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <Input label="Phone Contact" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-0123" />
          </div>

          {/* Doctor-specific fields */}
          {role === 'doctor' && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-xl border border-slate-200/50 dark:border-slate-850 space-y-3.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block">Physician Details</span>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Department</label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-850 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Clinical Specialization" required value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="Cardiology" className="!py-1.5 text-xs" />
                <Input label="Consultation Fee ($)" type="number" required value={consultationFee} onChange={e => setConsultationFee(Number(e.target.value))} className="!py-1.5 text-xs" />
              </div>
            </div>
          )}

          {/* Nurse-specific fields */}
          {role === 'nurse' && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-xl border border-slate-200/50 dark:border-slate-850 space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block">Nurse Details</span>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Assigned Department</label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-850 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Staff Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
