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
  Zap,
  X,
  Loader2
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { clsx } from "clsx";
import { isValidReport } from "@/lib/utils";

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
// BLOCO: MODAIS DE APOIO
// ═══════════════════════════════════════════════════════════════════

function SyncProgressModal({ open, onClose, isComplete, error }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card border border-white/10 rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative mx-auto w-20 h-20">
          {!isComplete && !error && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            {error ? (
              <AlertTriangle className="text-red-500" size={32} />
            ) : isComplete ? (
              <Check className="text-emerald-500 scale-125 transition-transform duration-500" size={32} />
            ) : (
              <Zap className="text-primary animate-pulse" size={32} />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            {error ? "Erro na Sincronização" : isComplete ? "Sucesso!" : "Sincronizando Dados"}
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">
            {error 
              ? "Ocorreu um problema ao enviar os dados para o N8N. Tente novamente." 
              : isComplete 
                ? "Os dados foram enviados com sucesso para a automação." 
                : "Estamos processando as informações e disparando o gatilho para o N8N."}
          </p>
        </div>

        {!error && !isComplete && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">
              Aguarde alguns minutos
            </p>
            <p className="text-[10px] text-primary/60 mt-1">
              A automação está sendo executada em segundo plano.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Detalhe do Erro</p>
            <p className="text-[10px] text-red-400/80 mt-1 truncate">{error}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className={clsx(
            "w-full py-3 rounded-xl text-xs font-bold transition-all",
            isComplete 
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" 
              : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
          )}
        >
          {isComplete ? "Concluído" : "Fechar Janela"}
        </button>
      </div>
    </div>
  );
}

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
  const total = Number(funnelTotal) || 100;
  const cta = Number(funnelCTA) || 75;
  const conv = Number(funnelConversao) || 5.6;

  // Configuration - Expanded for full width
  const svgWidth = 800; // Increased from 450
  const svgHeight = 350; // Increased from 320
  const paddingRight = 200; // More space for labels
  const funnelBaseWidth = svgWidth - paddingRight;
  
  // Heights - Equally distributed
  const h1 = 100;
  const h2 = 100;
  const h3 = 100;

  // Strict Proportional Widths
  const wTop1 = funnelBaseWidth;
  const wBottom1 = (cta / 100) * funnelBaseWidth;
  
  const wTop2 = wBottom1;
  const wBottom2 = (conv / 100) * funnelBaseWidth;
  
  const wTop3 = wBottom2;
  const wBottom3 = wTop3 * 0.85;

  // Coordinates - Centered in the left area
  const centerX = funnelBaseWidth / 2 + 20; 
  
  const p1 = `M ${centerX - wTop1/2} 0 L ${centerX + wTop1/2} 0 L ${centerX + wBottom1/2} ${h1} L ${centerX - wBottom1/2} ${h1} Z`;
  const p2 = `M ${centerX - wTop2/2} ${h1 + 4} L ${centerX + wTop2/2} ${h1 + 4} L ${centerX + wBottom2/2} ${h1 + h2} L ${centerX - wBottom2/2} ${h1 + h2} Z`;
  const p3 = `M ${centerX - wTop3/2} ${h1 + h2 + 4} L ${centerX + wTop3/2} ${h1 + h2 + 4} L ${centerX + wBottom3/2} ${h1 + h2 + h3} L ${centerX - wBottom3/2} ${h1 + h2 + h3} Z`;

  return (
    <div className="w-full space-y-6">
      <div className="relative flex justify-center -mx-4">
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible max-w-4xl">
          <defs>
            <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Paths */}
          <path d={p1} fill="url(#grad-blue)" stroke="#60a5fa" strokeOpacity="0.5" className="transition-all duration-500 hover:brightness-125 cursor-default" />
          <path d={p2} fill="url(#grad-gold)" stroke="#fbbf24" strokeOpacity="0.5" className="transition-all duration-500 hover:brightness-125 cursor-default" />
          <path d={p3} fill="url(#grad-emerald)" stroke="#34d399" strokeOpacity="0.5" className="transition-all duration-500 hover:brightness-125 cursor-default" />

          {/* Value Labels (Inside) */}
          <text x={centerX} y={h1/2} textAnchor="middle" dy=".3em" fill="white" className="text-3xl font-black italic select-none pointer-events-none">{total.toFixed(0)}%</text>
          <text x={centerX} y={h1 + h2/2} textAnchor="middle" dy=".3em" fill="white" className="text-2xl font-black italic select-none pointer-events-none">{cta.toFixed(0)}%</text>
          <text x={centerX} y={h1 + h2 + h3/2} textAnchor="middle" dy=".3em" fill="white" className="text-xl font-black italic select-none pointer-events-none">{conv.toFixed(1)}%</text>

          {/* Labels (Outside Right) */}
          <g transform={`translate(${centerX + wTop1/2 + 25}, ${h1/2})`}>
            <text fill="#60a5fa" className="text-xs font-black uppercase tracking-widest">Oportunidades (100%)</text>
          </g>
          <g transform={`translate(${centerX + wTop1/2 + 25}, ${h1 + h2/2})`}>
            <text fill="#fbbf24" className="text-xs font-black uppercase tracking-widest">Oferta / CTA ({cta.toFixed(0)}%)</text>
          </g>
          <g transform={`translate(${centerX + wTop1/2 + 25}, ${h1 + h2 + h3/2})`}>
            <text fill="#34d399" className="text-xs font-black uppercase tracking-widest">Fechamento ({conv.toFixed(1)}%)</text>
          </g>
        </svg>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-4 border-t border-white/5">
        <div className="text-center group">
          <div className="text-xs text-white/30 uppercase tracking-tighter">Eficiência CTA</div>
          <div className="text-base font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{((cta / total) * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center group">
          <div className="text-xs text-white/30 uppercase tracking-tighter">Conversão CTA</div>
          <div className="text-base font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{((conv / cta) * 100).toFixed(1)}%</div>
        </div>
        <div className="text-center group">
          <div className="text-xs text-white/30 uppercase tracking-tighter">Taxa Geral</div>
          <div className="text-base font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{((conv / total) * 100).toFixed(1)}%</div>
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
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function RelatoriosPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCloser, setSelectedCloser] = useState("Todos");
  const [expandedCloser, setExpandedCloser] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ complete: false, error: null });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedReportIndex, setSelectedReportIndex] = useState(null);
  
  // Drag to scroll logic
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const startDragging = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  const move = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1nzSfmHlbs5FPUsLrcaJNQhdHCqEWyP9Lf6yaF-7vFhI/export?format=csv&gid=987344015";

  // ─────────────────────────────────────────────────────────────
  // REPORT HISTORY DISCOVERY
  // ─────────────────────────────────────────────────────────────

  const reportRows = useMemo(() => {
    const rows = data
      .map((row, index) => ({ ...row, originalIndex: index }))
      .filter(row => {
        const rankingValue = (row.ranking_closers || row.ranking || "").toString().trim();
        return rankingValue && (rankingValue.startsWith('[') || rankingValue.startsWith('{'));
      });
    return [...rows].reverse();
  }, [data]);

  useEffect(() => {
    if (reportRows.length > 0 && selectedReportIndex === null) {
      setSelectedReportIndex(reportRows[0].originalIndex);
    }
  }, [reportRows, selectedReportIndex]);

  // ─────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sheets?url=` + encodeURIComponent(SHEET_URL));
        const json = await res.json();
        if (json.data) {
          const filtered = json.data.filter(isValidReport);
          setData(filtered);
        }
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRelatorios();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSendToWebhook = async () => {
    if (sending) return;
    setSending(true);
    setShowSyncModal(true);
    setSyncStatus({ complete: false, error: null });
    
    try {
      const res = await fetch(`/api/sheets?url=` + encodeURIComponent(SHEET_URL));
      const json = await res.json();
      
      if (!json.data || json.data.length === 0) {
        throw new Error("Não foi possível carregar os dados para envio.");
      }

      const lastRow = json.data[json.data.length - 1];
      const webhookUrl = "https://n8n.aegmedia.com.br/webhook/d34fb06b-04e0-4c83-a95b-c459d8bc8ed7";
      
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastRow,
          _timestamp: new Date().toISOString(),
          _source: "Dash Closers - Reports Tab"
        }),
      });

      if (!webhookRes.ok) throw new Error("Erro na resposta do Webhook");
      
      setSyncStatus({ complete: true, error: null });
      showToast("Relatório semanal enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar webhook:", error);
      setSyncStatus({ complete: false, error: error.message });
      showToast(error.message || "Erro ao conectar com o servidor.", "error");
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PARSE & STRUCTURE DATA
  // ─────────────────────────────────────────────────────────────

  const latestAnalysis = useMemo(() => {
    if (reportRows.length === 0) return null;
    const row = selectedReportIndex !== null ? data[selectedReportIndex] : reportRows[0];
    if (!row) return null;
    
    const ranking = parseJSONSafely(row["ranking_closers"] || row["ranking"]) || [];
    const estrategia = parseJSONSafely(row["decisoes_estrategicas"] || row["estrategia"]) || [];
    const dores = parseJSONSafely(row["principais_dores"] || row["Dores"]) || [];
    let objecoes = parseJSONSafely(row["principais_objecoes"] || row["Objeções"]) || [];
    if (!objecoes || objecoes.length === 0) objecoes = parseJSONSafely(row["ObjeÃ§Ãµes"]) || [];

    const whitelist = ["HENRIQUE", "BRUNO BORGES", "CARLOS SILVA", "GUSTAVO EMANUEL"];
    const filteredIndices = [];
    const rankingArr = Array.isArray(ranking) ? ranking : Object.values(ranking);
    rankingArr.forEach((item, idx) => {
      const name = (item.nome || item.name || item.closer_nome || "").toString().toUpperCase().trim();
      if (name && whitelist.some(w => name === w || name.includes(w))) filteredIndices.push(idx);
    });

    const finalRanking = filteredIndices.map(idx => rankingArr[idx]);
    const finalDores = filteredIndices.map(idx => (Array.isArray(dores) ? dores[idx] : Object.values(dores)[idx]) || []);
    const finalObjecoes = filteredIndices.map(idx => (Array.isArray(objecoes) ? objecoes[idx] : Object.values(objecoes)[idx]) || []);

    return {
      ...row,
      "Gargalo principal": decodeUTF8(row["gargalo_principal_etapa"] || row["Gargalo principal"] || "—"),
      "Gargalo analise": decodeUTF8(row["gargalo_analise"] || row["Gargalo analise"] || ""),
      "Causa principal de perda": decodeUTF8(row["causa_perda_principal"] || row["Causa principal de perda"] || ""),
      "Gargalo percentual reprovacao": Number((row["gargalo_percentual_reprovacao"] || row["Gargalo percentual reprovacao"] || "0").toString().replace(",", ".")),
      "Restricao financeira": Number((row["restricao_financeira_qtd"] || row["Restricao financeira"] || "0").toString().replace(",", ".")),
      "Funil Total": Number((row["funil_oportunidades_total"] || row["Funil Total"] || "100").toString().replace(",", ".")),
      "Funil CTA": Number((row["funil_chegaram_ao_cta"] || row["Funil CTA"] || "55").toString().replace(",", ".")),
      "Funil Conversao": Number((row["funil_converteram"] || row["Funil Conversao"] || "5.6").toString().replace(",", ".")),
      "plano acao": decodeUTF8(row["plano_acao_48h"] || row["plano acao"] || ""),
      "Plano acao semanal": decodeUTF8(row["plano_acao_semanal"] || row["Plano acao semanal"] || ""),
      ranking: finalRanking,
      estrategia: Array.isArray(estrategia) ? estrategia : Object.values(estrategia),
      dores: finalDores,
      objecoes: finalObjecoes
    };
  }, [data, selectedReportIndex, reportRows]);

  const activeMetrics = useMemo(() => {
    if (!latestAnalysis) return null;
    if (selectedCloser === "Todos") {
      return {
        gargaloPrincipal: latestAnalysis["Gargalo principal"],
        gargaloAnalise: latestAnalysis["Gargalo analise"],
        causaRaiz: latestAnalysis["Causa principal de perda"],
        reprovacaoPercentual: latestAnalysis["Gargalo percentual reprovacao"],
        restricaoFinanceira: latestAnalysis["Restricao financeira"],
        funnelTotal: latestAnalysis["Funil Total"],
        funnelCTA: latestAnalysis["Funil CTA"],
        funnelConversao: latestAnalysis["Funil Conversao"],
        planoAcaoSemanal: latestAnalysis["Plano acao semanal"],
        planoAcao48h: latestAnalysis["plano acao"],
        dores: latestAnalysis.dores || [],
        objecoes: latestAnalysis.objecoes || []
      };
    }
    const closerData = latestAnalysis.ranking.find(c => (c.nome || c.name || c.closer_nome) === selectedCloser);
    if (!closerData) return { gargaloPrincipal: "—", funnelTotal: 100, dores: [], objecoes: [] };
    const fi = closerData.funil_individual || {};
    return {
      gargaloPrincipal: closerData.principal_dor_enfrentada || "—",
      gargaloAnalise: closerData.padrao_identificado || "Nenhum padrão identificado.",
      causaRaiz: closerData.principal_objecao_enfrentada || "Nenhuma objeção principal identificada.",
      reprovacaoPercentual: 100 - (Number(fi.chegaram_ao_cta_percentual) || 0),
      restricaoFinanceira: 0,
      funnelTotal: Number(fi.oportunidades_totais_percentual) || 100,
      funnelCTA: Number(fi.chegaram_ao_cta_percentual) || 0,
      funnelConversao: Number(fi.converteram_percentual) || 0,
      planoAcaoSemanal: closerData.plano_acao_individual || "",
      planoAcao48h: closerData.acao_imediata_individual || "",
      dores: closerData.dores_individuais || [],
      objecoes: closerData.objecoes_individuais || []
    };
  }, [latestAnalysis, selectedCloser]);

  const closersList = useMemo(() => {
    if (!latestAnalysis?.ranking) return ["Todos"];
    const names = latestAnalysis.ranking.map(item => item.nome || item.name || item.closer_nome);
    return ["Todos", ...names.filter(Boolean)];
  }, [latestAnalysis]);

  const rankedClosers = useMemo(() => {
    if (!latestAnalysis?.ranking) return [];
    const strategyMap = {};
    if (latestAnalysis?.estrategia) {
      latestAnalysis.estrategia.forEach((item) => {
        const closerName = item.closer || item.name;
        if (closerName) strategyMap[closerName] = { decisao: item.decisao || item.decision };
      });
    }
    return latestAnalysis.ranking.map(closer => ({
      ...closer,
      decisao: strategyMap[closer.nome]?.decisao || "MANTER"
    })).sort((a, b) => (Number(b.nota_media) || 0) - (Number(a.nota_media) || 0));
  }, [latestAnalysis]);

  const closersDores = useMemo(() => {
    const map = {};
    if (latestAnalysis?.ranking && latestAnalysis?.dores) {
      latestAnalysis.ranking.forEach((closer, idx) => { if (latestAnalysis.dores[idx]) map[closer.nome] = latestAnalysis.dores[idx]; });
    }
    return map;
  }, [latestAnalysis]);

  const closersObjecoes = useMemo(() => {
    const map = {};
    if (latestAnalysis?.ranking && latestAnalysis?.objecoes) {
      latestAnalysis.ranking.forEach((closer, idx) => { if (latestAnalysis.objecoes[idx]) map[closer.nome] = latestAnalysis.objecoes[idx]; });
    }
    return map;
  }, [latestAnalysis]);

  if (loading) {
    return (
      <DashboardContent title="Relatórios Semanais">
        <div className="flex flex-col items-center justify-center p-20 text-white/30 space-y-4">
          <Loader2 className="animate-spin" size={32} />
          <div className="text-sm font-medium">Carregando dados...</div>
        </div>
      </DashboardContent>
    );
  }

  if (!latestAnalysis) return <DashboardContent title="Relatórios Semanais"><div className="p-20 text-center text-white/30">Sem dados.</div></DashboardContent>;

  const reprovacaoPercentual = Number(activeMetrics?.reprovacaoPercentual || 0);
  const severityKPI = getSeverityLabel(reprovacaoPercentual);

  return (
    <DashboardContent title="Relatórios Semanais">
      <div className="space-y-8 pl-8 pr-10 pt-4 pb-12">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 bg-card/30 backdrop-blur-xl border border-white/5 rounded-2xl p-2 px-4 shadow-xl">
            <div className="flex items-center gap-2 text-white/40 border-r border-white/10 pr-4 mr-2">
              <User size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Squad</span>
            </div>
            <div ref={scrollRef} onMouseDown={startDragging} onMouseLeave={stopDragging} onMouseUp={stopDragging} onMouseMove={move} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar max-w-[400px] cursor-grab active:cursor-grabbing select-none">
              {closersList.map(closer => (
                <button key={closer} onClick={() => !isDragging && setSelectedCloser(closer)} className={clsx("px-4 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize flex-shrink-0", selectedCloser === closer ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 text-white/60")}>
                  {String(closer).replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {reportRows.length > 0 && (
              <div className="relative group">
                <select value={selectedReportIndex || reportRows[0].originalIndex} onChange={(e) => setSelectedReportIndex(Number(e.target.value))} className="appearance-none bg-primary/10 border border-primary/30 rounded-2xl pl-10 pr-10 py-3 text-xs font-black text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-primary/20">
                  {reportRows.map((report, idx) => <option key={report.originalIndex} value={report.originalIndex} className="bg-[#0f172a]">Report #{reportRows.length - idx} — {(report["Data"] || report["_timestamp"] || "N/A").split('T')[0]}</option>)}
                </select>
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Calendar size={14} className="text-primary" /></div>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-primary/50"><ChevronDown size={14} /></div>
              </div>
            )}
            <button onClick={handleSendToWebhook} disabled={sending} className={clsx("flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border shadow-lg shadow-emerald-500/10", sending ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-50" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500")}>
              <Zap size={14} /> {sending ? "Enviando..." : "Sincronizar N8N"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPISCard icon={<AlertTriangle className="text-red-400" size={20} />} label="Gargalo Principal" value={activeMetrics?.gargaloPrincipal || "—"} subValue="Crítico" closerCount={latestAnalysis?.ranking?.length || 0} />
          <KPISCard icon={<Gauge className={clsx("size-5", severityKPI.color)} size={20} />} label="Reprovação (%)" value={`${reprovacaoPercentual.toFixed(0)}%`} subValue="Taxa de perda" severity={severityKPI} />
          <KPISCard icon={<TrendingDown className="text-purple-400" size={20} />} label="Restr. Financeira" value={activeMetrics?.restricaoFinanceira || "0"} subValue="Impactos" />
          <KPISCard icon={<Lightbulb className="text-emerald-400" size={20} />} label="Plano de Ação" value={selectedCloser === "Todos" ? "Em Andamento" : "Individual"} subValue="Status" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2"><Activity size={18} className="text-blue-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Análise de Gargalo</h3></div>
              <div className="p-6"><p className="text-white/80 leading-relaxed text-sm">{activeMetrics?.gargaloAnalise || "Análise indisponível"}</p></div>
            </div>
            <div className={clsx("bg-card/30 backdrop-blur-xl rounded-2xl border overflow-hidden transition-all duration-300", reprovacaoPercentual > 50 ? "border-red-500/30 bg-red-500/5" : "border-white/5")}>
              <div className={clsx("px-6 py-4 border-b bg-white/5 flex items-center gap-2", reprovacaoPercentual > 50 ? "border-red-500/20" : "border-white/5")}><AlertTriangle size={18} className={clsx(reprovacaoPercentual > 50 ? "text-red-400" : "text-white/40")} /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Causa Raiz</h3></div>
              <div className="p-6"><p className="text-white/80 leading-relaxed text-sm">{activeMetrics?.causaRaiz || "Causa não identificada"}</p></div>
            </div>
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2"><Zap size={18} className="text-amber-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Funil de Conversão</h3></div>
              <div className="p-6"><FunnelVisualization funnelTotal={activeMetrics?.funnelTotal} funnelCTA={activeMetrics?.funnelCTA} funnelConversao={activeMetrics?.funnelConversao} /></div>
            </div>
            {activeMetrics?.planoAcaoSemanal && (
              <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-indigo-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center gap-2"><Calendar size={18} className="text-purple-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">{selectedCloser === "Todos" ? "Plano Semanal" : `Plano Individual: ${selectedCloser}`}</h3></div>
                <div className="p-6"><div className="space-y-3">{parseActionPlan(activeMetrics?.planoAcaoSemanal || "").map((step, idx) => (<div key={idx} className="flex gap-3 items-start"><div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400 mt-1">{idx + 1}</div><p className="text-sm text-white/80 leading-relaxed flex-1">{step}</p></div>))}</div></div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2"><Award size={18} className="text-amber-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Ranking Closers</h3></div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">{rankedClosers.map((closer) => (<CloserCard key={closer.nome} closer={closer} expanded={expandedCloser === closer.nome} onToggle={() => setExpandedCloser(expandedCloser === closer.nome ? null : closer.nome)} filteredIn={selectedCloser === "Todos" || selectedCloser === closer.nome} />))}</div>
            </div>
          </div>
        </div>

        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2"><Target size={18} className="text-blue-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Dores do Cliente</h3></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{activeMetrics?.dores?.map((dor, idx) => (<DorCard key={idx} dor={dor} index={idx} maxFrequencia={100} selectedCloser={selectedCloser} closersDores={closersDores} />))}</div>
        </div>

        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2"><AlertTriangle size={18} className="text-purple-400" /><h3 className="font-bold text-sm uppercase tracking-wider text-white">Principais Objeções</h3></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{activeMetrics?.objecoes?.map((objecao, idx) => (<ObjecaoCard key={idx} objecao={objecao} index={idx} maxFrequencia={100} selectedCloser={selectedCloser} closersObjecoes={closersObjecoes} />))}</div>
        </div>
      </div>

      <WeeklyPlanModal open={showPlanModal} onClose={() => setShowPlanModal(false)} planoAcao={activeMetrics?.planoAcao48h || activeMetrics?.planoAcaoSemanal || ""} />
      <SyncProgressModal open={showSyncModal} onClose={() => setShowSyncModal(false)} isComplete={syncStatus.complete} error={syncStatus.error} />
      
      {toast && (
        <div className={clsx("fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl animate-in slide-in-from-right-10 duration-500", toast.type === 'error' ? "bg-red-500/20 border-red-500/30 text-white" : "bg-emerald-500/20 border-emerald-500/30 text-white")}>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">{toast.type === 'error' ? <AlertTriangle className="text-red-400" size={18} /> : <Check className="text-emerald-400" size={18} />}</div>
          <div className="flex flex-col"><span className="text-[10px] uppercase font-black tracking-widest opacity-50">Notificação System</span><span className="text-sm font-bold">{toast.message}</span></div>
          <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"><X size={16} className="opacity-40 hover:opacity-100" /></button>
        </div>
      )}
    </DashboardContent>
  );
}
