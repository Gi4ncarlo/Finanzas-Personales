import { useState } from 'react';
import { formatARS } from '../../utils/currency';
import { Calendar, CheckCircle2, Clock, Plus, Edit2, Trash2, Zap, AlertCircle } from 'lucide-react';

export default function ServiciosChecklist({
  services,
  paidState,
  onTogglePaid,
  onAddService,
  onEditService,
  onDeleteService,
  onPayAndRegisterTransaction
}) {
  const [filter, setFilter] = useState('todos'); // 'todos' | 'pendientes' | 'pagados'

  const hoy = new Date();
  const diaActual = hoy.getDate();

  // Filtrado
  const filteredServices = services.filter((s) => {
    const isPaid = !!paidState[s.id];
    if (filter === 'pendientes') return !isPaid;
    if (filter === 'pagados') return isPaid;
    return true;
  });

  // Totales
  const totalEstimado = services.reduce((acc, s) => acc + Number(s.monto_estimado || 0), 0);
  const totalPagado = services.filter(s => paidState[s.id]).reduce((acc, s) => acc + Number(s.monto_estimado || 0), 0);
  const totalPendiente = totalEstimado - totalPagado;

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '32px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--color-gold)' }} />
            Control de Servicios y Gastos Fijos de Casa
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Vencimientos de servicios básicos (luz, agua, internet, alquiler) del mes actual.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onAddService}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(201, 168, 76, 0.15)', color: 'var(--color-gold)',
              border: '1px solid rgba(201, 168, 76, 0.3)', borderRadius: '8px',
              padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            <Plus size={16} /> Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Bar de Resumen de Servicios */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
        backgroundColor: 'var(--color-surface-2)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Servicios Mes</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>{formatARS(totalEstimado)}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pagado</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatARS(totalPagado)}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pendiente</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: totalPendiente > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {formatARS(totalPendiente)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['todos', 'pendientes', 'pagados'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px', borderRadius: '20px', border: '1px solid',
              borderColor: filter === f ? 'var(--color-gold)' : 'var(--color-border)',
              backgroundColor: filter === f ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
              color: filter === f ? 'var(--color-gold)' : 'var(--color-text-muted)',
              fontSize: '0.8rem', fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista de Servicios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No hay servicios en esta categoría.
          </div>
        ) : (
          filteredServices.map((service) => {
            const isPaid = !!paidState[service.id];
            const diaVenc = service.dia_vencimiento;
            const esVencido = !isPaid && diaVenc < diaActual;
            const proximo = !isPaid && diaVenc >= diaActual && (diaVenc - diaActual <= 3);

            return (
              <div
                key={service.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: isPaid ? 'rgba(255, 255, 255, 0.02)' : 'var(--color-surface-2)',
                  border: '1px solid',
                  borderColor: esVencido ? 'rgba(224, 108, 117, 0.4)' : isPaid ? 'var(--color-border)' : 'var(--color-border)',
                  borderRadius: '10px',
                  opacity: isPaid ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Checkbox de Pago */}
                  <button
                    onClick={() => onTogglePaid(service.id, !isPaid)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: isPaid ? 'none' : '2px solid var(--color-text-muted)',
                      backgroundColor: isPaid ? 'var(--color-success)' : 'transparent',
                      color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    {isPaid && <CheckCircle2 size={18} color="#fff" />}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontWeight: 600, fontSize: '0.95rem',
                        color: isPaid ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: isPaid ? 'line-through' : 'none'
                      }}>
                        {service.nombre}
                      </span>

                      {/* Tag de estado de fecha */}
                      {!isPaid && (
                        esVencido ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(224, 108, 117, 0.2)', color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Vencido el día {diaVenc}
                          </span>
                        ) : proximo ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(201, 168, 76, 0.2)', color: 'var(--color-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Vence pronto (Día {diaVenc})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                            Vence día {diaVenc}
                          </span>
                        )
                      )}
                    </div>

                    {service.proveedor && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                        Proveedor: {service.proveedor}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 700, fontSize: '1rem',
                      color: isPaid ? 'var(--color-text-muted)' : 'var(--color-text)'
                    }}>
                      {formatARS(service.monto_estimado)}
                    </div>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => onPayAndRegisterTransaction(service)}
                      style={{
                        padding: '6px 10px', borderRadius: '6px',
                        backgroundColor: 'var(--color-success)', color: '#000',
                        border: 'none', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer'
                      }}
                      title="Registrar pago como egreso real"
                    >
                      Pagar y Registrar
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => onEditService(service)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDeleteService(service.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
