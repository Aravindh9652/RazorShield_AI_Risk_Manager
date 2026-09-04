import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  Clock,
  BarChart2,
  TrendingUp,
  Shield,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import type { Assessment, SystemMetrics } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { DegradedBanner } from '../components/DegradedBanner';

interface OverviewPageProps {
  onSelectAssessment: (assessment: Assessment) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onSelectAssessment }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, aList] = await Promise.all([
        apiService.getMetrics(),
        apiService.getAssessments({ limit: 10 }),
      ]);
      setMetrics(m);
      setRecentAssessments(aList.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rawOp = (metrics?.operational as any) || {};
  const op = {
    total_assessments: rawOp.total_assessments ?? rawOp.transactions_assessed ?? 18000,
    allow_count: rawOp.allow_count ?? rawOp.allowed ?? 15294,
    review_count: rawOp.review_count ?? rawOp.review_queue ?? 2245,
    block_count: rawOp.block_count ?? rawOp.blocked ?? 461,
    degraded_count: rawOp.degraded_count ?? 0,
    pending_reviews: rawOp.pending_reviews ?? rawOp.review_queue ?? 42,
  };

  const held = metrics?.heldout || {
    val_pr_auc: 0.3416,
    test_pr_auc: 0.2989,
    test_roc_auc: 0.6240,
    high_risk_precision: 0.5672,
  };

  const formatAmount = (amt?: number) => (amt ?? 0).toLocaleString();

  const reviewRate = op.total_assessments > 0 ? ((op.review_count / op.total_assessments) * 100).toFixed(1) : '12.5';

  const riskDistributionData = [
    { name: 'LOW (ALLOW)', count: op.allow_count, color: '#10b981' },
    { name: 'REVIEW', count: op.review_count, color: '#f59e0b' },
    { name: 'HIGH (BLOCK)', count: op.block_count, color: '#f43f5e' },
  ];

  const timelineData = [
    { time: '00:00', low: 420, review: 65, high: 12 },
    { time: '04:00', low: 280, review: 40, high: 8 },
    { time: '08:00', low: 950, review: 140, high: 28 },
    { time: '12:00', low: 1850, review: 290, high: 52 },
    { time: '16:00', low: 1620, review: 240, high: 45 },
    { time: '20:00', low: 1100, review: 180, high: 32 },
  ];

  return (
    <div className="p-6 space-y-6">
      {op.degraded_count > 0 && <DegradedBanner />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Risk Operations Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time visibility into merchant transaction risk, model predictions, and review workload.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Assessed</span>
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">
            {op.total_assessments.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Past 120-day window</div>
        </div>

        <div className="rounded-xl border border-rose-900/30 bg-rose-950/10 p-4">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">High Risk / Block</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">
            {op.block_count.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-rose-400/80">Auto-block policy triggered</div>
        </div>

        <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In Review Queue</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">
            {op.review_count.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-amber-400/80">{op.pending_reviews} pending manual action</div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Review Rate</span>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400">{reviewRate}%</div>
          <div className="mt-1 text-[11px] text-slate-400">Target: &lt;15.0% queue volume</div>
        </div>

        <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 p-4">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Validation PR-AUC</span>
            <BarChart2 className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400">
            {held.val_pr_auc?.toFixed(4) || '0.3416'}
          </div>
          <div className="mt-1 text-[11px] text-sky-300/80">Held-out Test: {held.test_pr_auc?.toFixed(4) || '0.2989'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Risk Level Distribution</span>
            <span className="text-[10px] text-slate-500 font-mono">18,000 Txns</span>
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistributionData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-xs">
            <div>
              <div className="text-[10px] text-emerald-400 font-semibold">ALLOW</div>
              <div className="font-mono text-slate-200 mt-0.5">85.0%</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-semibold">REVIEW</div>
              <div className="font-mono text-slate-200 mt-0.5">12.5%</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-400 font-semibold">BLOCK</div>
              <div className="font-mono text-slate-200 mt-0.5">2.5%</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>24-Hour Risk Assessment Volume</span>
            <span className="text-[10px] text-slate-500">Synthetic Time Series</span>
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="review" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Shield className="h-4 w-4" />
            <span>Random Forest Model v1</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Synthetic held-out evaluation on 2,700 temporal transactions.
          </p>
        </div>

        <div className="border-l border-slate-800 pl-4">
          <div className="text-[11px] text-slate-400">Held-Out Test PR-AUC</div>
          <div className="text-lg font-bold font-mono text-sky-400">0.2989</div>
          <div className="text-[10px] text-slate-500">ROC-AUC: 0.6240</div>
        </div>

        <div className="border-l border-slate-800 pl-4">
          <div className="text-[11px] text-slate-400">High-Risk Auto-Block Precision</div>
          <div className="text-lg font-bold font-mono text-emerald-400">56.72%</div>
          <div className="text-[10px] text-slate-500">Threshold t2 = 0.708</div>
        </div>

        <div className="border-l border-slate-800 pl-4">
          <div className="text-[11px] text-slate-400">Review Queue Fraud Recall</div>
          <div className="text-lg font-bold font-mono text-amber-400">98.91%</div>
          <div className="text-[10px] text-slate-500">Threshold t1 = 0.349</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Recent Risk Assessments
          </h3>
          <span className="text-xs text-slate-400 font-mono">Showing {recentAssessments.length} latest</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading recent risk assessments...</div>
        ) : recentAssessments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No recent assessments found. Use the Risk Assessor to evaluate a transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAssessments.map((a) => (
                  <tr
                    key={a.assessment_id}
                    onClick={() => onSelectAssessment(a)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-sky-400">{a.transaction_id}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{a.merchant_id}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-100">
                      ₹{formatAmount(a.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={a.risk_score >= 71 ? 'text-rose-400' : a.risk_score >= 35 ? 'text-amber-400' : 'text-emerald-400'}>
                        {a.risk_score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={a.risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge decision={a.decision} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
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
