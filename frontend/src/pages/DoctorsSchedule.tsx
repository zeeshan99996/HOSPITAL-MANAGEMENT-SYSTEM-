import React, { useEffect, useState } from 'react';
import { Card, Input, Button, Modal, Drawer, Badge } from '../components/UI';
import { Search, Calendar, UserCheck, Stethoscope, DoorOpen, Plus, Edit, Trash2, User, Phone, Mail, DollarSign, FileText } from 'lucide-react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DoctorsSchedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);

  // Modals / Drawers controls
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Form states - Add Doctor
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Doctor123');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('General Practitioner');
  const [consultationFee, setConsultationFee] = useState('1500');
  const [biography, setBiography] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schData, depts, rawDocs] = await Promise.all([
        apiClient.get('/doctors/schedule'),
        apiClient.get('/admin/departments'),
        apiClient.get('/doctors')
      ]);
      setSchedules(schData || []);
      setDepartments(depts || []);
      setDoctorsList(rawDocs || []);
    } catch (err) {
      console.error('Failed to load doctor schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/staff', {
        name,
        email,
        phone,
        password,
        role: 'doctor',
        departmentId: Number(departmentId) || 1,
        specialization,
        consultationFee: Number(consultationFee) || 1500,
        biography
      });
      setIsAddOpen(false);
      fetchData();

      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setDepartmentId('');
      setSpecialization('General Practitioner');
      setConsultationFee('1500');
      setBiography('');
      alert('New doctor profile added successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create doctor profile.');
    }
  };

  const handleEditClick = (docObj: any) => {
    setSelectedDoctor(docObj);
    setName(docObj.doctorName || docObj.user?.name || '');
    setEmail(docObj.user?.email || '');
    setPhone(docObj.user?.phone || '');
    setSpecialization(docObj.specialization || 'General Practitioner');
    setConsultationFee(docObj.consultationFee ? String(docObj.consultationFee) : '1500');
    setBiography(docObj.biography || '');
    setStatus(docObj.status || docObj.leaveStatus || 'active');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    try {
      await apiClient.put(`/doctors/${selectedDoctor.id}`, {
        name,
        email,
        phone,
        specialization,
        departmentId: departmentId ? Number(departmentId) : undefined,
        consultationFee: Number(consultationFee),
        biography,
        status
      });
      setIsEditOpen(false);
      fetchData();
      alert('Doctor profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update doctor profile.');
    }
  };

  const handleDeactivate = async (docId: number) => {
    if (window.confirm('Are you sure you want to deactivate/remove this doctor profile?')) {
      try {
        await apiClient.delete(`/doctors/${docId}`);
        fetchData();
        alert('Doctor profile deactivated successfully.');
      } catch (err: any) {
        alert('Failed to deactivate doctor.');
      }
    }
  };

  const filtered = schedules.filter(sch => {
    const nameMatch = sch.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    const deptMatch = !deptFilter || sch.department === deptFilter;
    return nameMatch && deptMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-brand-500" /> Medical Doctors & Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage physician profiles, consultation fees, OPD availability, and rotas.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Add New Doctor
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-3.5 bg-white dark:bg-dark-900 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-sm">
        <div className="relative flex-1">
          <Input
            placeholder="Search by physician name or specialization..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 !py-2"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </div>
        <div className="min-w-[180px]">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
          >
            <option value="">-- All Departments --</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Doctor Cards */}
      {loading ? (
        <div className="text-center text-xs text-slate-450 p-10">Syncing doctor rotas & profiles...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-xs text-slate-450 p-10 bg-white dark:bg-dark-900 rounded-xl border border-dashed border-slate-250">No physicians match the filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(sch => {
            const rawDoc = doctorsList.find(d => d.id === sch.id || d.user?.name === sch.doctorName);
            return (
              <Card key={sch.id} className="p-5 border border-slate-200/60 dark:border-slate-850 hover:shadow-md transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center font-extrabold text-base select-none shadow-sm">
                      {sch.doctorName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4
                        onClick={() => {
                          setSelectedDoctor({ ...sch, ...rawDoc });
                          setIsProfileOpen(true);
                        }}
                        className="text-xs font-bold text-slate-950 dark:text-slate-100 hover:text-brand-500 cursor-pointer transition-colors"
                      >
                        {sch.doctorName}
                      </h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-semibold uppercase">{sch.department}</p>
                    </div>
                  </div>
                  <Badge type={sch.leaveStatus === 'active' ? 'success' : 'error'}>
                    {sch.leaveStatus === 'active' ? 'ON DUTY' : 'LEAVE'}
                  </Badge>
                </div>

                <div className="pt-2 space-y-2 text-2xs text-slate-500 dark:text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-850/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><DoorOpen className="h-3.5 w-3.5 text-slate-400" /> OPD Room:</span>
                    <strong className="text-slate-850 dark:text-slate-200">{sch.roomNumber}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Hours:</span>
                    <strong className="text-slate-850 dark:text-slate-200">{sch.availableTime}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-slate-400" /> Consultation Fee:</span>
                    <strong className="text-brand-600 dark:text-brand-400">Rs. {rawDoc?.consultationFee || 1500}</strong>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <button
                      onClick={() => handleEditClick({ ...sch, ...rawDoc })}
                      className="p-1.5 px-2.5 bg-slate-100 dark:bg-dark-950 text-slate-655 dark:text-slate-350 hover:bg-brand-500 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(sch.id)}
                      className="p-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Deactivate
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Doctor Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Medical Doctor Profile">
        <form onSubmit={handleAddSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Doctor Full Name" required placeholder="e.g. Dr. Jane Smith" value={name} onChange={e => setName(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Department</label>
              <select
                required
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Select Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" type="email" required placeholder="doctor@drtalhaclinic.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Mobile Phone" required placeholder="0311-1234567" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Specialization / Qualification" required placeholder="e.g. Consultant Cardiologist (MBBS, FCPS)" value={specialization} onChange={e => setSpecialization(e.target.value)} />
            <Input label="Consultation Fee (Rs.)" required type="number" placeholder="1500" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Doctor Biography & Clinical Experience</label>
            <textarea
              rows={3}
              placeholder="e.g. 10+ years experience in interventional cardiology and cardiovascular care."
              value={biography}
              onChange={e => setBiography(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Doctor Profile</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Doctor Credentials & Profile">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Doctor Full Name" required value={name} onChange={e => setName(e.target.value)} />
            <Input label="Specialization" required value={specialization} onChange={e => setSpecialization(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Consultation Fee (Rs.)" required type="number" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Account Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="active">Active / On Duty</option>
                <option value="inactive">Inactive / Deactivated</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Biography</label>
            <textarea
              rows={3}
              value={biography}
              onChange={e => setBiography(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Doctor Profile Drawer */}
      <Drawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Physician Profile Details">
        {selectedDoctor && (
          <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-4 bg-brand-500/10 p-4 rounded-xl border border-brand-500/20">
              <div className="h-14 w-14 rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
                {(selectedDoctor.doctorName || selectedDoctor.user?.name || 'D').replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedDoctor.doctorName || selectedDoctor.user?.name}</h3>
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">{selectedDoctor.specialization || 'Consultant Physician'}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">{selectedDoctor.department}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-2xs font-extrabold text-slate-450 uppercase tracking-widest">Contact & OPD Information</h4>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {selectedDoctor.user?.email || 'N/A'}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {selectedDoctor.user?.phone || 'N/A'}</div>
                <div className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-slate-400" /> Room: {selectedDoctor.roomNumber || 'OPD Desk'}</div>
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-slate-400" /> Fee: Rs. {selectedDoctor.consultationFee || 1500}</div>
              </div>
            </div>

            {selectedDoctor.biography && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <h4 className="text-2xs font-extrabold text-slate-450 uppercase tracking-widest">Clinical Biography</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">{selectedDoctor.biography}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
