import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import useDolarRate from '../../hooks/useDolarBlue';
import { calcProximaEjecucion } from '../../utils/recurrentes';
import { formatARS, formatUSD } from '../../utils/currency';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Skeleton from '../ui/Skeleton';

/**
 * Widget para el Dashboard que muestra los gastos recurrentes activos
 * de los próximos 7 días, agrupados por día (HOY / MAÑANA / fecha corta).
 * Calcula un total estimado sumando en ARS (convirtiendo USD al tipo de cambio actual).
 */
export default function RecurrentesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { venta: dolarVenta } = useDolarRate('oficial');
  const [grupos, setGrupos] = useState([]); // [{ label, fecha, items }]
  const [totalARS, setTotalARS] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('recurring_expenses')
        .select('id, nombre, monto_estimado, moneda, frecuencia, dia_ejecucion, dia_semana, mes_ejecucion, ultima_ejecucion, categories(nombre, color, icono), accounts!recurring_expenses_account_id_fkey(nombre)')
        .eq('user_id', user.id)
        .eq('activo', true);

      if (!data) { setLoading(false); return; }

      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const en7Dias = new Date(hoy); en7Dias.setDate(hoy.getDate() + 7);
      const dv = dolarVenta || 1;

      // Calcular próximas ejecuciones y filtrar las que caen en los próximos 7 días
      const candidatos = [];
      for (const r of data) {
        const proxima = calcProximaEjecucion(r);
        if (!proxima) continue;
        proxima.setHours(0, 0, 0, 0);
        if (proxima > en7Dias) continue; // fuera del rango de 7 días

        // Si ya se ejecutó hoy (ultima_ejecucion = hoy), no mostrar
        if (r.ultima_ejecucion) {
          const ultima = new Date(r.ultima_ejecucion + 'T12:00:00');
          ultima.setHours(0, 0, 0, 0);
          if (ultima.getTime() === proxima.getTime()) continue;
        }

        candidatos.push({ ...r, _proxima: proxima });
      }

      // Ordenar por fecha
      candidatos.sort((a, b) => a._proxima - b._proxima);

      // Agrupar por día
      const groupMap = {};
      let total = 0;
      for (const r of candidatos) {
        const dateKey = r._proxima.toISOString().slice(0, 10);
        if (!groupMap[dateKey]) {
          const diff = Math.round((r._proxima - hoy) / (1000 * 60 * 60 * 24));
          let label;
          if (diff === 0) label = 'HOY';
          else if (diff === 1) label = 'MAÑANA';
          else {
            label = r._proxima.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
          }
          groupMap[dateKey] = { label, fecha: r._proxima, items: [] };
        }
        groupMap[dateKey].items.push(r);

        // Sumar al total en ARS
        const monto = parseFloat(r.monto_estimado) || 0;
        total += r.moneda === 'USD' ? monto * dv : monto;
      }

      setGrupos(Object.values(groupMap));
      setTotalARS(total);
      setLoading(false);
    };
    fetch();
  }, [user?.id, dolarVenta]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <Skeleton height="24px" width="240px" style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton height="44px" /><Skeleton height="44px" /><Skeleton height="44px" />
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={18} style={{ color: 'var(--color-gold)' }} />
          Próximos gastos automáticos — 7 días
        </h3>
        <button
          onClick={() => navigate('/recurrentes')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
        >
          Ver todos <ArrowRight size={14} />
        </button>
      </div>

      {grupos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-muted)' }}>
          <CalendarDays size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>No hay gastos automáticos para esta semana.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/recurrentes')} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
            ¡Agregá uno!
          </button>
        </div>
      ) : (
        <>
          {/* Grupos por día */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {grupos.map(grupo => (
              <div key={grupo.label + grupo.fecha}>
                {/* Label del día */}
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: grupo.label === 'HOY' ? 'var(--color-danger)' : 'var(--color-text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                  {grupo.label}
                </div>
                {/* Items del día */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {grupo.items.map(r => {
                    const fmt = r.moneda === 'ARS' ? formatARS : formatUSD;
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: `${r.categories?.color || '#666'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
                          {r.categories?.icono || '📋'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {r.categories?.nombre} · {r.accounts?.nombre || '—'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-danger)', flexShrink: 0 }}>
                          -{r.moneda === 'USD' ? 'U$S ' : ''}{fmt(r.monto_estimado)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Total estimado */}
          {totalARS > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Total estimado próximos 7 días:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '1rem' }}>-{formatARS(totalARS)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
