"use client";

import { Video, CalendarCheck, TrendingUp, ArrowUpRight, Zap } from "lucide-react";
import { clsx } from "clsx";

export default function DashboardStats({ stats }) {
    const { total, closedCount, conversionRate, avgScore } = stats;

    const cards = [
        {
            title: "Volume Total",
            value: total,
            sub: "Calls processadas",
            icon: Video,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            trend: "+12%",
        },
        {
            title: "Fechamentos",
            value: closedCount,
            sub: `${conversionRate}% de conversão`,
            icon: CalendarCheck,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            trend: "+5%",
        },
        {
            title: "Score Médio",
            value: avgScore,
            sub: "Qualidade das calls",
            icon: Zap,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            trend: "Meta: 7.0",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card, idx) => (
                <div
                    key={idx}
                    className="glass-card p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-default"
                >
                    {/* Background Glow */}
                    <div className={clsx(
                        "absolute -top-12 -right-12 w-32 h-32 blur-[60px] opacity-30 transition-opacity group-hover:opacity-50",
                        card.bg
                    )} />

                    <div className="flex justify-between items-start z-10">
                        <div className={clsx("p-3.5 rounded-2xl border transition-colors", card.bg, card.border)}>
                            <card.icon className={clsx("w-6 h-6", card.color)} />
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-slate-400">
                            {card.trend.startsWith("+") && <ArrowUpRight size={10} className="text-emerald-400" />}
                            {card.trend}
                        </div>
                    </div>

                    <div className="mt-6 z-10">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">{card.title}</h3>
                        <div className="flex items-center gap-2">
                             <p className="text-4xl font-extrabold text-white tracking-tight leading-none group-hover:text-glow transition-all">{card.value}</p>
                             <div className="h-px w-8 bg-white/10 mt-2" />
                        </div>
                        <p className="text-xs text-slate-400 mt-3 font-medium">{card.sub}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
