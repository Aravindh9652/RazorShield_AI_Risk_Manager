import React, { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle, XCircle, Clock, AlertCircle, Sliders, RefreshCw } from 'lucide-react';
import type { Assessment } from '../types';
import { apiService } from '../services/api';

interface ReviewQueuePageProps {
  onSelectAssessment: (assessment: Assessment) => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onSelectAssessment }) => {
  const [reviews, setReviews] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionToast, setActionToast] = useState<{ id: string; action: 'APPROVED' | 'REJECTED'; type: 'emerald' | 'rose' } | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAssessments({ limit: 50, decision: 'REVIEW', review_status: 'pending' });
      const pendingItems = (res.items || []).filter(
        (item: Assessment) =>
          item.review_status !== 'approved' &&
          item.review_status !== 'rejected' &&
          item.review_status !== 'reviewed'
      );
      setReviews(pendingItems);
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
    const actionLabel = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const toastType = action === 'approve' ? 'emerald' : 'rose';

    // 1. Instantly remove row from local state and decrement pending counter
    setReviews((prev) => prev.filter((item) => item.transaction_id !== transactionId));
    
    // 2. Trigger notification toast banner
    setActionToast({ id: transactionId, action: actionLabel, type: toastType });
    setTimeout(() => setActionToast(null), 4000);

    try {
      await apiService.submitReviewAction(transactionId, {
        action,
        actor: 'senior_analyst',
        note: `Action ${action} submitted from Review Queue workspace`,
      });
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
      loadQueue();
    }
  };

  const avgScore =
    reviews.length > 0
      ? (
          reviews.reduce(
            (acc, curr) => acc + (curr.risk_score ?? Math.round((curr.risk_probability || 0) * 100)),
            0
          ) / reviews.length
        ).toFixed(0)
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Action</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">{reviews.length}</div>
          <div className="mt-1 text-[11px] text-amber-400/80">Requires analyst review</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Risk Score</span>
            <Sliders className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400">{avgScore} / 100</div>
          <div className="mt-1 text-[11px] text-slate-400">Uncertainty band</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Primary Policy Route</span>
            <CheckSquare className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-amber-400 font-mono">REVIEW</div>
          <div className="mt-1 text-[11px] text-slate-400">Boundary t1 = 0.349</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Target SLA</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">&lt; 15 mins</div>
          <div className="mt-1 text-[11px] text-slate-400">Decision SLA window</div>
        </div>
      </div>

      {actionToast && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold border shadow-lg ${
            actionToast.type === 'emerald'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionToast.type === 'emerald' ? (
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>
              Transaction <strong className="font-mono text-white">{actionToast.id}</strong> marked as{' '}
              <strong className="font-bold underline">{actionToast.action}</strong> and removed from review queue.
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Pending Transactions for Analyst Action
        </h3>

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
                  const top = (a.top_contributors || [])[0];
                  const score = a.risk_score ?? Math.round((a.risk_probability || 0) * 100);
                  return (
                    <tr
                      key={a.assessment_id}
                      onClick={() => onSelectAssessment(a)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                        {a.transaction_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{a.merchant_id || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        ₹{(a.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
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
