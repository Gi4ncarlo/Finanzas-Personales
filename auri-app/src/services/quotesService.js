const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const RAVA_BASE = 'https://rava.com/api';

import { ACCIONES_PRINCIPALES, PRECIOS_FALLBACK_AR } from '../data/acciones-argentinas';

/**
 * Cache TTL global — 2 minutos
 */
const CACHE_TIME = 2 * 60 * 1000;
const CACHE_TIME_HISTORY = 60 * 60 * 1000;

/**
 * Multi-proxy CORS fetcher — intenta varios proxies en orden y devuelve el primero que responde
 */
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
];

async function proxyFetch(targetUrl, timeoutMs = 8000) {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue; // Intentar siguiente proxy
      
      const data = await response.json();
      // Validar que realmente devolvió datos (no HTML de error del proxy)
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        return data;
      }
    } catch (e) {
      // Proxy falló, intentar el siguiente
      continue;
    }
  }
  
  // Último intento: fetch directo (funciona si no hay CORS, ej. producción)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) return await response.json();
  } catch (e) { /* noop */ }
  
  return null; // Todos fallaron
}

// ═══════════════════════════════════════════════════
//  CRYPTO — CoinGecko
// ═══════════════════════════════════════════════════

const cryptoCache = { data: {}, timestamp: 0 };

export const getCryptoPrices = async (ids = []) => {
  if (ids.length === 0) return {};
  
  const now = Date.now();
  const cacheKey = ids.sort().join(',');
  
  if (cryptoCache.data[cacheKey] && (now - cryptoCache.timestamp < CACHE_TIME)) {
    return cryptoCache.data[cacheKey];
  }

  try {
    const response = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd,ars&include_24hr_change=true`
    );
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    
    cryptoCache.data[cacheKey] = data;
    cryptoCache.timestamp = now;
    return data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return cryptoCache.data[cacheKey] || {};
  }
};

export const searchCrypto = async (query) => {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch(`${COINGECKO_BASE}/search?query=${query}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.coins || [];
  } catch (error) {
    console.error('Error searching crypto:', error);
    return [];
  }
};

export const getCoinHistory = async (id, days = 30) => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.prices || [];
  } catch (error) {
    console.error('Error fetching coin history:', error);
    return [];
  }
};

/**
 * Top cryptos populares para el browse del modal (sin llamar a la API)
 */
export const POPULAR_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', thumb: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', thumb: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', thumb: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', thumb: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', thumb: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', thumb: 'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', thumb: 'https://assets.coingecko.com/coins/images/6319/thumb/usdc.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', thumb: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', thumb: 'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', thumb: 'https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', thumb: 'https://assets.coingecko.com/coins/images/4713/thumb/polygon.png' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', thumb: 'https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', thumb: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', thumb: 'https://assets.coingecko.com/coins/images/2/thumb/litecoin.png' },
  { id: 'dai', symbol: 'DAI', name: 'Dai', thumb: 'https://assets.coingecko.com/coins/images/9956/thumb/Badge_Dai.png' },
];


// ═══════════════════════════════════════════════════
//  CEDEARs — Rava
// ═══════════════════════════════════════════════════

