import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { formatARS } from '../../utils/currency';

const RADIAN = Math.PI / 180;

/**
 * Donut chart que muestra gastos (o ingresos) por categoría.
 * Click en segmento navega a /transacciones?categoria=X
 */
export default function GastosPorCategoria({ transacciones = [], loading }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('egreso');
  const [activeIndex, setActiveIndex] = useState(-1);

  // Agrupar por categoría
  const filtered = transacciones.filter(t => t.tipo === tab);
  const grouped = {};
  for (const tx of filtered) {
    const catId = tx.category_id || 'sin-cat';
    if (!grouped[catId]) {
      grouped[catId] = {
        id: catId,
        name: tx.category_name || 'Sin categoría',
        color: tx.category_color || '#666',
        value: 0,
      };
    }
    grouped[catId].value += Number(tx.monto_ars || tx.monto);
  }

  const data = Object.values(grouped)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const total = data.reduce((s, d) => s + d.value, 0);

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
          {d.name}
        </div>
        <div style={{ color: 'var(--color-text-muted)' }}>{formatARS(d.value)} — {pct}%</div>
      </div>
    );
  };

  const tabs = [
    { value: 'egreso', label: 'Egresos' },
    { value: 'ingreso', label: 'Ingresos' },
  ];

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Header + tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>
          {tab === 'egreso' ? '📊 Gastos' : '📊 Ingresos'} por Categoría
        </h3>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px', padding: '3px' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => { setTab(t.value); setActiveIndex(-1); }} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s',
              backgroundColor: tab === t.value ? 'var(--color-gold)' : 'transparent',
              color: tab === t.value ? '#000' : 'var(--color-text-muted)',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
          <p>Sin transacciones este mes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Donut */}
          <div style={{ width: '220px', height: '220px', position: 'relative', flexShrink: 0, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={(entry) => navigate(`/transacciones?tipo=${tab}&categoria=${entry.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatARS(total)}</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map((d, i) => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
              return (
                <div key={d.id}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={() => navigate(`/transacciones?tipo=${tab}&categoria=${d.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                    backgroundColor: activeIndex === i ? 'var(--color-surface-2)' : 'transparent',
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{pct}%</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>{formatARS(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
