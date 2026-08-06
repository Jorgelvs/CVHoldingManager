import React from 'react'

export default function Tabs({ items, activeId, onChange }) {
  return (
    <div className="tabs-wrapper">
      <div className="tabs-list" role="tablist">
        {items.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-item ${tab.id === activeId ? 'active' : ''}`}
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
