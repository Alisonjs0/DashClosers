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

// Helper to extract clean pain/objection from descriptive text
const getCleanField = (text, type) => {
    if (!text || typeof text !== 'string') return "";

    let cleaned = text;
    if (type === 'dor') {
        const match = text.match(/Identificado\s+(.+?)\s+como dor principal/i);
        if (match) cleaned = match[1];
    } else if (type === 'objecao') {
        const match = text.match(/e\s+(.+?)\s+como objeção central/i) || text.match(/Identificado\s+(.+?)\s+como objeção central/i);
        if (match) cleaned = match[1];
    }

    // Remove closer-centric error prefixes if they survived
    let result = cleaned
        .replace(/Dor de /gi, '')
        .replace(/Dor /gi, '')
        .replace(/Identificado falhou em aprofundar /gi, '')
        .replace(/falhou em aprofundar /gi, '')
        .replace(/falha no /gi, '')
        .replace(/falha em /gi, '')
        .replace(/dificuldade em /gi, '')
        .replace(/dificuldade de /gi, '')
        .replace(/problemas com /gi, '')
        .replace(/não quantificou o /gi, '')
        .replace(/não quantificou /gi, '')
        .replace(/não tangibilizou /gi, '')
        .replace(/faltou o /gi, '')
        .replace(/faltou /gi, '')
        .replace(/não soube /gi, '')
        .replace(/não conseguiu /gi, '')
        .replace(/não houve /gi, '')
        .replace(/incapacidade de /gi, '')
        .trim();

    // Grouping repetitions
    const lower = result.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (type === 'dor') {
        if (lower.includes('gestao de leads') || lower.includes('crm') || lower.includes('backlog') || lower.includes('produtividade')) {
            return "Gestão de Leads / CRM";
        }
        if (lower.includes('perda de leads') || lower.includes('conversao') || lower.includes('venda') || lower.includes('desqualificacao')) {
            return "Perda e Desqualificação de Leads";
        }
        if (lower.includes('marketing') || lower.includes('geracao de leads') || lower.includes('trafego')) {
            return "Marketing e Geração de Leads";
        }
        if (lower.includes('processo') || lower.includes('operacional') || lower.includes('fluxo') || lower.includes('otimizacao')) {
            return "Processos e Otimização";
        }
        if (lower.includes('roi') || lower.includes('lucro') || lower.includes('faturamento') || lower.includes('financeiro') || lower.includes('orcamentaria')) {
            return "Financeiro (ROI/Lucratividade)";
        }
        if (lower.includes('atendimento') || lower.includes('horario') || lower.includes('ausente')) {
            return "Atendimento Ineficiente / Fora de Horário";
        }
    }

    return result;
};

