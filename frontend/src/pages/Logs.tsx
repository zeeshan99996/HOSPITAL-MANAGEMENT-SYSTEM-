import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Card } from '../components/UI';
import { Activity, ShieldAlert } from 'lucide-react';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiClient.get('/admin/logs');
        setLogs(data);
      } catch (err) {
        console.error('Error fetching logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Audit Log</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit security access, patient sign-ins, and database changes.</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 dark:bg-dark-900 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No activity logs recorded.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">User Role</th>
                <th className="px-6 py-3.5">Action Event</th>
                <th className="px-6 py-3.5">Details</th>
                <th className="px-6 py-3.5 text-right">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {logs.map(log => (
                <tr key={log.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{log.user?.name || 'System Auto'}</span>
                    <span className="block text-[10px] text-slate-500 uppercase mt-0.5">{log.user?.role || 'Guest'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'Login' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-sm truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-550 dark:text-slate-400">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
