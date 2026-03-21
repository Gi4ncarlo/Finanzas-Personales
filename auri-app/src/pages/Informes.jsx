import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatARS, formatUSD } from '../utils/currency';
import { useCountUp } from '../hooks/useCountUp';
import Skeleton from '../components/ui/Skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line, Legend as ReLegend
} from 'recharts';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, 
  Wallet, Calendar, PieChart as PieIcon, BarChart3, 
  LayoutPanelLeft, GanttChart, List, Tag, Building2
} from 'lucide-react';
import DatePickerModern from '../components/ui/DatePickerModern';


const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Tooltip personalizado para Recharts con formato ARS.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '12px 16px', border: '1px solid var(--color-border)', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-muted)' }}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color || entry.fill, margin: '4px 0', fontWeight: 500 }}>
          {entry.name}: {formatARS(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function Informes() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('summary'); // 'summary' | 'category'| 'account' | 'trends'
  const [periodo, setPeriodo] = useState('esteMes');
  const [viewMode, setViewMode] = useState('bars'); // 'bars' | 'table' para categorías
  const [customRange, setCustomRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10) 
  });

  // Calcular fechas del periodo
  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;
    switch (periodo) {
      case 'esteMes':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mesAnterior':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '3meses':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case '6meses':
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'esteAnio':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'personalizado':
        return { start: customRange.start, end: customRange.end };
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }, [periodo, customRange]);

  // SWR: Resumen General (Ingresos/Egresos/Cuentas)
  const { data: reportData, isLoading: loadingData } = useSWR(
    user ? ['report-data', user.id, dateRange.start, dateRange.end] : null,
    async ([, userId, start, end]) => {
      const startD = new Date(start);
      const [summaryRes, catsRes, accountsRes, historyRes] = await Promise.all([
        supabase.rpc('get_monthly_summary', { p_user_id: userId, p_year: startD.getUTCFullYear(), p_month: startD.getUTCMonth() + 1 }),
        supabase.rpc('get_spending_by_category', { p_user_id: userId, p_inicio: start, p_fin: end }),
        supabase.rpc('get_account_report', { p_user_id: userId, p_inicio: start, p_fin: end }),
        supabase.rpc('get_monthly_history', { p_user_id: userId, p_months: 12 })
      ]);

      return {
        summary: summaryRes.data,
        categories: catsRes.data || [],
        accounts: accountsRes.data || [],
        history: historyRes.data || []
      };
    }
  );

  const stats = useMemo(() => {
    if (!reportData) return { ing: 0, eg: 0, bal: 0, ratio: 0 };
    const ing = reportData.summary?.ingresos || 0;
    const eg = reportData.summary?.egresos || 0;
    return {
      ing,
      eg,
      bal: ing - eg,
      ratio: ing > 0 ? Math.max(0, Math.round(((ing - eg) / ing) * 100)) : 0
    };
  }, [reportData]);

  const animatedIng = useCountUp(stats.ing);
  const animatedEg = useCountUp(stats.eg);
  const animatedBal = useCountUp(stats.bal);

  const tabs = [
    { id: 'summary', label: 'Resumen', icon: <LayoutPanelLeft size={18} /> },
    { id: 'category', label: 'Por Categoría', icon: <Tag size={18} /> },
    { id: 'account', label: 'Por Cuenta', icon: <Wallet size={18} /> },
    { id: 'trends', label: 'Tendencias', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Centro de Inteligencia ✦</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Análisis profundo de tus finanzas para decisiones más inteligentes.</p>
      </header>

      {/* Selector de periodo global */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <Calendar size={20} color="var(--color-gold)" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { id: 'esteMes', label: 'Este mes' },
            { id: 'mesAnterior', label: 'Mes anterior' },
            { id: '3meses', label: 'Últimos 3 meses' },
            { id: '6meses', label: '6 meses' },
            { id: 'esteAnio', label: 'Este año' },
            { id: 'personalizado', label: 'Personalizado' },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
              padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              backgroundColor: periodo === p.id ? 'var(--color-gold)' : 'var(--color-surface-2)',
              color: periodo === p.id ? '#000' : 'var(--color-text-muted)',
              transition: 'all 0.2s'
            }}>{p.label}</button>
          ))}
        </div>
        {periodo === 'personalizado' && (
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <DatePickerModern
              placeholder="Desde"
              value={customRange.start}
              onChange={val => setCustomRange({...customRange, start: val})}
              containerStyle={{ width: '130px' }}
            />
            <DatePickerModern
              placeholder="Hasta"
              value={customRange.end}
              onChange={val => setCustomRange({...customRange, end: val})}
              containerStyle={{ width: '130px' }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '24px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
            color: tab === t.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
            borderBottom: tab === t.id ? '3px solid var(--color-gold)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height="120px" />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {tab === 'summary' && (
            <>
              {/* Resumen Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>INGRESOS TOTALES</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>{formatARS(animatedIng)}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>EGRESOS TOTALES</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-danger)' }}>{formatARS(animatedEg)}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>BALANCE NETO</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{formatARS(animatedBal)}</div>
                </div>
                <div className="card" style={{ borderLeft: `4px solid ${stats.ratio > 20 ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>RATIO DE AHORRO</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.ratio}%</div>
                </div>
              </div>

              {/* Tabla Resumen Mensual */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Evolución Mensual</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: 'var(--color-surface-2)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    <tr>
                      <th style={{ padding: '16px 24px' }}>Mes</th>
                      <th style={{ padding: '16px 24px' }}>Ingresos</th>
                      <th style={{ padding: '16px 24px' }}>Egresos</th>
                      <th style={{ padding: '16px 24px' }}>Balance</th>
                      <th style={{ padding: '16px 24px' }}>Ahorro %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.history.slice(-12).map((h, i) => {
                      const bal = h.ingresos - h.egresos;
                      const ratio = h.ingresos > 0 ? Math.max(0, Math.round((bal / h.ingresos) * 100)) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '16px 24px', fontWeight: 500 }}>{h.mes_nombre} {h.año}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--color-success)' }}>{formatARS(h.ingresos)}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--color-danger)' }}>{formatARS(h.egresos)}</td>
                          <td style={{ padding: '16px 24px', fontWeight: 600 }}>{formatARS(bal)}</td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: ratio > 20 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)' }}>{ratio}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'var(--color-surface-2)', fontWeight: 700 }}>
                    <tr>
                      <td style={{ padding: '16px 24px' }}>TOTALES</td>
                      <td style={{ padding: '16px 24px', color: 'var(--color-success)' }}>{formatARS(reportData.history.reduce((s, h) => s + Number(h.ingresos), 0))}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--color-danger)' }}>{formatARS(reportData.history.reduce((s, h) => s + Number(h.egresos), 0))}</td>
                      <td style={{ padding: '16px 24px' }}>{formatARS(reportData.history.reduce((s, h) => s + Number(h.balance), 0))}</td>
                      <td style={{ padding: '16px 24px' }}>-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {tab === 'category' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, minWidth: '320px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Ranking de Gastos</h3>
                    <div style={{ display: 'flex', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px', padding: '4px' }}>
                      <button onClick={() => setViewMode('bars')} style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        backgroundColor: viewMode === 'bars' ? 'var(--color-gold)' : 'transparent',
                        color: viewMode === 'bars' ? '#000' : 'var(--color-text-muted)'
                      }}><BarChart3 size={16} /></button>
                      <button onClick={() => setViewMode('table')} style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        backgroundColor: viewMode === 'table' ? 'var(--color-gold)' : 'transparent',
                        color: viewMode === 'table' ? '#000' : 'var(--color-text-muted)'
                      }}><List size={16} /></button>
                    </div>
                  </div>

                  {viewMode === 'bars' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {reportData.categories.map(c => (
                        <div key={c.category_id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 500 }}>
                            <span>{c.category_name}</span>
                            <span>{formatARS(c.total)} ({c.porcentaje}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--color-surface-2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${c.porcentaje}%`, height: '100%', backgroundColor: c.category_color, transition: 'width 1s ease-out' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Categoría</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.categories.map(c => (
                          <tr key={c.category_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.category_color }} />
                              {c.category_name}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatARS(c.total)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>{c.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card" style={{ flex: 1, minWidth: '320px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '24px', alignSelf: 'flex-start' }}>Distribución Visual</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={reportData.categories} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="total">
                        {reportData.categories.map((c, i) => <Cell key={i} fill={c.category_color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '24px' }}><h3 style={{ fontWeight: 600 }}>Desglose por Cuenta</h3></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-2)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <tr>
                    <th style={{ padding: '16px 24px' }}>Cuenta</th>
                    <th style={{ padding: '16px 24px' }}>Ingresos</th>
                    <th style={{ padding: '16px 24px' }}>Egresos</th>
                    <th style={{ padding: '16px 24px' }}>Balance del Periodo</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.accounts.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600 }}>{a.account_name} ({a.account_moneda})</td>
                      <td style={{ padding: '16px 24px', color: 'var(--color-success)' }}>{formatARS(a.ingresos)}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--color-danger)' }}>{formatARS(a.egresos)}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700 }}>{formatARS(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '24px' }}>Tendencia de Flujo de Caja</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={reportData.history}>
                    <defs>
                      <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorEg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="mes_nombre" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${Math.round(v/1000)}k`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReLegend />
                    <Area type="monotone" name="Ingresos" dataKey="ingresos" stroke="var(--color-success)" fillOpacity={1} fill="url(#colorIng)" />
                    <Area type="monotone" name="Egresos" dataKey="egresos" stroke="var(--color-danger)" fillOpacity={1} fill="url(#colorEg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Estadísticas Automáticas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} color="var(--color-gold)" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Gasto Promedio Mensual</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatARS(reportData.history.reduce((s, h) => s + Number(h.egresos), 0) / (reportData.history.length || 1))}</div>
                  </div>
                </div>
                {reportData.categories?.[0] && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${reportData.categories[0].category_color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={24} color={reportData.categories[0].category_color} />
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Mayor Gasto: {reportData.categories[0].category_name}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatARS(reportData.categories[0].total)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
