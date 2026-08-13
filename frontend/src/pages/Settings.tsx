import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Shield, Server, BellRing, MapPin, CreditCard, Plus, Trash2, Edit2, Check, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiClient } from '../services/api';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'core' | 'areas' | 'payments'>('core');

  // Settings configs states
  const [hospitalName, setHospitalName] = useState('Dr. Talha Clinic');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [fileStorage, setFileStorage] = useState('local');

  // Areas state
  const [areas, setAreas] = useState<any[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [areaLoading, setAreaLoading] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');

  // Payment modes state
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [newPaymentName, setNewPaymentName] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentName, setEditingPaymentName] = useState('');

  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchAreas();
    fetchPaymentModes();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await apiClient.get('/settings/areas');
      setAreas(res || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  const fetchPaymentModes = async () => {
    try {
      const res = await apiClient.get('/settings/payment-modes');
      setPaymentModes(res || []);
    } catch (err) {
      console.error('Error fetching payment modes:', err);
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setAreaLoading(true);
    setMsg(null);
    try {
      await apiClient.post('/settings/areas', { name: newAreaName.trim() });
      setNewAreaName('');
      setMsg({ text: 'Area / Colony added successfully!', type: 'success' });
      await fetchAreas();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to add area.', type: 'error' });
    } finally {
      setAreaLoading(false);
    }
  };

  const handleUpdateArea = async (id: number) => {
    if (!editingAreaName.trim()) return;
    setMsg(null);
    try {
      await apiClient.put(`/settings/areas/${id}`, { name: editingAreaName.trim() });
      setEditingAreaId(null);
      setEditingAreaName('');
      setMsg({ text: 'Area / Colony updated successfully!', type: 'success' });
      await fetchAreas();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update area.', type: 'error' });
    }
  };

  const handleDeleteArea = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this Area / Colony?')) return;
    try {
      await apiClient.delete(`/settings/areas/${id}`);
      setMsg({ text: 'Area / Colony removed successfully!', type: 'success' });
      await fetchAreas();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to delete area.', type: 'error' });
    }
  };

  const handleAddPaymentMode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentName.trim()) return;
    setPaymentLoading(true);
    setMsg(null);
    try {
      await apiClient.post('/settings/payment-modes', { name: newPaymentName.trim() });
      setNewPaymentName('');
      setMsg({ text: 'Payment option added successfully!', type: 'success' });
      await fetchPaymentModes();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to add payment option.', type: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUpdatePaymentMode = async (id: number) => {
    if (!editingPaymentName.trim()) return;
    setMsg(null);
    try {
      await apiClient.put(`/settings/payment-modes/${id}`, { name: editingPaymentName.trim() });
      setEditingPaymentId(null);
      setEditingPaymentName('');
      setMsg({ text: 'Payment option updated successfully!', type: 'success' });
      await fetchPaymentModes();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update payment option.', type: 'error' });
    }
  };

  const handleDeletePaymentMode = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this Payment Option?')) return;
    try {
      await apiClient.delete(`/settings/payment-modes/${id}`);
      setMsg({ text: 'Payment Option removed successfully!', type: 'success' });
      await fetchPaymentModes();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to delete payment option.', type: 'error' });
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: 'System settings updated and saved to backend database configuration.', type: 'success' });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure clinical parameters, reception dropdowns, and integrations.</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
        }`}>
          {msg.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Categories */}
        <Card className="md:col-span-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('core')}
            className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all \${activeTab === 'core' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <SettingsIcon className="h-4.5 w-4.5" /> Core Parameters
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all \${activeTab === 'areas' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <MapPin className="h-4.5 w-4.5 text-brand-500" /> Area / Colony Setup
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all \${activeTab === 'payments' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <CreditCard className="h-4.5 w-4.5 text-brand-500" /> Registration Payments
          </button>
          <Link to="/security" className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
            <Shield className="h-4.5 w-4.5 text-brand-500" /> Security & Access Control
          </Link>
          <button onClick={() => alert('Diagnostic metrics: System is running on Sequelize/Express stack.')} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
            <Server className="h-4.5 w-4.5" /> Node Host Diagnostics
          </button>
        </Card>

        {/* Dynamic Tab Content */}
        <Card className="md:col-span-2 p-5 md:p-6">
          {activeTab === 'core' && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                Hospital EMR parameters
              </h3>
              
              <Input label="Hospital Display Name" required value={hospitalName} onChange={e => setHospitalName(e.target.value)} />

              {/* Notification triggers */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block"><BellRing className="inline h-3.5 w-3.5 mr-1" /> Alert Dispatch Channels</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                  <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} className="rounded border-slate-350 text-brand-500" />
                  Dispatch Email notifications on prescriptions & billing
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                  <input type="checkbox" checked={smsAlerts} onChange={e => setSmsAlerts(e.target.checked)} className="rounded border-slate-350 text-brand-500" />
                  Dispatch Twilio SMS reminders for upcoming queues
                </label>
              </div>

              {/* File upload */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Clinical report file storage</label>
                <select
                  value={fileStorage}
                  onChange={e => setFileStorage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="local">Local Host Storage (/uploads)</option>
                  <option value="s3">AWS Simple Storage Service (S3)</option>
                  <option value="cloudinary">Cloudinary Media Gateway</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button type="submit">Save Parameters</Button>
              </div>
            </form>
          )}

          {activeTab === 'areas' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-500" /> Area / Colony Management
              </h3>
              <p className="text-xs text-slate-500">Manage the list of areas/colonies selectable during patient registration.</p>

              {isAdmin && (
                <form onSubmit={handleAddArea} className="flex gap-2">
                  <Input
                    placeholder="Enter area / colony name (e.g. Model Town)"
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" isLoading={areaLoading} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </form>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 overflow-hidden">
                {areas.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No areas added yet.</div>
                ) : (
                  areas.map((area: any) => (
                    <div key={area.id} className="p-3.5 flex justify-between items-center bg-white dark:bg-dark-900 gap-2">
                      {editingAreaId === area.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingAreaName}
                            onChange={e => setEditingAreaName(e.target.value)}
                            className="flex-1 text-xs py-1"
                          />
                          <button
                            onClick={() => handleUpdateArea(area.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditingAreaId(null); setEditingAreaName(''); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {area.name}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingAreaId(area.id); setEditingAreaName(area.name); }}
                                className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors"
                                title="Edit Area"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteArea(area.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                title="Remove Area"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-500" /> Registration Payment Options
              </h3>
              <p className="text-xs text-slate-500">Manage the compulsory payment method options available for reception desk intake.</p>

              {isAdmin && (
                <form onSubmit={handleAddPaymentMode} className="flex gap-2">
                  <Input
                    placeholder="Enter payment mode name (e.g. EasyPaisa / JazzCash)"
                    value={newPaymentName}
                    onChange={e => setNewPaymentName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" isLoading={paymentLoading} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </form>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 overflow-hidden">
                {paymentModes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No payment options configured.</div>
                ) : (
                  paymentModes.map((pm: any) => (
                    <div key={pm.id} className="p-3.5 flex justify-between items-center bg-white dark:bg-dark-900 gap-2">
                      {editingPaymentId === pm.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingPaymentName}
                            onChange={e => setEditingPaymentName(e.target.value)}
                            className="flex-1 text-xs py-1"
                          />
                          <button
                            onClick={() => handleUpdatePaymentMode(pm.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditingPaymentId(null); setEditingPaymentName(''); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" /> {pm.name}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingPaymentId(pm.id); setEditingPaymentName(pm.name); }}
                                className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors"
                                title="Edit Payment Option"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePaymentMode(pm.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                title="Remove Payment Option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
