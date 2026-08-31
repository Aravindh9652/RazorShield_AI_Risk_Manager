import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  Activity,
  Sliders,
  CheckSquare,
  Search,
  FileText,
  BarChart3,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import type { SystemHealth } from '../types';

interface SidebarProps {
  health?: SystemHealth | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ health }) => {
  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Risk Monitor', path: '/monitor', icon: Activity },
    { label: 'Risk Assessor', path: '/assess', icon: Sliders },
    { label: 'Review Queue', path: '/reviews', icon: CheckSquare },
    { label: 'Transaction Explorer', path: '/explorer', icon: Search },
    { label: 'Audit Trail', path: '/audit', icon: FileText },
    { label: 'Model & Metrics', path: '/metrics', icon: BarChart3 },
    { label: 'System Health', path: '/health', icon: Server },
  ];

  const dbStatus = health?.db?.connected ? 'PostgreSQL Connected' : 'PostgreSQL Standby';
  const modelStatus = health?.model?.loaded ? 'risk-model-v1' : 'Model Offline';

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-[#0f172a] flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-sky-500/20">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">RazorShield</h1>
            <p className="text-[10px] text-sky-400 font-medium tracking-wider uppercase mt-1">AI Risk Manager</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Infrastructure Status
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-sky-400" />
            <span>API Engine</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-sky-400" />
            <span className="truncate max-w-[110px]">{dbStatus}</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-sky-400" />
            <span className="truncate max-w-[110px]">{modelStatus}</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  );
};
