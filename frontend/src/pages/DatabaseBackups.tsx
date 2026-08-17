import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Badge, Modal } from '../components/UI';
import {
  Database,
  HardDrive,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Play,
  Cpu,
  ShieldCheck,
  Server,
  Check,
  Copy,
  Download,
  Cloud,
  CloudCheck,
  CloudOff,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const DatabaseBackups: React.FC = () => {
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [evaluatingStrategy, setEvaluatingStrategy] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Google Drive Cloud Sync state & modal
  const [gdriveStatus, setGdriveStatus] = useState<any>({ isConfigured: false, message: 'Loading status...' });
  const [isGDriveModalOpen, setIsGDriveModalOpen] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const fetchBackupLogs = async () => {
    setBackupLoading(true);
    try {
      const data = await apiClient.get('/admin/backups');
      setBackupLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Backup logs fetch error:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchGDriveStatus = async () => {
    try {
      const data = await apiClient.get('/admin/backups/gdrive-status');
      setGdriveStatus(data || { isConfigured: false });
    } catch (err: any) {
      setGdriveStatus({ isConfigured: false, message: 'Google Drive status unavailable.' });
    }
  };

  const handleRunBackup = async (type: 'daily' | 'weekly' | 'monthly' | 'manual') => {
    setRunningBackup(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/admin/backups/run', { type });
      setFeedback({
        type: 'success',
        message: res.message || `${type.toUpperCase()} database backup created & synced successfully!`
      });
      fetchBackupLogs();
      fetchGDriveStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Backup execution failed.'
      });
    } finally {
      setRunningBackup(false);
    }
  };

  const handleEvaluateStrategy = async () => {
    setEvaluatingStrategy(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/admin/backups/evaluate-strategy');
      setFeedback({
        type: 'success',
        message: res.message || 'Automated backup strategy evaluation completed.'
      });
      fetchBackupLogs();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Strategy evaluation failed.'
      });
    } finally {
      setEvaluatingStrategy(false);
    }
  };

  useEffect(() => {
    fetchBackupLogs();
    fetchGDriveStatus();
  }, []);

  const envSetupSnippet = `# ========================================================
# GOOGLE DRIVE AUTOMATED OFFSITE BACKUP CONFIGURATION
# ========================================================
OFFSITE_STORAGE_ENABLED=true
OFFSITE_STORAGE_TYPE=google_drive
GOOGLE_DRIVE_FOLDER_ID=1YourTargetFolderIdHere

# Option A: Service Account JSON (Recommended for automatic background cron)
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# Option B: Or OAuth2 Refresh Token credentials
# GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
# GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* EXECUTIVE HERO BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/20 border border-brand-400/30 text-brand-400 shadow-inner">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight text-white">Database Backups & Disaster Recovery</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Non-Destructive Live Engine
              </span>
              {gdriveStatus.isConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Google Drive Cloud Synced
                </span>
              ) : (
                <button
                  onClick={() => setIsGDriveModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 transition-colors"
                >
                  <Cloud className="h-3 w-3" /> Connect Google Drive
                </button>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated 3-tier snapshot strategy (Daily, Weekly, Monthly), direct Google Drive offsite cloud replication, and SHA-256 data integrity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={fetchBackupLogs}
            disabled={backupLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${backupLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={handleEvaluateStrategy}
            disabled={evaluatingStrategy}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5 font-bold text-xs bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700"
          >
            <Sparkles className={`h-3.5 w-3.5 ${evaluatingStrategy ? 'animate-spin' : ''}`} />
            {evaluatingStrategy ? 'Evaluating...' : '⚡ Evaluate Strategy'}
          </Button>

          <Button
            onClick={() => handleRunBackup('daily')}
            disabled={runningBackup}
            size="sm"
            className="flex items-center gap-2 font-black text-xs bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
          >
            <Play className={`h-3.5 w-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
            {runningBackup ? 'Running...' : '⚡ Run Instant Backup'}
          </Button>
        </div>
      </div>

      {/* Alert Notification */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Backups</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{backupLogs.length}</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Recorded in backup_logs database table</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Google Drive Cloud</span>
              <span className={`text-xs font-black mt-1 block ${gdriveStatus.isConfigured ? 'text-emerald-500' : 'text-amber-500'}`}>
                {gdriveStatus.isConfigured ? 'Direct Cloud Sync Active' : 'Setup Ready'}
              </span>
            </div>
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border ${
              gdriveStatus.isConfigured ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <Cloud className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium truncate">
            {gdriveStatus.isConfigured ? `Folder: ${gdriveStatus.folderId || 'Root'}` : 'Click to configure Drive sync'}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Automated Strategy</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                Daily 02:00 AM PKT
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Daily (14d) • Weekly (8w) • Monthly (12m)</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data Integrity</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                SHA-256 Verified
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Auto-checksum calculated per dump</p>
        </Card>
      </div>

      {/* 3-TIER BACKUP STRATEGY & GOOGLE DRIVE SYNC CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Policy Strategy Card */}
        <Card className="lg:col-span-2 p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-500" /> Automated Backup Strategy & Retention Schedule
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
              Daemon Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>⚡ Daily Snapshot</span>
                <span className="text-[10px] text-brand-500 font-mono">02:00 AM PKT</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Created every night. Retained locally for <strong>14 days</strong> and synced to Google Drive.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>📦 Weekly Archive</span>
                <span className="text-[10px] text-indigo-500 font-mono">Every Sunday</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Created every Sunday night. Retained for <strong>8 weeks</strong> for rolling disaster recovery.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>🏛️ Monthly Dump</span>
                <span className="text-[10px] text-emerald-500 font-mono">1st of Month</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Permanent monthly snapshot retained for <strong>12 months</strong> for hospital audits & compliance.
              </p>
            </div>
          </div>
        </Card>

        {/* Google Drive Status & Setup Card */}
        <Card className="p-5 border border-brand-500/20 bg-gradient-to-br from-brand-500/[0.03] to-indigo-500/[0.03] space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-500" /> Google Drive Sync
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                gdriveStatus.isConfigured
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {gdriveStatus.isConfigured ? 'Replicating' : 'Config Needed'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {gdriveStatus.isConfigured
                ? `Every backup archive is automatically uploaded to Google Drive offsite storage (${gdriveStatus.serviceAccountEmail || 'Connected'}).`
                : 'Directly upload and synchronize all database backup archives to your Google Drive folder for safe offsite redundancy.'}
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsGDriveModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 font-bold text-xs border-brand-500/30 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10"
          >
            <Cloud className="h-3.5 w-3.5" />
            {gdriveStatus.isConfigured ? 'View Google Drive Settings' : 'Setup Google Drive Connection'}
          </Button>
        </Card>
      </div>

      {/* Manual Instant Trigger Controls */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-brand-500" />
              Manual On-Demand Snapshot Triggers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Trigger a live snapshot immediately. The database engine exports all tables, indexes, relations, and data into a compressed <code className="text-brand-600 font-mono text-[11px]">.sql.gz</code> archive and uploads it to Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => handleRunBackup('daily')}
              disabled={runningBackup}
              className="flex items-center gap-1.5 font-black text-xs bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25"
            >
              <Play className={`h-3.5 w-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
              {runningBackup ? 'Running...' : '⚡ Daily Snapshot'}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => handleRunBackup('weekly')}
              disabled={runningBackup}
              className="flex items-center gap-1.5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              Weekly Archive
            </Button>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => handleRunBackup('manual')}
              disabled={runningBackup}
              className="flex items-center gap-1.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            >
              <FileArchive className="h-3.5 w-3.5" />
              Full Master Dump
            </Button>
          </div>
        </div>
      </Card>

      {/* Backup Audit History Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-dark-950/50">
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-brand-500" /> Backup Archives History & Audit Log
          </h4>
          <span className="text-[11px] font-mono text-slate-400">{backupLogs.length} Records Found</span>
        </div>

        {backupLoading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
            Loading Database Backup Audit Trail...
          </div>
        ) : backupLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No backup records logged yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click <strong>"Daily Snapshot"</strong> above to generate your first compressed database snapshot and sync to Google Drive.
            </p>
            <Button size="sm" onClick={() => handleRunBackup('daily')} disabled={runningBackup} className="mt-2 font-bold">
              ⚡ Generate First Snapshot
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Archive Filename</th>
                  <th className="px-5 py-3.5">Backup Type</th>
                  <th className="px-5 py-3.5">File Size</th>
                  <th className="px-5 py-3.5">Storage & Cloud Sync</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">SHA-256 Checksum</th>
                  <th className="px-5 py-3.5 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {backupLogs.map((log) => {
                  const isGDrive = log.storageLocation?.toLowerCase().includes('google drive');
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-850/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <FileArchive className="h-4 w-4 text-brand-500 shrink-0" />
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">{log.filename}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: #{log.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          log.backupType === 'daily'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : log.backupType === 'weekly'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : log.backupType === 'monthly'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}>
                          {log.backupType || 'manual'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                        {log.fileSize ? `${(Number(log.fileSize) / 1024).toFixed(1)} KB` : '< 1 KB'}
                      </td>

                      <td className="px-5 py-3.5">
                        {isGDrive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                            <Cloud className="h-3 w-3 text-emerald-500" />
                            <span>Disk + Google Drive</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-800">
                            <HardDrive className="h-3 w-3 text-slate-400" />
                            <span>Hostinger MySQL Disk</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge type={log.status === 'SUCCESS' ? 'success' : log.status === 'IN_PROGRESS' ? 'warning' : 'error'}>
                          {log.status || 'SUCCESS'}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        {log.checksum ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={log.checksum}>
                              {log.checksum.slice(0, 16)}...
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(log.checksum);
                                setCopiedHash(log.checksum);
                                setTimeout(() => setCopiedHash(null), 2000);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Copy SHA-256 Checksum"
                            >
                              {copiedHash === log.checksum ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">N/A</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {log.createdAt || log.completedAt ? new Date(log.createdAt || log.completedAt).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disaster Recovery & CLI Restore Instructions Card */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-950 space-y-3">
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Server className="h-4 w-4 text-emerald-500" /> Database Restoration & Disaster Recovery Instructions
        </h4>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            To restore any backup archive file into your MySQL database in case of server migration or recovery:
          </p>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto select-all">
            npx ts-node src/scripts/restoreDatabase.ts --file=storage/backups/daily_hospital_YYYY-MM-DD.sql.gz --confirm-prod
          </div>
          <p className="text-[11px] text-slate-500">
            Or download the <code className="font-mono text-brand-600">.sql.gz</code> file from Google Drive, extract with <code className="font-mono">gunzip</code>, and import directly via <strong>phpMyAdmin ➔ Import</strong> in Hostinger hPanel.
          </p>
        </div>
      </Card>

      {/* GOOGLE DRIVE SETUP MODAL */}
      <Modal isOpen={isGDriveModalOpen} onClose={() => setIsGDriveModalOpen(false)} title="Google Drive Cloud Sync Setup">
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1.5">
            <div className="font-extrabold flex items-center gap-1.5">
              <Cloud className="h-4 w-4 text-blue-500" />
              Direct Google Drive Cloud Storage Integration
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              When configured, every automated snapshot (Daily, Weekly, Monthly) is instantly uploaded and backed up into your private Google Drive folder with 0 disk space constraints.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              1. Add these variables to your Backend <code className="font-mono text-brand-500">.env</code> file on Hostinger / Vercel:
            </label>
            <div className="relative">
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto select-all leading-relaxed">
                {envSetupSnippet}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(envSetupSnippet);
                  setCopiedEnv(true);
                  setTimeout(() => setCopiedEnv(false), 2000);
                }}
                className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1"
              >
                {copiedEnv ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedEnv ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            <h5 className="font-bold text-slate-900 dark:text-white">2. Steps to create Google Cloud Service Account:</h5>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand-500 underline font-bold">Google Cloud Console</a> & create a project.</li>
              <li>Enable the <strong>Google Drive API</strong> in APIs & Services.</li>
              <li>Create a <strong>Service Account</strong> under Credentials & generate a JSON Key.</li>
              <li>Create a folder on your Google Drive and share it with the Service Account email with <strong>Editor</strong> permission.</li>
              <li>Paste the Service Account JSON and Folder ID into your backend <code className="font-mono">.env</code>.</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsGDriveModalOpen(false)} className="font-bold text-xs">
              Close Setup Guide
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
