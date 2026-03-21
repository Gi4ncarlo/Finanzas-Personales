import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import useDolarRate from '../../hooks/useDolarBlue';
import { supabase } from '../../lib/supabase';
import { X, Trash2, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from 'lucide-react';
import { DIAS_SEMANA, MESES } from '../../utils/recurrentes';
import { formatARS, formatUSD } from '../../utils/currency';

const FREQ_TABS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'anual', label: 'Anual' },
];

const INITIAL_FORM = {
  nombre: '',
  monto_estimado: '',
  moneda: 'ARS',
  category_id: '',
  account_id: '',
  frecuencia: 'mensual',
  dia_ejecucion: '',
  dia_semana: '1',
  mes_ejecucion: '1',
  descripcion: '',
  activo: true,
};

export default function RecurrenteModal({ isOpen, onClose, onSave, onDelete, recurrente = null, accounts = [], categories = [] }) {
  const { user } = useAuth();
  const { venta } = useDolarRate('oficial');
  const isEditing = !!recurrente;

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Categorías solo egreso/ambos
  const egresoCategories = useMemo(() =>
    categories.filter(c => c.tipo === 'egreso' || c.tipo === 'ambos'),
    [categories]
  );

  // Reset form al abrir
  useEffect(() => {
    if (isOpen) {
      setError('');
      setConfirmDelete(false);
      setShowHistorial(false);
      setHistorial([]);
      if (recurrente) {
        setForm({
          nombre: recurrente.nombre || '',
          monto_estimado: String(recurrente.monto_estimado || ''),
          moneda: recurrente.moneda || 'ARS',
          category_id: recurrente.category_id || '',
          account_id: recurrente.account_id || '',
          frecuencia: recurrente.frecuencia || 'mensual',
          dia_ejecucion: String(recurrente.dia_ejecucion || ''),
          dia_semana: String(recurrente.dia_semana ?? '1'),
          mes_ejecucion: String(recurrente.mes_ejecucion || '1'),
          descripcion: recurrente.descripcion || '',
          activo: recurrente.activo !== false,
        });
      } else {
        setForm(INITIAL_FORM);
      }
    }
  }, [isOpen, recurrente]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Cargar historial
  const loadHistorial = async () => {
    if (!recurrente?.id) return;
    setHistorialLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('id, fecha, monto, moneda, accounts!transactions_account_id_fkey(nombre)')
      .eq('recurring_expense_id', recurrente.id)
      .order('fecha', { ascending: false })
      .limit(12);
    setHistorial(data || []);
    setHistorialLoading(false);
  };

  useEffect(() => {
    if (showHistorial) loadHistorial();
  }, [showHistorial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return; }
    const montoNum = parseFloat(form.monto_estimado);
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0.'); return; }
    if (!form.category_id) { setError('Seleccioná una categoría.'); return; }
    if (!form.account_id) { setError('Seleccioná una cuenta.'); return; }
    if (form.frecuencia === 'mensual' && (!form.dia_ejecucion || form.dia_ejecucion < 1 || form.dia_ejecucion > 31)) {
      setError('El día de ejecución debe estar entre 1 y 31.'); return;
    }
    if (form.frecuencia === 'anual' && (!form.dia_ejecucion || form.dia_ejecucion < 1)) {
      setError('Completá el día del mes para frecuencia anual.'); return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        nombre: form.nombre.trim(),
        monto_estimado: montoNum,
        moneda: form.moneda,
        category_id: form.category_id,
        account_id: form.account_id,
        frecuencia: form.frecuencia,
        dia_ejecucion: form.frecuencia !== 'semanal' ? parseInt(form.dia_ejecucion) || null : null,
        dia_semana: form.frecuencia === 'semanal' ? parseInt(form.dia_semana) : null,
        mes_ejecucion: form.frecuencia === 'anual' ? parseInt(form.mes_ejecucion) : null,
        descripcion: form.descripcion.trim() || null,
        activo: form.activo,
      };

      await onSave(payload, recurrente?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    try {
      await onDelete(recurrente.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmt = form.moneda === 'ARS' ? formatARS : formatUSD;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {isEditing ? 'Editar Recurrente' : 'Nuevo Recurrente'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Nombre *</label>
            <input className="input" type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej: Luz Edenor, Netflix, Expensas" />
          </div>

          {/* Monto + Moneda */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Monto estimado *</label>
              <input className="input" type="number" step="0.01" min="0.01" value={form.monto_estimado} onChange={e => set('monto_estimado', e.target.value)} placeholder="0.00" style={{ fontSize: '1.1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Moneda</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[{ v: 'ARS', f: '🇦🇷' }, { v: 'USD', f: '🇺🇸' }].map(m => (
                  <button key={m.v} type="button" onClick={() => set('moneda', m.v)} style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px', cursor: 'pointer',
                    border: form.moneda === m.v ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                    backgroundColor: form.moneda === m.v ? 'rgba(201,168,76,0.1)' : 'var(--color-surface-2)',
                    color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}>{m.f} {m.v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Nota monto */}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-14px', padding: '0 2px' }}>
            💡 Este es el monto estimado. Podés ajustarlo cada mes una vez que llegue la factura real.
          </p>

          {/* Categoría */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Categoría *</label>
            <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">Seleccionar categoría</option>
              {egresoCategories.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cuenta */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Cuenta *</label>
            <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Seleccionar cuenta</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.nombre} ({a.moneda})</option>
              ))}
            </select>
          </div>

          {/* Frecuencia */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '12px', fontSize: '0.9rem' }}>Frecuencia *</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {FREQ_TABS.map(t => (
                <button key={t.value} type="button" onClick={() => set('frecuencia', t.value)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s',
                  border: form.frecuencia === t.value ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                  backgroundColor: form.frecuencia === t.value ? 'rgba(201,168,76,0.1)' : 'var(--color-surface-2)',
                  color: form.frecuencia === t.value ? 'var(--color-gold)' : 'var(--color-text-muted)',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Campos condicionales por frecuencia */}
            {form.frecuencia === 'mensual' && (
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Día del mes *</label>
                <input className="input" type="number" min="1" max="31" value={form.dia_ejecucion} onChange={e => set('dia_ejecucion', e.target.value)} placeholder="1 – 31" />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Si el mes tiene menos días (ej: febrero), se ejecutará el último día del mes.
                </p>
              </div>
            )}

            {form.frecuencia === 'semanal' && (
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Día de la semana *</label>
                <select className="input" value={form.dia_semana} onChange={e => set('dia_semana', e.target.value)}>
                  {DIAS_SEMANA.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {form.frecuencia === 'anual' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Día *</label>
                  <input className="input" type="number" min="1" max="31" value={form.dia_ejecucion} onChange={e => set('dia_ejecucion', e.target.value)} placeholder="1 – 31" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Mes *</label>
                  <select className="input" value={form.mes_ejecucion} onChange={e => set('mes_ejecucion', e.target.value)}>
                    {MESES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Descripción (opcional)</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Notas adicionales..." style={{ resize: 'vertical' }} />
          </div>

          {/* Toggle Activo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Activo</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {form.activo ? 'Se ejecutará automáticamente' : 'No se ejecutará hasta que lo reactives'}
              </div>
            </div>
            <button type="button" onClick={() => set('activo', !form.activo)} style={{
              width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
              backgroundColor: form.activo ? 'var(--color-success)' : 'var(--color-border)',
            }}>
              <div style={{
                position: 'absolute', top: '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'all 0.2s',
                left: form.activo ? '25px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

          {/* Historial de ejecuciones (solo edición) */}
          {isEditing && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowHistorial(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 500, padding: '4px 0' }}>
                {showHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Historial de ejecuciones
              </button>
              {showHistorial && (
                <div style={{ marginTop: '12px' }}>
                  {historialLoading ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cargando...</p>
                  ) : historial.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '12px', textAlign: 'center', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px' }}>
                      Todavía no hay ejecuciones registradas.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {historial.map(tx => {
                        const montoEst = parseFloat(recurrente.monto_estimado);
                        const montoTx = parseFloat(tx.monto);
                        const fmtFn = tx.moneda === 'ARS' ? formatARS : formatUSD;
                        const difiere = Math.abs(montoEst - montoTx) > 0.01;
                        return (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid var(--color-border)' }}>
                            <div>
                              <div style={{ fontWeight: 500 }}>{new Date(tx.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{tx.accounts?.nombre || '—'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 600, color: difiere ? 'var(--color-warning)' : 'var(--color-text)' }}>
                                {fmtFn(montoTx)}
                                {difiere && <span style={{ marginLeft: '6px', fontSize: '0.75rem' }}>✏️</span>}
                              </div>
                              {difiere && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>est. {fmtFn(montoEst)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {isEditing && (
              <button type="button" onClick={handleDelete} disabled={loading} style={{
                padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-danger)',
                backgroundColor: confirmDelete ? 'var(--color-danger)' : 'transparent',
                color: confirmDelete ? '#fff' : 'var(--color-danger)',
                cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              }}>
                <Trash2 size={16} />
                {confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar'}
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, padding: '14px', fontSize: '1rem' }}>
              {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Recurrente')}
            </button>
          </div>

          {isEditing && confirmDelete && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '-10px' }}>
              Las transacciones ya registradas no se eliminarán.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
