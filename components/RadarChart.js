"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { SCORE_KEYS, parseScore } from "../lib/utils";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RadarChart({ data, baselineData }) {
  // Calculate average for each score key in the current data slice
  const calculateAverages = (inputData) => {
    return SCORE_KEYS.map((key) => {
      let sum = 0, count = 0;
      inputData.forEach((row) => {
          const val = parseScore(row[key]);
          if (!isNaN(val)) {
              sum += val;
              count++;
          }
      });
      return count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
    });
  };

  const averages = calculateAverages(data);
  const baselineAverages = baselineData ? calculateAverages(baselineData) : null;

  const chartData = {
    labels: SCORE_KEYS.map(k => k.split(' ').join('')), // Clean labels for radar
    datasets: [
      {
        label: "Seleção Atual",
        data: averages,
        backgroundColor: "rgba(59, 130, 246, 0.4)",
        borderColor: "rgba(59, 130, 246, 0.9)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(59, 130, 246, 1)",
        zIndex: 2,
      },
      ...(baselineData ? [{
        label: "Média Geral",
        data: baselineAverages,
        backgroundColor: "rgba(148, 163, 184, 0.15)",
        borderColor: "rgba(148, 163, 184, 0.4)",
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: true,
        zIndex: 1,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        pointLabels: {
          color: "#94a3b8",
          font: { size: 9, weight: "600", family: "Space Grotesk" },
        },
        ticks: {
          display: false,
          stepSize: 2,
        },
        min: 0,
        max: 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4">
      <Radar data={chartData} options={options} />
    </div>
  );
}
