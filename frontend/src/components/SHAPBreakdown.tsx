import React from 'react';
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import type { TopContributor } from '../types';

interface SHAPBreakdownProps {
  contributors: TopContributor[];
}

export const SHAPBreakdown: React.FC<SHAPBreakdownProps> = ({ contributors }) => {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center text-xs text-slate-400">
        No factor breakdown available for this decision.
      </div>
    );
  }

  const increasing = contributors.filter((c) => c.direction === 'increases_risk');
  const decreasing = contributors.filter((c) => c.direction === 'decreases_risk');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Top Model Contributors</span>
          <Info className="h-3.5 w-3.5 text-slate-500" />
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">SHAP TreeExplainer</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Risk Increasing Contributors */}
        <div className="rounded-lg border border-rose-900/30 bg-rose-950/10 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
            <span>Increased Risk Contribution</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
          {increasing.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No significant risk elevating factors</p>
          ) : (
            increasing.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{c.phrase || c.feature}</span>
                <span className="font-mono text-rose-400 font-semibold">+{(c.value * 100).toFixed(1)}%</span>
              </div>
            ))
          )}
        </div>

        {/* Risk Decreasing Contributors */}
        <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>Decreased Risk Contribution</span>
            <ArrowDownRight className="h-4 w-4" />
          </div>
          {decreasing.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No significant risk mitigating factors</p>
          ) : (
            decreasing.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{c.phrase || c.feature}</span>
                <span className="font-mono text-emerald-400 font-semibold">{(c.value * 100).toFixed(1)}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
