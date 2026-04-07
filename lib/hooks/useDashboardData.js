"use client";

import { useState, useEffect, useMemo } from "react";
import { parseRowDate, isClosed, SCORE_KEYS, parseScore } from "../utils";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1nzSfmHlbs5FPUsLrcaJNQhdHCqEWyP9Lf6yaF-7vFhI/edit?gid=0#gid=0";

export function useDashboardData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [sheetInputValue, setSheetInputValue] = useState(DEFAULT_SHEET_URL);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [meetingFilter, setMeetingFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = async (url) => {
    const targetUrl = url || sheetUrl;
    if (!targetUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(targetUrl)}`);
      const jsonData = await res.json();
      if (jsonData.error) {
        console.error("API Error:", jsonData.error);
      } else {
        setData(Array.isArray(jsonData.data) ? jsonData.data : []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sheetUrl) return;
    fetchData(sheetUrl);
    const interval = setInterval(() => fetchData(sheetUrl), 30000);
    return () => clearInterval(interval);
  }, [sheetUrl]);

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const empresa = (item["Empresa (Cliente)"] || "").toLowerCase();
        const closer = (item["Closer"] || "").toLowerCase();
        const closed = isClosed(item["Status"]);
        const rowDate = parseRowDate(item["Data"]);

        const matchesSearch = empresa.includes(searchTerm.toLowerCase());
        const matchesSdr = sdrFilter === "all" || closer === sdrFilter.toLowerCase();
        const matchesMeeting =
          meetingFilter === "all" ||
          (meetingFilter === "yes" && closed) ||
          (meetingFilter === "no" && !closed);
        const matchesFrom = !dateFrom || (rowDate !== null && rowDate >= new Date(dateFrom).getTime());
        const matchesTo = !dateTo || (rowDate !== null && rowDate <= new Date(dateTo + "T23:59:59").getTime());

        return matchesSearch && matchesSdr && matchesMeeting && matchesFrom && matchesTo;
      })
      .sort((a, b) => {
        const dateA = parseRowDate(a["Data"]);
        const dateB = parseRowDate(b["Data"]);

        if (dateA === null && dateB === null) return 0;
        if (dateA === null) return 1;
        if (dateB === null) return -1;
        return dateB - dateA;
      });
  }, [data, searchTerm, sdrFilter, meetingFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const closedCount = filteredData.filter((row) => isClosed(row["Status"])).length;
    const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    let scoreSum = 0,
      scoreCount = 0;
    filteredData.forEach((row) => {
      SCORE_KEYS.forEach((key) => {
        const v = parseScore(row[key]);
        if (!isNaN(v)) {
          scoreSum += v;
          scoreCount++;
        }
      });
    });
    const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : "—";

    return {
      total,
      closedCount,
      conversionRate,
      avgScore,
    };
  }, [filteredData]);

  const ranking = useMemo(() => {
    const sdrRank = Object.entries(
      filteredData.reduce((acc, row) => {
        const sdr = row["Closer"] || "Não informado";
        if (!acc[sdr]) acc[sdr] = 0;
        if (isClosed(row["Status"])) {
          acc[sdr] += 1;
        }
        return acc;
      }, {})
    )
      .map(([name, meetings]) => ({ name, meetings }))
      .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name, "pt-BR"));

    const sdrCallsRanking = Object.entries(
      filteredData.reduce((acc, row) => {
        const sdr = row["Closer"] || "Não informado";
        if (!acc[sdr]) acc[sdr] = 0;
        acc[sdr] += 1;
        return acc;
      }, {})
    )
      .map(([name, calls]) => ({ name, calls }))
      .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name, "pt-BR"));

    return { sdrRank, sdrCallsRanking };
  }, [filteredData]);

  const closers = useMemo(() => [...new Set(data.map((item) => item["Closer"]).filter(Boolean))], [data]);

  return {
    data,
    filteredData,
    loading,
    lastUpdated,
    sheetUrl,
    setSheetUrl,
    sheetInputValue,
    setSheetInputValue,
    searchTerm,
    setSearchTerm,
    sdrFilter,
    setSdrFilter,
    meetingFilter,
    setMeetingFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    fetchData,
    stats,
    ranking,
    closers,
  };
}
