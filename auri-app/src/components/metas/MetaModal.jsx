import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, Save, Target, DollarSign, Palette, Tag, Clock, Wallet } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';


const COLORS = [
  { name: 'Dorado', value: '#C9A84C' },
  { name: 'Azul', value: '#3498DB' },
  { name: 'Verde', value: '#2ECC71' },
  { name: 'Rojo', value: '#E74C3C' },
  { name: 'Violeta', value: '#9B59B6' },
  { name: 'Naranja', value: '#E67E22' },
  { name: 'Rosa', value: '#F06292' },
  { name: 'Celeste', value: '#4FC3F7' },
  { name: 'Gris', value: '#95A5A6' },
  { name: 'Negro', value: '#1F2937' }
];

const ICONS = ['✈️', '🚗', '🏠', '💻', '📱', '🎓', '💍', '🏖️', '🐕', '🚀', '💰', '🎯', '🏋️', '🎸', '⚽', '🌟'];

export default function MetaModal({ isOpen, onClose, meta, onSuccess }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const [formData, setFormData] = useState({
    nombre: '',
    monto_objetivo: '',
    moneda: 'ARS',
    fecha_limite: '',
    icono: '🎯',
    color: '#C9A84C',
    descripcion: '',
    account_id: '',
    contribucion_automatica: false,
    monto_auto: '',
    dia_auto: '1'
  });

  useEffect(() => {
    if (isOpen) {
      if (meta) {
        setFormData({
          nombre: meta.nombre,
          monto_objetivo: meta.monto_objetivo,
          moneda: meta.moneda,
          fecha_limite: meta.fecha_limite || '',
          icono: meta.icono || '🎯',
          color: meta.color || '#C9A84C',
          descripcion: meta.descripcion || '',
          account_id: meta.account_id || '',
          contribucion_automatica: !!meta.recurring_expense_id,
          monto_auto: '', // Esto se cargaría del recurrente si existiera, simplificando para Etapa 5
          dia_auto: '1'
        });
      } else {
        setFormData({
          nombre: '',
          monto_objetivo: '',
          moneda: 'ARS',
          fecha_limite: '',
          icono: '🎯',
          color: '#C9A84C',
          descripcion: '',
          account_id: '',
          contribucion_automatica: false,
          monto_auto: '',
          dia_auto: '1'
        });
      }
      fetchAccounts();
    }
  }, [isOpen, meta]);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('id, nombre, moneda').eq('user_id', user.id);
    setAccounts(data || []);
  };

  const getOrCreateGoalCategory = async () => {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('nombre', 'Metas de ahorro')
      .maybeSingle();

    if (existing) return existing.id;

    const { data: nuevo, error } = await supabase
      .from('categories')
      .insert([{ user_id: user.id, nombre: 'Metas de ahorro', icono: '🎯', color: '#C9A84C', tipo: 'egreso' }])
      .select('id')
      .single();

    if (error) throw error;
    return nuevo.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        nombre: formData.nombre,
        monto_objetivo: Number(formData.monto_objetivo),
        moneda: formData.moneda,
        fecha_limite: formData.fecha_limite || null,
        icono: formData.icono,
        color: formData.color,
        descripcion: formData.descripcion,
        account_id: formData.account_id || null,
        updated_at: new Date()
      };

      let goalId = meta?.id;
      if (meta) {
        const { error } = await supabase.from('savings_goals').update(payload).eq('id', meta.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('savings_goals').insert([payload]).select('id').single();
        if (error) throw error;
        goalId = data.id;
      }

      // Manejar contribución automática
      if (formData.contribucion_automatica && formData.monto_auto) {
        const categoryId = await getOrCreateGoalCategory();
        const recurringPayload = {
          user_id: user.id,
          account_id: formData.account_id || accounts[0]?.id,
          category_id: categoryId,
          nombre: `Cuota: ${formData.nombre}`,
          monto: Number(formData.monto_auto),
          moneda: formData.moneda, // O la de la cuenta? User dice "Monto fijo por mes"
          frecuencia: 'mensual',
          dia_ejecucion: Number(formData.dia_auto),
          savings_goal_id: goalId,
          estado: 'activo'
        };

        const { data: recExp, error: recError } = await supabase.from('recurring_expenses').insert([recurringPayload]).select('id').single();
        if (recError) throw recError;

        // Vincular recurrente a la meta
        await supabase.from('savings_goals').update({ recurring_expense_id: recExp.id }).eq('id', goalId);
      }

      toast.success(meta ? 'Meta actualizada' : 'Nueva meta creada');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error al guardar la meta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '550px', padding: '0', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', backgroundColor: 'var(--color-surface)', zIndex: 10 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600 }}>
            {meta ? 'Editar Meta' : 'Nueva Meta'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label className="label">Nombre *</label>
            <input 
              required 
              className="input" 
              placeholder="Ej: Fondo para Europa" 
              value={formData.nombre} 
              onChange={e => setFormData({...formData, nombre: e.target.value})} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
            <div>
              <label className="label">Monto Objetivo *</label>
              <input required type="number" className="input" placeholder="0.00" value={formData.monto_objetivo} onChange={e => setFormData({...formData, monto_objetivo: e.target.value})} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={formData.moneda} onChange={e => setFormData({...formData, moneda: e.target.value})}>
                <option value="ARS">ARS 🇦🇷</option>
                <option value="USD">USD 🇺🇸</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <DatePickerModern 
                label="Fecha Límite (Opcional)"
                value={formData.fecha_limite}
                onChange={val => setFormData({...formData, fecha_limite: val})}
              />
            </div>
            <div>
              <label className="label">Cuenta Principal (Ahorro)</label>
              <select className="input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                <option value="">Cualquier cuenta</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.nombre} ({acc.moneda})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Ícono *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', padding: '12px', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px' }}>
              {ICONS.map(i => (
                <button key={i} type="button" onClick={() => setFormData({...formData, icono: i})} style={{
                  padding: '8px', fontSize: '1.25rem', background: formData.icono === i ? 'rgba(201,168,76,0.3)' : 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}>{i}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px' }}>
              {COLORS.map(c => (
                <button key={c.value} title={c.name} type="button" onClick={() => setFormData({...formData, color: c.value})} style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.value, border: formData.color === c.value ? '3px solid white' : 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--color-gold)" /> Contribución automática
              </div>
              <label className="switch">
                <input type="checkbox" checked={formData.contribucion_automatica} onChange={e => setFormData({...formData, contribucion_automatica: e.target.checked})} />
                <span className="slider round"></span>
              </label>
            </div>
            {formData.contribucion_automatica && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', animation: 'fadeIn 0.3s' }}>
                <div>
                  <label className="label">Monto por mes</label>
                  <input type="number" className="input" placeholder="0.00" value={formData.monto_auto} onChange={e => setFormData({...formData, monto_auto: e.target.value})} />
                </div>
                <div>
                  <label className="label">Día del mes</label>
                  <input type="number" className="input" min="1" max="28" value={formData.dia_auto} onChange={e => setFormData({...formData, dia_auto: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Meta'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .label { display: block; font-size: 0.85rem; margin-bottom: 8px; font-weight: 500; color: var(--color-text-muted); }
        .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-surface-2); transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 3px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: var(--color-gold); }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { borderRadius: 34px; }
        .slider.round:before { borderRadius: 50%; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
