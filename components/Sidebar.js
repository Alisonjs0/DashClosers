"use client";

import { LayoutDashboard, Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Zap, Grid, Flame, FileBarChart, X, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Histórico", id: "overview", href: "/", roles: ["ADMIN"] },
  { icon: LayoutDashboard, label: "Histórico CS", id: "historico-cs", href: "/historico-cs", roles: ["CS"] },
  { icon: Grid, label: "Panorama", id: "panorama", href: "/panorama", roles: ["ADMIN"] },
  { icon: Flame, label: "Dores", id: "dores", href: "/dores", roles: ["ADMIN"] },
  { icon: ShieldAlert, label: "Objeções", id: "objecoes", href: "/objecoes", roles: ["ADMIN"] },
  { icon: Users, label: "Closers", id: "closers", href: "/closers", roles: ["ADMIN"] },
  { icon: BarChart3, label: "Análise", id: "analytics", href: "/analise", roles: ["ADMIN"] },
  { icon: FileBarChart, label: "Relatórios", id: "relatorios", href: "/relatorios", roles: ["ADMIN"] },
  { icon: Settings, label: "Configurações", id: "settings", href: "/configuracoes", roles: ["ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isMobileMenuOpen, setIsMobileMenuOpen } = useDashboardContext();

  const filteredMenuItems = MENU_ITEMS.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen w-64 transition-transform duration-300 z-50 bg-[#020617] md:bg-card/30 md:backdrop-blur-2xl flex flex-col border-r border-white/5",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-float">
              <Zap size={18} className="text-white fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight impact-title">Dash Closers</span>
          </div>
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 space-y-2">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon size={20} className={clsx(isActive ? "text-primary" : "group-hover:text-slate-200")} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-l-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Section */}
      <div className="p-4 border-t border-white/5">
        {user && (
            <div className="px-4 py-3 bg-white/5 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
                </div>
                <LogOut 
                  size={14} 
                  className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors" 
                  onClick={logout}
                />
            </div>
        )}
      </div>
    </aside>
    </>
  );
}
