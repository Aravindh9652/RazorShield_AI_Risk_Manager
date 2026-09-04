import React, { useEffect, useState } from 'react';
import { Bell, Search, UserCheck, Sun, Moon, Info, X, ShieldCheck, Database, Cpu, CheckCircle2 } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onSearchChange?: (q: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, onSearchChange }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('razorshield_theme') as 'dark' | 'light') || 'dark';
  });
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('razorshield_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 px-6 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-slate-100">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Environment Badge / Interactive Modal Toggle */}
          <button
            onClick={() => setShowEnvModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer shadow-sm hover:border-sky-400"
            title="Click to view Environment & System Details"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>DEMO / TEST MODE</span>
            <Info className="h-3 w-3 text-sky-400/80 ml-0.5" />
          </button>

          {/* Global Search Bar */}
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Txn ID, Customer, Merchant..."
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="h-4 w-4 text-sky-400" />
            )}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="System Alerts & Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-500" />
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl z-30 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">System Notifications</span>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Live</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Model Ready
                    </div>
                    <p className="text-[11px] text-slate-400">Random Forest v1 loaded with PR-AUC 0.3416</p>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="font-semibold text-sky-400 flex items-center gap-1">
                      <Database className="h-3 w-3" /> PostgreSQL Connected
                    </div>
                    <p className="text-[11px] text-slate-400">Database connected & pre-seeded with transactions</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analyst Profile Avatar */}
          <div className="flex items-center gap-2.5 border-l border-slate-800 pl-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600/20 text-sky-400 font-bold text-xs border border-sky-500/30">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200">Analyst Operations</div>
              <div className="text-[10px] text-slate-500">Risk Manager Role</div>
            </div>
          </div>
        </div>
      </header>

      {/* Environment Status Modal */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <span>RazorShield Environment Status</span>
              </div>
              <button
                onClick={() => setShowEnvModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Cpu className="h-4 w-4 text-sky-400" />
                  <span>Execution Mode</span>
                </div>
                <span className="font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-full">
                  DEMO / TEST MODE
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span>Database Engine</span>
                </div>
                <span className="font-semibold text-emerald-400">PostgreSQL (Connected)</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span>Active Model & Version</span>
                </div>
                <span className="font-mono text-slate-200 font-bold">risk-model-v1</span>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1.5">
                <div className="text-slate-400 font-semibold">Operating Thresholds</div>
                <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                  <span>t1 (Low / Review boundary): <strong className="text-sky-400">0.349</strong></span>
                  <span>t2 (Review / Block boundary): <strong className="text-rose-400">0.708</strong></span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                In Demo / Test Mode, all risk inferences are processed locally against the trained Random Forest model and PostgreSQL seed database without touching live payment networks.
              </p>
            </div>

            <button
              onClick={() => setShowEnvModal(false)}
              className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20 cursor-pointer"
            >
              Close System Status
            </button>
          </div>
        </div>
      )}
    </>
  );
};
