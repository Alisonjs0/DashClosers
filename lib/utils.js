export function parseBant(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error("Error parsing BANT field:", e);
    }
  }
  return null;
}

export function parseRowDate(value) {
  if (!value || typeof value !== "string") return null;
  const raw = value.trim();

  // Supports values like [DateTime: 2026-03-11T10:53:12.118-03:00]
  const dateTimeMatch = raw.match(/^\[DateTime:\s*(.+)\]$/);
  if (dateTimeMatch && dateTimeMatch[1]) {
    const parsed = new Date(dateTimeMatch[1]);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  // Supports dd/mm/yyyy HH:mm (with time)
  const dtMatch = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})\s+(\d{2}):(\d{2})/);
  if (dtMatch) {
    const [, day, month, year, hour, min] = dtMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min)).getTime();
  }

  // Supports dd-mm-yyyy and dd/mm/yyyy from sheet exports
  const match = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    return new Date(year, month, day).getTime();
  }

  // Supports direct ISO values if they come without wrapper
  const isoParsed = new Date(raw);
  if (!Number.isNaN(isoParsed.getTime())) return isoParsed.getTime();

  return null;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const raw = String(value).trim();

  const match = raw.match(/^\[DateTime:\s*(.+)\]$/);
  if (match && match[1]) {
    const parsed = new Date(match[1]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }

  return raw;
}

export function isClosed(status) {
  const s = (status || "").toLowerCase();
  return s.includes("fechad") || s.includes("vendid") || s.includes("ganhou");
}

export const SCORE_KEYS = [
  "Adesão ao Script",
  "Conexão/Rapport",
  "Apres. Autoridade",
  "Entendimento Dores",
  "Apres. Solução",
  "Pitch",
  "Negociação",
  "Fechamento",
  "Confiança",
  "CTA",
  "Objeções"
];

export function parseScore(v) {
  return parseFloat(String(v ?? "").replace(",", "."));
}

export function getAvgScore(row) {
  const vals = SCORE_KEYS.map((k) => parseScore(row[k])).filter((v) => !isNaN(v));
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
export function parseTimeFromField(value) {
  if (!value || typeof value !== "string") return null;
  const raw = value.trim();

  // Try parsing HH:mm or HH:mm:ss
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1], 10);
  }

  // Try parsing the whole date if it's there
  const d = parseRowDate(raw);
  if (d) {
    return new Date(d).getHours();
  }

  return null;
}
export function normalizeCloserName(name) {
  if (!name || typeof name !== "string") return "Não informado";
  
  // Step 1: Remove anything in parentheses (e.g., "(Apoio: ...)")
  let clean = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
  
  // Step 2: Take only the first name if multiple are present
  // Matches " e ", " & ", ",", "/", " and "
  const firstPart = clean.split(/\s+e\s+|\s+&\s+|,|\/|\s+and\s+/i)[0].trim();
  
  // Step 3: Mapping/Aliasing
  const mapping = {
    "gustavo": "Gustavo Emanuel",
    "gustavo emanuel": "Gustavo Emanuel",
    "bruno": "Bruno Borges",
    "bruno borges": "Bruno Borges",
    "carlos": "Carlos Silva",
    "carlos silva": "Carlos Silva",
    "henrique": "Henrique",
    "carlos henrique": "Henrique"
  };

  const lowerPart = firstPart.toLowerCase();
  
  // Special case for Bruno
  if (lowerPart === "bruno" || lowerPart.startsWith("bruno ")) {
    return "Bruno Borges";
  }
  
  // Special case for Gustavo
  if (lowerPart === "gustavo" || lowerPart.startsWith("gustavo ")) {
    return "Gustavo Emanuel";
  }

  // Special case for Henrique / Carlos Henrique
  if (lowerPart === "henrique" || lowerPart === "carlos henrique" || lowerPart.includes("carlos henrique")) {
    return "Henrique";
  }

  const normalized = mapping[lowerPart];
  return normalized || firstPart;
}

export function isValidReport(row) {
  if (!row) return false;

  const blacklist = [
    "NÃO INFORMADO", 
    "NÃO IDENTIFICADO", 
    "NÃO INFORMADA", 
    "DESCONHECIDO", 
    "REUNIÃO INTERNA", 
    "REUNIAO INTERNA", 
    "REUNIÃO DE ALINHAMENTO", 
    "TREINAMENTO INTERNO",
    "ANTONIO PEDRO",
    "N/A",
    "N.A",
    "NI",
    "NÃO",
    "LUIZ HENRIQUE",
    "LUIZ"
  ];

  const empresa = (row["Empresa (Cliente)"] || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const closer = (row["Closer"] || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Desconsiderar reuniões internas específicas do Antonio Pedro
  if (empresa.includes("ANTONIO PEDRO") || closer.includes("ANTONIO PEDRO")) {
    return false;
  }

  // 2. Se for fechamento de venda real, é válida (desde que não seja interna)
  if (isClosed(row["Status"])) return true;
  

  const invalidPhrases = [
    "análise da call foi inviável",
    "ausência da transcrição completa",
    "material integral",
    "negociação perdida devido a falha técnica",
    "condução inadequada da chamada",
    "falha técnica e condução inadequada",
    "não aplicável",
    "não avaliável",
    "transcrição da call vazia",
    "prospect sem voz",
    "INVÁLIDA",
    "ERRO DE REGISTRO",
    "Não houve interação comercial",
    "Não houve cliente",
    "N/A - NÃO IDENTIFICADO"
  ];
  
  const closerWhitelist = [
    "BRUNO",
    "BRUNO BORGES",
    "CARLOS",
    "CARLOS SILVA",
    "GUSTAVO",
    "GUSTAVO EMANUEL",
    "HENRIQUE",
    "CARLOS HENRIQUE"
  ];

  // 1. Check Closer field specifically
  const hasReportData = !!(row["ranking"] || row["estrategia"] || row["ranking_closers"] || row["decisoes_estrategicas"]);
  
  // If it's a regular call row (no report data), it MUST be in the whitelist
  if (!hasReportData) {
    const isWhitelisted = closerWhitelist.some(name => 
        closer === name || 
        name.includes(closer) || 
        closer.includes(name)
    );
    if (!isWhitelisted) return false;
  }
  
  // Additionally, explicitly block blacklisted names for summary rows if they somehow have one
  if (blacklist.includes(closer)) return false;

  // 2. Check ALL fields for invalid phrases or blacklisted values
  const rowValues = Object.values(row).map(v => (v || "").toString());
  
  for (const val of rowValues) {
    const trimmedVal = val.trim();
    
    // Skip JSON fields (they usually start with [ or {)
    if (trimmedVal.startsWith('[') || trimmedVal.startsWith('{')) continue;

    const upperVal = trimmedVal.toUpperCase();
    const lowerVal = trimmedVal.toLowerCase();

    // Check for blacklisted exact matches in any field (like "REUNIÃO INTERNA")
    if (blacklist.includes(upperVal)) return false;

    // Check for invalid substrings in any field (like "falha técnica")
    if (invalidPhrases.some(phrase => lowerVal.includes(phrase.toLowerCase()))) {
      return false;
    }
  }

  return true;
}
