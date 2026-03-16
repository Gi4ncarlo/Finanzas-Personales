// Genera y descarga un archivo CSV a partir de un array de transacciones
export function exportToCSV(transactions, filters = {}, filename = null) {
  if (!transactions || transactions.length === 0) return;

  // Dynamic filename based on filters
  if (!filename) {
    const parts = ['auri_transacciones'];
    if (filters.desde && filters.hasta) {
      parts.push(`${filters.desde}_a_${filters.hasta}`);
    } else if (filters.desde) {
      const d = new Date(filters.desde);
      parts.push(d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/ /g, ''));
    } else {
      parts.push('completo');
    }
    filename = parts.join('_') + '.csv';
  }

  const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Moneda', 'Monto', 'Equivalente ARS'];
  
  const rows = transactions.map(t => {
    const montoNum = Number(t.monto);
    // Calculate ARS equivalent: if USD use stored tipo_cambio, else same as monto
    let eqARS = montoNum;
    if (t.moneda === 'USD' && t.tipo_cambio) {
      eqARS = montoNum * Number(t.tipo_cambio);
    }

    return [
      new Date(t.fecha).toLocaleDateString('es-AR'),
      t.tipo,
      `"${(t.descripcion || '').replace(/"/g, '""')}"`,
      t.category_name || '',
      t.account_name || '',
      t.moneda,
      montoNum, // Raw number, no formatting
      Math.round(eqARS * 100) / 100, // Raw number
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
