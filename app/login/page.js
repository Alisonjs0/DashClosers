"use client";

import { useState } from "react";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Lock, User as UserIcon } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useDashboardContext();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(username, password);
    if (result.success) {
      router.push("/");
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 bg-grid-white/[0.02]">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-cyan-500/10 pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        {/* Decorative elements */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />

        <div className="glass-card p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-float mb-6">
              <Zap size={32} className="text-white fill-current" />
            </div>
            <h1 className="text-3xl font-black impact-title text-white tracking-tight">DASH CLOSERS</h1>
            <p className="text-slate-500 text-sm font-medium mt-2">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest">Usuário</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm text-slate-200 placeholder-slate-600 transition-all outline-none"
                  placeholder="Seu usuário"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm text-slate-200 placeholder-slate-600 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          SDR Performance Platform © 2026
        </p>
      </div>
    </div>
  );
}
