import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { Beaker, ClipboardCheck, ArrowRight, CheckCircle, Plus, Printer, FileText } from 'lucide-react';

export const Laboratory: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals controls
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isViewReportOpen, setIsViewReportOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [viewReportData, setViewReportData] = useState<any>(null);

  // Request Form state
  const [patientId, setPatientId] = useState('');
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Blood Chemistry');

  // Results Form state
  const [resultDetails, setResultDetails] = useState('');

  const fetchLabData = async () => {
    setLoading(true);
    try {
      let query = '';
      if (user?.role === 'patient' && user.profileId) {
        query = `?patientId=${user.profileId}`;
      }
      const data = await apiClient.get(`/lab/requests${query}`);
      setRequests(data);

      if (user?.role === 'doctor' || user?.role === 'admin') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList);
      }
    } catch (err) {
      console.error('Error fetching laboratory logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/lab/requests', {
        patientId,
        doctorId: user?.profileId,
        testName,
        category,
      });
      setIsRequestOpen(false);
      fetchLabData();
      // Reset
      setPatientId('');
      setTestName('');
    } catch (err) {
      alert('Error raising laboratory requisition.');
    }
  };

  const handleCollectSample = async (id: number) => {
    try {
      await apiClient.put(`/lab/requests/${id}/process`, {});
      fetchLabData();
    } catch (err) {
      alert('Failed to update sample collection.');
    }
  };

  const handleResultClick = (req: any) => {
    setSelectedReq(req);
    setResultDetails('');
    setIsResultOpen(true);
  };

  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/lab/requests/${selectedReq.id}/result`, {
        resultDetails,
      });
      setIsResultOpen(false);
      fetchLabData();
    } catch (err) {
      alert('Failed to upload test results.');
    }
  };

  const handleViewReport = (req: any) => {
    setViewReportData(req);
    setIsViewReportOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Laboratory & Pathology</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track bio-specimen collections, chemical panels, and report distributions.</p>
        </div>
        {user?.role === 'doctor' && (
          <Button onClick={() => setIsRequestOpen(true)} className="flex items-center gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Request Test
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-dark-900 rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No laboratory test files.</p>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Raise clinical test requisitions to initiate pathology queues.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <Card key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center text-slate-500">
                  <Beaker className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-150">{req.testName}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Patient: {req.patient?.name} • Category: {req.category}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ordered by: {req.doctor?.user?.name || 'Staff'}</p>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-850 pt-2.5 sm:pt-0">
                <Badge
                  type={
                    req.status === 'completed'
                      ? 'success'
                      : req.status === 'processing'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {req.status}
                </Badge>

                {/* Operations Actions */}
                {user?.role === 'lab_technician' && req.status === 'pending' && (
                  <Button onClick={() => handleCollectSample(req.id)} variant="secondary" size="sm" className="flex items-center gap-1.5">
                    Collect Specimen <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
                {user?.role === 'lab_technician' && req.status === 'processing' && (
                  <Button onClick={() => handleResultClick(req)} variant="primary" size="sm" className="flex items-center gap-1.5">
                    Record Findings <ClipboardCheck className="h-4 w-4" />
                  </Button>
                )}

                {req.status === 'completed' && (
                  <Button
                    onClick={() => handleViewReport(req)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Report
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Request Lab Test Modal (Doctor) */}
      <Modal isOpen={isRequestOpen} onClose={() => setIsRequestOpen(false)} title="Laboratory Test Requisition">
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Patient File</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <Input label="Requisition Test Name" required value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Lipid Profile, Complete Blood Count (CBC)" />
          
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Test Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="Blood Chemistry">Blood Chemistry</option>
              <option value="Hematology">Hematology</option>
              <option value="Cardiology Test">Cardiology Test</option>
              <option value="Urinalysis">Urinalysis</option>
              <option value="Radiology / Scan">Radiology / Scan</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Pathology Order</Button>
          </div>
        </form>
      </Modal>

      {/* Record Findings Modal (Lab Technician) */}
      <Modal isOpen={isResultOpen} onClose={() => setIsResultOpen(false)} title="Upload Laboratory Test Findings">
        <form onSubmit={handleResultSubmit} className="space-y-4">
          {selectedReq && (
            <div className="p-3 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs border border-slate-200/50 dark:border-slate-850">
              <p><strong>Patient Name:</strong> {selectedReq.patient?.name}</p>
              <p className="mt-1"><strong>Pathology Test:</strong> {selectedReq.testName} ({selectedReq.category})</p>
            </div>
          )}

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Diagnostic Findings Details</label>
            <textarea
              required
              rows={5}
              value={resultDetails}
              onChange={e => setResultDetails(e.target.value)}
              placeholder="e.g. Hemoglobin: 14.2 g/dL (Normal), RBC Count: 4.8 million/mcL..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsResultOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Sign off and Release Findings</Button>
          </div>
        </form>
      </Modal>

      {/* Official Diagnostic Lab Findings Report Modal */}
      <Modal isOpen={isViewReportOpen} onClose={() => setIsViewReportOpen(false)} title="Official Laboratory Diagnostic Report">
        {viewReportData && (
          <div className="space-y-5 text-slate-800 dark:text-slate-200">
            {/* Header / Letterhead */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex justify-between items-center shadow-md">
              <div>
                <h3 className="text-base font-extrabold tracking-wide text-brand-400">PATHOLOGY & DIAGNOSTIC LABORATORY</h3>
                <p className="text-[10px] text-slate-350 mt-0.5">Clinical Pathology & Diagnostic Testing Division</p>
              </div>
              <Badge type="success">RELEASED</Badge>
            </div>

            {/* Patient & Requisition Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-dark-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block">Patient Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{viewReportData.patient?.name || 'Registered Patient'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block">MR Number</span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{viewReportData.patient?.mrNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block">Test Requested</span>
                <span className="font-bold text-slate-850 dark:text-slate-200">{viewReportData.testName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block">Test Category</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{viewReportData.category || 'General Diagnostic'}</span>
              </div>
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200/50 dark:border-slate-850 flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 gap-1">
                <span>Ordering Physician: <strong>{viewReportData.doctor?.user?.name ? (viewReportData.doctor.user.name.startsWith('Dr.') ? viewReportData.doctor.user.name : `Dr. ${viewReportData.doctor.user.name}`) : 'Attending Physician'}</strong></span>
                <span>Released: <strong>{viewReportData.processedDate ? new Date(viewReportData.processedDate).toLocaleString() : new Date().toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Findings & Diagnostic Results Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Clinical Diagnostic Findings & Lab Results</label>
              <div className="p-4 bg-white dark:bg-dark-900 border border-slate-250 dark:border-slate-800 rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-800 dark:text-slate-200 shadow-inner">
                {viewReportData.resultDetails || 'No clinical finding details recorded.'}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsViewReportOpen(false)}>
                Close
              </Button>
              <Button type="button" onClick={() => window.print()} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Print Official Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
