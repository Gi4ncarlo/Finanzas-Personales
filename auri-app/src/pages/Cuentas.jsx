import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import useDolarRate from '../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import CuentaModal from '../components/cuentas/CuentaModal';
import { Plus, MoreVertical, Eye, Pencil, Trash2, Wallet, Building2, Banknote, Smartphone, Briefcase, PiggyBank, Star, CreditCard } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet, building: Building2, cash: Banknote, 'credit-card': CreditCard,
  smartphone: Smartphone, briefcase: Briefcase, 'piggy-bank': PiggyBank, star: Star,
};

const TIPO_LABELS = { banco: 'Banco', efectivo: 'Efectivo', virtual: 'Virtual', inversion: 'Inversión', otro: 'Otro' };

export default function Cuentas() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { venta: dolarVenta } = useDolarRate(profile?.tipo_cambio_pref || 'oficial');

  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Error al cargar las cuentas.');
      console.error(error);
      setLoading(false);
      return;
    }
    setAccounts(data || []);

    // Calcular saldos desde transacciones
    const { data: txns, error: txError } = await supabase
      .from('transactions')
      .select('account_id, account_destino_id, tipo, monto')
      .eq('user_id', user.id);

    if (!txError && txns) {
      const bals = {};
      for (const acc of data) {
        bals[acc.id] = acc.saldo_inicial || 0;
      }
      for (const tx of txns) {
        if (tx.tipo === 'ingreso') {
          bals[tx.account_id] = (bals[tx.account_id] || 0) + Number(tx.monto);
        } else if (tx.tipo === 'egreso') {
          bals[tx.account_id] = (bals[tx.account_id] || 0) - Number(tx.monto);
        } else if (tx.tipo === 'transferencia') {
          bals[tx.account_id] = (bals[tx.account_id] || 0) - Number(tx.monto);
          if (tx.account_destino_id) {
            bals[tx.account_destino_id] = (bals[tx.account_destino_id] || 0) + Number(tx.monto);
          }
        }
      }
      setBalances(bals);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSave = async (accountData) => {
    if (editingAccount) {
      const { error } = await supabase.from('accounts').update(accountData).eq('id', editingAccount.id);
      if (error) throw error;
      toast.success('Cuenta actualizada.');
    } else {
      const { error } = await supabase.from('accounts').insert({ ...accountData, user_id: user.id });
      if (error) throw error;
      toast.success('Cuenta creada con éxito.');
    }
    setEditingAccount(null);
    fetchAccounts();
  };

  const handleDelete = async (account) => {
    // Check si tiene transacciones
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account.id);

    if (count > 0) {
      const ok = await confirm(`Esta cuenta tiene ${count} transacción(es) asociada(s). ¿Seguro que querés eliminarla? Las transacciones quedarán sin cuenta.`);
      if (!ok) return;
    } else {
      const ok = await confirm('¿Seguro que querés eliminar esta cuenta?');
      if (!ok) return;
    }

    const { error } = await supabase.from('accounts').delete().eq('id', account.id);
    if (error) {
      toast.error('No se pudo eliminar la cuenta.');
      console.error(error);
    } else {
      toast.success('Cuenta eliminada.');
      fetchAccounts();
    }
  };

  // Calcular totales
  const totalARS = accounts.reduce((sum, acc) => {
    const bal = balances[acc.id] || 0;
    if (acc.moneda === 'ARS') return sum + bal;
    if (acc.moneda === 'USD' && dolarVenta) return sum + bal * dolarVenta;
    return sum;
  }, 0);

  const totalUSD = accounts.reduce((sum, acc) => {
    const bal = balances[acc.id] || 0;
    if (acc.moneda === 'USD') return sum + bal;
    if (acc.moneda === 'ARS' && dolarVenta) return sum + bal / dolarVenta;
    return sum;
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Mis Cuentas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Gestioná tus cuentas bancarias, billeteras y más.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingAccount(null); setModalOpen(true); }}>
          <Plus size={18} /> Nueva Cuenta
        </button>
      </header>

      {/* Saldo Total */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', padding: '20px', background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Saldo Total en ARS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>{loading ? <Skeleton width="120px" height="28px" /> : formatARS(totalARS)}</div>
        </div>
        <div style={{ width: '1px', backgroundColor: 'var(--color-border)' }}></div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Saldo Total en USD</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? <Skeleton width="120px" height="28px" /> : formatUSD(totalUSD)}</div>
        </div>
      </div>

      {/* Grid de cuentas */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height="180px" borderRadius="12px" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {accounts.map(acc => {
            const Icon = ICON_MAP[acc.icono] || Wallet;
            const bal = balances[acc.id] || 0;
            return (
              <div key={acc.id} className="card" style={{ position: 'relative', borderTop: `3px solid ${acc.color || 'var(--color-gold)'}`, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${acc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={acc.color} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setMenuOpen(menuOpen === acc.id ? null : acc.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen === acc.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', minWidth: '150px', zIndex: 50, overflow: 'hidden' }}>
                        <button onClick={() => { navigate(`/cuentas/${acc.id}`); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', border: 'none', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <Eye size={16} /> Ver detalle
                        </button>
                        <button onClick={() => { setEditingAccount(acc); setModalOpen(true); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', border: 'none', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <Pencil size={16} /> Editar
                        </button>
                        <button onClick={() => { handleDelete(acc); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', border: 'none', backgroundColor: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>{acc.nombre}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{TIPO_LABELS[acc.tipo] || acc.tipo} · {acc.moneda}</span>

                <div style={{ marginTop: '16px', fontSize: '1.5rem', fontWeight: 700 }}>
                  {acc.moneda === 'ARS' ? formatARS(bal) : formatUSD(bal)}
                </div>

                <button
                  onClick={() => navigate(`/cuentas/${acc.id}`)}
                  style={{ marginTop: '16px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
                >
                  Ver movimientos →
                </button>
              </div>
            );
          })}

          {/* Card + nueva cuenta */}
          <button
            onClick={() => { setEditingAccount(null); setModalOpen(true); }}
            className="card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '200px', cursor: 'pointer', borderStyle: 'dashed',
              color: 'var(--color-text-muted)', gap: '12px', transition: 'all 0.2s', fontSize: '1rem', fontWeight: 500,
            }}
          >
            <Plus size={32} />
            Agregar cuenta
          </button>
        </div>
      )}

      <CuentaModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingAccount(null); }} onSave={handleSave} cuenta={editingAccount} />
    </div>
  );
}
