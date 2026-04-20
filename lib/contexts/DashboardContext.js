"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { parseRowDate, isClosed, SCORE_KEYS, parseScore, normalizeCloserName, isValidReport } from "../utils";

const DashboardContext = createContext();

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1nzSfmHlbs5FPUsLrcaJNQhdHCqEWyP9Lf6yaF-7vFhI/edit?gid=0#gid=0";

export function DashboardProvider({ children }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [sheetInputValue, setSheetInputValue] = useState(DEFAULT_SHEET_URL);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("dash_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("dash_user");
      }
    }
  }, []);

  const login = async (username, password) => {
    try {
      // Get users from environment variable
      const usersEnv = process.env.NEXT_PUBLIC_AUTH_USERS;
      if (!usersEnv) throw new Error("Configuração de usuários não encontrada");
      
      const usersData = JSON.parse(usersEnv);
      const foundUser = usersData.find(
        (u) => u.username === username.toLowerCase().trim() && String(u.password) === String(password).trim()
      );
      if (foundUser) {
        const userToSave = { ...foundUser };
        delete userToSave.password;
        setUser(userToSave);
        localStorage.setItem("dash_user", JSON.stringify(userToSave));
        return { success: true, user: userToSave };
      }
      return { success: false, message: "Usuário ou senha incorretos" };
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, message: "Erro ao autenticar: Verifique as variáveis de ambiente" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dash_user");
  };

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
        const sanitized = (Array.isArray(jsonData.data) ? jsonData.data : [])
          .filter(isValidReport)
          .map(row => ({
            ...row,
            "Closer": normalizeCloserName(row["Closer"])
          }));
        setData(sanitized);
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

  const closers = useMemo(() => {
    const blacklist = ["NÃO INFORMADO", "NÃO IDENTIFICADO", "NÃO INFORMADA", "DESCONHECIDO"];
    return [...new Set(data.map((item) => item["Closer"]).filter(Boolean))]
      .filter(name => !blacklist.includes(name.toUpperCase().trim()));
  }, [data]);

  const value = {
    data,
    loading,
    lastUpdated,
    sheetUrl,
    setSheetUrl,
    sheetInputValue,
    setSheetInputValue,
    fetchData,
    closers,
    user,
    login,
    logout,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return context;
}
