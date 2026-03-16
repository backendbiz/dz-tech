import { getDb } from '@/lib/mongodb'
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
    const db = await getDb()

    const providers: Provider[] = await db
      .collection('providers')
      .find({})
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        name: 1,
        slug: 1,
        status: 1,
        lastUsedAt: 1,
        createdAt: 1,
      })
      .map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        slug: doc.slug,
        status: doc.status,
        lastUsedAt: doc.lastUsedAt ?? null,
        createdAt: doc.createdAt,
      }))
      .toArray()

    return NextResponse.json(providers)
  } catch (error) {
    console.error('[Admin Providers API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
