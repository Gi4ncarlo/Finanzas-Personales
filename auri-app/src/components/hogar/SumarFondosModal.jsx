import { useState } from 'react';
import { formatARS } from '../../utils/currency';
import { PlusCircle, MinusCircle, Home, User, DollarSign, ArrowRight } from 'lucide-react';

export default function SumarFondosModal({
  isOpen,
  onClose,
  onAddFunds,
  accounts = [],
  currentSaldoManual = 0,
  currentMontoCasa = 0
}) {
  const [modo, setModo] = useState('sumar'); // 'sumar' | 'restar'
  const [monto, setMonto] = useState('');
  const [destino, setDestino] = useState('casa'); // 'casa' | 'personal' | 'ambos'
  const [porcentajeCasa, setPorcentajeCasa] = useState(60); // Para modo 'ambos'
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const montoNum = Number(monto) || 0;
  
  let parteCasa = 0;
  let partePersonal = 0;

  if (destino === 'casa') {
    parteCasa = montoNum;
  } else if (destino === 'personal') {
    partePersonal = montoNum;
  } else if (destino === 'ambos') {
    parteCasa = Math.round(montoNum * (porcentajeCasa / 100));
    partePersonal = montoNum - parteCasa;
  }

  const esSumar = modo === 'sumar';
  const cambioCasa = esSumar ? parteCasa : -parteCasa;
  const cambioPersonal = esSumar ? partePersonal : -partePersonal;
  const cambioTotal = esSumar ? montoNum : -montoNum;

  const nuevoSaldoTotal = Math.max(0, currentSaldoManual + cambioTotal);
  const nuevoMontoCasa = Math.max(0, currentMontoCasa + cambioCasa);
  const currentPersonal = currentSaldoManual - currentMontoCasa;
  const nuevoMontoPersonal = Math.max(0, currentPersonal + cambioPersonal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (montoNum <= 0) {
      setError('Por favor ingresá un monto mayor a 0.');
      return;
    }

    setLoading(true);
    try {
      await onAddFunds({
        monto: cambioTotal,
        aumentoCasa: cambioCasa,
        aumentoPersonal: cambioPersonal,
        modo,
        accountId: selectedAccountId || null
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al actualizar fondos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${esSumar ? 'var(--color-gold)' : '#E06C75'}`,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '520px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
      }}>
        {/* Modos Switch Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setModo('sumar')}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: esSumar ? 'var(--color-gold)' : 'transparent',
              color: esSumar ? '#000' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem'
            }}
          >
            <PlusCircle size={18} />
            <span>+ Sumar / Ingresar</span>
          </button>

          <button
            type="button"
            onClick={() => setModo('restar')}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: !esSumar ? '#E06C75' : 'transparent',
              color: !esSumar ? '#FFF' : 'var(--color-text-muted)',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem'
            }}
          >
            <MinusCircle size={18} />
            <span>- Restar / Ajustar</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: esSumar ? 'rgba(201, 168, 76, 0.15)' : 'rgba(224, 108, 117, 0.15)', color: esSumar ? 'var(--color-gold)' : '#E06C75' }}>
            {esSumar ? <PlusCircle size={24} /> : <MinusCircle size={24} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: esSumar ? 'var(--color-gold)' : '#E06C75', fontFamily: 'Georgia, serif' }}>
              {esSumar ? 'Sumar Fondos al Presupuesto' : 'Restar / Ajustar Fondos'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {esSumar 
                ? 'Ingresá capital para actualizar tu saldo total, presupuesto de casa y disponible.' 
                : 'Restá o corregí un error de tipeo/descuento en tu saldo y presupuesto de casa.'}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Monto Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
              {esSumar ? 'Monto a Ingresar (ARS):' : 'Monto a Restar / Ajustar (ARS):'}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: esSumar ? 'var(--color-gold)' : '#E06C75', fontWeight: 700 }}>$</span>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder={esSumar ? "Ej. 250000" : "Ej. 50000"}
                style={{
                  width: '100%', padding: '12px 12px 12px 28px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '1.1rem', fontWeight: 600
                }}
              />
            </div>
          </div>

          {/* Destino / Origen de los fondos */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 500 }}>
              {esSumar ? 'Destino del Ingreso:' : 'Origen del Descuento / Ajuste:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDestino('casa')}
                style={{
                  padding: '12px 8px', borderRadius: '8px',
                  border: `2px solid ${destino === 'casa' ? '#61AFEF' : 'var(--color-border)'}`,
                  backgroundColor: destino === 'casa' ? 'rgba(97, 175, 239, 0.15)' : 'var(--color-surface-2)',
                  color: destino === 'casa' ? '#61AFEF' : 'var(--color-text-muted)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}
              >
                <Home size={18} />
                <span>100% Casa</span>
              </button>

              <button
                type="button"
                onClick={() => setDestino('personal')}
                style={{
                  padding: '12px 8px', borderRadius: '8px',
                  border: `2px solid ${destino === 'personal' ? '#98C379' : 'var(--color-border)'}`,
                  backgroundColor: destino === 'personal' ? 'rgba(152, 195, 121, 0.15)' : 'var(--color-surface-2)',
                  color: destino === 'personal' ? '#98C379' : 'var(--color-text-muted)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}
              >
                <User size={18} />
                <span>100% Mío</span>
              </button>

              <button
                type="button"
                onClick={() => setDestino('ambos')}
                style={{
                  padding: '12px 8px', borderRadius: '8px',
                  border: `2px solid ${destino === 'ambos' ? 'var(--color-gold)' : 'var(--color-border)'}`,
                  backgroundColor: destino === 'ambos' ? 'rgba(201, 168, 76, 0.15)' : 'var(--color-surface-2)',
                  color: destino === 'ambos' ? 'var(--color-gold)' : 'var(--color-text-muted)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}
              >
                <DollarSign size={18} />
                <span>Repartir %</span>
              </button>
            </div>
          </div>

          {/* Slider de porcentaje si eligió 'ambos' */}
          {destino === 'ambos' && (
            <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#61AFEF' }}>Casa: {porcentajeCasa}% ({formatARS(parteCasa)})</span>
                <span style={{ color: '#98C379' }}>Mío: {100 - porcentajeCasa}% ({formatARS(partePersonal)})</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={porcentajeCasa}
                onChange={(e) => setPorcentajeCasa(Number(e.target.value))}
                style={{ width: '100%', accentColor: esSumar ? 'var(--color-gold)' : '#E06C75', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Selector opcional de cuenta bancaria */}
          {accounts.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
                Asociar a Cuenta Bancaria / Billetera (Opcional):
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
                <option value="">— Ninguna (Solo ajuste virtual) —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nombre} ({acc.moneda} {formatARS(acc.saldo_inicial || 0)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Previsualización en Vivo */}
          <div style={{
            backgroundColor: esSumar ? 'rgba(201, 168, 76, 0.06)' : 'rgba(224, 108, 117, 0.06)',
            border: `1px solid ${esSumar ? 'rgba(201, 168, 76, 0.3)' : 'rgba(224, 108, 117, 0.3)'}`,
            borderRadius: '12px',
            padding: '14px',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontWeight: 700, color: esSumar ? 'var(--color-gold)' : '#E06C75', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
              ✦ IMPACTO DIRECTO TRAS {esSumar ? 'SUMAR FONDOS' : 'RESTAR / AJUSTAR'}:
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Saldo Total en Cuenta:</span>
              <span style={{ fontWeight: 700, color: '#FFF' }}>
                {formatARS(currentSaldoManual)} <ArrowRight size={12} style={{ margin: '0 4px' }} /> {formatARS(nuevoSaldoTotal)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#61AFEF' }}>Fondo Casa Asignado:</span>
              <span style={{ fontWeight: 700, color: '#61AFEF' }}>
                {formatARS(currentMontoCasa)} <ArrowRight size={12} style={{ margin: '0 4px' }} /> {formatARS(nuevoMontoCasa)} ({esSumar ? '+' : ''}{formatARS(cambioCasa)})
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#98C379' }}>Dinero Mío Personal:</span>
              <span style={{ fontWeight: 700, color: '#98C379' }}>
                {formatARS(currentPersonal)} <ArrowRight size={12} style={{ margin: '0 4px' }} /> {formatARS(nuevoMontoPersonal)} ({esSumar ? '+' : ''}{formatARS(cambioPersonal)})
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
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
              disabled={loading || montoNum <= 0}
              style={{
                padding: '10px 22px', borderRadius: '8px', border: 'none',
                backgroundColor: esSumar ? 'var(--color-gold)' : '#E06C75',
                color: esSumar ? '#000' : '#FFF', fontWeight: 700,
                cursor: loading || montoNum <= 0 ? 'not-allowed' : 'pointer',
                opacity: loading || montoNum <= 0 ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {loading ? 'Guardando...' : (esSumar ? 'Confirmar e Ingresar Fondos' : 'Confirmar y Restar Fondos')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

