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
      <div className="universal-review-grid">
        {field('Tipo', parsed.tipoLabel || 'Não identificado', 'natureza')}
        {field('Valor', parsed.valorLabel || 'Não identificado', 'valor')}
        {field('Categoria', parsed.categoria || 'Não identificada', 'categoria')}
        {field('Subcategoria', parsed.subcategoriaLabel || parsed.subcategoria || 'Não identificada', 'subcategoria')}
        {field('Patrimônio', parsed.patrimonioLabel || 'Não identificado', 'patrimonio')}
        {field('Unidade', parsed.unidadeLabel || 'Sem unidade', 'unidade')}
        {field('Conta', parsed.contaLabel || 'Não identificada', 'conta')}
        {field('Data', parsed.dateLabel || 'Não identificada', 'data')}
        {field('Descrição', parsed.descricao || 'Não identificada', 'descricao')}
      </div>
    </div>
  )
}
