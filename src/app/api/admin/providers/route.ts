import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

interface Provider {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  lastUsedAt?: string | null
  createdAt: string
}

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'providers',
      sort: '-createdAt',
      limit: 50,
      overrideAccess: true,
    })

    const providers: Provider[] = result.docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      status: doc.status,
      lastUsedAt: doc.lastUsedAt,
      createdAt: doc.createdAt,
    }))

    return NextResponse.json(providers)
  } catch (error) {
    console.error('[Admin Providers API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
