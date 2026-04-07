"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { parseRowDate, parseTimeFromField } from "../lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function HourlyDistribution({ data }) {
  // Initialize bins for 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

  data.forEach((row) => {
    // Strictly use "Horario de atendimento" or "Horario"
    // Do NOT fallback to "Data" as it defaults to 00:00 when time is missing
    const timeValue = row["Horario de atendimento"] || row["Horario"];
    
    if (timeValue) {
      const hour = parseTimeFromField(timeValue);
      if (hour !== null && hour >= 0 && hour < 24) {
          hours[hour].count += 1;
      }
    }
  });

  // Filter to show only hours with data OR standard business hours (8am - 8pm)
  const filteredHours = hours.filter(h => (h.hour >= 8 && h.hour <= 20) || h.count > 0);

  const chartData = {
    labels: filteredHours.map(h => `${h.hour}h`),
    datasets: [
      {
        label: "Volume de Ligações",
        data: filteredHours.map(h => h.count),
        backgroundColor: "rgba(59, 130, 246, 0.4)",
        borderColor: "rgba(59, 130, 246, 0.8)",
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: "rgba(59, 130, 246, 0.6)",
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
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#64748b",
          font: { size: 10, weight: "600", family: "Space Grotesk" },
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[250px] p-2">
      <Bar data={chartData} options={options} />
    </div>
  );
}
