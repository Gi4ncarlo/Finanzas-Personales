import { useState, useEffect } from 'react';
import { X, Wallet, Building2, Banknote, Smartphone, Briefcase, PiggyBank, Star, CreditCard } from 'lucide-react';

const TIPOS = [
  { value: 'banco', label: 'Banco' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'otro', label: 'Otro' },
];

const COLORES = ['#C9A84C', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#E67E22'];

const ICONOS = [
  { value: 'wallet', icon: Wallet, label: 'Billetera' },
  { value: 'building', icon: Building2, label: 'Banco' },
  { value: 'cash', icon: Banknote, label: 'Efectivo' },
  { value: 'credit-card', icon: CreditCard, label: 'Tarjeta' },
  { value: 'smartphone', icon: Smartphone, label: 'Digital' },
  { value: 'briefcase', icon: Briefcase, label: 'Trabajo' },
  { value: 'piggy-bank', icon: PiggyBank, label: 'Ahorro' },
  { value: 'star', icon: Star, label: 'Otro' },
];

export default function CuentaModal({ isOpen, onClose, onSave, cuenta = null }) {
  const isEditing = !!cuenta;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('banco');
  const [moneda, setMoneda] = useState('ARS');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [color, setColor] = useState(COLORES[0]);
  const [icono, setIcono] = useState('wallet');
  const [customColor, setCustomColor] = useState('#C9A84C');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cuenta) {
      setNombre(cuenta.nombre || '');
      setTipo(cuenta.tipo || 'banco');
      setMoneda(cuenta.moneda || 'ARS');
      setSaldoInicial(String(cuenta.saldo_inicial || 0));
      setColor(cuenta.color || COLORES[0]);
      setIcono(cuenta.icono || 'wallet');
    } else {
      setNombre('');
      setTipo('banco');
      setMoneda('ARS');
      setSaldoInicial('0');
      setColor(COLORES[0]);
      setIcono('wallet');
    }
    setError('');
  }, [cuenta, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    const monto = parseFloat(saldoInicial);
    if (isNaN(monto) || monto < 0) {
      setError('El saldo inicial debe ser un número mayor o igual a 0.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        tipo,
        moneda,
        saldo_inicial: monto,
        color,
        icono,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          width: '100%', maxWidth: '520px',
          maxHeight: '90vh', overflowY: 'auto',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Nombre *</label>
            <input className="input" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder='Ej: "Galicia Pesos"' />
          </div>

          {/* Tipo */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Tipo *</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Moneda */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '12px', fontSize: '0.9rem' }}>Moneda *</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[{ value: 'ARS', flag: '🇦🇷', label: 'Pesos' }, { value: 'USD', flag: '🇺🇸', label: 'Dólares' }].map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMoneda(m.value)}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer',
                    border: moneda === m.value ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                    backgroundColor: moneda === m.value ? 'rgba(201,168,76,0.1)' : 'var(--color-surface-2)',
                    color: 'var(--color-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    fontSize: '1rem', fontWeight: 500, transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{m.flag}</span>
                  <span>{m.label} ({m.value})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Saldo Inicial */}
          {!isEditing && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Saldo Inicial</label>
              <input className="input" type="number" step="0.01" min="0" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
            </div>
          )}

          {/* Color */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '12px', fontSize: '0.9rem' }}>Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {COLORES.map(c => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: color === c ? '3px solid var(--color-text)' : '2px solid transparent',
                    backgroundColor: c, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                />
              ))}
              <input
                type="color" value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value); }}
                style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Ícono */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '12px', fontSize: '0.9rem' }}>Ícono</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ICONOS.map(i => {
                const Icon = i.icon;
                return (
                  <button
                    key={i.value} type="button" onClick={() => setIcono(i.value)}
                    style={{
                      padding: '12px 8px', borderRadius: '8px', cursor: 'pointer',
                      border: icono === i.value ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                      backgroundColor: icono === i.value ? 'rgba(201,168,76,0.1)' : 'var(--color-surface-2)',
                      color: icono === i.value ? 'var(--color-gold)' : 'var(--color-text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={20} />
                    {i.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px', fontSize: '1rem', marginTop: '8px' }}>
            {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Cuenta')}
          </button>
        </form>
      </div>
    </div>
  );
}
