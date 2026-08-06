import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AutoExpenseModal({ isOpen, onClose, onSave, editingExpense, buckets }) {
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [diaDebito, setDiaDebito] = useState(1);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (editingExpense) {
      setNombre(editingExpense.nombre || '');
      setMonto(editingExpense.monto || '');
      setBucketId(editingExpense.bucket_id || '');
      setDiaDebito(editingExpense.dia_debito || 1);
      setActivo(editingExpense.activo !== undefined ? editingExpense.activo : true);
    } else {
      setNombre('');
      setMonto('');
      setBucketId(buckets[0]?.id || '');
      setDiaDebito(1);
      setActivo(true);
    }
  }, [editingExpense, isOpen, buckets]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim() || !monto) return;

    onSave({
      id: editingExpense?.id,
      nombre,
      monto: Number(monto),
      bucket_id: bucketId,
      dia_debito: Number(diaDebito),
      activo
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '480px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-gold)' }}>
            {editingExpense ? 'Editar Gasto Automático' : 'Nuevo Gasto Automático'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Nombre de la Suscripción / Gasto Fijo:
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Netflix, Spotify, Expensas Automáticas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Monto Fijo (ARS):
              </label>
              <input
                type="number"
                required
                placeholder="Ej. 8500"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Día de Débito Automático:
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                placeholder="Ej. 5"
                value={diaDebito}
                onChange={(e) => setDiaDebito(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Sobre de Casa Asociado (Donde se debitará):
            </label>
            <select
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            >
              <option value="">-- Seleccionar sobre --</option>
              {buckets.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="activo-check"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-gold)' }}
            />
            <label htmlFor="activo-check" style={{ fontSize: '0.9rem', color: 'var(--color-text)', cursor: 'pointer' }}>
              Gasto Activo (se debitará automáticamente del fondo de la casa)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-gold)', color: '#000', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
