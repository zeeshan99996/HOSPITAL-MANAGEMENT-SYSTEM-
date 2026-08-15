import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal, Button } from './UI';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BedDouble,
  Beaker,
  Receipt,
  UsersRound,
  FileCode2,
  Settings,
  LogOut,
  HeartPulse,
  UserPlus,
  UserCheck,
  Ticket,
  FileText,
  User,
  ShieldCheck,
  Pill,
  Coffee,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  if (!user) return null;

  // Define sidebar navigation items and their role access list
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'receptionist', 'accountant'],
    },
    {
      name: 'Clinical Templates',
      path: '/clinical-templates',
      icon: ClipboardList,
      roles: ['admin', 'doctor'],
    },
    {
      name: 'Patient Registration',
      path: '/patient-registration',
      icon: UserPlus,
      roles: ['admin', 'receptionist'],
    },
    {
      name: 'Old Patient Intake',
      path: '/old-patient',
      icon: UserCheck,
      roles: ['admin', 'receptionist'],
    },
    {
      name: 'Patients',
      path: '/patients',
      icon: Users,
      roles: ['admin', 'doctor', 'receptionist', 'accountant', 'nurse'],
    },
    {
      name: 'Token Queue',
      path: '/token-queue',
      icon: Ticket,
      roles: ['admin', 'receptionist'],
    },
    {
      name: 'Bed Admissions',
      path: '/admissions',
      icon: BedDouble,
      roles: ['admin', 'doctor', 'receptionist', 'nurse'],
    },
    {
      name: 'Laboratory Tests',
      path: '/laboratory',
      icon: Beaker,
      roles: ['admin', 'doctor', 'receptionist'],
    },
    {
      name: 'Pharmacy Dispensary',
      path: '/pharmacy',
      icon: Pill,
      roles: ['admin', 'pharmacist', 'nurse'],
    },
    {
      name: 'Billing & Invoices',
      path: '/billing',
      icon: Receipt,
      roles: ['admin', 'receptionist', 'accountant'],
    },
    {
      name: 'Clinic Expenses',
      path: '/expenses',
      icon: Coffee,
      roles: ['admin', 'receptionist', 'accountant'],
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: FileText,
      roles: ['admin', 'receptionist', 'accountant'],
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: User,
      roles: ['admin', 'accountant'],
    },
    {
      name: 'Staff Registry',
      path: '/staff',
      icon: UsersRound,
      roles: ['admin'],
    },
    {
      name: 'Security & Access',
      path: '/security',
      icon: ShieldCheck,
      roles: ['admin'],
    },
    {
      name: 'Activity Audit',
      path: '/logs',
      icon: FileCode2,
      roles: ['admin'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  // Role based filtering logic
  const isDoctor = user.role === 'doctor';
  const isPharmacist = user.role === 'pharmacist';
  const isReceptionist = user.role === 'receptionist';
  const isAccountant = user.role === 'accountant';
  const filteredItems = menuItems.filter(item => {
    if (isDoctor) {
      const allowedPaths = [
        '/dashboard',
        '/clinical-templates'
      ];
      return allowedPaths.includes(item.path);
    }
    if (isPharmacist) {
      return item.path === '/pharmacy';
    }
    if (isAccountant) {
      return item.path === '/billing' || item.path === '/expenses';
    }
    if (isReceptionist) {
      const allowedPaths = [
        '/dashboard',
        '/patient-registration',
        '/patients',
        '/appointments',
        '/token-queue',
        '/doctors-schedule',
        '/billing',
        '/reports'
      ];
      return allowedPaths.includes(item.path);
    }
    return item.roles.includes(user.role);
  });

  const roleLabels: Record<string, string> = {
    admin: 'System Admin',
    doctor: 'Medical Doctor',
    receptionist: 'Reception Staff',
    pharmacist: 'Pharmacist',
    accountant: 'Accountant',
    nurse: 'Staff Nurse'
  };

  // Hide left sidebar completely for Pharmacist role (dispensary terminal mode)
  if (user?.role === 'pharmacist') {
    return null;
  }

  return (
    <>
      {/* Mobile Sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Frame */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-dark-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden shadow-sm border border-brand-500/20 bg-white dark:bg-dark-950 p-0.5 shrink-0">
            <img src="/logo.png" alt="Dr. Talha Clinic Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate block">Dr. Talha Clinic</span>
            <span className="text-[10px] block font-bold uppercase tracking-wider text-brand-500 -mt-0.5">Clinical EMR & HMS</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3.5 my-3.5 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-dark-950/80 dark:to-dark-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm select-none shadow-sm shadow-brand-500/20 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{user.name}</h4>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3.5 overflow-y-auto">
          {filteredItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-950 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setShowConfirmLogout(true)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Secure Logout Confirmation Dialog */}
      <Modal isOpen={showConfirmLogout} onClose={() => setShowConfirmLogout(false)} title="Confirm Session Logout">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to log out? Your active EMR session will be terminated, requiring credentials for re-entry.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-150 dark:border-slate-850">
            <Button type="button" variant="secondary" onClick={() => setShowConfirmLogout(false)}>Cancel</Button>
            <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={() => {
              setShowConfirmLogout(false);
              logout();
              setIsOpen(false);
            }}>Confirm Logout</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
