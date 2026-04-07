"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { isClosed } from "../lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SatisfactionChart({ data }) {
    if (data.length === 0) {
        return <div className="text-center text-slate-500 py-12 font-medium">Sem dados para análise</div>;
    }

    const scheduled = data.filter((row) => isClosed(row["Status"])).length;
    const notScheduled = data.length - scheduled;

    const chartData = {
        labels: ["Fechado", "Em Aberto"],
        datasets: [
            {
                data: [scheduled, notScheduled],
                backgroundColor: [
                    "rgba(16, 185, 129, 0.6)", // Emerald
                    "rgba(244, 63, 94, 0.15)",  // Rose/Red
                ],
                borderColor: [
                    "rgba(52, 211, 153, 0.4)", 
                    "rgba(251, 113, 133, 0.2)",
                ],
                borderWidth: 1,
                hoverOffset: 15,
                borderRadius: 10,
                spacing: 5,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: "#94a3b8",
                    usePointStyle: true,
                    pointStyle: "circle",
                    font: { 
                        size: 11,
                        weight: "600",
                        family: "Space Grotesk, sans-serif"
                    },
                    padding: 25,
                },
            },
            tooltip: {
                backgroundColor: "#1e293b",
                titleColor: "#f8fafc",
                bodyColor: "#94a3b8",
                borderColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx) => {
                        const pct = data.length > 0 ? Math.round((ctx.raw / data.length) * 100) : 0;
                        return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                    },
                },
            },
        },
        cutout: "75%",
    };

    return (
        <div className="w-full h-full min-h-[220px] relative mt-2 group">
            <Doughnut data={chartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-8">
                <span className="text-3xl font-black text-white leading-none">
                    {data.length > 0 ? Math.round((scheduled / data.length) * 100) : 0}%
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Conversão</span>
            </div>
        </div>
    );
}
