"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { SCORE_KEYS, parseScore, parseRowDate } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Grid, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export default function PanoramaPage() {
  const { data, loading, lastUpdated, fetchData, sheetUrl, closers } = useDashboardContext();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState("average"); // 'average' or 'detailed'

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const filteredData = useMemo(() => {
    const filtered = data.filter((item) => {
      const rowDate = parseRowDate(item["Data"]);
      const closer = (item["Closer"] || "").toLowerCase();

      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
      const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
      
      return matchesFrom && matchesTo && matchesSdr;
    });

    // Reset page when filters change
    setCurrentPage(1);
    return filtered;
  }, [data, dateFrom, dateTo, sdrFilter]);

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
      const closerRows = filteredData.filter(row => (row["Closer"] || "") === closer);
      
      SCORE_KEYS.forEach(key => {
        const scores = closerRows.map(row => parseScore(row[key])).filter(s => !isNaN(s));
        results[closer][key] = scores.length > 0 
          ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : null;
      });
    });
    
    return results;
  }, [filteredData, closers]);

  // Overall competency averages (Gap Analysis)
  const competencyAverages = useMemo(() => {
    return SCORE_KEYS.map(key => {
      const scores = filteredData.map(row => parseScore(row[key])).filter(s => !isNaN(s));
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { key, avg };
    }).sort((a, b) => a.avg - b.avg);
  }, [filteredData]);

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
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-4">
          <div className="space-y-2">
            <h1 className="text-5xl font-black impact-title leading-tight">Mapa de Calor</h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
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
          </div>

          {viewMode === 'detailed' && (
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl animate-fade-in">
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

            <div className="h-10 w-px bg-white/10 mx-2" />

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
          <div className="glass-card rounded-[3rem] overflow-hidden border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-3xl shadow-2xl reveal-rise">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Médias por Closer (Visão Agregada)</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  Resumo Técnico
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-6 text-left border-b border-white/5 sticky left-0 z-20 bg-[#0a0f1d]">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Closer</span>
                    </th>
                    {SCORE_KEYS.map(key => (
                      <th key={key} className="px-6 py-6 text-center border-b border-white/5 min-w-[140px]">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] leading-tight block max-w-[120px] mx-auto">
                          {key}
                        </span>
                      </th>
                    ))}
                  </tr>
                 </thead>
                <tbody className="divide-y divide-white/5">
                  {closers.map(closer => (
                    <tr key={closer} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 font-black text-sm text-white uppercase italic tracking-tight sticky left-0 z-10 bg-[#0a0f1d] group-hover:text-primary transition-colors border-r border-white/5">
                        {closer}
                      </td>
                      {SCORE_KEYS.map(key => {
                        const score = matrixData[closer]?.[key];
                        return (
                          <td key={key} className="p-2 text-center">
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
          <div className="glass-card rounded-[3rem] overflow-hidden border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-3xl shadow-2xl reveal-rise">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Histórico de Notas Detalhado</h3>
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
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-6 py-6 text-left border-b border-white/5 sticky left-0 z-20 bg-[#0a0f1d]">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Data / Cliente / Closer</span>
                    </th>
                    {SCORE_KEYS.map(key => (
                      <th key={key} className="px-4 py-6 text-center border-b border-white/5 min-w-[120px]">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] leading-tight block max-w-[100px] mx-auto">
                          {key}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 sticky left-0 z-10 bg-[#0a0f1d] border-r border-white/5">
                        <div className="flex flex-col gap-0.5 max-w-[250px]">
                          <span className="text-[10px] font-black text-primary uppercase">{row["Data"]}</span>
                          <span className="text-xs font-black text-white truncate uppercase italic">{row["Empresa (Cliente)"]}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{row["Closer"]}</span>
                        </div>
                      </td>
                      {SCORE_KEYS.map(key => {
                        const score = parseScore(row[key]);
                        const displayScore = isNaN(score) ? "-" : score;
                        return (
                          <td key={key} className="p-1 text-center">
                            <div className={clsx(
                              "w-full h-12 rounded-xl flex items-center justify-center text-xs font-black border transition-all duration-300",
                              getCellColor(isNaN(score) ? null : score),
                              !isNaN(score) && "hover:scale-[1.05]"
                            )}>
                              {displayScore}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} records
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (totalPages > 7 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                      if (page === 2 || page === totalPages - 1) return <span key={page} className="px-2 text-slate-600">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={clsx(
                          "w-10 h-10 rounded-xl text-xs font-black transition-all",
                          currentPage === page 
                            ? "bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                            : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardContent>
  );
}
