import { useState } from 'react';
import { formatARS } from '../../utils/currency';
import { Plus, Edit2, Trash2, Home, Zap, ShoppingCart, Heart, ShieldAlert, ArrowDownRight, FolderCheck } from 'lucide-react';

const ICON_MAP = {
  home: <Home size={20} />,
  zap: <Zap size={20} />,
  'shopping-cart': <ShoppingCart size={20} />,
  heart: <Heart size={20} />,
  'shield-alert': <ShieldAlert size={20} />
};

export default function SobresGrid({ 
  buckets, 
  spendingPerBucket, 
  onAddBucket, 
  onEditBucket, 
  onDeleteBucket,
  onQuickExpense
}) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderCheck size={22} style={{ color: '#61AFEF' }} />
            Sobres de Gastos de Casa y Supervivencia
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Presupuestos por rubro dentro del Fondo de la Casa para controlar en qué se va el dinero.
          </p>
        </div>

        <button
          onClick={onAddBucket}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(97, 175, 239, 0.15)',
            color: '#61AFEF',
            border: '1px solid rgba(97, 175, 239, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <Plus size={16} />
          <span>Nuevo Sobre</span>
        </button>
      </div>

      {buckets.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          No tienes sobres de casa configurados aún. ¡Crea el primero para organizar tus gastos!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {buckets.map((bucket) => {
            const presupuestado = Number(bucket.monto_presupuestado) || 0;
            const gastado = Number(spendingPerBucket[bucket.id] || 0);
            const disponible = presupuestado - gastado;
            const porcentajeGastado = presupuestado > 0 ? (gastado / presupuestado) * 100 : 0;

            let barColor = 'var(--color-success)';
            if (porcentajeGastado > 100) barColor = 'var(--color-danger)';
            else if (porcentajeGastado > 80) barColor = 'var(--color-gold)';

            const iconElement = ICON_MAP[bucket.icono] || <Home size={20} />;

            return (
              <div
                key={bucket.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Header del Sobre */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      backgroundColor: bucket.color ? `${bucket.color}20` : 'rgba(97, 175, 239, 0.15)',
                      color: bucket.color || '#61AFEF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {iconElement}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {bucket.nombre}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Meta: {formatARS(presupuestado)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onEditBucket(bucket)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                      title="Editar sobre"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => onDeleteBucket(bucket.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                      title="Eliminar sobre"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Saldo Disponible y Gastado */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Restante en Sobre:</span>
                    <span style={{
                      fontSize: '1.2rem', fontWeight: 700,
                      color: disponible >= 0 ? 'var(--color-text)' : 'var(--color-danger)'
                    }}>
                      {formatARS(disponible)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Gastado este mes: {formatARS(gastado)}</span>
                    <span>{porcentajeGastado.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, porcentajeGastado)}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => onQuickExpense(bucket)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-2)',
                    color: 'var(--color-text)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <ArrowDownRight size={14} style={{ color: 'var(--color-danger)' }} />
                  <span>Registrar Gasto en este Sobre</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
