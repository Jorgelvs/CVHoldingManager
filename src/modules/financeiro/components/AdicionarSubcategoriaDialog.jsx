import React, { useState } from 'react'

export default function AdicionarSubcategoriaDialog({ open, tipo, categoria, onSave, onCancel }) {
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = () => {
    const valor = nome.trim()
    if (!valor) {
      setError('Informe o nome da subcategoria.')
      return
    }
    setError('')
    onSave(valor)
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel">
        <h3>Adicionar subcategoria</h3>
        <p>
          Natureza: <strong>{tipo}</strong> · Categoria: <strong>{categoria}</strong>
        </p>
        <div className="form-field">
          <label>Nova subcategoria</label>
          <input
            type="text"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Digite o nome da subcategoria"
          />
          {error ? <span className="field-error">{error}</span> : null}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="button button-primary" onClick={handleSubmit}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
