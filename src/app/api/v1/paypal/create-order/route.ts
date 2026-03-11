import { NextResponse } from 'next/server'
import { getPayPalOrdersController, isPayPalConfigured } from '@/lib/paypal'
import { CheckoutPaymentIntent } from '@paypal/paypal-server-sdk'
import { getPayloadClient } from '@/lib/payload'
import { generateOrderId } from '@/lib/order-generator'

export async function POST(request: Request) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { serviceId, orderId: existingOrderId, amount } = body

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Fetch the service
    const service = await payload.findByID({
      collection: 'services',
      id: serviceId,
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const orderAmount = amount || service.price
    const orderId = existingOrderId || generateOrderId()

    // Create PayPal order
    const ordersController = getPayPalOrdersController()
    const paypalOrder = await ordersController.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: orderAmount.toFixed(2),
            },
            customId: orderId,
            description: service.title,
          },
        ],
      },
    })

    const paypalOrderId = paypalOrder.result.id

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
    }

    // Check if an order already exists with this orderId
    // The orderId passed from the frontend may be either:
    // - A Payload document ID (MongoDB ObjectId) from state.paymentOrderId
    // - A client-generated order ID (ORD-xxx) from the orderId field
    let existingOrder = null

    // First try looking up by document ID (most common from checkout clients)
    if (/^[a-f\d]{24}$/i.test(orderId)) {
      try {
        existingOrder = await payload.findByID({
          collection: 'orders',
          id: orderId,
        })
      } catch {
        // Not found by ID, will try orderId field next
      }
    }

    // Then try by orderId field (ORD-xxx format)
    if (!existingOrder) {
      const existingOrders = await payload.find({
        collection: 'orders',
        where: { orderId: { equals: orderId } },
        limit: 1,
      })
      if (existingOrders.docs.length > 0) {
        existingOrder = existingOrders.docs[0]
      }
    }

    if (existingOrder) {
      // Update existing order with PayPal info
      await payload.update({
        collection: 'orders',
        id: existingOrder.id,
        data: {
          paypalOrderId,
          paymentMethod: 'paypal',
        },
      })
    } else {
      // Create a new pending order in the database
      await payload.create({
        collection: 'orders',
        data: {
          orderId,
          service: serviceId,
          total: orderAmount,
          quantity: 1,
          status: 'pending',
          paymentMethod: 'paypal',
          paypalOrderId,
        },
      })
    }

    return NextResponse.json({
      paypalOrderId,
      orderId,
    })
  } catch (error) {
    console.error('[PayPal] Create order error:', error)
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }
}
