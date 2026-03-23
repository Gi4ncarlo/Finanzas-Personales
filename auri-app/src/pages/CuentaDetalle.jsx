import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatARS, formatUSD } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import CuentaModal from '../components/cuentas/CuentaModal';
import { ArrowLeft, Pencil, Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Wallet, Building2, Banknote, Smartphone, Briefcase, PiggyBank, Star, CreditCard } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet, building: Building2, cash: Banknote, 'credit-card': CreditCard,
  smartphone: Smartphone, briefcase: Briefcase, 'piggy-bank': PiggyBank, star: Star,
};

const TIPO_LABELS = { banco: 'Banco', efectivo: 'Efectivo', virtual: 'Virtual', inversion: 'Inversión', otro: 'Otro' };

export default function CuentaDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch cuenta
    const { data: acc, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (accErr || !acc) {
      toast.error('Cuenta no encontrada.');
      navigate('/cuentas');
      return;
    }
    setAccount(acc);

    // Fetch transacciones de esta cuenta
    const { data: txns, error: txErr } = await supabase
      .from('transactions')
      .select('*, categories(nombre, color)')
      .or(`account_id.eq.${id},account_destino_id.eq.${id}`)
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(50);

    if (!txErr) {
      setTransactions(txns || []);
      
      // Calcular saldo
      let bal = acc.saldo_inicial || 0;
      // Necesitamos TODAS las transacciones (no limitadas) para el saldo
      const { data: allTxns } = await supabase
        .from('transactions')
        .select('account_id, account_destino_id, tipo, monto')
        .or(`account_id.eq.${id},account_destino_id.eq.${id}`)
        .eq('user_id', user.id);

      if (allTxns) {
        for (const tx of allTxns) {
          if (tx.account_id === id) {
            if (tx.tipo === 'ingreso') bal += Number(tx.monto);
            else if (tx.tipo === 'egreso') bal -= Number(tx.monto);
            else if (tx.tipo === 'transferencia') bal -= Number(tx.monto);
          }
          if (tx.account_destino_id === id && tx.tipo === 'transferencia') {
            bal += Number(tx.monto);
          }
        }
      }
      setBalance(bal);
    }
    setLoading(false);
  }, [id, user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async (data) => {
    const { error } = await supabase.from('accounts').update(data).eq('id', id);
    if (error) throw error;
    toast.success('Cuenta actualizada.');
    fetchData();
  };

  const handleDelete = async () => {
    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('account_id', id);
    const msg = count > 0
      ? `Esta cuenta tiene ${count} transacción(es). ¿Seguro que querés eliminarla?`
      : '¿Seguro que querés eliminar esta cuenta?';
    const ok = await confirm(msg);
    if (!ok) return;

    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      toast.error('No se pudo eliminar.');
    } else {
      toast.success('Cuenta eliminada.');
      navigate('/cuentas');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Skeleton height="60px" />
        <Skeleton height="200px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!account) return null;

  const Icon = ICON_MAP[account.icono] || Wallet;
  const fmt = account.moneda === 'ARS' ? formatARS : formatUSD;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Back + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/cuentas')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Volver a cuentas
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pencil size={16} /> Editar
          </button>
          <button className="btn" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="card" style={{ borderTop: `3px solid ${account.color}`, display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: `${account.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={32} color={account.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 600, fontSize: '1.5rem' }}>{account.nombre}</h1>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{TIPO_LABELS[account.tipo] || account.tipo} · {account.moneda}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Saldo Actual</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {fmt(balance)}
          </div>
        </div>
      </div>

      {/* Últimas Transacciones */}
      <div>
        <h2 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '16px' }}>Últimos Movimientos</h2>
        {transactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
            No hay movimientos registrados en esta cuenta.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.map(tx => {
              const isTransferIn = tx.tipo === 'transferencia' && tx.account_destino_id === id;
              let TxIcon = ArrowDownLeft;
              let txColor = 'var(--color-danger)';
              let prefix = '-';

              if (tx.tipo === 'ingreso' || isTransferIn) {
                TxIcon = ArrowUpRight; txColor = 'var(--color-success)'; prefix = '+';
              } else if (tx.tipo === 'transferencia' && !isTransferIn) {
                TxIcon = ArrowLeftRight; txColor = 'var(--color-text-muted)'; prefix = '-';
              }

              return (
                <div key={tx.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: tx.categories?.color ? `${tx.categories.color}20` : 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TxIcon size={18} color={txColor} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{tx.descripcion || 'Sin descripción'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {tx.categories?.nombre || '—'} · {new Date(tx.fecha).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: txColor, fontSize: '1.05rem' }}>
                    {prefix} {fmt(Number(tx.monto))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CuentaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleUpdate} cuenta={account} />
    </div>
  );
}
