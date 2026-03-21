import { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Cargar notificaciones iniciales
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setNotifications(data);

      const { count } = await supabase
        .from('app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('leida', false);

      setUnreadCount(count || 0);
    };

    fetchNotifications();

    // 2. Suscripción en tiempo real
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 5));
        setUnreadCount(c => c + 1);
        toast.info(`🔔 ${payload.new.titulo}`);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Al marcar como leída
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('app_notifications')
      .update({ leida: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    }
  };

  const markAllAsRead = async () => {
    await supabase.from('app_notifications').update({ leida: true }).eq('user_id', user.id).eq('leida', false);
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '50%',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: unreadCount > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)',
          transition: 'all 0.2s', position: 'relative'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            backgroundColor: 'var(--color-danger)', color: '#fff',
            fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
            borderRadius: '10px', border: '2px solid var(--color-surface)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '12px',
          width: '320px', backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)', zIndex: 100,
          overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Notificaciones</h4>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ fontSize: '0.75rem', color: 'var(--color-gold)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>Marcar todas leídas</button>
            )}
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No tenés notificaciones.</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.leida && markAsRead(n.id)}
                  style={{
                    padding: '16px', borderBottom: '1px solid var(--color-border)',
                    backgroundColor: n.leida ? 'transparent' : 'rgba(201,168,76,0.05)',
                    cursor: 'pointer', transition: 'background 0.2s',
                    position: 'relative'
                  }}
                >
                  {!n.leida && <span style={{ position: 'absolute', left: '6px', top: '22px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-gold)' }}></span>}
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{n.titulo}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{n.mensaje}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
            <button 
              onClick={() => { setIsOpen(false); /* navigate('/notificaciones') */ }}
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
            >
              Ver todas <ExternalLink size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
