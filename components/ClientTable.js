"use client";

import { ExternalLink, Calendar, Building2, User, CheckCircle2, Clock, MoreHorizontal } from "lucide-react";
import { formatDateTime, getAvgScore, parseScore } from "../lib/utils";

function getStatusBadge(value) {
    const v = (value || "").toLowerCase();
    const isClosed = v.includes("fechad");
    const isPending = v.includes("pendent") || v.includes("negociaç");
    
    if (isClosed) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 size={12} />
                Fechado
            </div>
        );
    }
    
    if (isPending) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                <Clock size={12} />
                Pendente
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold uppercase tracking-wider">
            Perdido
        </div>
    );
}

function ScoreBar({ value }) {
    const score = parseScore(value);
    if (isNaN(score)) return <span className="text-slate-600 text-xs">—</span>;
    const pct = Math.min((score / 10) * 100, 100);
    const color = score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
    const textColor = score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-red-400";
    
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} 
                    style={{ width: `${pct}%` }} 
                />
            </div>
            <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{score}</span>
        </div>
    );
}

export default function ClientTable({ data, onOpenModal }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5">
                <p className="text-slate-500 text-sm font-medium">Nenhuma ligação encontrada com os filtros aplicados.</p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <div className="flex items-center gap-2"><Calendar size={12} /> Data</div>
                            </th>
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <div className="flex items-center gap-2"><Building2 size={12} /> Empresa</div>
                            </th>
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <div className="flex items-center gap-2"><User size={12} /> Closer</div>
                            </th>
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Status</th>
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hidden lg:table-cell">Score</th>
                            <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row, idx) => {
                            const avg = getAvgScore(row);
                            return (
                                <tr
                                    key={idx}
                                    className="group hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
                                    onClick={() => onOpenModal && onOpenModal(row)}
                                >
                                    <td className="px-6 py-5">
                                        <div className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                                            {formatDateTime(row["Data"]).split(" ")[0]}
                                            <span className="block text-[10px] text-slate-600 mt-0.5">{formatDateTime(row["Data"]).split(" ")[1]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                                            {row["Empresa (Cliente)"]}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                                                {row["Closer"]?.charAt(0)}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-300">{row["Closer"]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {getStatusBadge(row["Status"])}
                                    </td>
                                    <td className="px-6 py-5 hidden lg:table-cell min-w-[120px]">
                                        <ScoreBar value={avg} />
                                    </td>
                                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-3">
                                            {row["Transcrição Completa"] ? (
                                                <a
                                                    href={row["Transcrição Completa"]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            ) : (
                                                <div className="w-8 h-8 flex items-center justify-center">
                                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                </div>
                                            )}
                                            <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
