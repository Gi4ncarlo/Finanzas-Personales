import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Perfil from './pages/Perfil';
import Configuracion from './pages/Configuracion';
import Cuentas from './pages/Cuentas';
import CuentaDetalle from './pages/CuentaDetalle';
import Transacciones from './pages/Transacciones';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
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
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/cuentas" element={<Cuentas />} />
              <Route path="/cuentas/:id" element={<CuentaDetalle />} />
              <Route path="/transacciones" element={<Transacciones />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
