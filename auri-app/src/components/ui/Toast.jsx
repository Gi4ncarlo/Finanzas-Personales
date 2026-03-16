import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={20} color="var(--color-success)" />,
  error: <AlertCircle size={20} color="var(--color-danger)" />,
  warning: <AlertTriangle size={20} color="var(--color-warning)" />,
  info: <Info size={20} color="var(--color-text-muted)" />,
};

const bgColors = {
  success: 'rgba(46, 204, 113, 0.1)',
  error: 'rgba(231, 76, 60, 0.1)',
  warning: 'rgba(243, 156, 18, 0.1)',
  info: 'rgba(122, 155, 191, 0.1)',
};

const borderColors = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-text-muted)',
};

export default function Toast({ message, type = 'info', onClose }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: 'var(--color-surface)',
      borderLeft: `4px solid ${borderColors[type]}`,
      borderRadius: '4px 8px 8px 4px',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out forwards',
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      <div>{icons[type]}</div>
      <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500 }}>{message}</div>
      <button 
        onClick={onClose} 
        style={{ 
          background: 'none', border: 'none', color: 'var(--color-text-muted)', 
          cursor: 'pointer', display: 'flex', alignItems: 'center' 
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
