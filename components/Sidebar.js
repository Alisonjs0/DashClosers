"use client";

import { LayoutDashboard, Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Zap, Grid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Histórico", id: "overview", href: "/" },
  { icon: Grid, label: "Panorama", id: "panorama", href: "/panorama" },
  { icon: Users, label: "Closers", id: "closers", href: "/closers" },
  { icon: BarChart3, label: "Análise", id: "analytics", href: "/analise" },
  { icon: Settings, label: "Configurações", id: "settings", href: "/configuracoes" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen transition-all duration-300 z-50 border-r border-white/5 bg-card/30 backdrop-blur-2xl flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-float">
          <Zap size={18} className="text-white fill-current" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight impact-title">Dash Closers</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 space-y-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon size={20} className={clsx(isActive ? "text-primary" : "group-hover:text-slate-200")} />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
              {isActive && (
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-l-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Section */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all mb-4"
        >
          {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-3"><ChevronLeft size={20} /> <span className="text-sm font-medium">Recolher</span></div>}
        </button>
        
        {!collapsed && (
            <div className="px-4 py-3 bg-white/5 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-xs font-bold text-white uppercase">
                    AC
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">Admin Closers</p>
                    <p className="text-[10px] text-slate-500 truncate">SDR Platform</p>
                </div>
                <LogOut size={14} className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors" />
            </div>
        )}
      </div>
    </aside>
  );
}
