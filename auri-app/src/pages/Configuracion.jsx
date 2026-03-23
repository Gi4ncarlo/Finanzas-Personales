import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import Skeleton from '../components/ui/Skeleton';
import { Trash2, Plus, Tag } from 'lucide-react';

export default function Configuracion() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Categorías');

  const tabs = ['General', 'Categorías', 'Cuentas', 'Notificaciones'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontWeight: 600, fontSize: '1.75rem', marginBottom: '8px' }}>Configuración</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Ajustá las preferencias de tu cuenta.</p>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', paddingBottom: '2px' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--color-gold)' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card" style={{ minHeight: '400px' }}>
        {activeTab === 'Categorías' && <CategoriesTab user={user} toast={toast} />}
        {activeTab !== 'Categorías' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
            Esta sección se implementará en el futuro.
          </div>
        )}
      </div>
    </div>
  );
}

function CategoriesTab({ user, toast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();

  // Form
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('egreso');
  const [color, setColor] = useState('#2E75B6');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true });
      
    if (error) {
      toast.error('Error cargando categorías.');
      console.error(error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('Especificá un nombre para la categoría.');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          nombre,
          tipo,
          color,
          icono: 'tag',
          es_default: false
        });

      if (error) throw error;
      
      toast.success('Categoría creada con éxito.');
      setNombre('');
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo crear la categoría.');
    }
  };

  const handleDelete = async (id, es_default) => {
    if (es_default) {
      toast.warning('No podés eliminar una categoría por defecto.');
      return;
    }

    const ok = await confirm('¿Seguro que querés eliminar esta categoría? Si tiene transacciones asociadas fallará.');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') { // foreign key violation
          toast.error('No se puede eliminar porque tiene transacciones asociadas.');
        } else {
          throw error;
        }
      } else {
        toast.success('Categoría eliminada.');
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar la categoría.');
    }
  };

  const inCategories = categories.filter(c => c.tipo === 'ingreso');
  const outCategories = categories.filter(c => c.tipo === 'egreso');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      
      {/* List Area */}
      <div>
        <h3 style={{ marginBottom: '24px', fontWeight: 600 }}>Tus Categorías</h3>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Ingresos
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inCategories.map(cat => (
                  <CategoryRow key={cat.id} category={cat} onDelete={() => handleDelete(cat.id, cat.es_default)} />
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Egresos
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {outCategories.map(cat => (
                  <CategoryRow key={cat.id} category={cat} onDelete={() => handleDelete(cat.id, cat.es_default)} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Form Area */}
      <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '24px', borderRadius: '12px', alignSelf: 'start' }}>
        <h3 style={{ marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} color="var(--color-gold)" /> 
          Nueva Categoría
        </h3>

        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Nombre</label>
            <input 
              type="text" 
              className="input" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Suscripciones"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Tipo</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="egreso">Egreso (Gasto)</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{color.toUpperCase()}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
            Agregar Categoría
          </button>
        </form>
      </div>

    </div>
  );
}

function CategoryRow({ category, onDelete }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: 'var(--color-surface-2)',
      borderRadius: '8px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: category.color }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={16} color="var(--color-text-muted)" />
          <span style={{ fontWeight: 500 }}>{category.nombre}</span>
        </div>
        {category.es_default && (
          <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-text-muted)' }}>Default</span>
        )}
      </div>

      <button 
        onClick={onDelete}
        disabled={category.es_default}
        style={{ 
          background: 'none', border: 'none', 
          color: category.es_default ? 'var(--color-border)' : 'var(--color-text-muted)', 
          cursor: category.es_default ? 'not-allowed' : 'pointer',
          padding: '4px'
        }}
        title={category.es_default ? 'No se puede eliminar' : 'Eliminar categoría'}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
