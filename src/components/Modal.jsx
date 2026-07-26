import React from 'react'

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog-panel">
        {title ? <h3>{title}</h3> : null}
        <div style={{ marginTop: 12 }}>{children}</div>
        <div className="dialog-actions" style={{ marginTop: 16 }}>
          <button type="button" className="button button-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
