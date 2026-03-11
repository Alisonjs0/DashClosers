"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function isMeetingScheduled(row) {
    const v = (row["Reunião Marcada?"] || "").toUpperCase();
    return v === "TRUE" || v === "SIM" || v === "YES";
}

export default function SatisfactionChart({ data }) {
    if (data.length === 0) {
        return <div className="text-center text-gray-500 py-8">Sem dados para exibir</div>;
    }

    const scheduled = data.filter(isMeetingScheduled).length;
    const notScheduled = data.length - scheduled;

    const chartData = {
        labels: ["Reunião Marcada", "Sem Reunião"],
        datasets: [
            {
                data: [scheduled, notScheduled],
                backgroundColor: ["rgba(16, 185, 129, 0.88)", "rgba(239, 68, 68, 0.88)"],
                borderColor: ["rgba(167, 243, 208, 1)", "rgba(254, 202, 202, 1)"],
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: "#e2e8f0",
                    font: { family: "Space Grotesk" },
                    padding: 20,
                },
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const pct = data.length > 0 ? Math.round((ctx.raw / data.length) * 100) : 0;
                        return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                    },
                },
            },
        },
        cutout: "70%",
    };

    return (
        <div className="w-full max-w-[300px] h-[300px] flex items-center justify-center">
            <Doughnut data={chartData} options={options} />
        </div>
    );
}
