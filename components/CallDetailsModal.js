"use client";

import { useState, useMemo, useEffect } from "react";
import {
    X, Building2, User, Calendar, Database, ExternalLink, ShieldCheck,
    MousePointer2, Ban, Lightbulb, Mic2, Scale, FileText, Target, Activity, Award, Zap, Flame,
    Copy, Check, Search, Clock
} from "lucide-react";
import { formatDateTime, SCORE_KEYS, parseScore, parseBant } from "@/lib/utils";
import { clsx } from "clsx";

const SCORE_ANALYSIS_MAP = {
    "Adesão ao Script": ["Script Analise", "Adesao Analise", "AdesÃ£o Analise", "Adesão Analise", "Adesão analise"],
    "Conexão/Rapport": ["Rapport analise", "Rapport Analise", "Conexão Analise", "Conexão analise"],
    "Apres. Autoridade": ["Autoridade Analise", "Autoridade analise", "Apresentação Analise", "ApresentaÃ§Ã£o Analise"],
    "Entendimento Dores": ["Dores Analise", "Dores analise", "Entendimento Dores Analise"],
    "Apres. Solução": ["Solução Analise", "Solução Anallise", "Solucao Analise", "Solução analise", "SoluÃ§Ã£o Anallise"],
    "Pitch": ["Pitch analise", "Pitch Analise"],
    "Negociação": ["Negociação Analise", "Negociacao Analise", "NegociaÃ§Ã£o Analise", "Negociação analise"],
    "Fechamento": ["Fechamento Analise", "Fechamento analise", "Fechamento Analise"],
    "Confiança": ["Confiança Analise", "Confianca Analise", "ConfianÃ§a analise", "Confiança analise"],
    "CTA": ["Cta Analise", "CTA Analise", "CTA analise", "Cta analise"],
    "Objeções": ["Objeções Analise", "Objecoes Analise", "ObjeÃ§Ãµes Analise", "Objeções analise"],
};

