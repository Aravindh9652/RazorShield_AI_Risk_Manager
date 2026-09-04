import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import type { AuditLog } from '../types';
import { apiService } from '../services/api';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAuditLogs({ limit: 50 });
      setLogs(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable system audit record tracking every automated ML assessment, policy execution, and analyst review action.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
          <Lock className="h-3.5 w-3.5" />
          <span>Immutable Ledger</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading audit log timeline...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No audit events logged yet. Perform a risk assessment to record audit events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <tr>
                  <th className="py-3.5 px-4">Event ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action Summary</th>
                  <th className="py-3.5 px-4 text-right">Raw JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-500 text-[10px]">#{String(log.id).slice(-8)}</td>
                      <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                        {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-sky-400 font-sans">
                        {log.event_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">{log.transaction_id || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans">{log.actor || log.payload?.actor || 'system'}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {log.action || log.payload?.note || log.event_type}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {expandedId === log.id ? (
                          <ChevronDown className="h-4 w-4 text-sky-400 inline" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500 inline" />
                        )}
                      </td>
                    </tr>

                    {expandedId === log.id && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={7} className="p-4">
                          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-[11px] text-slate-300 font-mono overflow-x-auto">
                            <div className="text-[10px] font-sans font-semibold uppercase text-slate-500 mb-1">
                              Raw Audit Event Payload (Immutable)
                            </div>
                            <pre className="text-sky-300">{JSON.stringify(log.payload || log.details || log, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
