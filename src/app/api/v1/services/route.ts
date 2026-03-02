import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const payload = await getPayloadClient()

    const { docs } = await payload.find({
      collection: 'services',
      where: {
        status: { equals: 'published' },
      },
      sort: 'order',
    })

    // Return full service data with image sizes
    const services = docs.map((service) => ({
      id: service.id,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      title: service.title,
      slug: service.slug,
      description: service.description,
      category: service.category,
      icon: service.icon,
      price: service.price,
      originalPrice: service.originalPrice,
      priceUnit: service.priceUnit,
      features: service.features,
      order: service.order,
      status: service.status,
      featured: service.featured,
      featuredImage: service.featuredImage,
    }))

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}
