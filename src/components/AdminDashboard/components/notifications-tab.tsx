'use client'

export function NotificationsTab() {
  return (
    <div className="adm:flex adm:flex-col adm:gap-6">
      <div className="adm-panel">
        <div className="adm-panel-header">
          <div>
            <h2 className="adm-panel-title">Notifications</h2>
            <p className="adm-panel-sub">Manage your notifications here.</p>
          </div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p className="adm:text-[var(--adm-muted)] adm:text-sm">
            No new notifications at this time.
          </p>
        </div>
      </div>
    </div>
  )
}
