import React, { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle, XCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import type { Assessment } from '../types';
import { apiService } from '../services/api';

interface ReviewQueuePageProps {
  onSelectAssessment: (assessment: Assessment) => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onSelectAssessment }) => {
  const [reviews, setReviews] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAssessments({ limit: 50, decision: 'REVIEW' });
      setReviews(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (transactionId: string, action: 'approve' | 'reject' | 'mark_reviewed', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.submitReviewAction(transactionId, {
        action,
        actor: 'senior_analyst',
        note: `Action ${action} submitted from Review Queue workspace`,
      });
      loadQueue();
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
    }
  };

  const avgScore =
    reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.risk_score, 0) / reviews.length).toFixed(0)
      : '54';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Merchant Review Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyst decision workspace for transactions flagged in the model uncertainty boundary ($t_1 = 0.349$ to $t_2 = 0.708$).
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-amber-400 uppercase">Pending Review Items</div>
            <div className="text-2xl font-black font-mono text-white mt-0.5">{reviews.length}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Average Queue Risk Score</div>
            <div className="text-2xl font-black font-mono text-sky-400 mt-0.5">{avgScore} / 100</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Fraud Catch SLA</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">98.91%</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading review queue items...</div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            All review items cleared! No pending transactions requiring manual analyst intervention.
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
                  <th className="py-3.5 px-4">Top Contributor</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Analyst Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reviews.map((a) => {
                  const top = a.top_contributors?.[0];
                  return (
                    <tr
                      key={a.assessment_id}
                      onClick={() => onSelectAssessment(a)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                        {a.transaction_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{a.merchant_id}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        ₹{a.amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {a.risk_score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {top ? (
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            <span className={top.direction === 'increases_risk' ? 'text-rose-400' : 'text-emerald-400'}>
                              {top.direction === 'increases_risk' ? '↑' : '↓'}
                            </span>
                            <span>{top.phrase || top.feature}</span>
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleAction(a.transaction_id, 'approve', e)}
                            className="flex items-center gap-1 rounded bg-emerald-600/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={(e) => handleAction(a.transaction_id, 'reject', e)}
                            className="flex items-center gap-1 rounded bg-rose-600/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
