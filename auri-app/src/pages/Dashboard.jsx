import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import useDolarRate from '../hooks/useDolarBlue';
import { useCountUp } from '../hooks/useCountUp';
import { formatARS, formatUSD } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import RecurrentesWidget from '../components/recurrentes/RecurrentesWidget';
import GastosPorCategoria from '../components/dashboard/GastosPorCategoria';
import ComparativaMensual from '../components/dashboard/ComparativaMensual';
import ProyeccionSaldo from '../components/dashboard/ProyeccionSaldo';
import MetasWidget from '../components/dashboard/MetasWidget';
import InversionesWidget from '../components/dashboard/InversionesWidget';

import { Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ArrowRight, LayoutDashboard } from 'lucide-react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Componente para animar y mostrar una métrica del dashboard.
 */
function DashboardCard({ title, value, sub, sub2, color, loading, isCurrency = true }) {
  const animatedValue = useCountUp(value || 0);
  const formattedValue = isCurrency ? formatARS(animatedValue) : animatedValue;

  return (
    <div className="card" style={{ padding: '20px', borderTop: `2px solid ${color}` }}>
      <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 500 }}>{title}</h3>
      {loading ? (
        <Skeleton height="32px" width="140px" />
      ) : (
        <>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: title.includes('Saldo') ? color : undefined }}>
            {formattedValue}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {sub}
          </div>
          {sub2 && (
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: title.includes('Egresos') ? 'rgba(52,152,219,0.9)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {title.includes('Egresos') && sub2.includes('auto') && '🤖 '}{sub2}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const tipoCambioPref = profile?.tipo_cambio_pref || 'oficial';
  const { venta: dolarVenta } = useDolarRate(tipoCambioPref);

  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth());
  const [anioActual, setAnioActual] = useState(hoy.getFullYear());
  const [primerTxFecha, setPrimerTxFecha] = useState(null);

  // SWR para resúmenes mensuales via RPC
  const { data: summary, isLoading: loadingSummary, mutate: mutateSummary } = useSWR(
    user ? ['dashboard-summary', user.id, anioActual, mesActual + 1] : null,
    async ([, userId, year, month]) => {
      const { data, error } = await supabase.rpc('get_monthly_summary', { p_user_id: userId, p_year: year, p_month: month });
      if (error) throw error;
      return data;
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // SWR para las últimas transacciones (vía table query)
  const { data: allTransactions, isLoading: loadingTransactions } = useSWR(
    user ? ['dashboard-transactions', user.id, anioActual, mesActual] : null,
    async ([, userId, year, month]) => {
      const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endOfMonth = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(nombre, color), accounts!transactions_account_id_fkey(nombre)')
        .eq('user_id', userId)
        .lte('fecha', endOfMonth)
        .order('fecha', { ascending: false });

      if (error) throw error;

      // Enriquecer con monto_ars para gráficos
      const dv = dolarVenta || 1;
      return data.map(tx => ({
        ...tx,
        monto_ars: tx.moneda === 'USD' ? tx.monto * (tx.tipo_cambio || dv) : tx.monto,
        category_name: tx.categories?.nombre || '—',
        category_color: tx.categories?.color || 'var(--color-text-muted)',
        account_name: tx.accounts?.nombre || '—',
      }));
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Cálculo de Saldo Total (basado en cuentas + todas las transacciones hasta la fecha)
  const [saldoTotal, setSaldoTotal] = useState({ ars: 0, usd: 0 });
  const [lastTxns, setLastTxns] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [recurrentes, setRecurrentes] = useState([]);

  useEffect(() => {
    const calcTotals = async () => {
      if (!user) return;
      
      const endOfMonth = new Date(anioActual, mesActual + 1, 0).toISOString().slice(0, 10);
      const limiteCalculoSaldo = (anioActual === hoy.getFullYear() && mesActual === hoy.getMonth()) 
        ? hoy.toISOString().slice(0, 10) 
        : endOfMonth;

      const { data: accounts } = await supabase.from('accounts').select('id, saldo_inicial, moneda').eq('user_id', user.id);
      const { data: txns } = await supabase.from('transactions').select('account_id, account_destino_id, tipo, monto, moneda, fecha').eq('user_id', user.id).lte('fecha', limiteCalculoSaldo);
      
      if (accounts) {
        setHasData(accounts.length > 0 || (txns && txns.length > 0));
        const bals = {};
        for (const acc of accounts) bals[acc.id] = { balance: acc.saldo_inicial || 0, moneda: acc.moneda };
        txns?.forEach(tx => {
          if (tx.tipo === 'ingreso') { if (bals[tx.account_id]) bals[tx.account_id].balance += Number(tx.monto); }
          else if (tx.tipo === 'egreso') { if (bals[tx.account_id]) bals[tx.account_id].balance -= Number(tx.monto); }
          else if (tx.tipo === 'transferencia') {
            if (bals[tx.account_id]) bals[tx.account_id].balance -= Number(tx.monto);
            if (tx.account_destino_id && bals[tx.account_destino_id]) bals[tx.account_destino_id].balance += Number(tx.monto);
          }
        });

        const dv = dolarVenta || 1;
        let totalARS = 0, totalUSD = 0;
        for (const acc of Object.values(bals)) {
          if (acc.moneda === 'ARS') { totalARS += acc.balance; totalUSD += acc.balance / dv; }
          else { totalUSD += acc.balance; totalARS += acc.balance * dv; }
        }
        setSaldoTotal({ ars: totalARS, usd: totalUSD });

        // Get limits for Month Selector
        if (!primerTxFecha) {
          const { data: px } = await supabase.from('transactions').select('fecha').eq('user_id', user.id).order('fecha', { ascending: true }).limit(1);
          setPrimerTxFecha(px?.[0] ? new Date(px[0].fecha + 'T12:00:00') : new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        }
        
        // Recurrentes (SWR could be used here too but a simple fetch is fine for now)
        const { data: recs } = await supabase.from('recurring_expenses').select('*').eq('user_id', user.id);
        setRecurrentes(recs || []);
      }
    };
    calcTotals();
  }, [user, anioActual, mesActual, dolarVenta]);

  useEffect(() => {
    if (allTransactions) {
      const endOfMonth = new Date(anioActual, mesActual + 1, 0).toISOString().slice(0, 10);
      setLastTxns(allTransactions.filter(t => t.fecha <= endOfMonth).slice(0, 5));
    }
  }, [allTransactions, mesActual, anioActual]);

  const changeMonth = (delta) => {
    let m = mesActual + delta; let y = anioActual;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    
    // Limits
    if (delta < 0 && primerTxFecha && (y < primerTxFecha.getFullYear() || (y === primerTxFecha.getFullYear() && m < primerTxFecha.getMonth()))) return;
    const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 1);
    if (delta > 0 && (y > maxDate.getFullYear() || (y === maxDate.getFullYear() && m > maxDate.getMonth()))) return;
    
    setMesActual(m); setAnioActual(y);
  };

  const hour = new Date().getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
  else if (hour >= 20 || hour < 6) greeting = 'Buenas noches';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>
            {greeting}, {profile?.nombre?.split(' ')[0] || 'Usuario'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Acá tenés un resumen de tus finanzas.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px', padding: '4px', border: '1px solid var(--color-border)' }}>
          <button onClick={() => changeMonth(-1)} className="btn-icon"><ChevronLeft size={20} /></button>
          <div style={{ padding: '0 16px', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>{MESES[mesActual]} {anioActual}</div>
          <button onClick={() => changeMonth(1)} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
      </header>

      {!hasData && !loadingSummary ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', backgroundColor: 'var(--color-surface-2)', borderStyle: 'dashed', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--color-gold)' }}>
            <LayoutDashboard size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>¡Bienvenido a Auri! ✦</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
            Empezá a tomar el control de tu dinero. Creá tu primera cuenta o registrá un movimiento para ver la magia de los gráficos.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/cuentas')}>+ Crear Cuenta</button>
            <button className="btn btn-secondary" onClick={() => navigate('/transacciones')}>Registrar primer movimiento</button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <DashboardCard title="💰 Saldo Total" value={saldoTotal.ars} sub={formatUSD(saldoTotal.usd)} color="var(--color-gold)" loading={loadingSummary} />
            <DashboardCard title="📈 Ingresos del Mes" value={summary?.ingresos} sub2={`${summary?.count_ingresos || 0} transacciones`} color="var(--color-success)" loading={loadingSummary} />
            <DashboardCard title="📉 Egresos del Mes" value={summary?.egresos} sub2={`${summary?.count_egresos || 0} txs ${summary?.automaticos > 0 ? `· ${formatARS(summary.automaticos)} auto` : ''}`} color="var(--color-danger)" loading={loadingSummary} />
            <DashboardCard title="⚖️ Balance del Mes" value={summary ? (summary.ingresos - summary.egresos) : 0} sub={summary?.ingresos >= summary?.egresos ? '✅ Superávit' : '🔴 Déficit'} color={summary?.ingresos >= summary?.egresos ? 'var(--color-success)' : 'var(--color-danger)'} loading={loadingSummary} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1.25fr)', gap: '24px' }}>
            <GastosPorCategoria transacciones={allTransactions || []} loading={loadingTransactions} />
            <ComparativaMensual transacciones={allTransactions || []} mesSeleccionado={mesActual} anioSeleccionado={anioActual} />
          </div>

          <ProyeccionSaldo 
            transacciones={allTransactions || []} 
            recurrentes={recurrentes}
            saldoInicialMes={saldoTotal.ars - (summary?.ingresos || 0) + (summary?.egresos || 0)}
            mesSeleccionado={mesActual}
            anioSeleccionado={anioActual}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <RecurrentesWidget />
            <InversionesWidget />
            <MetasWidget />

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>🕐 Últimos Movimientos</h2>
                <button className="btn-icon" onClick={() => navigate('/transacciones')}><ArrowRight size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lastTxns.map(tx => (
                  <div key={tx.id} onClick={() => navigate('/transacciones')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${tx.category_color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tx.tipo === 'ingreso' ? <ArrowUpRight size={16} color="var(--color-success)" /> : <ArrowDownLeft size={16} color="var(--color-danger)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{tx.descripcion || 'Sin descripción'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.category_name} · {new Date(tx.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: tx.tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.9rem' }}>{tx.tipo === 'ingreso' ? '+' : '-'}{formatARS(tx.monto)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.account_name}</div>
                    </div>
                  </div>
                ))}
                {lastTxns.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No hay movimientos recientes.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
