import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { LayoutDashboard, ArrowLeftRight, Wallet, Target, TrendingUp, RefreshCw, Settings, User, LogOut, Menu, ChevronLeft } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import useDolarBlue from '../../hooks/useDolarBlue';

export default function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('auri_sidebar_collapsed') === 'true';
  });
  
  const { dolarBlue, loading: dolarLoading } = useDolarBlue();

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('auri_sidebar_collapsed', String(newState));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Skeleton width="200px" height="40px" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Transacciones', path: '/transacciones', icon: <ArrowLeftRight size={20} /> },
    { name: 'Cuentas', path: '/cuentas', icon: <Wallet size={20} /> },
    { name: 'Metas', path: '/metas', icon: <Target size={20} /> },
    { name: 'Inversiones', path: '/inversiones', icon: <TrendingUp size={20} /> },
    { name: 'Recurrentes', path: '/recurrentes', icon: <RefreshCw size={20} /> },
  ];

  const bottomNavItems = [
    { name: 'Configuración', path: '/configuracion', icon: <Settings size={20} /> },
    { name: 'Perfil', path: '/perfil', icon: <User size={20} /> },
  ];

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)',
    backgroundColor: isActive ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 500,
    transition: 'all 0.2s',
    marginBottom: '4px',
    justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Topbar */}
      <header style={{ 
        height: '60px', 
        backgroundColor: 'var(--color-surface)', 
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isSidebarCollapsed ? '64px' : '240px', transition: 'width 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '1px' }}>
            ✦ {!isSidebarCollapsed && <span>AURI</span>}
          </div>
        </div>

        {/* Dolar Widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-surface-2)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Dólar Blue:</span>
          {dolarLoading ? (
            <Skeleton width="80px" height="16px" borderRadius="4px" />
          ) : dolarBlue ? (
            <div style={{ display: 'flex', gap: '8px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-success)' }}>{dolarBlue.compra}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>/</span>
              <span style={{ color: 'var(--color-danger)' }}>{dolarBlue.venta}</span>
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>-- / --</span>
          )}
        </div>

        {/* User Info / Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '36px', height: '36px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-gold)', 
            color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1rem'
          }}>
            {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ 
          width: isSidebarCollapsed ? '80px' : '280px', 
          backgroundColor: 'var(--color-surface)', 
          borderRight: '1px solid var(--color-border)', 
          padding: '24px 12px', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          position: 'relative'
        }}>
          
          <button 
            onClick={toggleSidebar}
            style={{
              position: 'absolute',
              right: '-14px',
              top: '24px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text)',
              zIndex: 20
            }}
          >
            {isSidebarCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} style={navLinkStyle}>
                {item.icon}
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
            {bottomNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} style={navLinkStyle}>
                {item.icon}
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
            
            <button 
              onClick={signOut} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: 'var(--color-danger)',
                backgroundColor: 'transparent',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '8px',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
              }}
            >
              <LogOut size={20} />
              {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ 
          flex: 1, 
          padding: '32px', 
          overflowY: 'auto',
          backgroundColor: 'var(--color-bg)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