const TranscriptRenderer = ({ text }) => {
    if (!text) return null;

    const blocks = useMemo(() => {
        const result = [];
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let currentTable = null;

        lines.forEach(line => {
            if (line.startsWith('|')) {
                if (line.includes('---')) return;
                
                if (!currentTable) {
                    currentTable = { type: 'table', headers: [], rows: [] };
                    result.push(currentTable);
                }
                
                const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
                
                if (currentTable.headers.length === 0) {
                    currentTable.headers = cells;
                } else {
                    currentTable.rows.push(cells);
                }
            } else {
                currentTable = null;
                result.push({ type: 'line', content: line });
            }
        });
        return result;
    }, [text]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {blocks.map((block, idx) => {
                if (block.type === 'table') {
                    return (
                        <div key={idx} className="my-8 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            {block.headers.map((h, i) => (
                                                <th key={i} className="px-6 py-4 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                                    {h.replace(/\*\*/g, '')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {block.rows.map((row, i) => (
                                            <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                                                {row.map((cell, j) => {
                                                    const cleanCell = cell.replace(/\*\*/g, '');
                                                    const isScore = cleanCell.includes('/10');
                                                    const isPercentage = cleanCell.includes('%');
                                                    return (
                                                        <td key={j} className="px-6 py-4">
                                                            <span className={clsx(
                                                                "text-xs font-medium",
                                                                isScore || isPercentage ? "text-white font-bold" : "text-slate-300",
                                                                isScore && !cleanCell.startsWith('0/') && "text-emerald-400"
                                                            )}>
                                                                {cleanCell}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                }

                const line = block.content;
                const cleanLine = line.replace(/\*\*/g, '');
                
                if (line.startsWith('# ')) {
                    return <h2 key={idx} className="text-2xl font-black text-white mt-8 mb-4 border-b border-primary/20 pb-2 uppercase italic tracking-tight">{line.replace('# ', '')}</h2>;
                }
                
                if (line.startsWith('### ') || line.startsWith('## ')) {
                    const content = line.replace(/^#+ /, '');
                    let colorClass = "text-primary";
                    if (content.toLowerCase().includes("dor")) colorClass = "text-amber-400";
                    if (content.toLowerCase().includes("plano") || content.toLowerCase().includes("ação")) colorClass = "text-emerald-400";
                    if (content.toLowerCase().includes("objetivo")) colorClass = "text-red-400";
                    
                    return <h3 key={idx} className={clsx("text-base font-black uppercase tracking-[0.2em] mt-6 mb-2 flex items-center gap-3", colorClass)}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {content}
                    </h3>;
                }

                if (line.startsWith('**') && line.endsWith('**') && line.length < 100) {
                    return <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl mb-2 font-bold text-slate-200 text-sm">
                        {cleanLine}
                    </div>;
                }

                if (line.startsWith('* ') || line.startsWith('- ')) {
                    return (
                        <div key={idx} className="flex gap-3 ml-4 mb-1 group">
                            <span className="text-primary mt-1 opacity-50 group-hover:opacity-100 transition-opacity">•</span>
                            <span className="text-slate-300 leading-relaxed text-sm">{cleanLine.replace(/^[*|-] /, '')}</span>
                        </div>
                    );
                }

                if (line.startsWith('> ')) {
                    return <blockquote key={idx} className="border-l-2 border-primary/20 pl-4 my-4 italic text-slate-400 leading-relaxed text-sm font-medium">
                        {cleanLine.replace(/^> /, '')}
                    </blockquote>;
                }

                return <p key={idx} className="text-slate-300 leading-relaxed mb-2 text-sm font-medium opacity-80">{cleanLine}</p>;
            })}
        </div>
    );
};

const BantSection = ({ data }) => {
    const bant = parseBant(data);
    if (!bant) return null;

    const items = [
        { key: "budget", label: "Budget", icon: <Database size={16} /> },
        { key: "authority", label: "Authority", icon: <ShieldCheck size={16} /> },
        { key: "need", label: "Need", icon: <Target size={16} /> },
        { key: "timing", label: "Timing", icon: <Clock size={16} /> },
    ];

    return (
        <div className="col-span-full space-y-6 mt-4 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] whitespace-nowrap">Análise BANT</h4>
                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                <div className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
                    {bant.classificacaoLead}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => {
                    const info = bant[item.key];
                    if (!info) return null;
                    
                    const statusValue = info.qualificado || info.status;
                    const statusColor = (statusValue === "Confirmado" || statusValue === "Sim") ? "text-emerald-400" : 
                                      (statusValue === "Parcial") ? "text-amber-400" : "text-red-400";
                    
                    return (
                        <div key={item.key} className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-3 flex flex-col hover:bg-white/[0.04] transition-all">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-primary">
                                    <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                </div>
                                <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-white/5 border border-white/10",
                                    statusColor
                                )}>
                                    {statusValue}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed italic flex-1">
                                "{info.evidencia}"
                            </p>
                            {info.decisor && (
                                <div className="pt-3 mt-1 border-t border-white/5">
                                    <span className="text-[8px] font-black text-slate-500 uppercase block mb-1 opacity-60">Decisor</span>
                                    <span className="text-[10px] font-bold text-slate-300">{info.decisor}</span>
                                </div>
                            )}
                            {info.geradoPeloCloser !== undefined && (
                                <div className="pt-3 mt-1 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-500 uppercase opacity-60">{item.key === 'timing' ? 'Senso de Urgência' : 'Gerado p/ Closer'}</span>
                                    {info.geradoPeloCloser ? 
                                        <div className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-tighter">
                                            <Check size={10} /> Ativo
                                        </div> : 
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                                            <X size={10} /> Ausente
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {bant.bantAnalise && (
                <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap size={80} className="text-primary" />
                    </div>
                    <h5 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Zap size={12} /> Diagnóstico Estratégico
                    </h5>
                    <p className="text-sm text-slate-200 font-medium leading-relaxed italic relative z-10">
                        {bant.bantAnalise}
                    </p>
                </div>
            )}
        </div>
    );
};

export default function CallDetailsModal({ isOpen, onClose, row }) {
    const [showRecording, setShowRecording] = useState(false);
    const [recordingType, setRecordingType] = useState("docs"); // "docs" or "tactiq"
    const [transcript, setTranscript] = useState("");
    const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [justificationModal, setJustificationModal] = useState(null);

    // Reset local states when modal closes or row changes
    useEffect(() => {
        if (!isOpen) {
            setShowRecording(false);
            setTranscript("");
            setJustificationModal(null);
        }
    }, [isOpen, row]);

    const fetchTranscript = async (url) => {
        if (!url) {
            setTranscript("URL da transcrição não fornecida.");
            return;
        }

        setIsLoadingTranscript(true);
        setTranscript(""); // Clear previous state
        
        try {
            console.log('Fetching transcript for:', url);
            const response = await fetch(`/api/transcript?url=${encodeURIComponent(url)}`);
            
            if (response.ok) {
                const text = await response.text();
                if (!text || text.trim() === "") {
                    setTranscript("A transcrição está vazia.");
                } else {
                    setTranscript(text);
                }
            } else {
                // Try to parse JSON error from server
                try {
                    const errorData = await response.json();
                    setTranscript(errorData.error || "Erro ao carregar a transcrição.");
                } catch (e) {
                    setTranscript(`Erro ${response.status}: Não foi possível carregar a transcrição.`);
                }
            }
        } catch (error) {
            console.error('Fetch transcript error:', error);
            setTranscript("Erro de conexão ao buscar a transcrição. Verifique sua rede.");
        } finally {
            setIsLoadingTranscript(false);
        }
    };

    const handleToggleRecording = (type = "docs") => {
        const isSameType = showRecording && recordingType === type;
        const nextState = !isSameType;
        
        setShowRecording(nextState);
        setRecordingType(type);

        if (nextState) {
            setTranscript("");
            
            // Consolidate possible transcript column names
            let url = "";
            if (type === "docs") {
                url = row["Transcrição Completa"] || row["Transcrição completa"] || row["Transcript"];
            } else {
                url = row["Transcrição completa - Tactiq"] || row["Transcrição completa - Tqctiq"] || row["Tactiq Transcript"];
            }
            
            console.log(`Attempting to open ${type} transcript... found URL:`, url);

            if (url && url.trim() !== "") {
                fetchTranscript(url);
            } else {
                setTranscript(`Nenhum link de transcrição (${type}) encontrado para este registro.`);
            }
        }
    };


    const handleCopy = () => {
        navigator.clipboard.writeText(transcript);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!isOpen || !row) return null;

    return (
        <>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
                <div className="glass-card xl:max-w-7xl w-full max-h-[90vh] flex flex-col rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-[0_0_80px_rgba(30,58,138,0.3)] animate-in zoom-in duration-300">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                                    <Building2 size={24} className="text-primary" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight leading-none uppercase italic">{row["Empresa (Cliente)"]}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                    <User size={12} className="text-primary" /> {row["Closer"]}
                                </span>
                                <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                    <Calendar size={12} className="text-primary" /> {formatDateTime(row["Data"])}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 rounded-full hover:bg-white/5 text-slate-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        {showRecording ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                            {recordingType === "docs" ? <FileText size={20} /> : <ExternalLink size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest">{recordingType === "docs" ? "Google Docs" : "Tactiq Analytics"}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conteúdo da Reunião</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowRecording(false)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                                            <X size={14} /> Fechar
                                        </button>
                                        <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all font-bold">
                                            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            {isCopied ? "Copiado!" : "Copiar"}
                                        </button>
                                    </div>
                                </div>
                                {isLoadingTranscript ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">Carregando Transcrição...</p>
                                    </div>
                                ) : (
                                    <TranscriptRenderer text={transcript} />
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-8">
                                    {row["Status"] && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Activity size={12} /> Status / Resumo
                                            </h4>
                                            <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem] shadow-lg shadow-primary/5">
                                                <p className="text-sm text-primary leading-relaxed font-black uppercase italic tracking-tight">{row["Status"]}</p>
                                                {row["Conclusão"] && (
                                                    <p className="mt-4 text-[13px] text-slate-300 font-medium border-t border-white/5 pt-4 leading-relaxed">{row["Conclusão"]}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {row["Dores do Cliente"] && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Flame size={12} /> Dores do Cliente
                                            </h4>
                                            <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem] shadow-lg shadow-amber-500/5">
                                                <p className="text-[13px] text-slate-300 leading-relaxed font-bold">{row["Dores do Cliente"]}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] whitespace-nowrap">Competências Avaliadas</h4>
                                        <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 pb-4">
                                        {[
                                            { key: "Adesão ao Script", icon: <FileText size={18} /> },
                                            { key: "Conexão/Rapport", icon: <Zap size={18} /> },
                                            { key: "Apres. Autoridade", icon: <Award size={18} /> },
                                            { key: "Entendimento Dores", icon: <Activity size={18} /> },
                                            { key: "Apres. Solução", icon: <Lightbulb size={18} /> },
                                            { key: "Pitch", icon: <Mic2 size={18} /> },
                                            { key: "Negociação", icon: <Scale size={18} /> },
                                            { key: "Fechamento", icon: <Target size={18} /> },
                                            { key: "Confiança", icon: <ShieldCheck size={18} /> },
                                            { key: "CTA", icon: <MousePointer2 size={18} /> },
                                            { key: "Objeções", icon: <Ban size={18} /> },
                                        ].map(({ key, icon }, idx) => {
                                            const val = parseFloat(String(row[key] ?? "").replace(",", "."));
                                            const isNumeric = !isNaN(val);
                                            const colorClass = !isNumeric ? "text-slate-600 border-slate-900 bg-black/20" :
                                                val >= 8 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-emerald-500/5" :
                                                    val >= 6 ? "text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-primary/5" :
                                                        val >= 4 ? "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 shadow-amber-500/5" :
                                                            "text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 shadow-red-500/5";
                                            
                                            return (
                                                <div 
                                                    key={key} 
                                                    onClick={() => {
                                                        const possibleKeys = SCORE_ANALYSIS_MAP[key] || [];
                                                        const content = possibleKeys.reduce((acc, k) => acc || row[k], null);
                                                        setJustificationModal({ title: key, content: content || "Nenhuma justificativa detalhada encontrada para esta nota na planilha." });
                                                    }}
                                                    className={clsx("group relative p-4 rounded-[1.5rem] border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden", colorClass)}
                                                >
                                                    <div className="p-2 mb-1 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors shadow-inner">{icon}</div>
                                                    <div className="text-xl font-black tracking-tight">{isNumeric ? val : "—"}</div>
                                                    <div className="text-[8px] font-black uppercase tracking-widest mt-1 text-center opacity-60 leading-tight group-hover:opacity-100 transition-opacity whitespace-pre-wrap">{key}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {(row["Perfil"] || row["comentarioGestor"]) && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <User size={12} /> Perfil do Cliente
                                            </h4>
                                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-6">
                                                {row["Perfil"] && (
                                                    <div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 opacity-60">Perfil Comportamental</span>
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[13px] text-slate-200 font-bold italic leading-relaxed">{row["Perfil"]}</div>
                                                    </div>
                                                )}
                                                {row["comentarioGestor"] && (
                                                    <div className="border-t border-white/5 pt-6">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 opacity-60">Feedback do Gestor</span>
                                                        <p className="text-[13px] text-slate-400 font-medium italic leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">"{row["comentarioGestor"]}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <BantSection data={row["Bant"]} />
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex flex-wrap items-center gap-4">
                            {row["Transcrição Completa"] || row["Transcrição completa"] ? (
                                <>
                                    <button onClick={() => handleToggleRecording("docs")} className={clsx("group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg", showRecording && recordingType === "docs" ? "bg-white/10 text-white border border-white/20" : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white")}>
                                        <FileText size={16} /> {showRecording && recordingType === "docs" ? "Voltar para Detalhes" : "Transcrição Docs"}
                                    </button>
                                    <a href={row["Transcrição Completa"] || row["Transcrição completa"]} target="_blank" rel="noopener noreferrer" className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl border border-white/5"><ExternalLink size={16} /></a>
                                </>
                            ) : null}

                            {row["Transcrição completa - Tqctiq"] || row["Transcrição completa - Tactiq"] ? (
                                <>
                                    <button onClick={() => handleToggleRecording("tactiq")} className={clsx("group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg", showRecording && recordingType === "tactiq" ? "bg-white/10 text-white border border-white/20" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white")}>
                                        <ExternalLink size={16} /> {showRecording && recordingType === "tactiq" ? "Voltar para Detalhes" : "Transcrição Tactiq"}
                                    </button>
                                    <a href={row["Transcrição completa - Tqctiq"] || row["Transcrição completa - Tactiq"]} target="_blank" rel="noopener noreferrer" className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl border border-white/5"><ExternalLink size={16} /></a>
                                </>
                            ) : null}
                        </div>
                        <button onClick={onClose} className="px-10 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-all">Fechar Painel</button>
                    </div>
                </div>
            </div>

            {justificationModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setJustificationModal(null)}>
                    <div className="glass-card max-w-lg w-full p-8 rounded-[2.5rem] border border-white/20 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setJustificationModal(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-slate-500"><X size={20} /></button>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Lightbulb size={24} /></div>
                            <div>
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Justificativa da Nota</h3>
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{justificationModal.title}</h2>
                            </div>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl min-h-[150px] flex items-center text-slate-200 font-medium">{justificationModal.content}</div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={() => setJustificationModal(null)} className="px-8 py-3 rounded-2xl bg-primary/20 text-primary border border-primary/30 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Entendi</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
