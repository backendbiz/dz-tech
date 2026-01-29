import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const payload = await getPayloadClient()

    // Try to find by ID first
    let service = null
    try {
      service = await payload.findByID({
        collection: 'services',
        id,
      })
    } catch {
      // If not found by ID, try by slug
      const { docs } = await payload.find({
        collection: 'services',
        where: {
          slug: { equals: id },
        },
        limit: 1,
      })
      service = docs[0] || null
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Return service data
    return NextResponse.json({
      id: service.id,
      title: service.title,
      description: service.description,
      price: service.price,
      priceUnit: service.priceUnit,
      icon: service.icon,
      slug: service.slug,
      features: service.features,
    })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}
