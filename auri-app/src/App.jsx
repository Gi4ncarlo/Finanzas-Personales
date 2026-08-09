import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Skeleton from './components/ui/Skeleton';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';

// Eager load primary pages for fast first render
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load secondary pages to optimize initial bundle size & speed
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Inversiones = lazy(() => import('./pages/Inversiones'));
const InvestmentDetail = lazy(() => import('./pages/InvestmentDetail'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Cuentas = lazy(() => import('./pages/Cuentas'));
const CuentaDetalle = lazy(() => import('./pages/CuentaDetalle'));
const Transacciones = lazy(() => import('./pages/Transacciones'));
const Recurrentes = lazy(() => import('./pages/Recurrentes'));
const Informes = lazy(() => import('./pages/Informes'));
const Metas = lazy(() => import('./pages/Metas'));
const MetaDetalle = lazy(() => import('./pages/MetaDetalle'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Notificaciones = lazy(() => import('./pages/Notificaciones'));
const Hogar = lazy(() => import('./pages/Hogar'));

const PageLoader = () => (
  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <Skeleton height="32px" width="200px" />
    <Skeleton height="160px" width="100%" borderRadius="12px" />
    <Skeleton height="300px" width="100%" borderRadius="12px" />
  </div>
);

const swrGlobalConfig = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
  dedupingInterval: 60000,
};

function App() {
  return (
    <SWRConfig value={swrGlobalConfig}>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public / Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/registro" element={<Register />} />
                  </Route>

                  {/* Protected / App Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/hogar" element={<Hogar />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/perfil" element={<Perfil />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                    <Route path="/cuentas" element={<Cuentas />} />
                    <Route path="/cuentas/:id" element={<CuentaDetalle />} />
                    <Route path="/inversiones" element={<Inversiones />} />
                    <Route path="/inversiones/:id" element={<InvestmentDetail />} />

                    <Route path="/transacciones" element={<Transacciones />} />
                    <Route path="/recurrentes" element={<Recurrentes />} />
                    <Route path="/informes" element={<Informes />} />
                    <Route path="/metas" element={<Metas />} />
                    <Route path="/metas/:id" element={<MetaDetalle />} />
                    <Route path="/alertas" element={<Alertas />} />
                    <Route path="/notificaciones" element={<Notificaciones />} />
                  </Route>
                  
                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </SWRConfig>
  );
}

export default App;