export const POPULAR_CEDEARS = [
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.' },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft' },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet (Google)' },
  { id: 'AMZN', symbol: 'AMZN', name: 'Amazon' },
  { id: 'META', symbol: 'META', name: 'Meta Platforms (Facebook)' },
  { id: 'TSLA', symbol: 'TSLA', name: 'Tesla' },
  { id: 'NVDA', symbol: 'NVDA', name: 'Nvidia' },
  { id: 'AMD', symbol: 'AMD', name: 'Advanced Micro Devices' },
  { id: 'INTC', symbol: 'INTC', name: 'Intel' },
  { id: 'MELI', symbol: 'MELI', name: 'Mercado Libre' },
  { id: 'KO', symbol: 'KO', name: 'Coca-Cola' },
  { id: 'PEP', symbol: 'PEP', name: 'PepsiCo' },
  { id: 'MCD', symbol: 'MCD', name: "McDonald's" },
  { id: 'DIS', symbol: 'DIS', name: 'Walt Disney' },
  { id: 'WMT', symbol: 'WMT', name: 'Walmart' },
  { id: 'JNJ', symbol: 'JNJ', name: 'Johnson & Johnson' },
  { id: 'V', symbol: 'V', name: 'Visa' },
  { id: 'MA', symbol: 'MA', name: 'Mastercard' },
  { id: 'JPM', symbol: 'JPM', name: 'JPMorgan Chase' },
  { id: 'PG', symbol: 'PG', name: 'Procter & Gamble' },
  { id: 'NFLX', symbol: 'NFLX', name: 'Netflix' },
  { id: 'SPY', symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { id: 'QQQ', symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { id: 'DIA', symbol: 'DIA', name: 'SPDR Dow Jones' }
];

/**
 * Precios estáticos de respaldo para CEDEARs (ARS) — DETERMINÍSTICOS, sin random
 * Se usan cuando Rava no responde (CORS / timeout / dev local)
 */
const CEDEAR_FALLBACK_PRICES = {
  'AAPL': 12500, 'MSFT': 26000, 'GOOGL': 14000, 'AMZN': 13500, 'META': 31000, 
  'TSLA': 8400, 'NVDA': 9300, 'AMD': 9800, 'INTC': 2100, 'MELI': 24500, 
  'KO': 9800, 'PEP': 11200, 'MCD': 18000, 'DIS': 7500, 'WMT': 11000, 
  'JNJ': 11500, 'V': 18500, 'MA': 21000, 'JPM': 12500, 'PG': 11000, 
  'NFLX': 28000, 'SPY': 49000, 'QQQ': 54000, 'DIA': 41000,
  'NVDAD': 6.5, 'SPYD': 34.5, 'NVDAC': 6.6, 'SPYC': 34.7,
  // Extras que el usuario podría crear manualmente
  'BABA': 5600, 'GLOB': 32000, 'DESP': 4800, 'SNAP': 1200,
  'UBER': 5500, 'SQ': 6000, 'PYPL': 5200, 'SHOP': 7800,
  'COIN': 15000, 'ARKK': 3200, 'XLE': 8500, 'GLD': 18000,
};

export const searchCedears = (query) => {
  if (!query) return POPULAR_CEDEARS; // Sin query → devolver TODOS
  const q = query.toLowerCase();
  
  const matches = POPULAR_CEDEARS.filter(c => 
    c.symbol.toLowerCase().includes(q) || 
    c.name.toLowerCase().includes(q)
  );

  // Si la búsqueda no matchea exactamente, permitir crear custom
  if (query.length >= 2 && !matches.find(m => m.symbol.toLowerCase() === q)) {
    matches.push({ id: query.toUpperCase(), symbol: query.toUpperCase(), name: query.toUpperCase() });
  }

  return matches;
};

/**
 * Cache de CEDEARs — evita llamadas duplicadas
 */
const cedearCache = { data: null, timestamp: 0 };

export const getCedearQuotes = async () => {
  const now = Date.now();
  if (cedearCache.data && (now - cedearCache.timestamp < CACHE_TIME)) {
    return cedearCache.data;
  }

  try {
    const data = await proxyFetch(`${RAVA_BASE}/cotizaciones/cedears`);
    if (!data) throw new Error('All proxies failed');
    
    cedearCache.data = data;
    cedearCache.timestamp = now;
    return data;
  } catch (error) {
    console.warn('Rava CEDEARs API no disponible. Usando precios de respaldo estáticos...');
    
    // Fallback DETERMINÍSTICO — generar entradas para TODOS los símbolos conocidos
    // Incluye auto-generación de variantes D (MEP) y C (CCL)
    const fallbackData = [];
    const addedSymbols = new Set();

    // 1. Todos los de POPULAR_CEDEARS
    POPULAR_CEDEARS.forEach(c => {
      const sym = c.symbol;
      if (!addedSymbols.has(sym)) {
        fallbackData.push({ simbolo: sym, nombre: c.name, ultimo: CEDEAR_FALLBACK_PRICES[sym] || 5000, variacion: 0 });
        addedSymbols.add(sym);
      }
      // Auto-generar variante D (MEP) y C (CCL)
      const symD = sym + 'D';
      const symC = sym + 'C';
      if (!addedSymbols.has(symD)) {
        fallbackData.push({ simbolo: symD, nombre: `${c.name} MEP`, ultimo: CEDEAR_FALLBACK_PRICES[symD] || (CEDEAR_FALLBACK_PRICES[sym] ? CEDEAR_FALLBACK_PRICES[sym] / 1400 : 5), variacion: 0 });
        addedSymbols.add(symD);
      }
      if (!addedSymbols.has(symC)) {
        fallbackData.push({ simbolo: symC, nombre: `${c.name} CCL`, ultimo: CEDEAR_FALLBACK_PRICES[symC] || (CEDEAR_FALLBACK_PRICES[sym] ? CEDEAR_FALLBACK_PRICES[sym] / 1380 : 5), variacion: 0 });
        addedSymbols.add(symC);
      }
    });

    // 2. Cualquier otro símbolo extra del mapa de fallback que no esté ya
    Object.entries(CEDEAR_FALLBACK_PRICES).forEach(([sym, price]) => {
      if (!addedSymbols.has(sym)) {
        fallbackData.push({ simbolo: sym, nombre: sym, ultimo: price, variacion: 0 });
        addedSymbols.add(sym);
      }
    });

    cedearCache.data = fallbackData;
    cedearCache.timestamp = now;
    return fallbackData;
  }
};

export const getCedearQuote = async (symbol) => {
  try {
    // Primero intentar desde el batch cacheado (mucho más rápido)
    const all = await getCedearQuotes();
    const cached = all.find(c => c.simbolo.toUpperCase() === symbol.toUpperCase());
    if (cached) return cached;

    // Si no está en el batch, intentar endpoint individual
    const data = await proxyFetch(`${RAVA_BASE}/cotizaciones/cedear/${symbol}`);
    if (!data) throw new Error('All proxies failed');
    return data;
  } catch (error) {
    // Último recurso: precio estático
    const price = CEDEAR_FALLBACK_PRICES[symbol.toUpperCase()];
    if (price) {
      return { simbolo: symbol.toUpperCase(), ultimo: price, variacion: 0 };
    }
    return null;
  }
};


// ═══════════════════════════════════════════════════
//  ACCIONES ARGENTINAS (BYMA) — Rava
// ═══════════════════════════════════════════════════

/**
 * Buscar acciones argentinas desde la lista local
 */
export const searchAccionesAR = (query) => {
  // Sin query → devolver TODAS (browse mode)
  if (!query || query.length < 1) {
    return ACCIONES_PRINCIPALES.map(a => ({
      id: a.simbolo,
      symbol: a.simbolo,
      name: a.nombre,
      sector: a.sector,
      precio_actual: PRECIOS_FALLBACK_AR[a.simbolo] || null,
      variacion: null,
    }));
  }

  const q = query.toLowerCase();
  return ACCIONES_PRINCIPALES.filter(a =>
    a.simbolo.toLowerCase().includes(q) ||
    a.nombre.toLowerCase().includes(q) ||
    a.sector.toLowerCase().includes(q)
  ).map(a => ({
    id: a.simbolo,
    symbol: a.simbolo,
    name: a.nombre,
    sector: a.sector,
    precio_actual: PRECIOS_FALLBACK_AR[a.simbolo] || null,
    variacion: null,
  }));
};

/**
 * Cache de acciones AR
 */
const accionesARCache = { data: null, timestamp: 0 };

export const getAccionesARQuotes = async () => {
  const now = Date.now();
  if (accionesARCache.data && (now - accionesARCache.timestamp < CACHE_TIME)) {
    return accionesARCache.data;
  }

  try {
    const data = await proxyFetch(`${RAVA_BASE}/cotizaciones/acciones`);
    if (!data) throw new Error('All proxies failed');
    
    accionesARCache.data = data;
    accionesARCache.timestamp = now;
    return data;
  } catch (error) {
    console.warn('Rava Acciones API no disponible. Usando precios de respaldo...');

    const fallbackData = ACCIONES_PRINCIPALES.map(a => ({
      simbolo: a.simbolo,
      nombre: a.nombre,
      ultimo: PRECIOS_FALLBACK_AR[a.simbolo] || 1000,
      variacion: 0, // Sin variación simulada
    }));

    accionesARCache.data = fallbackData;
    accionesARCache.timestamp = now;
    return fallbackData;
  }
};

export const getAccionARQuote = async (symbol) => {
  try {
    // Primero intentar batch cacheado
    const all = await getAccionesARQuotes();
    const cached = all.find(a => a.simbolo.toUpperCase() === symbol.toUpperCase());
    if (cached) return cached;

    const data = await proxyFetch(`${RAVA_BASE}/cotizaciones/accion/${symbol}`);
    if (!data) throw new Error('All proxies failed');
    return data;
  } catch (error) {
    const price = PRECIOS_FALLBACK_AR[symbol.toUpperCase()];
    if (price) {
      return { simbolo: symbol.toUpperCase(), ultimo: price, variacion: 0 };
    }
    return null;
  }
};

/**
 * Historial de una acción AR
 */
const historyARCache = {};

export const getAccionARHistory = async (symbol, days = 30) => {
  const cacheKey = `${symbol}_${days}`;
  const now = Date.now();
  
  if (historyARCache[cacheKey] && (now - historyARCache[cacheKey].timestamp < CACHE_TIME_HISTORY)) {
    return historyARCache[cacheKey].data;
  }

  try {
    const desde = new Date();
    desde.setDate(desde.getDate() - days);
    const desdeStr = desde.toISOString().split('T')[0];
    const hastaStr = new Date().toISOString().split('T')[0];

    const data = await proxyFetch(
      `${RAVA_BASE}/cotizaciones/historico/${symbol}?desde=${desdeStr}&hasta=${hastaStr}`
    );
    if (!data) throw new Error('All proxies failed');
    
    historyARCache[cacheKey] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.warn(`Historial no disponible para ${symbol}`);
    return [];
  }
};
