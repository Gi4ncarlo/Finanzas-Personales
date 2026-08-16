import { useState, useMemo } from 'react';
import { formatARS } from '../../utils/currency';
import { 
  X, Wallet, Calendar, Home, User, ArrowUpRight, ArrowDownLeft, 
  Search, Filter, CheckCircle, AlertCircle, RefreshCw, FileText, Info
} from 'lucide-react';

export default function DesgloseCardModal({
  isOpen,
  onClose,
  cardType = 'saldo', // 'saldo' | 'presupuesto' | 'casa' | 'personal'
  settings,
  saldoManual = 0,
  saldoInicioMes,
  presupuestoPrevisto = 0,
  montoDestinadoCasa = 0,
  totalPresupuestadoCasa = 0,
  totalGastadoCasa = 0,
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
  const [filterTipo, setFilterTipo] = useState('all'); // 'all' | 'ingreso' | 'egreso'
  const [searchQuery, setSearchQuery] = useState('');

  // Título e Icono por tipo (con fallback seguro)
  const cardConfigMap = {
    saldo: {
      title: 'Desglose Integral de Saldo en Cuenta',
      subtitle: 'Composición detallada de fondos, ingresos y egresos globales del mes en tu cuenta.',
      icon: Wallet,
      color: '#E5C07B',
      accentBg: 'rgba(229, 192, 123, 0.15)'
    },
    presupuesto: {
      title: 'Consumo y Ejecución de Presupuesto del Hogar',
      subtitle: 'Seguimiento de gastos frente al presupuesto mensual fijado para la casa y supervivencia.',
      icon: Calendar,
      color: '#E5C07B',
      accentBg: 'rgba(229, 192, 123, 0.15)'
    },
    casa: {
      title: 'Desglose de Fondo Casa (Supervivencia)',
      subtitle: 'Aportes, gastos de sobres, servicios y débitos automáticos del hogar.',
      icon: Home,
      color: '#61AFEF',
      accentBg: 'rgba(97, 175, 239, 0.15)'
    },
    personal: {
      title: 'Desglose de Dinero Personal (Mío)',
      subtitle: 'Comisiones personales, compras personales y saldo libre individual.',
      icon: User,
      color: '#98C379',
      accentBg: 'rgba(152, 195, 121, 0.15)'
    }
  };

  const currentType = cardType || 'saldo';
  const cardConfig = cardConfigMap[currentType] || cardConfigMap.saldo;

  // Cálculos matemáticos
  const baseSaldoMes = (saldoInicioMes !== undefined && saldoInicioMes !== null) ? saldoInicioMes : (saldoManual || 0);
  const totalIngresosMes = (totalIngresosCasa || 0) + (totalIngresosPersonal || 0);
  const totalEgresosMes = (totalGastadoCasa || 0) + (totalGastadoPersonal || 0);
  const saldoActualTotal = Math.max(0, baseSaldoMes + totalIngresosMes - totalEgresosMes);

  const fondoCasaDisponible = Math.max(0, (montoDestinadoCasa || 0) + (totalIngresosCasa || 0) - (totalGastadoCasa || 0));
  const dineroPersonalInicial = Math.max(0, baseSaldoMes - (montoDestinadoCasa || 0));
  const fondoPersonalDisponible = Math.max(0, dineroPersonalInicial + (totalIngresosPersonal || 0) - (totalGastadoPersonal || 0));

  // El presupuesto mide estrictamente los gastos de casa
  const totalConsumidoPresupuesto = totalGastadoCasa || 0;
  const presupuestoTotal = presupuestoPrevisto || 0;

  // Garantizar arrays seguros
  const safeMonthTxs = monthTransactions || [];
  const safeAutoExpenses = autoExpenses || [];
  const safeBuckets = buckets || [];

  // Helper para formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  };

  // Filtrado de la lista de movimientos para el modal
  const transactionsList = useMemo(() => {
    let list = [];

    if (currentType === 'saldo') {
      // Todas las transacciones del mes
      list = safeMonthTxs.map(tx => ({
        id: tx.id,
        fecha: formatDate(tx.fecha),
        rawFecha: tx.fecha || '',
        descripcion: tx.descripcion || 'Sin descripción',
        monto: Number(tx.monto || 0),
        tipo: tx.tipo || 'egreso',
        esCasa: !!tx.es_gasto_casa,
        tag: tx.es_gasto_casa ? 'Casa' : 'Personal'
      }));
    } else if (currentType === 'presupuesto') {
      // Exclusivamente egresos de la casa + autos activos del hogar
      const manualEgresosCasa = safeMonthTxs
        .filter(tx => tx.tipo === 'egreso' && !!tx.es_gasto_casa)
        .map(tx => ({
          id: tx.id,
          fecha: formatDate(tx.fecha),
          rawFecha: tx.fecha || '',
          descripcion: tx.descripcion || 'Gasto Casa',
          monto: Number(tx.monto || 0),
          tipo: 'egreso',
          esCasa: true,
          tag: 'Gasto Casa'
        }));

      const autos = safeAutoExpenses
        .filter(ae => ae.activo)
        .map(ae => ({
          id: ae.id,
          fecha: `Día ${ae.dia_debito}`,
          rawFecha: `2026-08-${String(ae.dia_debito).padStart(2, '0')}`,
          descripcion: `${ae.nombre} (Débito Automático)`,
          monto: Number(ae.monto || 0),
          tipo: 'egreso',
          esCasa: true,
          tag: 'Débito Auto Casa'
        }));

      list = [...manualEgresosCasa, ...autos];
    } else if (currentType === 'casa') {
      // Movimientos de casa
      const manualCasa = safeMonthTxs
        .filter(tx => !!tx.es_gasto_casa)
        .map(tx => {
          const bucket = safeBuckets.find(b => b.id === tx.household_bucket_id);
          return {
            id: tx.id,
            fecha: formatDate(tx.fecha),
            rawFecha: tx.fecha || '',
            descripcion: tx.descripcion || 'Movimiento Casa',
            monto: Number(tx.monto || 0),
            tipo: tx.tipo || 'egreso',
            esCasa: true,
            tag: bucket?.nombre || 'General Hogar'
          };
        });

      const autos = safeAutoExpenses
        .filter(ae => ae.activo)
        .map(ae => {
          const bucket = safeBuckets.find(b => b.id === ae.bucket_id);
          return {
            id: ae.id,
            fecha: `Día ${ae.dia_debito}`,
            rawFecha: `2026-08-${String(ae.dia_debito).padStart(2, '0')}`,
            descripcion: `${ae.nombre} (Débito Automático)`,
            monto: Number(ae.monto || 0),
            tipo: 'egreso',
            esCasa: true,
            tag: bucket?.nombre || 'General Hogar'
          };
        });

      list = [...manualCasa, ...autos];
    } else if (currentType === 'personal') {
      // Movimientos personales
      list = safeMonthTxs
        .filter(tx => !tx.es_gasto_casa)
        .map(tx => ({
          id: tx.id,
          fecha: formatDate(tx.fecha),
          rawFecha: tx.fecha || '',
          descripcion: tx.descripcion || 'Movimiento Personal',
          monto: Number(tx.monto || 0),
          tipo: tx.tipo || 'egreso',
          esCasa: false,
          tag: 'Personal'
        }));
    }

    // Filtros por tipo
    if (filterTipo === 'ingreso') {
      list = list.filter(item => item.tipo === 'ingreso');
    } else if (filterTipo === 'egreso') {
      list = list.filter(item => item.tipo === 'egreso');
    }

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        (item.descripcion && item.descripcion.toLowerCase().includes(q)) || 
        (item.tag && item.tag.toLowerCase().includes(q)) ||
        String(item.monto).includes(q)
      );
    }

    // Ordenar por fecha
    list.sort((a, b) => String(b.rawFecha).localeCompare(String(a.rawFecha)));

    return list;
  }, [currentType, safeMonthTxs, safeAutoExpenses, safeBuckets, filterTipo, searchQuery]);

  const IconComp = cardConfig.icon || Wallet;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.88)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#161B26',
        border: `1px solid ${cardConfig.color}`,
        borderRadius: '18px',
        padding: '26px',
        maxWidth: '850px',
        width: '100%',
        color: '#F0F3F8',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              backgroundColor: cardConfig.accentBg, color: cardConfig.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <IconComp size={26} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: cardConfig.color }}>
                {cardConfig.title}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#9DA8BA' }}>
                {cardConfig.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9DA8BA', cursor: 'pointer', padding: '8px', borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen Métricas y Fórmulas */}
        {currentType === 'saldo' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#1E2536', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Saldo al Inicio del Mes</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginTop: '2px' }}>{formatARS(baseSaldoMes)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#2ecc71', textTransform: 'uppercase', fontWeight: 600 }}>(+) Total Ingresos Mes</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2ecc71', marginTop: '2px' }}>+{formatARS(totalIngresosMes)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#e74c3c', textTransform: 'uppercase', fontWeight: 600 }}>(-) Total Egresos Mes</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e74c3c', marginTop: '2px' }}>-{formatARS(totalEgresosMes)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(229, 192, 123, 0.12)', padding: '14px', borderRadius: '10px', border: '1px solid #E5C07B' }}>
              <div style={{ fontSize: '0.72rem', color: '#E5C07B', textTransform: 'uppercase', fontWeight: 700 }}>(=) Saldo Actual Real</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#E5C07B', marginTop: '2px' }}>{formatARS(saldoActualTotal)}</div>
            </div>
          </div>
        )}

        {currentType === 'presupuesto' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#1E2536', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#E5C07B', textTransform: 'uppercase', fontWeight: 600 }}>Presupuesto Fijado Casa</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#E5C07B', marginTop: '2px' }}>{formatARS(presupuestoTotal)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(97, 175, 239, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(97, 175, 239, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#61AFEF', textTransform: 'uppercase', fontWeight: 600 }}>Gasto Ejecutado Casa</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#61AFEF', marginTop: '2px' }}>{formatARS(totalGastadoCasa)}</div>
            </div>
            <div style={{ backgroundColor: '#1E2536', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Restante Disponible Casa</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: presupuestoTotal - totalConsumidoPresupuesto >= 0 ? '#2ecc71' : '#e74c3c', marginTop: '2px' }}>
                {formatARS(presupuestoTotal - totalConsumidoPresupuesto)}
              </div>
            </div>
          </div>
        )}

        {currentType === 'casa' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#1E2536', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Fondo Casa Asignado</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginTop: '2px' }}>{formatARS(montoDestinadoCasa)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#2ecc71', textTransform: 'uppercase', fontWeight: 600 }}>(+) Aportes Recibidos</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2ecc71', marginTop: '2px' }}>+{formatARS(totalIngresosCasa)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#e74c3c', textTransform: 'uppercase', fontWeight: 600 }}>(-) Gastos Casa Totales</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e74c3c', marginTop: '2px' }}>-{formatARS(totalGastadoCasa)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(97, 175, 239, 0.12)', padding: '14px', borderRadius: '10px', border: '1px solid #61AFEF' }}>
              <div style={{ fontSize: '0.72rem', color: '#61AFEF', textTransform: 'uppercase', fontWeight: 700 }}>(=) Fondo Casa Disponible</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#61AFEF', marginTop: '2px' }}>{formatARS(fondoCasaDisponible)}</div>
            </div>
          </div>
        )}

        {currentType === 'personal' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#1E2536', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Fondo Personal Inicial</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginTop: '2px' }}>{formatARS(dineroPersonalInicial)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#2ecc71', textTransform: 'uppercase', fontWeight: 600 }}>(+) Mis Comisiones / Ingresos</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2ecc71', marginTop: '2px' }}>+{formatARS(totalIngresosPersonal)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#e74c3c', textTransform: 'uppercase', fontWeight: 600 }}>(-) Mis Gastos Personales</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e74c3c', marginTop: '2px' }}>-{formatARS(totalGastadoPersonal)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(152, 195, 121, 0.12)', padding: '14px', borderRadius: '10px', border: '1px solid #98C379' }}>
              <div style={{ fontSize: '0.72rem', color: '#98C379', textTransform: 'uppercase', fontWeight: 700 }}>(=) Dinero Mío Disponible</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#98C379', marginTop: '2px' }}>{formatARS(fondoPersonalDisponible)}</div>
            </div>
          </div>
        )}

        {/* Barra de Filtros y Buscador */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1E2536', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setFilterTipo('all')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                backgroundColor: filterTipo === 'all' ? '#E5C07B' : 'transparent',
                color: filterTipo === 'all' ? '#000' : '#9DA8BA',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              Todos ({transactionsList.length})
            </button>
            <button
              onClick={() => setFilterTipo('ingreso')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                backgroundColor: filterTipo === 'ingreso' ? '#2ecc71' : 'transparent',
                color: filterTipo === 'ingreso' ? '#000' : '#9DA8BA',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterTipo('egreso')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                backgroundColor: filterTipo === 'egreso' ? '#e74c3c' : 'transparent',
                color: filterTipo === 'egreso' ? '#FFF' : '#9DA8BA',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              Egresos
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9DA8BA' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por descripción o sobre..."
              style={{
                width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px',
                backgroundColor: '#1E2536', border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF', fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '340px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backgroundColor: '#1E2536' }}>
          {transactionsList.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#9DA8BA', fontSize: '0.9rem' }}>
              No se encontraron movimientos registrados para este filtro.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#161B26', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#9DA8BA', fontWeight: 600 }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#9DA8BA', fontWeight: 600 }}>Descripción</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#9DA8BA', fontWeight: 600 }}>Clasificación / Sobre</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: '#9DA8BA', fontWeight: 600 }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactionsList.map((item, idx) => {
                  const isIng = item.tipo === 'ingreso';
                  return (
                    <tr 
                      key={item.id || idx}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#9DA8BA', whiteSpace: 'nowrap' }}>
                        {item.fecha}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#FFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '22px', height: '22px', borderRadius: '50%', 
                            backgroundColor: isIng ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)',
                            color: isIng ? '#2ecc71' : '#e74c3c',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isIng ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          </span>
                          <span>{item.descripcion}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: item.esCasa ? 'rgba(97, 175, 239, 0.15)' : 'rgba(152, 195, 121, 0.15)',
                          color: item.esCasa ? '#61AFEF' : '#98C379',
                          border: `1px solid ${item.esCasa ? 'rgba(97, 175, 239, 0.3)' : 'rgba(152, 195, 121, 0.3)'}`
                        }}>
                          {item.tag}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '10px 14px', textAlign: 'right', fontWeight: 700,
                        color: isIng ? '#2ecc71' : '#e74c3c', whiteSpace: 'nowrap'
                      }}>
                        {isIng ? '+' : '-'}{formatARS(item.monto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#9DA8BA' }}>
            Mostrando {transactionsList.length} transacciones
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#1E2536', color: '#FFF', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
