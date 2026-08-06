import { useState, useEffect } from 'react';
import { Home, Zap, ShoppingCart, Heart, ShieldAlert, X } from 'lucide-react';

const ICONS = [
  { id: 'home', label: 'Hogar', icon: <Home size={18} /> },
  { id: 'zap', label: 'Servicios', icon: <Zap size={18} /> },
  { id: 'shopping-cart', label: 'Supermercado', icon: <ShoppingCart size={18} /> },
  { id: 'heart', label: 'Familia', icon: <Heart size={18} /> },
  { id: 'shield-alert', label: 'Contingencia', icon: <ShieldAlert size={18} /> }
];

const COLORS = ['#E5C07B', '#61AFEF', '#98C379', '#E06C75', '#D19A66', '#C678DD', '#56B6C2'];

export default function SobreModal({ isOpen, onClose, onSave, editingBucket, categories }) {
  const [nombre, setNombre] = useState('');
  const [montoPresupuestado, setMontoPresupuestado] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [icono, setIcono] = useState('home');
  const [color, setColor] = useState('#61AFEF');

  useEffect(() => {
    if (editingBucket) {
      setNombre(editingBucket.nombre || '');
      setMontoPresupuestado(editingBucket.monto_presupuestado || '');
      setCategoriaId(editingBucket.categoria_id || '');
      setIcono(editingBucket.icono || 'home');
      setColor(editingBucket.color || '#61AFEF');
    } else {
      setNombre('');
      setMontoPresupuestado('');
      setCategoriaId('');
      setIcono('home');
      setColor('#61AFEF');
    }
  }, [editingBucket, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onSave({
      id: editingBucket?.id,
      nombre,
      monto_presupuestado: Number(montoPresupuestado) || 0,
      categoria_id: categoriaId || null,
      icono,
      color
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
            {editingBucket ? 'Editar Sobre de Casa' : 'Nuevo Sobre de Casa'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Nombre del Sobre / Rubro:
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Alquiler, Supermercado, Ayuda a Padres"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Monto Presupuestado Mensual (ARS):
            </label>
            <input
              type="number"
              required
              placeholder="Ej. 150000"
              value={montoPresupuestado}
              onChange={(e) => setMontoPresupuestado(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Vincular a Categoría de Transacción (Opcional):
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            >
              <option value="">-- Sin categoría vinculada --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector de Ícono */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Ícono del Sobre:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {ICONS.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setIcono(i.id)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid',
                    borderColor: icono === i.id ? color : 'var(--color-border)',
                    backgroundColor: icono === i.id ? `${color}20` : 'var(--color-surface-2)',
                    color: icono === i.id ? color : 'var(--color-text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title={i.label}
                >
                  {i.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Color */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Color Distintivo:
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: c, border: color === c ? '3px solid #fff' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
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
              Guardar Sobre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
