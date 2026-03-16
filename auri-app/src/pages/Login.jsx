import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor completá todos los campos.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError('Email o contraseña incorrectos.');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Iniciar Sesión</h2>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Contraseña</label>
          <input 
            id="password"
            name="password"
            type="password" 
            autoComplete="current-password"
            className="input" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>
          ¿No tenés cuenta? <Link to="/registro" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 500 }}>Registrate</Link>
        </p>
      </div>
    </div>
  );
}
