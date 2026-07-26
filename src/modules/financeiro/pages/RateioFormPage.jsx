import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RateioForm from '../components/RateioForm.jsx'
import { criarRateio, atualizarRateio, buscarRateioPorId, calcularRateioPreview, validarRateioDados } from '../services/rateioService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'

export default function RateioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rateio, setRateio] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    if (id) {
      const existing = buscarRateioPorId(id)
      if (!existing) {
        navigate('/financeiro/rateios', { replace: true })
        return
      }
      setRateio(existing)
    }
  }, [id, navigate])

  const patrimonios = useMemo(() => listarPatrimonios(), [])

  const handleSave = (dados) => {
    setAlert(null)
    const errors = validarRateioDados(dados)
    if (Object.keys(errors).length > 0) {
      setAlert({ type: 'error', message: Object.values(errors)[0] })
      return
    }

    if (id) {
      atualizarRateio(id, dados)
      navigate('/financeiro/rateios')
      return
    }

    criarRateio(dados)
    navigate('/financeiro/rateios')
  }

  const initialData = rateio || {
    patrimonioId: '',
    competencia: '',
    categoria: '',
    subcategoria: '',
    descricao: '',
    valorTotal: '',
    metodoRateio: 'igualitario',
    criterioElegibilidade: 'ocupadas_mes_inteiro',
    observacoes: '',
  }

  if (id && !rateio) {
    return <div className="page-center">Carregando...</div>
  }

  return (
    <RateioForm
      initialData={initialData}
      onSave={handleSave}
      alert={alert}
      patrimonios={patrimonios}
    />
  )
}
