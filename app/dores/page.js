"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { 
    Flame, User, Calendar, X, ChevronRight, 
    TrendingUp, AlertCircle, Search, Filter, 
    ArrowRight, MessageSquare, Briefcase, 
    Clock, DollarSign, ShieldAlert, Cpu, 
    Users2, ShieldCheck, Target, MousePointer2
} from "lucide-react";
import { useState, useMemo } from "react";
import { parseRowDate, normalizeCloserName } from "@/lib/utils";
import { clsx } from "clsx";

// Categories definition
const CATEGORIES = [
  { id: "finance", label: "Financeiro / Investimento", icon: DollarSign, color: "text-red-400", bg: "bg-red-500", keywords: ["caixa", "dinheiro", "preço", "valor", "investimento", "parcel", "juros", "financeiro", "orcamento", "caro", "custo", "pagar", "verba"] },
  { id: "time", label: "Tempo / Operacional", icon: Clock, color: "text-amber-400", bg: "bg-amber-500", keywords: ["tempo", "agenda", "corrida", "prazo", "hoje", "agora", "demora", "urgente", "implementação", "esperar", "mês que vem", "semana"] },
  { id: "authority", label: "Autoridade / Decisor", icon: Users2, color: "text-primary", bg: "bg-primary", keywords: ["sócio", "sociedade", "esposa", "marido", "ceo", "diretoria", "diretor", "decisor", "falar com", "equipe", "reunião com o", "aprovação"] },
  { id: "trust", label: "Ceticismo / Confiança", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500", keywords: ["confiança", "seguro", "certeza", "garantia", "prova", "resultado", "caso", "saber", "funciona", "medo", "risco", "depoimento"] },
  { id: "product", label: "Produto / Fit Técnico", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500", keywords: ["solução", "fit", "onboarding", "produto", "ferramenta", "funcionamento", "processo", "metodologia", "integra", "api", "funcionalidade", "entregue"] },
  { id: "priority", label: "Prioridade / Momento", icon: Target, color: "text-purple-400", bg: "bg-purple-500", keywords: ["foco", "prioridade", "outra", "momento", "depois", "planejamento", "estratégia", "parado", "objetivo", "agora não", "projeto"] },
];

const HighlightedText = ({ text, keywords, colorClass }) => {
    if (!text) return null;
    if (!keywords || keywords.length === 0) return <span>{text}</span>;

    // Create a regex from keywords with word boundaries
    // Note: \b doesn't always handle accented chars well, so we use a more robust boundary
    const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?<=^|[^a-záàâãéèêíïóôõöúçñ])(${escapedKeywords})(?=[^a-záàâãéèêíïóôõöúçñ]|$)`, 'gi');
    
    // For splitting, we need a slightly different regex to keep the delimiters
    const splitRegex = new RegExp(`((?<=^|[^a-záàâãéèêíïóôõöúçñ])(?:${escapedKeywords})(?=[^a-záàâãéèêíïóôõöúçñ]|$))`, 'gi');
    const parts = text.split(splitRegex);

    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <span key={i} className={clsx("font-black underline decoration-2 underline-offset-2", colorClass)}>
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

export default function DoresPage() {
  const { 
    data, 
    loading, 
    lastUpdated, 
    fetchData, 
    sheetUrl,
    closers
  } = useDashboardContext();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCell, setSelectedCell] = useState(null); // { closer: string, categoryId: string, calls: [] }
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter and Categorize Data
  const { heatmapData, sortedClosers } = useMemo(() => {
    const result = {}; // { closerName: { categoryId: [items] } }
    const closerCounts = {}; // { closerName: count }
    
    // Sort and filter closers to show only those with > 2 meetings
    data.forEach(item => {
      const rowDate = parseRowDate(item["Data"]);
      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
      
      if (matchesFrom && matchesTo) {
        const closerName = normalizeCloserName(item["Closer"]);
        closerCounts[closerName] = (closerCounts[closerName] || 0) + 1;
      }
    });

    const activeClosers = Object.entries(closerCounts)
      .filter(([name, count]) => {
        const upper = name.toUpperCase().trim();
        const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO", "NI", "NÃO", "N.A", "N/A", "NÃO IDENTIFICADA", "REUNIÃO INTERNA", "REUNIAO INTERNA"];
        return count > 2 && !blacklist.includes(upper) && !upper.includes("REUNIÃO") && !upper.includes("INTERNA");
      })
      .map(([name]) => name)
      .sort();
    
    // Initialize structure only for active closers
    activeClosers.forEach(closer => {
      result[closer] = {};
      CATEGORIES.forEach(cat => {
        result[closer][cat.id] = [];
      });
    });

    data.forEach(item => {
      const closerName = normalizeCloserName(item["Closer"]);
      const rowDate = parseRowDate(item["Data"]);
      const doresText = (item["Dores do Cliente"] || "").toLowerCase();

      // Basic Date Filtering
      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

      if (matchesFrom && matchesTo && result[closerName]) {
        CATEGORIES.forEach(cat => {
            // Robust word separation regex to match whole words only
            const regex = new RegExp(`(?<=^|[^a-záàâãéèêíïóôõöúçñ])(${cat.keywords.join('|')})(?=[^a-záàâãéèêíïóôõöúçñ]|$)`, 'gi');
            if (regex.test(doresText)) {
                result[closerName][cat.id].push(item);
            }
        });
      }
    });

    return { heatmapData: result, sortedClosers: activeClosers };
  }, [data, dateFrom, dateTo]);

  // Derive intensity scale (max value in any cell)
  const maxIntensity = useMemo(() => {
    let max = 0;
    Object.values(heatmapData).forEach(closerMetrics => {
      Object.values(closerMetrics).forEach(calls => {
        if (calls.length > max) max = calls.length;
      });
    });
    return max || 1;
  }, [heatmapData]);

  const handleCellClick = (closer, categoryId, calls) => {
    setSelectedCell({ closer, categoryId, calls });
    setCurrentPage(1);
  };

  const paginatedCalls = useMemo(() => {
    if (!selectedCell) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return selectedCell.calls.slice(start, start + ITEMS_PER_PAGE);
  }, [selectedCell, currentPage]);

  const totalPages = selectedCell ? Math.ceil(selectedCell.calls.length / ITEMS_PER_PAGE) : 0;

  return (
    <DashboardContent
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={() => fetchData(sheetUrl)}
      title="Mapa de Dores"
    >
      <div className="space-y-8 pl-8 pr-10">
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10 relative z-20">
          <div className="space-y-1">
            <h1 className="text-4xl font-black impact-title leading-tight">Inteligência de Dores</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Flame size={16} className="text-red-400" />
              Mapeamento de gargalos e objeções por Closer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/5 backdrop-blur-md relative z-30">
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <Calendar size={14} className="text-primary" />
                <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase cursor-pointer [color-scheme:dark]"
                />
                <span className="text-slate-700 mx-1">-</span>
                <input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase cursor-pointer [color-scheme:dark]"
                />
             </div>
             {(dateFrom || dateTo) && (
               <button 
                 onClick={() => { setDateFrom(""); setDateTo(""); }}
                 className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
               >
                 Limpar
               </button>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Heatmap Main Area */}
            <div className="xl:col-span-3">
                <div className="glass-card p-4 md:p-10 rounded-[3rem] border border-white/5 overflow-x-auto custom-scrollbar">
                    <div className="min-w-[800px]">
                        {/* Heatmap Grid Header (Closers) */}
                        <div className="grid grid-cols-[180px_repeat(auto-fill,minmax(1fr))] gap-2 mb-6" style={{ gridTemplateColumns: `180px repeat(${sortedClosers.length}, 1fr)` }}>
                            <div />
                            {sortedClosers.map(closer => (
                                <div key={closer} className="text-center px-2">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 text-xs font-bold text-slate-400">
                                        {closer.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block truncate max-w-full" title={closer}>
                                        {closer.split(' ')[0]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Heatmap Rows (Categories) */}
                        <div className="space-y-2">
                            {CATEGORIES.map(category => (
                                <div 
                                    key={category.id} 
                                    className="grid grid-cols-[180px_repeat(auto-fill,minmax(1fr))] gap-2" 
                                    style={{ gridTemplateColumns: `180px repeat(${sortedClosers.length}, 1fr)` }}
                                >
                                    {/* Sidebar Label */}
                                    <div className="flex items-center gap-3 pr-4 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                        <div className={clsx("p-2 rounded-lg bg-white/5", category.color)}>
                                            <category.icon size={14} />
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-tight">{category.label}</span>
                                    </div>

                                    {/* Cells */}
                                    {sortedClosers.map(closer => {
                                        const calls = heatmapData[closer][category.id];
                                        const count = calls.length;
                                        const intensity = count / maxIntensity;
                                        // Wanda Color Scaling: From almost transparent to vibrant category color
                                        const opacity = count === 0 ? 0.05 : 0.2 + (intensity * 0.8);
                                        const isActive = selectedCell?.closer === closer && selectedCell?.categoryId === category.id;

                                        return (
                                            <button
                                                key={`${closer}-${category.id}`}
                                                onClick={() => count > 0 && handleCellClick(closer, category.id, calls)}
                                                disabled={count === 0}
                                                className={clsx(
                                                    "h-[52px] rounded-xl transition-all relative group overflow-hidden border",
                                                    count === 0 ? "border-white/5 cursor-default bg-white/[0.02]" : "border-white/10 hover:border-white/40 cursor-pointer active:scale-95",
                                                    isActive && "border-white ring-2 ring-white/20 scale-105 z-10 shadow-2xl"
                                                )}
                                                style={{ 
                                                    backgroundColor: count > 0 ? `rgba(${category.bg === 'bg-red-500' ? '239, 68, 68' : category.bg === 'bg-amber-500' ? '245, 158, 11' : category.bg === 'bg-primary' ? '59, 130, 246' : category.bg === 'bg-emerald-500' ? '16, 185, 129' : '168, 85, 247'}, ${opacity})` : undefined 
                                                }}
                                            >
                                                {count > 0 && (
                                                    <>
                                                        <span className="text-xs font-black text-white relative z-10">{count}</span>
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legend & Stats Overlay */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-6 px-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded bg-white/20 border border-white/10" />
                             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nenhuma</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded bg-primary/40 border border-primary/20" />
                             <div className="w-3 h-3 rounded bg-primary/70 border border-primary/40" />
                             <div className="w-3 h-3 rounded bg-primary border border-white/20" />
                             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Alta Intensidade</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Details Expanded View */}
            <div className="xl:col-span-1">
                {selectedCell ? (
                    <div className="glass-card rounded-[3rem] border border-white/5 h-full flex flex-col overflow-hidden reveal-rise">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] relative">
                             <button 
                                onClick={() => setSelectedCell(null)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-500 transition-colors"
                             >
                                <X size={20} />
                             </button>

                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                                <AlertCircle size={12} className={CATEGORIES.find(c => c.id === selectedCell.categoryId)?.color} />
                                Detalhes da Dor
                             </h4>
                             <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-tight">
                                {CATEGORIES.find(c => c.id === selectedCell.categoryId)?.label}
                                <span className="block text-[10px] text-primary mt-1 font-bold not-italic tracking-normal">{selectedCell.closer}</span>
                             </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                            {/* Pagination Controls (Top) */}
                            {totalPages > 1 && (
                                <div className="pb-4 flex items-center justify-between border-b border-white/5 mb-2">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                                    >
                                        <ChevronRight size={20} className="rotate-180" />
                                    </button>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Página <span className="text-white">{currentPage}</span> / {totalPages}
                                    </div>
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            {paginatedCalls.map((call, idx) => (
                                <div key={idx} className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl space-y-3 group hover:border-white/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                            <Calendar size={10} className="text-primary" />
                                            {call["Data"]}
                                        </div>
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                                            (call["Status"] || "").toLowerCase().includes("fechado") ? "bg-emerald-500" : "bg-red-500"
                                        )} />
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                        <HighlightedText 
                                            text={call["Dores do Cliente"]} 
                                            keywords={CATEGORIES.find(c => c.id === selectedCell.categoryId)?.keywords.filter(k => (call["Dores do Cliente"] || "").toLowerCase().includes(k.toLowerCase()))} 
                                            colorClass={CATEGORIES.find(c => c.id === selectedCell.categoryId)?.color}
                                        />
                                    </p>
                                    <button className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                        Ver Call <ArrowRight size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white/[0.02] border-t border-white/5 text-center">
                             <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                Mostrando {selectedCell.calls.length} ocorrências encontradas
                             </span>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-[3rem] border border-white/5 border-dashed h-full flex flex-col items-center justify-center p-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700">
                            <MessageSquare size={32} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Explorador de Dores</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-loose">
                                Clique em uma célula do mapa de calor<br />para ver os detalhes dos relatos dos clientes.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </DashboardContent>
  );
}
