import React, { useState } from 'react';
import { Sliders, Sparkles, Send, Layers } from 'lucide-react';
import type { Assessment, TransactionInput } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { SHAPBreakdown } from '../components/SHAPBreakdown';

const PRESET_HIGH_RISK: TransactionInput = {
  transaction_id: `txn_demo_${Math.floor(Math.random() * 90000 + 10000)}`,
  merchant_id: 'mch_0012',
  customer_id: 'cust_00892',
  device_id: 'dev_09912',
  amount: 98000.0,
  currency: 'INR',
  payment_method: 'card',
  merchant_category: 'electronics',
  customer_account_age_days: 5,
  device_age_days: 0,
  new_device: 1,
  transaction_count_1h: 7,
  transaction_count_24h: 14,
  amount_sum_24h: 185000.0,
  customer_avg_amount: 1200.0,
  amount_deviation: 81.6,
  failed_attempts_24h: 4,
  customer_transaction_count: 2,
  previous_chargebacks: 2,
  location_distance_from_previous: 1450.0,
  ip_risk_score: 0.92,
  country_risk_score: 0.85,
  account_velocity: 3.5,
  customer_history_score: 0.15,
};

const PRESET_NORMAL: TransactionInput = {
  transaction_id: `txn_demo_${Math.floor(Math.random() * 90000 + 10000)}`,
  merchant_id: 'mch_0003',
  customer_id: 'cust_00120',
  device_id: 'dev_00045',
  amount: 2200.0,
  currency: 'INR',
  payment_method: 'upi',
  merchant_category: 'ecommerce',
  customer_account_age_days: 210,
  device_age_days: 180,
  new_device: 0,
  transaction_count_1h: 0,
  transaction_count_24h: 2,
  amount_sum_24h: 4100.0,
  customer_avg_amount: 2150.0,
  amount_deviation: 0.02,
  failed_attempts_24h: 0,
  customer_transaction_count: 38,
  previous_chargebacks: 0,
  location_distance_from_previous: 2.5,
  ip_risk_score: 0.02,
  country_risk_score: 0.01,
  account_velocity: 0.2,
  customer_history_score: 0.95,
};

export const AssessorPage: React.FC = () => {
  const [form, setForm] = useState<TransactionInput>(PRESET_HIGH_RISK);
  const [result, setResult] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.assessTransaction(form);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Assessment API request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset: TransactionInput) => {
    setForm({
      ...preset,
      transaction_id: `txn_demo_${Math.floor(Math.random() * 90000 + 10000)}`,
    });
    setResult(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Transaction Risk Assessor</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Simulate real-time payment inference. Submits feature payloads directly to the backend Random Forest risk model.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quick Presets:</span>
        <button
          onClick={() => loadPreset(PRESET_HIGH_RISK)}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>High Risk Velocity Burst</span>
        </button>
        <button
          onClick={() => loadPreset(PRESET_NORMAL)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Normal Legitimate Purchase</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-400" />
            <span>Transaction Feature Parameters</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Transaction ID</label>
              <input
                type="text"
                value={form.transaction_id}
                onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white"
              >
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">NetBanking</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Merchant Category</label>
              <select
                value={form.merchant_category}
                onChange={(e) => setForm({ ...form, merchant_category: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white capitalize"
              >
                <option value="electronics">Electronics</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="digital_goods">Digital Goods</option>
                <option value="travel">Travel</option>
                <option value="food">Food</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Failed Attempts (24h)</label>
              <input
                type="number"
                value={form.failed_attempts_24h}
                onChange={(e) => setForm({ ...form, failed_attempts_24h: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Previous Chargebacks</label>
              <input
                type="number"
                value={form.previous_chargebacks}
                onChange={(e) => setForm({ ...form, previous_chargebacks: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">IP Risk Score (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                value={form.ip_risk_score}
                onChange={(e) => setForm({ ...form, ip_risk_score: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Account Age (Days)</label>
              <input
                type="number"
                value={form.customer_account_age_days}
                onChange={(e) => setForm({ ...form, customer_account_age_days: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-lg shadow-sky-600/20"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? 'Evaluating Model Inference...' : 'Assess Transaction Risk'}</span>
          </button>

          {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
        </form>

        <div className="space-y-6">
          {!result ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center text-xs text-slate-500">
              Fill out feature parameters and click "Assess Transaction Risk" to generate model inference.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backend Risk Assessment</span>
                  <RiskBadge decision={result.decision} level={result.risk_level} size="lg" />
                </div>

                <div className="grid grid-cols-3 gap-4 border-y border-slate-800 py-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Risk Score</div>
                    <div className="text-3xl font-black font-mono text-sky-400 mt-1">
                      {result.risk_score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Risk Level</div>
                    <div className="mt-2">
                      <RiskBadge level={result.risk_level} size="md" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Recommended Action</div>
                    <div className="mt-2">
                      <RiskBadge decision={result.decision} size="md" />
                    </div>
                  </div>
                </div>

                <SHAPBreakdown contributors={result.top_contributors} />

                <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs text-slate-400 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>
                    Deterministic policy path: Probability {(result.risk_probability * 100).toFixed(1)}% evaluated against thresholds ($t_1=0.349, t_2=0.708$).
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
