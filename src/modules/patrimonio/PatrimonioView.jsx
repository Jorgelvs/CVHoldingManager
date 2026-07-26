import React from 'react'
import { Link, useParams } from 'react-router-dom'

export default function PatrimonioView() {
  const { id } = useParams()
  return (
    <div className="page-center">
      <div>
        <h1>Patrimônio #{id}</h1>
        <p style={{color:'var(--text)'}}>Detalhes placeholder — no persistence implemented yet.</p>
        <p><Link to="/patrimonio">Voltar à lista</Link></p>
      </div>
    </div>
  )
}
