import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { Download, FileText, Calendar, Filter, Printer, Database } from 'lucide-react';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('billing');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-31');

  // Static/Mock report records matching receptionist scopes
  const reportsData: Record<string, any[]> = {
    registrations: [
      { id: 1, date: '2026-07-13', patient: 'Alice Brown', mrn: 'MR-2026-0001', gender: 'Female', phone: '555-0199', registrar: 'Emily Davis' },
      { id: 2, date: '2026-07-13', patient: 'Bob Jackson', mrn: 'MR-2026-0002', gender: 'Male', phone: '555-888-9999', registrar: 'Emily Davis' },
      { id: 3, date: '2026-07-12', patient: 'Charlie Green', mrn: 'MR-2026-0003', gender: 'Male', phone: '555-1234', registrar: 'Emily Davis' }
    ],
    appointments: [
      { id: 1, date: '2026-07-13', patient: 'Alice Brown', doctor: 'Dr. Jane Smith', department: 'Cardiology', time: '10:00 AM', status: 'completed' },
      { id: 2, date: '2026-07-13', patient: 'Bob Jackson', doctor: 'Dr. Jane Smith', department: 'Cardiology', time: '11:30 AM', status: 'pending' },
      { id: 3, date: '2026-07-13', patient: 'Charlie Green', doctor: 'Dr. Jane Smith', department: 'Cardiology', time: '02:00 PM', status: 'cancelled' }
    ],
    billing: [
      { id: 1, date: '2026-07-13', invoice: 'INV-2026-101', patient: 'Alice Brown', amount: 650.00, method: 'Cash', status: 'paid' },
      { id: 2, date: '2026-07-13', invoice: 'INV-2026-102', patient: 'Bob Jackson', amount: 150.00, method: 'Card', status: 'unpaid' },
      { id: 3, date: '2026-07-12', invoice: 'INV-2026-103', patient: 'Charlie Green', amount: 500.00, method: 'Online', status: 'paid' }
    ]
  };

  const handleExportCSV = () => {
    alert(`CSV Data file successfully compiled and dispatched to download directory: hms_report_${reportType}.csv`);
  };

  const handleExportPDF = () => {
    alert(`PDF Report successfully formatted and compiled: hms_report_${reportType}.pdf`);
  };

  const currentReport = reportsData[reportType] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-500" /> Operational Reporting Desk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compile front desk statistics, registration tallies, and bill logs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExportCSV} variant="secondary" className="flex-1 sm:flex-none flex items-center gap-1.5 justify-center">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center gap-1.5 justify-center">
            <Printer className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-slate-850 shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Report Category</label>
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="billing">Daily Billing Collection Log</option>
            <option value="registrations">Daily Patient Intake Log</option>
            <option value="appointments">Daily Booking & Appointment Log</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">From Date</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900"
            />
            <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-655 dark:text-slate-400 mb-1.5 uppercase tracking-wider">To Date</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-350 dark:border-slate-800 text-xs bg-white dark:bg-dark-900 text-slate-900"
            />
            <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <Button variant="secondary" className="w-full sm:w-auto flex items-center gap-1 !py-2.5 justify-center">
          <Filter className="h-3.5 w-3.5" /> Apply
        </Button>
      </Card>

      {/* Reports Table Grid */}
      <Card className="p-0 overflow-hidden border border-slate-200/60 dark:border-slate-850 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-dark-950/20 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <Database className="h-4 w-4 text-brand-500" /> Compiled Records ({currentReport.length})
          </h3>
          <span className="text-[10px] text-slate-450 dark:text-slate-550 font-semibold">{startDate} to {endDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {reportType === 'billing' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Invoice ID</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {currentReport.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                      <td className="px-5 py-3.5">{r.date}</td>
                      <td className="px-5 py-3.5 font-bold font-mono">{r.invoice}</td>
                      <td className="px-5 py-3.5">{r.patient}</td>
                      <td className="px-5 py-3.5 font-mono">Rs. {r.amount.toFixed(2)}</td>
                      <td className="px-5 py-3.5">{r.method}</td>
                      <td className="px-5 py-3.5"><Badge type={r.status === 'paid' ? 'success' : 'warning'}>{r.status.toUpperCase()}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {reportType === 'registrations' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">MRN Number</th>
                    <th className="px-5 py-3">Patient Name</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Registrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {currentReport.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                      <td className="px-5 py-3.5">{r.date}</td>
                      <td className="px-5 py-3.5 font-bold font-mono">{r.mrn}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{r.patient}</td>
                      <td className="px-5 py-3.5">{r.gender}</td>
                      <td className="px-5 py-3.5">{r.phone}</td>
                      <td className="px-5 py-3.5 text-slate-450">{r.registrar}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {reportType === 'appointments' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-dark-950/40 text-slate-450 uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Patient Name</th>
                    <th className="px-5 py-3">Physician</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {currentReport.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40 text-slate-700 dark:text-slate-350">
                      <td className="px-5 py-3.5">{r.date}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{r.patient}</td>
                      <td className="px-5 py-3.5">{r.doctor}</td>
                      <td className="px-5 py-3.5">{r.department}</td>
                      <td className="px-5 py-3.5 font-mono">{r.time}</td>
                      <td className="px-5 py-3.5">
                        <Badge type={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'error' : 'warning'}>
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};
