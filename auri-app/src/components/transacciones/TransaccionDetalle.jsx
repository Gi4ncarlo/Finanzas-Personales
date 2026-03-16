import { formatARS, formatUSD } from '../../utils/currency';
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

export default function TransaccionDetalle({ transaccion, onClose, onEdit, onDelete }) {
  if (!transaccion) return null;

  const tx = transaccion;
  const isIngreso = tx.tipo === 'ingreso';
  const isTransferencia = tx.tipo === 'transferencia';
  const fmt = tx.moneda === 'ARS' ? formatARS : formatUSD;

  let TxIcon = ArrowDownLeft;
  let txColor = 'var(--color-danger)';
  let prefix = '-';
  if (isIngreso) { TxIcon = ArrowUpRight; txColor = 'var(--color-success)'; prefix = '+'; }
  else if (isTransferencia) { TxIcon = ArrowLeftRight; txColor = 'var(--color-text-muted)'; prefix = '⇄'; }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '420px', height: '100%', backgroundColor: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)', overflowY: 'auto', animation: 'slideLeft 0.3s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Detalle de Transacción</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Monto destacado */}
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: `${txColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <TxIcon size={28} color={txColor} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: txColor }}>
              {prefix} {fmt(Number(tx.monto))}
            </div>
            <div style={{ color: 'var(--color-text-muted)', marginTop: '8px', textTransform: 'capitalize' }}>{tx.tipo}</div>
          </div>

          {/* Detalles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DetailRow label="Descripción" value={tx.descripcion || '—'} />
            <DetailRow label="Categoría" value={tx.category_name || '—'} />
            <DetailRow label="Cuenta" value={tx.account_name || '—'} />
            {isTransferencia && <DetailRow label="Cuenta Destino" value={tx.account_destino_name || '—'} />}
            <DetailRow label="Fecha" value={new Date(tx.fecha).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <DetailRow label="Moneda" value={tx.moneda} />
            {tx.tipo_cambio && <DetailRow label="Tipo de Cambio" value={`$${tx.tipo_cambio} ARS/USD`} />}
            {tx.notas && <DetailRow label="Notas" value={tx.notas} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => onEdit(tx)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Pencil size={16} /> Editar
          </button>
          <button className="btn" onClick={() => onDelete(tx.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', marginLeft: '16px' }}>{value}</span>
    </div>
  );
}
