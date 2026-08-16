import { useState, useEffect } from 'react';
import { formatARS } from '../../utils/currency';
import { Send, Calendar, Folder, Check, AlertCircle, X, ArrowDownLeft } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';

export default function TransferenciaGastoHogarModal({
  isOpen,
  onClose,
  onAddFunds,
  buckets = [],
  currentFondoCasa = 0
}) {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBucketId, setSelectedBucketId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setDescripcion('');
      setError('');
      setFecha(new Date().toISOString().slice(0, 10));
      setSelectedBucketId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const montoNum = Number(monto) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (montoNum <= 0) {
      setError('Por favor ingresá un monto válido mayor a $0.');
      return;
    }

    if (!descripcion.trim()) {
      setError('Por favor ingresá una breve descripción.');
      return;
    }

    setLoading(true);
    try {
      await onAddFunds({
        modo: 'egreso_casa',
        tipo: 'egreso',
        esCasa: true,
        monto: montoNum,
        descripcion: descripcion.trim(),
        fecha,
        bucketId: selectedBucketId || null
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al registrar el gasto de la casa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)', zIndex: 2100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        backgroundColor: '#161B26',
        border: '1px solid rgba(224, 108, 117, 0.4)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '440px',
        width: '100%',
        color: '#F0F3F8',
        boxShadow: '0 20px 50px rgba(0,0,0,0.85)'
      }}>
        {/* Header simple */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(224, 108, 117, 0.15)', color: '#FF7B72',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                Gasto / Transferencia Hogar
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#9DA8BA' }}>
                Descuenta del Fondo Casa ({formatARS(currentFondoCasa)})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: '#9DA8BA', cursor: 'pointer', padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(224, 108, 117, 0.15)', color: '#FF7B72', border: '1px solid rgba(224, 108, 117, 0.4)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Monto */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#9DA8BA', marginBottom: '4px', fontWeight: 600 }}>
              Monto a descontar ($) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0,00"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                backgroundColor: '#1E2536', border: '1px solid #E06C75',
                color: '#FFF', fontSize: '1.25rem', fontWeight: 800
              }}
            />
          </div>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#9DA8BA', marginBottom: '4px', fontWeight: 600 }}>
              Descripción *
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Transferencia a Mamá, Veterinario perro, Super..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                backgroundColor: '#1E2536', border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF', fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Fecha y Sobre en 2 columnas limpias */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#9DA8BA', marginBottom: '4px', fontWeight: 600 }}>
                <Calendar size={13} />
                <span>Fecha</span>
              </label>
              <DatePickerModern value={fecha} onChange={setFecha} />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#9DA8BA', marginBottom: '4px', fontWeight: 600 }}>
                <Folder size={13} />
                <span>Sobre (Opcional)</span>
              </label>
              <select
                value={selectedBucketId}
                onChange={(e) => setSelectedBucketId(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: '#1E2536', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFF', fontSize: '0.82rem'
                }}
              >
                <option value="">General Hogar</option>
                {buckets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 16px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent', color: '#9DA8BA',
                fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || montoNum <= 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', borderRadius: '8px', border: 'none',
                backgroundColor: '#E06C75', color: '#FFF',
                fontWeight: 700, fontSize: '0.88rem', cursor: loading || montoNum <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(224, 108, 117, 0.3)',
                opacity: loading || montoNum <= 0 ? 0.6 : 1
              }}
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Descontar {montoNum > 0 ? formatARS(montoNum) : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
