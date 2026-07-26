import React from 'react'
import { Link } from 'react-router-dom'

export default function PatrimonioList() {
  const sample = []
  return (
    <div className="page-center">
      <div style={{width:'100%'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1>Patrimônio</h1>
          <Link to="/patrimonio/new" className="nav-link" style={{padding:'8px 12px'}}>Novo Patrimônio</Link>
        </div>
        <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:16}}>
          {sample.length === 0 ? (
            <p style={{textAlign:'center',color:'var(--text)'}}>Nenhum patrimônio cadastrado ainda.</p>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Local</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
