import React, { useState } from 'react';
import { X, CheckCircle, XCircle, ShieldCheck, Layers } from 'lucide-react';
import type { Assessment } from '../types';
import { RiskBadge } from './RiskBadge';
import { SHAPBreakdown } from './SHAPBreakdown';

interface TransactionDetailDrawerProps {
  assessment: Assessment | null;
  onClose: () => void;
  onReviewSubmit?: (transactionId: string, action: 'approve' | 'reject' | 'mark_reviewed', note: string) => Promise<void>;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  assessment,
  onClose,
  onReviewSubmit,
}) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!assessment) return null;

  const handleAction = async (action: 'approve' | 'reject' | 'mark_reviewed') => {
    if (!onReviewSubmit) return;
    setSubmitting(true);
    try {
      await onReviewSubmit(assessment.transaction_id, action, note);
      onClose();
    } catch (err: any) {
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl border-l border-slate-800 bg-[#0f172a] h-full overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div>
          {/* Drawer Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0f172a] p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white">{assessment.transaction_id}</span>
                <RiskBadge decision={assessment.decision} level={assessment.risk_level} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Merchant: {assessment.merchant_id} • Customer: {assessment.customer_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Risk Assessment Summary Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Risk Score</div>
                <div className="text-2xl font-black font-mono text-sky-400 mt-0.5">
                  {assessment.risk_score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Risk Level</div>
                <div className="mt-1">
                  <RiskBadge level={assessment.risk_level} size="lg" />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Recommended Action</div>
                <div className="mt-1">
                  <RiskBadge decision={assessment.decision} size="lg" />
                </div>
              </div>
            </div>

            {/* Degraded Alert Banner if degraded */}
            {assessment.degraded && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                ⚠️ Model evaluated in degraded mode ({assessment.degraded_reason || 'fallback'}). Decision safely set to REVIEW.
              </div>
            )}

            {/* Transaction Parameters Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Transaction Metadata
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Amount</div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">
                    ₹{assessment.amount?.toLocaleString()} {assessment.currency}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Payment Method</div>
                  <div className="text-xs font-semibold text-slate-200 uppercase mt-0.5">
                    {assessment.payment_method}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Merchant Category</div>
                  <div className="text-xs font-semibold text-slate-200 capitalize mt-0.5">
                    {assessment.merchant_category}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Timestamp</div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    {new Date(assessment.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Review Status</div>
                  <div className="text-xs font-semibold text-sky-400 capitalize mt-0.5">
                    {assessment.review_status || 'pending'}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Policy Version</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {assessment.policy_applied || 'policy-v1'}
                  </div>
                </div>
              </div>
            </div>

            {/* SHAP Feature Contributors */}
            <SHAPBreakdown contributors={assessment.top_contributors} />

            {/* Decision Policy Route Explanation */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-sky-400" />
                <span>Deterministic Decision Path</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Risk probability is evaluated against locked operating boundaries ($t_1 = 0.349$, $t_2 = 0.708$).
                {assessment.decision === 'ALLOW' && ' Risk probability is below review threshold t1. Transaction approved.'}
                {assessment.decision === 'REVIEW' && ' Risk probability lies in uncertainty zone (t1 to t2). Routed to analyst review.'}
                {assessment.decision === 'BLOCK' && ' Risk probability exceeds t2 and transaction amount meets auto-block criteria.'}
              </p>
            </div>
          </div>
        </div>

        {/* Analyst Review Action Controls Footer */}
        <div className="sticky bottom-0 border-t border-slate-800 bg-[#0f172a] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add review note or verification details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              disabled={submitting}
              onClick={() => handleAction('approve')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Approve Txn</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleAction('reject')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              <span>Reject / Block</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleAction('mark_reviewed')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Mark Reviewed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
