import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { formatARS } from '../../utils/currency';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Formatea montos grandes: $100K, $1.5M
 */
function formatAbrev(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

/**
 * Bar chart comparativo de ingresos vs egresos — últimos 6 meses.
 * El mes seleccionado se resalta con borde dorado.
 */
export default function ComparativaMensual({ transacciones = [], mesSeleccionado, anioSeleccionado }) {
  // Generar los 6 meses: 5 anteriores + el seleccionado
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anioSeleccionado, mesSeleccionado - i, 1);
    meses.push({ mes: d.getMonth(), anio: d.getFullYear(), label: MESES_CORTOS[d.getMonth()] });
  }

  // Agrupar transacciones por mes
  const data = meses.map(m => {
    let ingresos = 0, egresos = 0;
    for (const tx of transacciones) {
      if (tx.tipo === 'transferencia') continue;
      const txDate = new Date(tx.fecha + 'T12:00:00');
      if (txDate.getMonth() === m.mes && txDate.getFullYear() === m.anio) {
        const monto = Number(tx.monto_ars || tx.monto);
        if (tx.tipo === 'ingreso') ingresos += monto;
        if (tx.tipo === 'egreso') egresos += monto;
      }
    }
    const isSelected = m.mes === mesSeleccionado && m.anio === anioSeleccionado;
    return { name: m.label, ingresos, egresos, balance: ingresos - egresos, isSelected };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--color-success)' }}>Ingresos: {formatARS(d.ingresos)}</span>
          <span style={{ color: 'var(--color-danger)' }}>Egresos: {formatARS(d.egresos)}</span>
          <span style={{ color: d.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600, borderTop: '1px solid var(--color-border)', paddingTop: '4px', marginTop: '2px' }}>
            Balance: {d.balance >= 0 ? '+' : ''}{formatARS(d.balance)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '20px' }}>📊 Ingresos vs Egresos — 6 meses</h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAbrev} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell key={`ing-${i}`} fill={d.isSelected ? '#2ecc71' : 'rgba(46, 204, 113, 0.6)'} stroke={d.isSelected ? 'var(--color-gold)' : 'none'} strokeWidth={d.isSelected ? 2 : 0} />
            ))}
          </Bar>
          <Bar dataKey="egresos" fill="var(--color-danger)" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell key={`eg-${i}`} fill={d.isSelected ? '#e74c3c' : 'rgba(231, 76, 60, 0.6)'} stroke={d.isSelected ? 'var(--color-gold)' : 'none'} strokeWidth={d.isSelected ? 2 : 0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
