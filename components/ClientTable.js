"use client";

import { ExternalLink } from "lucide-react";

const SCORE_KEYS = ["Conexão/Rapport", "Apres. Autoridade", "Entendimento Dores", "Apres. Solução", "Agendamento"];

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

function getMeetingBadge(value) {
    const v = (value || "").toUpperCase();
    const yes = v === "TRUE" || v === "SIM" || v === "YES";
    const color = yes
        ? "bg-emerald-500/20 text-emerald-100 border-emerald-300/35"
        : "bg-red-500/20 text-red-100 border-red-300/35";
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${color}`}>
            {yes ? "Sim" : "Não"}
        </span>
    );
}

function getAvgScore(row) {
    const vals = SCORE_KEYS.map(k => parseFloat(row[k])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function ScoreBar({ value }) {
    const score = parseFloat(value);
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
                        <th className="px-4 py-3">Prospect / Empresa</th>
                        <th className="px-4 py-3">SDR</th>
                        <th className="px-4 py-3">Reunião?</th>
                        <th className="px-4 py-3 hidden md:table-cell">Probabilidade</th>
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
                                    {row["Prospect / Empressa"]}
                                </td>
                                <td className="px-4 py-4 text-slate-200 text-sm">
                                    {row["SDR / Pré-venda"]}
                                </td>
                                <td className="px-4 py-4">
                                    {getMeetingBadge(row["Reunião Marcada?"])}
                                </td>
                                <td
                                    className="px-4 py-4 hidden md:table-cell text-slate-300 text-xs max-w-[200px] truncate"
                                    title={row["Probabilidade Show"]}
                                >
                                    {row["Probabilidade Show"] || "—"}
                                </td>
                                <td className="px-4 py-4 hidden lg:table-cell">
                                    <ScoreBar value={avg} />
                                </td>
                                <td
                                    className="px-4 py-4 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {row["Link Documento"] ? (
                                        <a
                                            href={row["Link Documento"]}
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
