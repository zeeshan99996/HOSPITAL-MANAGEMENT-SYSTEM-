import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Sun, Moon, Bell, Search, HeartPulse, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  // Simple Breadcrumbs calculation
  const path = location.pathname.split('/').filter(Boolean);
  const title = path.length > 0 ? path[0].charAt(0).toUpperCase() + path[0].slice(1) : 'Dashboard';

  // Seed mock notifications
  const alerts = [
    { id: 1, title: 'Low Inventory Alert', desc: 'Lisinopril 10mg is below 10 units.', type: 'warning' },
    { id: 2, title: 'Lab Result Ready', desc: 'Lipid profile for Bob Jackson completed.', type: 'success' },
    { id: 3, title: 'New Appointment booked', desc: 'Alice Brown booked Cardiology Consultation.', type: 'info' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 bg-white/70 dark:bg-dark-900/60 backdrop-blur-md px-6">
      {/* Mobile Toggle & Path Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</span>
          <span className="hidden sm:inline mx-2 text-slate-400 text-xs">/</span>
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">Hospital Management</span>
        </div>
      </div>

      {/* Action panel (Search, Theme, Alerts, User Profile) */}
      <div className="flex items-center gap-3">
        {/* Mock Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, invoices..."
            className="w-64 rounded-lg border border-slate-250 dark:border-slate-800/80 bg-slate-50 dark:bg-dark-950/50 py-1.5 pl-9 pr-4 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications Panel */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Notifications</h3>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex gap-2.5 border-b border-slate-100 dark:border-slate-950 pb-2.5 last:border-b-0 last:pb-0">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      alert.type === 'warning' ? 'bg-amber-500' : alert.type === 'success' ? 'bg-emerald-500' : 'bg-brand-500'
                    }`} />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-150">{alert.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs select-none shadow-sm shadow-brand-500/25">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2.5 border-b border-slate-105 dark:border-slate-850">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  setShowProfile(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg mt-1.5 transition-colors"
              >
                Logout Session
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
