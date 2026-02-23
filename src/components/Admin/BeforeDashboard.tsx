'use client'

import React from 'react'

export const BeforeDashboard: React.FC = () => {
  return (
    <div
      style={{
        padding: '24px',
        marginBottom: '24px',
        background: 'var(--theme-bg-primary)',
        border: '1px solid var(--theme-border-color)',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600 }}>
        Welcome to DZ Tech CMS
      </h2>
      <p style={{ margin: 0, color: 'var(--theme-text-secondary)', fontSize: '14px' }}>
        Manage your content, services, orders, and projects from this dashboard. Use the
        sidebar to navigate between collections.
      </p>
    </div>
  )
}
