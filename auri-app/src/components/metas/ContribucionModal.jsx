import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDolarRate from '../../hooks/useDolarBlue';
import { formatARS } from '../../utils/currency';
import { X, Save, TrendingUp, Wallet, ArrowRight, Calendar as CalendarIcon, FileText } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';

import confetti from 'canvas-confetti';
import FelicidadesModal from './FelicidadesModal';

const celebrarMeta = () => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#C9A84C', '#E8C97A', '#2ECC71', '#ffffff']
  });
};

export default function ContribucionModal({ isOpen, onClose, meta, onSuccess }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { venta: dolarVenta } = useDolarRate(profile?.tipo_cambio_pref || 'oficial');
  
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Cálculo sugerido
  const sugerido = (() => {
    if (!meta) return 0;
    const hoy = new Date();
    const limite = meta.fecha_limite ? new Date(meta.fecha_limite + 'T12:00:00') : null;
    if (!limite || limite < hoy) return Math.max(0, meta.monto_objetivo - meta.monto_actual);
    const meses = Math.max(1, (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth()) + 1);
    return (meta.monto_objetivo - meta.monto_actual) / meses;
  })();

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setMonto('');
      setNota('');
      setIsSuccessModalOpen(false);
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('id, nombre, saldo_inicial, moneda').eq('user_id', user.id);
    setAccounts(data || []);
    if (meta?.account_id) {
      setSelectedAccountId(meta.account_id);
    } else if (data?.length > 0) {
      setSelectedAccountId(data[0].id);
    }
  };

  const getOrCreateGoalCategory = async () => {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('nombre', 'Metas de ahorro')
      .maybeSingle();

    if (existing) return existing.id;
    const { data: nuevo } = await supabase
      .from('categories')
      .insert([{ user_id: user.id, nombre: 'Metas de ahorro', icono: '🎯', color: '#C9A84C', tipo: 'egreso' }])
      .select('id')
      .single();
    return nuevo?.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccountId || !monto || Number(monto) <= 0) return;
    
    setLoading(true);
    const account = accounts.find(a => a.id === selectedAccountId);
    const amountNum = Number(monto);
    const dv = dolarVenta || 1;

    let montoParaMeta = amountNum;
    if (account.moneda === 'ARS' && meta.moneda === 'USD') montoParaMeta = amountNum / dv;
    else if (account.moneda === 'USD' && meta.moneda === 'ARS') montoParaMeta = amountNum * dv;

    try {
      const categoryId = await getOrCreateGoalCategory();

      // 1. Transacción
      const { data: tx, error: txError } = await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: selectedAccountId,
        category_id: categoryId,
        monto: amountNum,
        moneda: account.moneda,
        tipo: 'egreso',
        fecha: fecha,
        descripcion: `Contribución: ${meta.nombre}`,
        savings_goal_id: meta.id,
        tipo_cambio: account.moneda === 'USD' || meta.moneda === 'USD' ? dv : 1,
        notas: nota
      }]).select('id').single();

      if (txError) throw txError;

      // 2. goal_contributions
      const { error: contribError } = await supabase.from('goal_contributions').insert([{
        user_id: user.id,
        goal_id: meta.id,
        account_id: selectedAccountId,
        transaction_id: tx.id,
        monto: amountNum,
        fecha: fecha,
        nota: nota
      }]);

      if (contribError) throw contribError;

      // 3. Meta update
      const nuevoMonto = Number(meta.monto_actual) + montoParaMeta;
      const haLlegado = nuevoMonto >= (meta.monto_objetivo - 0.01);
      
      const { error: goalError } = await supabase.from('savings_goals')
        .update({ 
          monto_actual: Math.min(meta.monto_objetivo, nuevoMonto),
          completada: haLlegado,
          completada_at: haLlegado ? new Date() : null,
          updated_at: new Date()
        })
        .eq('id', meta.id);

      if (goalError) throw goalError;

      if (haLlegado) {
        celebrarMeta();
        setIsSuccessModalOpen(true);
      } else {
        toast.success('Contribución registrada');
        onSuccess && onSuccess();
        onClose();
      }
    } catch (error) {
        toast.error('Error al registrar');
        setLoading(false);
    }
  };

  if (!isOpen || !meta) return null;

  return (
    <>
      <div className="modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600 }}>
              Contribuir a Meta
            </h2>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px' }}>
               <div style={{ fontWeight: 600, marginBottom: '4px' }}>{meta.icono} {meta.nombre}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Progreso: {formatARS(meta.monto_actual)} de {formatARS(meta.monto_objetivo)}</div>
               <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, Math.round((meta.monto_actual / meta.monto_objetivo) * 100))}%`, backgroundColor: meta.color }}></div></div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Desde cuenta</label>
                  <select className="input" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.nombre} ({acc.moneda})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Monto</label>
                  <input type="number" step="0.01" className="input" value={monto} onChange={e => setMonto(e.target.value)} />
                  <button type="button" onClick={() => setMonto(sugerido.toFixed(2))} style={{ background: 'none', border: 'none', color: 'var(--color-gold)', fontSize: '0.7rem', padding: '4px 0', cursor: 'pointer', fontWeight: 600 }}>Sugerido: {formatARS(sugerido)}</button>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '12px' }}>
                <DatePickerModern 
                  label="Fecha"
                  value={fecha}
                  onChange={setFecha}
                />
                <div>
                  <label className="label">Nota (opcional)</label>
                  <input placeholder="Nota..." className="input" value={nota} onChange={e => setNota(e.target.value)} />
                </div>
             </div>

             <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>{loading ? 'Confirmando...' : 'Contribuir'}</button>
             </div>
          </form>
        </div>
      </div>
      <FelicidadesModal isOpen={isSuccessModalOpen} onClose={() => { setIsSuccessModalOpen(false); onSuccess && onSuccess(); onClose(); }} meta={meta} />
    </>
  );
}
