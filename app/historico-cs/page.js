"use client";

import { useState, useMemo } from "react";
import DashboardContent from "@/components/DashboardContent";
import ClientTable from "@/components/ClientTable";
import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import {
    X, Filter, Search, User,
    Calendar, Building2, Flame,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { formatDateTime, parseRowDate } from "@/lib/utils";
import { clsx } from "clsx";

export default function HistoricoCS() {
    const {
        data,
        loading,
        lastUpdated,
        sheetUrl,
        fetchData,
        user
    } = useDashboardContext();

    // Local Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset pagination on filter change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo]);

    // Memoized Filtered Data (Same logic as home but simplified for CS)
    const filteredData = useMemo(() => {
        const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO"];
        
        // 2. Sort by date and row index (descending)
        const sorted = data.map((item, index) => ({ ...item, _originalIndex: index }))
            .filter((item) => {
                const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
                const rowDate = parseRowDate(item["Data"]);
                const matchesSearch = empresa.includes(searchTerm.toLowerCase());
                const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
                const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
                const isBlacklisted = blacklist.includes(empresa.toUpperCase());
                return matchesSearch && matchesFrom && matchesTo && !isBlacklisted;
            })
            .sort((a, b) => {
                const dateA = parseRowDate(a["Data"]) || 0;
                const dateB = parseRowDate(b["Data"]) || 0;
                
                // Se as datas forem iguais, usa o índice original da planilha (mais baixo = mais recente no sentido de inserção)
                if (dateB === dateA) {
                    return b._originalIndex - a._originalIndex;
                }
                return dateB - dateA;
            });

        // 3. Group Duplicates (Same Client, Closer, and Date)
        const grouped = [];
        const seen = new Map();

        sorted.forEach((row) => {
            const normalize = (val) => {
                const clean = (val || "").toString().split(/[\s-]+-|[\s-]\(/)[0].trim();
                return clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
            };
            
            const clientKey = normalize(row["Empresa (Cliente)"]);
            const closerKey = normalize(row["Closer"]);
            const rawDate = (row["Data"] || "").toString().trim();
            const parsed = parseRowDate(rawDate);
            let dateKey = normalize(rawDate);
            if (parsed) {
                const d = new Date(parsed);
                dateKey = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
            }

            const groupKey = `${clientKey}_${closerKey}_${dateKey}`;

            if (seen.has(groupKey)) {
                const existingIndex = seen.get(groupKey);
                const baseRow = grouped[existingIndex];
                
                // Merge data: Fill missing values in baseRow from current row
                Object.keys(row).forEach(key => {
                    const currentVal = row[key];
                    const baseVal = baseRow[key];

                    // If baseRow is missing this info, take it from current row
                    if (!baseVal && currentVal) {
                        baseRow[key] = currentVal;
                    } 
                    // Priorizar status de fechamento
                    else if (key === "Status" && isClosed(currentVal) && !isClosed(baseVal)) {
                        baseRow[key] = currentVal;
                    }
                    // If it's analytical/text content, merge if they are different
                    else if (key.toLowerCase().includes('analise') || key.toLowerCase().includes('observação') || key.toLowerCase().includes('dor') || key.toLowerCase().includes('perfil')) {
                        if (currentVal && baseVal !== currentVal && !baseVal.includes(currentVal)) {
                            baseRow[key] = `${baseVal}\n\n${currentVal}`;
                        }
                    }
                });
            } else {
                seen.set(groupKey, grouped.length);
                grouped.push({ ...row });
            }
        });

        return grouped;
    }, [data, searchTerm, dateFrom, dateTo]);

    // Paginated Data
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Modal State
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
                <div className="w-full space-y-8 py-10 pl-8 pr-10">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black impact-title leading-tight">
                                Histórico CS
                            </h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2">
                                <Search size={16} className="text-primary" />
                                Visualização restrita de informações do cliente
                            </p>
                        </div>
                    </div>

                    {/* Main Grid: Filters + Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Filter Column */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="glass-card p-5 rounded-[2rem] space-y-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Filter size={18} className="text-primary" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filtros</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Pesquisar Empresa</label>
                                        <div className="relative group">
                                            <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors", searchTerm ? "text-primary" : "text-slate-500")} />
                                            <input
                                                type="text"
                                                placeholder="Nome da empresa..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs text-slate-200 placeholder-slate-600 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
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

                                    {(dateFrom || dateTo || searchTerm) && (
                                        <button
                                            onClick={() => { setDateFrom(""); setDateTo(""); setSearchTerm(""); }}
                                            className="w-full py-2 text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors"
                                        >
                                            Resetar Filtros
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table Column */}
                        <div className="lg:col-span-9 overflow-hidden">
                            <section className="space-y-4">
                                <div className="flex items-center justify-between px-4">
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Registros Recentes</h2>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        {filteredData.length} entradas encontradas
                                    </span>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-y border-white/5 backdrop-blur-md">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all disabled:opacity-30"
                                            >
                                                <ChevronLeft size={12} />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all disabled:opacity-30"
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <ClientTable data={paginatedData} onOpenModal={openModal} hideActions={true} />
                            </section>
                        </div>
                    </div>
                </div>
            </DashboardContent>

            {/* Restricted Row Detail Modal */}
            {modalOpen && modalRow && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
                    <div className="glass-card max-w-2xl w-full flex flex-col rounded-[2.5rem] border border-white/10 relative reveal-rise overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{modalRow["Empresa (Cliente)"]}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} /> {formatDateTime(modalRow["Data"])}
                                </p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Restricted Content */}
                        <div className="p-8 space-y-8">
                            {/* Dores do Cliente */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Flame size={12} /> Dores do Cliente
                                </h4>
                                <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem]">
                                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                        {modalRow["Dores do Cliente"] || "Nenhuma informação de dores registrada."}
                                    </p>
                                </div>
                            </div>

                            {/* Perfil Comportamental */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                    <User size={12} /> Perfil Comportamental
                                </h4>
                                <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem]">
                                    <p className="text-sm text-slate-200 font-bold italic leading-relaxed">
                                        {modalRow["Perfil"] || "Nenhum perfil comportamental registrado."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-end">
                            <button onClick={() => setModalOpen(false)} className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
