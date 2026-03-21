import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatARS } from '../../utils/currency';

/**
 * Area chart de proyección de saldo: parte real (verde) + parte proyectada (dorada).
 * Línea vertical en "hoy" separando ambas zonas.
 */
export default function ProyeccionSaldo({ transacciones = [], recurrentes = [], saldoInicialMes, mesSeleccionado, anioSeleccionado }) {
  const hoy = new Date();
  const hoyDia = hoy.getDate();
  const hoyMes = hoy.getMonth();
  const hoyAnio = hoy.getFullYear();
  const esMesActual = mesSeleccionado === hoyMes && anioSeleccionado === hoyAnio;
  const esMesPasado = new Date(anioSeleccionado, mesSeleccionado + 1, 0) < new Date(hoyAnio, hoyMes, hoyDia);

  const diasDelMes = new Date(anioSeleccionado, mesSeleccionado + 1, 0).getDate();
  const limiteDiaReal = esMesActual ? hoyDia : (esMesPasado ? diasDelMes : 0);

  // Indexar transacciones del mes por día
  const txPorDia = {};
  for (const tx of transacciones) {
    if (tx.tipo === 'transferencia') continue;
    const txDate = new Date(tx.fecha + 'T12:00:00');
    if (txDate.getMonth() !== mesSeleccionado || txDate.getFullYear() !== anioSeleccionado) continue;
    const dia = txDate.getDate();
    if (!txPorDia[dia]) txPorDia[dia] = [];
    txPorDia[dia].push(tx);
  }

  // Indexar recurrentes por día de ejecución (solo mensuales activos)
  const recPorDia = {};
  for (const r of recurrentes) {
    if (!r.activo || r.frecuencia !== 'mensual') continue;
    const dia = Math.min(r.dia_ejecucion || 1, diasDelMes);
    if (!recPorDia[dia]) recPorDia[dia] = [];
    recPorDia[dia].push(r);
  }

  const puntos = [];
  let saldo = saldoInicialMes || 0;

  // Parte real
  for (let dia = 1; dia <= limiteDiaReal; dia++) {
    const txsDia = txPorDia[dia] || [];
    for (const tx of txsDia) {
      const monto = Number(tx.monto_ars || tx.monto);
      if (tx.tipo === 'ingreso') saldo += monto;
      if (tx.tipo === 'egreso') saldo -= monto;
    }
    puntos.push({ dia, saldoReal: Math.round(saldo), saldoProyectado: null });
  }

  // Parte proyectada
  if (!esMesPasado) {
    let saldoProyectado = saldo;
    const diaInicio = limiteDiaReal + 1;

    // Punto de unión (el último real también aparece como el primero proyectado)
    if (limiteDiaReal > 0 && puntos.length > 0) {
      puntos[puntos.length - 1].saldoProyectado = puntos[puntos.length - 1].saldoReal;
    }

    for (let dia = diaInicio; dia <= diasDelMes; dia++) {
      const recs = recPorDia[dia] || [];
      for (const r of recs) {
        saldoProyectado -= Number(r.monto_estimado || 0);
      }
      puntos.push({ dia, saldoReal: null, saldoProyectado: Math.round(saldoProyectado) });
    }
  }

  const saldoCierre = puntos.length > 0 ? (puntos[puntos.length - 1].saldoProyectado ?? puntos[puntos.length - 1].saldoReal) : saldoInicialMes;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const val = d.saldoReal ?? d.saldoProyectado;
    const tipo = d.saldoReal !== null ? 'Real' : 'Proyectado';
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Día {d.dia} — {tipo}</div>
        <div style={{ fontWeight: 700 }}>{formatARS(val)}</div>
      </div>
    );
  };

  function formatAbrev(val) {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    return `${val}`;
  }

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '20px' }}>
        📈 Proyección de Saldo — {esMesPasado ? 'cierre de' : 'cierre de'} {MESES[mesSeleccionado]}
      </h3>

      {puntos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Sin datos para este mes
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={puntos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ecc71" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2ecc71" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradProy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatAbrev} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<CustomTooltip />} />
              {esMesActual && (
                <ReferenceLine x={hoyDia} stroke="var(--color-gold)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Hoy', fill: 'var(--color-gold)', fontSize: 11, position: 'top' }} />
              )}
              <Area type="monotone" dataKey="saldoReal" stroke="#2ecc71" strokeWidth={2} fill="url(#gradReal)" connectNulls={false} dot={false} activeDot={{ r: 4, stroke: '#2ecc71', fill: 'var(--color-surface)' }} />
              <Area type="monotone" dataKey="saldoProyectado" stroke="#c9a84c" strokeWidth={2} strokeDasharray="6 4" fill="url(#gradProy)" connectNulls={false} dot={false} activeDot={{ r: 4, stroke: '#c9a84c', fill: 'var(--color-surface)' }} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Cierre estimado */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {esMesPasado ? 'Cierre del mes:' : 'Proyección cierre de mes:'}
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: saldoCierre >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatARS(saldoCierre)}
            </span>
          </div>

          {/* Leyenda */}
          {!esMesPasado && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                <span style={{ width: '16px', height: '3px', backgroundColor: '#2ecc71', display: 'inline-block', borderRadius: '2px' }} />
                Real
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                <span style={{ width: '16px', height: '3px', backgroundColor: '#c9a84c', display: 'inline-block', borderRadius: '2px', borderTop: '1px dashed #c9a84c' }} />
                Proyectado
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
