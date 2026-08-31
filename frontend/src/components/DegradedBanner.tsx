import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DegradedBannerProps {
  message?: string;
}

export const DegradedBanner: React.FC<DegradedBannerProps> = ({
  message = 'Risk engine degraded — Automated scoring is temporarily unavailable. Transactions are being routed to manual review.',
}) => {
  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold text-amber-200">Risk Engine Degraded Mode</span>
          <p className="text-xs text-amber-300/80 mt-0.5">{message}</p>
        </div>
      </div>
      <span className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
        REVIEW FALLBACK
      </span>
    </div>
  );
};
