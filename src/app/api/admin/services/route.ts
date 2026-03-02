import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'services',
      where: {
        status: {
          equals: 'published',
        },
      },
      limit: 100,
      overrideAccess: true,
    })

    const services = result.docs.map((service) => ({
      slug: service.slug,
      name: service.title,
    }))

    return NextResponse.json(services)
  } catch (error) {
    console.error('[Admin Services API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}
