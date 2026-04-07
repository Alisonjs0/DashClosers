"use client";

import { useState } from "react";
import DashboardContent from "@/components/DashboardContent";
import DashboardStats from "@/components/DashboardStats";
import SatisfactionChart from "@/components/SatisfactionChart";
import ClientTable from "@/components/ClientTable";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import { 
    X, Filter, Search, Trophy, TrendingUp, PhoneCall, User, 
    Calendar, Building2, Database, ExternalLink, ShieldCheck, 
    MousePointer2, Ban, Lightbulb, Mic2, Scale, FileText, Target, Activity, Award, Zap
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { clsx } from "clsx";

export default function Home() {
    const {
        filteredData,
        loading,
        lastUpdated,
        sheetUrl,
        setSheetUrl,
        sheetInputValue,
        setSheetInputValue,
        searchTerm,
        setSearchTerm,
        sdrFilter,
        setSdrFilter,
        meetingFilter,
        setMeetingFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        fetchData,
        stats,
        ranking,
        closers,
    } = useDashboardContext();

    // Modal State
    const [rankingModalOpen, setRankingModalOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRow, setModalRow] = useState(null);

    const openModal = (row) => {
        setModalRow(row);
        setModalOpen(true);
    };

    const handleLoadSheet = () => {
        if (!sheetInputValue.trim()) return;
        setSheetUrl(sheetInputValue.trim());
    };

    return (
        <>
            <DashboardContent
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={() => fetchData(sheetUrl)}
        >
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black impact-title leading-tight">
                            Performance Geral
                        </h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary" />
                            Monitoramento em tempo real de conversion closers
                        </p>
                    </div>
                    
                    <button
                        onClick={() => setRankingModalOpen(true)}
                        className="group flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-sm hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    >
                        <Trophy size={18} className="group-hover:scale-110 transition-transform" />
                        Ver Ranking de Closers
                    </button>
                </div>

                {/* Stats Grid */}
                <DashboardStats stats={stats} />

                {/* Main Grid: Filters + Chart + Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Filters & Chart */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Filter Card */}
                        <div className="glass-card p-6 rounded-[2rem] space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Filter size={18} className="text-primary" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filtros Avançados</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Closer</label>
                                    <select
                                        value={sdrFilter}
                                        onChange={(e) => setSdrFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 appearance-none cursor-pointer"
                                    >
                                        <option value="all" className="bg-[#0f172a]">Todos os Closers</option>
                                        {closers.map(s => (
                                            <option key={s} value={s} className="bg-[#0f172a]">{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Status da Ligação</label>
                                    <select
                                        value={meetingFilter}
                                        onChange={(e) => setMeetingFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 appearance-none cursor-pointer"
                                    >
                                        <option value="all" className="bg-[#0f172a]">Todos os Status</option>
                                        <option value="yes" className="bg-[#0f172a]">Apenas Fechados</option>
                                        <option value="no" className="bg-[#0f172a]">Não Fechados</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">De</label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Até</label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {(dateFrom || dateTo || sdrFilter !== "all" || meetingFilter !== "all") && (
                                    <button 
                                        onClick={() => { setDateFrom(""); setDateTo(""); setSdrFilter("all"); setMeetingFilter("all"); }}
                                        className="w-full py-2 text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors"
                                    >
                                        Resetar Filtros
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Chart Card */}
                        <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center">
                            <h3 className="w-full text-sm font-bold text-white uppercase tracking-wider mb-6 text-center">Taxa de Conversão</h3>
                            <SatisfactionChart data={filteredData} />
                        </div>
                    </div>

                    {/* Right Column: Table */}
                    <div className="lg:col-span-2">
                        <section className="space-y-4">
                             <div className="flex items-center justify-between px-4">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Registros Recentes</h2>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    {filteredData.length} entradas encontradas
                                </span>
                             </div>
                            <ClientTable data={filteredData} onOpenModal={openModal} />
                        </section>
                    </div>
                </div>
            </div>

        </DashboardContent>

        {/* Portals / Modals (Must stay outside animated containers to maintain fixed positioning) */}
        {/* Ranking Modal */}
        {rankingModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md">
                <div className="glass-card max-w-2xl w-full max-h-[80vh] flex flex-col rounded-[2.5rem] border border-white/10 relative reveal-rise overflow-hidden">
                    <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <Trophy size={28} className="text-amber-400" />
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Hall da Fama</h3>
                        </div>
                        <button onClick={() => setRankingModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">🏆 Melhores em Conversão</h4>
                            <div className="space-y-3">
                                {ranking.sdrRank.map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 group hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-orange-400/20 text-orange-400'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-bold text-slate-200">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-white">{item.meetings}</span>
                                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-widest">Fechamentos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
                        <button onClick={() => setRankingModalOpen(false)} className="text-xs font-bold text-slate-500 hover:text-white uppercase transition-colors">
                            Fechar Ranking
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Row Detail Modal */}
        {modalOpen && modalRow && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
                <div className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col rounded-[2.5rem] border border-white/10 relative reveal-rise overflow-hidden shadow-[0_0_80px_rgba(30,58,138,0.3)]">
                    {/* Header Area */}
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                                    <Building2 size={24} className="text-primary" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight leading-none uppercase italic">{modalRow["Empresa (Cliente)"]}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                    <User size={12} className="text-primary" /> {modalRow["Closer"]}
                                </span>
                                <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                    <Calendar size={12} className="text-primary" /> {formatDateTime(modalRow["Data"])}
                                </span>
                            </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border shadow-lg",
                                (modalRow["Status"] || "").toLowerCase().includes("fechado") || (modalRow["Status"] || "").toLowerCase().includes("vendido")
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10"
                                    : (modalRow["Status"] || "").toLowerCase().includes("pendente")
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10"
                                        : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10"
                            )}>
                                {modalRow["Status"] || "Sem Status"}
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-3 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-all bg-white/5 border border-white/5">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Left Column */}
                            <div className={(modalRow["Resultado Final"] || modalRow["Objeções"]) ? "lg:col-span-4 space-y-8" : "hidden"}>
                                {modalRow["Resultado Final"] && !isNaN(parseFloat(modalRow["Resultado Final"])) === false && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                            <PhoneCall size={12} /> Resumo Executivo
                                        </h4>
                                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                            <p className="text-sm text-slate-300 leading-relaxed italic font-medium">"{modalRow["Resultado Final"]}"</p>
                                        </div>
                                    </div>
                                )}
                                {modalRow["Objeções"] && isNaN(parseFloat(modalRow["Objeções"])) && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Ban size={12} /> Objeções Reportadas
                                        </h4>
                                        <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-3xl">
                                            <p className="text-sm text-slate-400 font-medium">{modalRow["Objeções"]}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className={clsx((modalRow["Resultado Final"] || modalRow["Objeções"]) ? "lg:col-span-8" : "lg:col-span-12", "space-y-6")}>
                                <div className="flex items-center gap-3 mb-6">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Competências Avaliadas</h4>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[
                                        { key: "Adesão ao Script", icon: <FileText size={16} /> },
                                        { key: "Conexão/Rapport", icon: <Zap size={16} /> },
                                        { key: "Apres. Autoridade", icon: <Award size={16} /> },
                                        { key: "Entendimento Dores", icon: <Activity size={16} /> },
                                        { key: "Apres. Solução", icon: <Lightbulb size={16} /> },
                                        { key: "Pitch", icon: <Mic2 size={16} /> },
                                        { key: "Negociação", icon: <Scale size={16} /> },
                                        { key: "Fechamento", icon: <Target size={16} /> },
                                        { key: "Confiança", icon: <ShieldCheck size={16} /> },
                                        { key: "CTA", icon: <MousePointer2 size={16} /> },
                                        { key: "Objeções", icon: <Ban size={16} /> },
                                    ].map(({ key, icon }) => {
                                        const val = parseFloat(String(modalRow[key] ?? "").replace(",", "."));
                                        const isNumeric = !isNaN(val);
                                        const colorClass = !isNumeric ? "text-slate-600 border-slate-900 bg-black/20" :
                                            val >= 8 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                            val >= 6 ? "text-primary border-primary/20 bg-primary/5" :
                                            val >= 4 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                                            "text-red-400 border-red-500/20 bg-red-500/5";
                                        return (
                                            <div key={key} className={clsx("p-4 rounded-2xl border flex flex-col items-center justify-center transition-all hover:scale-105 group relative overflow-hidden", colorClass)}>
                                                <div className="p-2 mb-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">{icon}</div>
                                                <div className="text-xl font-black">{isNumeric ? val : "—"}</div>
                                                <div className="text-[8px] font-black uppercase tracking-widest mt-1 text-center opacity-70 leading-tight">{key}</div>
                                                {isNumeric && (
                                                    <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 w-full">
                                                        <div className="h-full bg-current" style={{ width: `${val * 10}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6">
                        {modalRow["Transcrição Completa"] ? (
                            <a href={modalRow["Transcrição Completa"]} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-black text-xs uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                <Database size={16} className="group-hover:rotate-12 transition-transform" />
                                Acessar Gravadora Completa
                                <ExternalLink size={14} />
                            </a>
                        ) : (
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                <Search size={14} /> Nenhuma transcrição disponível no momento
                            </div>
                        )}
                        <button onClick={() => setModalOpen(false)} className="px-10 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-all">
                            Fechar Painel de Detalhes
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
}
