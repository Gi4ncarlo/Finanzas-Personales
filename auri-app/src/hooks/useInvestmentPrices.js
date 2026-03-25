import { useState, useCallback, useEffect, useRef } from 'react';
import { getCryptoPrices, getCedearQuotes, getAccionesARQuotes } from '../services/quotesService';
import { supabase } from '../lib/supabase';

/**
 * useInvestmentPrices Hook
 * Trae y cachea precios. Auto-refresh cada 2 minutos.
 */
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutos

export default function useInvestmentPrices(posiciones = [], dolarVenta = 1) {
  const [precios, setPrecios] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const hasLoadedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const fetchPrecios = useCallback(async (isForced = false, isSilent = false) => {
    if (!posiciones.length) return;
    // Evitar fetches concurrentes
    if (isFetchingRef.current && !isForced) return;
    isFetchingRef.current = true;

    if (!isSilent) setLoading(true);
    setError(null);

    const cryptoIds = posiciones
      .filter(p => p.tipo === 'crypto' && p.coingecko_id)
      .map(p => p.coingecko_id);

    const cedearSimbolos = posiciones
      .filter(p => p.tipo === 'cedear')
      .map(p => p.activo_simbolo);

    const accionSimbolos = posiciones
      .filter(p => p.tipo === 'accion')
      .map(p => p.activo_simbolo);

    try {
      const [cryptoData, cedearData, accionesData] = await Promise.all([
        cryptoIds.length ? getCryptoPrices(cryptoIds) : Promise.resolve({}),
        cedearSimbolos.length ? getCedearQuotes() : Promise.resolve([]),
        accionSimbolos.length ? getAccionesARQuotes() : Promise.resolve([])
      ]);

      const mapaPrecios = {};

      // Procesar Crypto
      Object.entries(cryptoData).forEach(([cgId, data]) => {
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

      // Procesar CEDEARs
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

      // Procesar Acciones AR
      accionesData.forEach(a => {
        if (accionSimbolos.includes(a.simbolo)) {
          mapaPrecios[a.simbolo] = {
            precio_ars: a.ultimo,
            variacion24h: a.variacion,
            moneda: 'ARS',
            fuente: 'Rava'
          };
        }
      });

      // SAFETY NET: Si alguna posición sigue sin precio, usar precio_compra como último recurso
      // Esto cubre CEDEARs/Acciones con símbolos custom que no están en las listas de fallback
      posiciones.forEach(pos => {
        if (!mapaPrecios[pos.activo_simbolo]) {
          const precioCompra = Number(pos.precio_compra) || 0;
          if (pos.tipo === 'crypto') {
            mapaPrecios[pos.activo_simbolo] = {
              precio: pos.moneda_compra === 'USD' ? precioCompra : 0,
              precio_ars: pos.moneda_compra === 'ARS' ? precioCompra : 0,
              variacion24h: 0,
              moneda: pos.moneda_compra,
              fuente: 'Precio de compra (sin cotización)'
            };
          } else {
            // CEDEARs y Acciones AR — precio en ARS
            mapaPrecios[pos.activo_simbolo] = {
              precio_ars: pos.moneda_compra === 'ARS' ? precioCompra : precioCompra * (dolarVenta || 1),
              variacion24h: 0,
              moneda: 'ARS',
              fuente: 'Precio de compra (sin cotización)'
            };
          }
        }
      });

      setPrecios(mapaPrecios);
      setUltimaActualizacion(new Date());
      hasLoadedRef.current = true;

      // Actualizar tabla caché en Supabase (sin esperar)
      actualizarCacheGlobal(mapaPrecios, posiciones);

    } catch (err) {
      console.error('Error in useInvestmentPrices:', err);
      // Solo mostrar error en carga inicial o manual, no en auto-refresh
      if (!isSilent) {
        setError('No se pudo obtener precios — mostrando último valor conocido');
      }
      
      // Fallback: leer de asset_price_cache solo si no tenemos precios previos
      if (Object.keys(precios).length === 0) {
        try {
          const { data: cacheData } = await supabase
            .from('asset_price_cache')
            .select('*');
          
          if (cacheData?.length) {
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
        } catch (cacheErr) {
          console.warn('Cache fallback also failed:', cacheErr);
        }
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setLoading(false);
    }
  }, [posiciones, dolarVenta]);

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

  // Carga inicial (1 sola vez)
  useEffect(() => {
    if (posiciones.length > 0 && !hasLoadedRef.current) {
      fetchPrecios(false, false);
    }
  }, [posiciones, fetchPrecios]);

  // Auto-refresh cada 2 minutos (silencioso)
  useEffect(() => {
    if (!posiciones.length) return;
    
    const intervalId = setInterval(() => {
      fetchPrecios(false, true); // silent = true
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [posiciones, fetchPrecios]);

  return { precios, loading, error, ultimaActualizacion, refetch: () => fetchPrecios(true, false) };
}
