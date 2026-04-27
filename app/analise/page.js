"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import TrendChart from "@/components/TrendChart";
import { BarChart3, TrendingUp, Activity, Filter, Calendar, User, Clock, ChevronDown, Star, Target, Zap, X, Search } from "lucide-react";
import { SCORE_KEYS, parseScore, parseRowDate, isClosed, parseTimeFromField } from "@/lib/utils";
import RadarChart from "@/components/RadarChart";
import HourlyDistribution from "@/components/HourlyDistribution";
import { useState, useRef, useEffect, useMemo } from "react";
import { clsx } from "clsx";

export default function AnalyticsPage() {
  const { 
    data, 
    loading, 
    lastUpdated, 
    fetchData, 
    sheetUrl,
    closers
  } = useDashboardContext();

  // Local Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hourFrom, setHourFrom] = useState("");
  const [hourTo, setHourTo] = useState("");
  const [isCloserOpen, setIsCloserOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter Logic Helpers
  const setFilterToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  };
  const setFilterThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff)).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(startOfWeek);
    setDateTo(today);
  };
  const setFilterThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(startOfMonth);
    setDateTo(today);
  };
  const clearFilters = () => {
    setSearchTerm("");
    setSdrFilter("all");
    setDateFrom("");
    setDateTo("");
    setHourFrom("");
    setHourTo("");
  };

  // Memoized Filtered Data (Local to this tab)
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
        const closer = (item["Closer"] || "").toLowerCase();
        const rowDate = parseRowDate(item["Data"]);

        const matchesSearch = empresa.includes(searchTerm.toLowerCase());
        const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
        const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
        const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

        const timeValue = item["Horario de atendimento"] || item["Horario"];
        const hour = timeValue ? parseTimeFromField(timeValue) : null;
        const matchesHourFrom = !hourFrom || (hour !== null && hour >= parseInt(hourFrom));
        const matchesHourTo = !hourTo || (hour !== null && hour <= parseInt(hourTo));

        return matchesSearch && matchesSdr && matchesFrom && matchesTo && matchesHourFrom && matchesHourTo;
      });
  }, [data, searchTerm, sdrFilter, dateFrom, dateTo, hourFrom, hourTo]);
 
  // Base data for hourly distribution (NOT filtered by hour itself)
  const hourlyBaseData = useMemo(() => {
    return data.filter((item) => {
      const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
      const closer = (item["Closer"] || "").toLowerCase();
      const rowDate = parseRowDate(item["Data"]);
 
      const matchesSearch = empresa.includes(searchTerm.toLowerCase());
      const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
 
      return matchesSearch && matchesSdr && matchesFrom && matchesTo;
    });
  }, [data, searchTerm, sdrFilter, dateFrom, dateTo]);

  // Global baseline (Team average for the period, ignoring SDR and Hour filters)
  const globalBaselineData = useMemo(() => {
    return data.filter((item) => {
      const rowDate = parseRowDate(item["Data"]);
      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
      return matchesFrom && matchesTo;
    });
  }, [data, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const closedCount = filteredData.filter((row) => isClosed(row["Status"])).length;
    const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;
    return { total, closedCount, conversionRate };
  }, [filteredData]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCloserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const metricsPerformance = SCORE_KEYS.map(key => {
    let sum = 0, count = 0;
    filteredData.forEach(row => {
      const val = parseScore(row[key]);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    const avg = count > 0 ? (sum / count).toFixed(1) : "0";
    return { name: key, avg: parseFloat(avg) };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <DashboardContent
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={() => fetchData(sheetUrl)}
      title="Análise de Performance"
    >
      <div className="space-y-8 py-6 md:py-10 px-4 md:pl-8 md:pr-10">
        {/* Analytics Header & Filters */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10 relative z-20">
          <div className="space-y-1">
            <h1 className="text-4xl font-black impact-title leading-tight">Métricas Avançadas</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Exploração profunda de conversão e comportamento
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/5 backdrop-blur-md relative z-30">
             {/* Custom Closer Dropdown */}
             <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsCloserOpen(!isCloserOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[180px] justify-between"
                >
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
                            {sdrFilter === "all" ? "Todos os Closers" : sdrFilter}
                        </span>
                    </div>
                    <ChevronDown size={14} className={clsx("text-slate-500 transition-transform", isCloserOpen && "rotate-180")} />
                </button>

                {isCloserOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0f1d] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden reveal-rise">
                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                           <button 
                                onClick={() => { setSdrFilter("all"); setIsCloserOpen(false); }}
                                className={clsx(
                                    "w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                    sdrFilter === "all" ? "bg-primary text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                           >
                               Todos os Closers
                           </button>
                           <div className="h-px bg-white/5 my-1" />
                           {closers.map(c => (
                               <button 
                                    key={c}
                                    onClick={() => { setSdrFilter(c); setIsCloserOpen(false); }}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                        sdrFilter === c ? "bg-primary/20 text-primary border border-primary/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                               >
                                   {c}
                               </button>
                           ))}
                        </div>
                    </div>
                )}
             </div>

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

             <div className="h-4 w-px bg-white/10 mx-1" />

             <div className="flex items-center gap-1.5">
                <button onClick={setFilterToday} className="px-3 py-2 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Hoje</button>
                <button onClick={setFilterThisWeek} className="px-3 py-2 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Semana</button>
                <button onClick={setFilterThisMonth} className="px-3 py-2 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Mês</button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <Clock size={14} className="text-primary" />
                <select 
                    value={hourFrom} 
                    onChange={(e) => setHourFrom(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase cursor-pointer"
                >
                    <option value="" className="bg-slate-900">00h</option>
                    {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i} className="bg-slate-900">{i.toString().padStart(2, '0')}h</option>
                    ))}
                </select>
                <span className="text-slate-700 mx-1">-</span>
                <select 
                    value={hourTo} 
                    onChange={(e) => setHourTo(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase cursor-pointer"
                >
                    <option value="" className="bg-slate-900">23h</option>
                    {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i} className="bg-slate-900">{i.toString().padStart(2, '0')}h</option>
                    ))}
                </select>
                {(hourFrom !== "" || hourTo !== "") && (
                  <button 
                    onClick={() => { setHourFrom(""); setHourTo(""); }}
                    className="ml-1 p-1 hover:bg-white/10 rounded-full text-red-400/70 hover:text-red-400 transition-colors"
                    title="Limpar Horário"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="h-4 w-px bg-white/10 mx-1" />
                <button onClick={clearFilters} className="px-3 py-2 rounded-lg hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-all flex items-center gap-1.5">
                  <X size={10} /> Limpar
                </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charts Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trend Chart */}
            <div className="glass-card p-8 rounded-[3rem] border border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Histórico de Fechamentos</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Volume diário de negócios fechados</p>
                </div>
              </div>
              <div className="h-[300px]">
                <TrendChart data={filteredData} baselineData={globalBaselineData} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Radar Chart: Visual Scores */}
               <div className="glass-card p-8 rounded-[3rem] border border-white/5 flex flex-col items-center">
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 w-full text-center flex items-center justify-center gap-2">
                    <Star size={16} className="text-orange-400" fill="currentColor" /> Notas Visuais
                  </h3>
                  <div className="w-full h-[320px]">
                    <RadarChart data={filteredData} baselineData={globalBaselineData} />
                  </div>
               </div>

               {/* Hourly Analysis */}
               <div className="glass-card p-8 rounded-[3rem] border border-white/5 flex flex-col">
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 w-full text-center flex items-center justify-center gap-2">
                    <Clock size={16} className="text-primary" /> Análise de Horários
                  </h3>
                  <div className="w-full h-[320px]">
                    <HourlyDistribution 
                      data={hourlyBaseData} 
                      onHourSelect={(hour) => {
                        if (hourFrom === hour.toString() && hourTo === hour.toString()) {
                          setHourFrom("");
                          setHourTo("");
                        } else {
                          setHourFrom(hour.toString());
                          setHourTo(hour.toString());
                        }
                      }}
                      selectedHour={hourFrom === hourTo && hourFrom !== "" ? parseInt(hourFrom) : null}
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* Metrics Column */}
          <div className="lg:col-span-1 space-y-8">
             {/* Adherence to Pitch Card */}
             <div className="glass-card p-8 rounded-[2.5rem] border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  {/* Pitch adherence is based on "Adesão ao Script" avg score / 10 * 100 */}
                  {(() => {
                    const pitchScore = metricsPerformance.find(m => m.name === "Adesão ao Script")?.avg || 0;
                    const pitchPercent = Math.round(pitchScore * 10);
                    return (
                      <>
                        <div className="text-5xl font-black text-white tracking-tighter impact-title">{pitchPercent}%</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Seguimento de Pitch</div>
                      </>
                    );
                  })()}
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-primary" 
                     style={{ width: `${Math.round((metricsPerformance.find(m => m.name === "Adesão ao Script")?.avg || 0) * 10)}%` }}
                   />
                </div>
             </div>

             {/* Competencies Progress */}
             <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-col bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-400 border border-orange-400/20">
                    <Star size={16} fill="currentColor" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Competências</h3>
                </div>

                <div className="space-y-6 flex-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {metricsPerformance.map((metric, idx) => (
                    <div key={metric.name} className="space-y-2">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{metric.name}</span>
                         <span className="text-sm font-black text-white leading-none">{metric.avg}</span>
                       </div>
                       <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-gradient-to-r from-orange-400 to-amber-300" 
                           style={{ width: `${(metric.avg / 10) * 100}%` }}
                         />
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}
