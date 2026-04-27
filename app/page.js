"use client";

import { useState, useMemo } from "react";
import DashboardContent from "@/components/DashboardContent";
import DashboardStats from "@/components/DashboardStats";
import ClientTable from "@/components/ClientTable";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import {
    X, Filter, Search, Trophy, TrendingUp, Video, User,
    Calendar, Building2, Database, ExternalLink, ShieldCheck,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { isClosed, parseRowDate, SCORE_KEYS, parseScore } from "@/lib/utils";
import { clsx } from "clsx";
import CallDetailsModal from "@/components/CallDetailsModal";

export default function Home() {
    const {
        data,
        loading,
        lastUpdated,
        sheetUrl,
        setSheetUrl,
        sheetInputValue,
        setSheetInputValue,
        fetchData,
        closers,
    } = useDashboardContext();

    // Local Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [sdrFilter, setSdrFilter] = useState("all");
    const [meetingFilter, setMeetingFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [hideUseless, setHideUseless] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset pagination on filter change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, sdrFilter, meetingFilter, dateFrom, dateTo, hideUseless]);

    // Memoized Filtered Data
    const filteredData = useMemo(() => {
        const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO", "NI", "NÃO", "N/A", "N.A"];
        
        // 1. Filtragem inicial
        const filtered = data.filter((item) => {
            const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
            const closer = (item["Closer"] || "").toLowerCase();
            const status = (item["Status"] || "").toLowerCase();
            const closed = isClosed(item["Status"]);
            const rowDate = parseRowDate(item["Data"]);

            const matchesSearch = empresa.includes(searchTerm.toLowerCase());
            const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
            const matchesMeeting =
                meetingFilter === "all" ||
                (meetingFilter === "yes" && closed) ||
                (meetingFilter === "no" && !closed);
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
            
            const isBlacklisted = blacklist.includes(closer.toUpperCase()) || blacklist.includes(empresa.toUpperCase());

            // Critérios de "Useless" (Inútil)
            if (hideUseless) {
                // 1. Negociação perdida
                if (status.includes("perdida")) return false;
                
                // 2. Nota inferior a 1 (ou sem todas as notas)
                const scores = SCORE_KEYS.map(k => parseScore(item[k])).filter(s => !isNaN(s));
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    if (avg < 1) return false;
                } else {
                    // Se não tem nenhuma nota e não foi fechado, consideramos inútil?
                    // O usuário pediu "nota inferior a 1", se não tem nota, a média é indefinida.
                    // Vamos filtrar se não tiver nenhuma nota e não estiver fechado.
                    if (!closed) return false;
                }
            }

            return matchesSearch && matchesSdr && matchesMeeting && matchesFrom && matchesTo && !isBlacklisted;
        });

        // 2. Ordenar (mais recente primeiro - baseado na ordem do Sheets/ID)
        const sorted = [...filtered].reverse();

        // 3. Agrupar Duplicatas
        const grouped = [];
        const seen = new Map();

        const normalize = (val) => (val || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

        sorted.forEach((row) => {
            const clientKey = normalize(row["Empresa (Cliente)"]);
            const closerKey = normalize(row["Closer"]);
            const rawDate = (row["Data"] || "").toString().trim();
            let dateKey = normalize(rawDate);
            const parsed = parseRowDate(rawDate);
            if (parsed) {
                const d = new Date(parsed);
                if (!isNaN(d.getTime())) {
                    dateKey = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                }
            }
            const key = `${clientKey}|${closerKey}|${dateKey}`;

            if (!seen.has(key)) {
                const newRow = JSON.parse(JSON.stringify(row));
                newRow._scores = {};
                SCORE_KEYS.forEach(k => {
                    const s = parseScore(row[k]);
                    newRow._scores[k] = !isNaN(s) ? [s] : [];
                });
                seen.set(key, newRow);
                grouped.push(newRow);
            } else {
                const existingRow = seen.get(key);
                
                // Merge Score Data
                SCORE_KEYS.forEach(k => {
                    const s = parseScore(row[k]);
                    if (!isNaN(s)) existingRow._scores[k].push(s);
                });

                // NOVO: Preencher dados faltantes no registro mais recente (existingRow) 
                Object.keys(row).forEach(field => {
                    const currentVal = row[field];
                    const existingVal = existingRow[field];

                    if (!existingVal && currentVal) {
                        existingRow[field] = currentVal;
                    }
                    else if (field.toLowerCase().includes('analise') || field.toLowerCase().includes('observação') || field.toLowerCase().includes('dor') || field.toLowerCase().includes('perfil')) {
                        if (currentVal && existingVal !== currentVal && !existingVal?.toString().includes(currentVal.toString())) {
                            existingRow[field] = `${existingVal}\n\n${currentVal}`;
                        }
                    }
                });
            }
        });

        // 4. Calcular Médias
        return grouped.map(row => {
            const processedRow = { ...row };
            SCORE_KEYS.forEach(k => {
                const scores = row._scores[k];
                if (scores.length > 0) {
                    processedRow[k] = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                }
            });
            delete processedRow._scores;
            return processedRow;
        });
    }, [data, searchTerm, sdrFilter, meetingFilter, dateFrom, dateTo]);

    // Paginated Data
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Memoized Stats
    const stats = useMemo(() => {
        const total = filteredData.length;
        const closedCount = filteredData.filter((row) => isClosed(row["Status"])).length;
        const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

        let scoreSum = 0, scoreCount = 0;
        filteredData.forEach((row) => {
            SCORE_KEYS.forEach((key) => {
                const v = parseScore(row[key]);
                if (!isNaN(v)) {
                    scoreSum += v;
                    scoreCount++;
                }
            });
        });
        const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : "—";

        return { total, closedCount, conversionRate, avgScore };
    }, [filteredData]);

    // Memoized Ranking
    const ranking = useMemo(() => {
        const sdrRank = Object.entries(
            filteredData.reduce((acc, row) => {
                const sdr = row["Closer"] || "Não informado";
                if (!acc[sdr]) acc[sdr] = 0;
                if (isClosed(row["Status"])) acc[sdr] += 1;
                return acc;
            }, {})
        )
            .map(([name, meetings]) => ({ name, meetings }))
            .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name, "pt-BR"));

        return { sdrRank };
    }, [filteredData]);

    // Modal State
    const [rankingModalOpen, setRankingModalOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRow, setModalRow] = useState(null);

    const openModal = (row) => {
        setModalRow(row);
        setModalOpen(true);
    };

    return (
        <>
            <DashboardContent
                loading={loading}
                lastUpdated={lastUpdated}
                onRefresh={() => fetchData(sheetUrl)}
            >
                <div className="w-full space-y-8 py-6 md:py-10 px-4 md:pl-8 md:pr-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black impact-title leading-tight">Performance Geral</h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2"><TrendingUp size={16} className="text-primary" />Monitoramento em tempo real de conversion closers</p>
                        </div>
                        <button onClick={() => setRankingModalOpen(true)} className="group flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-sm hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <Trophy size={18} className="group-hover:scale-110 transition-transform" /> Ver Ranking de Closers
                        </button>
                    </div>

                    <DashboardStats stats={stats} />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            <div className="glass-card p-5 rounded-[2rem] space-y-5">
                                <div className="flex items-center gap-2 mb-2"><Filter size={18} className="text-primary" /><h3 className="text-sm font-bold text-white uppercase tracking-wider">Filtros Avançados</h3></div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Buscar Empresa</label><div className="relative group"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" /><input type="text" placeholder="Ex: Acme Corp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white/10 transition-all" /></div></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Filtrar por Closer</label><select value={sdrFilter} onChange={(e) => setSdrFilter(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"><option value="all" className="bg-[#0f172a]">Todos os Closers</option>{closers.map(s => (<option key={s} value={s} className="bg-[#0f172a]">{s}</option>))}</select></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status da Reunião</label><select value={meetingFilter} onChange={(e) => setMeetingFilter(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"><option value="all" className="bg-[#0f172a]">Todos os Status</option><option value="yes" className="bg-[#0f172a]">Fechado/Vendido</option><option value="no" className="bg-[#0f172a]">Pendente/Outros</option></select></div>
                                    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Início</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 [color-scheme:dark]" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Fim</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 [color-scheme:dark]" /></div></div>
                                    
                                    <div className="pt-2">
                                        <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all select-none">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Limpeza Automática</span>
                                                <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Ocultar calls sem utilidade</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={hideUseless}
                                                    onChange={(e) => setHideUseless(e.target.checked)}
                                                />
                                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="lg:col-span-9 space-y-6">
                            <section className="glass-card rounded-[2.5rem] border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-3xl shadow-2xl overflow-hidden relative">
                                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"><h3 className="text-xl font-black text-white uppercase italic tracking-tight">Fluxo de Reuniões</h3><div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Database ativo</div></div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-y border-white/5 backdrop-blur-md">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span></div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"><ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />Anterior</button>
                                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group">Próximo<ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></button>
                                        </div>
                                    </div>
                                )}
                                <ClientTable data={paginatedData} onOpenModal={openModal} />
                            </section>
                        </div>
                    </div>
                </div>
            </DashboardContent>

            {rankingModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md">
                    <div className="glass-card max-w-2xl w-full max-h-[80vh] flex flex-col rounded-[2.5rem] border border-white/10 relative reveal-rise overflow-hidden">
                        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3"><Trophy size={28} className="text-amber-400" /><h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Hall da Fama</h3></div>
                            <button onClick={() => setRankingModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            <div><h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">🏆 Melhores em Conversão</h4><div className="space-y-3">{ranking.sdrRank.map((item, idx) => (<div key={item.name} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 group hover:border-primary/30 transition-all"><div className="flex items-center gap-4"><span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-orange-400/20 text-orange-400'}`}>{idx + 1}</span><span className="text-sm font-bold text-slate-200">{item.name}</span></div><div className="text-right"><span className="text-sm font-black text-white">{item.meetings}</span><span className="text-[10px] text-slate-500 block font-bold uppercase tracking-widest">Fechamentos</span></div></div>))}</div></div>
                        </div>
                        <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center"><button onClick={() => setRankingModalOpen(false)} className="text-xs font-bold text-slate-500 hover:text-white uppercase transition-colors">Fechar Ranking</button></div>
                    </div>
                </div>
            )}

            <CallDetailsModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                row={modalRow} 
            />
        </>
    );
}
