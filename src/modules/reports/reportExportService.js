let xlsxModulePromise
let jsPdfModulePromise

async function carregarXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx')
  }
  return xlsxModulePromise
}

async function carregarJsPdf() {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import('jspdf')
  }
  return jsPdfModulePromise
}

function formatarData(valor) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return String(valor)
  return data.toLocaleDateString('pt-BR')
}

function formatarValor(valor) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function normalizarValor(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const numero = Number(value.replace(/[R$\.\s]/g, '').replace(',', '.'))
    return Number.isFinite(numero) ? numero : value
  }
  return value
}

function isCurrencyLike(value) {
  return typeof value === 'number' || (typeof value === 'string' && /R\$|,|\./.test(value))
}

function sanitizeCell(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim()
  }
  return String(value)
}

function buildHeader(title, { periodo, total }) {
  const agora = new Date()
  return [
    ['CVHolding Manager'],
    [title],
    [`Data/Hora: ${agora.toLocaleString('pt-BR')}`],
    periodo ? [`Período: ${periodo}`] : [],
    [`Registros: ${total}`],
    [],
  ].filter((row) => row.length > 0)
}

function getPdfCellValue(column, row) {
  const value = row[column.key]
  if (column.type === 'currency') return formatarValor(value)
  if (column.type === 'date') return formatarData(value)
  return sanitizeCell(value)
}

function computeColumnWidths(doc, columns, rows, availableWidth) {
  const minWidth = 50
  const maxWidth = 200
  const widths = columns.map((column) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const headerWidth = doc.getTextWidth(String(column.label || '')) + 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const maxCellWidth = rows.reduce((max, row) => {
      const cell = String(getPdfCellValue(column, row))
      const width = doc.getTextWidth(cell) + 16
      return Math.max(max, width)
    }, 0)
    return Math.max(minWidth, Math.min(maxWidth, Math.max(headerWidth, maxCellWidth)))
  })
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  if (totalWidth <= availableWidth) {
    return widths
  }
  const ratio = availableWidth / totalWidth
  return widths.map((width) => Math.max(minWidth, width * ratio))
}

function buildFooter(doc, pageIndex, totalPages, total) {
  const margin = 28
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const data = new Date().toLocaleDateString('pt-BR')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80)
  const footerY = pageHeight - 18
  doc.text(`Página ${pageIndex} de ${totalPages}`, margin, footerY)
  doc.text(`Gerado em ${data}`, pageWidth / 2, footerY, { align: 'center' })
  doc.text(`Total de registros: ${total}`, pageWidth - margin, footerY, { align: 'right' })
}

function renderPdfTable(doc, columns, rows, margin, startY, total) {
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const availableWidth = pageWidth - margin * 2
  const tableWidth = availableWidth
  const columnWidths = computeColumnWidths(doc, columns, rows, tableWidth)
  const cellPadding = 6
  const bodyFontSize = 10
  const headerFontSize = 11
  const lineHeight = bodyFontSize * 1.3

  const headerLines = columns.map((column, index) => {
    const maxWidth = columnWidths[index] - cellPadding * 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(headerFontSize)
    return doc.splitTextToSize(String(column.label || ''), maxWidth)
  })

  const headerHeight = Math.max(...headerLines.map((lines) => lines.length)) * lineHeight + cellPadding * 2
  let cursorY = startY

  const printTableHeader = () => {
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, cursorY, tableWidth, headerHeight, 'F')
    doc.setDrawColor(200)
    let x = margin
    columns.forEach((column, index) => {
      doc.rect(x, cursorY, columnWidths[index], headerHeight, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(headerFontSize)
      doc.setTextColor(20)
      doc.text(headerLines[index], x + cellPadding, cursorY + cellPadding + 1)
      x += columnWidths[index]
    })
    cursorY += headerHeight
  }

  const maxBodyY = pageHeight - margin - 30
  printTableHeader()

  rows.forEach((row) => {
    const rowLines = columns.map((column, index) => {
      const text = String(getPdfCellValue(column, row))
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(bodyFontSize)
      return doc.splitTextToSize(text, columnWidths[index] - cellPadding * 2)
    })
    const rowHeight = Math.max(...rowLines.map((lines) => lines.length)) * lineHeight + cellPadding * 2
    if (cursorY + rowHeight > maxBodyY) {
      doc.addPage()
      cursorY = margin
      printTableHeader()
    }
    let x = margin
    columns.forEach((column, index) => {
      doc.setDrawColor(220)
      doc.rect(x, cursorY, columnWidths[index], rowHeight, 'S')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(bodyFontSize)
      doc.setTextColor(40)
      doc.text(rowLines[index], x + cellPadding, cursorY + cellPadding + 1)
      x += columnWidths[index]
    })
    cursorY += rowHeight
  })
}

function createWorksheet(utils, columns, rows, title, periodo) {
  const total = rows.length
  const headerRows = buildHeader(title, { periodo, total })
  const data = []
  headerRows.forEach((row) => data.push(row))
  data.push(columns.map((column) => column.label))
  rows.forEach((row) => {
    data.push(columns.map((column) => {
      const value = row[column.key]
      if (column.type === 'currency') return formatarValor(value)
      if (column.type === 'date') return formatarData(value)
      return sanitizeCell(value)
    }))
  })
  const worksheet = utils.aoa_to_sheet(data)
  worksheet['!cols'] = columns.map((column) => ({ width: Math.max(16, Math.min(40, String(column.label).length + 4)) }))
  return worksheet
}

export async function exportarRelatorio({ title, columns, rows, format = 'excel', periodo = '', filename = 'relatorio' }) {
  const safeTitle = title || 'Relatório'
  const safeRows = Array.isArray(rows) ? rows : []
  const total = safeRows.length
  if (format === 'pdf') {
    const { jsPDF } = await carregarJsPdf()
    const orientation = columns.length > 6 ? 'landscape' : 'portrait'
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 28
    const agora = new Date()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('CVHolding Manager', margin, margin)
    doc.setFontSize(13)
    doc.text(safeTitle, margin, margin + 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Data/Hora: ${agora.toLocaleString('pt-BR')}`, margin, margin + 44)
    if (periodo) doc.text(`Período: ${periodo}`, margin, margin + 60)
    doc.text(`Registros: ${total}`, margin, margin + (periodo ? 76 : 60))
    const startY = margin + 96
    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(margin, startY - 8, pageWidth - margin, startY - 8)
    renderPdfTable(doc, columns, safeRows, margin, startY, total)
    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page)
      buildFooter(doc, page, totalPages, total)
    }
    doc.save(`${filename || safeTitle}.pdf`)
    return null
  }

  const { utils, writeFile } = await carregarXlsx()
  const workbook = utils.book_new()
  const worksheet = createWorksheet(utils, columns, safeRows, safeTitle, periodo)
  utils.book_append_sheet(workbook, worksheet, 'Relatorio')
  writeFile(workbook, `${filename || safeTitle}.xlsx`)
  return null
}
