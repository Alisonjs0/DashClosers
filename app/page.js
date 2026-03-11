"use client";

import { useEffect, useState } from "react";
import DashboardStats from "@/components/DashboardStats";
import SatisfactionChart from "@/components/SatisfactionChart";
import ClientTable from "@/components/ClientTable";
import { RefreshCcw, Search, Filter, X, ExternalLink } from "lucide-react";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1JhnWKiaCp-1sLx04vn4HKMiNMvSxgFu3rqvrBHUcJAU/edit?gid=0#gid=0";

// Helper to parse JSON fields from sheet cells
function parseJsonField(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && (value.trim().startsWith("[") || value.trim().startsWith("{"))) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { }
    }
    return null;
}

function parseRowDate(value) {
    if (!value || typeof value !== "string") return null;
    const raw = value.trim();

    // Supports values like [DateTime: 2026-03-11T10:53:12.118-03:00]
    const dateTimeMatch = raw.match(/^\[DateTime:\s*(.+)\]$/);
    if (dateTimeMatch && dateTimeMatch[1]) {
        const parsed = new Date(dateTimeMatch[1]);
        if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
    }

    // Supports direct ISO values if they come without wrapper
    const isoParsed = new Date(raw);
    if (!Number.isNaN(isoParsed.getTime())) return isoParsed.getTime();

    // Supports dd-mm-yyyy and dd/mm/yyyy from sheet exports
    const match = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    return new Date(year, month, day).getTime();
}

function formatDateTime(value) {
    if (!value) return "—";
    const raw = String(value).trim();

    const match = raw.match(/^\[DateTime:\s*(.+)\]$/);
    if (match && match[1]) {
        const parsed = new Date(match[1]);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        }
    }

    return raw;
}

function isMeetingScheduled(value) {
    const meeting = (value || "").toUpperCase();
    return meeting === "TRUE" || meeting === "SIM" || meeting === "YES";
}

