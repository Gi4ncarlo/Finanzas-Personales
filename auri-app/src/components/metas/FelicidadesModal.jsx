import { useNavigate } from 'react-router-dom';
import { X, Target, Plus, CheckCircle2 } from 'lucide-react';

export default function FelicidadesModal({ isOpen, onClose, meta }) {
  const navigate = useNavigate();

  if (!isOpen || !meta) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
    }}>
      <div className="card" style={{ 
        width: '100%', maxWidth: '450px', padding: '48px 32px', textAlign: 'center', 
        background: 'linear-gradient(135deg, var(--color-surface), rgba(46,204,113,0.1))',
        border: '2px solid var(--color-success)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ 
            position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', 
            borderRadius: '50%', background: 'rgba(46,204,113,0.05)', zIndex: 0 
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-success)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                color: '#fff', fontSize: '2.5rem', boxShadow: '0 0 20px rgba(46,204,113,0.4)'
            }}>
                <CheckCircle2 size={48} />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-success)' }}>¡Meta alcanzada! 🎉</h2>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{meta.icono}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>{meta.nombre}</h3>
            
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
                ¡Lo lograste! Ahorraste el total de <strong>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(meta.monto_objetivo)}</strong>. 
                Tus metas financieras están cada vez más cerca. 🥳
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => { onClose(); navigate('/metas'); }} style={{ flex: 1 }}>Ver mis metas</button>
                <button className="btn btn-primary" onClick={() => { onClose(); navigate('/metas'); }} style={{ flex: 1 }}>Nueva meta</button>
            </div>
        </div>
      </div>
    </div>
  );
}
