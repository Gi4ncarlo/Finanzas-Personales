import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatUSD, formatARS } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import { Bell, Trash2, ArrowUpRight, ArrowDownLeft, Clock, Info, Plus } from 'lucide-react';

export default function Alertas() {
  const { user } = useAuth();
  const { toast } = useToast();

  // 1. Cargar todas las alertas
  const { data: alerts, mutate, isLoading } = useSWR(
    user ? ['price-alerts-all', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  );

  const activeAlerts = alerts?.filter(a => a.activa && !a.disparada) || [];
  const triggeredAlerts = alerts?.filter(a => a.disparada) || [];

  const deleteAlert = async (id) => {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    const { error } = await supabase.from('price_alerts').delete().eq('id', id);
    if (!error) {
      toast.success('Alerta eliminada');
      mutate();
    }
  };

  if (isLoading) return <Skeleton height="600px" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Mis Alertas de Precio</h1>
           <p style={{ color: 'var(--color-text-muted)' }}>Mantené un seguimiento de tus objetivos financieros.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ACTIVAS */}
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Activas ({activeAlerts.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--color-surface-2)', borderRadius: '16px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}> No tenés alertas activas.</div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
                      <Bell size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{alert.activo_nombre} ({alert.activo_simbolo})</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Si {alert.direccion === 'arriba' ? 'sube' : 'baja'} a <span style={{ color: '#fff', fontWeight: 600 }}>{alert.moneda === 'USD' ? formatUSD(alert.precio_objetivo) : formatARS(alert.precio_objetivo)}</span>
                      </div>
                      {alert.nota && <div style={{ fontSize: '0.75rem', marginTop: '6px', fontStyle: 'italic', opacity: 0.6 }}>"{alert.nota}"</div>}
                    </div>
                  </div>
                  <button onClick={() => deleteAlert(alert.id)} className="btn-icon" style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* DISPARADAS / HISTORIAL */}
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--color-text-muted)" /> Historial (Disparadas)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {triggeredAlerts.length === 0 ? (
               <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>El historial está vacío.</div>
             ) : (
               triggeredAlerts.map(alert => (
                 <div key={alert.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <div style={{ fontSize: '1.2rem' }}>{alert.direccion === 'arriba' ? '📈' : '📉'}</div>
                       <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{alert.activo_simbolo} llegó a {alert.moneda === 'USD' ? formatUSD(alert.precio_objetivo) : formatARS(alert.precio_objetivo)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(alert.disparada_at).toLocaleDateString()} · {new Date(alert.disparada_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       </div>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} className="btn-icon" style={{ opacity: 0.5 }}><Trash2 size={16} /></button>
                 </div>
               ))
             )}
          </div>
        </section>
      </div>

      <div className="card" style={{ padding: '20px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Info size={24} color="var(--color-gold)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Podés crear nuevas alertas desde el detalle de cada inversión en la sección de "Mi Portfolio".</p>
      </div>
    </div>
  );
}
