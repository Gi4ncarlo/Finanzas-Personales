import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, Bell, Info } from 'lucide-react';
import { formatUSD, formatARS } from '../../utils/currency';

export default function AlertModal({ isOpen, onClose, asset, currentPrice, onSave }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState('arriba'); // 'arriba' | 'abajo'
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !asset) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!targetPrice || isNaN(targetPrice)) return toast.error('Ingresá un precio válido');

    setLoading(true);
    try {
      // Verificar si ya existe una alerta activa para este activo y dirección
      const { data: existing } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo_simbolo', asset.activo_simbolo)
        .eq('direccion', direction)
        .eq('activa', true)
        .eq('disparada', false);

      if (existing?.length > 0) {
        if (!window.confirm(`Ya tenés una alerta para que ${asset.activo_simbolo} ${direction === 'arriba' ? 'suba' : 'baje'}. ¿Querés reemplazarla?`)) {
            setLoading(false);
            return;
        }
        // Desactivar la anterior
        await supabase.from('price_alerts').update({ activa: false }).eq('id', existing[0].id);
      }

      const { error } = await supabase.from('price_alerts').insert({
        user_id: user.id,
        activo_simbolo: asset.activo_simbolo,
        activo_nombre: asset.activo_nombre,
        coingecko_id: asset.coingecko_id || null,
        precio_objetivo: Number(targetPrice),
        moneda: currency,
        direccion,
        nota: note,
        activa: true,
        disparada: false
      });

      if (error) throw error;
      
      toast.success('Alerta creada correctamente');
      onSave?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear la alerta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={24} color="var(--color-gold)" /> Nueva alerta de precio
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 0' }}>
          <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{asset.activo_nombre} ({asset.activo_simbolo})</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Precio actual: {currency === 'USD' ? formatUSD(currentPrice) : formatARS(currentPrice)}
              </div>
            </div>
            {asset.imagen_url && <img src={asset.imagen_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Notificarme cuando el precio:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setDirection('arriba')}
                style={{
                  padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)',
                  backgroundColor: direction === 'arriba' ? 'rgba(46,204,113,0.1)' : 'transparent',
                  color: direction === 'arriba' ? 'var(--color-success)' : 'var(--color-text-muted)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Suba a
              </button>
              <button 
                type="button"
                onClick={() => setDirection('abajo')}
                style={{
                  padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)',
                  backgroundColor: direction === 'abajo' ? 'rgba(231,76,60,0.1)' : 'transparent',
                  color: direction === 'abajo' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Baje a
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Precio Objetivo</label>
                <input 
                  type="number" 
                  step="any"
                  className="input" 
                  value={targetPrice} 
                  onChange={(e) => setTargetPrice(e.target.value)} 
                  placeholder="0.00"
                  required 
                />
            </div>
            <div style={{ width: '100px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Moneda</label>
                <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                </select>
            </div>
          </div>

          <div>
             <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Nota opcional</label>
             <textarea 
               className="input" 
               rows="2" 
               placeholder="Ej: Vender si llega a este precio"
               value={note}
               onChange={(p) => setNote(p.target.value)}
             ></textarea>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(201,168,76,0.1)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Info size={16} color="var(--color-gold)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gold)', margin: 0 }}>Las alertas se verifican cada 15 minutos automáticamente. Recibirás una notificación en la app.</p>
          </div>

          <div className="modal-footer" style={{ marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear alerta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
