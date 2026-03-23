import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // 1. Traer todas las alertas activas y no disparadas
    const { data: alertas, error: alertError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('activa', true)
      .eq('disparada', false)

    if (alertError) throw alertError;
    if (!alertas || alertas.length === 0) return new Response(JSON.stringify({ ok: true, message: 'No active alerts' }));

    // 2. Agrupar por activo para hacer el mínimo de llamadas a la API
    const cryptoIds = [...new Set(alertas.filter(a => a.coingecko_id).map(a => a.coingecko_id))]
    
    // 3. Obtener precios actuales de CoinGecko
    let cryptoPrices: Record<string, any> = {}
    if (cryptoIds.length > 0) {
      const resp = await fetch(`${COINGECKO_BASE}/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd,ars&include_24hr_change=true`)
      cryptoPrices = await resp.json()
    }

    // 4. Actualizar caché de precios y verificar alertas
    for (const alerta of alertas) {
      let precioActual = 0;
      
      if (alerta.coingecko_id && cryptoPrices[alerta.coingecko_id]) {
        precioActual = alerta.moneda === 'USD' ? cryptoPrices[alerta.coingecko_id].usd : cryptoPrices[alerta.coingecko_id].ars;
      }

      if (precioActual === 0) continue;

      const seDisparo = 
        (alerta.direccion === 'arriba' && precioActual >= alerta.precio_objetivo) ||
        (alerta.direccion === 'abajo' && precioActual <= alerta.precio_objetivo);

      if (seDisparo) {
        // A. Marcar como disparada
        await supabase.from('price_alerts').update({
          disparada: true,
          disparada_at: new Date().toISOString(),
          activa: false
        }).eq('id', alerta.id)

        // B. Crear notificación in-app
        await supabase.from('app_notifications').insert({
          user_id: alerta.user_id,
          tipo: 'alerta_precio',
          titulo: `¡Alerta! ${alerta.activo_simbolo} llegó a su objetivo`,
          mensaje: `El activo ${alerta.activo_nombre} (${alerta.activo_simbolo}) alcanzó los ${alerta.moneda} ${alerta.precio_objetivo}. Precio actual: ${alerta.moneda} ${precioActual}.`,
          metadata: { alerta_id: alerta.id, precio_alcanzado: precioActual }
        })
      }
    }

    return new Response(JSON.stringify({ processed: alertas.length, ok: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
