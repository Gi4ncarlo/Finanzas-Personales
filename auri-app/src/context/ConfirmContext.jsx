import React, { createContext, useState, useContext, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    message: '',
    resolve: null,
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        resolve,
      });
    });
  }, []);

  const handleClose = (result) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState.isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 99999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px', animation: 'fadeIn 0.2s ease-out', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <AlertTriangle size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text)', fontWeight: 600 }}>Confirmación requerida</h3>
              </div>
              <button className="btn-icon" onClick={() => handleClose(false)} style={{ color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '28px', lineHeight: '1.6', fontSize: '1rem', marginLeft: '52px' }}>
              {confirmState.message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => handleClose(false)} style={{ minWidth: '110px' }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => handleClose(true)} style={{ minWidth: '110px', backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
