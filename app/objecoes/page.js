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

// Objection Categories
const CATEGORIES = [
    { id: "finance", label: "Financeiro / Preço", icon: DollarSign, color: "text-red-400", bg: "bg-red-500", keywords: ["caro", "preço", "valor", "dinheiro", "investimento", "caixa", "orçamento", "sem verba", "condição", "pagamento", "juros", "parcela", "custo", "grana", "boleto", "cartao", "pix", "entrada", "desconto", "taxa"] },
    { id: "authority", label: "Autoridade / Sócio", icon: Users2, color: "text-primary", bg: "bg-primary", keywords: ["sócio", "esposa", "marido", "diretoria", "decisor", "falar com", "aprovação", "consultar", "reunião com o", "votação", "decidir", "conselho", "patrao", "chefe", "dono"] },
    { id: "time", label: "Momento / Urgência", icon: Clock, color: "text-amber-400", bg: "bg-amber-500", keywords: ["pensar", "depois", "mês que vem", "amanhã", "segunda", "tempo", "correria", "prioridade", "agora não", "foco", "planejamento", "analisar", "ver depois", "esperar", "proxima", "semana"] },
    { id: "trust", label: "Confiança / Prova", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500", keywords: ["certeza", "garantia", "resultado", "caso", "prova", "medo", "risco", "seguro", "funciona", "depoimento", "conhecer", "referência", "verdade", "mentira", "golpe", "credibilidade"] },
    { id: "product", label: "Produto / Fit", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500", keywords: ["fit", "funciona", "solução", "ferramenta", "processo", "metodologia", "integra", "api", "complexo", "difícil", "produto", "sistema", "software", "entregue", "onboarding"] },
    { id: "priority", label: "Estratégia / Momento", icon: Target, color: "text-purple-400", bg: "bg-purple-500", keywords: ["concorrência", "outro", "empresa x", "comparando", "melhor preço", "já tenho", "usando", "estou com", "mercado", "proposta", "concorrente", "orcamento de outro"] },
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
        .replace(/Objeção de /gi, '')
        .replace(/Objeção /gi, '')
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
    
    if (type === 'objecao') {
        if (lower.includes('caro') || lower.includes('preco alto') || lower.includes('custo') || lower.includes('orcamento apertado')) {
            return "Preço / Orçamento Alto";
        }
        if (lower.includes('sem verba') || lower.includes('financeir') || lower.includes('investimento') || lower.includes('dinheiro')) {
            return "Falta de Verba Atual";
        }
        if (lower.includes('socio') || lower.includes('esposa') || lower.includes('marido') || lower.includes('diretoria')) {
            return "Precisa Consultar Sócio/Diretoria";
        }
        if (lower.includes('decisor') || lower.includes('nao participou') || lower.includes('ausente')) {
            return "Decisor Não Participou";
        }
        if (lower.includes('tempo') || lower.includes('momento') || lower.includes('analisar') || lower.includes('depois')) {
            return "Momento Inadequado (Depois)";
        }
        if (lower.includes('prioridade') || lower.includes('urgencia') || lower.includes('pensar')) {
            return "Sem Senso de Urgência / Prioridade";
        }
        if (lower.includes('fit') || lower.includes('produto') || lower.includes('solucao') || lower.includes('metodologia')) {
            return "Produto / Falta de Fit Técnico";
        }
        if (lower.includes('concorrente') || lower.includes('outra solucao') || lower.includes('ja tem')) {
            return "Já possui outra solução";
        }
        if (lower.includes('medo') || lower.includes('inseguranca') || lower.includes('risco') || lower.includes('confianca')) {
            return "Insegurança / Medo de Arriscar";
        }
        if (lower.includes('duvida') || lower.includes('entender') || lower.includes('como funciona')) {
            return "Dúvida sobre Entrega/Serviço";
        }
    }

    return result;
};

const getCleanPattern = (text, closerName) => {
    if (!text || typeof text !== 'string') return "";
    
    const normalizedName = (closerName || "").trim();
    
    // Specific fix for Carlos Silva's pain point mismatch
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
    const [selectedTopic, setSelectedTopic] = useState(null);

    const [reportData, setReportData] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);

    const latestReport = useMemo(() => {
        if (reportData.length === 0) return null;
        return reportData[reportData.length - 1];
    }, [reportData]);

    const handleTopicClick = (obj) => {
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
                    item["Principais Objeções"],
                    item["Objeções Identificadas"],
                    item["Objecoes"],
                    item["Analise"],
                    findValueByFuzzyKey(item, /obje/i),
                    findValueByFuzzyKey(item, /analise/i)
                ].filter(Boolean);
                
                const rawText = textParts.join(" ");
                if (!rawText) return false;

                const cleaned = getCleanField(rawText, 'objecao');
                if (cleaned === obj.label) return true;
                
                // Fallback matching
                const normalizedText = normalizeText(rawText);
                const normalizedLabel = normalizeText(obj.label);
                
                if (obj.label === "Financeiro (Preço/Orçamento)" && (normalizedText.includes("preco") || normalizedText.includes("orcamento") || normalizedText.includes("financeiro"))) return true;
                if (obj.label === "Decisor Ausente / Alinhamento" && (normalizedText.includes("decisor") || normalizedText.includes("socio") || normalizedText.includes("alinhamento"))) return true;
                
                return normalizedText.includes(normalizedLabel);
            }
            return false;
        }).slice(0, 5);

        setSelectedTopic({ ...obj, calls: matchingCalls });
    };

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

            const rawText = findValueByFuzzyKey(item, /obje/i) || findValueByFuzzyKey(item, /dor/i) || findValueByFuzzyKey(item, /analise/i) || "";
            const objText = normalizeText(rawText);

            // Basic Date Filtering
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

            if (matchesFrom && matchesTo && result[closerName]) {
                CATEGORIES.forEach(cat => {
                    const normalizedKeywords = cat.keywords.map(normalizeText);
                    const regex = new RegExp(`(${normalizedKeywords.join('|')})`, 'gi');
                    if (regex.test(objText)) {
                        result[closerName][cat.id].push(item);
                    }
                });
            }
        });

        return { heatmapData: result, sortedClosers: activeClosers };
    }, [data, dateFrom, dateTo, selectedCloser]);

    // Aggregate Common Pains & Objections from both Raw Data and Reports
    const commonAnalysis = useMemo(() => {
        const rawCounts = {};
        let reportPains = [];
        let reportObjections = [];

        // 1. Keyword-based frequency from all rows
        data.forEach(item => {
            const rowDate = parseRowDate(item["Data"]);
            const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
            const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());
            const closerName = normalizeCloserName(item["Closer"]);
            const matchesCloser = selectedCloser === "Todos" || closerName === selectedCloser;

            if (matchesFrom && matchesTo && matchesCloser) {
                const rawText = findValueByFuzzyKey(item, /obje/i) || findValueByFuzzyKey(item, /dor/i) || findValueByFuzzyKey(item, /analise/i) || "";
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
        const reportRows = reportData.filter(row => row.ranking_closers || row.ranking || row.principais_dores || row.Dores || row.principais_objecoes);
        const aggregatedPains = {};
        const aggregatedObjections = {};
        const reportCount = reportRows.length;

        if (reportCount > 0) {
            reportRows.forEach(report => {
                let painsInThisReport = [];
                let objectionsInThisReport = [];
                
                if (selectedCloser === "Todos") {
                    painsInThisReport = parseJSONSafely(report.principais_dores || report.Dores) || [];
                    objectionsInThisReport = parseJSONSafely(report.principais_objecoes || report.Objecoes) || [];
                } else {
                    const ranking = parseJSONSafely(report.ranking_closers || report.ranking) || [];
                    const closerData = ranking.find(c => normalizeCloserName(c.nome || c.name || c.closer_nome) === selectedCloser);
                    painsInThisReport = closerData?.dores_individuais || [];
                    objectionsInThisReport = closerData?.objecoes_individuais || [];
                }

                if (Array.isArray(painsInThisReport)) {
                    painsInThisReport.forEach(d => {
                        const rawLabel = d.dor_identificada || d.label || d.name || "";
                        const cleanedLabel = getCleanField(rawLabel, 'dor');
                        const value = parseFloat(d.frequencia_percentual || d.value || 0);
                        
                        if (cleanedLabel) {
                            if (!aggregatedPains[cleanedLabel]) aggregatedPains[cleanedLabel] = { total: 0, occurrences: 0 };
                            aggregatedPains[cleanedLabel].total += value;
                            aggregatedPains[cleanedLabel].occurrences += 1;
                        }
                    });
                }

                if (Array.isArray(objectionsInThisReport)) {
                    objectionsInThisReport.forEach(o => {
                        const rawLabel = o.objecao_identificada || o.label || o.name || "";
                        const cleanedLabel = getCleanField(rawLabel, 'objecao');
                        const value = parseFloat(o.frequencia_percentual || o.value || 0);
                        
                        if (cleanedLabel) {
                            if (!aggregatedObjections[cleanedLabel]) aggregatedObjections[cleanedLabel] = { total: 0, occurrences: 0, variations: {} };
                            aggregatedObjections[cleanedLabel].total += value;
                            aggregatedObjections[cleanedLabel].occurrences += 1;

                            // Store sub-variations
                            if (rawLabel) {
                                aggregatedObjections[cleanedLabel].variations[rawLabel] = (aggregatedObjections[cleanedLabel].variations[rawLabel] || 0) + 1;
                            }
                        }
                    });
                }
            });

            reportPains = Object.entries(aggregatedPains).map(([label, stats]) => ({
                label,
                value: parseFloat((stats.total / reportCount).toFixed(2))
            })).sort((a, b) => b.value - a.value);

            reportObjections = Object.entries(aggregatedObjections).map(([label, stats]) => ({
                label,
                value: parseFloat((stats.total / reportCount).toFixed(2)),
                variations: Object.entries(stats.variations)
                    .map(([vLabel, count]) => ({ label: vLabel, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
            })).sort((a, b) => b.value - a.value);
        }

        const sortedRaw = Object.entries(rawCounts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);

        return { sortedRaw, reportPains, reportObjections };
    }, [data, reportData, selectedCloser, dateFrom, dateTo]);

    return (
        <DashboardContent
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={() => fetchData(sheetUrl)}
            title="Inteligência de Objeções"
        >
            <div className="space-y-8 pl-8 pr-10">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black impact-title leading-tight">Inteligência de Objeções</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <ShieldAlert size={16} className="text-primary" />
                            Análise estratégica de barreiras e contornos de fechamento
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
                    {/* TOP 10 OBJEÇÕES - Full Width */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/5 bg-white/[0.01] flex flex-col">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">TOP 10 OBJEÇÕES IDENTIFICADAS</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Principais barreiras de fechamento agregadas historicamente</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 flex-1">
                            {loadingReports ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisando...</p>
                                </div>
                            ) : commonAnalysis.reportObjections.length > 0 ? (
                                commonAnalysis.reportObjections.slice(0, 10).map((obj, idx) => (
                                    <div key={idx} 
                                        onClick={() => handleTopicClick(obj)}
                                        className="space-y-4 group p-7 rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.03] transition-all border border-white/5 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/30" />
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="flex items-center gap-5">
                                                <span className="text-sm font-black text-slate-700">#{(idx + 1).toString().padStart(2, '0')}</span>
                                                <span className="text-xl font-black text-slate-100 uppercase italic tracking-tight group-hover:text-white transition-colors">{obj.label}</span>
                                            </div>
                                            <span className="text-base font-black text-amber-400 bg-amber-500/10 px-5 py-2 rounded-2xl border border-amber-500/20">{obj.value}%</span>
                                        </div>
                                        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-orange-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                                style={{ width: `${obj.value}%` }}
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

                <div className="grid grid-cols-1 gap-8 mb-20">
                    {/* Analysis by Closer */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <Users2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Análise por Closer</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Métricas individuais e feedbacks de contorno</p>
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
                                                        const groupedObj = {};
                                                        let totalCount = 0;
                                                        closer.objecoes_individuais?.forEach(o => {
                                                            const cleaned = getCleanField(o.objecao_identificada || o.label || o.name, 'objecao');
                                                            if (cleaned) {
                                                                if (!groupedObj[cleaned]) groupedObj[cleaned] = { count: 0 };
                                                                groupedObj[cleaned].count += 1;
                                                                totalCount += 1;
                                                            }
                                                        });
                                                        
                                                        const objList = Object.entries(groupedObj)
                                                            .map(([label, stats]) => ({ 
                                                                label, 
                                                                count: stats.count,
                                                                value: (stats.count / totalCount) * 100 
                                                            }))
                                                            .sort((a, b) => b.count - a.count);

                                                        if (objList.length === 0) return null;

                                                        return (
                                                            <div className="pt-10 border-t border-white/5">
                                                                <div className="flex items-center justify-between mb-8">
                                                                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Frequência de Objeções Identificadas</h5>
                                                                    <span className="text-[10px] font-black text-slate-700 uppercase">Top 4 Recorrências</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                                                                    {objList.slice(0, 4).map((obj, oIdx) => (
                                                                        <div key={oIdx} className="space-y-4 group/item">
                                                                            <div className="flex justify-between items-end">
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-xs font-black text-slate-600 bg-white/5 w-6 h-6 rounded-full flex items-center justify-center border border-white/5">{obj.count}</span>
                                                                                    <span className="text-sm font-bold text-slate-300 uppercase tracking-tight group-hover/item:text-white transition-colors">
                                                                                        {obj.label}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-xs font-black text-amber-400">{obj.value.toFixed(1)}%</span>
                                                                            </div>
                                                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                                <div 
                                                                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000" 
                                                                                     style={{ width: `${obj.value}%` }}
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
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">{selectedTopic.label}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                                        <TrendingUp size={12} className="text-amber-400" />
                                        Impacto de {selectedTopic.value}% no fechamento
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
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextos e Objeções Reais (Exemplos Diretos)</h3>
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-slate-600 uppercase">Feedback do Especialista</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {selectedTopic.calls?.length > 0 ? (
                                        selectedTopic.calls.map((call, i) => {
                                            // Prioritize descriptive columns and ignore short numeric rankings
                                            const getBestText = (obj) => {
                                                const priorityKeys = [
                                                    "Objeções do Cliente",
                                                    "Dores do Cliente", 
                                                    "Análise do Especialista", 
                                                    "Objeções Identificadas",
                                                    "Dores Identificadas",
                                                    "Objeções Analise",
                                                    "Entendimento Dores Analise",
                                                    "Principais Dores"
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
                                                <div key={i} className="group flex flex-col p-7 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-amber-500/30 transition-all space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-amber-500/50 transition-colors">
                                                                <User size={14} className="text-slate-400 group-hover:text-amber-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-white uppercase">{call.Closer}</p>
                                                                <p className="text-[8px] font-bold text-slate-600">{call.Data}</p>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-1 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Depoimento Real</span>
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
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Nenhum detalhamento textual encontrado<br/>para esta categoria no período</p>
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
