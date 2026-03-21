import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

import { formatARS } from '../../utils/currency';
import Skeleton from '../ui/Skeleton';
import { Target, ArrowRight, TrendingUp, AlertCircle, Clock } from 'lucide-react';

const ESTADOS = {
  en_camino: { color: 'var(--color-success)', text: 'En camino' },
  en_riesgo:  { color: 'var(--color-warning)', text: 'En riesgo' },
  atrasada:   { color: 'var(--color-danger)', text: 'Atrasada' },
};

export default function MetasWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: metas, isLoading } = useSWR(
    user ? ['metas-widget', user.id] : null,
    async ([, userId]) => {
      // Usar la RPC para obtener el resumen calculado
      const { data, error } = await supabase.rpc('get_metas_resumen', { p_user_id: userId });
      if (error) throw error;
      return data?.slice(0, 3) || [];
    }
  );

  if (isLoading) return <Skeleton height="350px" />;

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="var(--color-gold)" /> Mis Metas
        </h3>
        <button className="btn btn-secondary" onClick={() => navigate('/metas')} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Ver todas →</button>
      </div>

      {!metas || metas.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Definí tu primer objetivo financiero. ¡Empezá a ahorrar con un objetivo claro!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/metas')}>Crear mi primera meta</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {metas.map(meta => {
            // Lógica de estado simplificada para el widget: 
            // Si la cuota mensual es > que el ahorro promedio reciente (asumido para el widget)
            // Por ahora usaremos 'en_camino' como default si no hay datos de contribución
            const estado = meta.porcentaje < 20 && meta.meses_restantes < 3 ? 'atrasada' : meta.porcentaje < 50 ? 'en_riesgo' : 'en_camino';
            const { color, text } = ESTADOS[estado];

            return (
              <div key={meta.id} onClick={() => navigate(`/metas/${meta.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{meta.icono}</span> {meta.nombre}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{meta.porcentaje}%</div>
                </div>

                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${Math.min(100, meta.porcentaje)}%`, height: '100%', 
                        backgroundColor: meta.color || 'var(--color-gold)', 
                        boxShadow: `0 0 10px ${meta.color}50`,
                        transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <div>
                        <strong>{formatARS(meta.monto_actual)}</strong> / {formatARS(meta.monto_objetivo)} · {meta.meses_restantes !== null ? `Faltan ${meta.meses_restantes} meses` : 'Sin fecha'}
                    </div>
                    <div style={{ color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }}></span>
                        {text.toUpperCase()}
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
