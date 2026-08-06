import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Building } from 'lucide-react';

export default function ServicioModal({ isOpen, onClose, onSave, editingService, buckets }) {
  const [nombre, setNombre] = useState('');
  const [montoEstimado, setMontoEstimado] = useState('');
  const [diaVencimiento, setDiaVencimiento] = useState(10);
  const [bucketId, setBucketId] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (editingService) {
      setNombre(editingService.nombre || '');
      setMontoEstimado(editingService.monto_estimado || '');
      setDiaVencimiento(editingService.dia_vencimiento || 10);
      setBucketId(editingService.bucket_id || '');
      setProveedor(editingService.proveedor || '');
      setNotas(editingService.notas || '');
    } else {
      setNombre('');
      setMontoEstimado('');
      setDiaVencimiento(10);
      setBucketId(buckets[0]?.id || '');
      setProveedor('');
      setNotas('');
    }
  }, [editingService, isOpen, buckets]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onSave({
      id: editingService?.id,
      nombre,
      monto_estimado: Number(montoEstimado) || 0,
      dia_vencimiento: Number(diaVencimiento) || 1,
      bucket_id: bucketId || null,
      proveedor,
      notas
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
            {editingService ? 'Editar Servicio / Gasto Fijo' : 'Nuevo Servicio / Gasto Fijo'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Nombre del Servicio o Gasto:
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Servicio de Luz, Alquiler, Internet"
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
                Monto Estimado (ARS):
              </label>
              <input
                type="number"
                required
                placeholder="Ej. 25000"
                value={montoEstimado}
                onChange={(e) => setMontoEstimado(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Día de Vencimiento:
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                placeholder="Ej. 15"
                value={diaVencimiento}
                onChange={(e) => setDiaVencimiento(e.target.value)}
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
              Sobre de Casa Asociado:
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Proveedor / Empresa (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ej. Edenor, Fibertel, Inmobiliaria"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            />
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
              Guardar Servicio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
