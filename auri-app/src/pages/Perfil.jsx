import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LogOut, AlertTriangle, User } from 'lucide-react';

export default function Perfil() {
  const { user, profile, fetchProfile, signOut } = useAuth();
  const { toast } = useToast();
  
  const [nombre, setNombre] = useState('');
  const [monedaPrincipal, setMonedaPrincipal] = useState('ARS');
  const [tipoCambioPref, setTipoCambioPref] = useState('blue');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || '');
      setMonedaPrincipal(profile.moneda_principal || 'ARS');
      setTipoCambioPref(profile.tipo_cambio_pref || 'blue');
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre no puede estar vacío.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre,
          moneda_principal: monedaPrincipal,
          tipo_cambio_pref: tipoCambioPref
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await fetchProfile(user.id);
      toast.success('Perfil actualizado correctamente.');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Ocurrió un error al actualizar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const exchangeRates = [
    { value: 'oficial', label: 'Oficial', desc: 'Cotización BNA sin impuestos.' },
    { value: 'blue', label: 'Dólar Blue', desc: 'Cotización en mercado informal.' },
    { value: 'mep', label: 'Dólar MEP', desc: 'Bolsa local (bonos).' },
    { value: 'ccl', label: 'Contado Con Liqui', desc: 'Bolsa internacional.' },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <header>
        <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Perfil</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Gestioná tu información personal y preferencias base.</p>
      </header>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            borderRadius: '50%', backgroundColor: 'var(--color-surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={32} color="var(--color-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>{user.email}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Cuenta conectada via Email</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '24px', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Nombre</label>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Como se mostrará tu nombre en Auri.</p>
            </div>
            <input 
              type="text" 
              className="input" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '24px', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Moneda Principal</label>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>La moneda base para calcular resúmenes.</p>
            </div>
            <select className="input" value={monedaPrincipal} onChange={(e) => setMonedaPrincipal(e.target.value)}>
              <option value="ARS">Pesos Argentinos (ARS)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '24px', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Tipo de Cambio</label>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>La cotización preferida para conversiones.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exchangeRates.map(rate => (
                <label key={rate.value} style={{ 
                  display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: '8px', 
                  border: `2px solid ${tipoCambioPref === rate.value ? 'var(--color-gold)' : 'var(--color-border)'}`,
                  backgroundColor: 'var(--color-surface-2)', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="radio" 
                      name="tipoCambio" 
                      value={rate.value} 
                      checked={tipoCambioPref === rate.value} 
                      onChange={() => setTipoCambioPref(rate.value)} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{rate.label}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{rate.desc}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ border: '1px solid var(--color-danger)', backgroundColor: 'rgba(231, 76, 60, 0.05)' }}>
        <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertTriangle size={20} />
          Peligro
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Al cerrar sesión deberás volver a ingresar con tu email y contraseña.
        </p>
        <button 
          onClick={() => {
            if (window.confirm('¿Estás seguro que querés cerrar sesión?')) {
              signOut();
            }
          }}
          className="btn" 
          style={{ backgroundColor: 'var(--color-danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>

    </div>
  );
}
