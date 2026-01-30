import type { CollectionBeforeChangeHook } from 'payload'
import { getStripe } from '@/lib/stripe'

export const manageStripePaymentLink: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
}) => {
  // Only run if we have a title and price
  if (!data.title || !data.price) {
    return data
  }

  // Get the default Stripe instance (always used now)
  const stripe = getStripe()

  try {
    // 1. Check if we need to CREATE a new Payment Link (and Product)
    // Runs on create OR on update if the link is missing
    if (operation === 'create' || !originalDoc?.stripePaymentLinkId) {
      console.log(`Creating Stripe Product/Link for service: ${data.title}`)

      // Create Product
      const product = await stripe.products.create({
        name: data.title,
        metadata: {
          serviceId: data.id || 'new',
        },
      })

      // Create Price
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(data.price * 100),
        product: product.id,
      })

      // Create Payment Link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          serviceId: data.id || '',
        },
      })

      // Save to document
      data.stripeProductId = product.id
      data.stripePriceId = price.id
      data.stripePaymentLinkId = paymentLink.id
      data.stripePaymentLinkUrl = paymentLink.url

      return data
    }

    // 2. Check if we need to UPDATE the Price (only if price changed)
    if (operation === 'update' && originalDoc?.stripePaymentLinkId) {
      // Check if price changed
      const priceChanged = data.price !== originalDoc.price

      if (priceChanged) {
        console.log(`Updating Stripe Price for service: ${data.title}`)

        // Create NEW Price for the EXISTING Product
        // We reuse the product ID stored on the document
        const productId = originalDoc.stripeProductId
        if (!productId) {
          return data
        }

        const newPrice = await stripe.prices.create({
          currency: 'usd',
          unit_amount: Math.round(data.price * 100),
          product: productId,
        })

        // NOTE: Stripe Payment Links' line items are immutable.
        // We must deactivate the old link and create a new one.
        // The Payment Link URL *WILL* change.

        // Deactivate old link
        try {
          await stripe.paymentLinks.update(originalDoc.stripePaymentLinkId, {
            active: false,
          })
        } catch (err) {
          console.warn('Failed to deactivate old payment link:', err)
        }

        // Create NEW Payment Link
        const newPaymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              price: newPrice.id,
              quantity: 1,
            },
          ],
          metadata: {
            serviceId: originalDoc.id || data.id,
          },
        })

        // Update local data reference
        data.stripePriceId = newPrice.id
        data.stripePaymentLinkId = newPaymentLink.id
        data.stripePaymentLinkUrl = newPaymentLink.url
      }
    }
  } catch (error) {
    console.error('Error managing Stripe Payment Link:', error)
  }

  return data
}
