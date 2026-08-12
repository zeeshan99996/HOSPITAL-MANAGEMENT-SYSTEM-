import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { DesignationSelect } from '../components/DesignationSelect';
import { UsersRound, Plus, ShieldCheck, Mail, Phone, Briefcase, CreditCard, MapPin, DollarSign, UserCheck, AlertCircle, Trash2, Edit3, Settings, Check, X, Stethoscope, SlidersHorizontal } from 'lucide-react';

interface DesignationItem {
  title: string;
  isDoctor: boolean;
}

const DEFAULT_DESIGNATION_ITEMS: DesignationItem[] = [
  { title: 'Senior Consultant Doctor', isDoctor: true },
  { title: 'Consultant Physician', isDoctor: true },
  { title: 'General Medical Officer (Dr.)', isDoctor: true },
  { title: 'Surgeon Specialist', isDoctor: true },
  { title: 'Head Nurse', isDoctor: false },
  { title: 'Staff Nurse (Ward)', isDoctor: false },
  { title: 'Receptionist / Front Desk Officer', isDoctor: false },
  { title: 'Pharmacist / Store Manager', isDoctor: false },
  { title: 'Pharmacy Assistant', isDoctor: false },
  { title: 'Accountant / Billing Manager', isDoctor: false },
  { title: 'Lab Technician / Pathologist', isDoctor: false },
  { title: 'Security Officer / Gate Supervisor', isDoctor: false },
  { title: 'IT & System Administrator', isDoctor: false },
  { title: 'Housekeeping & Janitorial Staff', isDoctor: false },
  { title: 'Ambulance Driver / Logistics', isDoctor: false },
];

