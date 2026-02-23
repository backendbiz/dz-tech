import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FC } from 'react'
import { CircleUser, ChevronRight } from 'lucide-react'

const baseClass = 'avatar'

export const Avatar: FC = async () => {
  const payload = await getPayload({ config })
  const headersList = await headers()

  const { user } = await payload.auth({ headers: headersList })
  const username = user?.email?.split('@').shift() || 'User'

  return (
    <div
      className={baseClass}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 16px 6px 6px',
        backgroundColor: 'var(--theme-elevation-100)',
        borderRadius: '9999px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          backgroundColor: 'var(--theme-elevation-200)',
          borderRadius: '50%',
        }}
      >
        <CircleUser size={18} />
      </div>
      <span
        className={`${baseClass}__greeting`}
        style={{ color: 'var(--theme-text-secondary)', fontSize: '14px' }}
      >
        Hi,
      </span>
      <span
        className={`${baseClass}__username`}
        style={{ color: 'var(--theme-text)', fontSize: '14px', fontWeight: 500 }}
      >
        {username}
      </span>
      <ChevronRight size={16} style={{ color: 'var(--theme-text-secondary)', marginLeft: '4px' }} />
    </div>
  )
}
