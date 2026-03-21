const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Calcula la próxima fecha de ejecución de un recurrente.
 * @param {Object} r - El objeto recurrente
 * @returns {Date} - La próxima fecha de ejecución
 */
export function calcProximaEjecucion(r) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (r.frecuencia === 'mensual') {
    const diaObj = r.dia_ejecucion || 1;
    // ¿Ya pasó este mes?
    const esteMs = new Date(hoy.getFullYear(), hoy.getMonth(), diaObj);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diaReal = Math.min(diaObj, ultimoDiaMes);
    const esteMesReal = new Date(hoy.getFullYear(), hoy.getMonth(), diaReal);
    if (esteMesReal >= hoy) return esteMesReal;
    // Próximo mes
    const nextMonth = hoy.getMonth() + 1;
    const nextYear = nextMonth > 11 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    const mesNorm = nextMonth > 11 ? 0 : nextMonth;
    const ultimoDiaSig = new Date(nextYear, mesNorm + 1, 0).getDate();
    return new Date(nextYear, mesNorm, Math.min(diaObj, ultimoDiaSig));
  }

  if (r.frecuencia === 'semanal') {
    const diaTarget = r.dia_semana ?? 1; // 0=Dom, 1=Lun, etc.
    const diaActual = hoy.getDay();
    let diff = diaTarget - diaActual;
    if (diff <= 0) diff += 7;
    const next = new Date(hoy);
    next.setDate(hoy.getDate() + diff);
    return next;
  }

  if (r.frecuencia === 'anual') {
    const diaObj = r.dia_ejecucion || 1;
    const mesObj = (r.mes_ejecucion || 1) - 1; // 0-indexed
    const ultimoDia = new Date(hoy.getFullYear(), mesObj + 1, 0).getDate();
    const diaReal = Math.min(diaObj, ultimoDia);
    const esteAnio = new Date(hoy.getFullYear(), mesObj, diaReal);
    if (esteAnio >= hoy) return esteAnio;
    const ultimoDiaSig = new Date(hoy.getFullYear() + 1, mesObj + 1, 0).getDate();
    return new Date(hoy.getFullYear() + 1, mesObj, Math.min(diaObj, ultimoDiaSig));
  }

  return hoy;
}

/**
 * Formatea la próxima fecha de ejecución como string legible en español.
 * @param {Date} fecha
 * @returns {string}
 */
export function formatProximaFecha(fecha) {
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Retorna un label legible para la frecuencia de un recurrente.
 */
export function frecuenciaLabel(r) {
  if (r.frecuencia === 'mensual') return `Día ${r.dia_ejecucion} de cada mes`;
  if (r.frecuencia === 'semanal') return `Cada ${DIAS_SEMANA[r.dia_semana] || '?'}`;
  if (r.frecuencia === 'anual') return `${r.dia_ejecucion} de ${MESES[(r.mes_ejecucion || 1) - 1]} cada año`;
  return r.frecuencia;
}

export { DIAS_SEMANA, MESES };