export default function Home() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
    const [sheetInputValue, setSheetInputValue] = useState(DEFAULT_SHEET_URL);
    const [sheetModalOpen, setSheetModalOpen] = useState(false);
    const [rankingModalOpen, setRankingModalOpen] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [sdrFilter, setSdrFilter] = useState("all");
    const [meetingFilter, setMeetingFilter] = useState("all");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRow, setModalRow] = useState(null);

    const openModal = (row) => {
        setModalRow(row);
        setModalOpen(true);
    };

    const fetchData = async (url) => {
        const targetUrl = url || sheetUrl;
        if (!targetUrl) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/sheets?url=${encodeURIComponent(targetUrl)}`);
            const jsonData = await res.json();
            if (jsonData.error) {
                console.error("API Error:", jsonData.error);
            } else {
                setData(Array.isArray(jsonData.data) ? jsonData.data : []);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSheet = () => {
        if (!sheetInputValue.trim()) return;
        setSheetUrl(sheetInputValue.trim());
        fetchData(sheetInputValue.trim());
        setSheetModalOpen(false);
    };

    useEffect(() => {
        if (!sheetUrl) return;
        fetchData(sheetUrl);
        const interval = setInterval(() => fetchData(sheetUrl), 30000);
        return () => clearInterval(interval);
    }, [sheetUrl]);

    // Derived State: Filtered Data
    const filteredData = data.filter(item => {
        const prospect = (item["Prospect / Empressa"] || "").toLowerCase();
        const sdr = (item["SDR / Pré-venda"] || "").toLowerCase();
        const isScheduled = isMeetingScheduled(item["Reunião Marcada?"]);

        const matchesSearch = prospect.includes(searchTerm.toLowerCase());
        const matchesSdr = sdrFilter === "all" || sdr === sdrFilter.toLowerCase();
        const matchesMeeting =
            meetingFilter === "all" ||
            (meetingFilter === "yes" && isScheduled) ||
            (meetingFilter === "no" && !isScheduled);

        return matchesSearch && matchesSdr && matchesMeeting;
    }).sort((a, b) => {
        const dateA = parseRowDate(a["Data"]);
        const dateB = parseRowDate(b["Data"]);

        // Most recent first; rows with invalid/missing dates go to the end.
        if (dateA === null && dateB === null) return 0;
        if (dateA === null) return 1;
        if (dateB === null) return -1;
        return dateB - dateA;
    });

    // Unique SDRs for Filter Dropdown
    const sdrs = [...new Set(data.map(item => item["SDR / Pré-venda"]).filter(Boolean))];

    const sdrRanking = Object.entries(
        filteredData.reduce((acc, row) => {
            const sdr = row["SDR / Pré-venda"] || "Não informado";
            if (!acc[sdr]) acc[sdr] = 0;
            if (isMeetingScheduled(row["Reunião Marcada?"])) {
                acc[sdr] += 1;
            }
            return acc;
        }, {})
    )
        .map(([name, meetings]) => ({ name, meetings }))
        .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name, "pt-BR"));

    const sdrCallsRanking = Object.entries(
        filteredData.reduce((acc, row) => {
            const sdr = row["SDR / Pré-venda"] || "Não informado";
            if (!acc[sdr]) acc[sdr] = 0;
            acc[sdr] += 1;
            return acc;
        }, {})
    )
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name, "pt-BR"));

    return (
        <main className="min-h-screen p-5 md:p-8 bg-background text-foreground">
            <div className="max-w-7xl mx-auto space-y-8 reveal-rise">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="impact-title text-5xl md:text-6xl text-sky-100 leading-none">
                            Dashboard de Pré-Vendas
                        </h1>
                        <p className="text-muted-foreground mt-2 text-slate-300 text-sm md:text-base">
                            Visão geral — {filteredData.length} de {data.length} ligações exibidas
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSheetModalOpen(true)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/35 text-sky-100 border border-blue-300/35 rounded-lg transition-colors text-sm font-semibold glass-panel danger-glow"
                        >
                            Conectar Planilha
                        </button>
                        <button
                            onClick={() => fetchData(sheetUrl)}
                            disabled={!sheetUrl || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-100 border border-cyan-300/35 rounded-lg transition-colors text-sm font-semibold glass-panel disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                            Atualizar
                        </button>
                    </div>
                </header>

                {/* Stats & Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DashboardStats data={filteredData} />
                    <div className="md:col-span-1 glass-panel camo-panel rounded-xl p-6 flex flex-col items-center justify-center border border-sky-300/20">
                        <h3 className="w-full text-lg font-semibold mb-4 text-sky-100 text-left">Distribuição de Agendamentos</h3>
                        <SatisfactionChart data={filteredData} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => setRankingModalOpen(true)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/35 text-sky-100 border border-blue-300/35 rounded-lg transition-colors text-sm font-semibold glass-panel"
                    >
                        Ver ranking
                    </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar prospect / empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-secondary/45 border border-sky-300/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500/60 text-sm text-sky-50 placeholder-slate-400"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={sdrFilter}
                            onChange={(e) => setSdrFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-secondary/45 border border-sky-300/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500/60 text-sm appearance-none cursor-pointer text-sky-50"
                        >
                            <option value="all" className="bg-[#1e1e1e] text-gray-300">Todos os SDRs</option>
                            {sdrs.map(s => (
                                <option key={s} value={s} className="bg-[#1e1e1e] text-gray-300">{s}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={meetingFilter}
                            onChange={(e) => setMeetingFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-secondary/45 border border-sky-300/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500/60 text-sm appearance-none cursor-pointer text-sky-50"
                        >
                            <option value="all" className="bg-[#1e1e1e] text-gray-300">Todas as Ligações</option>
                            <option value="yes" className="bg-[#1e1e1e] text-gray-300">Reunião Marcada</option>
                            <option value="no" className="bg-[#1e1e1e] text-gray-300">Sem Reunião</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* Table Section */}
                <section className="glass-panel camo-panel rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-white/5">
                        <h2 className="impact-title text-3xl text-sky-100">Ligações de Pré-Vendas</h2>
                        <div className="text-xs text-gray-500">
                            {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR")}` : "Carregue uma planilha para começar"}
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex justify-center items-center py-20 gap-3">
                                <RefreshCcw className="animate-spin text-sky-300 w-5 h-5" />
                            <span className="text-gray-500 text-sm">Carregando planilha...</span>
                        </div>
                    ) : (
                        <ClientTable data={filteredData} onOpenModal={openModal} />
                    )}
                </section>
            </div>

            {/* Modal */}
            {sheetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b1224] border border-sky-300/20 rounded-xl max-w-xl w-full shadow-2xl">
                        <div className="flex justify-between items-center p-5 border-b border-white/5">
                            <h3 className="impact-title text-3xl text-sky-100">Conectar Planilha</h3>
                            <button
                                onClick={() => setSheetModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <label className="block text-xs text-gray-400">URL da Planilha Google Sheets</label>
                            <input
                                type="text"
                                placeholder="Cole aqui o link da planilha..."
                                value={sheetInputValue}
                                onChange={(e) => setSheetInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleLoadSheet()}
                                className="w-full px-4 py-2 bg-secondary/45 border border-sky-300/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500/60 text-sm text-sky-50 placeholder-slate-400"
                            />
                        </div>
                        <div className="p-4 border-t border-white/5 flex justify-end gap-2 bg-white/5 rounded-b-xl">
                            <button
                                onClick={() => setSheetModalOpen(false)}
                                className="px-4 py-2 bg-secondary/50 hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLoadSheet}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Carregar Planilha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ranking Modal */}
            {rankingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b1224] border border-sky-300/20 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
                            <h3 className="impact-title text-3xl text-sky-100">Ranking de SDR por Resultados</h3>
                            <button
                                onClick={() => setRankingModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar">
                            {sdrRanking.length === 0 && sdrCallsRanking.length === 0 ? (
                                <p className="text-sm text-gray-500">Sem dados para montar o ranking.</p>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-sky-200 mb-2">Reuniões Agendadas</h4>
                                        <div className="space-y-2">
                                            {sdrRanking.map((item, idx) => (
                                                <div
                                                    key={`meetings-${item.name}`}
                                                    className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-4 py-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-full bg-blue-500/25 text-sky-200 text-xs font-bold flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm text-gray-200 font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm text-sky-200 font-semibold">
                                                        {item.meetings} {item.meetings === 1 ? "reunião" : "reuniões"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-cyan-200 mb-2">Ligações Realizadas</h4>
                                        <div className="space-y-2">
                                            {sdrCallsRanking.map((item, idx) => (
                                                <div
                                                    key={`calls-${item.name}`}
                                                    className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-4 py-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-full bg-cyan-500/25 text-cyan-200 text-xs font-bold flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm text-gray-200 font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm text-cyan-200 font-semibold">
                                                        {item.calls} {item.calls === 1 ? "ligação" : "ligações"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5 flex justify-end bg-white/5 rounded-b-xl shrink-0">
                            <button
                                onClick={() => setRankingModalOpen(false)}
                                className="px-4 py-2 bg-secondary/50 hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && modalRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b1224] border border-sky-300/20 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start p-6 border-b border-white/5 shrink-0">
                            <div>
                                <h3 className="impact-title text-3xl text-sky-100 leading-none">{modalRow["Prospect / Empressa"]}</h3>
                                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                    <span>SDR: <span className="text-gray-200">{modalRow["SDR / Pré-venda"]}</span></span>
                                    <span className="text-gray-600">•</span>
                                    <span>Data: <span className="text-gray-200">{formatDateTime(modalRow["Data"])}</span></span>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors ml-4 shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                            {/* Probabilidade Show */}
                            {modalRow["Probabilidade Show"] && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-300 mb-1">Probabilidade de Show</h4>
                                    <p className="text-sm text-gray-400 bg-white/5 rounded-lg p-3 leading-relaxed">{modalRow["Probabilidade Show"]}</p>
                                </div>
                            )}

                            {/* Scores */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Scores da Ligação</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {["Conexão/Rapport", "Apres. Autoridade", "Entendimento Dores", "Apres. Solução", "Agendamento"].map(key => {
                                        const val = parseFloat(modalRow[key]);
                                        const tone = isNaN(val)
                                            ? {
                                                text: "text-slate-400",
                                                border: "border-slate-500/25",
                                                bg: "bg-slate-500/8",
                                            }
                                            : val >= 7
                                                ? {
                                                    text: "text-emerald-300",
                                                    border: "border-emerald-400/30",
                                                    bg: "bg-emerald-500/10",
                                                }
                                                : val >= 4
                                                    ? {
                                                        text: "text-amber-300",
                                                        border: "border-amber-400/30",
                                                        bg: "bg-amber-500/10",
                                                    }
                                                    : {
                                                        text: "text-red-300",
                                                        border: "border-red-400/30",
                                                        bg: "bg-red-500/10",
                                                    };
                                        return (
                                            <div key={key} className={`rounded-lg p-3 text-center border ${tone.border} ${tone.bg}`}>
                                                <div className={`text-2xl font-bold ${tone.text}`}>{isNaN(val) ? "—" : val}</div>
                                                <div className="text-xs text-slate-400 mt-1 leading-tight">{key}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dores Identificadas */}
                            {(() => {
                                const dores = parseJsonField(modalRow["Dores Identificadas"]);
                                if (!dores || dores.length === 0) return null;
                                return (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Dores Identificadas</h4>
                                        <ul className="space-y-1">
                                            {dores.map((d, i) => (
                                                <li key={i} className="flex gap-2 text-sm text-gray-400">
                                                    <span className="text-sky-400 shrink-0 mt-0.5">•</span>
                                                    <span>{d}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })()}

                            {/* Erros Críticos */}
                            {(() => {
                                const erros = parseJsonField(modalRow["Erros Criticos"]);
                                if (!erros || erros.length === 0) return null;
                                return (
                                    <div>
                                        <h4 className="text-sm font-semibold text-cyan-300 mb-2">Erros Críticos</h4>
                                        <ul className="space-y-2">
                                            {erros.map((e, i) => (
                                                <li key={i} className="text-sm text-gray-400 bg-cyan-500/5 border border-cyan-400/20 rounded-lg p-2 flex gap-2">
                                                    <span className="text-cyan-300 font-bold shrink-0">{i + 1}.</span>
                                                    <span dangerouslySetInnerHTML={{ __html: String(e).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })()}

                            {/* Checklist de Melhoria */}
                            {(() => {
                                const checklist = parseJsonField(modalRow["Checklist de Melhoria"]);
                                if (!checklist || checklist.length === 0) return null;
                                return (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Checklist de Melhoria</h4>
                                        {checklist.map((cat, cidx) => (
                                            <div key={cidx} className="mb-3">
                                                <div className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-1">{cat.categoria}</div>
                                                <ul className="space-y-1">
                                                    {(cat.itens || []).map((item, iidx) => (
                                                        <li key={iidx} className="flex items-start gap-2 text-sm">
                                                            <span className={item.concluido ? "text-sky-300" : "text-blue-300"}>
                                                                {item.concluido ? "✓" : "○"}
                                                            </span>
                                                            <span className={item.concluido ? "text-gray-300" : "text-gray-400"}>{item.item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Link Documento */}
                            {modalRow["Link Documento"] && (
                                <a
                                    href={modalRow["Link Documento"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200 transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    Ver Documento Completo
                                </a>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/5 flex justify-end bg-white/5 rounded-b-xl shrink-0">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 bg-secondary/50 hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
