import React from 'react';
import { Bell, Search, UserCheck } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onSearchChange?: (q: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, onSearchChange }) => {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>DEMO / TEST MODE</span>
        </span>

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

        {/* Notification Bell */}
        <button className="relative rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-500" />
        </button>

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
  );
};
