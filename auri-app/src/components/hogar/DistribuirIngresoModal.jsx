import { useState } from 'react';
import { formatARS } from '../../utils/currency';
import { Calculator, X, Home, User, Check, Sparkles, ArrowRight, Tag } from 'lucide-react';

export default function DistribuirIngresoModal({ isOpen, onClose, settings, buckets = [], onApplyDistribution }) {
  const [montoIngreso, setMontoIngreso] = useState('10000000');
  const [porcentaje, setPorcentaje] = useState(80); // Default 80% Casa, 20% Personal (configurable)
  const [reglaTipo, setReglaTipo] = useState('porcentaje'); // 'porcentaje' | 'fijo' | 'custom'
  const [montoFijoCasa, setMontoFijoCasa] = useState('8000000');

  if (!isOpen) return null;

  const ingreso = Number(montoIngreso) || 0;

  // Fraccionamiento global
  let montoParaCasa = 0;
  let montoParaPersonal = 0;

  if (reglaTipo === 'porcentaje') {
    montoParaCasa = Math.round(ingreso * (porcentaje / 100));
    montoParaPersonal = ingreso - montoParaCasa;
  } else {
    montoParaCasa = Math.min(ingreso, Number(montoFijoCasa) || 0);
    montoParaPersonal = Math.max(0, ingreso - montoParaCasa);
  }

  // Presupuesto total de los sobres
  const totalPresupuestadoSobres = buckets.reduce((acc, b) => acc + Number(b.monto_presupuestado || 0), 0);

  const handleApply = () => {
    onApplyDistribution({
      ingreso,
      montoParaCasa,
      montoParaPersonal,
      porcentajeCasa: porcentaje,
      descripcion: `Distribución de Ingreso: ${formatARS(ingreso)} (${formatARS(montoParaCasa)} Casa / ${formatARS(montoParaPersonal)} Personal)`
    });
    onClose();
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
        border: '1px solid var(--color-gold)',
        borderRadius: '18px',
        padding: '26px',
        maxWidth: '600px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            <Sparkles size={22} /> Repartidor Rápido de Ingresos / Comisiones
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: '1.4' }}>
          Fracciona de forma automática y equitativa el dinero cobrado entre el Fondo del Hogar y tu Dinero Personal, registrando los ingresos con exactitud.
        </p>

        {/* Input Ingreso Cobrado */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700, marginBottom: '6px' }}>
            Monto Total Cobrado / Ingreso a Repartir (ARS):
          </label>
          <input
            type="number"
            value={montoIngreso}
            onChange={(e) => setMontoIngreso(e.target.value)}
            placeholder="Ej. 10000000"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              backgroundColor: 'var(--color-surface-2)', border: '2px solid var(--color-gold)',
              color: '#fff', fontSize: '1.3rem', fontWeight: 700
            }}
          />
        </div>

        {/* Selector de Regla */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600 }}>
              Regla de Repartición:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[50, 70, 80].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => { setReglaTipo('porcentaje'); setPorcentaje(pct); }}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                    backgroundColor: reglaTipo === 'porcentaje' && porcentaje === pct ? 'var(--color-gold)' : 'var(--color-surface-2)',
                    color: reglaTipo === 'porcentaje' && porcentaje === pct ? '#000' : 'var(--color-text-muted)',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {pct}% Casa
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen del Reparto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
          {/* Tarjeta Casa */}
          <div style={{
            backgroundColor: 'rgba(97, 175, 239, 0.1)',
            border: '1px solid rgba(97, 175, 239, 0.3)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#61AFEF', fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>
              <Home size={16} /> Destinado a la Casa ({porcentaje}%)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#61AFEF' }}>
              {formatARS(montoParaCasa)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Aumenta el Fondo Casa
            </div>
          </div>

          {/* Tarjeta Personal */}
          <div style={{
            backgroundColor: 'rgba(152, 195, 121, 0.1)',
            border: '1px solid rgba(152, 195, 121, 0.3)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#98C379', fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>
              <User size={16} /> Dinero Mío ({100 - porcentaje}%)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#98C379' }}>
              {formatARS(montoParaPersonal)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Aumenta tu saldo personal
            </div>
          </div>
        </div>

        {/* Desglose en Sobres de Casa */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Asignación estimada a Sobres de Casa:</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Presupuesto Sobres: {formatARS(totalPresupuestadoSobres)}
            </span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
            {buckets.map((bucket) => {
              const pres = Number(bucket.monto_presupuestado || 0);
              let asignadoSobre = 0;
              if (totalPresupuestadoSobres > 0) {
                asignadoSobre = Math.min(pres, Math.round(montoParaCasa * (pres / totalPresupuestadoSobres)));
              }

              return (
                <div
                  key={bucket.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', backgroundColor: 'var(--color-surface-2)',
                    borderRadius: '8px', fontSize: '0.82rem'
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{bucket.nombre}</span>
                  <span style={{ fontWeight: 700, color: '#61AFEF' }}>{formatARS(asignadoSobre)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
            type="button"
            onClick={handleApply}
            style={{
              padding: '10px 22px', borderRadius: '8px', border: 'none',
              backgroundColor: 'var(--color-gold)', color: '#000', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Check size={18} /> Aplicar Reparto y Registrar Ingresos
          </button>
        </div>
      </div>
    </div>
  );
}
