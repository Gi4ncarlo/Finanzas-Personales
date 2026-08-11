import { useState, useEffect } from 'react';
import { formatARS } from '../../utils/currency';
import { Home, User, Wallet, Calculator, Settings2, ShieldCheck, Calendar, Info, PlusCircle } from 'lucide-react';
import SumarFondosModal from './SumarFondosModal';

export default function FraccionamientoHeader({ 
  settings, 
  onUpdateSettings, 
  onOpenCalculator,
  onAddFunds,
  accounts = [],
  totalPresupuestadoCasa,
  totalGastadoCasa,
  totalDebitoAutomaticoActivo,
  totalGastadoPersonal,
  monthTransactions = [],
  buckets = [],
  spendingPerBucket = {},
  autoExpenses = []
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSumarFondosOpen, setIsSumarFondosOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null); // 'saldo' | 'presupuesto' | 'casa' | 'personal'
  
  // Valores manuales iniciales
  const [saldoManual, setSaldoManual] = useState(settings?.saldo_manual || 11400000);
  const [presupuestoPrevisto, setPresupuestoPrevisto] = useState(settings?.presupuesto_previsto_manual || 3000000);
  const [montoDestinadoCasa, setMontoDestinadoCasa] = useState(settings?.monto_destinado_casa || 2000000);

  useEffect(() => {
    if (settings) {
      setSaldoManual(settings.saldo_manual !== undefined ? settings.saldo_manual : 11400000);
      setPresupuestoPrevisto(settings.presupuesto_previsto_manual !== undefined ? settings.presupuesto_previsto_manual : 3000000);
      setMontoDestinadoCasa(settings.monto_destinado_casa !== undefined ? settings.monto_destinado_casa : 2000000);
    }
  }, [settings]);

  // --- CÁLCULOS ---
  const saldoActualTotal = Math.max(0, saldoManual - totalGastadoCasa - totalGastadoPersonal);
  const fondoCasaDisponible = Math.max(0, montoDestinadoCasa - totalGastadoCasa);
  const dineroPersonalInicial = Math.max(0, saldoManual - montoDestinadoCasa);
  const fondoPersonalDisponible = Math.max(0, dineroPersonalInicial - totalGastadoPersonal);
  const totalConsumidoPresupuesto = totalGastadoCasa + totalGastadoPersonal;
  const porcentajePresupuestoConsumido = presupuestoPrevisto > 0 
    ? (totalConsumidoPresupuesto / presupuestoPrevisto) * 100 
    : 0;

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      regla_tipo: 'manual',
      saldo_manual: Number(saldoManual),
      presupuesto_previsto_manual: Number(presupuestoPrevisto),
      monto_destinado_casa: Number(montoDestinadoCasa)
    });
    setIsEditModalOpen(false);
  };

  let budgetColor = 'var(--color-success)';
  let budgetComment = '¡Buen control de gastos! Estás dentro de lo previsto.';
  if (porcentajePresupuestoConsumido > 90) {
    budgetColor = 'var(--color-danger)';
    budgetComment = '⚠️ ¡Atención! Estás a punto de agotar tu presupuesto mensual previsto.';
  } else if (porcentajePresupuestoConsumido > 70) {
    budgetColor = 'var(--color-gold)';
    budgetComment = 'Has consumido más del 70% de tu presupuesto previsto.';
  }

  // Filtrado de transacciones para mostrar en detalles
  const latestTx = monthTransactions
    .slice(0, 3)
    .map(tx => ({
      fecha: new Date(tx.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      descripcion: tx.descripcion,
      monto: tx.monto,
      esCasa: !!tx.es_gasto_casa
    }));

  const personalTx = monthTransactions
    .filter(tx => !tx.es_gasto_casa && tx.tipo === 'egreso')
    .slice(0, 3)
    .map(tx => ({
      fecha: new Date(tx.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      descripcion: tx.descripcion,
      monto: tx.monto
    }));

  const activeAutoExpensesList = autoExpenses.filter(ae => ae.activo);

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      position: 'relative',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Estilos para animaciones de tooltips */}
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
            <ShieldCheck size={18} />
            <span>FRACCIONAMIENTO VIRTUAL Y SEGUIMIENTO EN TIEMPO REAL</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Panel de Control Financiero
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            El saldo en cuenta disminuye con cualquier gasto. Pasa el cursor por cada tarjeta para ver su desglose detallado.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsSumarFondosOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-gold)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(201, 168, 76, 0.3)'
            }}
          >
            <PlusCircle size={18} />
            <span>+ Movimiento Hogar</span>
          </button>

          <button
            onClick={onOpenCalculator}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Calculator size={18} />
            <span>Repartidor Rápido</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Settings2 size={18} />
            <span>Valores Manuales</span>
          </button>
        </div>
      </div>

      {/* Grid de Valores del Panel con Hover Tooltips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px', position: 'relative' }}>
        
        {/* Card 1: Saldo en Cuenta ACTUAL */}
        <div 
          onMouseEnter={() => setHoveredCard('saldo')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            borderColor: hoveredCard === 'saldo' ? 'var(--color-gold)' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Saldo Actual en Cuenta</span>
            <Wallet size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {formatARS(saldoActualTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Hover para ver fórmula e historial
          </div>

          {/* Floating Tooltip para Saldo Actual */}
          {hoveredCard === 'saldo' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.96)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 100, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700 }}>DESGLOSE DE SALDO</h4>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Saldo Inicial Partida:</span>
                  <span>{formatARS(saldoManual)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E06C75' }}>
                  <span>(-) Gasto Total Casa:</span>
                  <span>-{formatARS(totalGastadoCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E06C75' }}>
                  <span>(-) Gasto Total Personal:</span>
                  <span>-{formatARS(totalGastadoPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#98C379', marginTop: '4px' }}>
                  <span>(=) Saldo Disponible:</span>
                  <span>{formatARS(saldoActualTotal)}</span>
                </div>
              </div>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ÚLTIMOS MOVIMIENTOS:</h5>
              {latestTx.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sin gastos este mes</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {latestTx.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {tx.fecha} - {tx.descripcion}
                      </span>
                      <span style={{ color: tx.esCasa ? '#61AFEF' : '#98C379', fontWeight: 600 }}>
                        -{formatARS(tx.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Presupuesto Previsto */}
        <div 
          onMouseEnter={() => setHoveredCard('presupuesto')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(201, 168, 76, 0.05)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            borderColor: hoveredCard === 'presupuesto' ? 'var(--color-gold)' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 500 }}>Presupuesto Previsto</span>
            <Calendar size={18} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>
            {formatARS(presupuestoPrevisto)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Ver consumos de presupuesto
          </div>

          {/* Floating Tooltip para Presupuesto */}
          {hoveredCard === 'presupuesto' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.96)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 100, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700 }}>CONSUMO DE PRESUPUESTO</h4>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '5px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Punto Presupuesto Inicial:</span>
                  <span>{formatARS(presupuestoPrevisto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#61AFEF' }}>
                  <span>Gasto Ejecutado Casa:</span>
                  <span>{formatARS(totalGastadoCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#98C379' }}>
                  <span>Gasto Ejecutado Personal:</span>
                  <span>{formatARS(totalGastadoPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '4px' }}>
                  <span>Restante Disponible:</span>
                  <span style={{ color: presupuestoPrevisto - totalConsumidoPresupuesto >= 0 ? '#98C379' : '#E06C75' }}>
                    {formatARS(presupuestoPrevisto - totalConsumidoPresupuesto)}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
                <strong>Estado:</strong> {budgetComment}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Fondos de Casa */}
        <div 
          onMouseEnter={() => setHoveredCard('casa')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(97, 175, 239, 0.08)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            borderColor: hoveredCard === 'casa' ? '#61AFEF' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#61AFEF', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={16} /> Fondo Casa (Supervivencia)
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSumarFondosOpen(true);
              }}
              title="Sumar / Restar fondos de Casa"
              style={{
                backgroundColor: 'rgba(97, 175, 239, 0.2)',
                color: '#61AFEF',
                border: '1px solid rgba(97, 175, 239, 0.4)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <PlusCircle size={12} />
              <span>+/- Fondos</span>
            </button>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#61AFEF' }}>
            {formatARS(fondoCasaDisponible)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Ver desglose por sobres
          </div>

          {/* Floating Tooltip para Fondo Casa */}
          {hoveredCard === 'casa' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.96)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 100, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff', width: '280px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#61AFEF', fontWeight: 700 }}>SOBRES DE LA CASA</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                {buckets.map((b) => {
                  const gast = spendingPerBucket[b.id] || 0;
                  const res = b.monto_presupuestado - gast;
                  return (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>• {b.nombre}:</span>
                      <span style={{ color: res >= 0 ? '#98C379' : '#E06C75', fontWeight: 600 }}>{formatARS(res)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <div>Débitos Auto Activos: <strong>-{formatARS(totalDebitoAutomaticoActivo)}</strong></div>
                {activeAutoExpensesList.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    ({activeAutoExpensesList.map(ae => ae.nombre).join(', ')})
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Dinero Mío (Personal) */}
        <div 
          onMouseEnter={() => setHoveredCard('personal')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(152, 195, 121, 0.08)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            borderColor: hoveredCard === 'personal' ? '#98C379' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#98C379', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> Dinero Mío (Personal)
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#98C379' }}>
            {formatARS(fondoPersonalDisponible)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Ver historial personal
          </div>

          {/* Floating Tooltip para Fondo Personal */}
          {hoveredCard === 'personal' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.96)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 100, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#98C379', fontWeight: 700 }}>MIS GASTOS PERSONALES</h4>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fondo Inicial Personal:</span>
                  <span>{formatARS(dineroPersonalInicial)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E06C75' }}>
                  <span>Egresos Personales:</span>
                  <span>-{formatARS(totalGastadoPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#98C379', marginTop: '2px' }}>
                  <span>Fondo Restante:</span>
                  <span>{formatARS(fondoPersonalDisponible)}</span>
                </div>
              </div>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ÚLTIMOS CONSUMOS MÍOS:</h5>
              {personalTx.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sin gastos personales este mes</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {personalTx.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {tx.fecha} - {tx.descripcion}
                      </span>
                      <span style={{ color: '#E06C75', fontWeight: 600 }}>-{formatARS(tx.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Termómetro de Gasto Mensual */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Termómetro de Consumo Presupuestado Mensual
          </span>
          <span style={{ fontSize: '0.85rem', color: budgetColor, fontWeight: 700 }}>
            {porcentajePresupuestoConsumido.toFixed(1)}% Consumido
          </span>
        </div>

        <div style={{ width: '100%', height: '14px', backgroundColor: 'var(--color-surface-2)', borderRadius: '7px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
          <div style={{ 
            width: `${Math.min(100, porcentajePresupuestoConsumido)}%`, 
            backgroundColor: budgetColor, 
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{budgetComment}</span>
          <span style={{ color: 'var(--color-text)' }}>
            Restan: <strong>{formatARS(Math.max(0, presupuestoPrevisto - totalConsumidoPresupuesto))}</strong> para gastar en el mes
          </span>
        </div>
      </div>

      {/* Modal de Modificación Manual */}
      {isEditModalOpen && (
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
            color: 'var(--color-text)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={20} /> Modificar Valores Manuales
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Saldo Inicial en la Cuenta (ARS):
              </label>
              <input
                type="number"
                value={saldoManual}
                onChange={(e) => setSaldoManual(e.target.value)}
                placeholder="Ej. 11400000"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Presupuesto Mensual Previsto (ARS):
              </label>
              <input
                type="number"
                value={presupuestoPrevisto}
                onChange={(e) => setPresupuestoPrevisto(e.target.value)}
                placeholder="Ej. 3000000"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Fondo para Gastos de la Casa (ARS):
              </label>
              <input
                type="number"
                value={montoDestinadoCasa}
                onChange={(e) => setMontoDestinadoCasa(e.target.value)}
                placeholder="Ej. 2000000"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '4px' }}>
                Tu Dinero Personal restante será: {formatARS(saldoManual - montoDestinadoCasa)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: 'var(--color-gold)', color: '#000', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sumar Fondos */}
      <SumarFondosModal
        isOpen={isSumarFondosOpen}
        onClose={() => setIsSumarFondosOpen(false)}
        onAddFunds={onAddFunds}
        accounts={accounts}
        buckets={buckets}
        currentSaldoManual={saldoManual}
        currentMontoCasa={montoDestinadoCasa}
        currentPresupuestoPrevisto={presupuestoPrevisto}
        totalGastadoCasa={totalGastadoCasa}
      />
    </div>
  );
}
