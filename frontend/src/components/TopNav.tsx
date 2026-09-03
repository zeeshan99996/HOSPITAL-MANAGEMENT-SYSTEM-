import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Sun, Moon, Bell, Search, HeartPulse, User, LogOut, CheckCircle2, RefreshCw, X, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

interface TopNavProps {
  onMenuClick: () => void;
}

interface RealtimeAlert {
  id: string;
  title: string;
  desc: string;
  type: 'warning' | 'success' | 'info' | 'error';
  link?: string;
  createdAt: string;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hms_dismissed_alert_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Fetch real-time live notifications from database
  const fetchLiveNotifications = async () => {
    try {
      setLoadingAlerts(true);
      const res: any = await apiClient.get('/notifications');
      if (res && Array.isArray(res.alerts)) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.warn('Real-time alerts fetch error:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
    // Live polling every 30 seconds for immediate real-time notifications
    const interval = setInterval(fetchLiveNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Simple Breadcrumbs calculation
  const path = location.pathname.split('/').filter(Boolean);
  const title = path.length > 0 ? path[0].charAt(0).toUpperCase() + path[0].slice(1) : 'Dashboard';

  const unreadAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  const hasUnread = unreadAlerts.length > 0;

  const handleDismissAll = () => {
    const updated = new Set([...dismissedIds, ...alerts.map(a => a.id)]);
    setDismissedIds(updated);
    try {
      localStorage.setItem('hms_dismissed_alert_ids', JSON.stringify(Array.from(updated)));
    } catch {
      // ignore
    }
  };

  const handleAlertClick = (alert: RealtimeAlert) => {
    const updated = new Set(dismissedIds);
    updated.add(alert.id);
    setDismissedIds(updated);
    try {
      localStorage.setItem('hms_dismissed_alert_ids', JSON.stringify(Array.from(updated)));
    } catch {
      // ignore
    }

    setShowNotifications(false);
    if (alert.link) {
      navigate(alert.link);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 bg-white/70 dark:bg-dark-900/60 backdrop-blur-md px-6">
      {/* Mobile Toggle & Path Title */}
      <div className="flex items-center gap-4">
        {user.role !== 'doctor' && user.role !== 'pharmacist' && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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

        {/* Real-time Notifications Panel */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
              if (!showNotifications) {
                fetchLiveNotifications();
              }
            }}
            className="relative rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            title="Real-time System Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {hasUnread && (
              <>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-sm">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              </>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Real-time Notifications
                  </h3>
                  {hasUnread && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                      {unreadAlerts.length} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={fetchLiveNotifications}
                    disabled={loadingAlerts}
                    title="Refresh Notifications"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingAlerts ? 'animate-spin text-brand-500' : ''}`} />
                  </button>

                  {hasUnread && (
                    <button
                      onClick={handleDismissAll}
                      className="text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-md hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {unreadAlerts.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No New Notifications</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        All patient queues, diagnostic lab requests, and pharmacy inventory are up to date.
                      </p>
                    </div>
                  </div>
                ) : (
                  unreadAlerts.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className="group p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-dark-950/40 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 hover:border-brand-500/30 transition-all cursor-pointer flex gap-3 items-start"
                    >
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                        alert.type === 'warning' 
                          ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
                          : alert.type === 'success' 
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                          : 'bg-brand-500 shadow-sm shadow-brand-500/50'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {alert.title}
                          </h4>
                          {alert.link && (
                            <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {alert.desc}
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout for Doctor or User Dropdown */}
        {user.role === 'doctor' && (
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all"
            title="Logout Doctor Session"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        )}

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
