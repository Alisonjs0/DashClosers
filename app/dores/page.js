"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import DashboardContent from "@/components/DashboardContent";
import {
    Flame, User, Calendar, X, ChevronRight,
    TrendingUp, AlertCircle, Search, Filter,
    ArrowRight, MessageSquare, Briefcase,
    Clock, DollarSign, ShieldAlert, Cpu,
    Users2, ShieldCheck, Target, MousePointer2, Zap
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { parseRowDate, normalizeCloserName } from "@/lib/utils";
import { clsx } from "clsx";

// Categories definition
const CATEGORIES = [
    { id: "finance", label: "Financeiro / Investimento", icon: DollarSign, color: "text-red-400", bg: "bg-red-500", keywords: ["caixa", "dinheiro", "preço", "valor", "investimento", "parcel", "juros", "financeiro", "orcamento", "caro", "custo", "pagar", "verba", "boleto", "cartao", "pix", "entrada", "condicao", "grana"] },
    { id: "time", label: "Tempo / Operacional", icon: Clock, color: "text-amber-400", bg: "bg-amber-500", keywords: ["tempo", "agenda", "corrida", "prazo", "hoje", "agora", "demora", "urgente", "implementação", "esperar", "mês que vem", "semana", "atraso", "demorado", "rapido", "velocidade", "operacional"] },
    { id: "authority", label: "Autoridade / Decisor", icon: Users2, color: "text-primary", bg: "bg-primary", keywords: ["sócio", "sociedade", "esposa", "marido", "ceo", "diretoria", "diretor", "decisor", "falar com", "equipe", "reunião com o", "aprovação", "decisao", "conselho", "chefe", "patrao"] },
    { id: "trust", label: "Ceticismo / Confiança", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500", keywords: ["confiança", "seguro", "certeza", "garantia", "prova", "resultado", "caso", "saber", "funciona", "medo", "risco", "depoimento", "verdade", "mentira", "golpe", "credibilidade"] },
    { id: "product", label: "Produto / Fit Técnico", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500", keywords: ["solução", "fit", "onboarding", "produto", "ferramenta", "funcionamento", "processo", "metodologia", "integra", "api", "funcionalidade", "entregue", "complexo", "dificil", "facil", "software", "sistema"] },
    { id: "priority", label: "Prioridade / Momento", icon: Target, color: "text-purple-400", bg: "bg-purple-500", keywords: ["foco", "prioridade", "outra", "momento", "depois", "planejamento", "estratégia", "parado", "objetivo", "agora não", "projeto", "proxima", "ver depois", "analisar"] },
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

const decodeUTF8 = (str) => {
    if (!str || typeof str !== 'string') return str;
    try {
        return decodeURIComponent(escape(str));
    } catch {
        return str;
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
    const foundKey = keys.find(k => pattern.test(normalizeText(k).replace(/\s+/g, '')));
    return foundKey ? item[foundKey] : "";
};

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
    const [selectedCloser, setSelectedCloser] = useState("Todos");
    const [selectedCell, setSelectedCell] = useState(null); // { closer: string, categoryId: string, calls: [] }
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Fetch Report Data specifically for "Dores Mais Comuns"
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
                // Use the same spreadsheet but the reports tab (gid=987344015)
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
                return (selectedCloser === "Todos" || name === selectedCloser) && count > 0 && !blacklist.includes(upper) && !upper.includes("REUNIÃO") && !upper.includes("INTERNA");
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

            const rawText = findValueByFuzzyKey(item, /dor/i) || findValueByFuzzyKey(item, /analise/i) || "";
            const doresText = normalizeText(rawText);

            // Basic Date Filtering
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

            if (matchesFrom && matchesTo && result[closerName]) {
                CATEGORIES.forEach(cat => {
                    const normalizedKeywords = cat.keywords.map(normalizeText);
                    const regex = new RegExp(`(${normalizedKeywords.join('|')})`, 'gi');
                    if (regex.test(doresText)) {
                        result[closerName][cat.id].push(item);
                    }
                });
            }
        });

        return { heatmapData: result, sortedClosers: activeClosers };
    }, [data, dateFrom, dateTo]);

    // Aggregate Common Pains from both Raw Data and Reports
    const commonPainsAnalysis = useMemo(() => {
        const rawCounts = {};
        let reportPains = [];

        // 1. Keyword-based frequency from all rows
        data.forEach(item => {
            const rowDate = parseRowDate(item["Data"]);
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
            const closerName = normalizeCloserName(item["Closer"]);
            const matchesCloser = selectedCloser === "Todos" || closerName === selectedCloser;

            if (matchesFrom && matchesTo && matchesCloser) {
                const rawText = findValueByFuzzyKey(item, /dor/i) || findValueByFuzzyKey(item, /analise/i) || "";
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

        // 2. Extract from latest report if available
        const reportRows = reportData.filter(row => row.ranking_closers || row.ranking || row.principais_dores || row.Dores);
        if (reportRows.length > 0) {
            const latest = reportRows[reportRows.length - 1];

            if (selectedCloser === "Todos") {
                // Use global pains
                const rawDores = parseJSONSafely(latest.principais_dores || latest.Dores);
                if (Array.isArray(rawDores)) {
                    reportPains = rawDores.map(d => ({
                        label: d.dor_identificada || d.label || d.name,
                        value: parseFloat(d.frequencia_percentual || d.value || 0),
                        action: d.plano_de_acao_para_tratativa || d.action
                    }));
                }
            } else {
                // Use individual pains from ranking_closers
                const ranking = parseJSONSafely(latest.ranking_closers || latest.ranking) || [];
                const closerData = ranking.find(c => normalizeCloserName(c.nome || c.name || c.closer_nome) === selectedCloser);
                if (closerData && closerData.dores_individuais) {
                    reportPains = closerData.dores_individuais.map(d => ({
                        label: d.dor_identificada || d.label || d.name,
                        value: parseFloat(d.frequencia_percentual || d.value || 0),
                        action: d.plano_de_acao_para_tratativa || d.action
                    }));
                }
            }
        }

        // Sort raw counts
        const sortedRaw = Object.entries(rawCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }));

        return { sortedRaw, reportPains };
    }, [data, dateFrom, dateTo, reportData, selectedCloser]);

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
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                                <AlertCircle size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gargalo Principal</span>
                        </div>
                        <div className="text-lg font-black text-white uppercase italic leading-tight truncate">
                            {latestReport?.gargalo_principal_etapa || "—"}
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <TrendingUp size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reprovação (%)</span>
                        </div>
                        <div className="text-2xl font-black text-white italic">
                            {latestReport?.gargalo_percentual_reprovacao ? `${latestReport.gargalo_percentual_reprovacao}%` : "—"}
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Flame size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dores Ativas</span>
                        </div>
                        <div className="text-2xl font-black text-white italic">
                            {commonPainsAnalysis.sortedRaw.reduce((acc, curr) => acc + curr.count, 0)}
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Users2 size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Closers Analisados</span>
                        </div>
                        <div className="text-2xl font-black text-white italic">
                            {sortedClosers.length}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Common Pains from Reports (AI Analyzed) */}
                    <div className="glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01] flex flex-col">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Dores Mais Comuns</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Recorrência estatística e impacto</p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1">
                            {loadingReports ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisando...</p>
                                </div>
                            ) : commonPainsAnalysis.reportPains.length > 0 ? (
                                commonPainsAnalysis.reportPains.slice(0, 6).map((pain, idx) => (
                                    <div key={idx} className="space-y-2 group p-4 rounded-2xl hover:bg-white/[0.02] transition-all border border-transparent hover:border-white/5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{pain.label}</span>
                                            <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{pain.value}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-1000 ease-out"
                                                style={{ width: `${pain.value}%` }}
                                            />
                                        </div>
                                        {pain.action && (
                                            <p className="text-[10px] text-slate-500 italic mt-2 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-primary/40" />
                                                {pain.action}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-700">
                                        <AlertCircle size={32} />
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Aguardando dados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strategic Decisions & Action Plan */}
                    <div className="glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01] flex flex-col">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Decisões & Plano de Ação</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Diretrizes estratégicas e execução</p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Decisões Estratégicas</h4>

                                <div className="space-y-4">
                                    {(() => {
                                        try {
                                            const decisoes = JSON.parse(latestReport?.decisoes_estrategicas || "[]");
                                            if (Array.isArray(decisoes) && decisoes.length > 0) {
                                                return decisoes.map((item, idx) => (
                                                    <div key={idx} className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 group hover:bg-white/[0.06] transition-all">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[12px] font-black text-white uppercase tracking-tight">{item.closer}</span>
                                                            <span className={clsx(
                                                                "text-[10px] font-black px-3 py-1 rounded-full",
                                                                item.decisao === "DESENVOLVER" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                            )}>
                                                                {item.decisao}
                                                            </span>
                                                        </div>
                                                        <p className="text-[13px] text-slate-300 leading-relaxed font-medium italic">
                                                            "{item.justificativa}"
                                                        </p>
                                                    </div>
                                                ));
                                            }
                                        } catch (e) { }

                                        // Fallback to raw text if not JSON or empty
                                        return (
                                            <p className="text-xs text-slate-300 leading-relaxed italic">
                                                {latestReport?.decisoes_estrategicas || "Aguardando próxima análise de fechamento..."}
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-3">
                                    <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Clock size={12} />
                                        Prioridade 48h
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        {latestReport?.plano_acao_48h || "Ações imediatas em definição."}
                                    </p>
                                </div>
                                <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                    <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Calendar size={12} />
                                        Plano Semanal
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        {latestReport?.plano_acao_semanal || "Planejamento tático pendente."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Detailed Bottleneck Analysis */}
                    <div className="lg:col-span-1 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Análise de Gargalo</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Causa raiz da perda</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Etapa Crítica:</span>
                                    <span className="text-xs font-black text-red-400 uppercase italic">{latestReport?.gargalo_principal_etapa || "Estável"}</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    {latestReport?.gargalo_analise || "Nenhum gargalo severo identificado no fluxo atual."}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Severidade</div>
                                    <div className="text-xl font-black text-white italic">{latestReport?.severidade_gargalo || "—"}</div>
                                </div>
                                <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center min-h-[80px] flex flex-col justify-center">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Perda Principal</div>
                                    <div className="text-[10px] font-black text-amber-500 uppercase italic leading-tight">{latestReport?.causa_perda_principal || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analysis by Closer */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <Users2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Análise por Closer</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Métricas individuais e feedbacks</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(() => {
                                try {
                                    const analises = JSON.parse(latestReport?.analise_por_closer || "[]");
                                    if (Array.isArray(analises) && analises.length > 0) {
                                        return analises.map((closer, idx) => (
                                            <div key={idx} className="glass-card p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all group">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    {/* Header & Category */}
                                                    <div className="md:w-1/3 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-sm font-bold text-purple-400">
                                                                {closer.nome?.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-white uppercase italic">{closer.nome}</h4>
                                                                <div className={clsx(
                                                                    "text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1",
                                                                    closer.categoria === "EM DESENVOLVIMENTO" ? "bg-amber-500/10 text-amber-400" :
                                                                        closer.categoria === "RISCO OPERACIONAL" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                                                                )}>
                                                                    {closer.categoria}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-white/5 p-3 rounded-2xl text-center">
                                                                <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Nota Média</div>
                                                                <div className="text-lg font-black text-white italic">{closer.nota_media}</div>
                                                            </div>
                                                            <div className="bg-white/5 p-3 rounded-2xl text-center">
                                                                <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Decisão</div>
                                                                <div className="text-[10px] font-black text-purple-400 uppercase">{closer.decisao}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Insights & Patterns */}
                                                    <div className="md:w-2/3 space-y-4">
                                                        <div className="space-y-3">
                                                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Padrão Identificado</h5>
                                                            <p className="text-[13px] text-slate-200 leading-relaxed font-medium italic">"{closer.padrao_identificado}"</p>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="space-y-1.5">
                                                                <h5 className="text-[11px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <Flame size={12} /> Principal Dor
                                                                </h5>
                                                                <p className="text-[12px] text-white font-black uppercase tracking-tight">{closer.principal_dor_enfrentada}</p>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <ShieldAlert size={12} /> Principal Objeção
                                                                </h5>
                                                                <p className="text-[12px] text-white font-black uppercase tracking-tight">{closer.principal_objecao_enfrentada}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Top Individual Pains */}
                                                    {closer.dores_individuais && (
                                                        <div className="pt-4 border-t border-white/5">
                                                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Top Dores Identificadas</h5>
                                                            <div className="flex flex-wrap gap-2">
                                                                {closer.dores_individuais.slice(0, 4).map((dor, dIdx) => (
                                                                    <div key={dIdx} className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                                                        <span className="text-[9px] font-bold text-slate-300">{dor.dor_identificada}</span>
                                                                        <span className="text-[8px] font-black text-primary">{dor.frequencia_percentual}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    }
                                } catch (e) { }

                                return (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-30">
                                        <Search size={32} className="text-slate-500" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aguardando dados individuais...</p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardContent>
    );
}
