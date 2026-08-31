import React from 'react';
import type { Decision, RiskLevel } from '../types';

interface RiskBadgeProps {
  level?: RiskLevel;
  decision?: Decision;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, decision, score, size = 'md' }) => {
  let target = level || 'LOW';
  if (decision === 'ALLOW') target = 'LOW';
  if (decision === 'REVIEW') target = 'MEDIUM';
  if (decision === 'BLOCK') target = 'HIGH';

  let bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let dotClass = 'bg-emerald-400';

  if (target === 'MEDIUM') {
    bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dotClass = 'bg-amber-400';
  } else if (target === 'HIGH') {
    bgClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    dotClass = 'bg-rose-400';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-bold',
  };

  const label = decision || level || 'UNKNOWN';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bgClass} ${sizeClasses[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
      {score !== undefined && <span className="opacity-75">({score.toFixed(0)})</span>}
    </span>
  );
};
