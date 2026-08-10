import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

let activeModalLocks = 0
let lockedScrollY = 0
let previousBodyStyles = null

function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (activeModalLocks > 0) {
    activeModalLocks += 1
    return
  }

  const { body } = document
  lockedScrollY = window.scrollY || window.pageYOffset || 0
  previousBodyStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  }

  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${lockedScrollY}px`
  body.style.width = '100%'
  activeModalLocks = 1
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (activeModalLocks === 0) return

  activeModalLocks -= 1
  if (activeModalLocks > 0) return

  const { body } = document
  if (previousBodyStyles) {
    body.style.overflow = previousBodyStyles.overflow
    body.style.position = previousBodyStyles.position
    body.style.top = previousBodyStyles.top
    body.style.width = previousBodyStyles.width
  } else {
    body.style.overflow = ''
    body.style.position = ''
    body.style.top = ''
    body.style.width = ''
  }

  window.scrollTo(0, lockedScrollY)
  previousBodyStyles = null
}

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
    lockBodyScroll()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
    }
  }, [open, onClose])

  if (!open) return null

  // Renderiza via portal direto em document.body. Motivo: este componente é
  // usado dentro de varios lugares da arvore (ex.: Sidebar.jsx, pro modal de
  // confirmacao de logout), e ".dialog-backdrop" e "position: fixed" -- mas
  // "position: fixed" NAO escapa do recorte de "overflow" de um ancestral
  // (mesmo que esse ancestral tambem seja "position: fixed"). Quando
  // ".app-sidebar" ganhou "overflow-y: auto" (fix para o submenu Financeiro
  // cortado), qualquer <Modal> renderizado dentro da sidebar passou a ficar
  // recortado na faixa estreita da barra lateral -- so a sombra escura
  // aparecia, sem o conteudo/botoes visiveis ou clicaveis. Foi a causa real
  // do botao "Sair do sistema" parecer travado. Um portal para body remove
  // o modal da arvore DOM da sidebar, entao nenhum overflow de ancestral
  // pode mais recorta-lo.
  return createPortal(
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="dialog-panel"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 className="dialog-title">{title}</h3> : null}
        <div className="dialog-content-scroll">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
