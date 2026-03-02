'use client'

import Link from 'next/link'
import React from 'react'

export const AfterDashboard: React.FC = () => {
  return (
    <div
      style={{
        padding: '24px',
        marginTop: '24px',
        background: 'var(--theme-bg-primary)',
        border: '1px solid var(--theme-border-color)',
        borderRadius: '8px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Quick Links</h3>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          href="/admin/collections/pages"
          style={{
            padding: '8px 16px',
            background: 'var(--theme-success-500)',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Manage Pages
        </Link>
        <Link
          href="/admin/collections/services"
          style={{
            padding: '8px 16px',
            background: 'var(--theme-success-500)',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Manage Services
        </Link>
        <Link
          href="/admin/collections/orders"
          style={{
            padding: '8px 16px',
            background: 'var(--theme-success-500)',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          View Orders
        </Link>
      </div>
    </div>
  )
}
