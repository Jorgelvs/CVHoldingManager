import React, { useEffect, useState } from 'react'

function formatarExibicao(valorNumerico) {
  if (valorNumerico === '' || valorNumerico === null || valorNumerico === undefined) return ''
  const numero = Number(valorNumerico)
  if (Number.isNaN(numero)) return ''
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Campo de valor monetário: exibe "1.234,56" formatado (com separador de
 * milhar e vírgula decimal) mas guarda/emite sempre um número puro
 * (ex.: 1234.56) via onChange, para não alterar o formato de
 * armazenamento usado pelo resto do sistema.
 */
export default function CurrencyInput({ value, onChange, placeholder = '0,00', disabled = false, id, prefix = 'R$' }) {
  const [texto, setTexto] = useState(() => formatarExibicao(value))
  const [focado, setFocado] = useState(false)

  useEffect(() => {
    if (!focado) {
      setTexto(formatarExibicao(value))
    }
  }, [value, focado])

  const handleChange = (event) => {
    const digitado = event.target.value
    // Mantém apenas dígitos e vírgula/ponto enquanto digita, aceitando os
    // dois separadores decimais comuns.
    const limpo = digitado.replace(/[^\d,.-]/g, '')
    setTexto(limpo)

    const normalizado = limpo.replace(/\./g, '').replace(',', '.')
    const numero = normalizado === '' || normalizado === '-' ? '' : Number(normalizado)
    onChange(Number.isNaN(numero) ? '' : numero)
  }

  const handleFocus = () => {
    setFocado(true)
    if (value !== '' && value !== null && value !== undefined) {
      const numero = Number(value)
      setTexto(Number.isNaN(numero) ? '' : String(numero).replace('.', ','))
    }
  }

  const handleBlur = () => {
    setFocado(false)
    setTexto(formatarExibicao(value))
  }

  return (
    <div className="currency-input-wrap">
      <span className="currency-input-prefix">{prefix}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={texto}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  )
}
