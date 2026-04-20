"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { SCORE_KEYS, parseScore, parseRowDate } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Grid, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import CallDetailsModal from "@/components/CallDetailsModal";

export default function PanoramaPage() {
  const { data, loading, lastUpdated, fetchData, sheetUrl, closers: allClosers } = useDashboardContext();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState("average"); // 'average' or 'detailed'
  const [lastCallsLimit, setLastCallsLimit] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  
  // Custom Report Selection State (Exclusion logic: everything is included by default)
  const [excludedKeys, setExcludedKeys] = useState(new Set());

  const toggleRow = (key) => {
    setExcludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openModal = (row) => {
    setModalRow(row);
    setModalOpen(true);
  };

  const ALLOWED_CLOSERS = ["CARLOS SILVA", "GUSTAVO EMANUEL", "HENRIQUE", "BRUNO BORGES"];

  const closers = useMemo(() => {
    return allClosers.filter(closer => ALLOWED_CLOSERS.includes(closer.toUpperCase().trim()));
  }, [allClosers]);
  
  // Refs for scroll synchronization
  const avgHeaderRef = useRef(null);
  const avgBodyRef = useRef(null);
  const detHeaderRef = useRef(null);
  const detBodyRef = useRef(null);

  const syncScroll = (source, target) => {
    if (source && target) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const filteredData = useMemo(() => {
    const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO"];
    
    // 1. Filtragem inicial (Closers permitidos, datas, SDR e Blacklist)
    const filtered = data.filter((item) => {
      const rowDate = parseRowDate(item["Data"]);
      const closerName = (item["Closer"] || "").toUpperCase().trim();
      const clientName = (item["Empresa (Cliente)"] || "").toUpperCase().trim();

      if (!ALLOWED_CLOSERS.includes(closerName)) return false;

      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
      const matchesSdr = sdrFilter === "all" || closerName === sdrFilter.toUpperCase();
      
      const isBlacklisted = blacklist.includes(closerName) || blacklist.includes(clientName);
      
      return matchesFrom && matchesTo && matchesSdr && !isBlacklisted;
    });

    // 2. Ordenar da mais recente para a mais antiga para garantir que o agrupamento pegue os metadados corretos
    const sorted = [...filtered].sort((a, b) => {
      const dateA = parseRowDate(a["Data"]) || 0;
      const dateB = parseRowDate(b["Data"]) || 0;
      return dateB - dateA;
    });

    // 3. Agrupar duplicatas (mesmo Cliente, Closer e Data)
    const grouped = [];
    const seen = new Map();

    sorted.forEach((row) => {
      // Normalização ultra-agressiva para garantir o agrupamento
      // Removemos acentos, espaços extras e caracteres não-alfanuméricos para a chave
      const normalizeValues = (val) => {
        return (val || "").toString()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "") // Mantém apenas letras e números
          .trim();
      };

      const clientKey = normalizeValues(row["Empresa (Cliente)"]);
      const closerKey = normalizeValues(row["Closer"]);
      
      // FALLBACK DE DATA: Se parseRowDate falhar ou retornar NaN, usamos a string bruta limpa
      const rawDate = (row["Data"] || "").toString().trim();
      let dateKey = normalizeValues(rawDate); // Fallback: "13042026"
      
      const parsed = parseRowDate(rawDate);
      if (parsed) {
        const d = new Date(parsed);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dateKey = `${yyyy}${mm}${dd}`;
        }
      }
      
      const key = `${clientKey}|${closerKey}|${dateKey}`;

      if (!seen.has(key)) {
        // Primeira vez que vemos essa reunião (é a mais recente devido ao sort)
        const newRow = JSON.parse(JSON.stringify(row));
        newRow._scores = {};
        SCORE_KEYS.forEach(k => {
          const s = parseScore(row[k]);
          newRow._scores[k] = !isNaN(s) ? [s] : [];
        });
        seen.set(key, newRow);
        grouped.push(newRow);
      } else {
        // Reunião duplicada: acumulamos as notas
        const existingRow = seen.get(key);
        SCORE_KEYS.forEach(k => {
          const s = parseScore(row[k]);
          if (!isNaN(s)) {
            existingRow._scores[k].push(s);
          }
        });
        // Opcional: Atualizar status se a duplicata tiver um status mais "importante"
        // Mas por padrão mantemos o da primeira (mais recente)
      }
    });

    // 4. Calcular médias das duplicatas e ajustar as notas para o gráfico/tabela
    const finalData = grouped.map(row => {
      const processedRow = { ...row };
      SCORE_KEYS.forEach(k => {
        const scores = row._scores[k];
        if (scores.length > 0) {
          // Atribui a média das notas
          const average = scores.reduce((a, b) => a + b, 0) / scores.length;
          processedRow[k] = average.toFixed(1);
        } else {
          processedRow[k] = "-";
        }
      });
      delete processedRow._scores;
      
      // Add unique key for selection
      const clientKey = (row["Empresa (Cliente)"] || "").toString().trim();
      const closerKey = (row["Closer"] || "").toString().trim();
      const dateKey = (row["Data"] || "").toString().trim();
      processedRow._key = `${clientKey}|${closerKey}|${dateKey}`;
      
      return processedRow;
    });
    
    // 5. Aplicar limite de calls se houver
    if (lastCallsLimit && lastCallsLimit !== 9999) {
      return finalData.slice(0, lastCallsLimit);
    }

    return finalData;
  }, [data, dateFrom, dateTo, sdrFilter, lastCallsLimit]);

  const currentReportStats = useMemo(() => {
    // We calculate stats for all filtered data EXCEPT those in excludedKeys
    const includedRows = filteredData.filter(row => !excludedKeys.has(row._key));
    
    if (includedRows.length === 0) return null;

    const stats = {};
    SCORE_KEYS.forEach(key => {
      const scores = includedRows.map(row => parseScore(row[key])).filter(s => !isNaN(s));
      stats[key] = scores.length > 0 
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null;
    });
    
    return {
      count: includedRows.length,
      averages: stats,
      hasExclusions: excludedKeys.size > 0
    };
  }, [filteredData, excludedKeys]);

  const toggleAll = () => {
    if (excludedKeys.size > 0) {
      // If there are exclusions, reset to include everything
      setExcludedKeys(new Set());
    } else {
      // If everything is included, exclude everything
      setExcludedKeys(new Set(filteredData.map(r => r._key)));
    }
  };
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, sdrFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Matrix Data: [Closer][Competency] -> Avg Score
  const matrixData = useMemo(() => {
    const results = {};
    
    closers.forEach(closer => {
      results[closer] = {};
      const closerRows = filteredData
        .filter(row => (row["Closer"] || "").toUpperCase().trim() === closer.toUpperCase().trim())
        .slice(0, lastCallsLimit);
      
      SCORE_KEYS.forEach(key => {
        const scores = closerRows.map(row => parseScore(row[key])).filter(s => !isNaN(s));
        results[closer][key] = scores.length > 0 
          ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : null;
      });
    });
    
    return results;
  }, [filteredData, closers, lastCallsLimit]);

  // Overall competency averages (Gap Analysis)
  const competencyAverages = useMemo(() => {
    // Para o resumo de Gap, também respeitamos o limite das X últimas calls por closer para manter consistência
    const allRelevantScores = {};
    SCORE_KEYS.forEach(key => allRelevantScores[key] = []);

    closers.forEach(closer => {
      const closerRows = filteredData
        .filter(row => (row["Closer"] || "").toUpperCase().trim() === closer.toUpperCase().trim())
        .slice(0, lastCallsLimit);
      
      closerRows.forEach(row => {
        SCORE_KEYS.forEach(key => {
          const score = parseScore(row[key]);
          if (!isNaN(score)) allRelevantScores[key].push(score);
        });
      });
    });

    return SCORE_KEYS.map(key => {
      const scores = allRelevantScores[key];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { key, avg };
    }).sort((a, b) => a.avg - b.avg);
  }, [filteredData, closers, lastCallsLimit]);

  const criticalGap = competencyAverages[0];
  const strongestPoint = competencyAverages[competencyAverages.length - 1];

  const getCellColor = (score) => {
    if (score === null) return "bg-white/[0.02] text-slate-700";
    if (score < 5) return "bg-rose-500/20 text-rose-400 border-rose-500/20";
    if (score < 8) return "bg-amber-500/20 text-amber-400 border-amber-500/20";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
  };

  return (
    <DashboardContent
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={() => fetchData(sheetUrl)}
      title="Panorama Geral de Performance"
    >
      <div className="pt-8 space-y-6 md:space-y-10 max-w-full pl-8 pr-10">
        {/* Header Section */}
        <div className="bg-[#0a0f1d]/40 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-black impact-title leading-tight">Mapa de Calor</h1>
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
                {[
                  { id: 'average', label: 'Médias das Notas' },
                  { id: 'detailed', label: 'Histórico Geral' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={clsx(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === mode.id 
                        ? "bg-primary text-white shadow-lg" 
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl shadow-inner">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Analisar Últimas Calls</label>
              <div className="flex items-center gap-2">
                <select
                  value={lastCallsLimit}
                  onChange={(e) => setLastCallsLimit(Number(e.target.value))}
                  className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer min-w-[120px]"
                >
                  {[5, 10, 20, 50, 100].map(num => (
                    <option key={num} value={num} className="bg-[#0f172a]">{num} Calls</option>
                  ))}
                  <option value={9999} className="bg-[#0f172a]">Todas</option>
                </select>
              </div>
            </div>

            {viewMode === 'detailed' && (
              <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl animate-fade-in shadow-inner">
                <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Início</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-primary/40 [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fim</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-primary/40 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block" />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Filtrar Closer</label>
                <select
                  value={sdrFilter}
                  onChange={(e) => setSdrFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer min-w-[180px]"
                >
                  <option value="all" className="bg-[#0f172a]">Todos os Closers</option>
                  {closers.map(s => (
                    <option key={s} value={s} className="bg-[#0f172a]">{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Gap Analysis Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-[2.5rem] border border-rose-500/20 bg-rose-500/[0.02] flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest">Ponto de Falha Crítico</div>
              <div className="text-xl font-black text-white italic uppercase tracking-tight">{criticalGap?.avg > 0 ? criticalGap.key : "---"}</div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Etapa com a menor média do time ({criticalGap?.avg.toFixed(1) || 0}). foco total em correção aqui.</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/[0.02] flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Ponto Mais Forte</div>
              <div className="text-xl font-black text-white italic uppercase tracking-tight">{strongestPoint?.avg > 0 ? strongestPoint.key : "---"}</div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Sua equipe brilha nesta etapa do script com média {strongestPoint?.avg.toFixed(1) || 0}.</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[2.5rem] border border-primary/20 bg-primary/[0.02] flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <TrendingUp size={24} />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Eficiência Geral</div>
              <div className="text-3xl font-black text-white italic tracking-tighter">
                {competencyAverages.length > 0 
                  ? (competencyAverages.reduce((a, b) => a + b.avg, 0) / competencyAverages.length).toFixed(1)
                  : "0.0"}
              </div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Média total da operação</p>
            </div>
          </div>
        </div>

        {/* View Switcher Output */}
        {viewMode === 'average' ? (
          /* Section 1: Aggregate Matrix (Closers vs Competencies) */
          <div className="glass-card rounded-none border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-3xl shadow-2xl w-full max-w-full">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Médias por Closer (Visão Agregada)</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  Resumo Técnico
              </div>
            </div>
            
            {/* Separate Sticky Header Container */}
            <div 
              ref={avgHeaderRef}
              className="sticky top-0 z-[50] bg-[#0a0f1d] border-b border-white/10 shadow-2xl"
            >
              <table className="w-full border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-[#0a0f1d]">
                    <th className="px-8 py-6 text-left border-b border-white/5 bg-[#0a0f1d] w-[130px] min-w-[130px] max-w-[130px]">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Closer</span>
                    </th>
                    {SCORE_KEYS.map(key => (
                      <th key={key} className="px-3 py-6 text-center border-b border-white/5 min-w-[80px]">
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider leading-tight block max-w-[70px] mx-auto">
                          {key}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* Scrollable Body Container */}
            <div 
              ref={avgBodyRef}
              onScroll={(e) => syncScroll(e.target, avgHeaderRef.current)}
              className="overflow-x-auto overflow-y-visible custom-scrollbar"
            >
              <table className="w-full border-collapse min-w-[1100px]">
                <tbody className="divide-y divide-white/5">
                  {closers.map(closer => (
                    <tr key={closer} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 font-black text-sm text-white uppercase italic tracking-tight bg-[#0a0f1d] group-hover:text-primary transition-colors border-r border-white/5 w-[130px] min-w-[130px] max-w-[130px] truncate">
                        {closer}
                      </td>
                      {SCORE_KEYS.map(key => {
                        const score = matrixData[closer]?.[key];
                        return (
                          <td key={key} className="p-2 text-center min-w-[80px]">
                            <div className={clsx(
                              "w-full h-14 rounded-2xl flex items-center justify-center text-sm font-black border transition-all duration-300",
                              getCellColor(score),
                              score !== null && "shadow-lg group-hover:scale-[1.05]"
                            )}>
                              {score !== null ? score : "-"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Section 2: General Heatmap (Paginated Row-by-Row) */
          <div className="glass-card rounded-none border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-3xl shadow-2xl w-full max-w-full">
            <div className="sticky top-0 z-[60] bg-[#0a0f1d] border-b border-white/10 shadow-2xl rounded-none overflow-hidden">
              {/* Selection Summary Bar (Always showing when in detailed mode) */}
              {viewMode === 'detailed' && currentReportStats && (
                <div className={clsx(
                  "border-b p-6 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-500 transition-colors",
                  currentReportStats.hasExclusions ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
                      currentReportStats.hasExclusions ? "bg-amber-500/20 text-amber-500 shadow-amber-500/20" : "bg-primary/20 text-primary shadow-primary/20"
                    )}>
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black opacity-70 uppercase tracking-[0.2em]">
                        {currentReportStats.hasExclusions ? "Personalizado (Filtro Ativo)" : "Performance Total"}
                      </div>
                      <div className="text-xl font-black text-white italic uppercase tracking-tight">Médias de {currentReportStats.count} Calls</div>
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-white/10 hidden md:block" />
                  
                  <div className="flex-1 overflow-x-auto custom-scrollbar-thin flex gap-4 pr-4">
                    {SCORE_KEYS.map(key => {
                      const avg = currentReportStats.averages[key];
                      return (
                        <div key={key} className="flex flex-col items-center min-w-[70px]">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1 text-center truncate w-full">{key}</span>
                          <span className={clsx(
                            "text-base font-black italic tracking-tighter",
                            avg >= 8 ? "text-emerald-400" : avg >= 5 ? "text-amber-400" : "text-rose-400"
                          )}>
                            {avg || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {currentReportStats.hasExclusions && (
                    <button 
                      onClick={() => setExcludedKeys(new Set())}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 group whitespace-nowrap"
                    >
                      <X size={14} className="group-hover:rotate-90 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Resetar Filtros</span>
                    </button>
                  )}
                </div>
              )}

              <div className="p-8 flex items-center justify-between">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Histórico de Notas Detalhado</h3>
                
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Fixed Pagination in Header */}
                  <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10 pr-4 mr-2 hidden sm:block">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      
                      <span className="text-[10px] font-black text-white px-2">
                        PÁGINA {currentPage} DE {totalPages || 1}
                      </span>

                      <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exibir</span>
                    <select 
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
                    >
                      <option value={20} className="bg-[#0f172a]">20 por página</option>
                      <option value={50} className="bg-[#0f172a]">50 por página</option>
                      <option value={100} className="bg-[#0f172a]">100 por página</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Separate Sticky Header Container */}
            <div 
              ref={detHeaderRef}
              className="sticky top-[108px] z-[50] bg-[#0a0f1d] border-b border-white/10 shadow-2xl"
            >
              <table className="w-full border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-[#0a0f1d]">
                    <th className="px-6 py-6 text-center border-b border-white/5 bg-[#0a0f1d] w-[60px] min-w-[60px] max-w-[60px]">
                      <input 
                        type="checkbox" 
                        checked={excludedKeys.size === 0 && filteredData.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/40 focus:ring-offset-0 cursor-pointer"
                        title={excludedKeys.size > 0 ? "Restaurar todas" : "Excluir todas"}
                      />
                    </th>
                    <th className="px-6 py-6 text-left border-b border-white/5 bg-[#0a0f1d] w-[140px] min-w-[140px] max-w-[140px]">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Data / Cliente</span>
                    </th>
                    {SCORE_KEYS.map(key => (
                      <th key={key} className="px-2 py-6 text-center border-b border-white/5 min-w-[75px]">
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider leading-tight block max-w-[65px] mx-auto">
                          {key}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* Scrollable Body Container */}
            <div 
              ref={detBodyRef}
              onScroll={(e) => syncScroll(e.target, detHeaderRef.current)}
              className="overflow-x-auto overflow-y-visible custom-scrollbar"
            >
              <table className="w-full border-collapse min-w-[1100px]">
                <tbody className="divide-y divide-white/5">
                  {paginatedRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={clsx(
                        "group transition-all cursor-pointer border-l-4",
                        !excludedKeys.has(row._key) ? "bg-primary/[0.03] border-primary" : "hover:bg-white/[0.02] border-transparent opacity-20 grayscale"
                      )}
                      onClick={() => toggleRow(row._key)}
                    >
                      <td className="px-6 py-4 text-center bg-transparent w-[60px] min-w-[60px] max-w-[60px]">
                        <input 
                          type="checkbox" 
                          checked={!excludedKeys.has(row._key)}
                          onChange={(e) => { e.stopPropagation(); toggleRow(row._key); }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/40 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 bg-transparent border-r border-white/5 w-[140px] min-w-[140px] max-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-primary/70 uppercase tracking-tighter">
                            {row["Data"] ? new Date(parseRowDate(row["Data"])).toLocaleDateString('pt-BR') : "-"}
                          </span>
                          <span className="text-[11px] font-black text-white uppercase italic truncate">
                            {row["Empresa (Cliente)"]}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
                              {row["Closer"]}
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openModal(row); }}
                              className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-primary transition-colors"
                              title="Ver Detalhes"
                            >
                              <Search size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                      {SCORE_KEYS.map(key => {
                        const score = parseScore(row[key]);
                        return (
                          <td key={key} className="p-2 text-center min-w-[75px]">
                            <div className={clsx(
                              "w-full h-12 rounded-xl flex items-center justify-center text-xs font-black border transition-all duration-300",
                              getCellColor(score),
                              !isNaN(score) && "shadow-md group-hover:scale-[1.1] group-hover:z-10 bg-opacity-80 hover:bg-opacity-100"
                            )}>
                              {!isNaN(score) ? score : "-"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CallDetailsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        row={modalRow} 
      />
    </DashboardContent>
  );
}
