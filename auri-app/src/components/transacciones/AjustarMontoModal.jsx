import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatARS, formatUSD } from '../../utils/currency';
import { X } from 'lucide-react';

/**
 * Mini-modal para ajustar el monto real de una transacción automática.
 * Solo cambia el campo `monto` de esa transacción específica.
 * No afecta el `monto_estimado` del recurrente original.
 */
export default function AjustarMontoModal({ isOpen, onClose, transaccion, onSaved }) {
  const { toast } = useToast();
  const [monto, setMonto] = useState(String(transaccion?.monto || ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync monto when transaccion changes
  if (transaccion && monto === '' && transaccion.monto) {
    setMonto(String(transaccion.monto));
  }

  const fmt = transaccion?.moneda === 'ARS' ? formatARS : formatUSD;
  const montoEstimado = transaccion?.monto;

  const handleSave = async () => {
    setError('');
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresá un monto válido mayor a 0.');
      return;
    }
    setLoading(true);
    try {
      const montoAnterior = fmt(montoEstimado);
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          monto: montoNum,
          notas: `Ajustado manualmente. Estimado original: ${montoAnterior}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaccion.id);

      if (updateError) throw updateError;
      toast.success('Monto actualizado. El saldo de tu cuenta se actualizó automáticamente.');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !transaccion) return null;

  const montoNum = parseFloat(monto);
  const difiere = !isNaN(montoNum) && Math.abs(montoNum - montoEstimado) > 0.01;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fadeIn 0.2s ease' }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '400px', animation: 'slideUp 0.25s ease' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '2px' }}>Ajustar monto real</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {transaccion.descripcion}
              {transaccion.fecha && ` · ${new Date(transaccion.fecha + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Monto estimado (readonly) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--color-surface-2)', borderRadius: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Monto estimado:</span>
            <span style={{ fontWeight: 600 }}>{fmt(montoEstimado)}</span>
          </div>

          {/* Monto real editable */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>
              Monto real *
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              autoFocus
              style={{ fontSize: '1.1rem', fontWeight: 600 }}
            />
            {difiere && !isNaN(montoNum) && (
              <p style={{ fontSize: '0.8rem', marginTop: '6px', color: montoNum > montoEstimado ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {montoNum > montoEstimado ? '▲' : '▼'} {fmt(Math.abs(montoNum - montoEstimado))} {montoNum > montoEstimado ? 'más' : 'menos'} que lo estimado
              </p>
            )}
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px' }}
            >
              {loading ? 'Guardando...' : 'Guardar monto real'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
