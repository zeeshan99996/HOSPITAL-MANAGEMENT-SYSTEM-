import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card, Button, Badge } from '../components/UI';
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
  Download
} from 'lucide-react';

export const DatabaseBackups: React.FC = () => {
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleRunBackup = async (type: 'daily' | 'weekly' | 'monthly' | 'manual') => {
    setRunningBackup(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/admin/backups/run', { type });
      setFeedback({
        type: 'success',
        message: res.message || `${type.toUpperCase()} database backup created successfully!`
      });
      fetchBackupLogs();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Backup execution failed.'
      });
    } finally {
      setRunningBackup(false);
    }
  };

  useEffect(() => {
    fetchBackupLogs();
  }, []);

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
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated snapshot archives, pure JavaScript stream-gzip engine, SHA-256 data integrity verification, and instant disaster recovery controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={() => handleRunBackup('daily')}
            disabled={runningBackup}
            size="sm"
            className="flex items-center gap-2 font-black text-xs bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
          >
            <Play className={`h-3.5 w-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
            {runningBackup ? 'Running Backup...' : '⚡ Run Instant Backup'}
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
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Last Backup Status</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {backupLogs.length > 0 ? (backupLogs[0].status || 'SUCCESS') : 'Ready'}
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium truncate">
            {backupLogs.length > 0 ? new Date(backupLogs[0].createdAt || backupLogs[0].completedAt).toLocaleString() : 'No archives created yet'}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Storage Engine</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                Pure JS Gzip Stream
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Non-destructive .sql.gz format</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data Integrity</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 block">
                SHA-256 Hashing
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Automatic checksum verification</p>
        </Card>
      </div>

      {/* Action Trigger Controls Card */}
      <Card className="p-5 border border-brand-500/30 bg-gradient-to-r from-brand-500/[0.04] via-transparent to-indigo-500/[0.04]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-brand-500" />
              On-Demand Database Snapshot Actions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Trigger an on-demand, non-destructive MySQL snapshot. The engine extracts all tables, schemas, constraints, and rows into a compressed <code className="text-brand-600 font-mono text-[11px]">.sql.gz</code> archive without interrupting active hospital operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => handleRunBackup('daily')}
              disabled={runningBackup}
              className="flex items-center gap-1.5 font-black text-xs bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
            >
              <Play className={`h-3.5 w-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
              {runningBackup ? 'Running Backup...' : '⚡ Run Daily Snapshot'}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => handleRunBackup('manual')}
              disabled={runningBackup}
              className="flex items-center gap-1.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              Full System Archive
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
              Click <strong>"Run Daily Snapshot"</strong> or <strong>"Full System Archive"</strong> above to generate your first compressed database snapshot.
            </p>
            <Button size="sm" onClick={() => handleRunBackup('manual')} disabled={runningBackup} className="mt-2 font-bold">
              ⚡ Generate First Backup Snapshot
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
                  <th className="px-5 py-3.5">Execution Status</th>
                  <th className="px-5 py-3.5">SHA-256 Checksum</th>
                  <th className="px-5 py-3.5 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {backupLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-850/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileArchive className="h-4 w-4 text-brand-500 shrink-0" />
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">{log.filename}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Location: {log.storageLocation || 'local storage'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {log.backupType || 'manual'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {log.fileSize ? `${(Number(log.fileSize) / 1024).toFixed(1)} KB` : '< 1 KB'}
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
                ))}
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
            Or extract the <code className="font-mono text-brand-600">.sql.gz</code> file using <code className="font-mono">gunzip</code> and import directly via <strong>phpMyAdmin ➔ Import</strong> in Hostinger hPanel.
          </p>
        </div>
      </Card>
    </div>
  );
};
