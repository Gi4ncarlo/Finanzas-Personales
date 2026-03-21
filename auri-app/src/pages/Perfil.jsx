import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { 
  User, Camera, Save, ArrowLeft, 
  Trash2, Wallet, Briefcase, Globe 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Perfil() {
  const { user, profile, setProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    moneda_principal: 'ARS',
    tipo_cambio_pref: 'blue'
  });
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        moneda_principal: profile.moneda_principal || 'ARS',
        tipo_cambio_pref: profile.tipo_cambio_pref || 'blue'
      });
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          nombre: formData.nombre,
          moneda_principal: formData.moneda_principal,
          tipo_cambio_pref: formData.tipo_cambio_pref,
          updated_at: new Date()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const convertToWebP = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/webp', 0.8);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Formato no permitido. Usá JPG o PNG.');
      return;
    }

    setUploading(true);
    try {
      // 1. Convertir a WebP en el cliente
      const webpBlob = await convertToWebP(file);
      const filename = `${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `${user.id}/${filename}`;


      // 2. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, webpBlob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Actualizar perfil
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date() })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setProfile(updatedProfile);
      setAvatarPreview(publicUrl);
      toast.success('Foto de perfil actualizada');
    } catch (error) {
      toast.error('Error al subir la imagen. Asegurate de que el bucket "avatars" sea público.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} className="btn-icon" style={{ backgroundColor: 'var(--color-surface-2)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontWeight: 600, fontSize: '1.75rem' }}>Mi Perfil</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Gestioná tu información personal y preferencias.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '32px' }}>
        {/* Lado izquierdo: Foto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--color-surface-2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                border: '3px solid var(--color-gold)'
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={64} color="var(--color-text-muted)" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: '0', right: '0', 
                  backgroundColor: 'var(--color-gold)', color: '#000',
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid var(--color-surface)', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                accept="image/*.png, image/jpeg, image/jpg"
                style={{ display: 'none' }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{profile?.nombre || 'Usuario Auri'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
            </div>

            {uploading && <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>Procesando imagen (WebP)...</div>}
          </div>

          <div className="card" style={{ padding: '24px', backgroundColor: 'rgba(231, 76, 60, 0.05)', borderColor: 'rgba(231, 76, 60, 0.2)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--color-danger)', fontWeight: 600, marginBottom: '12px' }}>Zona Crítica</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Al borrar tu cuenta se perderán todas las transacciones, cuentas y configuraciones.
            </p>
            <button className="btn" style={{ width: '100%', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}>
              <Trash2 size={16} /> Borrar mi cuenta
            </button>
          </div>
        </div>

        {/* Lado derecho: Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} color="var(--color-gold)" /> Información General
            </h3>

            <div>
              <label className="label">Nombre Completo</label>
              <input 
                className="input" 
                type="text" 
                value={formData.nombre} 
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                placeholder="Ej: Giancarlo"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="label">Moneda Principal</label>
                <select className="input" value={formData.moneda_principal} onChange={e => setFormData({...formData, moneda_principal: e.target.value})}>
                  <option value="ARS">Peso Argentino (ARS 🇦🇷)</option>
                  <option value="USD">Dólar Estadounidense (USD 🇺🇸)</option>
                </select>
              </div>
              <div>
                <label className="label">Dólar Preferido</label>
                <select className="input" value={formData.tipo_cambio_pref} onChange={e => setFormData({...formData, tipo_cambio_pref: e.target.value})}>
                  <option value="blue">Dólar Blue (Informal)</option>
                  <option value="oficial">Dólar Oficial (BNA)</option>
                  <option value="mep">Dólar MEP (Bolsa)</option>
                  <option value="ccl">Dólar CCL</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}>
                <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--color-surface-2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={24} color="var(--color-gold)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Localización</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CABA, Argentina · UTC-3</div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .label { display: block; font-size: 0.85rem; margin-bottom: 8px; font-weight: 500; color: var(--color-text-muted); }
      `}</style>
    </div>
  );
}
