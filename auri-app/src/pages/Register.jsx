import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validaciones basicas
    if (!nombre || !email || !password || !confirmPassword) {
      setError('Por favor completá todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email, password, nombre);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado.');
      } else {
        setError(error.message);
      }
    } else {
      // Registro exitoso
      navigate('/onboarding');
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Crear Cuenta</h2>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Nombre y Apellido</label>
          <input 
            id="nombre"
            name="nombre"
            type="text" 
            autoComplete="name"
            className="input" 
            placeholder="Juan Pérez" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Email</label>
          <input 
            id="email"
            name="email"
            type="email" 
            autoComplete="email"
            className="input" 
            placeholder="tu@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Contraseña</label>
            <input 
              id="password"
              name="password"
              type="password" 
              autoComplete="new-password"
              className="input" 
              placeholder="Min. 8 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Confirmar Contraseña</label>
            <input 
              id="confirmPassword"
              name="confirmPassword"
              type="password" 
              autoComplete="new-password"
              className="input" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>
          ¿Ya tenés cuenta? <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 500 }}>Ingresar</Link>
        </p>
      </div>
    </div>
  );
}
