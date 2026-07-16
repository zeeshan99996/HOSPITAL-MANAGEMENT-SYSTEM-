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
  Pill,
  Receipt,
  UsersRound,
  FileCode2,
  Settings,
  LogOut,
  HeartPulse,
  UserPlus,
  Ticket,
  Stethoscope,
  FileText,
  User
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  if (!user) return null;

  // Define sidebar navigation items and their role access list (removed patient and nurse)
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist', 'accountant'],
    },
    {
      name: 'Patient Registration',
      path: '/patient-registration',
      icon: UserPlus,
      roles: ['admin', 'receptionist'],
    },
    {
      name: 'Patients',
      path: '/patients',
      icon: Users,
      roles: ['admin', 'doctor', 'receptionist', 'accountant'],
    },
    {
      name: 'Appointments',
      path: '/appointments',
      icon: Calendar,
      roles: ['admin', 'doctor', 'receptionist'],
    },
    {
      name: 'Token Queue',
      path: '/token-queue',
      icon: Ticket,
      roles: ['admin', 'receptionist'],
    },
    {
      name: 'Doctors Schedule',
      path: '/doctors-schedule',
      icon: Stethoscope,
      roles: ['admin', 'doctor', 'receptionist'],
    },
    {
      name: 'Bed Admissions',
      path: '/admissions',
      icon: BedDouble,
      roles: ['admin', 'doctor'],
    },
    {
      name: 'Laboratory Tests',
      path: '/laboratory',
      icon: Beaker,
      roles: ['admin', 'doctor', 'lab_technician'],
    },
    {
      name: 'Pharmacy & Stock',
      path: '/pharmacy',
      icon: Pill,
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      name: 'Billing & Invoices',
      path: '/billing',
      icon: Receipt,
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
      roles: ['admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist', 'accountant'],
    },
    {
      name: 'Staff Registry',
      path: '/staff',
      icon: UsersRound,
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

  // If receptionist, filter to exactly show Receptionist Portal specs (dashboard, registration, patients, appointments, queue, schedules, billing, reports, profile, logout)
  const isReceptionist = user.role === 'receptionist';
  const filteredItems = menuItems.filter(item => {
    if (isReceptionist) {
      // Limit receptionist to: Dashboard, Patient Registration, Patients, Appointments, Token Queue, Doctors Schedule, Billing, Reports, Profile
      const allowedPaths = [
        '/dashboard',
        '/patient-registration',
        '/patients',
        '/appointments',
        '/token-queue',
        '/doctors-schedule',
        '/billing',
        '/reports',
        '/profile'
      ];
      return allowedPaths.includes(item.path);
    }
    return item.roles.includes(user.role);
  });

  const roleLabels: Record<string, string> = {
    admin: 'System Admin',
    doctor: 'Medical Doctor',
    receptionist: 'Reception Staff',
    lab_technician: 'Lab Tech',
    pharmacist: 'Pharmacist',
    accountant: 'Accountant',
  };

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
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-brand-500 text-white animate-pulse">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">LifeFlow</span>
            <span className="text-[10px] block font-medium uppercase tracking-wider text-brand-500 -mt-1 font-semibold">Hospital EMR</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-slate-50 dark:bg-dark-950/40 border border-slate-150/40 dark:border-slate-850 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm select-none border border-brand-200/30">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-slate-950 dark:text-slate-100 truncate">{user.name}</h4>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate uppercase">{roleLabels[user.role] || user.role}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          {filteredItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-850">
          <button
            onClick={() => setShowConfirmLogout(true)}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout Session
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
