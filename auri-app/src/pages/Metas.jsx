import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatARS, formatUSD } from '../utils/currency';
import { useCountUp } from '../hooks/useCountUp';
import Skeleton from '../components/ui/Skeleton';
import { 
  Target, TrendingUp, TrendingDown, Wallet, Calendar, 
  Plus, MoreVertical, Edit2, Trash2, CheckCircle2, ChevronDown, 
  ChevronUp, AlertCircle, Clock, History
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import MetaModal from '../components/metas/MetaModal';
import ContribucionModal from '../components/metas/ContribucionModal';

// --- Componete: ProgressBar ---
const ProgressBar = ({ progress, color }) => (
  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: color || 'var(--color-gold)', transition: 'width 1s ease-out' }}></div>
  </div>
);

/**
 * Cálculo del estado visual de la meta.
 */
const getMetaStatus = (montoActual, montoObjetivo, fechaLimite, metaPausada) => {
  const hoy = new Date();
  const limite = new Date(fechaLimite + 'T23:59:59');
  
  if (montoActual >= montoObjetivo) return { id: 'completada', label: 'Completada', color: 'var(--color-success)', icon: <CheckCircle2 size={14} /> };
  if (metaPausada) return { id: 'pausada', label: 'Pausada', color: 'var(--color-text-muted)', icon: <Plus size={14} style={{ transform: 'rotate(45deg)' }} /> };
  if (limite < hoy) return { id: 'vencida', label: 'Vencida', color: 'var(--color-danger)', icon: <AlertCircle size={14} /> };
  
  return { id: 'en_progreso', label: 'En progreso', color: 'var(--color-gold)', icon: <TrendingUp size={14} /> };
};

