import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import useDolarRate from '../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../utils/currency';
import { getCryptoPrices, getCedearQuotes } from '../services/quotesService';
import useInvestmentPrices from '../hooks/useInvestmentPrices';
import { getAssetColor, fetchPortfolioHistory } from '../utils/portfolioCalculations';
import { SECTORES_ACCIONES } from '../data/acciones-argentinas';
import InvestmentModal from '../components/inversiones/InvestmentModal';
import Skeleton from '../components/ui/Skeleton';


import { 
  TrendingUp, Plus, PieChart as PieIcon, LineChart as LineIcon, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, RefreshCw, Layers, DollarSign,
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';


// --- SUB-COMPONENTES ---

function ResumenPortfolio({ resumen, loading }) {
  if (loading) return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}><Skeleton height="100px" /><Skeleton height="100px" /><Skeleton height="100px" /></div>;

  const isPositive = resumen.gananciaTotalUSD >= 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
      <div className="card" style={{ padding: '24px', borderTop: '2px solid var(--color-gold)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>💰 Valor Actual Portfolio</h3>
        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatUSD(resumen.valorActualUSD)}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{formatARS(resumen.valorActualARS)}</div>
      </div>

      <div className="card" style={{ padding: '24px', borderTop: '2px solid var(--color-surface-3)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>💳 Inversión Total</h3>
        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatUSD(resumen.costoTotalUSD)}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{formatARS(resumen.costoTotalARS)}</div>
      </div>

      <div className="card" style={{ padding: '24px', borderTop: `2px solid ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>📊 Ganancia / Pérdida</h3>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {isPositive ? '+' : ''}{formatUSD(resumen.gananciaTotalUSD)}
        </div>
        <div style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600, fontSize: '0.9rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
          {resumen.gananciaPorc.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function Inversiones() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { venta: dolarVenta } = useDolarRate(profile?.tipo_cambio_pref || 'oficial');

  // Fetch accounts for the modal
  const { data: accounts } = useSWR(user ? ['accounts-investments', user.id] : null, async ([, uid]) => {
    const { data } = await supabase.from('accounts').select('*').eq('user_id', uid);
    return data || [];
  });

  
  const [filter, setFilter] = useState('todas'); // 'todas', 'crypto', 'cedear', 'accion'
  const [sectorFilter, setSectorFilter] = useState('todas'); // sector sub-filter for acciones AR
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState(null);

  // 1. Fetch positions from Supabase
  const { data: positions, error, isLoading: loadingPositions, mutate: mutatePositions } = useSWR(
    user ? ['investments', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase
        .from('investments')
        .select('*, investment_purchases(*)')
        .eq('user_id', userId)
        .order('activo_simbolo');
      if (error) throw error;
      return data;
    }
  );

  const { 
    precios: quotes, 
    loading: loadingQuotes, 
    error: quotesError, 
    ultimaActualizacion, 
    refetch 
  } = useInvestmentPrices(positions || [], dolarVenta);

  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);


  // 3. Cálculo de Resultados (Portfolio logic)
  const processedPositions = useMemo(() => {
    if (!positions || !dolarVenta) return [];

    return positions.map(pos => {
      const q = quotes[pos.activo_simbolo];
      let precioActual = 0;
      let var24h = 0;
      let precioActualARS = 0; // precio nativo en ARS para acciones y CEDEARs

      if (q) {
        if (pos.tipo === 'crypto') {
          precioActual = q.precio || (pos.moneda_compra === 'USD' ? pos.precio_compra : pos.precio_compra / dolarVenta);
          precioActualARS = q.precio_ars || (precioActual * dolarVenta);
          var24h = q.variacion24h || 0;
        } else {
          // CEDEARs y Acciones AR: precio nativo en ARS
          precioActualARS = q.precio_ars || (pos.moneda_compra === 'ARS' ? pos.precio_compra : pos.precio_compra * dolarVenta);
          precioActual = q.precio_ars ? q.precio_ars / dolarVenta : (pos.moneda_compra === 'USD' ? pos.precio_compra : pos.precio_compra / dolarVenta);
          var24h = q.variacion24h || 0;
        }
      } else {
        // Fallback al precio de compra original si la API de precios falla
        precioActual = pos.moneda_compra === 'USD' ? pos.precio_compra : (pos.precio_compra / dolarVenta);
        precioActualARS = pos.moneda_compra === 'ARS' ? pos.precio_compra : (pos.precio_compra * dolarVenta);
        var24h = 0;
      }


      const valorActualUSD = pos.cantidad * precioActual;
      const valorActualARS = pos.cantidad * precioActualARS;
      const invertidoUSD = pos.moneda_compra === 'USD' ? (pos.cantidad * pos.precio_compra) : (pos.cantidad * pos.precio_compra / dolarVenta);
      const gananciaUSD = valorActualUSD - invertidoUSD;
      const gananciaPorc = invertidoUSD > 0 ? (gananciaUSD / invertidoUSD) * 100 : 0;

      return {
        ...pos,
        precioActual,
        precioActualARS,
        valorActualUSD,
        valorActualARS,
        invertidoUSD,
        gananciaUSD,
        gananciaPorc,
        var24h
      };
    });
  }, [positions, quotes, dolarVenta]);

  const resumen = useMemo(() => {
    if (!processedPositions.length) return { valorActualUSD: 0, valorActualARS: 0, costoTotalUSD: 0, costoTotalARS: 0, gananciaTotalUSD: 0, gananciaPorc: 0 };

    const totalActualUSD = processedPositions.reduce((acc, pos) => acc + pos.valorActualUSD, 0);
    const totalInvertidoUSD = processedPositions.reduce((acc, pos) => acc + pos.invertidoUSD, 0);
    const gananciaUSD = totalActualUSD - totalInvertidoUSD;
    const gananciaPorc = totalInvertidoUSD > 0 ? (gananciaUSD / totalInvertidoUSD) * 100 : 0;

    return {
      valorActualUSD: totalActualUSD,
      valorActualARS: totalActualUSD * dolarVenta,
      costoTotalUSD: totalInvertidoUSD,
      costoTotalARS: totalInvertidoUSD * dolarVenta,
      gananciaTotalUSD: gananciaUSD,
      gananciaPorc
    };
  }, [processedPositions, dolarVenta]);

  const filteredPositions = useMemo(() => {
    let filtered = processedPositions;
    if (filter !== 'todas') {
      filtered = filtered.filter(p => p.tipo === filter);
    }
    // Sub-filtro por sector (solo para acciones AR)
    if (filter === 'accion' && sectorFilter !== 'todas') {
      filtered = filtered.filter(p => p.sector === sectorFilter);
    }
    return filtered;
  }, [processedPositions, filter, sectorFilter]);

  // Reset sector filter when main filter changes
  useEffect(() => {
    if (filter !== 'accion') setSectorFilter('todas');
  }, [filter]);

  // --- CHARTS DATA ---
  const distributionData = useMemo(() => {
    return processedPositions.map(p => ({
      name: p.activo_simbolo,
      value: p.valorActualUSD,
      color: getAssetColor(p.activo_simbolo, p.tipo)
    })).sort((a, b) => b.value - a.value);
  }, [processedPositions]);

  useEffect(() => {
    if (processedPositions.length > 0) {
      setLoadingHistory(true);
      fetchPortfolioHistory(processedPositions, historyDays)
        .then(data => setHistoricalData(data))
        .finally(() => setLoadingHistory(false));
    }
  }, [processedPositions, historyDays]);

  const freshColor = !ultimaActualizacion ? 'var(--color-text-muted)' 
    : (Date.now() - ultimaActualizacion.getTime() > 300000) ? 'var(--color-warning)' : 'var(--color-success)';


  // Helper to get type badge
  const getTypeBadge = (tipo) => {
    const badges = {
      crypto: { icon: '₿', label: 'Crypto', color: '#F7931A' },
      cedear: { icon: '🌎', label: 'CEDEAR', color: '#4CAF50' },
      accion: { icon: '🇦🇷', label: 'AR', color: '#00ADEF' },
    };
    return badges[tipo] || badges.crypto;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Mi Portfolio</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: freshColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: freshColor }}></div>
              {quotesError ? quotesError : `Precios actualizados ${ultimaActualizacion ? `hace ${Math.floor((Date.now() - ultimaActualizacion.getTime()) / 60000)} min` : 'ahora'}`}
            </span>
            <button onClick={refetch} className="btn-icon" style={{ padding: '4px', height: 'auto', width: 'auto' }} title="Forzar actualización">
              <RefreshCw size={14} className={loadingQuotes ? 'slow-spin' : ''} />
            </button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingPos(null); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Nueva Posición
        </button>
      </header>


      <ResumenPortfolio resumen={resumen} loading={loadingPositions || loadingQuotes} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1.5fr)', gap: '24px' }}>
        {/* Distribución */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieIcon size={18} color="var(--color-gold)" /> Distribución de Asset
          </h3>
          <div style={{ height: '240px' }}>
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(v) => formatUSD(v)} 
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No hay datos</div>
            )}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {distributionData.slice(0, 4).map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></span>
                <span style={{ color: 'var(--color-text-muted)' }}>{d.name}</span>
                <span style={{ fontWeight: 600 }}>{((d.value / resumen.valorActualUSD) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evolución Histórica */}
        <div className="card" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LineIcon size={18} color="var(--color-gold)" /> Rendimiento Total (USD)
             </h3>
             <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-surface-2)', padding: '2px', borderRadius: '8px' }}>
                {[30, 90, 365].map(d => (
                  <button key={d} onClick={() => setHistoryDays(d)} style={{
                    padding: '4px 8px', border: 'none', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                    backgroundColor: historyDays === d ? 'var(--color-surface)' : 'transparent',
                    color: historyDays === d ? 'var(--color-gold)' : 'var(--color-text-muted)',
                    fontWeight: historyDays === d ? 600 : 500
                  }}>{d === 365 ? '1A' : `${d}D`}</button>
                ))}
             </div>
           </div>
          
          <div style={{ height: '240px' }}>
             {loadingHistory ? <Skeleton height="100%" /> : historicalData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={historicalData}>
                   <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="date" hide />
                   <YAxis hide domain={['auto', 'auto']} />
                   <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    formatter={(v) => formatUSD(v)}
                   />
                   <ReferenceLine y={historicalData[0]?.costoUSD} stroke="var(--color-text-muted)" strokeDasharray="3 3" label={{ value: 'Inversión', position: 'insideBottomLeft', fill: 'var(--color-text-muted)', fontSize: 10 }} />
                   <Area 
                    type="monotone" 
                    dataKey="valorUSD" 
                    stroke={historicalData[historicalData.length-1]?.isProfit ? 'var(--color-success)' : 'var(--color-danger)'} 
                    fill={historicalData[historicalData.length-1]?.isProfit ? 'url(#colorProfit)' : 'url(#colorLoss)'} 
                    strokeWidth={2} 
                   />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Sin datos históricos</div>
             )}
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Filtros principales */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'crypto', label: 'Crypto' },
              { key: 'cedear', label: 'CEDEARs' },
              { key: 'accion', label: 'Acciones AR' },
            ].map(t => (
              <button 
                key={t.key}
                onClick={() => setFilter(t.key)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  backgroundColor: filter === t.key ? 'var(--color-surface)' : 'transparent',
                  color: filter === t.key ? 'var(--color-gold)' : 'var(--color-text-muted)',
                  fontWeight: filter === t.key ? 600 : 500, transition: 'all 0.2s', fontSize: '0.85rem'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filtro por sector (solo cuando "Acciones AR" está activo) */}
        {filter === 'accion' && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setSectorFilter('todas')}
              style={{
                padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--color-border)', 
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.2s',
                backgroundColor: sectorFilter === 'todas' ? 'rgba(0,173,239,0.15)' : 'transparent',
                color: sectorFilter === 'todas' ? '#00ADEF' : 'var(--color-text-muted)',
              }}
            >Todos</button>
            {SECTORES_ACCIONES.map(s => (
              <button 
                key={s}
                onClick={() => setSectorFilter(s)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--color-border)', 
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.2s',
                  backgroundColor: sectorFilter === s ? 'rgba(0,173,239,0.15)' : 'transparent',
                  color: sectorFilter === s ? '#00ADEF' : 'var(--color-text-muted)',
                }}
              >{s}</button>
            ))}
          </div>
        )}

        {/* --- TABLA DE POSICIONES --- */}
        <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Activo</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Cantidad</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>P. Compra</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>P. Actual</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Valor Actual</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>G/P</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>24h</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map(pos => {
                const isPosG = pos.gananciaUSD >= 0;
                const isPos24 = pos.var24h >= 0;
                const badge = getTypeBadge(pos.tipo);
                const isARType = pos.tipo === 'accion' || pos.tipo === 'cedear';
                
                const handleDeleteRow = async (e, id, symbol) => {
                  e.stopPropagation();
                  const ok = await confirm(`¿Estás seguro de eliminar la posición de ${symbol}?`);
                  if (!ok) return;
                  
                  try {
                    const { error } = await supabase.from('investments').delete().eq('id', id);
                    if (error) throw error;
                    toast.success(`${symbol} eliminado correctamente`);
                    mutatePositions();
                  } catch (err) {
                    toast.error('Error al eliminar la posición');
                    console.error(err);
                  }
                };
                
                return (
                  <tr key={pos.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/inversiones/${pos.id}`)}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {pos.imagen_url ? (
                          <img src={pos.imagen_url} alt={pos.activo_symbol} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: getAssetColor(pos.activo_simbolo, pos.tipo), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{pos.activo_simbolo?.charAt(0)}</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {pos.activo_simbolo}
                            <span style={{ 
                              fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 500,
                              backgroundColor: `${badge.color}20`, color: badge.color 
                            }}>{badge.label}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {pos.activo_nombre}
                            {pos.tipo === 'accion' && pos.sector && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>· {pos.sector}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.9rem' }}>
                      {pos.tipo === 'accion' ? `${pos.cantidad} acc` : `${pos.cantidad} ${pos.activo_simbolo}`}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.9rem' }}>
                      {isARType ? formatARS(pos.precio_compra) : (pos.moneda_compra === 'USD' ? formatUSD(pos.precio_compra) : formatARS(pos.precio_compra))}
                      {isARType && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'block' }}>ARS</span>}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                      {isARType ? (
                        <div>
                          <div>{formatARS(pos.precioActualARS)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>≈ {formatUSD(pos.precioActual)}</div>
                        </div>
                      ) : (
                        formatUSD(pos.precioActual)
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{formatUSD(pos.valorActualUSD)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {isARType ? formatARS(pos.valorActualARS) : formatARS(pos.valorActualUSD * dolarVenta)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: isPosG ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {isPosG ? '+' : ''}{formatUSD(pos.gananciaUSD)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: isPosG ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {isPosG ? '↑' : '↓'} {pos.gananciaPorc.toFixed(2)}%
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: isPos24 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                        color: isPos24 ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        {isPos24 ? '+' : ''}{pos.var24h?.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                       <button 
                        className="btn-icon" 
                        onClick={(e) => handleDeleteRow(e, pos.id, pos.activo_simbolo)}
                        style={{ color: 'var(--color-danger)', border: 'none', background: 'transparent' }}
                       >
                         <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPositions.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay posiciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <InvestmentModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={() => mutatePositions()}
        accounts={accounts || []}
      />
    </div>
  );
}
