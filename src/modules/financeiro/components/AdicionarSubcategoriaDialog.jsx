import React, { useEffect, useState } from 'react'

export default function AdicionarSubcategoriaDialog({ open, tipo, categoria, initialName = '', onSave, onCancel }) {
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setNome(initialName || '')
    setError('')
  }, [open, initialName])

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
            // Sem isto, o Safari (e outros navegadores) sugere textos já
            // digitados antes em outros campos do site como se fosse uma
            // lista de opções do app — confuso aqui, já que o campo é para
            // NOME LIVRE de uma subcategoria nova, não uma busca.
            autoComplete="off"
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