export const Staff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State for Admin-only Staff Registration
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123');
  const [role, setRole] = useState('doctor');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  
  // Dynamic Designations State & Management (Title + IsDoctor mapping)
  const [designationItems, setDesignationItems] = useState<DesignationItem[]>(() => {
    const saved = localStorage.getItem('hms_staff_designation_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_DESIGNATION_ITEMS;
  });
  const [selectedDesignation, setSelectedDesignation] = useState<string>('Senior Consultant Doctor');
  const [customDesignation, setCustomDesignation] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [designation, setDesignation] = useState<string>('Senior Consultant Doctor');

  // Designation Manager Modal State
  const [isManageDesignationsOpen, setIsManageDesignationsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [newDesignationInput, setNewDesignationInput] = useState<string>('');
  const [newIsDoctorCheck, setNewIsDoctorCheck] = useState<boolean>(false);

  const saveDesignationItems = (items: DesignationItem[]) => {
    setDesignationItems(items);
    localStorage.setItem('hms_staff_designation_items', JSON.stringify(items));
  };

  const handleSaveDesignationEdit = (index: number) => {
    if (!editingText.trim()) return;
    const updated = [...designationItems];
    const oldTitle = updated[index].title;
    const trimmed = editingText.trim();
    updated[index].title = trimmed;
    saveDesignationItems(updated);
    if (selectedDesignation === oldTitle) {
      setSelectedDesignation(trimmed);
      setDesignation(trimmed);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const handleToggleDoctorAssignment = (index: number) => {
    const updated = [...designationItems];
    updated[index].isDoctor = !updated[index].isDoctor;
    saveDesignationItems(updated);
  };

  const handleDeleteDesignation = (index: number) => {
    const itemToDelete = designationItems[index].title;
    if (window.confirm(`Delete designation '${itemToDelete}' from dropdown list?`)) {
      const updated = designationItems.filter((_, idx) => idx !== index);
      saveDesignationItems(updated);
      if (selectedDesignation === itemToDelete) {
        const nextSelected = updated[0]?.title || '';
        setSelectedDesignation(nextSelected);
        setDesignation(nextSelected);
      }
    }
  };

  const handleAddNewDesignation = () => {
    if (!newDesignationInput.trim()) return;
    const trimmed = newDesignationInput.trim();
    if (!designationItems.some(item => item.title === trimmed)) {
      const updated = [...designationItems, { title: trimmed, isDoctor: newIsDoctorCheck }];
      saveDesignationItems(updated);
    }
    setNewDesignationInput('');
    setNewIsDoctorCheck(false);
    setSelectedDesignation(trimmed);
    setDesignation(trimmed);
    setIsCustomMode(false);
  };

  const handleResetDefaultDesignations = () => {
    if (window.confirm('Reset designations list back to system defaults?')) {
      setDesignationItems(DEFAULT_DESIGNATION_ITEMS);
      localStorage.removeItem('hms_staff_designation_items');
      setSelectedDesignation(DEFAULT_DESIGNATION_ITEMS[0].title);
      setDesignation(DEFAULT_DESIGNATION_ITEMS[0].title);
    }
  };

  const checkIsDoctor = (titleStr: string) => {
    const found = designationItems.find(item => item.title === titleStr);
    if (found) return found.isDoctor;
    const d = (titleStr || '').toLowerCase();
    return d.includes('doctor') || d.includes('dr') || d.includes('physician') || d.includes('surgeon') || d.includes('consultant');
  };

  const [salary, setSalary] = useState<number | string>(50000);
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [consultationFee, setConsultationFee] = useState<number | string>(500);

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
        role,
        phone,
        cnic,
        address,
        designation: designation || role,
        salary: Number(salary) || 0,
        departmentId: Number(departmentId) || 1,
        specialization: specialization || designation || 'General OPD',
        consultationFee: Number(consultationFee) || 500,
      });
      setIsAddOpen(false);
      fetchStaffData();
      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setCnic('');
      setAddress('');
      setDesignation('');
      setSalary(50000);
      setSpecialization('');
      alert(`Staff member '${name}' registered successfully!`);
    } catch (err: any) {
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const details = err.response.data.errors.map((e: any) => `• ${e.message}`).join('\n');
        alert(`Validation Error:\n\n${details}`);
      } else if (err?.errors && Array.isArray(err.errors)) {
        const details = err.errors.map((e: any) => `• ${e.message}`).join('\n');
        alert(`Validation Error:\n\n${details}`);
      } else {
        alert(err.message || 'Error creating staff member.');
      }
    }
  };

  const isDoctorDesignation = (desTitle: string) => {
    const d = (desTitle || '').toLowerCase();
    return d.includes('doctor') || d.includes('dr') || d.includes('physician') || d.includes('surgeon') || d.includes('consultant');
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

  const handleDeleteStaff = async (staffMember: any) => {
    if (!staffMember) return;
    if (window.confirm(`Are you sure you want to permanently delete employee profile '${staffMember.name}' (${staffMember.email})?\n\nThis will delete their record from the system.`)) {
      try {
        await apiClient.delete(`/admin/users/${staffMember.id}`);
        fetchStaffData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete staff member.');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Admin Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/20 border border-brand-400/30 text-brand-400 shadow-inner">
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              Admin Exclusive Access Only
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">Hospital Staff Directory & Payroll Profiles</h2>
            <p className="text-xs text-slate-300 mt-0.5">Manage employee details including CNIC, Address, Designation, and Monthly Basic Salary.</p>
          </div>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 self-start sm:self-center font-bold">
          <Plus className="h-4 w-4" /> Add New Staff Member
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
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No staff members registered yet.</p>
        </Card>
      ) : (
        /* Staff Grid Table */
        <Card className="overflow-x-auto p-0 rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <th className="px-6 py-3.5">Employee Details</th>
                <th className="px-6 py-3.5">Designation</th>
                <th className="px-6 py-3.5">CNIC & Contact</th>
                <th className="px-6 py-3.5">Address</th>
                <th className="px-6 py-3.5">Basic Salary</th>
                <th className="px-6 py-3.5 text-right font-semibold">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {staff
                .filter(s => s.role !== 'lab_technician' && s.email !== 'lab@lifeflow.com' && s.user?.role !== 'lab_technician' && s.user?.email !== 'lab@lifeflow.com')
                .map(s => (
                <tr key={s.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-dark-850/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-800 shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">{s.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{s.designation || 'Staff Employee'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{s.cnic || 'N/A'}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {s.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{s.address || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      Rs. {Number(s.salary || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">Monthly Base</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(s.id, s.status)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          s.status === 'active'
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
                        }`}
                      >
                        {s.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(s)}
                        title="Delete Employee Record"
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Register Staff Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Staff Profile (Admin Only)">
        <form onSubmit={handleCreateStaff} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Full Name */}
          <Input label="Staff Full Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Muhammad Salman" />

          {/* CNIC & Phone Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="CNIC Number" required value={cnic} onChange={e => setCnic(e.target.value)} placeholder="e.g. 42101-1234567-1" />
            <Input label="Phone Contact" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0300-1234567" />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="House #, Street, City" />
          </div>

          {/* Designation & Monthly Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <DesignationSelect
              items={designationItems}
              value={selectedDesignation}
              onChange={(title, isDoc) => {
                setSelectedDesignation(title);
                setDesignation(title);
              }}
              isCustomMode={isCustomMode}
              setIsCustomMode={setIsCustomMode}
              customValue={customDesignation}
              setCustomValue={(val) => {
                setCustomDesignation(val);
                setDesignation(val);
              }}
              onOpenManageModal={() => setIsManageDesignationsOpen(true)}
            />

            <Input label="Monthly Basic Salary (Rs.)" type="number" required value={salary} onChange={e => setSalary(e.target.value)} placeholder="50000" />
          </div>

          {/* Doctor-specific fields */}
          {checkIsDoctor(designation) && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Doctor Assignments</span>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Department</label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-850 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100"
                >
                  {departments.length > 0 ? (
                    departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  ) : (
                    <option value="1">General OPD Department</option>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Clinical Specialization" required value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="Cardiology" className="!py-1.5 text-xs" />
                <Input label="Consultation Fee (Rs.)" type="number" required value={consultationFee} onChange={e => setConsultationFee(e.target.value)} className="!py-1.5 text-xs" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="font-bold">Save Staff Profile</Button>
          </div>
        </form>
      </Modal>

      {/* Admin Designations Manager Modal */}
      <Modal isOpen={isManageDesignationsOpen} onClose={() => setIsManageDesignationsOpen(false)} title="Manage Staff Designations List (Admin)">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add, rename, or remove employee designations and assign Doctor Fields (Department, Specialization, Fee) per designation.
          </p>

          {/* Add New Designation (Professional UI/UX) */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-dark-950 dark:to-dark-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Add New Job Title / Designation
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Custom Employee Title</span>
            </div>

            <Input
              placeholder="e.g. Senior Consultant Radiologist / ICU Specialist..."
              value={newDesignationInput}
              onChange={e => setNewDesignationInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewDesignation(); } }}
              className="text-xs w-full shadow-inner"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-dark-850 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={newIsDoctorCheck}
                  onChange={e => setNewIsDoctorCheck(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>Assign Doctor Fields (Department, Specialization & Fee)</span>
              </label>

              <Button type="button" onClick={handleAddNewDesignation} className="w-full sm:w-auto font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shrink-0">
                <Plus className="h-4 w-4" /> Add Title
              </Button>
            </div>
          </div>

          {/* Designations List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {designationItems.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white dark:bg-dark-900 hover:bg-slate-50/80 dark:hover:bg-dark-850/60 transition-colors gap-2 text-xs">
                {editingIndex === idx ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      className="!py-1 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDesignationEdit(idx)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleDoctorAssignment(idx)}
                        title="Click to toggle Doctor vs Staff role behavior"
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all flex items-center gap-1 ${
                          item.isDoctor
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {item.isDoctor ? (
                          <>
                            <Stethoscope className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Doctor Role</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 text-slate-500" />
                            <span>Staff Role</span>
                          </>
                        )}
                      </button>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => { setEditingIndex(idx); setEditingText(item.title); }}
                        className="px-2.5 py-1 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-lg text-xs font-bold border border-brand-200 dark:border-brand-900/50 transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDesignation(idx)}
                        className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Reset Defaults & Close */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={handleResetDefaultDesignations}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline font-semibold"
            >
              ↺ Reset to System Defaults
            </button>
            <Button type="button" variant="primary" onClick={() => setIsManageDesignationsOpen(false)} className="text-xs font-bold">
              Done Editing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
