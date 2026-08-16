/**
 * Utilidad unificada para clasificar si una transacción pertenece al Hogar (Casa)
 * o si es de finanzas Personales.
 */
export function isHouseTransaction(tx, userId) {
  if (!tx) return false;
  if (tx.es_gasto_casa) return true;
  if (tx.household_bucket_id) return true;

  if (userId) {
    const localMappingKey = `auri_local_tx_household_mapping_${userId}`;
    try {
      const localMapping = JSON.parse(localStorage.getItem(localMappingKey) || '{}');
      if (localMapping[tx.id]?.es_gasto_casa) return true;
      if (localMapping[tx.id]?.household_bucket_id) return true;

      const cleanDesc = tx.descripcion ? tx.descripcion.trim() : '';
      if (cleanDesc && localMapping['desc_' + cleanDesc]?.es_gasto_casa) return true;
    } catch {
      // ignore
    }
  }

  // Comprobar descripciones comunes asociadas a la casa / hogar
  const cleanDesc = tx.descripcion ? tx.descripcion.trim().toLowerCase() : '';
  if (cleanDesc) {
    const houseKeywords = [
      'gasto casa',
      'presupuesto casa',
      'fondo casa',
      'aporte casa',
      'aporte a la casa',
      'aporte mensual casa',
      'comisión casa',
      'comision casa',
      'compra pollo',
      'nafta auto',
      'débito automático',
      'debito automatico',
      'supermercado',
      'coto',
      'carrefour',
      'dia%',
      'jumbo',
      'vea',
      'alquiler',
      'expensas',
      'edenor',
      'edesur',
      'metrogas',
      'naturgy',
      'fibertel',
      'telecentro',
      'flow',
      'aysa',
      'seguro de hogar'
    ];

    if (houseKeywords.some(keyword => cleanDesc.includes(keyword))) {
      return true;
    }
  }

  return false;
}
