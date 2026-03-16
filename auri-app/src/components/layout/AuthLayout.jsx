import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Cargando Auri...</p>
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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--color-gold)', fontSize: '2.5rem', marginBottom: '8px' }}>AURI</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Tus finanzas, en oro.</p>
        </div>
        
        <Outlet />
      </div>
    </div>
  );
}
