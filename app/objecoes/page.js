"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import { 
    ShieldAlert, User, Calendar, X, ChevronRight, 
    TrendingDown, AlertCircle, Search, Filter, 
    ArrowRight, MessageSquare, Briefcase, 
    Clock, DollarSign, Cpu, 
    Users2, ShieldCheck, Target, MousePointer2,
    Zap, Flame, TrendingUp
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { parseRowDate, normalizeCloserName } from "@/lib/utils";
import { clsx } from "clsx";

// Objection Categories
const CATEGORIES = [
  { id: "finance", label: "Financeiro / Preço", icon: DollarSign, color: "text-red-400", bg: "bg-red-500", keywords: ["caro", "preço", "valor", "dinheiro", "investimento", "caixa", "orçamento", "sem verba", "condição", "pagamento", "juros", "parcela", "custo", "caro", "grana", "boleto", "cartao", "pix", "entrada", "desconto", "taxa"] },
  { id: "authority", label: "Autoridade / Sócio", icon: Users2, color: "text-primary", bg: "bg-primary", keywords: ["sócio", "esposa", "marido", "diretoria", "decisor", "falar com", "aprovação", "consultar", "reunião com o", "votação", "decidir", "conselho", "patrao", "chefe", "dono"] },
  { id: "time", label: "Momento / Urgência", icon: Clock, color: "text-amber-400", bg: "bg-amber-500", keywords: ["pensar", "depois", "mês que vem", "amanhã", "segunda", "tempo", "correria", "prioridade", "agora não", "foco", "planejamento", "analisar", "ver depois", "esperar", "proxima", "semana"] },
  { id: "trust", label: "Confiança / Prova", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500", keywords: ["certeza", "garantia", "resultado", "caso", "prova", "medo", "risco", "seguro", "funciona", "depoimento", "conhecer", "referência", "verdade", "mentira", "golpe", "credibilidade"] },
  { id: "product", label: "Produto / Fit", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500", keywords: ["fit", "funciona", "solução", "ferramenta", "processo", "metodologia", "integra", "api", "complexo", "difícil", "produto", "sistema", "software", "entregue", "onboarding"] },
  { id: "competition", label: "Concorrência", icon: Target, color: "text-purple-400", bg: "bg-purple-500", keywords: ["concorrência", "outro", "empresa x", "comparando", "melhor preço", "já tenho", "usando", "estou com", "mercado", "proposta", "concorrente", "orcamento de outro"] },
];

const parseJSONSafely = (str) => {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try {
        const trimmed = String(str).trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return JSON.parse(trimmed);
        }
        return null;
    } catch (e) {
        return null;
    }
};

const normalizeText = (text) => {
    if (!text) return "";
    return text.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ") // Remove remaining special chars
        .replace(/\s+/g, " ")
        .trim();
};

const findValueByFuzzyKey = (item, pattern) => {
    if (!item) return "";
    const keys = Object.keys(item);
    // Remove spaces and special chars from keys to match better
    const foundKey = keys.find(k => {
        const normalizedKey = normalizeText(k).replace(/\s+/g, '');
        return pattern.test(normalizedKey);
    });
    return foundKey ? item[foundKey] : "";
};

const HighlightedText = ({ text, keywords, colorClass }) => {
    if (!text) return null;
    if (!keywords || keywords.length === 0) return <span>{text}</span>;

    const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?<=^|[^a-záàâãéèêíïóôõöúçñ])(${escapedKeywords})(?=[^a-záàâãéèêíïóôõöúçñ]|$)`, 'gi');
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

export default function ObjecoesPage() {
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
  const [selectedCloser, setSelectedCloser] = useState("Todos");
  const [selectedCell, setSelectedCell] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [reportData, setReportData] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const latestReport = useMemo(() => {
    if (reportData.length === 0) return null;
    return reportData[reportData.length - 1];
  }, [reportData]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoadingReports(true);
      try {
        const baseUrl = sheetUrl.split('/edit')[0];
        const reportsUrl = `${baseUrl}/export?format=csv&gid=987344015`;
        const res = await fetch(`/api/sheets?url=${encodeURIComponent(reportsUrl)}`);
        const json = await res.json();
        if (json.data) {
          setReportData(json.data);
        }
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setLoadingReports(false);
      }
    };
    if (sheetUrl) fetchReports();
  }, [sheetUrl]);

  // Filter and Categorize Data
  const { heatmapData, sortedClosers } = useMemo(() => {
    const result = {};
    const closerCounts = {};
    
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
        return (selectedCloser === "Todos" || name === selectedCloser) && count > 0 && !blacklist.includes(upper);
      })
      .map(([name]) => name)
      .sort();
    
    activeClosers.forEach(closer => {
      result[closer] = {};
      CATEGORIES.forEach(cat => {
        result[closer][cat.id] = [];
      });
    });

    data.forEach(item => {
      const closerName = normalizeCloserName(item["Closer"]);
      const rowDate = parseRowDate(item["Data"]);
      const rawText = findValueByFuzzyKey(item, /obje/i) || findValueByFuzzyKey(item, /dor/i) || "";
      const objText = normalizeText(rawText);

      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

      if (matchesFrom && matchesTo && result[closerName]) {
        CATEGORIES.forEach(cat => {
            const normalizedKeywords = cat.keywords.map(normalizeText);
            const hasMatch = normalizedKeywords.some(kw => objText.includes(kw));
            if (hasMatch) {
                result[closerName][cat.id].push(item);
            }
        });
      }
    });

    return { heatmapData: result, sortedClosers: activeClosers };
  }, [data, dateFrom, dateTo]);

  // Aggregate Common Objections
  const commonAnalysis = useMemo(() => {
    const rawCounts = {};
    CATEGORIES.forEach(cat => {
        rawCounts[cat.label] = 0;
    });
    let reportObj = [];

    // 1. Keyword frequency
    data.forEach(item => {
      const rowDate = parseRowDate(item["Data"]);
      const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
      const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
      const closerName = normalizeCloserName(item["Closer"]);
      const matchesCloser = selectedCloser === "Todos" || closerName === selectedCloser;
      
      if (matchesFrom && matchesTo && matchesCloser) {
        const rawText = findValueByFuzzyKey(item, /obje/i) || findValueByFuzzyKey(item, /dor/i) || "";
        const text = normalizeText(rawText);
        CATEGORIES.forEach(cat => {
            cat.keywords.forEach(kw => {
                const normalizedKw = normalizeText(kw);
                if (text.includes(normalizedKw)) {
                    rawCounts[cat.label] = (rawCounts[cat.label] || 0) + 1;
                }
            });
        });
      }
    });

    // 2. Report data
    const reportRows = reportData.filter(row => row.principais_objecoes || row.Objeções || row["ObjeÃ§Ãµes"]);
    if (reportRows.length > 0) {
        const latest = reportRows[reportRows.length - 1];
        
        if (selectedCloser === "Todos") {
            // Use global objections
            const raw = parseJSONSafely(latest.principais_objecoes || latest.Objeções || latest["ObjeÃ§Ãµes"]);
            if (Array.isArray(raw)) {
                reportObj = raw.map(d => ({
                    label: d.objecao_identificada || d.label || d.name,
                    value: parseFloat(d.frequencia_percentual || d.value || 0),
                    action: d.plano_de_acao_para_contorno || d.action
                }));
            }
        } else {
            // Use individual objections from ranking_closers
            const ranking = parseJSONSafely(latest.ranking_closers || latest.ranking) || [];
            const closerData = ranking.find(c => normalizeCloserName(c.nome || c.name || c.closer_nome) === selectedCloser);
            if (closerData && closerData.objecoes_individuais) {
                reportObj = closerData.objecoes_individuais.map(d => ({
                    label: d.objecao_identificada || d.label || d.name,
                    value: parseFloat(d.frequencia_percentual || d.value || 0),
                    action: d.plano_de_acao_para_contorno || d.action
                }));
            }
        }
    }

    const sortedRaw = Object.entries(rawCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));

    return { sortedRaw, reportObj };
  }, [data, dateFrom, dateTo, reportData, selectedCloser]);

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
      title="Mapa de Objeções"
    >
      <div className="space-y-8 pl-8 pr-10">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10 relative z-20">
          <div className="space-y-1">
            <h1 className="text-4xl font-black impact-title leading-tight">Inteligência de Objeções</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <ShieldAlert size={16} className="text-primary" />
              Mapeamento de resistências e contornos por Closer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/5 backdrop-blur-md relative z-30">
             <div className="flex items-center gap-2 px-4 py-2 border-r border-white/10 pr-4 mr-2">
                <User size={14} className="text-primary" />
                <select 
                    value={selectedCloser} 
                    onChange={(e) => setSelectedCloser(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-black text-white uppercase cursor-pointer"
                >
                    <option value="Todos" className="bg-[#0f172a]">Todos os Closers</option>
                    {closers.map(c => (
                        <option key={c} value={c} className="bg-[#0f172a]">{c}</option>
                    ))}
                </select>
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

        {/* KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <AlertCircle size={18} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Causa Perda Principal</span>
                </div>
                <div className="text-lg font-black text-white uppercase italic leading-tight truncate">
                    {latestReport?.causa_perda_principal || "—"}
                </div>
            </div>
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                        <DollarSign size={18} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Restrição Financeira</span>
                </div>
                <div className="text-2xl font-black text-white italic">
                    {latestReport?.restricao_financeira_qtd || "—"}
                </div>
            </div>
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ShieldAlert size={18} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objeções Ativas</span>
                </div>
                <div className="text-2xl font-black text-white italic">
                    {commonAnalysis.sortedRaw.reduce((acc, curr) => acc + curr.count, 0)}
                </div>
            </div>
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Users2 size={18} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amostra de Calls</span>
                </div>
                <div className="text-2xl font-black text-white italic">
                    {data.length}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
            {/* Common Objections from Reports */}
            <div className="glass-card p-10 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Objeções Mais Comuns</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Análise estratégica de resistências e contornos</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {loadingReports ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisando Relatórios...</p>
                        </div>
                    ) : commonAnalysis.reportObj.length > 0 ? (
                        commonAnalysis.reportObj.slice(0, 8).map((item, idx) => (
                            <div key={idx} className="space-y-4 group bg-white/[0.03] p-6 rounded-3xl border border-white/5 hover:bg-white/[0.06] transition-all">
                                <div className="flex justify-between items-end">
                                    <span className="text-[15px] font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.label}</span>
                                    <span className="text-xs font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">{item.value}%</span>
                                </div>
                                <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-1000 ease-out" 
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                                {item.action && (
                                    <div className="flex gap-4 pt-3 items-start">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mt-0.5">
                                            <ShieldAlert size={14} />
                                        </div>
                                        <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                                            <span className="text-emerald-400 font-black uppercase text-[10px] mr-3 tracking-[0.2em]">Estratégia de Contorno:</span>
                                            {item.action}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-700">
                                <AlertCircle size={32} />
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sem dados de relatório recentes para este filtro</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </DashboardContent>
  );
}
