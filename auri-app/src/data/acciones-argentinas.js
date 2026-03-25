/**
 * Lista de acciones argentinas principales que cotizan en BYMA
 * Se usa como seed local para el buscador — se complementa con la API de Rava
 */

export const ACCIONES_PRINCIPALES = [
  // Panel Líderes (Merval)
  { simbolo: 'ALUA',  nombre: 'Aluar Aluminio Argentino',         sector: 'Materiales'    },
  { simbolo: 'BBAR',  nombre: 'BBVA Argentina',                   sector: 'Finanzas'      },
  { simbolo: 'BMA',   nombre: 'Banco Macro',                      sector: 'Finanzas'      },
  { simbolo: 'BYMA',  nombre: 'Bolsas y Mercados Argentinos',     sector: 'Finanzas'      },
  { simbolo: 'CEPU',  nombre: 'Central Puerto',                   sector: 'Energía'       },
  { simbolo: 'COME',  nombre: 'Sociedad Comercial del Plata',     sector: 'Diversificado' },
  { simbolo: 'CRES',  nombre: 'Cresud',                           sector: 'Agro'          },
  { simbolo: 'CVH',   nombre: 'Cablevision Holding',              sector: 'Telecomunic.'  },
  { simbolo: 'EDN',   nombre: 'Edenor',                           sector: 'Utilities'     },
  { simbolo: 'GGAL',  nombre: 'Grupo Financiero Galicia',         sector: 'Finanzas'      },
  { simbolo: 'HARG',  nombre: 'Hoteles Argentinos',               sector: 'Consumo'       },
  { simbolo: 'LOMA',  nombre: 'Loma Negra',                       sector: 'Materiales'    },
  { simbolo: 'METR',  nombre: 'MetroGAS',                         sector: 'Utilities'     },
  { simbolo: 'MIRG',  nombre: 'Mirgor',                           sector: 'Tecnología'    },
  { simbolo: 'PAMP',  nombre: 'Pampa Energía',                    sector: 'Energía'       },
  { simbolo: 'SUPV',  nombre: 'Supervielle',                      sector: 'Finanzas'      },
  { simbolo: 'TECO2', nombre: 'Telecom Argentina',                sector: 'Telecomunic.'  },
  { simbolo: 'TGNO4', nombre: 'Transportadora de Gas del Norte',  sector: 'Energía'       },
  { simbolo: 'TGSU2', nombre: 'Transportadora de Gas del Sur',    sector: 'Energía'       },
  { simbolo: 'TXAR',  nombre: 'Ternium Argentina',                sector: 'Materiales'    },
  { simbolo: 'VALO',  nombre: 'Grupo Supervielle',                sector: 'Finanzas'      },
  { simbolo: 'YPFD',  nombre: 'YPF',                              sector: 'Energía'       },
  // Panel General
  { simbolo: 'AGRO',  nombre: 'Agrometal',                        sector: 'Agro'          },
  { simbolo: 'BOLT',  nombre: 'Boldt',                            sector: 'Tecnología'    },
  { simbolo: 'CAPX',  nombre: 'Capex',                            sector: 'Energía'       },
  { simbolo: 'FERR',  nombre: 'Ferrum',                           sector: 'Materiales'    },
  { simbolo: 'GAMI',  nombre: 'Gaming Technologies',              sector: 'Tecnología'    },
  { simbolo: 'GCLA',  nombre: 'Gas Natural (Litoral)',             sector: 'Utilities'     },
  { simbolo: 'INTR',  nombre: 'Intralot Argentina',               sector: 'Servicios'     },
  { simbolo: 'INVJ',  nombre: 'Inversora Juramento',              sector: 'Finanzas'      },
  { simbolo: 'MOLA',  nombre: 'Molinos Agro',                     sector: 'Agro'          },
  { simbolo: 'MOLI',  nombre: 'Molinos Río de la Plata',          sector: 'Consumo'       },
  { simbolo: 'PATA',  nombre: 'Banco Patagonia',                  sector: 'Finanzas'      },
  { simbolo: 'RIGO',  nombre: 'Rigolleau',                        sector: 'Materiales'    },
];

/**
 * Sectores únicos para filtros
 */
export const SECTORES_ACCIONES = [
  'Finanzas', 'Energía', 'Utilities', 'Materiales', 
  'Telecomunic.', 'Consumo', 'Agro', 'Tecnología', 
  'Diversificado', 'Servicios'
];

/**
 * Colores brand para las principales acciones AR (dona de distribución)
 */
export const COLORES_ACCIONES_AR = {
  YPFD:  '#00ADEF',  // azul YPF
  GGAL:  '#0070B8',  // azul Galicia
  PAMP:  '#E31E26',  // rojo Pampa
  BMA:   '#009BDE',  // azul Macro
  TECO2: '#00205B',  // azul Telecom
  EDN:   '#FFB600',  // amarillo Edenor
  BBAR:  '#004481',  // azul BBVA
  ALUA:  '#8B9DC3',  // gris-azul Aluar
  LOMA:  '#D32027',  // rojo Loma Negra
  TXAR:  '#005BAB',  // azul Ternium
};

/**
 * Precios simulados de respaldo para acciones AR — se usan si Rava no responde (dev/CORS)
 */
export const PRECIOS_FALLBACK_AR = {
  YPFD: 22450, GGAL: 1830, PAMP: 8320, BMA: 9500, BBAR: 4200,
  TECO2: 3150, EDN: 2800, ALUA: 1250, LOMA: 2100, TXAR: 5600,
  BYMA: 3400, CEPU: 2950, COME: 380, CRES: 2200, CVH: 1800,
  HARG: 950, METR: 1100, MIRG: 15000, SUPV: 3800, TGNO4: 4500,
  TGSU2: 4200, VALO: 1950, AGRO: 650, BOLT: 1400, CAPX: 3200,
  FERR: 450, GAMI: 280, GCLA: 900, INTR: 320, INVJ: 780,
  MOLA: 1350, MOLI: 2600, PATA: 3100, RIGO: 350,
};
