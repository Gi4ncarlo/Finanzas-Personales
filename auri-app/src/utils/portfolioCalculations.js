import { getCoinHistory } from '../services/quotesService';
import { COLORES_ACCIONES_AR } from '../data/acciones-argentinas';

/**
 * Módulo E.2 - Evolución histórica del portfolio
 */
export const fetchPortfolioHistory = async (posiciones, days = 30) => {
  if (!posiciones.length) return [];

  // 1. Obtener históricos para todos los activos únicos (Crypto por ahora)
  const cryptoPos = posiciones.filter(p => p.tipo === 'crypto' && p.coingecko_id);
  const historyPromises = cryptoPos.map(p => 
    getCoinHistory(p.coingecko_id, days).then(data => ({ id: p.coingecko_id, data }))
  );

  const allHistories = await Promise.all(historyPromises);
  const historyMap = allHistories.reduce((acc, h) => {
    acc[h.id] = h.data;
    return acc;
  }, {});

  // 2. Generar rango de días para el eje X
  const now = new Date();
  const timePoints = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    timePoints.push(d.toISOString().split('T')[0]);
  }

  // 3. Para cada fecha, calcular valor total
  const portfolioHistory = timePoints.map(dateStr => {
    const dDate = new Date(dateStr);
    
    let valorTotalUSD = 0;
    let costoInversionUSD = 0;

    posiciones.forEach(pos => {
      const fechaCompra = new Date(pos.fecha_compra);
      
      // Solo sumamos lo que ya se compró antes o durante ese día
      if (fechaCompra <= dDate) {
        costoInversionUSD += pos.invertidoUSD || (pos.cantidad * pos.precio_compra);
        
        // Buscar precio de ese activo en ese día
        if (pos.tipo === 'crypto' && historyMap[pos.coingecko_id]) {
          const point = historyMap[pos.coingecko_id].find(p => 
            new Date(p[0]).toISOString().split('T')[0] === dateStr
          );
          const precioEseDia = point ? point[1] : (pos.precioActual || pos.precio_compra);
          valorTotalUSD += pos.cantidad * precioEseDia;
        } else {
          // Si no hay histórico (CEDEARs, Acciones AR, o error), usamos actual/compra
          valorTotalUSD += (pos.cantidad * (pos.precioActual || pos.precio_compra));
        }
      }
    });

    return {
      date: dDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      valorUSD: valorTotalUSD,
      costoUSD: costoInversionUSD,
      gananciaUSD: valorTotalUSD - costoInversionUSD,
      isProfit: valorTotalUSD >= costoInversionUSD
    };
  });

  return portfolioHistory;
};

/**
 * Colores específicos para activos - Módulo E.1
 * Extendido con paleta para Acciones AR (azules/celestes argentinos)
 */
export const getAssetColor = (symbol, type) => {
  const symbolUpper = symbol?.toUpperCase();

  // Colores de crypto conocidos
  const cryptoColors = {
    'BTC': '#F7931A',
    'ETH': '#627EEA',
    'SOL': '#9945FF',
    'USDT': '#26A17B',
    'ADA': '#0033AD',
    'XRP': '#23292F',
    'DOT': '#E6007A',
    'MATIC': '#8247E5',
    'BNB': '#F3BA2F',
  };

  if (cryptoColors[symbolUpper]) return cryptoColors[symbolUpper];

  // Colores brand de acciones AR
  if (type === 'accion' && COLORES_ACCIONES_AR[symbolUpper]) {
    return COLORES_ACCIONES_AR[symbolUpper];
  }

  if (type === 'crypto') {
    // Generar un color aleatorio estable basado en el nombre
    let hash = 0;
    for (let i = 0; i < symbolUpper.length; i++) {
        hash = symbolUpper.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  if (type === 'accion') {
    // Escala de azules celestes argentinos para acciones sin color brand
    let hash = 0;
    for (let i = 0; i < symbolUpper.length; i++) {
      hash = symbolUpper.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = 195 + (hash % 25); // rango 195-220 (azul celeste)
    const light = 35 + (Math.abs(hash >> 8) % 30); // rango 35-65%
    return `hsl(${hue}, 70%, ${light}%)`;
  }

  // Escala de verdes para CEDEARs
  if (type === 'cedear') {
    let hash = 0;
    for (let i = 0; i < symbolUpper.length; i++) {
      hash = symbolUpper.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = 130 + (hash % 30); // verdes
    const light = 30 + (Math.abs(hash >> 8) % 30);
    return `hsl(${hue}, 60%, ${light}%)`;
  }

  // Fallback general
  return `hsl(210, 70%, ${Math.floor(Math.random() * 40) + 30}%)`;
};
