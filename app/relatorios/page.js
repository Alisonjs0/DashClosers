"use client";

import DashboardContent from "@/components/DashboardContent";
import { 
  AlertTriangle, 
  Activity, 
  User, 
  Calendar, 
  Gauge, 
  TrendingDown, 
  Lightbulb, 
  Award, 
  Target,
  ChevronDown,
  Copy,
  Check,
  TrendingUp,
  Download,
  Zap
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { clsx } from "clsx";

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const decodeUTF8 = (str) => {
  if (!str || typeof str !== 'string') return str;
  try {
    // Attempt to decode if it looks like double-encoded UTF-8
    return decodeURIComponent(escape(str));
  } catch {
    return str; // Return original if decoding fails
  }
};

const parseJSONSafely = (str) => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try {
    const trimmed = String(str).trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Try decoding first
        const decoded = decodeUTF8(trimmed);
        try {
          return JSON.parse(decoded);
        } catch {
          // If still fails, try removing escape sequences
          const cleaned = trimmed.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          return JSON.parse(cleaned);
        }
      }
    }
    return null;
  } catch (e) {
    console.warn("Falha ao analisar JSON:", str?.substring(0, 100));
    return null;
  }
};

const getSeverityColor = (percentage) => {
  const p = Number(percentage) || 0;
  if (p > 50) return 'bg-red-500';
  if (p > 30) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getSeverityLabel = (percentage) => {
  const p = Number(percentage) || 0;
  if (p > 50) return { text: 'Crítica', color: 'text-red-400' };
  if (p > 30) return { text: 'Frequente', color: 'text-amber-400' };
  return { text: 'Ocasional', color: 'text-emerald-400' };
};

const getCategoryColor = (category) => {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('ELITE')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' };
  if (cat.includes('DESENVOLVIMENTO')) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500' };
  if (cat.includes('RISCO')) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' };
  return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500' };
};

const getDecisionColor = (decision) => {
  const dec = String(decision || '').toUpperCase();
  if (dec.includes('MANTER')) return 'bg-emerald-500 text-white';
  if (dec.includes('TREINAR')) return 'bg-blue-500 text-white';
  if (dec.includes('MELHORIA')) return 'bg-orange-500 text-white';
  return 'bg-white/10 text-white/70';
};

const parseActionPlan = (text) => {
  if (!text) return [];
  const steps = text
    .split(/[;.]/)
    .map(s => s.trim())
    .filter(s => s && s.length > 5);
  return steps;
};

// ═══════════════════════════════════════════════════════════════════
// BLOCO 1: KPIs INTELIGENTES
// ═══════════════════════════════════════════════════════════════════

function KPISCard({ icon, label, value, subValue, severity, closerCount }) {
  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:translate-y-[-2px] transition-all duration-300 group relative">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold text-white/60 group-hover:bg-white/10 transition-colors">
          {label}
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-white truncate max-w-full" title={String(value)}>
          {value}
        </div>
        <div className="text-xs text-white/40 font-medium flex items-center gap-2">
          {subValue}
          {severity && (
            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", severity.color, "bg-white/5")}>
              {severity.text}
            </span>
          )}
        </div>
        {closerCount && (
          <div className="text-[11px] text-white/30 font-mono mt-2">
            📊 {closerCount} closers impactados
          </div>
        )}
      </div>

      {/* Tooltip hover */}
      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-black/90 rounded-lg text-white/70 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-white/10">
        {label === 'Gargalo Principal' && 'Principal ponto de atrito no funil de vendas'}
        {label === 'Reprovação (%)' && 'Taxa de clientes que não avançam no processo'}
        {label === 'Restr. Financeira' && 'Número de impactos causados por restrição orçamentária'}
        {label === 'Plano de Ação' && 'Agenda executiva para a semana'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO 2: ANÁLISE DE GARGALO COM FUNIL
// ═══════════════════════════════════════════════════════════════════

function FunnelVisualization({ funnelTotal, funnelCTA, funnelConversao }) {
  // Use actual data from sheets if available, otherwise calculate from reprovacao
  const total = Number(funnelTotal) || 100;
  const cta = Number(funnelCTA) || 75;
  const conversao = Number(funnelConversao) || 5.6;

  // Calculate widths as percentages (100%, 75%, 50% for visual funnel effect)
  const width1 = 100;
  const width2 = (cta / total) * 100;
  const width3 = (conversao / total) * 100;

  return (
    <div className="w-full space-y-8">
      <div className="space-y-4">
        {/* Stage 1 - Full width */}
        <div className="flex flex-col items-center">
          <div 
            className="w-full max-w-xs bg-gradient-to-r from-blue-500/20 via-blue-500/30 to-blue-500/20 border-2 border-blue-500/50 rounded-lg flex items-center justify-center py-4 px-4 relative overflow-hidden shadow-lg shadow-blue-500/10 transition-all duration-500"
            style={{ width: `${width1}%`, maxWidth: `100%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 pointer-events-none"></div>
            <span className="relative font-bold text-blue-100 text-center">
              <div className="text-lg font-bold">{total.toFixed(0)}%</div>
              <div className="text-xs text-blue-200">Oportunidades Totais</div>
            </span>
          </div>
        </div>

        {/* Funnel line connector */}
        <div className="flex justify-center">
          <div className="w-1 h-6 bg-gradient-to-b from-white/20 to-white/5"></div>
        </div>

        {/* Stage 2 - Intermediate width */}
        <div className="flex flex-col items-center">
          <div 
            className="max-w-xs bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-2 border-amber-500/50 rounded-lg flex items-center justify-center py-4 px-4 relative overflow-hidden shadow-lg shadow-amber-500/10 transition-all duration-500"
            style={{ width: `${width2}%`, maxWidth: `100%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 pointer-events-none"></div>
            <span className="relative font-bold text-amber-100 text-center text-sm">
              <div className="text-lg font-bold">{cta.toFixed(0)}%</div>
              <div className="text-xs text-amber-200">Chegaram ao CTA</div>
            </span>
          </div>
        </div>

        {/* Funnel line connector */}
        <div className="flex justify-center">
          <div className="w-1 h-6 bg-gradient-to-b from-white/20 to-white/5"></div>
        </div>

        {/* Stage 3 - Smallest width */}
        <div className="flex flex-col items-center">
          <div 
            className="max-w-xs bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-emerald-500/20 border-2 border-emerald-500/50 rounded-lg flex items-center justify-center py-4 px-4 relative overflow-hidden shadow-lg shadow-emerald-500/10 transition-all duration-500"
            style={{ width: `${width3}%`, maxWidth: `100%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 pointer-events-none"></div>
            <span className="relative font-bold text-emerald-100 text-center text-sm">
              <div className="text-lg font-bold">{conversao.toFixed(1)}%</div>
              <div className="text-xs text-emerald-200">Converteram</div>
            </span>
          </div>
        </div>
      </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-8 pt-4 border-t border-white/5">
          <div className="text-center">
            <div className="text-xs text-white/40">Taxa CTA</div>
            <div className="text-sm font-bold text-white">{((cta / total) * 100).toFixed(0)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40">Taxa Conversão</div>
            <div className="text-sm font-bold text-white">{((conversao / cta) * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40">Taxa Total</div>
            <div className="text-sm font-bold text-white">{((conversao / total) * 100).toFixed(1)}%</div>
          </div>
        </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO 3: RANKING DE CLOSERS (EXPANDÍVEL)
// ═══════════════════════════════════════════════════════════════════

function CloserCard({ closer, expanded, onToggle, filteredIn }) {
  const [copied, setCopied] = useState(false);
  const colors = getCategoryColor(closer.categoria);

  const handleCopy = () => {
    const text = `${closer.nome}\n\nPadrão: ${closer.padrao_identificado}\nPrincipal Dor: ${closer.principal_dor_enfrentada}\nPrincipal Objeção: ${closer.principal_objecao_enfrentada}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      "border rounded-xl transition-all duration-300 overflow-hidden",
      filteredIn ? "border-primary/50 bg-primary/5" : "border-white/5 bg-card/30 backdrop-blur-xl",
      "hover:border-primary/30 hover:bg-primary/10"
    )}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4 flex-1 text-left">
          <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold", colors.bg, colors.border, "border")}>
            <span className={colors.text}>{closer.nome?.charAt(0).toUpperCase()}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white">{closer.nome}</h4>
              <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold text-white", colors.badge)}>
                {String(closer.categoria).replace(/_/g, ' ')}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden max-w-[200px]">
                  <div 
                    className="h-full bg-primary transition-all duration-700"
                    style={{ width: `${(Number(closer.nota_media) / 10 * 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-primary">{closer.nota_media}/10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx("px-2 py-1 rounded text-[10px] font-bold text-white", getDecisionColor(closer.decisao))}>
            {String(closer.decisao).replace(/_/g, ' ')}
          </span>
          <ChevronDown 
            size={18} 
            className={clsx("text-white/40 transition-transform duration-300", expanded && "rotate-180")} 
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 bg-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Padrão Identificado</div>
            <p className="text-sm text-white/80">{closer.padrao_identificado}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Principal Dor</div>
              <p className="text-sm text-white/80">{closer.principal_dor_enfrentada}</p>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Principal Objeção</div>
              <p className="text-sm text-white/80">{closer.principal_objecao_enfrentada}</p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold text-white/70 hover:text-white"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar Detalhes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO 4: DORES DO CLIENTE COM ACCORDION
// ═══════════════════════════════════════════════════════════════════

function DorCard({ dor, index, maxFrequencia, selectedCloser, closersDores }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const freq = Number(dor.frequencia_percentual) || 0;
  const intensity = (index === 0) ? 100 : (100 - ((index) * 15));
  const baseColor = 'rgb(59, 130, 246)'; // blue-500
  const r = Math.floor(59 + (195 - 59) * (1 - intensity / 100));
  const g = Math.floor(130 + (131 - 130) * (1 - intensity / 100));
  const b = Math.floor(246 + (86 - 246) * (1 - intensity / 100));
  const barColor = `rgba(${r}, ${g}, ${b}, 0.8)`;

  const steps = parseActionPlan(dor.plano_de_acao_para_tratativa);
  
  const isHighlighted = selectedCloser !== 'Todos' && closersDores?.[selectedCloser]?.dor_identificada === dor.dor_identificada;

  const handleCopy = () => {
    navigator.clipboard.writeText(dor.plano_de_acao_para_tratativa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      "rounded-xl border transition-all duration-300 overflow-hidden",
      isHighlighted ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10" : "border-white/5 bg-card/30 backdrop-blur-xl hover:border-white/10"
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between group"
      >
        <div className="flex-1 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{dor.dor_identificada}</span>
            {isHighlighted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                Matcher Selecionado
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">Frequência</span>
              <span className="font-bold text-white">{freq}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full transition-all duration-700"
                style={{ width: `${Math.min(100, freq)}%`, backgroundColor: barColor }}
              ></div>
            </div>
          </div>
        </div>
        <ChevronDown 
          size={18} 
          className={clsx("text-white/40 flex-shrink-0 ml-4 transition-transform duration-300", expanded && "rotate-180")} 
        />
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 bg-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Plano de Ação para Tratativa</div>
            <div className="space-y-2">
              {steps.length > 0 ? (
                steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-white/80 pt-1">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60 italic">{dor.plano_de_acao_para_tratativa}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold text-white/70 hover:text-white"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar Plano
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO 5: OBJEÇÕES COM ACCORDION
// ═══════════════════════════════════════════════════════════════════

function ObjecaoCard({ objecao, index, maxFrequencia, selectedCloser, closersObjecoes }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const freq = Number(objecao.frequencia_percentual) || 0;
  const severity = getSeverityLabel(freq);
  const intensity = (index === 0) ? 100 : (100 - ((index) * 15));
  const baseColor = 'rgb(168, 85, 247)'; // purple-500
  const r = Math.floor(168 + (255 - 168) * (1 - intensity / 100));
  const g = Math.floor(85 + (85 - 85) * (1 - intensity / 100));
  const b = Math.floor(247 + (68 - 247) * (1 - intensity / 100));
  const barColor = `rgba(${r}, ${g}, ${b}, 0.8)`;

  const steps = parseActionPlan(objecao.plano_de_acao_para_contorno);

  const isHighlighted = selectedCloser !== 'Todos' && closersObjecoes?.[selectedCloser]?.objecao_identificada === objecao.objecao_identificada;

  const handleCopy = () => {
    navigator.clipboard.writeText(objecao.plano_de_acao_para_contorno);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      "rounded-xl border transition-all duration-300 overflow-hidden",
      isHighlighted ? "border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10" : "border-white/5 bg-card/30 backdrop-blur-xl hover:border-white/10"
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between group"
      >
        <div className="flex-1 text-left space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{objecao.objecao_identificada}</span>
            <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-white/10 border", severity.color.replace('text', 'border'))}>
              {severity.text}
            </span>
            {isHighlighted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white">
                Matcher Selecionado
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">Frequência</span>
              <span className="font-bold text-white">{freq}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full transition-all duration-700"
                style={{ width: `${Math.min(100, freq)}%`, backgroundColor: barColor }}
              ></div>
            </div>
          </div>
        </div>
        <ChevronDown 
          size={18} 
          className={clsx("text-white/40 flex-shrink-0 ml-4 transition-transform duration-300", expanded && "rotate-180")} 
        />
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 bg-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Plano de Contorno</div>
            <div className="space-y-2">
              {steps.length > 0 ? (
                steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-white/80 pt-1">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60 italic">{objecao.plano_de_acao_para_contorno}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold text-white/70 hover:text-white"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar Plano
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO 6: PLANO DE AÇÃO SEMANAL
// ═══════════════════════════════════════════════════════════════════

function WeeklyPlanModal({ open, onClose, planoAcao }) {
  const steps = parseActionPlan(planoAcao);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(planoAcao);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in scale-in duration-300">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-emerald-400" />
            Plano da Semana
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {steps.length > 0 ? (
              steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-white/90 leading-relaxed">{step}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/70 whitespace-pre-line">{planoAcao}</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white font-bold transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copiar Texto Completo
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function RelatoriosPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCloser, setSelectedCloser] = useState("Todos");
  const [expandedCloser, setExpandedCloser] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1nzSfmHlbs5FPUsLrcaJNQhdHCqEWyP9Lf6yaF-7vFhI/export?format=csv&gid=2092544085";

  // ─────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sheets?url=` + encodeURIComponent(SHEET_URL));
        const json = await res.json();
        if (json.data) setData(json.data);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRelatorios();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // PARSE & STRUCTURE DATA
  // ─────────────────────────────────────────────────────────────

  const latestAnalysis = useMemo(() => {
    if (data.length === 0) return null;
    const row = data[0];
    
    // Debug: Log available columns
    if (Object.keys(row).length > 0) {
      console.log("Available columns:", Object.keys(row));
    }

    // Parse JSON fields with proper handling of encoding issues
    const ranking = parseJSONSafely(row["ranking"]) || [];
    const estrategia = parseJSONSafely(row["estrategia"]) || [];
    const dores = parseJSONSafely(row["Dores"]) || [];
    
    // Handle encoding issues with "Objeções" column (may appear as "ObjeÃ§Ãµes" or "Objeções")
    let objecoes = parseJSONSafely(row["Objeções"]) || [];
    if (!objecoes || objecoes.length === 0) {
      objecoes = parseJSONSafely(row["ObjeÃ§Ãµes"]) || [];
    }

    // Normalize field names and decode special characters
    const normalized = {
      ...row,
      // Decode UTF-8 fields that might have encoding issues
      "Gargalo principal": decodeUTF8(row["Gargalo principal"] || "—"),
      "Gargalo analise": decodeUTF8(row["Gargalo analise"] || ""),
      "Causa principal de perda": decodeUTF8(row["Causa principal de perda"] || ""),
      "Gargalo percentual reprovacao": Number((row["Gargalo percentual reprovacao"] || "0").toString().replace(",", ".")),
      "Restricao financeira": Number((row["Restricao financeira"] || "0").toString().replace(",", ".")),
      "Funil Total": Number((row["Funil Total"] || "100").toString().replace(",", ".")),
      "Funil CTA": Number((row["Funil CTA"] || "55").toString().replace(",", ".")),
      "Funil Conversao": Number((row["Funil Conversao"] || "5.6").toString().replace(",", ".")),
      "plano acao": decodeUTF8(row["plano acao"] || ""),
      "Plano acao semanal": decodeUTF8(row["Plano acao semanal"] || ""),
      ranking: Array.isArray(ranking) ? ranking : Object.values(ranking),
      estrategia: Array.isArray(estrategia) ? estrategia : Object.values(estrategia),
      dores: Array.isArray(dores) ? dores : Object.values(dores),
      objecoes: Array.isArray(objecoes) ? objecoes : Object.values(objecoes)
    };

    console.log("Parsed data:", {
      gargalo: normalized["Gargalo principal"],
      reprovacao: normalized["Gargalo percentual reprovacao"],
      funnelTotal: normalized["Funil Total"],
      funnelCTA: normalized["Funil CTA"],
      funnelConversao: normalized["Funil Conversao"],
      rankingCount: normalized.ranking.length,
      doresCount: normalized.dores.length,
      objecoesCount: normalized.objecoes.length,
      estrategiaCount: normalized.estrategia.length,
      planoAcaoLength: normalized["plano acao"]?.length || 0,
      planoSemanallength: normalized["Plano acao semanal"]?.length || 0
    });

    return normalized;
  }, [data]);

  // Extract closers list
  const closersList = useMemo(() => {
    if (!latestAnalysis?.ranking) return ["Todos"];
    const names = latestAnalysis.ranking.map(item => item.nome || item.name || item.closer_nome);
    return ["Todos", ...names.filter(Boolean)];
  }, [latestAnalysis]);

  // Get ranked closers sorted by note and correlate with strategy
  const rankedClosers = useMemo(() => {
    if (!latestAnalysis?.ranking) return [];
    
    // Build strategy map by closer name
    const strategyMap = {};
    if (latestAnalysis?.estrategia) {
      latestAnalysis.estrategia.forEach((item) => {
        const closerName = item.closer || item.name;
        if (closerName) {
          strategyMap[closerName] = {
            decisao: item.decisao || item.decision,
            justificativa: item.justificativa || item.justification
          };
        }
      });
    }

    // Merge ranking with strategy
    const closersWithStrategy = latestAnalysis.ranking.map(closer => ({
      ...closer,
      decisao: strategyMap[closer.nome]?.decisao || "MANTER",
      justificativa: strategyMap[closer.nome]?.justificativa || ""
    }));

    return [...closersWithStrategy]
      .sort((a, b) => (Number(b.nota_media) || 0) - (Number(a.nota_media) || 0));
  }, [latestAnalysis]);

  // Map closers to their dores and objecoes
  const closersDores = useMemo(() => {
    const map = {};
    if (latestAnalysis?.ranking && latestAnalysis?.dores) {
      latestAnalysis.ranking.forEach((closer, idx) => {
        if (latestAnalysis.dores[idx]) {
          map[closer.nome] = latestAnalysis.dores[idx];
        }
      });
    }
    return map;
  }, [latestAnalysis]);

  const closersObjecoes = useMemo(() => {
    const map = {};
    if (latestAnalysis?.ranking && latestAnalysis?.objecoes) {
      latestAnalysis.ranking.forEach((closer, idx) => {
        if (latestAnalysis.objecoes[idx]) {
          map[closer.nome] = latestAnalysis.objecoes[idx];
        }
      });
    }
    return map;
  }, [latestAnalysis]);

  // Count impacted closers by gargalo
  const impactedClosersCount = useMemo(() => {
    return latestAnalysis?.ranking?.length || 0;
  }, [latestAnalysis]);

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardContent title="Relatórios Semanais">
        <div className="flex flex-col items-center justify-center p-20 text-white/30 space-y-4">
          <Activity className="animate-spin" size={32} />
          <div className="text-sm font-medium">Carregando dados do Google Sheets...</div>
          <div className="text-xs text-white/20">
            Puxando de: {SHEET_URL.split('/d/')[1]?.split('/')[0]}
          </div>
        </div>
      </DashboardContent>
    );
  }

  if (!latestAnalysis) {
    return (
      <DashboardContent title="Relatórios Semanais">
        <div className="p-20 text-center space-y-4">
          <div className="text-white/30">Sem dados encontrados.</div>
          <div className="text-xs text-white/20">
            Verifique se o Google Sheets está configurado corretamente em:
          </div>
          <code className="block text-[10px] text-white/40 bg-white/5 p-2 rounded mt-2 break-all">
            {SHEET_URL}
          </code>
        </div>
      </DashboardContent>
    );
  }

  const reprovacaoPercentual = Number(latestAnalysis["Gargalo percentual reprovacao"] || 0);
  const severityKPI = getSeverityLabel(reprovacaoPercentual);

  return (
    <DashboardContent title="Relatórios Semanais">
      <div className="space-y-8 pl-8 pr-10 pt-4 pb-12">
        
        {/* ═══════════════════════════════════════════════════════ */}
        {/* FILTRO DE CLOSER */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 bg-card/30 backdrop-blur-xl border border-white/5 rounded-2xl p-2 px-4">
            <div className="flex items-center gap-2 text-white/40 border-r border-white/10 pr-4 mr-2">
              <User size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Filtrar Closer</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {closersList.map(closer => (
                <button
                  key={closer}
                  onClick={() => setSelectedCloser(closer)}
                  className={clsx(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border capitalize flex-shrink-0",
                    selectedCloser === closer 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                  )}
                >
                  {String(closer).replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-white/30 text-xs">
            <Calendar size={14} /> Período: Última Semana
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BLOCO 1: KPIs INTELIGENTES */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPISCard 
            icon={<AlertTriangle className="text-red-400" size={20} />} 
            label="Gargalo Principal" 
            value={latestAnalysis?.["Gargalo principal"] || "—"}
            subValue="Crítico"
            closerCount={impactedClosersCount}
          />
          <KPISCard 
            icon={<Gauge className={clsx("size-5", severityKPI.color)} size={20} />}
            label="Reprovação (%)" 
            value={`${reprovacaoPercentual.toFixed(0)}%`}
            subValue="Taxa de perda"
            severity={severityKPI}
          />
          <KPISCard 
            icon={<TrendingDown className="text-purple-400" size={20} />} 
            label="Restr. Financeira" 
            value={latestAnalysis?.["Restricao financeira"] || "0"}
            subValue="Impactos"
          />
          <KPISCard 
            icon={<Lightbulb className="text-emerald-400" size={20} />} 
            label="Plano de Ação" 
            value="Em Andamento"
            subValue="Semanal"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BLOCO 2: ANÁLISE DE GARGALO COM FUNIL */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Análise Textual */}
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">Análise de Gargalo</h3>
              </div>
              <div className="p-6">
                <p className="text-white/80 leading-relaxed text-sm">
                  {latestAnalysis?.["Gargalo analise"] || "Análise indisponível"}
                </p>
              </div>
            </div>

            {/* Causa Raiz */}
            <div className={clsx(
              "bg-card/30 backdrop-blur-xl rounded-2xl border overflow-hidden transition-all duration-300",
              reprovacaoPercentual > 50 ? "border-red-500/30 bg-red-500/5" : "border-white/5"
            )}>
              <div className={clsx(
                "px-6 py-4 border-b bg-white/5 flex items-center gap-2",
                reprovacaoPercentual > 50 ? "border-red-500/20" : "border-white/5"
              )}>
                <AlertTriangle size={18} className={clsx(reprovacaoPercentual > 50 ? "text-red-400" : "text-white/40")} />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">Causa Raiz</h3>
                {reprovacaoPercentual > 50 && (
                  <span className="ml-auto px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                    Crítica
                  </span>
                )}
              </div>
              <div className="p-6">
                <p className="text-white/80 leading-relaxed text-sm">
                  {latestAnalysis?.["Causa principal de perda"] || "Causa não identificada"}
                </p>
              </div>
            </div>

            {/* Funil Visual */}
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">Funil de Conversão</h3>
              </div>
              <div className="p-6">
                <FunnelVisualization 
                  funnelTotal={latestAnalysis?.["Funil Total"]} 
                  funnelCTA={latestAnalysis?.["Funil CTA"]}
                  funnelConversao={latestAnalysis?.["Funil Conversao"]}
                />
              </div>
            </div>

            {/* Plano de Ação Semanal */}
            {latestAnalysis?.["Plano acao semanal"] && (
              <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-indigo-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center gap-2">
                  <Calendar size={18} className="text-purple-400" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Plano Semanal (Detalhado)</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {parseActionPlan(latestAnalysis?.["Plano acao semanal"] || "").map((step, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400 mt-1">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed flex-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────── */}
          {/* BLOCO 3: RANKING DE CLOSERS */}
          {/* ────────────────────────────── */}

          <div className="space-y-6">
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">Ranking Closers</h3>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {rankedClosers.map((closer) => (
                  <CloserCard
                    key={closer.nome}
                    closer={closer}
                    expanded={expandedCloser === closer.nome}
                    onToggle={() => setExpandedCloser(expandedCloser === closer.nome ? null : closer.nome)}
                    filteredIn={selectedCloser === "Todos" || selectedCloser === closer.nome}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BLOCO 4: DORES DO CLIENTE */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
            <Target size={18} className="text-blue-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-white">Dores do Cliente</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestAnalysis.dores && latestAnalysis.dores.length > 0 ? (
              latestAnalysis.dores.map((dor, idx) => (
                <DorCard 
                  key={idx}
                  dor={dor}
                  index={idx}
                  maxFrequencia={Math.max(...latestAnalysis.dores.map(d => Number(d.frequencia_percentual) || 0))}
                  selectedCloser={selectedCloser}
                  closersDores={closersDores}
                />
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-white/30 text-sm">
                Sem dados de dores disponíveis
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BLOCO 5: OBJEÇÕES */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
            <AlertTriangle size={18} className="text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-white">Principais Objeções</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestAnalysis.objecoes && latestAnalysis.objecoes.length > 0 ? (
              latestAnalysis.objecoes.map((objecao, idx) => (
                <ObjecaoCard 
                  key={idx}
                  objecao={objecao}
                  index={idx}
                  maxFrequencia={Math.max(...latestAnalysis.objecoes.map(o => Number(o.frequencia_percentual) || 0))}
                  selectedCloser={selectedCloser}
                  closersObjecoes={closersObjecoes}
                />
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-white/30 text-sm">
                Sem dados de objeções disponíveis
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BLOCO 6: PLANO DE AÇÃO SEMANAL */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 backdrop-blur-xl rounded-2xl border border-emerald-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-white">Plano da Semana</h3>
            </div>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
            >
              <Download size={14} />
              Expandir Plano
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {parseActionPlan(latestAnalysis?.["plano acao"] || "").slice(0, 4).map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 mt-1">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed flex-1">{step}</p>
                </div>
              ))}
              {parseActionPlan(latestAnalysis?.["plano acao"] || "").length > 4 && (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="w-full mt-4 py-2 text-xs font-bold text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/5 transition-colors"
                >
                  Ver {parseActionPlan(latestAnalysis?.["plano acao"] || "").length - 4} etapa(s) restante(s)...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: PLANO DETALHADO */}
      {/* ═══════════════════════════════════════════════════════ */}

      <WeeklyPlanModal 
        open={showPlanModal} 
        onClose={() => setShowPlanModal(false)}
        planoAcao={latestAnalysis?.["plano acao"] || ""}
      />
    </DashboardContent>
  );
}
