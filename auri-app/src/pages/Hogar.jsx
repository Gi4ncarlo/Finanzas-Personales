import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatARS } from '../utils/currency';
import Skeleton from '../components/ui/Skeleton';
import FraccionamientoHeader from '../components/hogar/FraccionamientoHeader';
import SobresGrid from '../components/hogar/SobresGrid';
import SobreModal from '../components/hogar/SobreModal';
import ServiciosChecklist from '../components/hogar/ServiciosChecklist';
import ServicioModal from '../components/hogar/ServicioModal';
import DistribuirIngresoModal from '../components/hogar/DistribuirIngresoModal';
import AutoExpenseModal from '../components/hogar/AutoExpenseModal';
import TransaccionModal from '../components/transacciones/TransaccionModal';
import { 
  getHouseholdSettings, saveHouseholdSettings,
  getHouseholdBuckets, saveHouseholdBucket, deleteHouseholdBucket,
  getHouseholdServices, saveHouseholdService, deleteHouseholdService,
  getServicePaymentsMonth, toggleServicePayment,
  getAutomaticExpenses, saveAutomaticExpense, deleteAutomaticExpense
} from '../services/householdService';
import { 
  Home, Sparkles, RefreshCw, Plus, Edit2, Trash2, ShieldCheck, 
  BarChart3, Printer, Calendar, ListFilter, TrendingUp, Info 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, 
  PieChart as RechartsPieChart, Pie, Cell, Legend 
} from 'recharts';

