import React from 'react'

export default function FormSection({ title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="section-description">{description}</p> : null}
        </div>
      </div>
      <div className="form-section-content">{children}</div>
    </section>
  )
}
