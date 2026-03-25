import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { searchCrypto, getCedearQuote, searchCedears, searchAccionesAR, getAccionARQuote, POPULAR_CRYPTOS } from '../../services/quotesService';
import { ACCIONES_PRINCIPALES } from '../../data/acciones-argentinas';
import useDolarRate from '../../hooks/useDolarBlue';
import { formatARS, formatUSD } from '../../utils/currency';
import { X, Search, TrendingUp, Save, ChevronDown } from 'lucide-react';
import DatePickerModern from '../ui/DatePickerModern';

export default function InvestmentModal({ isOpen, onClose, onSave, accounts = [] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { venta: dolarVenta } = useDolarRate();

  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showList, setShowList] = useState(false); // Para controlar el dropdown
  
  const [formData, setFormData] = useState({
    cantidad: '',
    precio_compra: '',
    moneda_compra: 'USD',
    fecha_compra: new Date().toISOString().split('T')[0],
    account_id: '',
    nominacion: 'ARS',
    notas: ''
  });

  // Lista por defecto para CEDEARs y Acciones (local, instantánea)
  const defaultList = useMemo(() => {
    if (tipo === 'cedear') return searchCedears(''); // devuelve POPULAR_CEDEARS
    if (tipo === 'accion') return searchAccionesAR(''); // devuelve ACCIONES_PRINCIPALES mapeadas
    if (tipo === 'crypto') return POPULAR_CRYPTOS.map(c => ({ ...c, id: c.id }));
    return [];
  }, [tipo]);

  // Buscar: filtra la lista local para CEDEARs/Acciones, usa API para crypto
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length === 0) {
        // Mostrar lista completa (browse mode)
        setSearchResults(defaultList);
        return;
      }

      if (tipo === 'crypto') {
        if (searchQuery.length >= 2) {
          // Filtrar la lista local primero
          const localMatches = POPULAR_CRYPTOS.filter(c =>
            c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          // Si hay matches locales, usarlos. Sino, buscar en API
          if (localMatches.length > 0) {
            setSearchResults(localMatches);
          } else {
            const results = await searchCrypto(searchQuery);
            setSearchResults(results.slice(0, 8));
          }
        } else {
          setSearchResults(POPULAR_CRYPTOS);
        }
      } else if (tipo === 'cedear') {
        const results = searchCedears(searchQuery);
        setSearchResults(results.slice(0, 10));
      } else if (tipo === 'accion') {
        const results = searchAccionesAR(searchQuery);
        setSearchResults(results.slice(0, 10));
      }
    }, tipo === 'crypto' && searchQuery.length >= 2 ? 400 : 100); // Debounce más corto para local

    return () => clearTimeout(handler);
  }, [searchQuery, tipo, defaultList]);

  // Reset al cambiar de tipo
  const handleTipoChange = (newTipo) => {
    setTipo(newTipo);
    setSelectedAsset(null);
    setSearchQuery('');
    setShowList(false);
    setSearchResults([]);
    setFormData(prev => ({
      ...prev,
      cantidad: '',
      precio_compra: '',
      moneda_compra: newTipo === 'crypto' ? 'USD' : 'ARS',
    }));
  };

  // Click en un resultado del dropdown
  const handleSelectAsset = async (s) => {
    setSelectedAsset(s);
    setSearchResults([]);
    setShowList(false);
    setSearchQuery(s.name);

    if (tipo === 'cedear') {
      setLoading(true);
      const result = await getCedearQuote(s.symbol);
      if (result && result.ultimo) {
        setFormData(prev => ({ ...prev, moneda_compra: 'ARS', precio_compra: result.ultimo }));
      } else {
        setFormData(prev => ({ ...prev, moneda_compra: 'ARS', precio_compra: '' }));
      }
      setLoading(false);
    }

    if (tipo === 'accion') {
      setFormData(prev => ({ ...prev, moneda_compra: 'ARS' }));
      setLoading(true);
      const result = await getAccionARQuote(s.symbol);
      if (result && result.ultimo) {
        setFormData(prev => ({ ...prev, precio_compra: result.ultimo }));
      } else {
        setFormData(prev => ({ ...prev, precio_compra: '' }));
      }
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return toast.error('Seleccioná un activo');
    setLoading(true);

    try {
      const suffix = tipo === 'cedear' ? (formData.nominacion === 'MEP (D)' ? 'D' : formData.nominacion === 'CCL (C)' ? 'C' : '') : '';
      const assetSymbol = tipo === 'accion' ? selectedAsset.symbol.toUpperCase() : (tipo === 'cedear' ? (selectedAsset.symbol.toUpperCase() + suffix) : selectedAsset.symbol.toUpperCase());

      const { data: existing } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo_simbolo', assetSymbol)
        .maybeSingle();

      const nuevaCantidad = Number(formData.cantidad);
      const nuevoPrecio = Number(formData.precio_compra);
      
      if (tipo === 'accion' && !Number.isInteger(nuevaCantidad)) {
        toast.error('Las acciones solo permiten cantidades enteras');
        setLoading(false);
        return;
      }

      let investmentId;
      
      if (existing) {
        const totalCantidad = Number(existing.cantidad) + nuevaCantidad;
        
        let precioPromedio;
        if (existing.moneda_compra === formData.moneda_compra) {
          precioPromedio = ((Number(existing.precio_compra) * Number(existing.cantidad)) + (nuevoPrecio * nuevaCantidad)) / totalCantidad;
        } else {
          const extInUSD = existing.moneda_compra === 'USD' ? existing.precio_compra : existing.precio_compra / dolarVenta;
          const newInUSD = formData.moneda_compra === 'USD' ? nuevoPrecio : nuevoPrecio / dolarVenta;
          precioPromedio = ((extInUSD * Number(existing.cantidad)) + (newInUSD * nuevaCantidad)) / totalCantidad;
        }

        const updatePayload = {
          cantidad: totalCantidad,
          precio_compra: precioPromedio,
          updated_at: new Date()
        };

        if (tipo === 'accion' && selectedAsset.sector) {
          updatePayload.sector = selectedAsset.sector;
          updatePayload.mercado = 'byma';
        }

        const { error: upError } = await supabase
          .from('investments')
          .update(updatePayload)
          .eq('id', existing.id);
        if (upError) throw upError;
        investmentId = existing.id;
      } else {
        const insertPayload = {
          user_id: user.id,
          activo_simbolo: assetSymbol,
          activo_nombre: selectedAsset.name,
          tipo: tipo,
          coingecko_id: tipo === 'crypto' ? selectedAsset.id : null,
          imagen_url: selectedAsset.thumb || selectedAsset.large || null,
          cantidad: nuevaCantidad,
          precio_compra: nuevoPrecio,
          moneda_compra: formData.moneda_compra,
          fecha_compra: formData.fecha_compra,
          notas: formData.notas,
        };

        if (tipo === 'accion') {
          insertPayload.sector = selectedAsset.sector || null;
          insertPayload.mercado = 'byma';
        }

        const { data: nuevo, error: inError } = await supabase
          .from('investments')
          .insert([insertPayload])
          .select()
          .single();
        if (inError) throw inError;
        investmentId = nuevo.id;
      }

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

      if (formData.account_id) {
         await supabase.from('transactions').insert([{
           user_id: user.id,
           account_id: formData.account_id,
           tipo: 'egreso',
           monto: nuevaCantidad * nuevoPrecio,
           moneda: formData.moneda_compra,
           descripcion: `Inversión: ${assetSymbol} (${nuevaCantidad})`,
           fecha: formData.fecha_compra,
           category_id: null
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

  const TABS = [
    { key: 'crypto', label: 'Crypto 🪙', sub: 'Bitcoin, Ethereum, Solana...' },
    { key: 'cedear', label: 'CEDEAR 🌎', sub: 'Apple, Amazon, Google en ARS' },
    { key: 'accion', label: 'Acción AR 🇦🇷', sub: 'YPF, Galicia, Pampa en BYMA' },
  ];

  const showDropdown = showList && searchResults.length > 0 && !selectedAsset;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '0', overflow: 'visible', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <TrendingUp size={20} color="var(--color-gold)" /> Registrar Inversión
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector de tipo */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
            {TABS.map(tab => (
              <button key={tab.key} type="button" onClick={() => handleTipoChange(tab.key)} style={{
                flex: 1, padding: '10px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                backgroundColor: tipo === tab.key ? 'var(--color-surface)' : 'transparent',
                color: tipo === tab.key ? 'var(--color-gold)' : 'var(--color-text-muted)',
                fontWeight: 600, transition: 'all 0.2s', fontSize: '0.8rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
              }}>
                <span>{tab.label}</span>
                {tipo === tab.key && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 400, opacity: 0.7 }}>{tab.sub}</span>
                )}
              </button>
            ))}
          </div>

          {/* Buscador + Browse */}
          <div style={{ position: 'relative' }}>
            <label className="label">
              {tipo === 'crypto' ? 'Activo / Símbolo' : tipo === 'cedear' ? 'Activo CEDEAR' : 'Empresa Argentina'}
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', zIndex: 1 }} />
              <input 
                className="input" 
                style={{ paddingLeft: '36px', paddingRight: '36px' }} 
                placeholder={
                  tipo === 'crypto' ? 'Buscar o elegir crypto...' : 
                  tipo === 'cedear' ? 'Buscar o elegir CEDEAR...' : 
                  'Buscar o elegir acción...'
                }
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowList(true); }}
                onFocus={() => { setShowList(true); if (!searchResults.length) setSearchResults(defaultList); }}
              />
              <button 
                type="button" 
                onClick={() => { 
                  setShowList(!showList); 
                  if (!showList) setSearchResults(searchQuery ? searchResults : defaultList); 
                }}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
              >
                <ChevronDown size={16} style={{ transform: showList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>

            {/* Dropdown con resultados */}
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', marginTop: '4px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                maxHeight: '250px', overflowY: 'auto'
              }}>
                {searchQuery.length === 0 && (
                  <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                    {tipo === 'crypto' ? `${searchResults.length} cryptos populares` : 
                     tipo === 'cedear' ? `${searchResults.length} CEDEARs disponibles` :
                     `${searchResults.length} acciones · BYMA`
                    }
                  </div>
                )}
                {searchResults.map(s => (
                  <div 
                    key={s.id || s.symbol} 
                    onClick={() => handleSelectAsset(s)} 
                    style={{
                      padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s'
                    }} 
                    className="search-item"
                  >
                    {s.thumb && <img src={s.thumb} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />}
                    {!s.thumb && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                        {(s.symbol || '?')[0]}
                      </div>
                    )}
                    {tipo === 'accion' ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-gold)' }}>{s.symbol}</span>
                        <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>{s.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: '4px' }}>{s.sector}</span>
                        {s.precio_actual && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                            {formatARS(s.precio_actual)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.symbol}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asset seleccionado */}
          {selectedAsset && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(201,168,76,0.2)' }}>
              {selectedAsset.thumb && <img src={selectedAsset.thumb} style={{ width: '24px', borderRadius: '50%' }} />}
              {!selectedAsset.thumb && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#000' }}>
                  {selectedAsset.symbol?.[0]}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedAsset.name}
                  {tipo === 'accion' && selectedAsset.sector && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{selectedAsset.sector}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {selectedAsset.symbol.toUpperCase()}
                  {tipo === 'accion' && ' · BYMA'}
                  {tipo === 'cedear' && ' · CEDEAR'}
                </div>
              </div>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => { setSelectedAsset(null); setSearchQuery(''); }} />
            </div>
          )}

          {/* Nominación (solo CEDEARs) */}
          {tipo === 'cedear' && selectedAsset && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="label">Nominación / Especie</label>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px' }}>
                {['ARS', 'MEP (D)', 'CCL (C)'].map(nom => (
                  <button key={nom} type="button" onClick={async () => {
                    const mon = nom === 'ARS' ? 'ARS' : 'USD';
                    const suffix = nom === 'MEP (D)' ? 'D' : nom === 'CCL (C)' ? 'C' : '';
                    const ticker = selectedAsset.symbol.toUpperCase() + suffix;
                    
                    setFormData(prev => ({ ...prev, nominacion: nom, moneda_compra: mon }));
                    
                    setLoading(true);
                    try {
                      const result = await getCedearQuote(ticker);
                      if (result && result.ultimo) {
                        setFormData(prev => ({ ...prev, precio_compra: result.ultimo }));
                      } else {
                        setFormData(prev => ({ ...prev, precio_compra: '' }));
                      }
                    } catch (e) {
                      setFormData(prev => ({ ...prev, precio_compra: '' }));
                    }
                    setLoading(false);
                  }} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: formData.nominacion === nom ? 'var(--color-surface)' : 'transparent',
                    color: formData.nominacion === nom ? 'var(--color-gold)' : 'var(--color-text-muted)',
                    fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
                  }}>
                    {nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad + Precio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">Cantidad</label>
              <input 
                type="number" 
                step={tipo === 'accion' ? '1' : 'any'} 
                min={tipo === 'accion' ? '1' : undefined}
                className="input" 
                placeholder={tipo === 'accion' ? '1' : '0.00'} 
                value={formData.cantidad} 
                onChange={e => setFormData({...formData, cantidad: e.target.value})} 
              />
              {tipo === 'accion' && (
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>Solo enteros (acciones no fraccionables)</span>
              )}
            </div>
            <div>
              <label className="label">Precio Compra</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="number" step="any" className="input" placeholder="0.00" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} />
                {tipo === 'accion' ? (
                  <div className="input" style={{ width: '70px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-gold)' }}>ARS</div>
                ) : (
                  <select className="input" style={{ width: '70px', padding: '0 4px' }} value={formData.moneda_compra} onChange={e => setFormData({...formData, moneda_compra: e.target.value})}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                )}
              </div>
              {tipo === 'accion' && formData.precio_compra && (
                <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>
                  Precio de mercado: {formatARS(Number(formData.precio_compra))}
                </span>
              )}
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
      `}
      </style>
    </div>
  );
}
