import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, ShieldCheck, Layers, MessageSquare, Loader2, FileText, Copy, Check } from 'lucide-react';
import type { Assessment, AuditLog } from '../types';
import { apiService } from '../services/api';
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
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(assessment);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [successToast, setSuccessToast] = useState<{ action: string; note: string } | null>(null);
  const [evidencePack, setEvidencePack] = useState<any | null>(null);
  const [generatingEvidence, setGeneratingEvidence] = useState(false);
  const [copiedEvidence, setCopiedEvidence] = useState(false);

  useEffect(() => {
    setCurrentAssessment(assessment);
    setSuccessToast(null);
    setEvidencePack(null);
    setCopiedEvidence(false);
    setNote('');
    if (assessment?.transaction_id) {
      loadAuditLogs(assessment.transaction_id);
    }
  }, [assessment?.transaction_id]);

  const handleGenerateEvidence = async () => {
    if (!currentAssessment) return;
    setGeneratingEvidence(true);
    try {
      const data = await apiService.getChargebackEvidence(currentAssessment.transaction_id);
      setEvidencePack(data);
    } catch (err) {
      console.error('Failed to generate evidence:', err);
    } finally {
      setGeneratingEvidence(false);
    }
  };

  const handleCopyEvidence = () => {
    if (!evidencePack) return;
    const text = `DISPUTE DEFENSE EVIDENCE PACK\nDispute ID: ${evidencePack.dispute_id}\nTransaction: ${evidencePack.transaction_id}\nMerchant: ${evidencePack.merchant_id}\nCustomer: ${evidencePack.customer_id}\nAmount: ₹${evidencePack.amount} ${evidencePack.currency}\nTimestamp: ${evidencePack.timestamp}\n\nSUMMARY:\n${evidencePack.defense_summary}\n\nAUDIT HASH: ${evidencePack.audit_hash}`;
    navigator.clipboard.writeText(text);
    setCopiedEvidence(true);
    setTimeout(() => setCopiedEvidence(false), 3000);
  };

  const loadAuditLogs = async (txId: string) => {
    setLoadingLogs(true);
    try {
      const res = await apiService.getAuditLogs({ transaction_id: txId, limit: 50 });
      setLogs(res.items || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!assessment || !currentAssessment) return null;

  const handleAction = async (action: 'approve' | 'reject' | 'mark_reviewed') => {
    if (!onReviewSubmit) return;
    setSubmitting(true);
    const actionLabel = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'REVIEWED';
    const updatedStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed';

    try {
      await onReviewSubmit(currentAssessment.transaction_id, action, note);
      
      // Update local state dynamically in real-time
      setCurrentAssessment((prev) => (prev ? { ...prev, review_status: updatedStatus } : null));
      setSuccessToast({ action: actionLabel, note: note || 'No note attached' });
      setNote('');

      // Reload audit history so the newly attached review note appears immediately
      await loadAuditLogs(currentAssessment.transaction_id);
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewLogs = [...logs]
    .filter((l) => l.event_type.startsWith('REVIEW_'))
    .sort((a, b) => new Date(a.created_at || a.timestamp || 0).getTime() - new Date(b.created_at || b.timestamp || 0).getTime());

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl border-l border-slate-800 bg-[#0f172a] h-full overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div>
          {/* Drawer Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0f172a] p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white">{currentAssessment.transaction_id}</span>
                <RiskBadge decision={currentAssessment.decision} level={currentAssessment.risk_level} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Merchant: {currentAssessment.merchant_id} • Customer: {currentAssessment.customer_id}
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
            {/* Success Toast Banner */}
            {successToast && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Transaction marked as <strong className="font-bold underline">{successToast.action}</strong>. Note attached and saved to Audit Log.
                  </span>
                </div>
              </div>
            )}

            {/* Risk Assessment Summary Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Risk Score</div>
                <div className="text-2xl font-black font-mono text-sky-400 mt-0.5">
                  {currentAssessment.risk_score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Risk Level</div>
                <div className="mt-1">
                  <RiskBadge level={currentAssessment.risk_level} size="lg" />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase">Recommended Action</div>
                <div className="mt-1">
                  <RiskBadge decision={currentAssessment.decision} size="lg" />
                </div>
              </div>
            </div>

            {/* Degraded Alert Banner if degraded */}
            {currentAssessment.degraded && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                ⚠️ Model evaluated in degraded mode ({currentAssessment.degraded_reason || 'fallback'}). Decision safely set to REVIEW.
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
                    ₹{(currentAssessment.amount ?? 0).toLocaleString()} {currentAssessment.currency || 'INR'}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Payment Method</div>
                  <div className="text-xs font-semibold text-slate-200 uppercase mt-0.5">
                    {currentAssessment.payment_method || 'UPI'}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Merchant Category</div>
                  <div className="text-xs font-semibold text-slate-200 capitalize mt-0.5">
                    {currentAssessment.merchant_category || 'Ecommerce'}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Timestamp</div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    {new Date(currentAssessment.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Review Status</div>
                  <div className="text-xs font-semibold text-sky-400 capitalize mt-0.5">
                    {currentAssessment.review_status || 'pending'}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-500">Policy Version</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {currentAssessment.policy_applied || 'policy-v1'}
                  </div>
                </div>
              </div>
            </div>

            {/* SHAP Feature Contributors */}
            <SHAPBreakdown contributors={currentAssessment.top_contributors} />

            {/* Decision Policy Route Explanation */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-sky-400" />
                <span>Deterministic Decision Path</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Risk probability is evaluated against locked operating boundaries ($t_1 = 0.349$, $t_2 = 0.708$).
                {currentAssessment.decision === 'ALLOW' && ' Risk probability is below review threshold t1. Transaction approved.'}
                {currentAssessment.decision === 'REVIEW' && ' Risk probability lies in uncertainty zone (t1 to t2). Routed to analyst review.'}
                {currentAssessment.decision === 'BLOCK' && ' Risk probability exceeds t2 and transaction amount meets auto-block criteria.'}
              </p>
            </div>

            {/* Chargeback Evidence Auto-Responder Section */}
            <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-sky-400" />
                  <span>Chargeback Evidence Auto-Responder</span>
                </h4>
                {!evidencePack && (
                  <button
                    disabled={generatingEvidence}
                    onClick={handleGenerateEvidence}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-600/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 disabled:opacity-50 transition-colors"
                  >
                    {generatingEvidence ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>Generate Evidence Pack</span>
                  </button>
                )}
              </div>

              {evidencePack ? (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-2">
                    <span className="text-emerald-400 font-bold">{evidencePack.dispute_id}</span>
                    <span className="text-slate-500 text-[10px]">Hash: {evidencePack.audit_hash}</span>
                  </div>
                  <div className="text-slate-300 font-sans leading-relaxed text-xs">
                    {evidencePack.defense_summary}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 font-mono">
                    <div>Device Age: {evidencePack.device_proof.device_age_days}d</div>
                    <div>IP Risk Score: {evidencePack.device_proof.ip_risk_score}</div>
                    <div>Customer Txns: {evidencePack.customer_history.previous_successful_txns}</div>
                    <div>Prior Chargebacks: {evidencePack.customer_history.previous_chargebacks}</div>
                  </div>
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={handleCopyEvidence}
                      className="flex items-center gap-1.5 rounded bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-500 transition-colors"
                    >
                      {copiedEvidence ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedEvidence ? 'Copied to Clipboard!' : 'Copy Evidence Pack'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Auto-generate an immutable, bank-ready dispute defense package containing SHAP risk explanations, device fingerprints, and customer purchase proof.
                </p>
              )}
            </div>

            {/* Analyst Review Notes & Verification History Section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                <span>Analyst Notes & Audit History</span>
              </h4>

              {loadingLogs ? (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading review notes...</span>
                </div>
              ) : reviewLogs.length === 0 ? (
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-500 italic">
                  No analyst review notes recorded yet for this transaction. Use the controls below to attach notes.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviewLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-sky-400 font-mono">
                          {log.payload?.actor || 'senior_analyst'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                            log.event_type.includes('APPROVE')
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : log.event_type.includes('REJECT')
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          }`}
                        >
                          {log.event_type.replace('REVIEW_', '')}
                        </span>
                        <p className="text-xs text-slate-200 font-medium">
                          {log.payload?.note || 'No detailed note provided.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              disabled={submitting}
              onClick={() => handleAction('approve')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>Approve Txn</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleAction('reject')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-4 w-4" />}
              <span>Reject / Block</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleAction('mark_reviewed')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Mark Reviewed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
