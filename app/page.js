"use client";

import { useState, useMemo } from "react";
import DashboardContent from "@/components/DashboardContent";
import DashboardStats from "@/components/DashboardStats";
import SatisfactionChart from "@/components/SatisfactionChart";
import ClientTable from "@/components/ClientTable";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import {
    X, Filter, Search, Trophy, TrendingUp, Video, User,
    Calendar, Building2, Database, ExternalLink, ShieldCheck,
    MousePointer2, Ban, Lightbulb, Mic2, Scale, FileText, Target, Activity, Award, Zap, Flame,
    ChevronLeft, ChevronRight, Copy, Check
} from "lucide-react";
import { formatDateTime, isClosed, parseRowDate, SCORE_KEYS, parseScore } from "@/lib/utils";
import { clsx } from "clsx";

const TranscriptRenderer = ({ text }) => {
    if (!text) return null;

    // Parser to group lines and detect tables
    const blocks = useMemo(() => {
        const result = [];
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let currentTable = null;

        lines.forEach(line => {
            if (line.startsWith('|')) {
                // Skip separator rows (|---|---|)
                if (line.includes('---')) return;
                
                if (!currentTable) {
                    currentTable = { type: 'table', headers: [], rows: [] };
                    result.push(currentTable);
                }
                
                const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
                
                if (currentTable.headers.length === 0) {
                    currentTable.headers = cells;
                } else {
                    currentTable.rows.push(cells);
                }
            } else {
                currentTable = null;
                result.push({ type: 'line', content: line });
            }
        });
        return result;
    }, [text]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {blocks.map((block, idx) => {
                if (block.type === 'table') {
                    return (
                        <div key={idx} className="my-8 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl reveal-rise">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            {block.headers.map((h, i) => (
                                                <th key={i} className="px-6 py-4 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                                    {h.replace(/\*\*/g, '')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {block.rows.map((row, i) => (
                                            <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                                                {row.map((cell, j) => {
                                                    const cleanCell = cell.replace(/\*\*/g, '');
                                                    const isScore = cleanCell.includes('/10');
                                                    const isPercentage = cleanCell.includes('%');
                                                    return (
                                                        <td key={j} className="px-6 py-4">
                                                            <span className={clsx(
                                                                "text-xs font-medium",
                                                                isScore || isPercentage ? "text-white font-bold" : "text-slate-300",
                                                                isScore && !cleanCell.startsWith('0/') && "text-emerald-400"
                                                            )}>
                                                                {cleanCell}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                }

                const line = block.content;
                const cleanLine = line.replace(/\*\*/g, '');
                
                // Header 1 (e.g., # Title)
                if (line.startsWith('# ')) {
                    return <h2 key={idx} className="text-2xl font-black text-white mt-8 mb-4 border-b border-primary/20 pb-2 uppercase italic tracking-tight">{line.replace('# ', '')}</h2>;
                }
                
                // Header 2/3 (e.g., ### Section)
                if (line.startsWith('### ') || line.startsWith('## ')) {
                    const content = line.replace(/^#+ /, '');
                    let colorClass = "text-primary";
                    if (content.toLowerCase().includes("dor")) colorClass = "text-amber-400";
                    if (content.toLowerCase().includes("plano") || content.toLowerCase().includes("ação")) colorClass = "text-emerald-400";
                    if (content.toLowerCase().includes("objetivo")) colorClass = "text-red-400";
                    
                    return <h3 key={idx} className={clsx("text-base font-black uppercase tracking-[0.2em] mt-6 mb-2 flex items-center gap-3", colorClass)}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {content}
                    </h3>;
                }

                // Callouts or Key Points (Special formatting for very short bold lines)
                if (line.startsWith('**') && line.endsWith('**') && line.length < 100) {
                    return <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl mb-2 font-bold text-slate-200 text-sm">
                        {cleanLine}
                    </div>;
                }

                // Bullet points
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    return (
                        <div key={idx} className="flex gap-3 ml-4 mb-1 group">
                            <span className="text-primary mt-1 opacity-50 group-hover:opacity-100 transition-opacity">•</span>
                            <span className="text-slate-300 leading-relaxed text-sm">{cleanLine.replace(/^[*|-] /, '')}</span>
                        </div>
                    );
                }

                // Quotes
                if (line.startsWith('> ')) {
                    return <blockquote key={idx} className="border-l-2 border-primary/20 pl-4 my-4 italic text-slate-400 leading-relaxed text-sm font-medium">
                        {cleanLine.replace(/^> /, '')}
                    </blockquote>;
                }

                // Regular text
                return <p key={idx} className="text-slate-300 leading-relaxed mb-2 text-sm font-medium opacity-80">{cleanLine}</p>;
            })}
        </div>
    );
};

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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset pagination on filter change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, sdrFilter, meetingFilter, dateFrom, dateTo]);

    // Memoized Filtered Data
    const filteredData = useMemo(() => {
        const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO"];
        
        // 1. Filtragem inicial
        const filtered = data.filter((item) => {
            const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
            const closer = (item["Closer"] || "").toLowerCase();
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

            return matchesSearch && matchesSdr && matchesMeeting && matchesFrom && matchesTo && !isBlacklisted;
        });

        // 2. Ordenar (mais recente primeiro)
        const sorted = [...filtered].sort((a, b) => {
            const dateA = parseRowDate(a["Data"]) || 0;
            const dateB = parseRowDate(b["Data"]) || 0;
            return dateB - dateA;
        });

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
                SCORE_KEYS.forEach(k => {
                    const s = parseScore(row[k]);
                    if (!isNaN(s)) existingRow._scores[k].push(s);
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
    const [showRecording, setShowRecording] = useState(false);
    const [recordingType, setRecordingType] = useState("docs"); // "docs" or "tactiq"
    const [transcript, setTranscript] = useState("");
    const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [justificationModal, setJustificationModal] = useState(null);

    const SCORE_ANALYSIS_MAP = {
        "Adesão ao Script": ["Script Analise", "Adesao Analise", "AdesÃ£o Analise"],
        "Conexão/Rapport": ["Rapport analise", "Rapport Analise", "Rapport analise"],
        "Apres. Autoridade": ["Autoridade Analise", "Autoridade analise", "ApresentaÃ§Ã£o Analise"],
        "Entendimento Dores": ["Dores Analise", "Dores analise", "Dores Analise"],
        "Apres. Solução": ["Solução Analise", "Solucao Analise", "Solução analise", "SoluÃ§Ã£o Anallise"],
        "Pitch": ["Pitch analise", "Pitch Analise", "Pitch analise"],
        "Negociação": ["Negociação Analise", "Negociacao Analise", "NegociaÃ§Ã£o Analise"],
        "Fechamento": ["Fechamento Analise", "Fechamento analise", "Fechamento Analise"],
        "Confiança": ["Confiança Analise", "Confianca Analise", "ConfianÃ§a analise"],
        "CTA": ["Cta Analise", "CTA Analise", "CTA analise", "Cta Analise"],
        "Objeções": ["Objeções Analise", "Objecoes Analise", "ObjeÃ§Ãµes Analise"],
    };

    const openModal = (row) => {
        setModalRow(row);
        setModalOpen(true);
        setShowRecording(false);
        setTranscript("");
    };

    const fetchTranscript = async (url) => {
        if (!url || transcript) return;
        setIsLoadingTranscript(true);
        try {
            const response = await fetch(`/api/transcript?url=${encodeURIComponent(url)}`);
            if (response.ok) {
                const text = await response.text();
                setTranscript(text);
            } else {
                setTranscript("Não foi possível carregar a transcrição. Verifique se o documento está público.");
            }
        } catch (error) {
            setTranscript("Erro ao conectar com o servidor.");
        } finally {
            setIsLoadingTranscript(false);
        }
    };

    const handleToggleRecording = (type = "docs") => {
        const isSameType = showRecording && recordingType === type;
        const nextState = !isSameType;
        
        setShowRecording(nextState);
        setRecordingType(type);

        if (nextState) {
            setTranscript("");
            const url = type === "docs" 
                ? modalRow["Transcrição Completa"] 
                : modalRow["Transcrição completa - Tqctiq"];
            
            if (url) {
                fetchTranscript(url);
            }
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(transcript);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
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
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Pesquisar</label>
                                        <div className="relative group">
                                            <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors", searchTerm ? "text-primary" : "text-slate-500")} />
                                            <input
                                                type="text"
                                                placeholder="Empresa ou Closer..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 placeholder-slate-600 transition-all"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm("")}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
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
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Status da Call</label>
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

                                    {(dateFrom || dateTo || sdrFilter !== "all" || meetingFilter !== "all" || searchTerm) && (
                                        <button
                                            onClick={() => { setDateFrom(""); setDateTo(""); setSdrFilter("all"); setMeetingFilter("all"); setSearchTerm(""); }}
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

                                {/* Pagination Controls (Top) */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-y border-white/5 backdrop-blur-md">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                                            >
                                                <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                                                Anterior
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                                            >
                                                Próximo
                                                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <ClientTable data={paginatedData} onOpenModal={openModal} />
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
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                            {showRecording ? (
                                <div className="w-full min-h-[500px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-12 relative overflow-hidden backdrop-blur-sm">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -ml-32 -mb-32" />

                                    <div className="relative z-10 max-w-3xl mx-auto">
                                        <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "p-3 rounded-2xl",
                                                    recordingType === "tactiq" ? "bg-indigo-500/10" : "bg-primary/10"
                                                )}>
                                                    <FileText className={recordingType === "tactiq" ? "text-indigo-400" : "text-primary"} size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-white tracking-tight uppercase italic">
                                                        {recordingType === "tactiq" ? "Transcrição Tactiq" : "Transcrição da Call"}
                                                    </h2>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Extraído automaticamente do sistema</p>
                                                </div>
                                            </div>
                                            
                                            {transcript && !isLoadingTranscript && (
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => setShowRecording(false)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 transition-all"
                                                    >
                                                        <X size={14} />
                                                        Fechar Transcrição
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={handleCopy}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                                    >
                                                        {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                        {isCopied ? "Copiado!" : "Copiar Texto"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isLoadingTranscript ? (
                                            <div className="space-y-6">
                                                <div className="h-8 bg-white/5 rounded-lg w-3/4 animate-pulse" />
                                                <div className="space-y-3">
                                                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                                                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                                                    <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                                                </div>
                                                <div className="h-32 bg-white/5 rounded-2xl w-full animate-pulse" />
                                                <div className="space-y-3">
                                                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                                                    <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse" />
                                                </div>
                                            </div>
                                        ) : (
                                            <TranscriptRenderer text={transcript} />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    {/* Left Column */}
                                    <div className="lg:col-span-4 space-y-8">
                                        {modalRow["Dores do Cliente"] && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <Flame size={12} /> Dores do Cliente
                                                </h4>
                                                <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl min-h-[120px]">
                                                    <p className="text-sm text-slate-300 leading-relaxed font-bold">{modalRow["Dores do Cliente"]}</p>
                                                </div>
                                            </div>
                                        )}
                                        {modalRow["Status"] && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <Activity size={12} /> Status / Resumo
                                                </h4>
                                                <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl min-h-[120px]">
                                                    <p className="text-sm text-primary leading-relaxed font-black uppercase italic">
                                                        {modalRow["Status"]}
                                                    </p>
                                                    {modalRow["Conclusão"] && (
                                                        <p className="mt-4 text-xs text-slate-400 font-medium border-t border-white/5 pt-4">
                                                            {modalRow["Conclusão"]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {(modalRow["Perfil"] || modalRow["comentarioGestor"]) && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <User size={12} /> Perfil & Gestão
                                                </h4>
                                                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                                                    {modalRow["Perfil"] && (
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Perfil do Cliente</span>
                                                            <p className="text-xs text-slate-300 font-bold">{modalRow["Perfil"]}</p>
                                                        </div>
                                                    )}
                                                    {modalRow["comentarioGestor"] && (
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Feedback do Gestor</span>
                                                            <p className="text-xs text-slate-300 font-medium italic">{modalRow["comentarioGestor"]}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column */}
                                    <div className="lg:col-span-8 space-y-6">
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
                                                    val >= 8 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" :
                                                        val >= 6 ? "text-primary border-primary/20 bg-primary/5 hover:bg-primary/10" :
                                                            val >= 4 ? "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10" :
                                                                "text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10";
                                                
                                                const handleCardClick = () => {
                                                    const possibleKeys = SCORE_ANALYSIS_MAP[key] || [];
                                                    const content = possibleKeys.reduce((acc, k) => acc || modalRow[k], null);
                                                    if (content) {
                                                        setJustificationModal({ title: key, content });
                                                    }
                                                };

                                                return (
                                                    <div 
                                                        key={key} 
                                                        onClick={handleCardClick}
                                                        className={clsx(
                                                            "p-4 rounded-2xl border flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 group relative overflow-hidden cursor-pointer", 
                                                            colorClass
                                                        )}
                                                    >
                                                        <div className="p-2 mb-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">{icon}</div>
                                                        <div className="text-xl font-black">{isNumeric ? val : "—"}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest mt-1 text-center opacity-70 leading-tight">{key}</div>
                                                        {isNumeric && (
                                                            <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 w-full">
                                                                <div className="h-full bg-current" style={{ width: `${val * 10}%` }} />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Lightbulb size={10} className="text-white/40" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex flex-wrap items-center gap-4">
                                {modalRow["Transcrição Completa"] ? (
                                    <>
                                        <button 
                                            onClick={() => handleToggleRecording("docs")}
                                            className={clsx(
                                                "group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg",
                                                showRecording && recordingType === "docs"
                                                    ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                                                    : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                            )}
                                        >
                                            <FileText size={16} className={clsx("transition-transform", showRecording && recordingType === "docs" ? "rotate-180" : "group-hover:scale-110")} />
                                            {showRecording && recordingType === "docs" ? "Voltar para Detalhes" : "Transcrição Docs"}
                                        </button>
                                        
                                        <a 
                                            href={modalRow["Transcrição Completa"]} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-3 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                                            title="Abrir Google Docs"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </>
                                ) : (
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <Search size={14} /> Nenhuma gravação disponível
                                    </div>
                                )}

                                {modalRow["Transcrição completa - Tqctiq"] && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleToggleRecording("tactiq")}
                                            className={clsx(
                                                "group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg",
                                                showRecording && recordingType === "tactiq"
                                                    ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                                                    : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                            )}
                                        >
                                            <ExternalLink size={16} className={clsx("transition-transform", showRecording && recordingType === "tactiq" ? "rotate-180" : "group-hover:scale-110")} />
                                            {showRecording && recordingType === "tactiq" ? "Voltar para Detalhes" : "Transcrição Tactiq"}
                                        </button>

                                        <a 
                                            href={modalRow["Transcrição completa - Tqctiq"]} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-3 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                                            title="Abrir Site do Tactiq"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                )}
                            </div>
                            
                            <button onClick={() => setModalOpen(false)} className="px-10 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-all">
                                Fechar Painel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Justification Modal */}
            {justificationModal && (
                <div 
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setJustificationModal(null)}
                >
                    <div 
                        className="glass-card max-w-lg w-full p-8 rounded-[2.5rem] border border-white/20 shadow-2xl reveal-rise relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setJustificationModal(null)}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-500 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Lightbulb size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Justificativa da Nota</h3>
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{justificationModal.title}</h2>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl min-h-[150px] flex items-center">
                            <p className="text-base text-slate-200 leading-relaxed font-medium">
                                {justificationModal.content}
                            </p>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={() => setJustificationModal(null)}
                                className="px-8 py-3 rounded-2xl bg-primary/20 text-primary border border-primary/30 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
