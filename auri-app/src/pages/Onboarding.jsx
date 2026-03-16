import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Onboarding() {
  const { user, profile, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [moneda, setMoneda] = useState('ARS');
  const [accountName, setAccountName] = useState('Efectivo');
  const [accountType, setAccountType] = useState('efectivo');

  useEffect(() => {
    // Si ya completó onboarding, va al dashboard
    // Chequeamos si tiene al menos una cuenta
    const checkStatus = async () => {
      if (!user) return;
      const { count } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (count && count > 0) {
        navigate('/dashboard');
      }
    };
    checkStatus();
  }, [user, navigate]);

  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Update Profile (Currency)
      await supabase
        .from('profiles')
        .update({ moneda_principal: moneda })
        .eq('id', user.id);

      // 2. Create Initial Account
      await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          nombre: accountName,
          tipo: accountType,
          moneda: moneda,
          saldo_inicial: 0
        });

      // Refetch profile to get new settings
      await fetchProfile(user.id);
      
      // Go to Dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error in onboarding:', error);
      alert('Hubo un error al guardar tu configuración. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '48px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--color-gold)', marginBottom: '8px' }}>Bienvenido a Auri</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Configuremos tu espacio financiero</p>
      </div>

      <div className="card">
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Paso 1: ¿Cuál es tu moneda principal?</h3>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <label style={{ 
                display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '8px', 
                border: `2px solid ${moneda === 'ARS' ? 'var(--color-gold)' : 'var(--color-border)'}`,
                backgroundColor: 'var(--color-surface-2)', cursor: 'pointer'
              }}>
                <input type="radio" name="moneda" value="ARS" checked={moneda === 'ARS'} onChange={() => setMoneda('ARS')} style={{ marginRight: '12px' }}/>
                <div>
                  <div style={{ fontWeight: 500 }}>Pesos Argentinos (ARS)</div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '8px', 
                border: `2px solid ${moneda === 'USD' ? 'var(--color-gold)' : 'var(--color-border)'}`,
                backgroundColor: 'var(--color-surface-2)', cursor: 'pointer'
              }}>
                <input type="radio" name="moneda" value="USD" checked={moneda === 'USD'} onChange={() => setMoneda('USD')} style={{ marginRight: '12px' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Dólares (USD)</div>
                </div>
              </label>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setStep(2)}>
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Paso 2: Creá tu primera cuenta</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Para empezar a registrar movimientos, necesitás al menos una cuenta. Podés agregar más después.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Nombre de cuenta</label>
                <input 
                  type="text" 
                  className="input" 
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ej: Billetera, Banco Galicia, MercadoPago"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Tipo</label>
                <select 
                  className="input" 
                  value={accountType} 
                  onChange={(e) => setAccountType(e.target.value)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="banco">Banco</option>
                  <option value="virtual">Billetera Virtual</option>
                  <option value="inversion">Inversión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                Atrás
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✨</div>
            <h3 style={{ marginBottom: '16px' }}>¡Todo listo!</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
              Tu perfil está configurado. Ya podés empezar a tomar el control de tus finanzas.
            </p>
            
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleComplete} disabled={loading}>
              {loading ? 'Guardando...' : 'Empezar a usar Auri'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
