"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { Settings, Database, RefreshCcw, Save, ShieldCheck, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { 
    sheetUrl, 
    setSheetUrl, 
    sheetInputValue, 
    setSheetInputValue, 
    loading, 
    lastUpdated, 
    fetchData,
    data
  } = useDashboardContext();

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!sheetInputValue.trim()) return;
    setSheetUrl(sheetInputValue.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardContent
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={() => fetchData(sheetUrl)}
      title="Configurações e Sincronização"
    >
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Settings Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-black impact-title leading-tight">Painel de Controle</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Gestão de fontes de dados e configurações críticas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-8">
            {/* Primary Source Card */}
            <div className="glass-card p-10 rounded-[3rem] border border-white/5 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xl">
                  <Database size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Google Sheets</h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Fonte principal de dados</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">URL da Planilha</label>
                <div className="relative group">
                   <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetInputValue}
                    onChange={(e) => setSheetInputValue(e.target.value)}
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-3xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-sm text-slate-200 placeholder-slate-700 transition-all font-medium pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-xl border border-white/5">
                    <Database size={16} className="text-slate-600" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                  <Info size={12} className="text-primary" />
                  Certifique-se que a planilha está publicada na web como CSV
                </p>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <Save size={18} />
                  Salvar Configuração
                </button>
                {saved && (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">
                    <CheckCircle2 size={16} />
                    Configuração Salva!
                  </div>
                )}
              </div>
            </div>

            {/* Logs/Status Card */}
            <div className="glass-card p-10 rounded-[3rem] border border-white/10 bg-white/[0.01]">
               <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-8">Status do Sistema</h3>
               <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sincronização Automática</span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Ativa (30s)</span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registros Detectados</span>
                    <span className="text-sm font-black text-white">{data.length} entradas</span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Última Resposta API</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">200 OK - {lastUpdated?.toLocaleTimeString()}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-primary/5 space-y-4">
               <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg">
                  <Info size={20} />
               </div>
               <h4 className="text-sm font-black text-white uppercase tracking-widest">Ajuda e Suporte</h4>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">
                 Para conectar novas planilhas, utilize o formato de compartilhamento público ou exportação CSV do Google Sheets.
               </p>
               <button className="w-full py-4 text-[10px] font-black text-primary uppercase tracking-[0.2em] border border-primary/20 rounded-2xl hover:bg-primary/10 transition-all">
                 Documentação Completa
               </button>
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 space-y-4 bg-red-500/[0.02]">
               <div className="w-10 h-10 rounded-2xl bg-red-400/10 flex items-center justify-center text-red-400 border border-red-400/20 shadow-lg">
                  <AlertCircle size={20} />
               </div>
               <h4 className="text-sm font-black text-white uppercase tracking-widest text-red-200">Zerar Memória</h4>
               <p className="text-xs text-slate-500 leading-relaxed font-medium">
                 Limpa o cache local e reseta todas as configurações para os valores de fábrica.
               </p>
               <button className="w-full py-4 text-[10px] font-black text-red-400 uppercase tracking-[0.2em] border border-red-400/10 rounded-2xl hover:bg-red-400/10 transition-all">
                 Resetar Dash
               </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}
