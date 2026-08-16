import { useState, useEffect } from 'react';
import { formatARS } from '../../utils/currency';
import { PlusCircle, MinusCircle, User, SlidersHorizontal, Tag, Wallet, FileText, Check, AlertCircle } from 'lucide-react';
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
  // Modos: 'egreso_casa' | 'ingreso_casa' | 'ingreso_personal' | 'reparto_comision'
  const [modo, setModo] = useState('reparto_comision');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Para reparto de comisiones mixtas
  const [montoCasaReparto, setMontoCasaReparto] = useState('');
  const [montoPersonalReparto, setMontoPersonalReparto] = useState('');
  const [porcentajeCasa, setPorcentajeCasa] = useState(80); // Default 80% Casa, 20% Personal (o editable libremente)

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setDescripcion('');
      setFecha(new Date().toISOString().slice(0, 10));
      setSelectedBucketId('');
      setSelectedAccountId('');
      setMontoCasaReparto('');
      setMontoPersonalReparto('');
      setError('');
    }
  }, [isOpen]);

  // Sincronizar montos de reparto cuando cambia el monto total en modo reparto
  const handleTotalMontoChange = (val) => {
    setMonto(val);
    const num = Number(val) || 0;
    if (num > 0 && modo === 'reparto_comision') {
      const c = Math.round(num * (porcentajeCasa / 100));
      setMontoCasaReparto(String(c));
      setMontoPersonalReparto(String(num - c));
    }
  };

  const handleMontoCasaChange = (val) => {
    setMontoCasaReparto(val);
    const numTotal = Number(monto) || 0;
    const numCasa = Number(val) || 0;
    if (numTotal >= numCasa) {
      setMontoPersonalReparto(String(numTotal - numCasa));
      if (numTotal > 0) {
        setPorcentajeCasa(Math.round((numCasa / numTotal) * 100));
      }
    }
  };

  const handleMontoPersonalChange = (val) => {
    setMontoPersonalReparto(val);
    const numTotal = Number(monto) || 0;
    const numPers = Number(val) || 0;
    if (numTotal >= numPers) {
      setMontoCasaReparto(String(numTotal - numPers));
      if (numTotal > 0) {
        setPorcentajeCasa(Math.round(((numTotal - numPers) / numTotal) * 100));
      }
    }
  };

  const handlePorcentajeChange = (pct) => {
    setPorcentajeCasa(pct);
    const num = Number(monto) || 0;
    if (num > 0) {
      const c = Math.round(num * (pct / 100));
      setMontoCasaReparto(String(c));
      setMontoPersonalReparto(String(num - c));
    }
  };

  if (!isOpen) return null;

  const montoNum = Number(monto) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (montoNum <= 0) {
      setError('Por favor ingresá un monto mayor a $0.');
      return;
    }

    if (!descripcion.trim()) {
      setError('Por favor indicá una descripción para el movimiento.');
      return;
    }

    setLoading(true);
    try {
      if (modo === 'reparto_comision') {
        const numCasa = Number(montoCasaReparto) || 0;
        const numPersonal = Number(montoPersonalReparto) || 0;
        if (numCasa + numPersonal <= 0) {
          setError('El reparto entre Casa y Personal debe ser mayor a 0.');
          setLoading(false);
          return;
        }

        await onAddFunds({
          modo: 'reparto_comision',
          tipo: 'ingreso',
          monto: montoNum,
          montoCasa: numCasa,
          montoPersonal: numPersonal,
          descripcion: descripcion.trim(),
          fecha,
          bucketId: selectedBucketId || null,
          accountId: selectedAccountId || null
        });
      } else if (modo === 'ingreso_personal') {
        await onAddFunds({
          modo: 'ingreso_personal',
          tipo: 'ingreso',
          esPersonal: true,
          monto: montoNum,
          descripcion: descripcion.trim(),
          fecha,
          bucketId: null,
          accountId: selectedAccountId || null
        });
      } else if (modo === 'ingreso_casa') {
        await onAddFunds({
          modo: 'ingreso_casa',
          tipo: 'ingreso',
          esCasa: true,
          monto: montoNum,
          descripcion: descripcion.trim(),
          fecha,
          bucketId: selectedBucketId || null,
          accountId: selectedAccountId || null
        });
      } else {
        // egreso_casa (gasto puntual)
        await onAddFunds({
          modo: 'egreso_casa',
          tipo: 'egreso',
          esCasa: true,
          monto: montoNum,
          descripcion: descripcion.trim(),
          fecha,
          bucketId: selectedBucketId || null,
          accountId: selectedAccountId || null
        });
      }

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
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '560px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Selector de Modos Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '20px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => { setModo('reparto_comision'); setError(''); }}
            style={{
              padding: '8px 4px', borderRadius: '6px', border: 'none',
              backgroundColor: modo === 'reparto_comision' ? 'var(--color-gold)' : 'transparent',
              color: modo === 'reparto_comision' ? '#000' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center'
            }}
          >
            ⚖️ Repartir Comisión
          </button>

          <button
            type="button"
            onClick={() => { setModo('ingreso_casa'); setError(''); }}
            style={{
              padding: '8px 4px', borderRadius: '6px', border: 'none',
              backgroundColor: modo === 'ingreso_casa' ? '#61AFEF' : 'transparent',
              color: modo === 'ingreso_casa' ? '#000' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center'
            }}
          >
            🏠 + Fondo Casa
          </button>

          <button
            type="button"
            onClick={() => { setModo('ingreso_personal'); setError(''); }}
            style={{
              padding: '8px 4px', borderRadius: '6px', border: 'none',
              backgroundColor: modo === 'ingreso_personal' ? '#98C379' : 'transparent',
              color: modo === 'ingreso_personal' ? '#000' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center'
            }}
          >
            👤 + Dinero Mío
          </button>

          <button
            type="button"
            onClick={() => { setModo('egreso_casa'); setError(''); }}
            style={{
              padding: '8px 4px', borderRadius: '6px', border: 'none',
              backgroundColor: modo === 'egreso_casa' ? '#E06C75' : 'transparent',
              color: modo === 'egreso_casa' ? '#FFF' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center'
            }}
          >
            🛒 - Gasto Hogar
          </button>
        </div>

        {/* Header Explicativo */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {modo === 'reparto_comision' && '⚖️ Repartir Ingreso / Comisión Mixta'}
            {modo === 'ingreso_casa' && '🏠 Aporte / Ingreso al Fondo de la Casa'}
            {modo === 'ingreso_personal' && '👤 Ingreso Personal (Dinero Mío)'}
            {modo === 'egreso_casa' && '🛒 Registrar Gasto Puntual del Hogar'}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
            {modo === 'reparto_comision' && 'Ingresá el cobro total y definí con exactitud cuánto va al Fondo de la Casa y cuánto a tu Dinero Personal.'}
            {modo === 'ingreso_casa' && 'Sumá fondos directamente para el presupuesto y sobres del hogar.'}
            {modo === 'ingreso_personal' && 'Ingreso exclusivo para tus finanzas personales (no altera el presupuesto del hogar).'}
            {modo === 'egreso_casa' && 'Gasto de la casa (ej: pizza, supermercado, vacunas) que descuenta del fondo del hogar.'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(224, 108, 117, 0.12)', color: '#E06C75', border: '1px solid rgba(224, 108, 117, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Descripción */}
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
              placeholder={
                modo === 'reparto_comision' ? 'Ej. Cobro de Comisiones Mensuales' :
                modo === 'ingreso_casa' ? 'Ej. Aporte para gastos del mes' :
                modo === 'ingreso_personal' ? 'Ej. Comisión propia / Bono personal' :
                'Ej. Pizza cena, Vacunas perros, Nafta'
              }
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Monto Total & Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                {modo === 'reparto_comision' ? 'Monto Cobrado Total (ARS) *' : 'Monto (ARS) *'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gold)', fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={monto}
                  onChange={(e) => handleTotalMontoChange(e.target.value)}
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

          {/* Sección de Reparto Dinámico si modo es 'reparto_comision' */}
          {modo === 'reparto_comision' && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gold)' }}>
                  División de Fondos:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[50, 70, 80].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePorcentajeChange(pct)}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--color-border)',
                        backgroundColor: porcentajeCasa === pct ? 'var(--color-gold)' : 'var(--color-surface-2)',
                        color: porcentajeCasa === pct ? '#000' : 'var(--color-text-muted)',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {pct}% Casa
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Parte Casa */}
                <div style={{ backgroundColor: 'rgba(97, 175, 239, 0.08)', border: '1px solid rgba(97, 175, 239, 0.3)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#61AFEF', fontWeight: 700, marginBottom: '4px' }}>
                    🏠 Para la Casa ({porcentajeCasa}%):
                  </label>
                  <input
                    type="number"
                    value={montoCasaReparto}
                    onChange={(e) => handleMontoCasaChange(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '8px', borderRadius: '6px',
                      backgroundColor: 'var(--color-surface)', border: '1px solid #61AFEF',
                      color: '#61AFEF', fontSize: '1rem', fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Aumenta Fondo Casa
                  </span>
                </div>

                {/* Parte Personal */}
                <div style={{ backgroundColor: 'rgba(152, 195, 121, 0.08)', border: '1px solid rgba(152, 195, 121, 0.3)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#98C379', fontWeight: 700, marginBottom: '4px' }}>
                    👤 Para Mí ({100 - porcentajeCasa}%):
                  </label>
                  <input
                    type="number"
                    value={montoPersonalReparto}
                    onChange={(e) => handleMontoPersonalChange(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '8px', borderRadius: '6px',
                      backgroundColor: 'var(--color-surface)', border: '1px solid #98C379',
                      color: '#98C379', fontSize: '1rem', fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Aumenta Dinero Mío
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sobre del Hogar (si aplica) */}
          {(modo === 'egreso_casa' || modo === 'ingreso_casa' || modo === 'reparto_comision') && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                <Tag size={15} />
                <span>Sobre del Hogar a Asignar (Opcional)</span>
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
                <option value="">— General Hogar / Fondo Común —</option>
                {buckets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({formatARS(b.monto_presupuestado)}/mes)
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <option value="">— Sin asociar a cuenta específica —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda}) — Saldo: {a.moneda === 'USD' ? `US$ ${a.saldo_inicial || 0}` : formatARS(a.saldo_inicial || 0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botones Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-border)',
                backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-gold)', color: '#000', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1
              }}
            >
              <Check size={18} />
              <span>{loading ? 'Guardando...' : 'Confirmar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
