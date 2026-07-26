import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'

export default function QuickActions() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div>
      <button type="button" className="button button-secondary" onClick={() => setOpen(true)}>
        Ações rápidas
      </button>

      <Modal open={open} title="Ações rápidas" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/baixas/novo?acao=recebimento') }}>
            Registrar recebimento
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/baixas/novo?acao=pagamento') }}>
            Registrar pagamento
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/transferencias/novo') }}>
            Transferir entre contas
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/aportes/novo') }}>
            Registrar aporte
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/caucoes/novo') }}>
            Receber caução
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/caucoes?acao=aplicar') }}>
            Aplicar caução
          </button>
          <button type="button" className="button button-primary" onClick={() => { setOpen(false); navigate('/financeiro/novo') }}>
            Novo lançamento
          </button>
        </div>
      </Modal>
    </div>
  )
}
