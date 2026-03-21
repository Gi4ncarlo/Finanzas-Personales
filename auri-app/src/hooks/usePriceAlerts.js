import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCryptoPrices, getCedearQuotes } from '../services/quotesService';
import useDolarRate from './useDolarBlue';

export default function usePriceAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { venta: dolarVenta } = useDolarRate();
  const lastCheckRef = useRef(0);

  // 1. Fetch active alerts
  const { data: alerts, mutate: mutateAlerts } = useSWR(
    user ? ['price-alerts', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('activa', true)
        .eq('disparada', false);
      if (error) throw error;
      return data;
    },
    { refreshInterval: 300000 } // Check every 5 min
  );

  useEffect(() => {
    if (!alerts || !alerts.length || !dolarVenta) return;

    // Throttle checks to 2 min minimum to avoid API spam
    const now = Date.now();
    if (now - lastCheckRef.current < 120000) return;
    lastCheckRef.current = now;

    const checkAlerts = async () => {
      // Separar por tipo para minimizar llamadas a API
      // Nota: Asumimos que guardamos el tipo en la alerta o lo inferimos. 
      // Para esta etapa, buscaremos el activo en inversiones si no está en la alerta.
      
      const cryptoIds = [...new Set(alerts.filter(a => a.coingecko_id).map(a => a.coingecko_id))];
      const hasCedears = alerts.some(a => !a.coingecko_id);

      let cryptoQuotes = {};
      let cedearQuotes = [];

      if (cryptoIds.length > 0) cryptoQuotes = await getCryptoPrices(cryptoIds);
      if (hasCedears) cedearQuotes = await getCedearQuotes();

      for (const alert of alerts) {
        let precioActual = 0;
        
        if (alert.coingecko_id && cryptoQuotes[alert.coingecko_id]) {
            precioActual = alert.moneda === 'USD' ? cryptoQuotes[alert.coingecko_id].usd : cryptoQuotes[alert.coingecko_id].ars;
        } else if (!alert.coingecko_id) {
            const quote = cedearQuotes.find(c => c.simbolo === alert.activo_simbolo);
            if (quote) {
                precioActual = alert.moneda === 'ARS' ? quote.ultimo : quote.ultimo / dolarVenta;
            }
        }

        if (precioActual <= 0) continue;

        const goalReached = alert.direccion === 'arriba' 
            ? precioActual >= alert.precio_objetivo 
            : precioActual <= alert.precio_objetivo;

        if (goalReached) {
            // DISPARAR ALERTA
            toast.info(`🔔 ¡Objetivo alcanzado! ${alert.activo_simbolo} llegó a ${alert.moneda} ${alert.precio_objetivo}`, {
                duration: 8000
            });

            // Actualizar en base de datos
            await supabase
                .from('price_alerts')
                .update({ 
                    disparada: true, 
                    disparada_at: new Date(),
                    activa: false 
                })
                .eq('id', alert.id);
            
            mutateAlerts();
        }
      }
    };

    checkAlerts();
  }, [alerts, dolarVenta]);
  
  return { alerts, mutateAlerts };
}
