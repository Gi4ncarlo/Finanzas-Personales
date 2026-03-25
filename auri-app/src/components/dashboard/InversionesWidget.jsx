import { useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import useDolarRate from '../../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../../utils/currency';
import { getCryptoPrices, getCedearQuotes, getAccionesARQuotes } from '../../services/quotesService';
import Skeleton from '../ui/Skeleton';
import { TrendingUp, ArrowRight, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';

export default function InversionesWidget({ onUpdateTotal }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { venta: dolarVenta } = useDolarRate(profile?.tipo_cambio_pref || 'oficial');

  // Fetch investments
  const { data: positions, isLoading: loadingPositions } = useSWR(
    user ? ['investments-widget', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase.from('investments').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    }
  );

  // Fetch prices
  const cryptoIds = positions?.filter(p => p.tipo === 'crypto').map(p => p.coingecko_id).filter(Boolean) || [];
  const hasCedearsOrAcciones = positions?.some(p => p.tipo === 'cedear' || p.tipo === 'accion');
  const hasAcciones = positions?.some(p => p.tipo === 'accion');

  const { data: quotes, isLoading: loadingQuotes } = useSWR(
    cryptoIds.length > 0 ? ['crypto-quotes-widget', cryptoIds.join(',')] : null,
    () => getCryptoPrices(cryptoIds),
    { dedupingInterval: 120000 }
  );

  const { data: cedears, isLoading: loadingCedears } = useSWR(
    hasCedearsOrAcciones ? 'cedear-quotes-widget' : null,
    getCedearQuotes,
    { dedupingInterval: 120000 }
  );

  const { data: accionesAR, isLoading: loadingAcciones } = useSWR(
    hasAcciones ? 'acciones-ar-quotes-widget' : null,
    getAccionesARQuotes,
    { dedupingInterval: 120000 }
  );

  const resumen = useMemo(() => {
    if (!positions || !dolarVenta) return { totalUSD: 0, profitUSD: 0, profitPorc: 0 };

    let totalActualUSD = 0;
    let totalInvertidoUSD = 0;

    positions.forEach(pos => {
      let precioActual = 0;
      if (pos.tipo === 'crypto' && quotes?.[pos.coingecko_id]) {
        precioActual = quotes[pos.coingecko_id].usd;
      } else if (pos.tipo === 'cedear' && cedears) {
        const quote = cedears.find(c => c.simbolo === pos.activo_simbolo);
        if (quote) precioActual = quote.ultimo / dolarVenta;
      } else if (pos.tipo === 'accion' && accionesAR) {
        const quote = accionesAR.find(a => a.simbolo === pos.activo_simbolo);
        if (quote) precioActual = quote.ultimo / dolarVenta;
      }

      // Si fallan quotes, fallback a precio compra
      if (!precioActual || precioActual <= 0) {
        precioActual = pos.moneda_compra === 'USD' ? pos.precio_compra : (pos.precio_compra / dolarVenta);
      }

      totalActualUSD += pos.cantidad * precioActual;
      totalInvertidoUSD += pos.moneda_compra === 'USD' ? (pos.cantidad * pos.precio_compra) : (pos.cantidad * pos.precio_compra / dolarVenta);
    });

    const profitUSD = totalActualUSD - totalInvertidoUSD;
    const profitPorc = totalInvertidoUSD > 0 ? (profitUSD / totalInvertidoUSD) * 100 : 0;

    return { totalUSD: totalActualUSD, profitUSD, profitPorc };
  }, [positions, quotes, cedears, accionesAR, dolarVenta]);

  // Hook effect para avisar al padre (Dashboard) sobre el nuevo total
  useEffect(() => {
    if (onUpdateTotal && resumen.totalUSD !== undefined) {
      onUpdateTotal(resumen.totalUSD);
    }
  }, [resumen.totalUSD, onUpdateTotal]);

  if (loadingPositions || loadingQuotes || loadingCedears || loadingAcciones) return <Skeleton height="180px" />;

  const isPositive = resumen.profitUSD >= 0;

  // Type badges for dashboard display
  const getTypeBadge = (tipo) => {
    const badges = {
      crypto: { icon: '₿', color: '#F7931A' },
      cedear: { icon: '🌎', color: '#4CAF50' },
      accion: { icon: '🇦🇷', color: '#00ADEF' },
    };
    return badges[tipo] || badges.crypto;
  };

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--color-gold)" /> Inversiones
        </h3>
        <button className="btn-icon" onClick={() => navigate('/inversiones')}><ArrowRight size={18} /></button>
      </div>

      {!positions || positions.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '12px' }}>
           <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Aumentá tu saldo invirtiendo en Crypto, CEDEARs o Acciones AR.</p>
           <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 16px' }} onClick={() => navigate('/inversiones')}>Comenzar</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatUSD(resumen.totalUSD)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {formatARS(resumen.totalUSD * dolarVenta)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, 
              color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1rem' 
            }}>
              {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
              {resumen.profitPorc.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '2px' }}>
              {isPositive ? '+' : ''}{formatUSD(resumen.profitUSD)}
            </div>
          </div>
        </div>
      )}

      {positions?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
            {positions.slice(0, 5).map(pos => {
                const badge = getTypeBadge(pos.tipo);
                return (
                  <div key={pos.id} title={`${pos.activo_simbolo} (${pos.tipo})`} style={{ 
                    width: '28px', height: '28px', borderRadius: '50%', 
                    backgroundColor: pos.color || 'var(--color-surface-2)', 
                    border: `2px solid ${badge.color}40`, 
                    marginRight: '-8px', overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '0.6rem', fontWeight: 700, position: 'relative'
                  }}>
                      {pos.imagen_url ? <img src={pos.imagen_url} style={{ width: '100%' }} /> : pos.activo_simbolo?.charAt(0)}
                  </div>
                );
            })}
            {positions.length > 5 && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--color-surface-3)', border: '2px solid var(--color-surface)', marginLeft: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                    +{positions.length - 5}
                </div>
            )}
        </div>
      )}
    </div>
  );
}
