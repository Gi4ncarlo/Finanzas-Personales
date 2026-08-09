import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--color-gold)' }}>Cargando Aurelius...</p>
      </div>
    );
  }

  // Redirect to dashboard if trying to access auth pages while logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/marcus_aurelius.jpg" alt="Aurelius" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-gold)', objectFit: 'cover', marginBottom: '12px', boxShadow: '0 4px 20px rgba(201, 168, 76, 0.3)' }} />
          <h1 style={{ color: 'var(--color-gold)', fontSize: '2.5rem', marginBottom: '4px', fontFamily: 'Georgia, serif', letterSpacing: '4px' }}>AURELIUS</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Dominio Financiero Estoico</p>
        </div>
        
        <Outlet />
      </div>
    </div>
  );
}
