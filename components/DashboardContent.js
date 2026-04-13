"use client";

import { Search, Bell, RefreshCcw, Database } from "lucide-react";
import { clsx } from "clsx";

export default function DashboardContent({ children, loading, lastUpdated, onRefresh, onSheetSettings }) {
  return (
    <main className="flex-1 min-w-0 max-w-full h-screen transition-all duration-300 ml-20 md:ml-64 bg-background/50 relative overflow-hidden flex flex-col">
      {/* Top Header / Search Bar */}
      <header className="flex-shrink-0 z-40 h-20 bg-background/20 backdrop-blur-3xl border-b border-white/5 px-8 flex items-center justify-between">
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ultima Atualização</span>
            <span className="text-xs font-medium text-slate-300">
              {lastUpdated ? lastUpdated.toLocaleTimeString("pt-BR") : "---"}
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-white/10 transition-all relative group"
            title="Atualizar dados"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : "group-hover:scale-110"} />
          </button>

          <button
            onClick={onSheetSettings}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium group"
          >
            <Database size={16} className="text-primary group-hover:scale-110" />
            <span className="hidden sm:inline">Planilha</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all relative">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] border border-background" />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 scroll-smooth transition-all duration-500">
        <div>
          {children}
        </div>
      </div>
    </main>
  );
}
