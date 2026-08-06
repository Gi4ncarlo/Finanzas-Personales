import { supabase } from '../lib/supabase';

// Claves de respaldo para LocalStorage en caso de que la tabla de Supabase no esté creada aún
const LS_KEYS = {
  SETTINGS: 'auri_household_settings_',
  BUCKETS: 'auri_household_buckets_',
  SERVICES: 'auri_household_services_',
  PAID_SERVICES: 'auri_household_paid_services_',
  AUTO_EXPENSES: 'auri_household_auto_expenses_'
};

const DEFAULT_BUCKETS = [
  { id: 'b-alquiler', nombre: 'Alquiler y Expensas', monto_presupuestado: 250000, icono: 'home', color: '#E5C07B', orden: 1 },
  { id: 'b-servicios', nombre: 'Servicios (Luz, Agua, Gas, Internet)', monto_presupuestado: 80000, icono: 'zap', color: '#61AFEF', orden: 2 },
  { id: 'b-supermercado', nombre: 'Compras del Hogar / Supermercado', monto_presupuestado: 150000, icono: 'shopping-cart', color: '#98C379', orden: 3 },
  { id: 'b-familia', nombre: 'Transferencias / Ayuda Familiar', monto_presupuestado: 70000, icono: 'heart', color: '#E06C75', orden: 4 },
  { id: 'b-contingencia', nombre: 'Fondo Imprevistos del Hogar', monto_presupuestado: 50000, icono: 'shield-alert', color: '#D19A66', orden: 5 }
];

const DEFAULT_SERVICES = [
  { id: 's-luz', nombre: 'Servicio de Luz (Edenor/Edesur)', monto_estimado: 25000, dia_vencimiento: 12, bucket_id: 'b-servicios', proveedor: 'Edenor' },
  { id: 's-gas', nombre: 'Servicio de Gas (Metrogas)', monto_estimado: 12000, dia_vencimiento: 18, bucket_id: 'b-servicios', proveedor: 'Metrogas' },
  { id: 's-internet', nombre: 'Internet / TV (Personal/Fibertel)', monto_estimado: 28000, dia_vencimiento: 20, bucket_id: 'b-servicios', proveedor: 'Personal' }
];

const DEFAULT_AUTO_EXPENSES = [
  { id: 'ae-netflix', nombre: 'Netflix Suscripción', monto: 8500, bucket_id: 'b-servicios', dia_debito: 5, activo: true },
  { id: 'ae-spotify', nombre: 'Spotify Duo', monto: 3200, bucket_id: 'b-servicios', dia_debito: 10, activo: true },
  { id: 'ae-seguro', nombre: 'Seguro de Hogar', monto: 12000, bucket_id: 'b-contingencia', dia_debito: 15, activo: true }
];

/**
 * Obtener configuración del hogar
 */
export async function getHouseholdSettings(userId) {
  try {
    const { data, error } = await supabase
      .from('household_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      // Unificar campos manuales si vienen de Supabase
      return {
        ...data,
        saldo_manual: data.saldo_manual !== undefined ? data.saldo_manual : null,
        presupuesto_previsto_manual: data.presupuesto_previsto_manual !== undefined ? data.presupuesto_previsto_manual : null,
        monto_destinado_casa: data.monto_destinado_casa !== undefined ? data.monto_destinado_casa : null
      };
    }
  } catch {
    // fallback
  }

  const raw = localStorage.getItem(LS_KEYS.SETTINGS + userId);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }

  return {
    user_id: userId,
    account_id: null,
    regla_tipo: 'manual', // Cambiado por defecto a manual para control del usuario
    porcentaje_casa: 60,
    monto_fijo_casa: 600000,
    saldo_manual: 11400000, // Valor manual inicial de la captura de pantalla
    presupuesto_previsto_manual: 3000000, // Presupuesto mensual previsto
    monto_destinado_casa: 2000000 // Gastos de casa asignados
  };
}

/**
 * Guardar configuración del hogar
 */