export default function Metas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Modales
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [contributingMeta, setContributingMeta] = useState(null);
  
  const [activeMenuId, setActiveMenuId] = useState(null);

  // SWR: Metas
  const { data: metas, isLoading: loadingMetas, mutate: mutateMetas } = useSWR(
    user ? ['metas', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase.from('savings_goals').select('*').eq('user_id', userId).order('fecha_limite', { ascending: true });
      if (error) throw error;
      return data;
    }
  );

  const inProgress = useMemo(() => metas?.filter(m => !m.completada) || [], [metas]);
  const completedMetas = useMemo(() => metas?.filter(m => m.completada) || [], [metas]);

  const handleOpenNewMeta = () => {
    setEditingMeta(null);
    setIsMetaModalOpen(true);
  };

  const handleEditMeta = (meta) => {
    setEditingMeta(meta);
    setIsMetaModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenContrib = (meta) => {
    setContributingMeta(meta);
    setIsContribModalOpen(true);
  };

  const deleteMeta = async (id) => {
    const ok = await confirm('¿Estás seguro de eliminar esta meta? Se perderá el seguimiento histórico.');
    if (!ok) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (!error) {
      toast.success('Meta eliminada');
      mutateMetas();
      setActiveMenuId(null);
    }
  };

  const toggleCompletada = async (meta) => {
    if (!meta.completada && meta.monto_actual < meta.monto_objetivo) {
        const ok = await confirm(`¿Marcar "${meta.nombre}" como completada aunque no llegó al monto objetivo?`);
        if (!ok) return;
    }
    const { error } = await supabase.from('savings_goals').update({ 
        completada: !meta.completada,
        completada_at: !meta.completada ? new Date() : null 
    }).eq('id', meta.id);
    if (!error) {
      toast.success(meta.completada ? 'Meta reactivada' : '¡Meta completada! 🎉');
      mutateMetas();
    }
  };

  const togglePausada = async (meta) => {
    const { error } = await supabase.from('savings_goals').update({ pausada: !meta.pausada }).eq('id', meta.id);
    if (!error) {
      toast.success(meta.pausada ? 'Meta reanudada' : 'Meta pausada');
      mutateMetas();
      setActiveMenuId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Mis Metas de Ahorro</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Cuidá tu futuro paso a paso.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNewMeta} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> Nueva Meta
        </button>
      </header>

      {/* Grid: En progreso */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          <Clock size={16} /> EN PROGRESO ({inProgress.length})
        </div>

        {loadingMetas ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {[1,2,3].map(i => <Skeleton key={i} height="280px" />)}
          </div>
        ) : inProgress.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed' }}>
            <Target size={48} color="var(--color-gold)" style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No tenés metas activas. ¡Empezá hoy mismo!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {inProgress.map(meta => {
              const pct = Math.round((meta.monto_actual / meta.monto_objetivo) * 100);
              const status = getMetaStatus(meta.monto_actual, meta.monto_objetivo, meta.fecha_limite, meta.pausada);
              const hoy = new Date();
              const limite = meta.fecha_limite ? new Date(meta.fecha_limite + 'T12:00:00') : null;
              const mesesRestantes = limite ? Math.max(0, (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth())) : null;
              const ahorroMensual = mesesRestantes && mesesRestantes > 0 ? (meta.monto_objetivo - meta.monto_actual) / mesesRestantes : 0;

              return (
                <div key={meta.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '1.75rem' }}>{meta.icono || '🎯'}</div>
                      <div>
                        <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{meta.nombre}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.color, fontSize: '0.75rem', fontWeight: 600 }}>
                          {status.icon} {status.label.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button className="btn-icon" onClick={() => setActiveMenuId(activeMenuId === meta.id ? null : meta.id)}>
                        <MoreVertical size={20} />
                      </button>
                      {activeMenuId === meta.id && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, width: '160px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', zIndex: 10, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          <button onClick={() => navigate(`/metas/${meta.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                            <History size={14} /> Ver detalle
                          </button>
                          <button onClick={() => handleEditMeta(meta)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                            <Edit2 size={14} /> Editar
                          </button>
                          <button onClick={() => togglePausada(meta)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', color: 'var(--color-warning)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                            <Clock size={14} /> {meta.pausada ? 'Reanudar' : 'Pausar'}
                          </button>
                          <button onClick={() => toggleCompletada(meta)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', color: 'var(--color-success)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={14} /> Completar
                          </button>
                          <button onClick={() => deleteMeta(meta.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatARS(meta.monto_actual)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>de {formatARS(meta.monto_objetivo)}</div>
                    </div>
                    <ProgressBar progress={pct} color={meta.color} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span style={{ color: meta.color }}>{pct}%</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>Faltan {formatARS(meta.monto_objetivo - meta.monto_actual)}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
                        <Calendar size={14} /> {limite ? limite.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : 'Sin plazo'}
                      </div>
                      <div style={{ fontWeight: 600 }}>{mesesRestantes !== null ? `${mesesRestantes} meses rest.` : 'N/A'}</div>
                    </div>
                    {ahorroMensual > 0 && (
                      <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Ahorrá mensual: </span>
                        <span style={{ fontWeight: 700 }}>{formatARS(ahorroMensual)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" onClick={() => handleOpenContrib(meta)} style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}>Contribuir</button>
                      <button className="btn btn-secondary" onClick={() => toggleCompletada(meta)} style={{ padding: '8px' }}>
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección: Completadas */}
      {completedMetas.length > 0 && (
        <section>
          <button onClick={() => setShowCompleted(!showCompleted)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            COMPLETADAS ({completedMetas.length}) {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showCompleted && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '20px' }}>
              {completedMetas.map(meta => (
                <div key={meta.id} className="card" style={{ padding: '20px', opacity: 0.7, border: '1px solid var(--color-success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{meta.icono}</span>
                      <div>
                        <div style={{ fontWeight: 600 }} onClick={() => navigate(`/metas/${meta.id}`)}>{meta.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> COMPLETADA
                        </div>
                      </div>
                    </div>
                    <button className="btn-icon" onClick={() => deleteMeta(meta.id)}><Trash2 size={18} color="var(--color-danger)" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modales */}
      <MetaModal 
        isOpen={isMetaModalOpen} 
        onClose={() => setIsMetaModalOpen(false)} 
        meta={editingMeta} 
        onSuccess={mutateMetas} 
      />
      <ContribucionModal 
        isOpen={isContribModalOpen} 
        onClose={() => setIsContribModalOpen(false)} 
        meta={contributingMeta} 
        onSuccess={mutateMetas} 
      />
    </div>
  );
}
