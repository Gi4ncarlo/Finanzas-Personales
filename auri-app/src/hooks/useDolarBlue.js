import { useState, useEffect, useCallback } from 'react';

const DOLAR_ENDPOINTS = {
  blue:    'https://dolarapi.com/v1/dolares/blue',
  oficial: 'https://dolarapi.com/v1/dolares/oficial',
  mep:     'https://dolarapi.com/v1/dolares/bolsa',
  ccl:     'https://dolarapi.com/v1/dolares/contadoconliqui',
};

/**
 * Hook reutilizable para obtener cotización del dólar.
 * @param {string} tipo - 'oficial' (Banco Nación) | 'blue' | 'mep' | 'ccl' (default: 'oficial')
 * @returns {{ compra, venta, nombre, loading, error, refetch }}
 */
export default function useDolarRate(tipo = 'oficial') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const endpoint = DOLAR_ENDPOINTS[tipo] || DOLAR_ENDPOINTS.blue;

  const fetchDolar = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching dolar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchDolar();
    const interval = setInterval(fetchDolar, 300000); // 5 min cache
    return () => clearInterval(interval);
  }, [fetchDolar]);

  return {
    compra: data?.compra || null,
    venta: data?.venta || null,
    nombre: tipo === 'oficial' ? 'Banco Nación' : (data?.nombre || tipo),
    loading,
    error,
    refetch: fetchDolar,
    // Alias for backward compat
    dolarBlue: data,
  };
}

// Conversion utilities
export const usdToArs = (monto, tasaVenta) => monto * tasaVenta;
export const arsToUsd = (monto, tasaCompra) => monto / tasaCompra;
