import { useState } from 'react';
import { formatARS } from '../../utils/currency';
import { Calculator, X, Home, User, Check, Sparkles, ArrowRight } from 'lucide-react';

export default function DistribuirIngresoModal({ isOpen, onClose, settings, buckets, onApplyDistribution }) {
  const [montoIngreso, setMontoIngreso] = useState('1000000');

  if (!isOpen) return null;

  const ingreso = Number(montoIngreso) || 0;
  const reglaTipo = settings?.regla_tipo || 'porcentaje';
  const porcentaje = Number(settings?.porcentaje_casa) || 60;
  const montoFijo = Number(settings?.monto_fijo_casa) || 600000;

  // Fraccionamiento global
  let montoParaCasa = 0;
  let montoParaPersonal = 0;

  if (reglaTipo === 'porcentaje') {
    montoParaCasa = ingreso * (porcentaje / 100);
    montoParaPersonal = ingreso - montoParaCasa;
  } else {
    montoParaCasa = Math.min(ingreso, montoFijo);
    montoParaPersonal = Math.max(0, ingreso - montoParaCasa);
  }

  // Presupuesto total de los sobres
  const totalPresupuestadoSobres = buckets.reduce((acc, b) => acc + Number(b.monto_presupuestado || 0), 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '560px',
        width: '100%',
        color: 'var(--color-text)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} /> Distribuir Ingreso / Sueldo
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Calcula automáticamente cómo fraccionar tu sueldo o ingreso recibido entre los gastos del hogar y tu dinero personal.
        </p>

        {/* Input Sueldo */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '6px' }}>
            Monto del Ingreso a Distribuir (ARS):
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={montoIngreso}
              onChange={(e) => setMontoIngreso(e.target.value)}
              placeholder="Ej. 1000000"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'var(--color-surface-2)', border: '2px solid var(--color-gold)',
                color: '#fff', fontSize: '1.3rem', fontWeight: 700
              }}
            />
          </div>
        </div>

        {/* Resumen del Reparto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Tarjeta Casa */}
          <div style={{
            backgroundColor: 'rgba(97, 175, 239, 0.1)',
            border: '1px solid rgba(97, 175, 239, 0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#61AFEF', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
              <Home size={16} /> Destinado a la Casa
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#61AFEF' }}>
              {formatARS(montoParaCasa)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {reglaTipo === 'porcentaje' ? `${porcentaje}% del ingreso` : 'Monto fijo configurado'}
            </div>
          </div>

          {/* Tarjeta Personal */}
          <div style={{
            backgroundColor: 'rgba(201, 168, 76, 0.1)',
            border: '1px solid rgba(201, 168, 76, 0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-gold)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
              <User size={16} /> Fondo Personal Libre
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-gold)' }}>
              {formatARS(montoParaPersonal)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Para compras tuyas, ahorros e inversiones
            </div>
          </div>
        </div>

        {/* Desglose en Sobres de Casa */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Asignación a Sobres de Casa:</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Meta Total: {formatARS(totalPresupuestadoSobres)}
            </span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {buckets.map((bucket) => {
              const pres = Number(bucket.monto_presupuestado || 0);
              // Proporcional o completo según disponibilidad de casa
              let asignadoSobre = 0;
              if (totalPresupuestadoSobres > 0) {
                asignadoSobre = Math.min(pres, (montoParaCasa * (pres / totalPresupuestadoSobres)));
              }

              return (
                <div
                  key={bucket.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', backgroundColor: 'var(--color-surface-2)',
                    borderRadius: '8px', fontSize: '0.85rem'
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
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyDistribution({ ingreso, montoParaCasa, montoParaPersonal });
              onClose();
            }}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              backgroundColor: 'var(--color-gold)', color: '#000', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Check size={18} /> Entendido / Aplicar Reparto
          </button>
        </div>
      </div>
    </div>
  );
}
