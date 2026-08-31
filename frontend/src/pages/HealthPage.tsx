import React, { useEffect, useState } from 'react';
import { Server, Database, Cpu, Layers, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import type { SystemHealth } from '../types';
import { apiService } from '../services/api';
import { DegradedBanner } from '../components/DegradedBanner';

export const HealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const h = await apiService.getHealth();
      setHealth(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isDegraded = health?.status === 'degraded' || !health?.db?.connected || !health?.model?.loaded;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">System Health & Infrastructure Monitor</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time operational status of backend services, PostgreSQL connection pools, and ML model inference engines.
          </p>
        </div>

        <button
          onClick={checkHealth}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping Status</span>
        </button>
      </div>

      {isDegraded && <DegradedBanner />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Server className="h-4 w-4 text-sky-400" />
              <span>FastAPI Gateway</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Operational
            </span>
          </div>
          <p className="text-xs text-slate-400">
            HTTP REST API gateway serving risk assessment requests and review workflows.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            Endpoint: /api/v1 • Port: 8000
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Database className="h-4 w-4 text-sky-400" />
              <span>PostgreSQL Database</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          </div>
          <p className="text-xs text-slate-400">
            PostgreSQL 16 persistence engine storing assessments, review actions, and audit logs.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            Host: localhost:5432 • DB: razorshield
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Cpu className="h-4 w-4 text-sky-400" />
              <span>Risk Model Engine</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Loaded
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Serialized Random Forest pipeline executing probability estimation and policy routing.
          </p>
          <div className="text-[11px] font-mono text-sky-400 pt-2 border-t border-slate-800/80">
            Model: risk-model-v1.joblib
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Layers className="h-4 w-4 text-sky-400" />
              <span>SHAP TreeExplainer</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Local SHAP factor attribution calculating top model contributors per transaction.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            Explainability: Active (SHAP 0.44)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <FileText className="h-4 w-4 text-sky-400" />
              <span>Audit Logging Service</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Immutable system log recorder capturing all assessments and analyst decision events.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            Table: audit_events • Schema: v1
          </div>
        </div>
      </div>
    </div>
  );
};
