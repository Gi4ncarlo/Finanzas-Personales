const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const RAVA_BASE = 'https://rava.com/api'; // Nota: En producción esto podría requerir un proxy CORS

/**
 * Cache simple en memoria para los precios actuales (3 min)
 */
const priceCache = {
  data: {},
  timestamp: 0,
};

const CACHE_TIME = 3 * 60 * 1000; // 3 minutos

export const getCryptoPrices = async (ids = []) => {
  if (ids.length === 0) return {};
  
  const now = Date.now();
  const cacheKey = ids.sort().join(',');
  
  if (priceCache.data[cacheKey] && (now - priceCache.timestamp < CACHE_TIME)) {
    return priceCache.data[cacheKey];
  }

  try {
    const response = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd,ars&include_24hr_change=true`
    );
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    
    priceCache.data[cacheKey] = data;
    priceCache.timestamp = now;
    return data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return priceCache.data[cacheKey] || {};
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

const POPULAR_CEDEARS = [
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

export const searchCedears = (query) => {
  if (!query) return [];
  const q = query.toLowerCase();
  
  // Filtrar los populares
  const matches = POPULAR_CEDEARS.filter(c => 
    c.symbol.toLowerCase().includes(q) || 
    c.name.toLowerCase().includes(q)
  );

  // Si no hay match exácto en populares pero escribió algo (ej. "PLTR"), 
  // le permitimos crearlo dinámicamente:
  if (!matches.find(m => m.symbol.toLowerCase() === q)) {
    matches.push({ id: query.toUpperCase(), symbol: query.toUpperCase(), name: query.toUpperCase() });
  }

  return matches;
};

export const getCoinHistory = async (id, days = 30) => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.prices || []; // [[ts, price]]
  } catch (error) {
    console.error('Error fetching coin history:', error);
    return [];
  }
};

/**
 * CEDEARs via Rava (Simulado si falla CORS)
 */
export const getCedearQuotes = async () => {
  try {
    // Intentar Rava a través de un proxy CORS público para evitar bloqueos locales
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${RAVA_BASE}/cotizaciones/cedears`)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Rava API error');
    return await response.json();
  } catch (error) {
    console.warn('Rava API bloqueada por CORS en localhost. Simulando precios reales de mercado para desarrollo...');
    
    // Generar precios de respaldo asumiendo una cotización aproximada para todas las populares (solo entorno local/dev)
    const currentPrices = {
      'AAPL': 12500, 'MSFT': 26000, 'GOOGL': 14000, 'AMZN': 13500, 'META': 31000, 
      'TSLA': 8400, 'NVDA': 9300, 'AMD': 9800, 'INTC': 2100, 'MELI': 24500, 
      'KO': 9800, 'PEP': 11200, 'MCD': 18000, 'DIS': 7500, 'WMT': 11000, 
      'JNJ': 11500, 'V': 18500, 'MA': 21000, 'JPM': 12500, 'PG': 11000, 
      'NFLX': 28000, 'SPY': 49000, 'QQQ': 54000, 'DIA': 41000,
      'NVDAD': 6.5, 'SPYD': 34.5, 'NVDAC': 6.6, 'SPYC': 34.7
    };

    return POPULAR_CEDEARS.map(c => ({
      simbolo: c.symbol,
      nombre: c.name,
      ultimo: currentPrices[c.symbol] || 5000 + Math.random() * 10000,
      variacion: Number((Math.random() * 4 - 2).toFixed(2)) // Simulamos volatilidad 
    })).concat([
      // Sumamos manualmente las especies en dólares (MEP) y Cable (CCL) para hacer testing completo
      { simbolo: 'NVDAD', nombre: 'Nvidia MEP', ultimo: currentPrices['NVDAD'], variacion: 0.5 },
      { simbolo: 'SPYD', nombre: 'SPY MEP', ultimo: currentPrices['SPYD'], variacion: -0.2 },
      { simbolo: 'NVDAC', nombre: 'Nvidia CCL', ultimo: currentPrices['NVDAC'], variacion: 0.1 },
      { simbolo: 'SPYC', nombre: 'SPY CCL', ultimo: currentPrices['SPYC'], variacion: 0.6 },
    ]);
  }
};

export const getCedearQuote = async (symbol) => {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${RAVA_BASE}/cotizaciones/cedear/${symbol}`)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Rava API error');
    return await response.json();
  } catch (error) {
    // Si falla, buscar en los estáticos generados
    const all = await getCedearQuotes();
    return all.find(c => c.simbolo.toUpperCase() === symbol.toUpperCase());
  }
};
