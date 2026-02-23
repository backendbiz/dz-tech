'use client'

interface Action {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  href: string
  variant: 'primary' | 'secondary'
}

const actions: Action[] = [
  {
    id: 'new-order',
    label: 'New Order',
    description: 'Create a manual order entry',
    href: '/admin/collections/orders/create',
    variant: 'primary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    id: 'add-user',
    label: 'Add User',
    description: 'Invite a new team member',
    href: '/admin/collections/users/create',
    variant: 'secondary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'new-page',
    label: 'New Page',
    description: 'Publish a new content page',
    href: '/admin/collections/pages/create',
    variant: 'secondary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    id: 'new-service',
    label: 'New Service',
    description: 'Add a service offering',
    href: '/admin/collections/services/create',
    variant: 'secondary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: 'media',
    label: 'Upload Media',
    description: 'Add images or documents',
    href: '/admin/collections/media/create',
    variant: 'secondary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Site Settings',
    description: 'Configure global settings',
    href: '/admin/globals/site-settings',
    variant: 'secondary',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export function QuickActions() {
  return (
    <div className="adm:flex adm:flex-col adm:gap-5 adm:rounded-xl adm:border adm:border-(--adm-border) adm:p-7 adm:bg-(--adm-surface)">
      <div className="adm:flex adm:items-start adm:justify-between">
        <div>
          <h2 className="adm:text-base adm:font-semibold adm:tracking-tight adm:text-(--adm-text) adm:m-0">
            Quick Actions
          </h2>
          <p className="adm:text-sm adm:text-(--adm-muted) adm:mt-1 adm:mb-0">
            Common tasks at a glance
          </p>
        </div>
      </div>
      <div className="adm:flex adm:flex-col adm:gap-2">
        {actions.map((action) => {
          const isPrimary = action.variant === 'primary'

          return (
            <a
              key={action.id}
              href={action.href}
              className={`adm:flex adm:items-center adm:gap-3.5 adm:px-4.5 adm:py-3.5 adm:rounded-lg adm:border adm:no-underline adm:transition-all adm:duration-150 adm:cursor-pointer ${
                isPrimary
                  ? 'adm:text-(--adm-accent) adm:bg-(--adm-accent-dim) adm:border-(--adm-accent-border) hover:adm:bg-(--adm-accent-hover) hover:adm:border-(--adm-accent-border-hover)'
                  : 'adm:text-(--adm-text) adm:bg-transparent adm:border-(--adm-border) hover:adm:bg-(--adm-surface-hover) hover:adm:border-(--adm-border-strong)'
              } adm:group`}
            >
              <span
                className={`adm:flex adm:items-center adm:justify-center adm:shrink-0 adm:w-9 adm:h-9 adm:rounded-lg ${
                  isPrimary ? 'adm:bg-(--adm-accent-icon-bg)' : 'adm:bg-(--adm-overlay-md)'
                }`}
              >
                {action.icon}
              </span>
              <span className="adm:flex adm:flex-col adm:gap-0.5 adm:flex-1">
                <span className="adm:text-sm adm:font-semibold adm:tracking-tight adm:text-inherit">
                  {action.label}
                </span>
                <span className="adm:text-[0.775rem] adm:text-(--adm-muted)">
                  {action.description}
                </span>
              </span>
              <svg
                className="adm:shrink-0 adm:text-(--adm-muted) adm:transition-all adm:duration-150 group-hover:adm:translate-x-[2px] group-hover:adm:text-(--adm-text)"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          )
        })}
      </div>
    </div>
  )
}
