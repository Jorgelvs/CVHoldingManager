import React, { useEffect } from 'react'

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ overflowY: 'auto', padding: '20px 16px' }}
    >
      <div
        className="dialog-panel"
        onClick={(event) => event.stopPropagation()}
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: 'min(720px, 100%)',
          boxSizing: 'border-box',
        }}
      >
        {title ? <h3 style={{ flexShrink: 0, margin: 0, padding: '4px 0 12px' }}>{title}</h3> : null}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 12 }}>{children}</div>
      </div>
    </div>
  )
}
