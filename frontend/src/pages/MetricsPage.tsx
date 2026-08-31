import React from 'react';

export const MetricsPage: React.FC = () => {
  const globalFeatures = [
    { rank: 1, feature: 'previous_chargebacks', phrase: 'Previous chargebacks on the customer', importance: '18.3%' },
    { rank: 2, feature: 'failed_attempts_24h', phrase: 'Failed payment attempts in 24 hours', importance: '14.3%' },
    { rank: 3, feature: 'ip_risk_score', phrase: 'IP risk score', importance: '9.2%' },
    { rank: 4, feature: 'customer_account_age_days', phrase: 'Customer account age', importance: '9.2%' },
    { rank: 5, feature: 'amount_deviation', phrase: 'Deviation from typical customer amount', importance: '9.1%' },
    { rank: 6, feature: 'customer_history_score', phrase: 'Prior customer history score', importance: '9.0%' },
    { rank: 7, feature: 'country_risk_score', phrase: 'Country risk score', importance: '7.1%' },
    { rank: 8, feature: 'amount', phrase: 'Transaction amount relative to typical spend', importance: '6.7%' },
    { rank: 9, feature: 'new_device', phrase: 'New or recently seen device', importance: '6.5%' },
    { rank: 10, feature: 'account_velocity', phrase: 'Account activity velocity', importance: '6.2%' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Model & Metrics Transparency</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete evaluation report for Random Forest risk model v1 evaluated on synthetic held-out test data.
          </p>
        </div>
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
          Synthetic Held-Out Evaluation
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Model Architecture</div>
          <div className="text-xs font-bold text-white mt-1">Random Forest</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Model Version</div>
          <div className="text-xs font-mono font-bold text-sky-400 mt-1">risk-model-v1</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Total Features</div>
          <div className="text-xs font-mono font-bold text-white mt-1">22 Features</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Dataset Volume</div>
          <div className="text-xs font-mono font-bold text-white mt-1">18,000 Rows</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Splitting Scheme</div>
          <div className="text-xs font-mono font-bold text-white mt-1">70 / 15 / 15 Temporal</div>
        </div>

        <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 p-3">
          <div className="text-[10px] text-sky-400 uppercase font-medium">Validation PR-AUC</div>
          <div className="text-sm font-mono font-black text-sky-400 mt-1">0.3416</div>
        </div>

        <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 p-3">
          <div className="text-[10px] text-sky-400 uppercase font-medium">Test PR-AUC</div>
          <div className="text-sm font-mono font-black text-sky-400 mt-1">0.2989</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Operating Thresholds (Validation-Optimized)</span>
            <span className="text-[10px] text-slate-500">Cost-Based Selection</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-400">t1 = 0.349 (REVIEW Boundary)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Transactions with probability &ge; 0.349 enter review queue.
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-amber-400 font-bold">98.91% Recall</div>
                <div className="text-[10px] text-slate-500">Review Fraud Catch</div>
              </div>
            </div>

            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-rose-400">t2 = 0.708 (HIGH / BLOCK Boundary)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Transactions with probability &ge; 0.708 trigger instant auto-block policy.
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-emerald-400 font-bold">56.72% Precision</div>
                <div className="text-[10px] text-slate-500">10.33% Auto-Block Recall</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Held-Out Test Confusion Matrix (at $t_2 = 0.708$)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-4">
              <div className="text-[11px] text-slate-400">True Negatives (TN)</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">2,303</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Legitimate txns allowed</div>
            </div>

            <div className="rounded-lg border border-rose-900/30 bg-rose-950/20 p-4">
              <div className="text-[11px] text-slate-400">False Positives (FP)</div>
              <div className="text-2xl font-black font-mono text-rose-400 mt-1">29</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Legitimate txns blocked</div>
            </div>

            <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-4">
              <div className="text-[11px] text-slate-400">False Negatives (FN)</div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">330</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fraud routed to review</div>
            </div>

            <div className="rounded-lg border border-sky-900/30 bg-sky-950/20 p-4">
              <div className="text-[11px] text-slate-400">True Positives (TP)</div>
              <div className="text-2xl font-black font-mono text-sky-400 mt-1">38</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fraud auto-blocked</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Global Feature Importance (SHAP TreeExplainer Mean |SHAP|)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Feature Key</th>
                <th className="py-3 px-4">Description / Human Phrase</th>
                <th className="py-3 px-4 text-right">Mean |SHAP| Importance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {globalFeatures.map((f) => (
                <tr key={f.rank} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-mono font-bold text-sky-400">#{f.rank}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-200">{f.feature}</td>
                  <td className="py-2.5 px-4 text-slate-300 font-medium">{f.phrase}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">{f.importance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
