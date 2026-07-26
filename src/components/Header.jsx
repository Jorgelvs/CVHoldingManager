import React from 'react'
import QuickActions from './QuickActions.jsx'

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <h1>CVHolding Manager</h1>
        <div style={{ marginLeft: 'auto' }}>
          <QuickActions />
        </div>
      </div>
    </header>
  )
}
