import { Phone, CalendarCheck, TrendingUp } from "lucide-react";

const SCORE_KEYS = ["Adesão ao Script", "Conexão/Rapport", "Apres. Autoridade", "Entendimento Dores", "Apres. Solução", "Pitch", "Negociação", "Fechamento", "Confiança", "CTA", "Objeções"];

function isClosed(row) {
    return (row["Status"] || "").toLowerCase().includes("fechad");
}

export default function DashboardStats({ data }) {
    const total = data.length;

    const scheduled = data.filter(isClosed).length;
    const scheduledPct = total > 0 ? Math.round((scheduled / total) * 100) : 0;

    function parseScore(v) {
        return parseFloat(String(v ?? "").replace(",", "."));
    }

    let scoreSum = 0, scoreCount = 0;
    data.forEach(row => {
        SCORE_KEYS.forEach(key => {
            const v = parseScore(row[key]);
            if (!isNaN(v)) { scoreSum += v; scoreCount++; }
        });
    });
    const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : "—";

    const stats = [
        {
            title: "Total de Ligações",
            value: total,
            icon: Phone,
            color: "text-sky-200",
            bg: "bg-sky-500/20",
        },
        {
            title: "Fechamentos",
            value: scheduled,
            sub: total > 0 ? `${scheduledPct}% de taxa` : null,
            icon: CalendarCheck,
            color: "text-cyan-200",
            bg: "bg-cyan-500/20",
        },
        {
            title: "Score Médio",
            value: avgScore,
            sub: "Média geral das ligações",
            icon: TrendingUp,
            color: "text-blue-200",
            bg: "bg-blue-500/20",
        },
    ];

    return (
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, idx) => (
                <div
                    key={idx}
                    className="glass-panel camo-panel p-6 rounded-xl flex flex-col justify-between relative overflow-hidden group border border-sky-300/20 hover:border-sky-300/45 transition-all duration-300"
                >
                    <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-full -mr-4 -mt-4 opacity-70 group-hover:scale-110 transition-transform duration-500`} />
                    <div className="flex justify-between items-start z-10">
                        <div className={`p-3 rounded-lg ${stat.bg} border border-sky-200/20`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                    </div>
                    <div className="mt-4 z-10">
                        <h3 className="text-sm font-medium text-slate-300">{stat.title}</h3>
                        <p className="text-3xl font-bold mt-1 text-sky-50 tracking-tight">{stat.value}</p>
                        {stat.sub && <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}
