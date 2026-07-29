import React from 'react'
import { exportarRelatorio } from '../reportExportService.js'

export default function ExportButtons({ title, columns, rows, periodo = '', filename = '', className = '' }) {
  const safeFilename = filename || String(title || 'relatorio').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const disabled = !Array.isArray(rows) || rows.length === 0

  const handleExport = (format) => {
    if (disabled) return
    exportarRelatorio({
      title,
      columns,
      rows,
      format,
      periodo,
      filename: safeFilename,
    })
  }

  return (
    <div className={`report-actions ${className}`.trim()} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="button button-secondary" disabled={disabled} onClick={() => handleExport('excel')}>
        Exportar Excel
      </button>
      <button type="button" className="button button-secondary" disabled={disabled} onClick={() => handleExport('pdf')}>
        Exportar PDF
      </button>
    </div>
  )
}
