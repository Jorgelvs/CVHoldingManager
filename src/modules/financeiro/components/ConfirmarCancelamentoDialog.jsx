import React from 'react'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'

export default function ConfirmarCancelamentoDialog({ open, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      open={open}
      title="Confirmar cancelamento"
      message="Tem certeza de que deseja cancelar este lançamento financeiro?"
      confirmLabel="Cancelar"
      cancelLabel="Voltar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
