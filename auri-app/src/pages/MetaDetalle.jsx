import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatARS } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import { 
  ArrowLeft, Target, Calendar, TrendingUp, 
  Trash2, AlertCircle, CheckCircle2, History, Info, Edit2, Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ContribucionModal from '../components/metas/ContribucionModal';
import MetaModal from '../components/metas/MetaModal';
import confetti from 'canvas-confetti';

// --- Helpers de lógica ---
const calcularCuotaMensual = (meta) => {
  if (!meta.fecha_limite) return 0;
  const hoy = new Date();
  const fechaLimite = new Date(meta.fecha_limite + 'T12:00:00');
  const mesesRestantes = (fechaLimite.getFullYear() - hoy.getFullYear()) * 12 + (fechaLimite.getMonth() - hoy.getMonth()) + 1;
  const montoRestante = meta.monto_objetivo - meta.monto_actual;
  if (mesesRestantes <= 0) return Math.max(0, montoRestante);
  return Math.ceil(montoRestante / mesesRestantes);
};

const determinarEstadoMeta = (meta, contribs = []) => {
  const cuota = calcularCuotaMensual(meta);
  if (cuota <= 0) return 'en_camino';
  
  // Promedio últimos 3 meses
  const hoy = new Date();
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(hoy.getMonth() - 2);
  
  const recientes = contribs.filter(c => new Date(c.fecha) >= tresMesesAtras);
  const promedio = recientes.length > 0 
    ? recientes.reduce((sum, c) => sum + Number(c.monto), 0) / Math.max(1, recientes.length) 
    : 0;

  const ratio = promedio / cuota;
  if (ratio >= 0.9) return 'en_camino';
  if (ratio >= 0.5) return 'en_riesgo';
  return 'atrasada';
};

const ESTADOS = {
  en_camino: { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ECC71', label: '🟢 En camino' },
  en_riesgo:  { bg: 'rgba(243, 156, 18, 0.15)', text: '#F39C12', label: '🟡 En riesgo' },
  atrasada:   { bg: 'rgba(231, 76, 60, 0.15)',  text: '#E74C3C', label: '🔴 Atrasada' },
};

export default function MetaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // SWR
  const { data: meta, isLoading: loadingMeta, mutate: mutateMeta } = useSWR(
    user ? ['meta-detalle', id] : null,
    async ([, metaId]) => {
      const { data, error } = await supabase.from('savings_goals').select('*').eq('id', metaId).single();
      if (error) throw error;
      return data;
    }
  );

  const { data: contribs, isLoading: loadingContribs, mutate: mutateContribs } = useSWR(
    user ? ['meta-contribs', id] : null,
    async ([, metaId]) => {
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*, account:accounts(nombre, moneda)')
        .eq('goal_id', metaId)
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data;
    }
  );

  // Proyección Calendario
  const proyeccion = useMemo(() => {
    if (!meta || !meta.fecha_limite) return [];
    
    const data = [];
    const hoy = new Date();
    let currentMonto = Number(meta.monto_actual);
    const limite = new Date(meta.fecha_limite + 'T12:00:00');
    
    // Meses desde hoy hasta limite
    const diffMeses = (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth()) + 1;
    const cuota = calcularCuotaMensual(meta);
    
    for (let i = 0; i < diffMeses; i++) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
        const label = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
        
        // Ajuste último mes
        const esUltimo = i === diffMeses - 1;
        const montoMes = esUltimo ? (meta.monto_objetivo - currentMonto) : cuota;
        currentMonto += montoMes;
        
        data.push({
            mes: label,
            cuota: montoMes,
            acumulado: Math.min(meta.monto_objetivo, currentMonto),
            pct: Math.round((currentMonto / meta.monto_objetivo) * 100)
        });
    }
    return data;
  }, [meta]);

  const chartData = useMemo(() => {
    if (!meta || !proyeccion.length) return [];
    // Simplificado: Ideal vs Real (solo puntos históricos vs proyectados)
    // Para una gráfica real necesitamos el histórico de saldos. 
    // Por ahora usaremos la proyección.
    return proyeccion.map(p => ({
        name: p.mes,
        Ideal: p.acumulado,
        // Proximamente: Real
    }));
  }, [meta, proyeccion]);

  const estado = useMemo(() => meta ? determinarEstadoMeta(meta, contribs) : 'en_camino', [meta, contribs]);

  const handleDeleteMeta = async () => {
    const ok = await confirm('¿Eliminar esta meta? Se perderán todas las contribuciones asociadas.');
    if (!ok) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', meta.id);
    if (!error) {
        toast.success('Meta eliminada');
        navigate('/metas');
    }
  };

  const reabrirMeta = async () => {
    const { error } = await supabase.from('savings_goals').update({ completada: false, monto_actual: meta.monto_objetivo * 0.99 }).eq('id', meta.id);
    if (!error) {
        toast.success('Meta reactivada');
        mutateMeta();
    }
  };

  if (loadingMeta) return <div style={{ padding: '40px' }}><Skeleton height="400px" /></div>;
  if (!meta) return null;

  const pct = Math.round((meta.monto_actual / meta.monto_objetivo) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/metas')} className="btn-icon" style={{ backgroundColor: 'var(--color-surface-2)' }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontWeight: 600, fontSize: '1.75rem' }}>{meta.icono} {meta.nombre}</h1>
            <button className="btn-icon" onClick={() => setIsEditModalOpen(true)}><Edit2 size={16} /></button>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Detalle de ahorro y proyecciones</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            {meta.completada ? (
                <button className="btn btn-secondary" onClick={reabrirMeta}>Reabrir Meta</button>
            ) : (
                <button onClick={() => setIsContribModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} /> Contribuir
                </button>
            )}
            <button className="btn-icon" onClick={handleDeleteMeta} style={{ color: 'var(--color-danger)' }}><Trash2 size={20} /></button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header Progress Card (D.1) */}
          <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: meta.completada ? 'var(--color-success)' : 'var(--color-gold)' }}>
                        {formatARS(meta.monto_actual)}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>de {formatARS(meta.monto_objetivo)} ahorrados</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{pct}%</div>
                    <div style={{ ...ESTADOS[estado], padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{ESTADOS[estado].label}</div>
                </div>
            </div>

            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--color-surface-2)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: meta.completada ? 'var(--color-success)' : meta.color, transition: 'width 1.5s' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={20} color="var(--color-text-muted)" /></div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>FECHA LÍMITE</div>
                        <div style={{ fontWeight: 600 }}>{meta.fecha_limite ? new Date(meta.fecha_limite + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin plazo'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} color="var(--color-gold)" /></div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CUOTA MENSUAL SUGERIDA</div>
                        <div style={{ fontWeight: 600 }}>{formatARS(calcularCuotaMensual(meta))}/mes</div>
                    </div>
                </div>
            </div>
          </div>

          {/* Panel de Proyección (D.2) */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} color="var(--color-gold)" /> Proyección de Ahorro</h3>
            </div>
            
            <div style={{ padding: '24px' }}>
                <div style={{ height: '250px', marginLeft: '-20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                                itemStyle={{ fontWeight: 600 }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Ideal" stroke="#C9A84C" strokeWidth={3} dot={{ r: 4, fill: '#C9A84C' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Mes</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Meta mensual</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Proyectado acumulado</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proyeccion.map((p, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '12px', fontWeight: 600 }}>{p.mes}</td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatARS(p.cuota)}</td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatARS(p.acumulado)}</td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {p.pct}% {p.pct === 100 && '🎯'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>

          {/* Historial (D.5) */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} color="var(--color-gold)" />
                    <h3 style={{ fontWeight: 600 }}>Historial de Contribuciones</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--color-surface-2)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <tr>
                            <th style={{ padding: '16px 24px' }}>Fecha</th>
                            <th style={{ padding: '16px 24px' }}>Monto</th>
                            <th style={{ padding: '16px 24px' }}>Cuenta</th>
                            <th style={{ padding: '16px 24px' }}>Tipo</th>
                            <th style={{ padding: '16px 24px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contribs?.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '16px 24px' }}>{new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                                <td style={{ padding: '16px 24px', fontWeight: 600 }}>{formatARS(c.monto)}</td>
                                <td style={{ padding: '16px 24px' }}>{c.account?.nombre}</td>
                                <td style={{ padding: '16px 24px' }}>
                                    {c.es_automatica ? <span style={{ color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Automática 🤖</span> : 'Manual'}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={async () => {
                                         const ok = await confirm('¿Eliminar contribución?');
                                         if (!ok) return;
                                         if (c.transaction_id) await supabase.from('transactions').delete().eq('id', c.transaction_id);
                                         await supabase.from('goal_contributions').delete().eq('id', c.id);
                                         await supabase.from('savings_goals').update({ monto_actual: Number(meta.monto_actual) - Number(c.monto) }).eq('id', meta.id);
                                         toast.success('Eliminada');
                                         mutateMeta(); mutateContribs();
                                    }}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={18} color="var(--color-gold)" /> Notas de la Meta</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                    {meta.descripcion || 'No hay notas adicionales para esta meta.'}
                </p>
                {meta.account_id && (
                    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Cuenta vinculada: </span>
                        <strong>{meta.account_id}</strong>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), transparent)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-gold)' }}>
                    <Plus size={32} />
                </div>
                <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Contribución Crítica</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Recordá que para llegar a tiempo debés aportar {formatARS(calcularCuotaMensual(meta))} antes de fin de mes.</p>
                <button className="btn btn-primary" onClick={() => setIsContribModalOpen(true)} style={{ width: '100%' }}>Dar un paso más</button>
            </div>
        </div>
      </div>

      <MetaModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} meta={meta} onSuccess={mutateMeta} />
      <ContribucionModal isOpen={isContribModalOpen} onClose={() => setIsContribModalOpen(false)} meta={meta} onSuccess={() => {
          mutateMeta(); mutateContribs();
          // Verificación de éxito celebrada en el modal de contribución
      }} />
    </div>
  );
}
