import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import useDolarRate from '../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const tipoCambioPref = profile?.tipo_cambio_pref || 'blue';
  const { venta: dolarVenta, loading: dolarLoading } = useDolarRate(tipoCambioPref);

  const [loading, setLoading] = useState(true);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [saldoTotalUSD, setSaldoTotalUSD] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [egresosMes, setEgresosMes] = useState(0);
  const [ingresosMesAnt, setIngresosMesAnt] = useState(0);
  const [egresosMesAnt, setEgresosMesAnt] = useState(0);
  const [lastTxns, setLastTxns] = useState([]);
  const [hasData, setHasData] = useState(false);

  const hour = new Date().getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
  else if (hour >= 20 || hour < 6) greeting = 'Buenas noches';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = prevMonth.toISOString().slice(0, 10);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

    // Fetch all accounts for balance calculation
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, saldo_inicial, moneda')
      .eq('user_id', user.id);

    // Fetch all transactions for balance + monthly summaries
    const { data: allTxns } = await supabase
      .from('transactions')
      .select('account_id, account_destino_id, tipo, monto, moneda, tipo_cambio, fecha')
      .eq('user_id', user.id);

    if (accounts && allTxns) {
      setHasData(allTxns.length > 0 || accounts.length > 0);

      // Calculate per-account balances
      const bals = {};
      for (const acc of accounts) {
        bals[acc.id] = { balance: acc.saldo_inicial || 0, moneda: acc.moneda };
      }
      for (const tx of allTxns) {
        if (tx.tipo === 'ingreso') {
          if (bals[tx.account_id]) bals[tx.account_id].balance += Number(tx.monto);
        } else if (tx.tipo === 'egreso') {
          if (bals[tx.account_id]) bals[tx.account_id].balance -= Number(tx.monto);
        } else if (tx.tipo === 'transferencia') {
          if (bals[tx.account_id]) bals[tx.account_id].balance -= Number(tx.monto);
          if (tx.account_destino_id && bals[tx.account_destino_id]) {
            bals[tx.account_destino_id].balance += Number(tx.monto);
          }
        }
      }

      // Total balances
      const dv = dolarVenta || 1;
      let totalARS = 0;
      let totalUSD = 0;
      for (const acc of Object.values(bals)) {
        if (acc.moneda === 'ARS') {
          totalARS += acc.balance;
          totalUSD += acc.balance / dv;
        } else {
          totalUSD += acc.balance;
          totalARS += acc.balance * dv;
        }
      }
      setSaldoTotal(totalARS);
      setSaldoTotalUSD(totalUSD);

      // Monthly summaries (exclude transferencias)
      let ingMes = 0, egMes = 0, ingPrev = 0, egPrev = 0;
      for (const tx of allTxns) {
        if (tx.tipo === 'transferencia') continue;
        const txDate = tx.fecha.slice(0, 10);
        let montoARS = Number(tx.monto);
        if (tx.moneda === 'USD') {
          montoARS = montoARS * (Number(tx.tipo_cambio) || dv);
        }

        if (txDate >= startOfMonth) {
          if (tx.tipo === 'ingreso') ingMes += montoARS;
          if (tx.tipo === 'egreso') egMes += montoARS;
        }
        if (txDate >= startOfPrevMonth && txDate <= endOfPrevMonth) {
          if (tx.tipo === 'ingreso') ingPrev += montoARS;
          if (tx.tipo === 'egreso') egPrev += montoARS;
        }
      }
      setIngresosMes(ingMes);
      setEgresosMes(egMes);
      setIngresosMesAnt(ingPrev);
      setEgresosMesAnt(egPrev);
    }

    // Last 5 transactions
    const { data: recentTxns } = await supabase
      .from('transactions')
      .select('*, categories(nombre, color), accounts!transactions_account_id_fkey(nombre)')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(5);

    setLastTxns((recentTxns || []).map(tx => ({
      ...tx,
      category_name: tx.categories?.nombre || '—',
      category_color: tx.categories?.color || 'var(--color-text-muted)',
      account_name: tx.accounts?.nombre || '—',
    })));

    setLoading(false);
  }, [user.id, dolarVenta]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const balance = ingresosMes - egresosMes;
  const ingPct = ingresosMesAnt > 0 ? Math.round(((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100) : null;
  const egPct = egresosMesAnt > 0 ? Math.round(((egresosMes - egresosMesAnt) / egresosMesAnt) * 100) : null;

  const cards = [
    {
      title: '💰 Saldo Total',
      value: loading ? null : formatARS(saldoTotal),
      sub: loading ? null : formatUSD(saldoTotalUSD),
      color: 'var(--color-gold)',
    },
    {
      title: '📈 Ingresos del Mes',
      value: loading ? null : `+${formatARS(ingresosMes)}`,
      sub: ingPct !== null ? `${ingPct >= 0 ? '↑' : '↓'} ${Math.abs(ingPct)}% vs anterior` : 'Sin datos previos',
      color: 'var(--color-success)',
    },
    {
      title: '📉 Egresos del Mes',
      value: loading ? null : `-${formatARS(egresosMes)}`,
      sub: egPct !== null ? `${egPct >= 0 ? '↑' : '↓'} ${Math.abs(egPct)}% vs anterior` : 'Sin datos previos',
      color: 'var(--color-danger)',
    },
    {
      title: '⚖️ Balance del Mes',
      value: loading ? null : `${balance >= 0 ? '+' : ''}${formatARS(balance)}`,
      sub: balance >= 0 ? '✅ Positivo' : '⚠️ Negativo',
      color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>
          {greeting}, {profile?.nombre?.split(' ')[0] || 'Usuario'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Acá tenés un resumen de tus finanzas.</p>
      </header>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {cards.map((card, i) => (
          <div key={i} className="card" style={{ padding: '20px', borderTop: `2px solid ${card.color}` }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 500 }}>{card.title}</h3>
            {card.value === null ? (
              <Skeleton height="32px" width="140px" />
            ) : (
              <>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: i === 0 ? card.color : undefined }}>
                  {card.value}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {card.sub}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Last 5 Transactions or Empty State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="48px" />
          <Skeleton height="48px" />
          <Skeleton height="48px" />
        </div>
      ) : !hasData ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', backgroundColor: 'var(--color-surface-2)', borderStyle: 'dashed', textAlign: 'center', marginTop: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--color-gold)' }}>
            <Plus size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Todavía no hay datos</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
            Empezá creando tus cuentas o registrando tu primera transacción para ver estadísticas reales.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/cuentas')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Crear Cuenta
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/transacciones')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Nueva Transacción
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Últimos Movimientos</h2>
            <button onClick={() => navigate('/transacciones')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
              Ver todas <ArrowRight size={16} />
            </button>
          </div>

          {lastTxns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
              No hay movimientos recientes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lastTxns.map(tx => {
                let TxIcon = ArrowDownLeft;
                let txColor = 'var(--color-danger)';
                let prefix = '-';
                if (tx.tipo === 'ingreso') { TxIcon = ArrowUpRight; txColor = 'var(--color-success)'; prefix = '+'; }
                else if (tx.tipo === 'transferencia') { TxIcon = ArrowLeftRight; txColor = 'var(--color-text-muted)'; prefix = '⇄'; }
                const fmt = tx.moneda === 'ARS' ? formatARS : formatUSD;

                return (
                  <div key={tx.id} className="card" onClick={() => navigate('/transacciones')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${tx.category_color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TxIcon size={18} color={txColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {tx.category_name} · {new Date(tx.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, color: txColor }}>{prefix} {fmt(Number(tx.monto))}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.account_name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