export async function saveHouseholdSettings(userId, settings) {
  const payload = {
    user_id: userId,
    account_id: settings.account_id || null,
    regla_tipo: settings.regla_tipo || 'manual',
    porcentaje_casa: Number(settings.porcentaje_casa) || 60,
    monto_fijo_casa: Number(settings.monto_fijo_casa) || 0,
    saldo_manual: settings.saldo_manual !== undefined ? Number(settings.saldo_manual) : 11400000,
    presupuesto_previsto_manual: settings.presupuesto_previsto_manual !== undefined ? Number(settings.presupuesto_previsto_manual) : 3000000,
    monto_destinado_casa: settings.monto_destinado_casa !== undefined ? Number(settings.monto_destinado_casa) : 2000000,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('household_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(LS_KEYS.SETTINGS + userId, JSON.stringify(data));
      return data;
    }
  } catch {
    // fallback
  }

  localStorage.setItem(LS_KEYS.SETTINGS + userId, JSON.stringify(payload));
  return payload;
}

/**
 * Obtener sobres (buckets) del hogar
 */
export async function getHouseholdBuckets(userId) {
  try {
    const { data, error } = await supabase
      .from('household_buckets')
      .select('*')
      .eq('user_id', userId)
      .order('orden', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  const raw = localStorage.getItem(LS_KEYS.BUCKETS + userId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
  }

  const initial = DEFAULT_BUCKETS.map(b => ({ ...b, user_id: userId }));
  localStorage.setItem(LS_KEYS.BUCKETS + userId, JSON.stringify(initial));
  return initial;
}

/**
 * Guardar / Editar sobre
 */
export async function saveHouseholdBucket(userId, bucket) {
  const id = bucket.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b-' + Date.now());
  const payload = {
    id,
    user_id: userId,
    nombre: bucket.nombre,
    monto_presupuestado: Number(bucket.monto_presupuestado) || 0,
    categoria_id: bucket.categoria_id || null,
    icono: bucket.icono || 'home',
    color: bucket.color || '#C9A84C',
    orden: bucket.orden || 0
  };

  try {
    const { data, error } = await supabase
      .from('household_buckets')
      .upsert(payload)
      .select()
      .single();

    if (!error && data) {
      updateBucketInLocalStorage(userId, data);
      return data;
    }
  } catch {
    // fallback
  }

  updateBucketInLocalStorage(userId, payload);
  return payload;
}

function updateBucketInLocalStorage(userId, bucket) {
  const raw = localStorage.getItem(LS_KEYS.BUCKETS + userId);
  let buckets = [];
  if (raw) {
    try { buckets = JSON.parse(raw); } catch {}
  }
  const idx = buckets.findIndex(b => b.id === bucket.id);
  if (idx >= 0) {
    buckets[idx] = bucket;
  } else {
    buckets.push(bucket);
  }
  localStorage.setItem(LS_KEYS.BUCKETS + userId, JSON.stringify(buckets));
}

/**
 * Eliminar sobre
 */
export async function deleteHouseholdBucket(userId, bucketId) {
  try {
    await supabase.from('household_buckets').delete().eq('id', bucketId);
  } catch {}

  const raw = localStorage.getItem(LS_KEYS.BUCKETS + userId);
  if (raw) {
    try {
      const buckets = JSON.parse(raw).filter(b => b.id !== bucketId);
      localStorage.setItem(LS_KEYS.BUCKETS + userId, JSON.stringify(buckets));
    } catch {}
  }
}

/**
 * Obtener servicios del hogar
 */
export async function getHouseholdServices(userId) {
  try {
    const { data, error } = await supabase
      .from('household_services')
      .select('*')
      .eq('user_id', userId)
      .order('dia_vencimiento', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  const raw = localStorage.getItem(LS_KEYS.SERVICES + userId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
  }

  const initial = DEFAULT_SERVICES.map(s => ({ ...s, user_id: userId }));
  localStorage.setItem(LS_KEYS.SERVICES + userId, JSON.stringify(initial));
  return initial;
}

/**
 * Guardar / Editar servicio
 */
export async function saveHouseholdService(userId, service) {
  const id = service.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 's-' + Date.now());
  const payload = {
    id,
    user_id: userId,
    nombre: service.nombre,
    monto_estimado: Number(service.monto_estimado) || 0,
    dia_vencimiento: Number(service.dia_vencimiento) || 1,
    bucket_id: service.bucket_id || null,
    proveedor: service.proveedor || '',
    notas: service.notas || ''
  };

  try {
    const { data, error } = await supabase
      .from('household_services')
      .upsert(payload)
      .select()
      .single();

    if (!error && data) {
      updateServiceInLocalStorage(userId, data);
      return data;
    }
  } catch {
    // fallback
  }

  updateServiceInLocalStorage(userId, payload);
  return payload;
}

function updateServiceInLocalStorage(userId, service) {
  const raw = localStorage.getItem(LS_KEYS.SERVICES + userId);
  let services = [];
  if (raw) {
    try { services = JSON.parse(raw); } catch {}
  }
  const idx = services.findIndex(s => s.id === service.id);
  if (idx >= 0) {
    services[idx] = service;
  } else {
    services.push(service);
  }
  localStorage.setItem(LS_KEYS.SERVICES + userId, JSON.stringify(services));
}

/**
 * Eliminar servicio
 */
export async function deleteHouseholdService(userId, serviceId) {
  try {
    await supabase.from('household_services').delete().eq('id', serviceId);
  } catch {}

  const raw = localStorage.getItem(LS_KEYS.SERVICES + userId);
  if (raw) {
    try {
      const services = JSON.parse(raw).filter(s => s.id !== serviceId);
      localStorage.setItem(LS_KEYS.SERVICES + userId, JSON.stringify(services));
    } catch {}
  }
}

/**
 * Obtener estado de pago de servicios del mes actual
 */
export function getServicePaymentsMonth(userId, yearMonth) {
  const key = `${LS_KEYS.PAID_SERVICES}${userId}_${yearMonth}`;
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Alternar pago de servicio del mes
 */
export function toggleServicePayment(userId, serviceId, yearMonth, isPaid) {
  const key = `${LS_KEYS.PAID_SERVICES}${userId}_${yearMonth}`;
  const current = getServicePaymentsMonth(userId, yearMonth);
  current[serviceId] = isPaid;
  localStorage.setItem(key, JSON.stringify(current));
  return current;
}

/**
 * GASTOS AUTOMÁTICOS
 */
export async function getAutomaticExpenses(userId) {
  const raw = localStorage.getItem(LS_KEYS.AUTO_EXPENSES + userId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
  }

  const initial = DEFAULT_AUTO_EXPENSES.map(ae => ({ ...ae, user_id: userId }));
  localStorage.setItem(LS_KEYS.AUTO_EXPENSES + userId, JSON.stringify(initial));
  return initial;
}

export async function saveAutomaticExpense(userId, expense) {
  const raw = localStorage.getItem(LS_KEYS.AUTO_EXPENSES + userId);
  let list = [];
  if (raw) {
    try { list = JSON.parse(raw); } catch {}
  }

  const payload = {
    id: expense.id || 'ae-' + Date.now(),
    user_id: userId,
    nombre: expense.nombre,
    monto: Number(expense.monto) || 0,
    bucket_id: expense.bucket_id || '',
    dia_debito: Number(expense.dia_debito) || 1,
    activo: expense.activo !== undefined ? expense.activo : true
  };

  const idx = list.findIndex(item => item.id === payload.id);
  if (idx >= 0) {
    list[idx] = payload;
  } else {
    list.push(payload);
  }

  localStorage.setItem(LS_KEYS.AUTO_EXPENSES + userId, JSON.stringify(list));
  return payload;
}

export async function deleteAutomaticExpense(userId, id) {
  const raw = localStorage.getItem(LS_KEYS.AUTO_EXPENSES + userId);
  if (raw) {
    try {
      const list = JSON.parse(raw).filter(item => item.id !== id);
      localStorage.setItem(LS_KEYS.AUTO_EXPENSES + userId, JSON.stringify(list));
    } catch {}
  }
}
