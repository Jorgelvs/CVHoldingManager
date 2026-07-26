import React from 'react'
import { Link } from 'react-router-dom'

export default function EmptyState({ title, description, actionLabel, actionLink }) {
  return (
    <div className="empty-state">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {actionLink ? (
          <Link className="button button-primary" to={actionLink}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
