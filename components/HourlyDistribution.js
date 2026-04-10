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
import { useRef } from "react";
import { parseRowDate, parseTimeFromField } from "../lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function HourlyDistribution({ data, onHourSelect, selectedHour }) {
  const chartRef = useRef();
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
        label: "Volume de Calls",
        data: filteredHours.map(h => h.count),
        backgroundColor: filteredHours.map(h => 
          selectedHour !== null && selectedHour === h.hour 
            ? "rgba(59, 130, 246, 0.9)" 
            : "rgba(59, 130, 246, 0.4)"
        ),
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
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` ${context.raw} calls atendidas`
        }
      }
    },
    onClick: (event, elements) => {
      if (!onHourSelect || elements.length === 0) return;
      
      const { index } = elements[0];
      onHourSelect(filteredHours[index].hour);
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
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
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
