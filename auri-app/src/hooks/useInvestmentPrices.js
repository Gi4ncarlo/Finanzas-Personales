import { useState, useCallback, useEffect, useRef } from 'react';
import { getCryptoPrices, getCedearQuotes } from '../services/quotesService';
import { supabase } from '../lib/supabase';

/**
 * useInvestmentPrices Hook
 * Responsable de traer y cachear todos los precios necesarios
 * Módulos D.1 y D.2
 */
export default function useInvestmentPrices(posiciones = []) {
  const [precios, setPrecios] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchPrecios = useCallback(async (isForced = false) => {
    if (!posiciones.length) return;
    setLoading(true);
    setError(null);

    const cryptoIds = posiciones
      .filter(p => p.tipo === 'crypto' && p.coingecko_id)
      .map(p => p.coingecko_id);

    const cedearSimbolos = posiciones
      .filter(p => p.tipo === 'cedear')
      .map(p => p.activo_simbolo);

    try {
      // 1. Fetching paralelo
      const [cryptoData, cedearData] = await Promise.all([
        cryptoIds.length ? getCryptoPrices(cryptoIds) : Promise.resolve({}),
        cedearSimbolos.length ? getCedearQuotes() : Promise.resolve([])
      ]);

      const mapaPrecios = {};

      // 2. Procesar Crypto
      Object.entries(cryptoData).forEach(([cgId, data]) => {
        // Encontrar símbolo original de la posición para el mapa
        const pos = posiciones.find(p => p.coingecko_id === cgId);
        if (pos) {
          mapaPrecios[pos.activo_simbolo] = {
            precio: data.usd,
            precio_ars: data.ars,
            variacion24h: data.usd_24h_change,
            moneda: 'USD',
            fuente: 'CoinGecko'
          };
        }
      });

      // 3. Procesar CEDEARs
      cedearData.forEach(c => {
        if (cedearSimbolos.includes(c.simbolo)) {
          mapaPrecios[c.simbolo] = {
            precio_ars: c.ultimo,
            variacion24h: c.variacion,
            moneda: 'ARS',
            fuente: 'Rava'
          };
        }
      });

      setPrecios(mapaPrecios);
      setUltimaActualizacion(new Date());
      hasLoadedRef.current = true;

      // 4. Actualizar tabla caché en Supabase (Fallback para otros)
      // Nota: lo hacemos asíncrono sin esperar
      actualizarCacheGlobal(mapaPrecios, posiciones);

    } catch (err) {
      console.error('Error in useInvestmentPrices:', err);
      setError('No se pudo obtener precios — mostrando último valor conocido');
      
      // FALLBACK: Leer de asset_price_cache
      const { data: cacheData } = await supabase
        .from('asset_price_cache')
        .select('*');
      
      if (cacheData) {
        const fallbackMap = {};
        cacheData.forEach(c => {
          fallbackMap[c.simbolo] = {
            precio: Number(c.precio_usd),
            precio_ars: Number(c.precio_ars),
            variacion24h: Number(c.variacion_24h),
            moneda: c.tipo === 'crypto' ? 'USD' : 'ARS',
            fuente: `Caché (${new Date(c.actualizado_at).toLocaleTimeString()})`
          };
        });
        setPrecios(prev => ({ ...prev, ...fallbackMap }));
      }
    } finally {
      setLoading(false);
    }
  }, [posiciones]);

  const actualizarCacheGlobal = async (mapa, posiciones) => {
    const upserts = Object.entries(mapa).map(([simbolo, data]) => {
      const pos = posiciones.find(p => p.activo_simbolo === simbolo);
      return {
        simbolo,
        tipo: pos?.tipo || 'crypto',
        precio_usd: data.precio || null,
        precio_ars: data.precio_ars || null,
        variacion_24h: data.variacion24h,
        fuente: data.fuente,
        actualizado_at: new Date()
      };
    });

    if (upserts.length) {
      await supabase.from('asset_price_cache').upsert(upserts);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (posiciones.length > 0 && !hasLoadedRef.current) {
      fetchPrecios();
    }
  }, [posiciones, fetchPrecios]);

  return { precios, loading, error, ultimaActualizacion, refetch: () => fetchPrecios(true) };
}
