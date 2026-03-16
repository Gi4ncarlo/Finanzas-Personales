// Siempre usar America/Argentina/Buenos_Aires para todas las operaciones de fecha/hora
// Formatters as requested

// Siempre usar esta función para mostrar montos en ARS
export const formatARS = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);

// Para USD
export const formatUSD = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(monto);
