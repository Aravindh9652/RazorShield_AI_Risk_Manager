import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye } from 'lucide-react';
import type { Assessment } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

interface MonitorPageProps {
  onSelectAssessment: (assessment: Assessment) => void;
}

export const MonitorPage: React.FC<MonitorPageProps> = ({ onSelectAssessment }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAssessments({
        limit: 50,
        risk_level: riskFilter !== 'ALL' ? riskFilter : undefined,
        decision: decisionFilter !== 'ALL' ? decisionFilter : undefined,
        search: search || undefined,
      });
      setAssessments(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [riskFilter, decisionFilter]);

  const filtered = assessments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.transaction_id.toLowerCase().includes(q) ||
      a.merchant_id.toLowerCase().includes(q) ||
      a.customer_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Live Risk Monitor</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous real-time stream of incoming transaction risk scores and automated policy decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Txn, Merchant, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">LOW Risk</option>
            <option value="MEDIUM">MEDIUM Risk</option>
            <option value="HIGH">HIGH Risk</option>
          </select>

          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Decisions</option>
            <option value="ALLOW">ALLOW Policy</option>
            <option value="REVIEW">REVIEW Policy</option>
            <option value="BLOCK">BLOCK Policy</option>
          </select>

          <button
            onClick={loadData}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading risk monitoring feed...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                <tr>
                  <th className="py-3.5 px-4">Transaction</th>
                  <th className="py-3.5 px-4">Merchant</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Recommended Action</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((a) => (
                  <tr
                    key={a.assessment_id}
                    onClick={() => onSelectAssessment(a)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                      {a.transaction_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{a.merchant_id}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      ₹{a.amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={a.risk_score >= 71 ? 'text-rose-400' : a.risk_score >= 35 ? 'text-amber-400' : 'text-emerald-400'}>
                        {a.risk_score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={a.risk_level} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge decision={a.decision} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="rounded p-1 text-slate-500 hover:text-sky-400">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
