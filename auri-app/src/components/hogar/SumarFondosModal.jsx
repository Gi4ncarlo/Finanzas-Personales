import { useState, useEffect } from 'react';
import { formatARS } from '../../utils/currency';
import { PlusCircle, MinusCircle, Calendar, Wallet, Tag, FileText, Check, AlertCircle } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';

export default function SumarFondosModal({
  isOpen,
  onClose,
  onAddFunds,
  accounts = [],
  buckets = [],
  currentSaldoManual = 0,
  currentMontoCasa = 0,
  currentPresupuestoPrevisto = 3000000,
  totalGastadoCasa = 0
}) {
  const [modo, setModo] = useState('egreso'); // 'egreso' (Gasto puntual) | 'ingreso' (Sumar/Aporte a la casa)
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setDescripcion('');
      setFecha(new Date().toISOString().slice(0, 10));
      setSelectedBucketId('');
      setSelectedAccountId('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const montoNum = Number(monto) || 0;
  const esGasto = modo === 'egreso';

  // Fondos calculados para preview
  const fondoCasaDisponibleActual = Math.max(0, currentMontoCasa - totalGastadoCasa);
  const nuevoFondoCasaDisponible = esGasto
    ? Math.max(0, fondoCasaDisponibleActual - montoNum)
    : fondoCasaDisponibleActual + montoNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (montoNum <= 0) {
      setError('Por favor ingresá un monto mayor a $0.');
      return;
    }

    if (!descripcion.trim()) {
      setError('Por favor indicá una descripción para el registro (ej. "Pizza para la noche", "Vacunas perros", "Aporte mensual sueldo").');
      return;
    }

    setLoading(true);
    try {
      await onAddFunds({
        modo,
        tipo: modo, // 'egreso' | 'ingreso'
        monto: montoNum,
        descripcion: descripcion.trim(),
        fecha,
        bucketId: selectedBucketId || null,
        accountId: selectedAccountId || null
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.82)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${esGasto ? '#E06C75' : 'var(--color-gold)'}`,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '520px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Modos Switch Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => { setModo('egreso'); setError(''); }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: esGasto ? '#E06C75' : 'transparent',
              color: esGasto ? '#FFF' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
          >
            <MinusCircle size={18} />
            <span>- Gasto Puntual Hogar</span>
          </button>

          <button
            type="button"
            onClick={() => { setModo('ingreso'); setError(''); }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: !esGasto ? 'var(--color-gold)' : 'transparent',
              color: !esGasto ? '#000' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
          >
            <PlusCircle size={18} />
            <span>+ Sumar / Aporte a Casa</span>
          </button>
        </div>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: esGasto ? 'rgba(224, 108, 117, 0.15)' : 'rgba(201, 168, 76, 0.15)', color: esGasto ? '#E06C75' : 'var(--color-gold)' }}>
            {esGasto ? <MinusCircle size={24} /> : <PlusCircle size={24} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: esGasto ? '#E06C75' : 'var(--color-gold)' }}>
              {esGasto ? 'Registrar Gasto Puntual del Hogar' : 'Sumar Fondos / Aporte a la Casa'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
              {esGasto
                ? 'Registrá un gasto puntual de la casa (ej: pizza, vacunas del perro). Quedará guardado en el historial de gastos sin alterar tu presupuesto mensual previsto.'
                : 'Sumá dinero destinado al hogar (ej: aporte mensual de sueldo). Quedará guardado en el historial y aumentará el fondo disponible.'}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(224, 108, 117, 0.12)', color: '#E06C75', border: '1px solid rgba(224, 108, 117, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Descripción Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              <FileText size={15} />
              <span>Descripción del Movimiento *</span>
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={esGasto ? "Ej. Pizza para cenar, Vacunas perros, Lavandina" : "Ej. Aporte mensual de sueldo a la casa"}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Monto & Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Monto (ARS) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: esGasto ? '#E06C75' : 'var(--color-gold)', fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%', padding: '10px 12px 10px 28px', borderRadius: '8px',
                    backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text)', fontSize: '1.05rem', fontWeight: 700
                  }}
                />
              </div>
            </div>

            <div>
              <DatePickerModern
                label="Fecha"
                value={fecha}
                onChange={(val) => setFecha(val || new Date().toISOString().slice(0, 10))}
                align="right"
              />
            </div>
          </div>

          {/* Sobre del Hogar */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              <Tag size={15} />
              <span>Sobre del Hogar (Opcional)</span>
            </label>
            <select
              value={selectedBucketId}
              onChange={(e) => setSelectedBucketId(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.9rem'
              }}
            >
              <option value="">— General Hogar / Sin sobre específico —</option>
              {buckets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre} ({formatARS(b.monto_presupuestado)}/mes)
                </option>
              ))}
            </select>
          </div>

          {/* Cuenta Bancaria */}
          {accounts.length > 0 && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                <Wallet size={15} />
                <span>Asociar a Cuenta Bancaria / Billetera (Opcional)</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem'
                }}
              >
                <option value="">— Ninguna (Solo ajuste de caja virtual) —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nombre} ({acc.moneda} {formatARS(acc.saldo_inicial || 0)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Preview Box */}
          <div style={{
            backgroundColor: esGasto ? 'rgba(224, 108, 117, 0.08)' : 'rgba(201, 168, 76, 0.08)',
            border: `1px solid ${esGasto ? 'rgba(224, 108, 117, 0.3)' : 'rgba(201, 168, 76, 0.3)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontWeight: 700, color: esGasto ? '#E06C75' : 'var(--color-gold)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              ✦ Resumen del Impacto:
            </div>
            <div style={{ color: 'var(--color-text)' }}>
              • Registro formal: <strong>"{descripcion || 'Sin descripción'}"</strong> por <strong>{formatARS(montoNum)}</strong>
            </div>
            <div style={{ color: 'var(--color-text)' }}>
              • Fondo Disponible de Casa: <strong>{formatARS(fondoCasaDisponibleActual)}</strong> → <strong style={{ color: esGasto ? '#E06C75' : '#98C379' }}>{formatARS(nuevoFondoCasaDisponible)}</strong>
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
              🛡️ Presupuesto mensual previsto: Intacto ({formatARS(currentPresupuestoPrevisto)})
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-border)',
                backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || montoNum <= 0 || !descripcion.trim()}
              style={{
                padding: '10px 22px', borderRadius: '8px', border: 'none',
                backgroundColor: esGasto ? '#E06C75' : 'var(--color-gold)',
                color: esGasto ? '#FFF' : '#000', fontWeight: 700,
                cursor: loading || montoNum <= 0 || !descripcion.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || montoNum <= 0 || !descripcion.trim() ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loading ? 'Guardando...' : (
                <>
                  <Check size={16} />
                  <span>{esGasto ? 'Guardar Gasto Puntual' : 'Confirmar Ingreso a Casa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
