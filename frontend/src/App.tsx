import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Login } from './pages/Login';
import { AIChatbotWidget } from './components/AIChatbotWidget';

// Lazy-loaded page components for Code Splitting & Performance Optimization
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration').then(m => ({ default: m.PatientRegistration })));
const OldPatient = lazy(() => import('./pages/OldPatient').then(m => ({ default: m.OldPatient })));
const Patients = lazy(() => import('./pages/Patients').then(m => ({ default: m.Patients })));
const Appointments = lazy(() => import('./pages/Appointments').then(m => ({ default: m.Appointments })));
const TokenQueue = lazy(() => import('./pages/TokenQueue').then(m => ({ default: m.TokenQueue })));
const DoctorsSchedule = lazy(() => import('./pages/DoctorsSchedule').then(m => ({ default: m.DoctorsSchedule })));
const Admissions = lazy(() => import('./pages/Admissions').then(m => ({ default: m.Admissions })));
const Laboratory = lazy(() => import('./pages/Laboratory').then(m => ({ default: m.Laboratory })));
const Pharmacy = lazy(() => import('./pages/Pharmacy').then(m => ({ default: m.Pharmacy })));
const Billing = lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const SecurityManagement = lazy(() => import('./pages/SecurityManagement').then(m => ({ default: m.SecurityManagement })));
const Staff = lazy(() => import('./pages/Staff').then(m => ({ default: m.Staff })));
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));
const ClinicExpenses = lazy(() => import('./pages/ClinicExpenses').then(m => ({ default: m.ClinicExpenses })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

const LoadingSpinner: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="text-xs font-medium text-slate-400">Loading module...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-semibold text-slate-555 dark:text-slate-400">Loading Lifeflow EMR Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isDoctor = user.role === 'doctor';
  const isPharmacist = user.role === 'pharmacist';
  const isAccountant = user.role === 'accountant';
  const hideSidebar = isDoctor || isPharmacist;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Layout — Hidden for Doctor & Pharmacist roles */}
      {!hideSidebar && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}

      {/* Main Panel Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        {/* Top Navbar */}
        <TopNav onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic Pages Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/dashboard" element={isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Dashboard />} />
              <Route path="/patient-registration" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <PatientRegistration />} />
              <Route path="/old-patient" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <OldPatient />} />
              <Route path="/patients" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Patients />} />
              <Route path="/appointments" element={<Navigate to="/token-queue" replace />} />
              <Route path="/token-queue" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <TokenQueue />} />
              <Route path="/doctors-schedule" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <DoctorsSchedule />} />
              <Route path="/admissions" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Admissions />} />
              <Route path="/laboratory" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Laboratory />} />
              <Route path="/pharmacy" element={isDoctor ? <Navigate to="/dashboard" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Pharmacy />} />
              <Route path="/billing" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : <Billing />} />
              <Route path="/expenses" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : <ClinicExpenses />} />
              <Route path="/reports" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Reports />} />
              <Route path="/profile" element={isDoctor || user.role === 'receptionist' || isPharmacist || isAccountant ? <Navigate to="/dashboard" replace /> : <Profile />} />
              <Route path="/security" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <SecurityManagement />} />
              <Route path="/staff" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Staff />} />
              <Route path="/logs" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Logs />} />
              <Route path="/settings" element={isDoctor ? <Navigate to="/dashboard" replace /> : isPharmacist ? <Navigate to="/pharmacy" replace /> : isAccountant ? <Navigate to="/billing" replace /> : <Settings />} />
              <Route path="*" element={<Navigate to={isPharmacist ? "/pharmacy" : isAccountant ? "/billing" : "/dashboard"} replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <AIChatbotWidget />
    </div>
  );
};

export default App;
