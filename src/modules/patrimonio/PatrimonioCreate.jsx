import React from 'react'
import { Link } from 'react-router-dom'

export default function PatrimonioCreate() {
  return (
    <div className="page-center">
      <div style={{width:'100%'}}>
        <h1>Novo Patrimônio</h1>
        <p style={{color:'var(--text)'}}>Form placeholder — no persistence implemented yet.</p>
        <p><Link to="/patrimonio">Voltar à lista</Link></p>
      </div>
    </div>
  )
}
