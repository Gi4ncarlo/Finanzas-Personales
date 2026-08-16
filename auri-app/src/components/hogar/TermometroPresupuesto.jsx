import { useMemo } from 'react';
import { formatARS } from '../../utils/currency';
import { 
  Flame, ShieldCheck, AlertTriangle, AlertOctagon, TrendingUp, 
  Clock, CheckCircle2, ArrowUpRight, Zap
} from 'lucide-react';

export default function TermometroPresupuesto({
  presupuestoPrevisto = 0,
  totalGastadoCasa = 0,
  totalGastadoPersonal = 0
}) {
  // El termómetro del hogar evalúa exclusivamente el consumo de gastos de la casa
  const totalConsumido = totalGastadoCasa;
  const porcentajeConsumido = presupuestoPrevisto > 0 
    ? (totalConsumido / presupuestoPrevisto) * 100 
    : 0;

  const estaExcedido = totalConsumido > presupuestoPrevisto;
  const montoExcedido = Math.max(0, totalConsumido - presupuestoPrevisto);
  const montoRestante = Math.max(0, presupuestoPrevisto - totalConsumido);

  // Días del mes y ritmo de consumo
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const totalDiasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const porcentajeTiempoMes = (diaActual / totalDiasMes) * 100;

  // Clasificación de Estado y Paleta de Colores
  const statusConfig = useMemo(() => {
    if (estaExcedido) {
      return {
        key: 'excedido',
        label: '¡PRESUPUESTO SUPERADO!',
        color: '#FF4D4D',
        gradient: 'linear-gradient(90deg, #FF4D4D 0%, #FF2A6D 50%, #D60000 100%)',
        bgSubtle: 'rgba(255, 77, 77, 0.12)',
        borderColor: 'rgba(255, 77, 77, 0.4)',
        icon: AlertOctagon,
        badgeText: `🚨 Excedido por ${formatARS(montoExcedido)}`,
        comment: `Has gastado un ${(porcentajeConsumido - 100).toFixed(1)}% por encima del presupuesto límite fijado para este mes.`
      };
    } else if (porcentajeConsumido >= 90) {
      return {
        key: 'peligro',
        label: 'En Alerta Crítica (Peligro de Exceso)',
        color: '#FF9F43',
        gradient: 'linear-gradient(90deg, #FF9F43 0%, #FF6B6B 100%)',
        bgSubtle: 'rgba(255, 159, 67, 0.12)',
        borderColor: 'rgba(255, 159, 67, 0.4)',
        icon: Flame,
        badgeText: '⚠️ Queda menos del 10%',
        comment: `Quedan únicamente ${formatARS(montoRestante)} disponibles para los días restantes del mes.`
      };
    } else if (porcentajeConsumido >= 70) {
      return {
        key: 'precaucion',
        label: 'Consumo Moderado - Alto',
        color: '#E5C07B',
        gradient: 'linear-gradient(90deg, #E5C07B 0%, #F39C12 100%)',
        bgSubtle: 'rgba(229, 192, 123, 0.12)',
        borderColor: 'rgba(229, 192, 123, 0.4)',
        icon: AlertTriangle,
        badgeText: '⚡ Consumo elevado',
        comment: `Has alcanzado el ${porcentajeConsumido.toFixed(1)}% de tu meta mensual. Administrá las compras restantes.`
      };
    } else {
      return {
        key: 'saludable',
        label: 'Ritmo Saludable y Sostenible',
        color: '#2ECC71',
        gradient: 'linear-gradient(90deg, #2ECC71 0%, #10B981 100%)',
        bgSubtle: 'rgba(46, 204, 113, 0.12)',
        borderColor: 'rgba(46, 204, 113, 0.4)',
        icon: ShieldCheck,
        badgeText: '✓ Buen control',
        comment: `Excelente ritmo financiero. Tenés ${formatARS(montoRestante)} disponibles en tu presupuesto.`
      };
    }
  }, [estaExcedido, porcentajeConsumido, montoExcedido, montoRestante]);

  // Análisis de Velocidad de Gasto vs Tiempo Transcurrido
  const ritmoConsumoText = useMemo(() => {
    const dif = porcentajeConsumido - porcentajeTiempoMes;
    if (estaExcedido) {
      return `Superaste el límite antes del cierre del mes (Día ${diaActual} de ${totalDiasMes}).`;
    }
    if (dif > 15) {
      return `Estás gastando más rápido que el avance del tiempo (Llevás ${porcentajeTiempoMes.toFixed(0)}% del mes vs ${porcentajeConsumido.toFixed(0)}% consumido).`;
    } else if (dif < -10) {
      return `Tu velocidad de gasto está por debajo del tiempo transcurrido (${porcentajeTiempoMes.toFixed(0)}% del mes transcurrido). ¡Excelente disciplina!`;
    }
    return `Tu ritmo de consumo acompaña de forma equilibrada el avance del mes (${porcentajeTiempoMes.toFixed(0)}% del mes transcurrido).`;
  }, [porcentajeConsumido, porcentajeTiempoMes, estaExcedido, diaActual, totalDiasMes]);

  const StatusIcon = statusConfig.icon;

  // Porcentaje visual para la barra (puede sobrepasar el 100% si está excedido, máx 125% para visualización limpia)
  const barVisualWidth = Math.min(100, estaExcedido ? 100 : porcentajeConsumido);
  const excessVisualWidth = estaExcedido ? Math.min(25, Math.max(5, porcentajeConsumido - 100)) : 0;

  return (
    <div style={{
      backgroundColor: 'rgba(20, 26, 40, 0.75)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${statusConfig.borderColor}`,
      borderRadius: '16px',
      padding: '22px 24px',
      marginTop: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes shimmerLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulseExceeded {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        .shimmer-effect {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          animation: shimmerLine 2.5s infinite;
        }
        .striped-exceeded {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(255, 77, 77, 0.9),
            rgba(255, 77, 77, 0.9) 10px,
            rgba(214, 0, 0, 0.95) 10px,
            rgba(214, 0, 0, 0.95) 20px
          );
          animation: pulseExceeded 1.8s infinite;
        }
      `}</style>

      {/* Header Termómetro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            backgroundColor: statusConfig.bgSubtle, color: statusConfig.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${statusConfig.borderColor}`
          }}>
            <StatusIcon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text, #FFF)' }}>
                Termómetro de Consumo Presupuestado Mensual
              </h3>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                backgroundColor: statusConfig.bgSubtle, color: statusConfig.color,
                border: `1px solid ${statusConfig.borderColor}`
              }}>
                {statusConfig.badgeText}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted, #9DA8BA)' }}>
              {statusConfig.comment}
            </p>
          </div>
        </div>

        {/* Porcentaje Porcentual Big */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: statusConfig.color, lineHeight: 1 }}>
            {porcentajeConsumido.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #9DA8BA)', fontWeight: 600, marginTop: '2px' }}>
            {estaExcedido ? 'Consumo Total Excedido' : 'del Presupuesto Meta'}
          </div>
        </div>
      </div>

      {/* Barra Multinivel del Termómetro */}
      <div style={{ position: 'relative', marginBottom: '16px', paddingTop: '4px' }}>
        {/* Marcadores de referencia (0%, 25%, 50%, 75%, 100%) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.7rem', color: '#9DA8BA', fontWeight: 600 }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span style={{ color: estaExcedido ? '#FF4D4D' : '#E5C07B', fontWeight: 800 }}>Meta (100%)</span>
        </div>

        {/* Contenedor Pista Principal */}
        <div style={{
          height: '20px',
          width: '100%',
          backgroundColor: '#131824',
          borderRadius: '10px',
          padding: '3px',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Barra Normal de Progreso (hasta 100%) */}
          <div style={{
            width: `${barVisualWidth}%`,
            height: '100%',
            background: statusConfig.gradient,
            borderRadius: estaExcedido ? '7px 0 0 7px' : '7px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: `0 0 16px ${statusConfig.color}66`
          }}>
            {!estaExcedido && <div className="shimmer-effect" />}
          </div>

          {/* Segmento Excedido Animado (si superó el 100%) */}
          {estaExcedido && (
            <div 
              className="striped-exceeded"
              style={{
                width: `${excessVisualWidth}%`,
                height: '100%',
                borderRadius: '0 7px 7px 0',
                position: 'relative',
                transition: 'width 0.8s ease',
                boxShadow: '0 0 20px rgba(255, 77, 77, 0.8)'
              }}
            />
          )}

          {/* Línea Divisoria del 100% Meta */}
          <div style={{
            position: 'absolute',
            left: '80%', // Posición visual del 100% si hay extensión
            top: 0, bottom: 0,
            width: '2px',
            backgroundColor: '#FFF',
            opacity: 0.5,
            zIndex: 5
          }} />
        </div>
      </div>

      {/* Tarjetas de Desglose de Cifras y Ritmo Temporal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {/* Tarjeta 1: Meta Presupuestada */}
        <div style={{ backgroundColor: '#161B26', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Presupuesto Meta</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E5C07B', marginTop: '2px' }}>{formatARS(presupuestoPrevisto)}</div>
        </div>

        {/* Tarjeta 2: Consumido Real */}
        <div style={{ backgroundColor: '#161B26', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', color: '#9DA8BA', textTransform: 'uppercase', fontWeight: 600 }}>Ejecutado Real</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: statusConfig.color, marginTop: '2px' }}>{formatARS(totalConsumido)}</div>
        </div>

        {/* Tarjeta 3: Restante o Excedido */}
        <div style={{
          backgroundColor: estaExcedido ? 'rgba(255, 77, 77, 0.1)' : '#161B26',
          padding: '10px 14px',
          borderRadius: '10px',
          border: `1px solid ${estaExcedido ? 'rgba(255, 77, 77, 0.4)' : 'rgba(255,255,255,0.06)'}`
        }}>
          <div style={{ fontSize: '0.7rem', color: estaExcedido ? '#FF4D4D' : '#9DA8BA', textTransform: 'uppercase', fontWeight: 700 }}>
            {estaExcedido ? 'Monto Excedido (+)' : 'Restante Disponible'}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: estaExcedido ? '#FF4D4D' : '#2ECC71', marginTop: '2px' }}>
            {estaExcedido ? `+${formatARS(montoExcedido)}` : formatARS(montoRestante)}
          </div>
        </div>

        {/* Tarjeta 4: Velocidad de Gasto vs Mes */}
        <div style={{ backgroundColor: '#161B26', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: '#61AFEF', flexShrink: 0 }} />
          <div style={{ fontSize: '0.74rem', color: '#9DA8BA', lineHeight: '1.3' }}>
            <strong style={{ color: '#FFF' }}>Día {diaActual} de {totalDiasMes}</strong> ({porcentajeTiempoMes.toFixed(0)}% del mes).<br />
            {ritmoConsumoText}
          </div>
        </div>
      </div>
    </div>
  );
}
