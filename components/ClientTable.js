"use client";

import { ExternalLink } from "lucide-react";

const SCORE_KEYS = ["Adesão ao Script", "Conexão/Rapport", "Apres. Autoridade", "Entendimento Dores", "Apres. Solução", "Pitch", "Negociação", "Fechamento", "Confiança", "CTA", "Objeções"];

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

function getStatusBadge(value) {
    const v = (value || "").toLowerCase();
    const isClosed = v.includes("fechad");
    const isPending = v.includes("pendent") || v.includes("negociaç");
    const color = isClosed
        ? "bg-emerald-500/20 text-emerald-100 border-emerald-300/35"
        : isPending
        ? "bg-amber-500/20 text-amber-100 border-amber-300/35"
        : "bg-red-500/20 text-red-100 border-red-300/35";
    return (
        <div className={`px-3 py-1.5 rounded-md text-sm font-medium border w-fit max-w-[280px] ${color}`}>
            {value || "—"}
        </div>
    );
}

function parseScore(v) {
    return parseFloat(String(v ?? "").replace(",", "."));
}

function getAvgScore(row) {
    const vals = SCORE_KEYS.map(k => parseScore(row[k])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function ScoreBar({ value }) {
    const score = parseScore(value);
    if (isNaN(score)) return <span className="text-gray-600 text-xs">—</span>;
    const pct = Math.min((score / 10) * 100, 100);
    const color = score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
    const textColor = score >= 7 ? "text-emerald-300" : score >= 4 ? "text-amber-300" : "text-red-300";
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs ${textColor}`}>{score}</span>
        </div>
    );
}

export default function ClientTable({ data, onOpenModal }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500 text-sm">
                {data ? "Nenhuma ligação encontrada com os filtros aplicados." : "Carregue uma planilha para ver os dados."}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-xs uppercase text-slate-300 font-medium tracking-wider">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Data</th>
                        <th className="px-4 py-3">Empresa (Cliente)</th>
                        <th className="px-4 py-3">Closer</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 hidden md:table-cell">Resultado Final</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Score Médio</th>
                        <th className="px-4 py-3 rounded-tr-lg text-center">Doc</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-sky-200/10">
                    {data.map((row, idx) => {
                        const avg = getAvgScore(row);
                        return (
                            <tr
                                key={idx}
                                className="hover:bg-blue-500/10 transition-colors group cursor-pointer"
                                onClick={() => onOpenModal && onOpenModal(row)}
                            >
                                <td className="px-4 py-4 text-slate-300 text-xs whitespace-nowrap">
                                    {formatDateTime(row["Data"])}
                                </td>
                                <td className="px-4 py-4 font-semibold text-sky-50 group-hover:text-sky-200 transition-colors">
                                    {row["Empresa (Cliente)"]}
                                </td>
                                <td className="px-4 py-4 text-slate-200 text-sm">
                                    {row["Closer"]}
                                </td>
                                <td className="px-4 py-4">
                                    {getStatusBadge(row["Status"])}
                                </td>
                                <td className="px-4 py-4 hidden md:table-cell max-w-[260px]">
                                    {row["Resultado Final"] ? (
                                        <p className="text-slate-300 text-xs italic leading-relaxed line-clamp-2 border-l-2 border-sky-500/40 pl-2">
                                            {row["Resultado Final"]}
                                        </p>
                                    ) : (
                                        <span className="text-gray-600">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 hidden lg:table-cell">
                                    <ScoreBar value={avg} />
                                </td>
                                <td
                                    className="px-4 py-4 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {row["Transcrição Completa"] ? (
                                        <a
                                            href={row["Transcrição Completa"]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-300 hover:text-sky-100 transition-colors inline-flex justify-center"
                                            title="Abrir documento"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    ) : (
                                        <span className="text-gray-600">—</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
