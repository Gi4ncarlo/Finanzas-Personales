import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import useDolarRate, { usdToArs } from '../../hooks/useDolarBlue';
import { formatARS } from '../../utils/currency';
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, AlertTriangle } from 'lucide-react';

export default function TransaccionModal({ isOpen, onClose, onSave, transaccion = null, accounts = [], categories = [] }) {
  const { user, profile } = useAuth();
  const tipoCambioPref = profile?.tipo_cambio_pref || 'blue';
  const { compra, venta, nombre: dolarNombre, loading: dolarLoading } = useDolarRate(tipoCambioPref);
  const isEditing = !!transaccion;

  const [tipo, setTipo] = useState('egreso');
  const [accountId, setAccountId] = useState('');
  const [accountDestinoId, setAccountDestinoId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');
  const [tipoCambio, setTipoCambio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form on open
  useEffect(() => {
    if (transaccion) {
      setTipo(transaccion.tipo || 'egreso');
      setAccountId(transaccion.account_id || '');
      setAccountDestinoId(transaccion.account_destino_id || '');
      setCategoryId(transaccion.category_id || '');
      setMonto(String(transaccion.monto || ''));
      setMoneda(transaccion.moneda || 'ARS');
      setDescripcion(transaccion.descripcion || '');
      setFecha(transaccion.fecha ? transaccion.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotas(transaccion.notas || '');
      setTipoCambio(transaccion.tipo_cambio ? String(transaccion.tipo_cambio) : '');
    } else {
      setTipo('egreso');
      setAccountId('');
      setAccountDestinoId('');
      setCategoryId('');
      setMonto('');
      setMoneda('ARS');
      setDescripcion('');
      setFecha(new Date().toISOString().slice(0, 10));
      setNotas('');
      setTipoCambio('');
    }
    setError('');
  }, [transaccion, isOpen]);

  // Auto-fill tipo de cambio cuando la moneda es USD
  useEffect(() => {
    if (moneda === 'USD' && venta && !tipoCambio) {
      setTipoCambio(String(venta));
    }
  }, [moneda, venta]);

  const tipoOptions = [
    { value: 'ingreso', label: 'Ingreso', icon: ArrowUpRight, color: 'var(--color-success)' },
    { value: 'egreso', label: 'Egreso', icon: ArrowDownLeft, color: 'var(--color-danger)' },
    { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight, color: '#3498DB' },
  ];

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    if (tipo === 'transferencia') return [];
    return categories.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  }, [categories, tipo]);

  // Filter accounts by currency (for ingreso/egreso)
  const filteredAccounts = useMemo(() => {
    if (tipo === 'transferencia') return accounts;
    if (!moneda) return accounts;
    return accounts.filter(a => a.moneda === moneda);
  }, [accounts, moneda, tipo]);

  // Cross-currency transfer detection
  const selectedOrigen = accounts.find(a => a.id === accountId);
  const selectedDestino = accounts.find(a => a.id === accountDestinoId);
  const isCrossCurrency = tipo === 'transferencia' && selectedOrigen && selectedDestino && selectedOrigen.moneda !== selectedDestino.moneda;

  // USD equivalence in real time
  const arsEquivalent = useMemo(() => {
    if (moneda !== 'USD' || !monto || !venta) return null;
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return null;
    return usdToArs(m, parseFloat(tipoCambio) || venta);
  }, [moneda, monto, venta, tipoCambio]);

  // Future date warning
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const isFutureDate = fecha && new Date(fecha) > oneYearFromNow;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setError('Ingresá un monto válido mayor a 0.'); return;
    }
    if (tipo !== 'transferencia' && !accountId) { setError('Seleccioná una cuenta.'); return; }
    if (tipo !== 'transferencia' && !categoryId) { setError('Seleccioná una categoría.'); return; }
    if (tipo === 'transferencia') {
      if (!accountId) { setError('Seleccioná la cuenta origen.'); return; }
      if (!accountDestinoId) { setError('Seleccioná la cuenta destino.'); return; }
      if (accountId === accountDestinoId) { setError('La cuenta origen y destino no pueden ser la misma.'); return; }
    }

    setLoading(true);
    try {
      const tc = moneda === 'USD' && tipoCambio ? parseFloat(tipoCambio) : null;
      const fechaISO = new Date(fecha).toISOString();

      if (tipo === 'transferencia') {
        // Transfer: generate a shared par ID
        const parId = transaccion?.transferencia_par_id || crypto.randomUUID();
        
        const basePayload = {
          user_id: user.id,
          monto: parseFloat(monto),
          moneda,
          tipo_cambio: tc,
          descripcion: descripcion.trim() || 'Transferencia',
          fecha: fechaISO,
          notas: notas.trim() || null,
          tipo: 'transferencia',
          transferencia_par_id: parId,
          category_id: null,
        };

        if (isEditing && transaccion.transferencia_par_id) {
          // Update both pair transactions
          await onSave({
            ...basePayload,
            account_id: accountId,
            account_destino_id: accountDestinoId,
            _isTransferEdit: true,
            _parId: transaccion.transferencia_par_id,
          });
        } else {
          // Create: two transactions with same parId
          await onSave({
            ...basePayload,
            account_id: accountId,
            account_destino_id: accountDestinoId,
            _isTransferCreate: true,
          });
        }
      } else {
        // Ingreso or egreso
        const payload = {
          user_id: user.id,
          account_id: accountId,
          account_destino_id: null,
          category_id: categoryId,
          tipo,
          monto: parseFloat(monto),
          moneda,
          tipo_cambio: tc,
          descripcion: descripcion.trim(),
          fecha: fechaISO,
          notas: notas.trim() || null,
          transferencia_par_id: null,
        };
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Editar Transacción' : 'Nueva Transacción'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}

          {/* Tipo tabs */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '12px', fontSize: '0.9rem' }}>Tipo *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tipoOptions.map(t => {
                const TIcon = t.icon;
                return (
                  <button key={t.value} type="button" onClick={() => { setTipo(t.value); setCategoryId(''); }} style={{
                    flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                    border: tipo === t.value ? `2px solid ${t.color}` : '2px solid var(--color-border)',
                    backgroundColor: tipo === t.value ? `${t.color}15` : 'var(--color-surface-2)',
                    color: tipo === t.value ? t.color : 'var(--color-text-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s',
                  }}>
                    <TIcon size={20} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto + Moneda */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Monto *</label>
              <input className="input" type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" style={{ fontSize: '1.1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Moneda</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[{ v: 'ARS', f: '🇦🇷' }, { v: 'USD', f: '🇺🇸' }].map(m => (
                  <button key={m.v} type="button" onClick={() => { setMoneda(m.v); setTipoCambio(''); setAccountId(''); }} style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px', cursor: 'pointer',
                    border: moneda === m.v ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                    backgroundColor: moneda === m.v ? 'rgba(201,168,76,0.1)' : 'var(--color-surface-2)',
                    color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}>
                    {m.f} {m.v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* USD equivalence */}
          {arsEquivalent !== null && (
            <div style={{ backgroundColor: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--color-gold)' }}>
              ≈ {formatARS(arsEquivalent)} al tipo {dolarNombre} (${tipoCambio || venta})
            </div>
          )}

          {/* Tipo de cambio (si USD) */}
          {moneda === 'USD' && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Tipo de Cambio (ARS por 1 USD)</label>
              <input className="input" type="number" step="0.01" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} placeholder={venta ? String(venta) : 'Cotización'} />
              {venta && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  {dolarNombre} actual — Venta: ${venta} · Compra: ${compra}
                </p>
              )}
            </div>
          )}

          {/* Cuenta (Ingreso/Egreso) o Cuenta Origen (Transferencia) */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>
              {tipo === 'transferencia' ? 'Cuenta Origen *' : 'Cuenta *'}
            </label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Seleccionar cuenta</option>
              {(tipo === 'transferencia' ? accounts : filteredAccounts).map(a => (
                <option key={a.id} value={a.id}>{a.nombre} ({a.moneda})</option>
              ))}
            </select>
            {tipo !== 'transferencia' && filteredAccounts.length === 0 && accounts.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: '6px' }}>
                No tenés cuentas en {moneda}. Creá una primero o cambiá la moneda.
              </p>
            )}
          </div>

          {/* Cuenta Destino (transferencia) */}
          {tipo === 'transferencia' && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Cuenta Destino *</label>
              <select className="input" value={accountDestinoId} onChange={(e) => setAccountDestinoId(e.target.value)}>
                <option value="">Seleccionar cuenta destino</option>
                {accounts.filter(a => a.id !== accountId).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} ({a.moneda})</option>
                ))}
              </select>
            </div>
          )}

          {/* Cross-currency warning */}
          {isCrossCurrency && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: '8px', padding: '12px' }}>
              <AlertTriangle size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
                <strong>Transferencia entre monedas distintas</strong> ({selectedOrigen.moneda} → {selectedDestino.moneda}). Se registrará el mismo monto en ambas cuentas. Podés ajustar manualmente.
              </div>
            </div>
          )}

          {/* Categoría (ingreso/egreso) */}
          {tipo !== 'transferencia' && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Categoría *</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Seleccionar categoría</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Descripción</label>
            <textarea className="input" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipo === 'egreso' ? '¿En qué gastaste?' : tipo === 'ingreso' ? '¿De dónde viene?' : 'Descripción de la transferencia'} style={{ resize: 'vertical' }} />
          </div>

          {/* Fecha */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Fecha *</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            {isFutureDate && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: '6px' }}>
                ⚠️ La fecha seleccionada es más de un año en el futuro.
              </p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem' }}>Notas (opcional)</label>
            <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalles adicionales..." style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px', fontSize: '1rem', marginTop: '8px' }}>
            {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Transacción')}
          </button>
        </form>
      </div>
    </div>
  );
}
