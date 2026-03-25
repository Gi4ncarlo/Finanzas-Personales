import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import useDolarRate from '../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../utils/currency';
import { getCoinHistory, getCryptoPrices, getCedearQuotes, getAccionesARQuotes, getAccionARHistory } from '../services/quotesService';
import Skeleton from '../components/ui/Skeleton';
import AlertModal from '../components/inversiones/AlertModal';

import { 
  ArrowLeft, TrendingUp, Calendar, Trash2, 
  ArrowUpRight, ArrowDownLeft, Clock, Info, Bell, Plus 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function InvestmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { venta: dolarVenta } = useDolarRate(profile?.tipo_cambio_pref);

  const [days, setDays] = useState(30);
  const [alertModalOpen, setAlertModalOpen] = useState(false);


  // 1. Fetch investment data
  const { data: pos, mutate: mutatePos, isLoading: loadingPos } = useSWR(
    id ? ['investment-detail', id] : null,
    async ([, id]) => {
      const { data, error } = await supabase
        .from('investments')
        .select('*, investment_purchases(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  );

  // 2. Fetch History
  // Crypto: CoinGecko history
  const { data: cryptoHistory, isLoading: loadingCryptoHistory } = useSWR(
    pos?.tipo === 'crypto' && pos?.coingecko_id ? ['history', pos.coingecko_id, days] : null,
    () => getCoinHistory(pos.coingecko_id, days)
  );

  // Accion AR: Rava history
  const { data: accionHistory, isLoading: loadingAccionHistory } = useSWR(
    pos?.tipo === 'accion' ? ['history-ar', pos.activo_simbolo, days] : null,
    () => getAccionARHistory(pos.activo_simbolo, days)
  );

  const loadingHistory = loadingCryptoHistory || loadingAccionHistory;
  const history = pos?.tipo === 'crypto' ? cryptoHistory : pos?.tipo === 'accion' ? accionHistory : null;

  // 3. Current Price
  const { data: quotes } = useSWR(
    pos?.tipo === 'crypto' ? ['crypto-quote', pos.coingecko_id] : null,
    () => getCryptoPrices([pos.coingecko_id]),
    { refreshInterval: 60000 }
  );

  const { data: cedears } = useSWR(
    pos?.tipo === 'cedear' ? 'cedears' : null,
    getCedearQuotes,
    { refreshInterval: 60000 }
  );

  const { data: accionesAR } = useSWR(
    pos?.tipo === 'accion' ? 'acciones-ar-detail' : null,
    getAccionesARQuotes,
    { refreshInterval: 60000 }
  );

  const currentPrice = useMemo(() => {
    if (!pos || !dolarVenta) return 0;
    if (pos.tipo === 'crypto' && quotes?.[pos.coingecko_id]) return quotes[pos.coingecko_id].usd;
    if (pos.tipo === 'cedear' && cedears) {
        const q = cedears.find(c => c.simbolo === pos.activo_simbolo);
        return q ? q.ultimo / dolarVenta : 0;
    }
    if (pos.tipo === 'accion' && accionesAR) {
        const q = accionesAR.find(a => a.simbolo === pos.activo_simbolo);
        return q ? q.ultimo / dolarVenta : 0;
    }
    return 0;
  }, [pos, quotes, cedears, accionesAR, dolarVenta]);

  const currentPriceARS = useMemo(() => {
    if (!pos) return 0;
    if (pos.tipo === 'accion' && accionesAR) {
      const q = accionesAR.find(a => a.simbolo === pos.activo_simbolo);
      return q ? q.ultimo : 0;
    }
    if (pos.tipo === 'cedear' && cedears) {
      const q = cedears.find(c => c.simbolo === pos.activo_simbolo);
      return q ? q.ultimo : 0;
    }
    return currentPrice * (dolarVenta || 1);
  }, [pos, accionesAR, cedears, currentPrice, dolarVenta]);

  const chartData = useMemo(() => {
    if (!history) return [];
    
    // Crypto history format: [[ts, price], ...]
    if (pos?.tipo === 'crypto' && Array.isArray(history) && history.length > 0 && Array.isArray(history[0])) {
      return history.map(([ts, price]) => ({
        date: new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        price
      }));
    }
    
    // Accion AR history format: [{fecha, cierre, ...}, ...]
    if (pos?.tipo === 'accion' && Array.isArray(history)) {
      return history.map(h => ({
        date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        price: h.cierre || h.ultimo || 0
      }));
    }

    return [];
  }, [history, pos]);

  const handleDelete = async () => {
    const ok = await confirm('¿Estás seguro de eliminar esta posición?');
    if (!ok) return;
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) return toast.error('Error al eliminar');
    toast.success('Posición eliminada');
    navigate('/inversiones');
  };

  if (loadingPos) return <Skeleton height="500px" />;
  if (!pos) return <div>No se encontró la inversión.</div>;

  const isARType = pos.tipo === 'accion' || pos.tipo === 'cedear';
  const valorActualUSD = pos.cantidad * currentPrice;
  const valorActualARS = pos.cantidad * currentPriceARS;
  const invertidoUSD = pos.moneda_compra === 'USD' ? (pos.cantidad * pos.precio_compra) : (pos.cantidad * pos.precio_compra / dolarVenta);
  const ROI = invertidoUSD > 0 ? ((valorActualUSD - invertidoUSD) / invertidoUSD) * 100 : 0;
  const isProfit = ROI >= 0;

  const typeBadges = {
    crypto: { label: 'Crypto', color: '#F7931A' },
    cedear: { label: 'CEDEAR', color: '#4CAF50' },
    accion: { label: 'Acción AR · BYMA', color: '#00ADEF' },
  };
  const badge = typeBadges[pos.tipo] || typeBadges.crypto;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/inversiones')} className="btn-icon" style={{ backgroundColor: 'var(--color-surface-2)' }}><ArrowLeft size={20} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           {pos.imagen_url && <img src={pos.imagen_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />}
           <div>
              <h1 style={{ fontWeight: 600, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {pos.activo_nombre} ({pos.activo_simbolo})
                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 500, backgroundColor: `${badge.color}20`, color: badge.color }}>{badge.label}</span>
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Posición de tipo {pos.tipo}
                {pos.sector && <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: '4px' }}>· {pos.sector}</span>}
              </p>
           </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Chart Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <h3 style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <TrendingUp size={20} color="var(--color-gold)" /> 
                 Evolución de Precio {isARType ? '(ARS)' : '(USD)'}
               </h3>
               <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '8px' }}>
                 {[30, 90, 365].map(d => (
                   <button key={d} onClick={() => setDays(d)} style={{
                     padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                     backgroundColor: days === d ? 'var(--color-surface)' : 'transparent',
                     color: days === d ? 'var(--color-gold)' : 'var(--color-text-muted)',
                     fontWeight: days === d ? 600 : 500
                   }}>{d}d</button>
                 ))}
               </div>
            </div>

            <div style={{ height: '300px' }}>
              {loadingHistory ? <Skeleton height="100%" /> : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-gold)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      formatter={(v) => isARType ? formatARS(v) : formatUSD(v)}
                    />
                    <Area type="monotone" dataKey="price" stroke="var(--color-gold)" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '8px' }}>
                  <span>Historial no disponible para este activo</span>
                  {isARType && currentPriceARS > 0 && (
                    <span style={{ fontSize: '0.85rem' }}>Último precio: {formatARS(currentPriceARS)}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compras / Historial */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Clock size={20} color="var(--color-gold)" /> Historial de Compras
               </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--color-text-muted)' }}>Fecha</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--color-text-muted)' }}>Cantidad</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--color-text-muted)' }}>Precio Unitario</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--color-text-muted)' }}>Total Invertido</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.investment_purchases?.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px' }}>{new Date(p.fecha_compra + 'T12:00:00').toLocaleDateString()}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{p.cantidad}{pos.tipo === 'accion' ? ' acc' : ''}</td>
                      <td style={{ padding: '12px' }}>{p.moneda_compra === 'USD' ? formatUSD(p.precio_compra) : formatARS(p.precio_compra)}</td>
                      <td style={{ padding: '12px' }}>{p.moneda_compra === 'USD' ? formatUSD(p.cantidad * p.precio_compra) : formatARS(p.cantidad * p.precio_compra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px', borderTop: `2px solid ${isProfit ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
             <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>RENDIMIENTO</h3>
             <div style={{ fontSize: '2rem', fontWeight: 700, color: isProfit ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {isProfit ? '+' : ''}{ROI.toFixed(2)}%
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                   <span style={{ color: 'var(--color-text-muted)' }}>Valor Actual:</span>
                   <div style={{ textAlign: 'right' }}>
                     <span style={{ fontWeight: 600 }}>{formatUSD(valorActualUSD)}</span>
                     {isARType && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatARS(valorActualARS)}</div>}
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                   <span style={{ color: 'var(--color-text-muted)' }}>Costo de Compra:</span>
                   <span style={{ fontWeight: 600 }}>{formatUSD(invertidoUSD)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                   <span style={{ color: 'var(--color-text-muted)' }}>Ganancia Neta:</span>
                   <span style={{ fontWeight: 700, color: isProfit ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {isProfit ? '+' : '-'}{formatUSD(Math.abs(valorActualUSD - invertidoUSD))}
                   </span>
                </div>
                {isARType && dolarVenta > 0 && (
                  <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>💱 Equivalente en USD</div>
                    <div style={{ fontWeight: 600 }}>
                      {formatUSD(valorActualUSD)} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(al dólar: {formatARS(dolarVenta)})</span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <button onClick={() => setAlertModalOpen(true)} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}>
                <Bell size={20} /> Crear Alerta de Precio
             </button>

             <button onClick={handleDelete} className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', backgroundColor: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                <Trash2 size={20} /> Eliminar Posición
             </button>
          </div>

          <div className="card" style={{ padding: '20px', backgroundColor: 'var(--color-surface-2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)' }}>
                <Info size={20} />
                <span style={{ fontSize: '0.8rem' }}>
                  {pos.tipo === 'accion' 
                    ? 'Cotización en ARS vía BYMA. Se actualiza cada 5 minutos en horario de mercado.' 
                    : 'Las cotizaciones se actualizan cada 3 minutos automáticamente. En CEDEARs usamos el MEP implícito.'
                  }
                </span>
             </div>
          </div>
        </div>
      </div>
      
      <AlertModal 
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        asset={pos}
        currentPrice={isARType ? currentPriceARS : currentPrice}
      />
    </div>
  );
}
