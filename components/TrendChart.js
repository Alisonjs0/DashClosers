import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { parseRowDate, isClosed } from "../lib/utils";
import { clsx } from "clsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({ data }) {
  const [viewMode, setViewMode] = useState("quantity"); // 'quantity' or 'percent'

  // Group data by date
  const groupedData = data.reduce((acc, row) => {
    const rawDate = parseRowDate(row["Data"]);
    if (!rawDate) return acc;
    
    const dateObj = new Date(rawDate);
    const dateKey = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
    
    if (!acc[dateKey]) {
      acc[dateKey] = { total: 0, closed: 0 };
    }
    
    acc[dateKey].total += 1;
    if (isClosed(row["Status"])) {
      acc[dateKey].closed += 1;
    }
    
    return acc;
  }, {});

  // Sort dates (simplistic for current month)
  const labels = Object.keys(groupedData).sort((a, b) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
  });

  const chartValueData = labels.map(label => {
    if (viewMode === "percent") {
      return Math.round((groupedData[label].closed / groupedData[label].total) * 100);
    }
    return groupedData[label].closed;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: viewMode === "percent" ? "Taxa de Conversão (%)" : "Fechamentos",
        data: chartValueData,
        fill: true,
        borderColor: viewMode === "percent" ? "rgba(245, 158, 11, 0.8)" : "rgba(59, 130, 246, 0.8)",
        backgroundColor: viewMode === "percent" ? "rgba(245, 158, 11, 0.1)" : "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: viewMode === "percent" ? "rgba(245, 158, 11, 1)" : "rgba(59, 130, 246, 1)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => viewMode === "percent" 
            ? ` Conversão: ${ctx.raw}%` 
            : ` Fechamentos: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 10, weight: "600", family: "Space Grotesk" },
        },
      },
      y: {
        beginAtZero: true,
        max: viewMode === "percent" ? 100 : undefined,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#64748b",
          font: { size: 10, weight: "600", family: "Space Grotesk" },
          stepSize: viewMode === "percent" ? 20 : 1,
          callback: (value) => viewMode === "percent" ? `${value}%` : value,
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      <div className="flex justify-end gap-1 mb-4">
        <button
          onClick={() => setViewMode("quantity")}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border",
            viewMode === "quantity" 
              ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Quantidade
        </button>
        <button
          onClick={() => setViewMode("percent")}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border",
            viewMode === "percent" 
              ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Porcentagem (%)
        </button>
      </div>
      <div className="flex-1">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
