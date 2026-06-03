const DISCLAIMER = 'KAVIAR — Relatório informativo e estimado. Uso interno do gestor territorial. Dados sujeitos a apuração.';

export function downloadCsv(headers, rows, filename) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    `# ${DISCLAIMER}`,
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
