import React, { useEffect, useMemo, useState } from 'react'
import { calcularRateioPreview } from '../services/rateioService.js'

export default function RateioForm({ initialData, onSave, alert, patrimonios }) {
  const [data, setData] = useState(initialData)
  const [preview, setPreview] = useState(null)
  const [erroPreview, setErroPreview] = useState(null)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handleFieldChange = (field, value) => {
    setData((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    const resultado = calcularRateioPreview({
      patrimonioId: data.patrimonioId,
      competencia: data.competencia,
      valorTotal: data.valorTotal,
      categoria: data.categoria,
      descricao: data.descricao,
      metodoRateio: data.metodoRateio,
      criterioElegibilidade: data.criterioElegibilidade,
    })

    if (resultado.errors && Object.keys(resultado.errors).length > 0) {
      setPreview(null)
      setErroPreview(Object.values(resultado.errors)[0])
      return
    }

    setPreview(resultado)
    setErroPreview(null)
  }, [data.patrimonioId, data.competencia, data.valorTotal, data.categoria, data.descricao, data.metodoRateio, data.criterioElegibilidade])

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      ...data,
      valorTotal: Number(data.valorTotal),
      subcategoria: data.subcategoria || null,
    })
  }

  return (
    <form className="page-content" onSubmit={handleSubmit}>
      <div className="page-header">
        <div>
          <p className="page-subtitle">Cadastre ou edite um rateio de despesas por competência.</p>
          <h1>{data.id ? 'Editar rateio' : 'Novo rateio'}</h1>
        </div>
      </div>
      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}
      <div className="form-section">
        <div className="form-grid">
          <div className="form-field">
            <label>Patrimônio</label>
            <select value={data.patrimonioId || ''} onChange={(event) => handleFieldChange('patrimonioId', event.target.value)}>
              <option value="">Selecione um patrimônio</option>
              {patrimonios.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Competência</label>
            <input type="month" value={data.competencia || ''} onChange={(event) => handleFieldChange('competencia', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Categoria</label>
            <input type="text" value={data.categoria || ''} onChange={(event) => handleFieldChange('categoria', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Subcategoria</label>
            <input type="text" value={data.subcategoria || ''} onChange={(event) => handleFieldChange('subcategoria', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Descrição</label>
            <input type="text" value={data.descricao || ''} onChange={(event) => handleFieldChange('descricao', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Valor total</label>
            <input type="number" min="0" step="0.01" value={data.valorTotal || ''} onChange={(event) => handleFieldChange('valorTotal', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Método de rateio</label>
            <select value={data.metodoRateio || 'igualitario'} onChange={(event) => handleFieldChange('metodoRateio', event.target.value)}>
              <option value="igualitario">Igualitário</option>
            </select>
          </div>
          <div className="form-field">
            <label>Critério de elegibilidade</label>
            <select value={data.criterioElegibilidade || 'ocupadas_mes_inteiro'} onChange={(event) => handleFieldChange('criterioElegibilidade', event.target.value)}>
              <option value="ocupadas_mes_inteiro">Ocupadas o mês inteiro</option>
            </select>
          </div>
        </div>

        <div className="summary-card" style={{ marginTop: 20 }}>
          <h2>Preview do rateio</h2>
          {erroPreview ? (
            <p className="text-error">{erroPreview}</p>
          ) : preview ? (
            <div className="preview-grid">
              <div>
                <strong>{preview.quantidadeUnidades}</strong>
                <p>Unidades elegíveis</p>
              </div>
              <div>
                <strong>{preview.valorBasePorUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                <p>Valor base por unidade</p>
              </div>
              <div>
                <strong>{preview.diferencaArredondamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                <p>Diferença de arredondamento</p>
              </div>
            </div>
          ) : (
            <p>Preencha patrimônio, competência e valor total para ver o preview.</p>
          )}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="button button-primary">Salvar rateio</button>
      </div>
    </form>
  )
}
