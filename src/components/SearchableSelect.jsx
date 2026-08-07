import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Campo de seleção com busca por digitação (combobox).
 * Substitui <select> simples quando a lista pode ter muitos itens e o
 * usuário precisa localizar por nome/código em vez de rolar uma lista longa.
 *
 * options: [{ id, label, sublabel? }]
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Digite para buscar...',
  emptyMessage = 'Nenhum resultado encontrado',
  disabled = false,
  allowClear = true,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedOption = useMemo(() => options.find((item) => item.id === value) || null, [options, value])

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption ? selectedOption.label : '')
    }
  }, [selectedOption, open])

  const filtered = useMemo(() => {
    const termo = normalizar(query)
    if (!termo) return options
    return options.filter((item) => normalizar(`${item.label} ${item.sublabel || ''}`).includes(termo))
  }, [options, query])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  const selecionar = (option) => {
    onChange(option ? option.id : '')
    setQuery(option ? option.label : '')
    setOpen(false)
  }

  const handleFocus = (event) => {
    if (disabled) return
    setOpen(true)
    event.target.select()
  }

  const handleBlur = () => {
    setOpen(false)
    setQuery(selectedOption ? selectedOption.label : '')
  }

  const handleKeyDown = (event) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const opcao = filtered[highlightedIndex]
      if (opcao) selecionar(opcao)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selectedOption ? selectedOption.label : '')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <div className="searchable-select-input-wrap">
        <Search size={14} className="searchable-select-icon-left" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          value={open ? query : (selectedOption ? selectedOption.label : query)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {allowClear && selectedOption && !disabled ? (
          <button
            type="button"
            className="searchable-select-clear"
            aria-label="Limpar seleção"
            onMouseDown={(event) => {
              event.preventDefault()
              selecionar(null)
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="searchable-select-icon-right" />
        )}
      </div>

      {open ? (
        <div className="searchable-select-list" onMouseDown={(event) => event.preventDefault()}>
          {filtered.length === 0 ? (
            <div className="searchable-select-empty">{emptyMessage}</div>
          ) : (
            filtered.map((option, index) => (
              <div
                key={option.id}
                className={`searchable-select-option${index === highlightedIndex ? ' is-highlighted' : ''}${option.id === value ? ' is-selected' : ''}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selecionar(option)}
              >
                <span className="searchable-select-option-label">{option.label}</span>
                {option.sublabel ? <span className="searchable-select-option-sublabel">{option.sublabel}</span> : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
