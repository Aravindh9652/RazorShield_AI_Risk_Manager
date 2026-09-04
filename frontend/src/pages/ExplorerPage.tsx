import React, { useEffect, useState } from 'react';
import { Search, Filter, ExternalLink } from 'lucide-react';
import type { Assessment } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

interface ExplorerPageProps {
  onSelectAssessment: (assessment: Assessment) => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({ onSelectAssessment }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAssessments({ limit: 50 });
      setAssessments(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const filtered = assessments.filter((a) => {
    if (riskFilter !== 'ALL' && a.risk_level !== riskFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.transaction_id.toLowerCase().includes(q) ||
      a.merchant_id.toLowerCase().includes(q) ||
      a.customer_id.toLowerCase().includes(q) ||
      (a.device_id && a.device_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Transaction Explorer</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Deep-search historical risk assessments, customer history metrics, and SHAP factor attribution logs.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Transaction ID, Merchant ID, Customer ID, Device ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">LOW Risk</option>
            <option value="MEDIUM">MEDIUM Risk</option>
            <option value="HIGH">HIGH Risk</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Querying transaction database...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No transactions found matching search query "{query}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                <tr>
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">Merchant ID</th>
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Decision</th>
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
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">{a.transaction_id}</td>
                    <td className="py-3.5 px-4 text-slate-300">{a.merchant_id}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{a.customer_id}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      ₹{(a.amount ?? 0).toLocaleString()}
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
                    <td className="py-3.5 px-4 text-right">
                      <ExternalLink className="h-4 w-4 text-slate-500 inline hover:text-sky-400" />
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
