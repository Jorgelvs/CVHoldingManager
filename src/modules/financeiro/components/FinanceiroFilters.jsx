import React from 'react'

export default function FinanceiroFilters({ filtros, onChange, categorias, subcategorias, patrimonios, unidades }) {
  return (
    <div className="filters-panel">
      <div className="filter-group">
        <label>Período início</label>
        <input type="date" value={filtros.periodoInicio || ''} onChange={(event) => onChange('periodoInicio', event.target.value)} />
      </div>
      <div className="filter-group">
        <label>Período fim</label>
        <input type="date" value={filtros.periodoFim || ''} onChange={(event) => onChange('periodoFim', event.target.value)} />
      </div>
      <div className="filter-group">
        <label>Natureza</label>
        <select value={filtros.tipo || ''} onChange={(event) => onChange('tipo', event.target.value)}>
          <option value="">Todas</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>
      <div className="filter-group">
        <label>Status</label>
        <select value={filtros.status || ''} onChange={(event) => onChange('status', event.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div className="filter-group">
        <label>Categoria</label>
        <select value={filtros.categoria || ''} onChange={(event) => onChange('categoria', event.target.value)}>
          <option value="">Todas</option>
          {categorias.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Subcategoria</label>
        <select value={filtros.subcategoria || ''} onChange={(event) => onChange('subcategoria', event.target.value)}>
          <option value="">Todas</option>
          {subcategorias.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Patrimônio</label>
        <select value={filtros.patrimonioId || ''} onChange={(event) => onChange('patrimonioId', event.target.value)}>
          <option value="">Todos</option>
          {patrimonios.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Unidade</label>
        <select value={filtros.unidadeId || ''} onChange={(event) => onChange('unidadeId', event.target.value)}>
          <option value="">Todas</option>
          {unidades.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Texto livre</label>
        <input type="search" value={filtros.termo || ''} placeholder="Buscar descrição, categoria, observações" onChange={(event) => onChange('termo', event.target.value)} />
      </div>
    </div>
  )
}
