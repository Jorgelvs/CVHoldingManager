import React from 'react'
import { Search } from 'lucide-react'

export default function FinanceiroFilters({ filtros, onChange, onApply, onClear, categorias, subcategorias, patrimonios, unidades }) {
  return (
    <div className="filters-panel" style={{ gap: 10, padding: '10px 12px', marginBottom: 10 }}>
      <div className="filter-group" style={{ minWidth: 0 }}>
        <label>Período início</label>
        <input type="date" value={filtros.periodoInicio || ''} onChange={(event) => onChange('periodoInicio', event.target.value)} />
      </div>
      <div className="filter-group" style={{ minWidth: 0 }}>
        <label>Período fim</label>
        <input type="date" value={filtros.periodoFim || ''} onChange={(event) => onChange('periodoFim', event.target.value)} />
      </div>
      <div className="filter-group" style={{ minWidth: 0 }}>
        <label>Natureza</label>
        <select value={filtros.tipo || ''} onChange={(event) => onChange('tipo', event.target.value)}>
          <option value="">Todas</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>
      <div className="filter-group" style={{ minWidth: 0 }}>
        <label>Status</label>
        <select value={filtros.status || ''} onChange={(event) => onChange('status', event.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div className="filter-group" style={{ minWidth: 0 }}>
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
      <div className="filter-group" style={{ minWidth: 0 }}>
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
      <div className="filter-group" style={{ minWidth: 0 }}>
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
      <div className="filter-group" style={{ minWidth: 0 }}>
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
      <div className="filter-group" style={{ minWidth: 0, flex: '1 1 240px' }}>
        <label>Pesquisar</label>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b6375' }} />
          <input
            type="search"
            value={filtros.termo || ''}
            placeholder="Pesquisar descrição, categoria ou subcategoria..."
            onChange={(event) => onChange('termo', event.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" className="button button-secondary" onClick={onClear}>
          Limpar filtros
        </button>
        <button type="button" className="button button-primary" onClick={onApply}>
          Aplicar filtros
        </button>
      </div>
    </div>
  )
}
