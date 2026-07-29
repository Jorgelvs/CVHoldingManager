import React, { useState } from 'react'
import UniversalEntryModal from './UniversalEntryModal.jsx'

export default function UniversalEntryButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="button button-primary"
        style={{ padding: '12px 22px', fontSize: '1rem' }}
        onClick={() => setOpen(true)}
      >
        + Registrar
      </button>
      <UniversalEntryModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
