import React from 'react'

function summaryLine(label, value, missing) {
  return (
    <div className={`universal-review-field ${missing ? 'field-error' : ''}`}>
      <strong>{label}</strong>
      <span>{value || '—'}</span>
    </div>
  )
}

export default function EntryReview({ parsed }) {
  if (!parsed) return null
  const missing = parsed.missing || []

  const field = (label, value, key) => summaryLine(label, value, missing.includes(key))

  return (
    <div>
      {parsed.humanMessage ? <div style={{ marginBottom: 8 }}>{parsed.humanMessage}</div> : null}
      <div className="universal-review-grid">
        {field('Operação', parsed.operationLabel, 'operation')}
      {field('Tipo', parsed.tipoLabel, 'tipo')}
      {field('Categoria', parsed.categoria || 'Não identificada', 'categoria')}
      {field('Subcategoria', parsed.subcategoria || 'Não identificada', 'subcategoria')}
      {field('Imóvel', parsed.patrimonioLabel || 'Não identificado', 'patrimonio')}
      {field('Unidade', parsed.unidadeLabel || 'Não identificada', 'unidade')}
      {field('Valor', parsed.valorLabel, 'valor')}
      {field('Data', parsed.dateLabel, 'data')}
      {field('Conta', parsed.contaLabel || 'Não identificada', 'conta')}
      {field('Descrição', parsed.descricao || 'Não identificada', 'descricao')}
      {field('Observações', parsed.observacoes || 'Nenhuma', 'observacoes')}
      </div>
    </div>
  )
}
