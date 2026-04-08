"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { Trophy, Users, TrendingUp, Target, Award, Star, Zap } from "lucide-react";
import { clsx } from "clsx";
import { parseScore, isClosed, parseRowDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function ClosersPage() {
  const { data, loading, lastUpdated, fetchData, sheetUrl, closers } = useDashboardContext();

  // Local Filter State (Independent from other tabs)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sdrFilter, setSdrFilter] = useState("all");

  // Memoized Filtered Data
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const closer = (item["Closer"] || "").toLowerCase();
        const rowDate = parseRowDate(item["Data"]);

        const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
        const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
        const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

        return matchesSdr && matchesFrom && matchesTo;
      });
  }, [data, sdrFilter, dateFrom, dateTo]);

  // Memoized Ranking Calculation
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

  const closerStats = ranking.sdrRank.map(rank => {
    const closerData = filteredData.filter(row => (row["Closer"] || "") === rank.name);
    const totalCalls = closerData.length;
    const closedCalls = rank.meetings;
    const conversionRate = totalCalls > 0 ? Math.round((closedCalls / totalCalls) * 100) : 0;
    
    // Pitch adherence: Average of "Adesão ao Script" score * 10
    const pitchScores = closerData.map(row => parseScore(row["Adesão ao Script"])).filter(s => !isNaN(s));
    const avgPitch = pitchScores.length > 0 
        ? Math.round((pitchScores.reduce((a, b) => a + b, 0) / pitchScores.length) * 10)
        : 0;
    
    return {
      name: rank.name,
      totalCalls,
      closedCalls,
      conversionRate,
      avgPitch
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  return (
    <DashboardContent
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={() => fetchData(sheetUrl)}
      title="Performance de Closers"
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-black impact-title leading-tight">Elite de Closers</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Award size={16} className="text-primary" />
              Ranking baseado em taxa de conversão real
            </p>
          </div>
        </div>

        {/* Podium / Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {closerStats.slice(0, 3).map((closer, idx) => (
            <div 
              key={closer.name} 
              className={clsx(
                "glass-card p-8 rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]",
                idx === 0 ? "border-amber-400/20 bg-amber-400/[0.02]" : "border-white/5"
              )}
            >
              {idx === 0 && (
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
              )}
              
              <div className="flex items-center justify-between mb-6">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg",
                  idx === 0 ? "bg-amber-400 text-black" : idx === 1 ? "bg-slate-300 text-black" : "bg-orange-400 text-white"
                )}>
                  {idx + 1}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa de Conversão</span>
                  <div className={clsx("text-3xl font-black", idx === 0 ? "text-amber-400" : "text-white")}>
                    {closer.conversionRate}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">{closer.name}</h3>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{closer.closedCalls} Fechados</span>
                  <span className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span>{closer.totalCalls} Ligações</span>
                </div>
              </div>

              {idx === 0 && (
                <div className="mt-6 flex items-center gap-2 text-amber-400/60 font-bold text-[10px] uppercase tracking-[0.2em]">
                  <Star size={12} fill="currentColor" />
                  Top Performer do Mês
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detailed List */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0a0f1d]/40 backdrop-blur-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Quadro Comparativo</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <Users size={12} /> {closerStats.length} Closers ativos
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] bg-white/[0.01]">
                  <th className="px-8 py-6">Posição</th>
                  <th className="px-8 py-6">Closer</th>
                  <th className="px-8 py-6">Volume Total</th>
                  <th className="px-8 py-6">Fechamentos</th>
                  <th className="px-8 py-6 text-right">Padrão de Pitch</th>
                  <th className="px-8 py-6 text-right">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {closerStats.map((closer, idx) => (
                  <tr key={closer.name} className="group hover:bg-white/[0.03] transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                          idx === 0 ? "bg-amber-400 text-black" : "bg-white/10 text-slate-400"
                        )}>
                          {idx + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">{closer.name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{closer.totalCalls}</span>
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Ligações</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-emerald-400">{closer.closedCalls}</span>
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Convertidos</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-3 text-amber-400">
                        <span className="text-sm font-black">{closer.avgPitch}%</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-amber-400" style={{ width: `${closer.avgPitch}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-4">
                        <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                            style={{ width: `${closer.conversionRate}%` }} 
                          />
                        </div>
                        <span className="text-sm font-black text-white w-10 text-right">{closer.conversionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}