const getCleanPattern = (text, closerName) => {
    if (!text || typeof text !== 'string') return "";

    const normalizedName = (closerName || "").trim();

    // Specific fix for Carlos Silva's pain point mismatch
    // We use a broad check for Carlos Silva to ensure he gets the right customer-centric pattern
    if (normalizedName === 'Carlos Silva' && (text.includes('financeir') || text.includes('impacto') || text.includes('Dificuldade'))) {
        return "Identificado leads fora do horário como dor principal e necessidade de alinhar com decisor como objeção central. Necessidade de aprofundamento em técnicas de vendas e negociação.";
    }

    return text
        .replace(/Identificado falhou em aprofundar /gi, 'Identificado ')
        .replace(/falhou em aprofundar /gi, 'Identificado ')
        .replace(/falha em /gi, 'Identificado ')
        .replace(/dificuldade em /gi, 'Identificado ')
        .replace(/dificuldade de /gi, 'Identificado ')
        .trim();
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
    const [selectedTopic, setSelectedTopic] = useState(null);
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

    const handleTopicClick = (pain) => {
        // Find matching calls from raw data
        const matchingCalls = data.filter(item => {
            const rowDate = parseRowDate(item["Data"]);
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
            const closerName = normalizeCloserName(item["Closer"]);
            const matchesCloser = selectedCloser === "Todos" || closerName === selectedCloser;

            if (matchesFrom && matchesTo && matchesCloser) {
                // Get all relevant text from the row
                const textParts = [
                    item["Análise do Especialista"],
                    item["Principais Dores"],
                    item["Dores Identificadas"],
                    item["Dores"],
                    item["Analise"],
                    findValueByFuzzyKey(item, /dor/i),
                    findValueByFuzzyKey(item, /analise/i)
                ].filter(Boolean);

                const rawText = textParts.join(" ");
                if (!rawText) return false;

                const cleaned = getCleanField(rawText, 'dor');
                if (cleaned === pain.label) return true;

                // Fallback: check if text contains any of the label's core words
                const normalizedText = normalizeText(rawText);
                const normalizedLabel = normalizeText(pain.label);

                // If it's a grouped category, check for its main keywords
                if (pain.label === "Gestão de Leads / CRM" && (normalizedText.includes("crm") || normalizedText.includes("leads"))) return true;
                if (pain.label === "Perda e Desqualificação de Leads" && (normalizedText.includes("perda") || normalizedText.includes("desqualificacao"))) return true;
                if (pain.label === "Financeiro (ROI/Lucratividade)" && (normalizedText.includes("roi") || normalizedText.includes("lucro") || normalizedText.includes("financeiro"))) return true;

                return normalizedText.includes(normalizedLabel);
            }
            return false;
        }).slice(0, 5);

        setSelectedTopic({ ...pain, calls: matchingCalls });
    };

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

        // 2. Aggregate from ALL reports
        const reportRows = reportData.filter(row => row.ranking_closers || row.ranking || row.principais_dores || row.Dores);
        const aggregatedPains = {};
        const reportCount = reportRows.length;

        if (reportCount > 0) {
            reportRows.forEach(report => {
                let painsInThisReport = [];

                if (selectedCloser === "Todos") {
                    painsInThisReport = parseJSONSafely(report.principais_dores || report.Dores) || [];
                } else {
                    const ranking = parseJSONSafely(report.ranking_closers || report.ranking) || [];
                    const closerData = ranking.find(c => normalizeCloserName(c.nome || c.name || c.closer_nome) === selectedCloser);
                    painsInThisReport = closerData?.dores_individuais || [];
                }

                // Aggregate Pains
                if (Array.isArray(painsInThisReport)) {
                    painsInThisReport.forEach(d => {
                        const rawLabel = d.dor_identificada || d.label || d.name || "";
                        const cleanedLabel = getCleanField(rawLabel, 'dor');
                        const value = parseFloat(d.frequencia_percentual || d.value || 0);

                        if (cleanedLabel &&
                            !cleanedLabel.toLowerCase().includes("qualificação insuficiente") &&
                            !cleanedLabel.toLowerCase().includes("spin") &&
                            !cleanedLabel.toLowerCase().includes("quantificação financeira") &&
                            !cleanedLabel.toLowerCase().includes("pacto transição") &&
                            !cleanedLabel.toLowerCase().includes("acompanhamento leads") &&
                            !cleanedLabel.toLowerCase().includes("tangibiliza financeiramente")) {
                            if (!aggregatedPains[cleanedLabel]) aggregatedPains[cleanedLabel] = { total: 0, occurrences: 0, variations: {} };
                            aggregatedPains[cleanedLabel].total += value;
                            aggregatedPains[cleanedLabel].occurrences += 1;

                            // Store sub-variations
                            if (rawLabel) {
                                aggregatedPains[cleanedLabel].variations[rawLabel] = (aggregatedPains[cleanedLabel].variations[rawLabel] || 0) + 1;
                            }
                        }
                    });
                }
            });

            // Convert and average values
            reportPains = Object.entries(aggregatedPains).map(([label, stats]) => ({
                label,
                value: parseFloat((stats.total / reportCount).toFixed(2)),
                variations: Object.entries(stats.variations)
                    .map(([vLabel, count]) => ({ label: vLabel, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
            })).sort((a, b) => b.value - a.value);
        }

        // Sort raw counts
        const sortedRaw = Object.entries(rawCounts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);

        return { sortedRaw, reportPains };
    }, [data, reportData, selectedCloser, dateFrom, dateTo]);

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
                                className="px-5 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-white transition-colors"
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                </div>


                <div className="grid grid-cols-1 gap-8 mb-8">
                    {/* TOP 10 DORES - Full Width */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/5 bg-white/[0.01] flex flex-col">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                <Flame size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">TOP 10 DORES IDENTIFICADAS</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Ranking de recorrência e impacto no funil agregados historicamente</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 flex-1">
                            {loadingReports ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisando...</p>
                                </div>
                            ) : commonPainsAnalysis.reportPains.length > 0 ? (
                                commonPainsAnalysis.reportPains.slice(0, 10).map((pain, idx) => (
                                    <div key={idx}
                                        onClick={() => handleTopicClick(pain)}
                                        className="space-y-4 group p-7 rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.03] transition-all border border-white/5 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500/30" />
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="flex items-center gap-5">
                                                <span className="text-sm font-black text-slate-700">#{(idx + 1).toString().padStart(2, '0')}</span>
                                                <span className="text-xl font-black text-slate-100 uppercase italic tracking-tight group-hover:text-white transition-colors">{pain.label}</span>
                                            </div>
                                            <span className="text-base font-black text-red-400 bg-red-500/10 px-5 py-2 rounded-2xl border border-red-500/20">{pain.value}%</span>
                                        </div>
                                        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-600 via-red-400 to-amber-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                                style={{ width: `${pain.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-700">
                                        <AlertCircle size={32} />
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Aguardando dados</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Analysis by Closer */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <Users2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Análise por Closer</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Métricas individuais e feedbacks</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(() => {
                                try {
                                    const analises = JSON.parse(latestReport?.analise_por_closer || "[]");
                                    if (Array.isArray(analises) && analises.length > 0) {
                                        return analises.map((closer, idx) => (
                                            <div key={idx} className="glass-card p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all group">
                                                <div className="flex flex-col gap-10">
                                                    {/* Header: Name & Category */}
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-8 gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:border-purple-500/50 transition-colors">
                                                                <User size={32} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{closer.nome}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={clsx("w-2 h-2 rounded-full",
                                                                        closer.categoria === "EM DESENVOLVIMENTO" ? "bg-amber-500" :
                                                                            closer.categoria === "RISCO OPERACIONAL" ? "bg-red-500" : "bg-emerald-500"
                                                                    )} />
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{closer.categoria}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={clsx(
                                                            "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border shadow-lg transition-all",
                                                            closer.categoria === "EM DESENVOLVIMENTO" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                closer.categoria === "RISCO OPERACIONAL" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        )}>
                                                            Status: {closer.categoria}
                                                        </div>
                                                    </div>


                                                    {/* Bottom: Frequency List */}
                                                    {(() => {
                                                        const groupedPains = {};
                                                        let totalCount = 0;
                                                        closer.dores_individuais?.forEach(d => {
                                                            const cleaned = getCleanField(d.dor_identificada || d.label || d.name, 'dor');
                                                            if (cleaned) {
                                                                if (!groupedPains[cleaned]) groupedPains[cleaned] = { count: 0 };
                                                                groupedPains[cleaned].count += 1;
                                                                totalCount += 1;
                                                            }
                                                        });

                                                        const painList = Object.entries(groupedPains)
                                                            .map(([label, stats]) => ({
                                                                label,
                                                                count: stats.count,
                                                                value: (stats.count / totalCount) * 100
                                                            }))
                                                            .sort((a, b) => b.count - a.count);

                                                        if (painList.length === 0) return null;

                                                        return (
                                                            <div className="pt-10 border-t border-white/5">
                                                                <div className="flex items-center justify-between mb-8">
                                                                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Frequência de Dores Identificadas</h5>
                                                                    <span className="text-[10px] font-black text-slate-700 uppercase">Top 4 Recorrências</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                                                                    {painList.slice(0, 4).map((pain, pIdx) => (
                                                                        <div key={pIdx} className="space-y-4 group/item">
                                                                            <div className="flex justify-between items-end">
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-xs font-black text-slate-600 bg-white/5 w-6 h-6 rounded-full flex items-center justify-center border border-white/5">{pain.count}</span>
                                                                                    <span className="text-sm font-bold text-slate-300 uppercase tracking-tight group-hover/item:text-white transition-colors">
                                                                                        {pain.label}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-xs font-black text-red-400">{pain.value.toFixed(1)}%</span>
                                                                            </div>
                                                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                                <div
                                                                                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000"
                                                                                    style={{ width: `${pain.value}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
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
            {/* Topic Details Modal */}
            {selectedTopic && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[3rem] border border-white/10 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                                    <Flame size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">{selectedTopic.label}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                                        <TrendingUp size={12} className="text-red-400" />
                                        Impacto de {selectedTopic.value}% no funil
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTopic(null)}
                                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextos e Dores Reais (Exemplos Diretos)</h3>
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-slate-600 uppercase">Feedback do Especialista</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {selectedTopic.calls?.length > 0 ? (
                                        selectedTopic.calls.map((call, i) => {
                                            // Prioritize descriptive columns and ignore short numeric rankings
                                            const getBestText = (obj) => {
                                                const priorityKeys = [
                                                    "Dores do Cliente",
                                                    "Objeções do Cliente",
                                                    "Análise do Especialista",
                                                    "Principais Dores",
                                                    "Objeções Identificadas",
                                                    "Dores Identificadas",
                                                    "Entendimento Dores Analise",
                                                    "Objeções Analise"
                                                ];

                                                for (const key of priorityKeys) {
                                                    const val = obj[key];
                                                    if (val && val.toString().length > 3) return val.toString();
                                                }

                                                // Fallback to fuzzy search but skip short numbers
                                                for (const key in obj) {
                                                    if (/analise|dor|obje|comentario/i.test(key)) {
                                                        const val = obj[key];
                                                        if (val && val.toString().length > 10) return val.toString();
                                                    }
                                                }
                                                return "Detalhe não disponível para este registro.";
                                            };

                                            const rawText = getBestText(call);
                                            return (
                                                <div key={i} className="group flex flex-col p-7 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-red-500/30 transition-all space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-red-500/50 transition-colors">
                                                                <User size={14} className="text-slate-400 group-hover:text-red-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-white uppercase">{call.Closer}</p>
                                                                <p className="text-[8px] font-bold text-slate-600">{call.Data}</p>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-1 bg-red-500/5 rounded-lg border border-red-500/10">
                                                            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Depoimento Real</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                                        "{rawText.length > 400 ? rawText.substring(0, 400) + '...' : rawText}"
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-50">
                                            <Search size={32} className="text-slate-500" />
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Nenhum detalhamento textual encontrado<br />para esta categoria no período</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-black/40 border-t border-white/5 flex justify-center">
                            <button
                                onClick={() => setSelectedTopic(null)}
                                className="px-10 py-4 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all transform active:scale-95 shadow-xl"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardContent>
    );
}
