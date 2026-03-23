import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { calcProximaEjecucion, formatProximaFecha, frecuenciaLabel } from '../utils/recurrentes';
import { formatARS, formatUSD } from '../utils/currency';
import RecurrenteModal from '../components/recurrentes/RecurrenteModal';
import Skeleton from '../components/ui/Skeleton';
import { Plus, RefreshCw, Pause, Play, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

export default function Recurrentes() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [activos, setActivos] = useState([]);
  const [pausados, setPausados] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecurrente, setEditingRecurrente] = useState(null);
  const [showPausados, setShowPausados] = useState(false);
  const [toggling, setToggling] = useState(null); // id being toggled

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: recurrentes }, { data: accs }, { data: cats }] = await Promise.all([
      supabase
        .from('recurring_expenses')
        .select('*, accounts!recurring_expenses_account_id_fkey(nombre, moneda), categories(nombre, color, icono)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('accounts').select('id, nombre, moneda').eq('user_id', user.id).eq('activa', true),
      supabase.from('categories').select('id, nombre, tipo, color, icono').eq('user_id', user.id),
    ]);

    const withFecha = (recurrentes || []).map(r => ({ ...r, proxima: calcProximaEjecucion(r) }));
    setActivos(withFecha.filter(r => r.activo).sort((a, b) => a.proxima - b.proxima));
    setPausados(withFecha.filter(r => !r.activo));
    setAccounts(accs || []);
    setCategories(cats || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (payload, id) => {
    if (id) {
      const { error } = await supabase.from('recurring_expenses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      showToast('Recurrente actualizado ✓', 'success');
    } else {
      const { error } = await supabase.from('recurring_expenses').insert(payload);
      if (error) throw error;
      showToast('Recurrente creado ✓', 'success');
    }
    await fetchData();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
    if (error) throw error;
    showToast('Recurrente eliminado', 'success');
    await fetchData();
  };

  const handleTogglePause = async (r) => {
    const nuevoEstado = !r.activo;
    if (nuevoEstado === false) {
      const ok = await confirm(`¿Pausar "${r.nombre}"? No se registrará automáticamente hasta que lo reactives.`);
      if (!ok) return;
    }
    setToggling(r.id);
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) { showToast('Error al actualizar', 'error'); }
    else { showToast(nuevoEstado ? 'Recurrente reactivado ▶' : 'Recurrente pausado ⏸', 'success'); }
    setToggling(null);
    await fetchData();
  };

  const openEdit = (r) => { setEditingRecurrente(r); setModalOpen(true); };
  const openCreate = () => { setEditingRecurrente(null); setModalOpen(true); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '6px' }}>
            Gastos Recurrentes
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Definí tus gastos fijos y Auri los registrará automáticamente cada período.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}>
          <Plus size={18} /> Nuevo Recurrente
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="80px" /><Skeleton height="80px" /><Skeleton height="80px" />
        </div>
      ) : (
        <>
          {/* ACTIVOS */}
          <section>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              ACTIVOS ({activos.length})
            </h2>
            {activos.length === 0 ? (
              <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderStyle: 'dashed' }}>
                <RefreshCw size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>No hay gastos recurrentes activos.</p>
                <button className="btn btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Crear el primero
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activos.map(r => <RecurrenteFila key={r.id} r={r} onEdit={openEdit} onToggle={handleTogglePause} toggling={toggling} />)}
              </div>
            )}
          </section>

          {/* PAUSADOS */}
          {pausados.length > 0 && (
            <section>
              <button onClick={() => setShowPausados(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', padding: 0 }}>
                PAUSADOS ({pausados.length}) {showPausados ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showPausados && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pausados.map(r => <RecurrenteFila key={r.id} r={r} onEdit={openEdit} onToggle={handleTogglePause} toggling={toggling} />)}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <RecurrenteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        recurrente={editingRecurrente}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Componente de fila interno
// ──────────────────────────────────────────────
function RecurrenteFila({ r, onEdit, onToggle, toggling }) {
  const isPaused = !r.activo;
  const fmt = r.moneda === 'ARS' ? formatARS : formatUSD;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff = r.proxima ? Math.round((r.proxima - hoy) / (1000 * 60 * 60 * 24)) : null;
  const esHoy = diff === 0;
  const esProximo = diff !== null && diff <= 3 && diff > 0;

  return (
    <div className="card" style={{
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
      opacity: isPaused ? 0.55 : 1,
      borderLeft: `4px solid ${r.categories?.color || 'var(--color-border)'}`,
      transition: 'opacity 0.2s',
    }}>
      {/* Ícono categoría */}
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${r.categories?.color || '#666'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
        {r.categories?.icono || '📋'}
      </div>

      {/* Info principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</span>
          {isPaused && <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(243,156,18,0.15)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>PAUSADO</span>}
          {esHoy && <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(231,76,60,0.15)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>HOY</span>}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span>{r.categories?.nombre || '—'}</span>
          <span>·</span>
          <span style={{ fontWeight: 500, color: 'var(--color-danger)' }}>{r.moneda === 'USD' ? 'U$S ' : ''}{fmt(r.monto_estimado)}</span>
          <span>·</span>
          <span>{frecuenciaLabel(r)}</span>
          {r.accounts && <><span>·</span><span>{r.accounts.nombre}</span></>}
        </div>
        {r.proxima && !isPaused && (
          <div style={{ fontSize: '0.78rem', marginTop: '4px', color: esHoy ? 'var(--color-danger)' : esProximo ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
            Próxima ejecución: {esHoy ? 'hoy' : formatProximaFecha(r.proxima)}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => onToggle(r)} disabled={toggling === r.id} title={isPaused ? 'Reactivar' : 'Pausar'} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button onClick={() => onEdit(r)} title="Editar" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          <Pencil size={16} />
        </button>
      </div>
    </div>
  );
}
