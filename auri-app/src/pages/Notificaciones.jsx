import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Bell, Check, Trash2, Calendar, Info } from 'lucide-react';

export default function Notificaciones() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: notifications, mutate, isLoading } = useSWR(
    user ? ['notifications-full', user.id] : null,
    async ([, userId]) => {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  );

  const markRead = async (id) => {
    await supabase.from('app_notifications').update({ leida: true }).eq('id', id);
    mutate();
  };

  const deleteNotif = async (id) => {
    await supabase.from('app_notifications').delete().eq('id', id);
    mutate();
    toast.success('Notificación eliminada');
  };

  if (isLoading) return <Skeleton height="500px" />;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Centro de Notificaciones</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Mantenete al tanto de tus inversiones y metas.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notifications?.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', backgroundColor: 'var(--color-surface-2)', borderRadius: '24px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
             <Bell size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
             <p>No tenés notificaciones aún.</p>
          </div>
        ) : (
          notifications?.map(n => (
            <div key={n.id} className="card" style={{ padding: '20px', display: 'flex', gap: '20px', position: 'relative' }}>
               {!n.leida && <span style={{ position: 'absolute', top: '24px', left: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-gold)' }}></span>}
               <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', flexShrink: 0 }}>
                  <Bell size={24} />
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                     <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{n.titulo}</h3>
                     <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '8px 0', lineHeight: 1.5 }}>{n.mensaje}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                     {!n.leida && (
                       <button onClick={() => markRead(n.id)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-gold)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Marcar como leída
                       </button>
                     )}
                     <button onClick={() => deleteNotif(n.id)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-danger)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={14} /> Eliminar
                     </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '12px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            <Info size={16} /> Las notificaciones se eliminan automáticamente después de 30 días.
         </div>
      </div>
    </div>
  );
}
