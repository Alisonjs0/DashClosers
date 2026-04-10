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

export default function TrendChart({ data, baselineData }) {
  const [viewMode, setViewMode] = useState("quantity"); // 'all', 'total', 'quantity', or 'percent'

  const groupDataByDate = (inputData) => {
    return inputData.reduce((acc, row) => {
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
  };

  const groupedMain = groupDataByDate(data);
  const groupedBaseline = baselineData ? groupDataByDate(baselineData) : {};

  // Find all unique dates across both datasets and sort them
  const allDateKeys = Array.from(new Set([
    ...Object.keys(groupedMain),
    ...(baselineData ? Object.keys(groupedBaseline) : [])
  ]));

  const labels = allDateKeys.sort((a, b) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
  });

  const getChartValues = (grouped, mode) => {
    return labels.map(label => {
      const node = grouped[label];
      if (!node) return 0;
      if (mode === "percent") {
        return node.total > 0 ? Math.round((node.closed / node.total) * 100) : 0;
      }
      if (mode === "total") {
        return node.total;
      }
      return node.closed;
    });
  };

  const getModeStyles = (mode) => {
    switch(mode) {
      case "percent":
        return {
          label: "Taxa de Conversão (%)",
          borderColor: "rgba(245, 158, 11, 0.8)",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          pointColor: "rgba(245, 158, 11, 1)"
        };
      case "total":
        return {
          label: "Total de Calls",
          borderColor: "rgba(6, 182, 212, 0.8)",
          backgroundColor: "rgba(6, 182, 212, 0.1)",
          pointColor: "rgba(6, 182, 212, 1)"
        };
      default:
        return {
          label: "Fechamentos",
          borderColor: "rgba(59, 130, 246, 0.8)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          pointColor: "rgba(59, 130, 246, 1)"
        };
    }
  };

  const datasets = [];
  
  if (viewMode === "all") {
    // Mode All: Show everything
    datasets.push({
      label: "Total de Calls",
      data: getChartValues(groupedMain, "total"),
      borderColor: "rgba(6, 182, 212, 0.8)",
      backgroundColor: "transparent",
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      yAxisID: 'y',
    });
    datasets.push({
      label: "Fechamentos",
      data: getChartValues(groupedMain, "quantity"),
      borderColor: "rgba(59, 130, 246, 0.8)",
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 4,
      yAxisID: 'y',
    });
    datasets.push({
      label: "Conversão (%)",
      data: getChartValues(groupedMain, "percent"),
      borderColor: "rgba(245, 158, 11, 0.8)",
      backgroundColor: "transparent",
      borderDash: [5, 5],
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      yAxisID: 'y1',
    });
  } else {
    // Standard Modes
    const currentStyles = getModeStyles(viewMode);
    datasets.push({
      label: currentStyles.label,
      data: getChartValues(groupedMain, viewMode),
      fill: true,
      borderColor: currentStyles.borderColor,
      backgroundColor: currentStyles.backgroundColor,
      tension: 0.4,
      borderWidth: 3,
      pointBackgroundColor: currentStyles.pointColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: viewMode === "percent" ? 'y1' : 'y',
    });
  }

  // Add Baseline if exists
  if (baselineData && viewMode !== "all") {
    datasets.push({
      label: "Média Geral (Time)",
      data: getChartValues(groupedBaseline, viewMode),
      fill: false,
      borderColor: "rgba(148, 163, 184, 0.3)",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0.4,
      yAxisID: viewMode === "percent" ? 'y1' : 'y',
    });
  }

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: viewMode === "all",
        position: 'top',
        labels: {
          color: "#94a3b8",
          font: { size: 10, weight: "600" },
          usePointStyle: true,
          padding: 15,
        }
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: viewMode === "all",
        callbacks: {
          label: (ctx) => {
            const dateKey = labels[ctx.dataIndex];
            const stats = groupedMain[dateKey];
            if (!stats) return "Sem dados";
            const percent = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;
            
            // If in All mode, return relevant single line to avoid redundancy 
            // but ChartJS already calls this for each dataset.
            // Actually, returning an array here works best for single-dataset modes.
            if (viewMode === "all") {
              return ` ${ctx.dataset.label}: ${ctx.raw}${ctx.dataset.yAxisID === 'y1' ? '%' : ''}`;
            }

            return [
              `📞 Total: ${stats.total}`,
              `🤝 Fechamentos: ${stats.closed}`,
              `📈 Conversão: ${percent}%`
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 10, weight: "600", family: "Space Grotesk" },
        },
      },
      y: {
        id: 'y',
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        display: viewMode !== "percent",
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: {
          color: "#64748b",
          font: { size: 10, weight: "600" },
          stepSize: 1,
        },
      },
      y1: {
        id: 'y1',
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        min: 0,
        max: 100,
        display: viewMode === "percent" || viewMode === "all",
        grid: { display: false },
        ticks: {
          color: "rgba(245, 158, 11, 0.7)",
          font: { size: 10, weight: "600" },
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      <div className="flex justify-end gap-1 mb-4 flex-wrap">
        <button
          onClick={() => setViewMode("all")}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border",
            viewMode === "all" 
              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Comparar Tudo
        </button>
        <button
          onClick={() => setViewMode("total")}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border",
            viewMode === "total" 
              ? "bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Total de Calls
        </button>
        <button
          onClick={() => setViewMode("quantity")}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border",
            viewMode === "quantity" 
              ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Fechamentos
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
      <div className="flex-1 min-h-[300px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
