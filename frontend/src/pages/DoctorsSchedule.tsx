import React, { useEffect, useState } from 'react';
import { Card, Input, Badge } from '../components/UI';
import { Search, Calendar, UserCheck, Stethoscope, DoorOpen } from 'lucide-react';
import { apiClient } from '../services/api';

export const DoctorsSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/doctors/schedule');
      setSchedules(data);
      
      const depts = await apiClient.get('/admin/departments');
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const filtered = schedules.filter(sch => {
    const nameMatch = sch.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    const deptMatch = !deptFilter || sch.department === deptFilter;
    return nameMatch && deptMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-brand-500" /> Physician Rota & Schedules
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review active doctor OPD availability, leaves, and consultation room numbers.</p>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-3.5 bg-white dark:bg-dark-900 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-sm">
        <div className="relative flex-1">
          <Input
            placeholder="Search by physician name..."
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
        <div className="text-center text-xs text-slate-450 p-10">Syncing doctor rotas...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-xs text-slate-450 p-10 bg-white dark:bg-dark-900 rounded-xl border border-dashed border-slate-250">No physicians match the filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(sch => (
            <Card key={sch.id} className="p-5 border border-slate-200/60 dark:border-slate-850 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="h-10 w-10 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center font-bold">
                    {sch.doctorName.charAt(4).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100">{sch.doctorName}</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-semibold uppercase">{sch.department}</p>
                  </div>
                </div>
                <Badge type={sch.leaveStatus === 'active' ? 'success' : 'error'}>
                  {sch.leaveStatus === 'active' ? 'ON DUTY' : 'LEAVE'}
                </Badge>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850/60 space-y-2.5 text-2xs text-slate-500 dark:text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span>OPD Room: <strong className="text-slate-850 dark:text-slate-200">{sch.roomNumber}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Time slots: <strong className="text-slate-850 dark:text-slate-200">{sch.availableTime}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span>Current Activity: 
                    <strong className={`ml-1 ${
                      sch.currentStatus === 'available' ? 'text-emerald-500' :
                      sch.currentStatus === 'in_consultation' ? 'text-brand-500' : 'text-amber-500'
                    }`}>
                      {sch.currentStatus.replace('_', ' ').toUpperCase()}
                    </strong>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
