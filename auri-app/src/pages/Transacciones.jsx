import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatARS, formatUSD } from '../utils/currency';
import { exportToCSV } from '../utils/csv';
import Skeleton from '../components/ui/Skeleton';
import TransaccionModal from '../components/transacciones/TransaccionModal';
import TransaccionDetalle from '../components/transacciones/TransaccionDetalle';
import AjustarMontoModal from '../components/transacciones/AjustarMontoModal';
import { Plus, Download, Search, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Filter } from 'lucide-react';
import DatePickerModern from '../components/ui/DatePickerModern';


const PAGE_SIZE = 20;

export default function Transacciones() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Modal & Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [ajustarMontoTx, setAjustarMontoTx] = useState(null);

  // Filtros desde URL
  const filtros = {
    busqueda: searchParams.get('q') || '',
    tipo: searchParams.get('tipo') || '',
    categoria: searchParams.get('categoria') || '',
    cuenta: searchParams.get('cuenta') || '',
    moneda: searchParams.get('moneda') || '',
    desde: searchParams.get('desde') || '',
    hasta: searchParams.get('hasta') || '',
  };

  const setFiltro = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(0);
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setPage(0);
  };

  const activeFilterCount = Object.values(filtros).filter(Boolean).length;

  // Fetch metadata (cuentas + categorías)
  useEffect(() => {
    const fetchMeta = async () => {
      const [accRes, catRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).order('nombre'),
        supabase.from('categories').select('*').eq('user_id', user.id).order('nombre'),
      ]);
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
    };
    fetchMeta();
  }, [user.id]);

  // Fetch transacciones con filtros
  const fetchTransactions = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('transactions')
      .select('*, categories(nombre, color), accounts!transactions_account_id_fkey(nombre)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros.categoria) query = query.eq('category_id', filtros.categoria);
    if (filtros.cuenta) query = query.eq('account_id', filtros.cuenta);
    if (filtros.moneda) query = query.eq('moneda', filtros.moneda);
    if (filtros.busqueda) query = query.ilike('descripcion', `%${filtros.busqueda}%`);
    if (filtros.desde) query = query.gte('fecha', filtros.desde);
    if (filtros.hasta) query = query.lte('fecha', `${filtros.hasta}T23:59:59`);

    const { data, error, count } = await query;

    if (error) {
      toast.error('Error al cargar transacciones.');
      console.error(error);
    } else {
      // Enriquecer con nombres para el drawer
      const enriched = (data || []).map(tx => ({
        ...tx,
        category_name: tx.categories?.nombre || '—',
        category_color: tx.categories?.color || 'var(--color-text-muted)',
        account_name: tx.accounts?.nombre || '—',
      }));
      setTransactions(enriched);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [user.id, page, filtros.tipo, filtros.categoria, filtros.cuenta, filtros.moneda, filtros.busqueda, filtros.desde, filtros.hasta]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Agrupar por mes
  const grouped = useMemo(() => {
    const groups = {};
    for (const tx of transactions) {
      const date = new Date(tx.fecha);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { label, items: [] };
      groups[key].items.push(tx);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  // Handlers CRUD
  const handleSave = async (payload) => {
    if (payload._isTransferCreate) {
      // Transfer: create 2 linked transactions
      const { _isTransferCreate, ...base } = payload;
      const { error } = await supabase.from('transactions').insert([
        { ...base }, // single row with account_id + account_destino_id
      ]);
      if (error) throw error;
      toast.success('Transferencia registrada.');
    } else if (payload._isTransferEdit) {
      // Transfer edit: update the single transfer row
      const { _isTransferEdit, _parId, ...updateData } = payload;
      const { error } = await supabase.from('transactions').update(updateData).eq('transferencia_par_id', _parId);
      if (error) throw error;
      toast.success('Transferencia actualizada.');
    } else if (editingTx) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', editingTx.id);
      if (error) throw error;
      toast.success('Transacción actualizada.');
    } else {
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      toast.success('Transacción registrada.');
    }
    setEditingTx(null);
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    // Check if it's a transfer with a par
    const tx = transactions.find(t => t.id === id);
    if (tx?.transferencia_par_id) {
      const choice = await confirm(
        '¿Eliminar toda la transferencia (ambas partes)?\n\nAceptar = Eliminar toda la transferencia\nCancelar = No eliminar'
      );
      if (!choice) return;
      const { error } = await supabase.from('transactions').delete().eq('transferencia_par_id', tx.transferencia_par_id);
      if (error) {
        toast.error('No se pudo eliminar la transferencia.');
      } else {
        toast.success('Transferencia completa eliminada.');
        setSelectedTx(null);
        fetchTransactions();
      }
    } else {
      const ok = await confirm('¿Eliminar esta transacción? Esta acción no se puede deshacer.');
      if (!ok) return;
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        toast.error('No se pudo eliminar.');
      } else {
        toast.success('Transacción eliminada.');
        setSelectedTx(null);
        fetchTransactions();
      }
    }
  };

  const handleExportCSV = async () => {
    let query = supabase
      .from('transactions')
      .select('*, categories(nombre), accounts!transactions_account_id_fkey(nombre)')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false });

    if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros.categoria) query = query.eq('category_id', filtros.categoria);
    if (filtros.cuenta) query = query.eq('account_id', filtros.cuenta);
    if (filtros.moneda) query = query.eq('moneda', filtros.moneda);
    if (filtros.busqueda) query = query.ilike('descripcion', `%${filtros.busqueda}%`);
    if (filtros.desde) query = query.gte('fecha', filtros.desde);
    if (filtros.hasta) query = query.lte('fecha', `${filtros.hasta}T23:59:59`);

    const { data } = await query;
    if (data && data.length > 0) {
      const enriched = data.map(tx => ({
        ...tx,
        category_name: tx.categories?.nombre || '',
        account_name: tx.accounts?.nombre || '',
      }));
      exportToCSV(enriched, filtros);
      toast.success(`Exportando ${data.length} transacciones...`);
    } else {
      toast.warning('No hay transacciones para exportar.');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Presets de fecha
  const setDatePreset = (preset) => {
    const now = new Date();
    const next = new URLSearchParams(searchParams);
    if (preset === 'este-mes') {
      next.set('desde', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
      next.delete('hasta');
    } else if (preset === 'mes-anterior') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      next.set('desde', prev.toISOString().slice(0, 10));
      next.set('hasta', lastDay.toISOString().slice(0, 10));
    } else if (preset === 'este-ano') {
      next.set('desde', `${now.getFullYear()}-01-01`);
      next.delete('hasta');
    }
    setSearchParams(next, { replace: true });
    setPage(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Transacciones</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Historial completo de movimientos.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingTx(null); setModalOpen(true); }}>
          <Plus size={18} /> Nueva
        </button>
      </header>

      {/* Filtros */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input" type="text" placeholder="Buscar por descripción..."
            value={filtros.busqueda}
            onChange={(e) => setFiltro('q', e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <select className="input" style={{ width: 'auto', minWidth: '130px' }} value={filtros.tipo} onChange={(e) => setFiltro('tipo', e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <select className="input" style={{ width: 'auto', minWidth: '150px' }} value={filtros.categoria} onChange={(e) => setFiltro('categoria', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <select className="input" style={{ width: 'auto', minWidth: '140px' }} value={filtros.cuenta} onChange={(e) => setFiltro('cuenta', e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>

        <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={filtros.moneda} onChange={(e) => setFiltro('moneda', e.target.value)}>
          <option value="">Monedas</option>
          <option value="ARS">🇦🇷 ARS</option>
          <option value="USD">🇺🇸 USD</option>
        </select>

        {/* Date presets */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => setDatePreset('este-mes')}>Este mes</button>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => setDatePreset('mes-anterior')}>Anterior</button>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => setDatePreset('este-ano')}>Año</button>
        </div>

        {/* Custom date range inputs */}
        <DatePickerModern
          placeholder="Desde"
          value={filtros.desde}
          onChange={(val) => setFiltro('desde', val)}
          containerStyle={{ width: '130px' }}
        />
        <DatePickerModern
          placeholder="Hasta"
          value={filtros.hasta}
          onChange={(val) => setFiltro('hasta', val)}
          containerStyle={{ width: '130px' }}
        />

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            <X size={14} /> Limpiar ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="64px" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>No se encontraron transacciones.</p>
          {activeFilterCount > 0 && <p>Probá ajustando los filtros.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {grouped.map(([key, group]) => (
            <div key={key}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'capitalize', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
                {group.label}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {group.items.map(tx => {
                  let TxIcon = ArrowDownLeft;
                  let txColor = 'var(--color-danger)';
                  let prefix = '-';
                  if (tx.tipo === 'ingreso') { TxIcon = ArrowUpRight; txColor = 'var(--color-success)'; prefix = '+'; }
                  else if (tx.tipo === 'transferencia') { TxIcon = ArrowLeftRight; txColor = 'var(--color-text-muted)'; prefix = '⇄'; }
                  const fmt = tx.moneda === 'ARS' ? formatARS : formatUSD;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${tx.category_color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TxIcon size={18} color={txColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.descripcion || 'Sin descripción'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{tx.category_name} · {new Date(tx.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                          {tx.es_automatica && (
                            <>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(52,152,219,0.15)', color: '#3498DB', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🤖 Automático
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAjustarMontoTx(tx); }}
                                style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', color: 'var(--color-text)', cursor: 'pointer' }}
                              >
                                Ajustar monto
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 600, color: txColor }}>{prefix} {fmt(Number(tx.monto))}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.account_name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination + Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleExportCSV}>
          <Download size={16} /> Exportar CSV
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {total > 0 ? `Mostrando ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} de ${total}` : ''}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px' }}>←</button>
            <button className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px' }}>→</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransaccionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTx(null); }}
        onSave={handleSave}
        transaccion={editingTx}
        accounts={accounts}
        categories={categories}
      />

      {selectedTx && (
        <TransaccionDetalle
          transaccion={selectedTx}
          onClose={() => setSelectedTx(null)}
          onEdit={(tx) => { setEditingTx(tx); setModalOpen(true); setSelectedTx(null); }}
          onDelete={handleDelete}
        />
      )}

      {/* Mini-modal Ajuste Monto Automático */}
      <AjustarMontoModal
        isOpen={!!ajustarMontoTx}
        onClose={() => setAjustarMontoTx(null)}
        transaccion={ajustarMontoTx}
        onSaved={() => {
          fetchTransactions();
        }}
      />
    </div>
  );
}
