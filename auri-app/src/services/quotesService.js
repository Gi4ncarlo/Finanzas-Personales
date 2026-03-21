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
    // Intentar Rava
    const response = await fetch(`${RAVA_BASE}/cotizaciones/cedears`);
    if (!response.ok) throw new Error('Rava API error');
    return await response.json();
  } catch (error) {
    console.warn('Rava API no disponible o error de CORS, usando datos estáticos de respaldo.');
    // Datos de respaldo comunes para demo/desarrollo si Rava falla
    return [
      { simbolo: 'AAPL', nombre: 'Apple', ultimo: 12500, variacion: 1.5 },
      { simbolo: 'MELI', nombre: 'MercadoLibre', ultimo: 24500, variacion: -0.8 },
      { simbolo: 'TSLA', nombre: 'Tesla', ultimo: 8400, variacion: 2.1 },
      { simbolo: 'KO', nombre: 'Coca Cola', ultimo: 9800, variacion: 0.3 },
      { simbolo: 'GGAL', nombre: 'Galicia', ultimo: 1850, variacion: 4.2 },
    ];
  }
};

export const getCedearQuote = async (symbol) => {
  try {
    const response = await fetch(`${RAVA_BASE}/cotizaciones/cedear/${symbol}`);
    if (!response.ok) throw new Error('Rava API error');
    return await response.json();
  } catch (error) {
    // Si falla el específico, intentamos el general y filtramos
    const all = await getCedearQuotes();
    return all.find(c => c.simbolo.toUpperCase() === symbol.toUpperCase());
  }
};
