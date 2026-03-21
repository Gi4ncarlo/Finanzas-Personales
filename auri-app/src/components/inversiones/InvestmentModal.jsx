import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { searchCrypto, getCedearQuote } from '../../services/quotesService';
import useDolarRate from '../../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../../utils/currency';
import { X, Search, Coins, TrendingUp, Calendar, Info, Save } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';

export default function InvestmentModal({ isOpen, onClose, onSave, accounts = [] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { venta: dolarVenta } = useDolarRate();

  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState('crypto'); // 'crypto', 'cedear'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [formData, setFormData] = useState({
    cantidad: '',
    precio_compra: '',
    moneda_compra: 'USD',
    fecha_compra: new Date().toISOString().split('T')[0],
    account_id: '',
    notas: ''
  });

  // Buscador de Crypto
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (tipo === 'crypto' && searchQuery.length >= 2) {
        const results = await searchCrypto(searchQuery);
        setSearchResults(results.slice(0, 5));
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, tipo]);

  const handleSearchCedear = async () => {
    if (!searchQuery) return;
    setLoading(true);
    const result = await getCedearQuote(searchQuery);
    if (result) {
      setSelectedAsset({
        id: result.simbolo,
        symbol: result.simbolo,
        name: result.nombre,
        thumb: null,
        current_price_ars: result.ultimo
      });
      setFormData({ ...formData, moneda_compra: 'ARS', precio_compra: result.ultimo });
    } else {
      toast.error('No se encontró el CEDEAR');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return toast.error('Seleccioná un activo');
    setLoading(true);

    try {
      // 1. Verificar si ya existe el activo para este usuario
      const { data: existing } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo_simbolo', selectedAsset.symbol.toUpperCase())
        .maybeSingle();

      const nuevaCantidad = Number(formData.cantidad);
      const nuevoPrecio = Number(formData.precio_compra);
      
      let investmentId;
      
      if (existing) {
        // ACTUALIZAR EXISTENTE (Precio Promedio Ponderado)
        const totalCantidad = Number(existing.cantidad) + nuevaCantidad;
        // Convertimos todo a la moneda base (USD para crypto, ARS para cedears preferentemente, o normalizar a USD)
        // Para simplificar, guardamos el precio promedio en la moneda_compra actual si coinciden, 
        // o convertimos si son distintas.
        
        let precioPromedio;
        if (existing.moneda_compra === formData.moneda_compra) {
          precioPromedio = ((Number(existing.precio_compra) * Number(existing.cantidad)) + (nuevoPrecio * nuevaCantidad)) / totalCantidad;
        } else {
          // Normalizar a USD para el promedio si difieren
          const extInUSD = existing.moneda_compra === 'USD' ? existing.precio_compra : existing.precio_compra / dolarVenta;
          const newInUSD = formData.moneda_compra === 'USD' ? nuevoPrecio : nuevoPrecio / dolarVenta;
          precioPromedio = ((extInUSD * Number(existing.cantidad)) + (newInUSD * nuevaCantidad)) / totalCantidad;
        }

        const { error: upError } = await supabase
          .from('investments')
          .update({
            cantidad: totalCantidad,
            precio_compra: precioPromedio,
            updated_at: new Date()
          })
          .eq('id', existing.id);
        if (upError) throw upError;
        investmentId = existing.id;
      } else {
        // NUEVA POSICIÓN
        const { data: nuevo, error: inError } = await supabase
          .from('investments')
          .insert([{
            user_id: user.id,
            activo_simbolo: selectedAsset.symbol.toUpperCase(),
            activo_nombre: selectedAsset.name,
            tipo: tipo,
            coingecko_id: selectedAsset.id,
            imagen_url: selectedAsset.thumb || selectedAsset.large,
            cantidad: nuevaCantidad,
            precio_compra: nuevoPrecio,
            moneda_compra: formData.moneda_compra,
            fecha_compra: formData.fecha_compra,
            notas: formData.notas
          }])
          .select()
          .single();
        if (inError) throw inError;
        investmentId = nuevo.id;
      }

      // 2. Registrar en historial de compras
      const { error: histError } = await supabase
        .from('investment_purchases')
        .insert([{
          user_id: user.id,
          investment_id: investmentId,
          cantidad: nuevaCantidad,
          precio_compra: nuevoPrecio,
          moneda_compra: formData.moneda_compra,
          fecha_compra: formData.fecha_compra,
          notas: formData.notas
        }]);
      if (histError) throw histError;

      // 3. Opcional: Registrar transacción de egreso
      if (formData.account_id) {
         await supabase.from('transactions').insert([{
           user_id: user.id,
           account_id: formData.account_id,
           tipo: 'egreso',
           monto: nuevaCantidad * nuevoPrecio,
           moneda: formData.moneda_compra,
           descripcion: `Inversión: ${selectedAsset.symbol.toUpperCase()} (${nuevaCantidad})`,
           fecha: formData.fecha_compra,
           category_id: null // Podría ser una categoría "Inversiones"
         }]);
      }

      toast.success('Inversión registrada correctamente');
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error al registrar inversión');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <TrendingUp size={20} color="var(--color-gold)" /> Registrar Inversión
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector de tipo */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
            <button type="button" onClick={() => { setTipo('crypto'); setSelectedAsset(null); }} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: tipo === 'crypto' ? 'var(--color-surface)' : 'transparent',
              color: tipo === 'crypto' ? 'var(--color-gold)' : 'var(--color-text-muted)',
              fontWeight: 600, transition: 'all 0.2s'
            }}>Cripto 🪙</button>
            <button type="button" onClick={() => { setTipo('cedear'); setSelectedAsset(null); }} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: tipo === 'cedear' ? 'var(--color-surface)' : 'transparent',
              color: tipo === 'cedear' ? 'var(--color-gold)' : 'var(--color-text-muted)',
              fontWeight: 600, transition: 'all 0.2s'
            }}>CEDEAR 📈</button>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <label className="label">Activo / Símbolo</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  className="input" 
                  style={{ paddingLeft: '36px' }} 
                  placeholder={tipo === 'crypto' ? 'Ej: bitcoin, eth, solana...' : 'Ej: GGAL, AAPL, MELI...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {tipo === 'cedear' && (
                <button type="button" className="btn btn-secondary" onClick={handleSearchCedear}>Buscar</button>
              )}
            </div>

            {/* Resultados de búsqueda (Solo Crypto) */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', marginTop: '4px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {searchResults.map(s => (
                  <div key={s.id} onClick={() => { setSelectedAsset(s); setSearchResults([]); setSearchQuery(s.name); }} style={{
                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s'
                  }} className="search-item">
                    <img src={s.thumb} alt="" style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.symbol}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedAsset && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(201,168,76,0.2)' }}>
              {selectedAsset.thumb && <img src={selectedAsset.thumb} style={{ width: '24px' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{selectedAsset.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedAsset.symbol.toUpperCase()}</div>
              </div>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => setSelectedAsset(null)} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">Cantidad</label>
              <input type="number" step="any" className="input" placeholder="0.00" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} />
            </div>
            <div>
              <label className="label">Precio Compra</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="number" step="any" className="input" placeholder="0.00" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} />
                <select className="input" style={{ width: '70px', padding: '0 4px' }} value={formData.moneda_compra} onChange={e => setFormData({...formData, moneda_compra: e.target.value})}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <DatePickerModern 
              label="Fecha de Compra" 
              value={formData.fecha_compra} 
              onChange={val => setFormData({...formData, fecha_compra: val})} 
            />
            <div>
              <label className="label">Deducir de</label>
              <select className="input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                <option value="">No deducir</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? 'Guardando...' : <><Save size={20} /> Guardar Posición</>}
          </button>
        </form>
      </div>
      <style>{`
        .label { display: block; font-size: 0.85rem; margin-bottom: 8px; font-weight: 500; color: var(--color-text-muted); }
        .search-item:hover { background-color: var(--color-surface-2); }
      `}</style>
    </div>
  );
}