export default function Hogar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Gestión de Pestañas
  const [activeTab, setActiveTab] = useState('gestion'); // 'gestion' | 'estadisticas'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'

  // Estados de datos
  const [settings, setSettings] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [services, setServices] = useState([]);
  const [paidServices, setPaidServices] = useState({});
  const [autoExpenses, setAutoExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isSobreModalOpen, setIsSobreModalOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState(null);

  const [isServicioModalOpen, setIsServicioModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [isAutoExpenseModalOpen, setIsAutoExpenseModalOpen] = useState(false);
  const [editingAutoExpense, setEditingAutoExpense] = useState(null);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialData, setTxInitialData] = useState(null);

  const currentYearMonth = new Date().toISOString().slice(0, 7);

  // Cargar todos los datos
  const loadData = useCallback(async (isSilent = false) => {
    if (!user?.id) return;
    if (!isSilent) setLoading(true);
    try {
      const [accRes, catRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id).order('nombre')
      ]);

      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);

      const [setObj, bList, sList, aeList] = await Promise.all([
        getHouseholdSettings(user.id),
        getHouseholdBuckets(user.id),
        getHouseholdServices(user.id),
        getAutomaticExpenses(user.id)
      ]);

      setSettings(setObj);
      setBuckets(bList);
      setServices(sList);
      setAutoExpenses(aeList);
      setPaidServices(getServicePaymentsMonth(user.id, currentYearMonth));

    } catch (err) {
      console.error('Error al cargar datos del hogar:', err);
      toast.error('Error al cargar datos de control del hogar');
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentYearMonth, toast]);

  useEffect(() => {
    if (user?.id) {
      // Only show full loading skeleton if we don't have buckets in state
      const hasData = buckets.length > 0;
      loadData(hasData); // isSilent = true if we already have data
    }
  }, [user?.id, currentYearMonth]);

  // SWR para transacciones del mes seleccionado
  const firstDayOfMonth = `${selectedMonth}-01`;
  const { data: monthTransactions, mutate: mutateTx } = useSWR(
    user ? ['transactions_household', user.id, selectedMonth] : null,
    async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', firstDayOfMonth)
        .lte('fecha', `${selectedMonth}-31T23:59:59`); // Estimado simple fin de mes

      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Suma total de Gastos Automáticos activos
  const totalDebitoAutomaticoActivo = useMemo(() => {
    return autoExpenses
      .filter(ae => ae.activo)
      .reduce((sum, ae) => sum + Number(ae.monto || 0), 0);
  }, [autoExpenses]);

  // Agrupado de gastos automáticos activos por sobre (bucket) para debitar individualmente
  const autoExpensesByBucket = useMemo(() => {
    const map = {};
    autoExpenses.forEach(ae => {
      if (ae.activo) {
        map[ae.bucket_id] = (map[ae.bucket_id] || 0) + Number(ae.monto || 0);
      }
    });
    return map;
  }, [autoExpenses]);

  // Calcular Gasto Mensual Real por Sobre (incluyendo transacciones reales + débitos automáticos virtuales + servicios pagados)
  const spendingPerBucket = useMemo(() => {
    if (!buckets) return {};

    const map = {};
    buckets.forEach(b => { 
      // Empezar con el débito automático de este sobre
      map[b.id] = autoExpensesByBucket[b.id] || 0; 
    });

    const localMappingKey = `auri_local_tx_household_mapping_${user?.id}`;
    const localMapping = JSON.parse(localStorage.getItem(localMappingKey) || '{}');

    // 1. Agregar transacciones reales
    if (monthTransactions) {
      monthTransactions.forEach(tx => {
        if (tx.tipo === 'egreso') {
          // Si no existe la columna en Supabase, buscamos el mapeo en el localStorage
          const hBucketId = tx.household_bucket_id || localMapping[tx.id]?.household_bucket_id;

          if (hBucketId && map[hBucketId] !== undefined) {
            map[hBucketId] += Number(tx.monto || 0);
          } else if (tx.category_id) {
            const matchingBucket = buckets.find(b => b.categoria_id === tx.category_id);
            if (matchingBucket) {
              map[matchingBucket.id] += Number(tx.monto || 0);
            }
          }
        }
      });
    }

    // 2. Agregar servicios marcados como "Pagado" que no tengan una transacción real registrada
    services.forEach(s => {
      const isPaid = !!paidServices[s.id];
      if (isPaid) {
        // Verificar si ya existe una transacción para este servicio
        const hasRealTx = monthTransactions?.some(tx => 
          tx.tipo === 'egreso' && 
          (tx.descripcion?.toLowerCase().includes(`pago: ${s.nombre}`.toLowerCase()) || 
           tx.descripcion?.toLowerCase().includes(s.nombre.toLowerCase()))
        );
        
        if (!hasRealTx && map[s.bucket_id] !== undefined) {
          map[s.bucket_id] += Number(s.monto_estimado || 0);
        }
      }
    });

    return map;
  }, [monthTransactions, buckets, autoExpensesByBucket, services, paidServices, user]);

  const totalPresupuestadoCasa = useMemo(() => {
    return buckets.reduce((acc, b) => acc + Number(b.monto_presupuestado || 0), 0);
  }, [buckets]);

  const totalGastadoCasa = useMemo(() => {
    if (!spendingPerBucket) return 0;
    return Object.values(spendingPerBucket).reduce((acc, val) => acc + Number(val || 0), 0);
  }, [spendingPerBucket]);

  const totalGastadoPersonal = useMemo(() => {
    if (!monthTransactions) return 0;
    const localMappingKey = `auri_local_tx_household_mapping_${user?.id}`;
    const localMapping = JSON.parse(localStorage.getItem(localMappingKey) || '{}');

    return monthTransactions
      .filter(tx => {
        if (tx.tipo !== 'egreso') return false;
        const isHouse = tx.es_gasto_casa || !!localMapping[tx.id]?.es_gasto_casa;
        return !isHouse;
      })
      .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
  }, [monthTransactions, user]);

  // Lista unificada de transacciones de casa para la tabla de estadísticas
  const householdTransactionsList = useMemo(() => {
    if (!monthTransactions) return [];
    const localMappingKey = `auri_local_tx_household_mapping_${user?.id}`;
    const localMapping = JSON.parse(localStorage.getItem(localMappingKey) || '{}');

    const manual = monthTransactions
      .filter(tx => tx.tipo === 'egreso' && (tx.es_gasto_casa || !!localMapping[tx.id]?.es_gasto_casa))
      .map(tx => {
        const bId = tx.household_bucket_id || localMapping[tx.id]?.household_bucket_id;
        const bName = buckets.find(b => b.id === bId)?.nombre || 'General Casa';
        return {
          id: tx.id,
          fecha: new Date(tx.fecha).toISOString().slice(0, 10),
          descripcion: tx.descripcion,
          monto: tx.monto,
          tipo: 'Manual',
          sobre: bName
        };
      });

    // Agregar débitos automáticos activos en una simulación de lista
    const autos = autoExpenses
      .filter(ae => ae.activo)
      .map(ae => {
        const bName = buckets.find(b => b.id === ae.bucket_id)?.nombre || 'General Casa';
        return {
          id: ae.id,
          fecha: `${selectedMonth}-${String(ae.dia_debito).padStart(2, '0')}`,
          descripcion: `${ae.nombre} (Débito Automático)`,
          monto: ae.monto,
          tipo: 'Automático',
          sobre: bName
        };
      });

    return [...manual, ...autos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [monthTransactions, autoExpenses, buckets, selectedMonth, user]);

  // Histórico de comparación mes a mes (Simulado basado en mes actual y meses anteriores)
  const historicalComparisonData = useMemo(() => {
    // Generar datos ficticios y consistentes de meses anteriores para poder comparar
    return [
      { mes: 'Mayo', Casa: 480000, Personal: 320000 },
      { mes: 'Junio', Casa: 510000, Personal: 410000 },
      { mes: 'Julio', Casa: 590000, Personal: 380000 },
      { mes: 'Este Mes', Casa: totalGastadoCasa, Personal: totalGastadoPersonal }
    ];
  }, [totalGastadoCasa, totalGastadoPersonal]);

  // Datos para gráfico de Torta de desgloses de sobres
  const pieChartData = useMemo(() => {
    return buckets.map(b => ({
      name: b.nombre,
      value: spendingPerBucket[b.id] || 0,
      color: b.color || '#C9A84C'
    })).filter(item => item.value > 0);
  }, [buckets, spendingPerBucket]);

  // Handlers
  const handleUpdateSettings = async (newSettings) => {
    const updated = await saveHouseholdSettings(user.id, newSettings);
    setSettings(updated);
    toast.success('Valores manuales actualizados');
  };

  const handleAddFunds = async ({ monto, aumentoCasa, aumentoPersonal, modo = 'sumar', accountId }) => {
    const currentSaldo = settings?.saldo_manual !== undefined ? settings.saldo_manual : 11400000;
    const currentMontoCasa = settings?.monto_destinado_casa !== undefined ? settings.monto_destinado_casa : 2000000;
    const currentPresupuesto = settings?.presupuesto_previsto_manual !== undefined ? settings.presupuesto_previsto_manual : 3000000;

    const newSaldoManual = Math.max(0, currentSaldo + monto);
    const newMontoCasa = Math.max(0, currentMontoCasa + aumentoCasa);
    const newPresupuestoPrevisto = Math.max(0, currentPresupuesto + aumentoCasa);

    const newSettings = {
      ...settings,
      regla_tipo: 'manual',
      saldo_manual: newSaldoManual,
      monto_destinado_casa: newMontoCasa,
      presupuesto_previsto_manual: newPresupuestoPrevisto
    };

    const updated = await saveHouseholdSettings(user.id, newSettings);
    setSettings(updated);

    // Si se seleccionó una cuenta bancaria/billetera real, registrar la transacción correspondiente
    if (accountId) {
      try {
        const esIngreso = monto > 0;
        const absMonto = Math.abs(monto);

        await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: accountId,
          tipo: esIngreso ? 'ingreso' : 'egreso',
          monto: absMonto,
          moneda: 'ARS',
          descripcion: esIngreso 
            ? `Ingreso de Fondos ${aumentoCasa > 0 ? '(Presupuesto Casa)' : '(Personal)'}`
            : `Ajuste / Descuento de Fondos ${aumentoCasa < 0 ? '(Presupuesto Casa)' : '(Personal)'}`,
          fecha: new Date().toISOString().slice(0, 10),
          es_gasto_casa: aumentoCasa !== 0
        });

        // Actualizar saldo de la cuenta
        const targetAcc = accounts.find(a => a.id === accountId);
        if (targetAcc) {
          const actualSaldo = Number(targetAcc.saldo_inicial || 0);
          await supabase.from('accounts').update({
            saldo_inicial: esIngreso ? actualSaldo + absMonto : actualSaldo - absMonto
          }).eq('id', accountId);
        }

        mutateTx();
      } catch (err) {
        console.error('Error al registrar transacción de fondos:', err);
      }
    }

    if (monto >= 0) {
      toast.success(`¡Se sumaron ${formatARS(monto)} a tu presupuesto!`);
    } else {
      toast.success(`¡Se restaron ${formatARS(Math.abs(monto))} de tu presupuesto!`);
    }
  };

  const handleSaveBucket = async (bucketData) => {
    await saveHouseholdBucket(user.id, bucketData);
    loadData();
  };

  const handleDeleteBucket = async (bucketId) => {
    const ok = await confirm('¿Estás seguro de eliminar este sobre de casa?');
    if (!ok) return;
    await deleteHouseholdBucket(user.id, bucketId);
    loadData();
  };

  const handleSaveService = async (serviceData) => {
    await saveHouseholdService(user.id, serviceData);
    loadData();
  };

  const handleDeleteService = async (serviceId) => {
    const ok = await confirm('¿Estás seguro de eliminar este servicio?');
    if (!ok) return;
    await deleteHouseholdService(user.id, serviceId);
    loadData();
  };

  const handleToggleServicePaid = (serviceId, isPaid) => {
    const updated = toggleServicePayment(user.id, serviceId, currentYearMonth, isPaid);
    setPaidServices(updated);
    toast.success(isPaid ? 'Servicio marcado como pagado' : 'Servicio desmarcado');
  };

  const handlePayAndRegisterTransaction = (service) => {
    const bucket = buckets.find(b => b.id === service.bucket_id);
    setTxInitialData({
      tipo: 'egreso',
      descripcion: `Pago: ${service.nombre}`,
      monto: service.monto_estimado,
      account_id: settings?.account_id || (accounts[0]?.id || ''),
      category_id: bucket?.categoria_id || '',
      household_bucket_id: service.bucket_id || null,
      es_gasto_casa: true
    });
    setIsTxModalOpen(true);
  };

  const handleQuickExpenseBucket = (bucket) => {
    setTxInitialData({
      tipo: 'egreso',
      descripcion: `Gasto Casa: ${bucket.nombre}`,
      monto: '',
      account_id: settings?.account_id || (accounts[0]?.id || ''),
      category_id: bucket.category_id || '',
      household_bucket_id: bucket.id,
      es_gasto_casa: true
    });
    setIsTxModalOpen(true);
  };

  const handleSaveAutoExpense = async (data) => {
    await saveAutomaticExpense(user.id, data);
    const list = await getAutomaticExpenses(user.id);
    setAutoExpenses(list);
    toast.success('Gasto automático guardado');
  };

  const handleDeleteAutoExpense = async (id) => {
    const ok = await confirm('¿Estás seguro de eliminar este gasto automático?');
    if (!ok) return;
    await deleteAutomaticExpense(user.id, id);
    const list = await getAutomaticExpenses(user.id);
    setAutoExpenses(list);
    toast.success('Gasto automático eliminado');
  };

  const handleToggleAutoExpenseActive = async (expense, activeState) => {
    await saveAutomaticExpense(user.id, { ...expense, activo: activeState });
    const list = await getAutomaticExpenses(user.id);
    setAutoExpenses(list);
    toast.success(activeState ? 'Gasto automático activado (debitado)' : 'Gasto automático desactivado');
  };

  const handleSaveTransaction = async (payload) => {
    if (payload.es_gasto_casa) {
      const localMappingKey = `auri_local_tx_household_mapping_${user.id}`;
      const currentMapping = JSON.parse(localStorage.getItem(localMappingKey) || '{}');
      currentMapping[payload.id] = { 
        es_gasto_casa: true, 
        household_bucket_id: payload.household_bucket_id 
      };
      localStorage.setItem(localMappingKey, JSON.stringify(currentMapping));
    }

    const { error } = await supabase.from('transactions').insert([payload]);
    
    if (error) {
      if (error.message?.includes('es_gasto_casa') || error.message?.includes('column') || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
        const { es_gasto_casa, household_bucket_id, ...fallbackPayload } = payload;
        const { error: fallbackError } = await supabase.from('transactions').insert([fallbackPayload]);
        
        if (fallbackError) {
          toast.error('Error al guardar la transacción');
          throw fallbackError;
        }
      } else {
        toast.error('Error al guardar la transacción');
        throw error;
      }
    }

    toast.success('Transacción registrada.');
    setIsTxModalOpen(false);
    mutateTx();
    loadData();
  };

  // --- FUNCIÓN DE IMPRESIÓN / PDF ---
  const handlePrintPDF = () => {
    const printContent = `
      <html>
      <head>
        <title>Reporte de Gastos del Hogar - ${selectedMonth}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2C3E50; padding: 40px; }
          h1 { color: #C9A84C; font-size: 24px; border-bottom: 2px solid #C9A84C; padding-bottom: 10px; margin-bottom: 20px; }
          h2 { color: #34495E; font-size: 16px; margin-top: 30px; border-bottom: 1px solid #BDC3C7; padding-bottom: 5px; }
          .summary-box { display: flex; justify-content: space-between; margin-bottom: 30px; background-color: #F8F9FA; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; }
          .summary-item { text-align: center; flex: 1; }
          .summary-item label { display: block; font-size: 11px; color: #7F8C8D; text-transform: uppercase; margin-bottom: 5px; }
          .summary-item value { display: block; font-size: 18px; font-weight: bold; color: #2C3E50; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background-color: #F2F4F4; text-align: left; padding: 10px; border-bottom: 2px solid #BDC3C7; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ECF0F1; }
          .monto { font-weight: bold; text-align: right; }
          th.monto-h { text-align: right; }
          .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #95A5A6; }
        </style>
      </head>
      <body>
        <h1>Reporte Mensual de Gastos del Hogar</h1>
        <p><strong>Mes de Análisis:</strong> ${selectedMonth} | <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
        
        <div class="summary-box">
          <div class="summary-item">
            <label>Saldo Total Declarado</label>
            <value>${formatARS(settings?.saldo_manual || 0)}</value>
          </div>
          <div class="summary-item">
            <label>Fondo Asignado Hogar</label>
            <value>${formatARS(settings?.monto_destinado_casa || 0)}</value>
          </div>
          <div class="summary-item">
            <label>Gasto Real Casa (Egresos + Autos)</label>
            <value>${formatARS(totalGastadoCasa)}</value>
          </div>
          <div class="summary-item">
            <label>Remanente Casa</label>
            <value>${formatARS(Math.max(0, (settings?.monto_destinado_casa || 0) - totalGastadoCasa))}</value>
          </div>
        </div>

        <h2>Desglose por Sobres del Hogar</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre del Sobre</th>
              <th class="monto-h">Presupuestado</th>
              <th class="monto-h">Consumido Real</th>
              <th class="monto-h">Disponible / Restante</th>
            </tr>
          </thead>
          <tbody>
            ${buckets.map(b => {
              const gast = spendingPerBucket[b.id] || 0;
              const disp = b.monto_presupuestado - gast;
              return `
                <tr>
                  <td>${b.nombre}</td>
                  <td class="monto">${formatARS(b.monto_presupuestado)}</td>
                  <td class="monto">${formatARS(gast)}</td>
                  <td class="monto" style="color: ${disp >= 0 ? '#27AE60' : '#C0392B'}">${formatARS(disp)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h2>Listado Detallado de Gastos de la Casa</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Sobre Asociado</th>
              <th class="monto-h">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${householdTransactionsList.map(item => `
              <tr>
                <td>${item.fecha}</td>
                <td>${item.descripcion}</td>
                <td>${item.tipo}</td>
                <td>${item.sobre}</td>
                <td class="monto">-${formatARS(item.monto)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          AURI Finanzas Personales — Control de Hogar y Supervivencia
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton height="160px" borderRadius="16px" style={{ marginBottom: '24px' }} />
        <Skeleton height="280px" borderRadius="16px" />
      </div>
    );
  }

  return (
    <div>
      {/* Título de la Sección */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
            <Home size={20} />
            <span>NUEVO APARTADO</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--color-text)' }}>
            Control de Casa y Supervivencia
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Configura de forma manual tu presupuesto y fondos para gestionar lo que es de la casa frente a tus gastos personales.
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div style={{ display: 'flex', backgroundColor: 'var(--color-surface-2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('gestion')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: activeTab === 'gestion' ? 'var(--color-gold)' : 'transparent',
              color: activeTab === 'gestion' ? '#000' : 'var(--color-text-muted)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Gestión de Casa
          </button>
          <button
            onClick={() => setActiveTab('estadisticas')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: activeTab === 'estadisticas' ? 'var(--color-gold)' : 'transparent',
              color: activeTab === 'estadisticas' ? '#000' : 'var(--color-text-muted)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Estadísticas y Reportes
          </button>
        </div>
      </div>

      {activeTab === 'gestion' ? (
        <>
          {/* Header Fraccionamiento Manual */}
          <FraccionamientoHeader
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onAddFunds={handleAddFunds}
            accounts={accounts}
            onOpenCalculator={() => setIsCalculatorOpen(true)}
            totalPresupuestadoCasa={totalPresupuestadoCasa}
            totalGastadoCasa={totalGastadoCasa}
            totalDebitoAutomaticoActivo={totalDebitoAutomaticoActivo}
            totalGastadoPersonal={totalGastadoPersonal}
            monthTransactions={monthTransactions}
            buckets={buckets}
            spendingPerBucket={spendingPerBucket}
            autoExpenses={autoExpenses}
          />

          {/* Sobres de Gastos del Hogar */}
          <SobresGrid
            buckets={buckets}
            spendingPerBucket={spendingPerBucket}
            onAddBucket={() => { setEditingBucket(null); setIsSobreModalOpen(true); }}
            onEditBucket={(b) => { setEditingBucket(b); setIsSobreModalOpen(true); }}
            onDeleteBucket={handleDeleteBucket}
            onQuickExpense={handleQuickExpenseBucket}
          />

          {/* SECCIÓN GASTOS AUTOMÁTICOS */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={20} style={{ color: '#98C379' }} />
                  Gastos Automáticos Mensuales
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  Suscripciones o pagos recurrentes que se debitan automáticamente del fondo y presupuesto de la casa.
                </p>
              </div>
              <button
                onClick={() => { setEditingAutoExpense(null); setIsAutoExpenseModalOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: 'rgba(152, 195, 121, 0.15)', color: '#98C379',
                  border: '1px solid rgba(152, 195, 121, 0.3)', borderRadius: '8px',
                  padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <Plus size={16} /> Agregar Gasto Auto
              </button>
            </div>

            {autoExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                No tienes gastos automáticos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {autoExpenses.map((ae) => {
                  const associatedBucket = buckets.find(b => b.id === ae.bucket_id)?.nombre || 'General';
                  return (
                    <div
                      key={ae.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={ae.activo}
                          onChange={(e) => handleToggleAutoExpenseActive(ae, e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: '#98C379', cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, color: ae.activo ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                            {ae.nombre}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Debita de: <strong>{associatedBucket}</strong> | Día de débito: {ae.dia_debito}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: 700, color: ae.activo ? '#98C379' : 'var(--color-text-muted)' }}>
                          {formatARS(ae.monto)}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => { setEditingAutoExpense(ae); setIsAutoExpenseModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteAutoExpense(ae.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Servicios Checklist */}
          <ServiciosChecklist
            services={services}
            paidState={paidServices}
            onTogglePaid={handleToggleServicePaid}
            onAddService={() => { setEditingService(null); setIsServicioModalOpen(true); }}
            onEditService={(s) => { setEditingService(s); setIsServicioModalOpen(true); }}
            onDeleteService={handleDeleteService}
            onPayAndRegisterTransaction={handlePayAndRegisterTransaction}
          />
        </>
      ) : (
        /* PESTAÑA NUEVA: ESTADÍSTICAS Y REPORTES */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Controles de reporte */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} style={{ color: 'var(--color-gold)' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Mes de Análisis:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              onClick={handlePrintPDF}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'var(--color-gold)', color: '#000',
                border: 'none', borderRadius: '8px', padding: '10px 18px',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <Printer size={18} />
              <span>Imprimir Resumen PDF</span>
            </button>
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Gráfico 1: Comparativa Histórica de Gastos */}
            <div style={{
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--color-gold)' }} />
                Comparativa de Gastos Mensuales (Hogar vs Personal)
              </h3>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalComparisonData}>
                    <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Casa" fill="#61AFEF" radius={[4, 4, 0, 0]} name="Gastos Casa" />
                    <Bar dataKey="Personal" fill="#98C379" radius={[4, 4, 0, 0]} name="Gastos Personales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Desglose por Sobre del Hogar */}
            <div style={{
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} style={{ color: '#61AFEF' }} />
                Distribución de Consumo en Sobres de Casa
              </h3>
              <div style={{ width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pieChartData.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    <Info size={28} style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }} />
                    <div>Registra egresos de casa para ver el gráfico circular</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(value) => formatARS(value)} />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', color: 'var(--color-text-muted)' }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Listado Detallado de Gastos de Casa */}
          <div style={{
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListFilter size={20} style={{ color: 'var(--color-gold)' }} />
              Seguimiento Detallado de Gastos de la Casa
            </h3>

            {householdTransactionsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                No hay movimientos registrados en la casa para este mes.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Fecha</th>
                      <th style={{ padding: '12px' }}>Descripción</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Sobre Destino</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {householdTransactionsList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                        <td style={{ padding: '12px' }}>{new Date(item.fecha).toLocaleDateString('es-AR')}</td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{item.descripcion}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: item.type === 'Automático' ? 'rgba(152,195,121,0.15)' : 'rgba(97,175,239,0.15)',
                            color: item.type === 'Automático' ? '#98C379' : '#61AFEF'
                          }}>
                            {item.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{item.sobre}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                          -{formatARS(item.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modales */}
      <SobreModal
        isOpen={isSobreModalOpen}
        onClose={() => setIsSobreModalOpen(false)}
        onSave={handleSaveBucket}
        editingBucket={editingBucket}
        categories={categories}
      />

      <ServicioModal
        isOpen={isServicioModalOpen}
        onClose={() => setIsServicioModalOpen(false)}
        onSave={handleSaveService}
        editingService={editingService}
        buckets={buckets}
      />

      <AutoExpenseModal
        isOpen={isAutoExpenseModalOpen}
        onClose={() => setIsAutoExpenseModalOpen(false)}
        onSave={handleSaveAutoExpense}
        editingExpense={editingAutoExpense}
        buckets={buckets}
      />

      <DistribuirIngresoModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        settings={settings}
        buckets={buckets}
        onApplyDistribution={handleUpdateSettings}
      />

      {isTxModalOpen && (
        <TransaccionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleSaveTransaction}
          transaccion={txInitialData}
          accounts={accounts}
          categories={categories}
        />
      )}
    </div>
  );
}
