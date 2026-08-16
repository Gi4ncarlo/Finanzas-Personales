import { useState, useEffect, useMemo } from 'react';
import { formatARS } from '../../utils/currency';
import { Home, User, Wallet, Calculator, Settings2, ShieldCheck, Calendar, Info, PlusCircle, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import SumarFondosModal from './SumarFondosModal';
import DesgloseCardModal from './DesgloseCardModal';
import TermometroPresupuesto from './TermometroPresupuesto';
import TransferenciaGastoHogarModal from './TransferenciaGastoHogarModal';

export default function FraccionamientoHeader({ 
  settings, 
  saldoInicioMes,
  onUpdateSettings, 
  onOpenCalculator,
  onAddFunds,
  accounts = [],
  totalPresupuestadoCasa = 0,
  totalGastadoCasa = 0,
  totalGastadoCasaPresupuesto = 0,
  totalDebitoAutomaticoActivo = 0,
  totalGastadoPersonal = 0,
  totalIngresosCasa = 0,
  totalIngresosPersonal = 0,
  monthTransactions = [],
  buckets = [],
  spendingPerBucket = {},
  autoExpenses = [],
  services = [],
  paidServices = {}
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSumarFondosOpen, setIsSumarFondosOpen] = useState(false);
  const [isGastoCasaModalOpen, setIsGastoCasaModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null); // 'saldo' | 'presupuesto' | 'casa' | 'personal'
  const [selectedModalCard, setSelectedModalCard] = useState(null); // 'saldo' | 'presupuesto' | 'casa' | 'personal' | null
  
  // Valores manuales iniciales (Punto de Partida)
  const [saldoManual, setSaldoManual] = useState(settings?.saldo_manual || 11400000);
  const [presupuestoPrevisto, setPresupuestoPrevisto] = useState(settings?.presupuesto_previsto_manual || 3000000);
  const [montoDestinadoCasa, setMontoDestinadoCasa] = useState(settings?.monto_destinado_casa || 2000000);
  const [ajusteIngresoPersonal, setAjusteIngresoPersonal] = useState(settings?.ajuste_ingreso_personal || 0);

  useEffect(() => {
    if (settings) {
      setSaldoManual(settings.saldo_manual !== undefined ? settings.saldo_manual : 11400000);
      setPresupuestoPrevisto(settings.presupuesto_previsto_manual !== undefined ? settings.presupuesto_previsto_manual : 3000000);
      setMontoDestinadoCasa(settings.monto_destinado_casa !== undefined ? settings.monto_destinado_casa : 2000000);
      setAjusteIngresoPersonal(settings.ajuste_ingreso_personal !== undefined ? settings.ajuste_ingreso_personal : 0);
    }
  }, [settings]);

  // --- CÁLCULOS MATEMÁTICOS SIMÉTRICOS Y EXACTOS ---
  const baseSaldoMes = (saldoInicioMes !== undefined && saldoInicioMes !== null) ? saldoInicioMes : saldoManual;
  const totalIngresosMes = (totalIngresosCasa || 0) + (totalIngresosPersonal || 0);
  const totalEgresosMes = (totalGastadoCasa || 0) + (totalGastadoPersonal || 0);

  const saldoActualTotal = Math.max(0, baseSaldoMes + totalIngresosMes - totalEgresosMes);
  const fondoCasaDisponible = Math.max(0, montoDestinadoCasa + (totalIngresosCasa || 0) - totalGastadoCasa);
  const dineroPersonalInicial = Math.max(0, baseSaldoMes - montoDestinadoCasa);
  const fondoPersonalDisponible = Math.max(0, dineroPersonalInicial + (totalIngresosPersonal || 0) - totalGastadoPersonal);

  // El presupuesto previsto mensual evalúa exclusivamente el gasto de la casa
  const totalConsumidoPresupuesto = totalGastadoCasaPresupuesto || totalGastadoCasa;
  const porcentajePresupuestoConsumido = presupuestoPrevisto > 0 
    ? (totalConsumidoPresupuesto / presupuestoPrevisto) * 100 
    : 0;

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      regla_tipo: 'manual',
      saldo_manual: Number(saldoManual),
      presupuesto_previsto_manual: Number(presupuestoPrevisto),
      monto_destinado_casa: Number(montoDestinadoCasa),
      ajuste_ingreso_personal: Number(ajusteIngresoPersonal)
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

  // Helper para formatear fecha corta
  const formatDateShort = (d) => {
    if (!d) return '';
    const clean = String(d).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return clean;
  };

  // --- FILTROS DE ÚLTIMOS 3 INGRESOS Y 3 EGRESOS POR TARJETA ---

  // 1. Saldo Global (Todo lo que entra y sale de la cuenta)
  const saldoIngresos = useMemo(() => {
    return monthTransactions
      .filter(tx => tx.tipo === 'ingreso')
      .slice(0, 3)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto, esCasa: !!tx.es_gasto_casa }));
  }, [monthTransactions]);

  const saldoEgresos = useMemo(() => {
    return monthTransactions
      .filter(tx => tx.tipo === 'egreso')
      .slice(0, 3)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto, esCasa: !!tx.es_gasto_casa }));
  }, [monthTransactions]);

  // 2. Fondo Casa (Solo de la casa)
  const casaIngresos = useMemo(() => {
    return monthTransactions
      .filter(tx => tx.tipo === 'ingreso' && !!tx.es_gasto_casa)
      .slice(0, 3)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto }));
  }, [monthTransactions]);

  const casaEgresos = useMemo(() => {
    const manuales = monthTransactions
      .filter(tx => tx.tipo === 'egreso' && !!tx.es_gasto_casa)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto }));
    return manuales.slice(0, 3);
  }, [monthTransactions]);

  // 3. Presupuesto (Muestra los egresos de la casa)
  const presupuestoIngresos = casaIngresos;
  const presupuestoEgresos = casaEgresos;

  // 4. Dinero Mío (Personal)
  const personalIngresos = useMemo(() => {
    return monthTransactions
      .filter(tx => tx.tipo === 'ingreso' && !tx.es_gasto_casa)
      .slice(0, 3)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto }));
  }, [monthTransactions]);

  const personalEgresos = useMemo(() => {
    return monthTransactions
      .filter(tx => tx.tipo === 'egreso' && !tx.es_gasto_casa)
      .slice(0, 3)
      .map(tx => ({ fecha: formatDateShort(tx.fecha), desc: tx.descripcion, monto: tx.monto }));
  }, [monthTransactions]);

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      position: 'relative',
      zIndex: hoveredCard ? 300 : 1,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }}>
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .header-card-interactive {
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .header-card-interactive:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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
            Pasa el cursor por cada tarjeta para ver últimos ingresos y egresos. <strong>Haz clic</strong> para abrir el desglose completo con fechas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsGastoCasaModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(224, 108, 117, 0.18)',
              color: '#FF7B72',
              border: '1px solid rgba(224, 108, 117, 0.45)',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(224, 108, 117, 0.2)'
            }}
          >
            <Send size={16} />
            <span>💸 Gasto / Transferencia Hogar</span>
          </button>

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

      {/* Grid de Valores del Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px', position: 'relative' }}>
        
        {/* Card 1: Saldo en Cuenta ACTUAL */}
        <div 
          className="header-card-interactive"
          onClick={() => { setHoveredCard(null); setSelectedModalCard('saldo'); }}
          onMouseEnter={() => setHoveredCard('saldo')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            zIndex: hoveredCard === 'saldo' ? 400 : 1,
            cursor: 'pointer',
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
            <Info size={12} /> Hover resumen · Clic desglose
          </div>

          {/* Floating Tooltip para Saldo Actual */}
          {hoveredCard === 'saldo' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.98)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 1000, boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff', minWidth: '290px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700 }}>DESGLOSE DE SALDO EN CUENTA</h4>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Saldo al Inicio del Mes:</span>
                  <span>{formatARS(baseSaldoMes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                  <span>(+) Total Ingresos Mes:</span>
                  <span>+{formatARS(totalIngresosMes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                  <span>(-) Total Egresos Mes:</span>
                  <span>-{formatARS(totalEgresosMes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-gold)', marginTop: '2px' }}>
                  <span>(=) Saldo Real Actual:</span>
                  <span>{formatARS(saldoActualTotal)}</span>
                </div>
              </div>

              {/* 3 Ingresos */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 INGRESOS:</div>
                {saldoIngresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin ingresos este mes</div>
                ) : (
                  saldoIngresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#2ecc71' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>+{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 3 Egresos */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 EGRESOS:</div>
                {saldoEgresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin egresos este mes</div>
                ) : (
                  saldoEgresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#e74c3c' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>-{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--color-gold)', textAlign: 'center' }}>
                👆 Haz clic para ver desglose completo del mes
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Presupuesto Previsto */}
        <div 
          className="header-card-interactive"
          onClick={() => { setHoveredCard(null); setSelectedModalCard('presupuesto'); }}
          onMouseEnter={() => setHoveredCard('presupuesto')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(201, 168, 76, 0.05)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            zIndex: hoveredCard === 'presupuesto' ? 400 : 1,
            cursor: 'pointer',
            borderColor: hoveredCard === 'presupuesto' ? 'var(--color-gold)' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 500 }}>Presupuesto Previsto (Casa)</span>
            <Calendar size={18} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>
            {formatARS(presupuestoPrevisto)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Hover resumen · Clic desglose
          </div>

          {/* Floating Tooltip para Presupuesto */}
          {hoveredCard === 'presupuesto' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.98)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 1000, boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff', minWidth: '290px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700 }}>PRESUPUESTO DEL HOGAR</h4>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Presupuesto Fijado Casa:</span>
                  <span>{formatARS(presupuestoPrevisto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#61AFEF' }}>
                  <span>(-) Gasto Ejecutado Casa:</span>
                  <span>-{formatARS(totalGastadoCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '2px' }}>
                  <span>(=) Presupuesto Restante Casa:</span>
                  <span style={{ color: presupuestoPrevisto - totalConsumidoPresupuesto >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {formatARS(presupuestoPrevisto - totalConsumidoPresupuesto)}
                  </span>
                </div>
              </div>

              {/* 3 Egresos Casa */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS GASTOS DEL HOGAR:</div>
                {casaEgresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin gastos de casa este mes</div>
                ) : (
                  casaEgresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#e74c3c' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>-{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--color-gold)', textAlign: 'center' }}>
                👆 Haz clic para ver desglose completo del mes
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Fondos de Casa */}
        <div 
          className="header-card-interactive"
          onClick={() => { setHoveredCard(null); setSelectedModalCard('casa'); }}
          onMouseEnter={() => setHoveredCard('casa')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(97, 175, 239, 0.08)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            zIndex: hoveredCard === 'casa' ? 400 : 1,
            cursor: 'pointer',
            borderColor: hoveredCard === 'casa' ? '#61AFEF' : 'var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#61AFEF', fontSize: '0.85rem', fontWeight: 500 }}>Fondo Casa (Supervivencia)</span>
            <Home size={18} style={{ color: '#61AFEF' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#61AFEF' }}>
            {formatARS(fondoCasaDisponible)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Hover resumen · Clic desglose
          </div>

          {/* Floating Tooltip para Fondo Casa */}
          {hoveredCard === 'casa' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.98)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 1000, boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff', minWidth: '290px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#61AFEF', fontWeight: 700 }}>FONDO DE LA CASA</h4>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fondo Inicial Casa:</span>
                  <span>{formatARS(montoDestinadoCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                  <span>(+) Aportes a Casa:</span>
                  <span>+{formatARS(totalIngresosCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                  <span>(-) Gastos Casa Totales:</span>
                  <span>-{formatARS(totalGastadoCasa)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#61AFEF', marginTop: '2px' }}>
                  <span>(=) Remanente Casa:</span>
                  <span>{formatARS(fondoCasaDisponible)}</span>
                </div>
              </div>

              {/* 3 Ingresos Casa */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 INGRESOS A CASA:</div>
                {casaIngresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin aportes adicionales</div>
                ) : (
                  casaIngresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#2ecc71' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>+{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 3 Egresos Casa */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 GASTOS CASA:</div>
                {casaEgresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin gastos registrados</div>
                ) : (
                  casaEgresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#e74c3c' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>-{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--color-gold)', textAlign: 'center' }}>
                👆 Haz clic para ver desglose completo del mes
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Dinero Mío (Personal) */}
        <div 
          className="header-card-interactive"
          onClick={() => { setHoveredCard(null); setSelectedModalCard('personal'); }}
          onMouseEnter={() => setHoveredCard('personal')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            backgroundColor: 'rgba(152, 195, 121, 0.08)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            zIndex: hoveredCard === 'personal' ? 400 : 1,
            cursor: 'pointer',
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
            <Info size={12} /> Hover resumen · Clic desglose
          </div>

          {/* Floating Tooltip para Fondo Personal */}
          {hoveredCard === 'personal' && (
            <div style={{
              position: 'absolute', top: '105%', left: 0, right: 0,
              backgroundColor: 'rgba(26, 32, 48, 0.98)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              padding: '16px', zIndex: 1000, boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
              animation: 'tooltipFadeIn 0.2s ease', color: '#fff', minWidth: '290px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#98C379', fontWeight: 700 }}>DINERO MÍO (PERSONAL)</h4>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fondo Inicial Personal:</span>
                  <span>{formatARS(dineroPersonalInicial)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                  <span>(+) Mis Comisiones / Ingresos:</span>
                  <span>+{formatARS(totalIngresosPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                  <span>(-) Mis Gastos Personales:</span>
                  <span>-{formatARS(totalGastadoPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#98C379', marginTop: '2px' }}>
                  <span>(=) Dinero Mío Disponible:</span>
                  <span>{formatARS(fondoPersonalDisponible)}</span>
                </div>
              </div>

              {/* 3 Ingresos Personales */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 INGRESOS MÍOS:</div>
                {personalIngresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin ingresos personales este mes</div>
                ) : (
                  personalIngresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#2ecc71' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>+{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 3 Egresos Personales */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: 700, marginBottom: '4px' }}>ÚLTIMOS 3 GASTOS MÍOS:</div>
                {personalEgresos.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin gastos personales este mes</div>
                ) : (
                  personalEgresos.map((tx, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#e74c3c' }}>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fecha} - {tx.desc}</span>
                      <span>-{formatARS(tx.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--color-gold)', textAlign: 'center' }}>
                👆 Haz clic para ver desglose completo del mes
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Termómetro de Gasto Mensual Ultra Dinámico */}
      <TermometroPresupuesto 
        presupuestoPrevisto={presupuestoPrevisto}
        totalGastadoCasa={totalGastadoCasa}
        totalGastadoPersonal={totalGastadoPersonal}
      />

      {/* Modal de Modificación Manual */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '520px',
            width: '100%',
            color: 'var(--color-text)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={20} /> Modificar Valores Manuales de Partida
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              Estos son los valores base iniciales de configuración. Los ingresos y comisiones que cargues durante el mes se sumarán automáticamente a este punto de partida sin borrar tu saldo inicial.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '6px' }}>
                Saldo Inicial de Partida en Cuenta (ARS):
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
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                El saldo que tenías al comenzar la configuración inicial del mes.
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '6px' }}>
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '6px' }}>
                Fondo Inicial Asignado para la Casa (ARS):
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
              <span style={{ fontSize: '0.75rem', color: '#98C379', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                Tu Dinero Personal Inicial restante es: {formatARS(saldoManual - montoDestinadoCasa)}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '6px' }}>
                Ajuste Temporal de Ingreso Personal / Conciliación (ARS):
              </label>
              <input
                type="number"
                value={ajusteIngresoPersonal}
                onChange={(e) => setAjusteIngresoPersonal(e.target.value)}
                placeholder="Ej. 1000000"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Suma a Dinero Mío en Hogar sin alterar los saldos reales de cuentas ni el patrimonio neto de tu Dashboard.
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

      {/* Modal de Transferencias y Gastos Extras del Hogar */}
      {isGastoCasaModalOpen && (
        <TransferenciaGastoHogarModal
          isOpen={true}
          onClose={() => setIsGastoCasaModalOpen(false)}
          onAddFunds={onAddFunds}
          accounts={accounts}
          buckets={buckets}
          currentFondoCasa={fondoCasaDisponible}
          currentPresupuesto={presupuestoPrevisto}
          currentGastadoCasa={totalGastadoCasa}
        />
      )}

      {/* Modal de Desglose Completo al hacer Clic en cualquier Tarjeta */}
      {selectedModalCard && (
        <DesgloseCardModal
          isOpen={true}
          onClose={() => setSelectedModalCard(null)}
          cardType={selectedModalCard}
          settings={settings}
          saldoManual={saldoManual}
          saldoInicioMes={baseSaldoMes}
          presupuestoPrevisto={presupuestoPrevisto}
          montoDestinadoCasa={montoDestinadoCasa}
          totalPresupuestadoCasa={totalPresupuestadoCasa}
          totalGastadoCasa={totalGastadoCasa}
          totalDebitoAutomaticoActivo={totalDebitoAutomaticoActivo}
          totalGastadoPersonal={totalGastadoPersonal}
          totalIngresosCasa={totalIngresosCasa}
          totalIngresosPersonal={totalIngresosPersonal}
          monthTransactions={monthTransactions}
          buckets={buckets}
          spendingPerBucket={spendingPerBucket}
          autoExpenses={autoExpenses}
          services={services}
          paidServices={paidServices}
        />
      )}
    </div>
  );
}
