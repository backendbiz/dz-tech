import { NextResponse } from 'next/server'
import { getAllGatewayInfo, getActiveGatewayName } from '@/lib/payment-gateway'

/**
 * GET /api/payment-gateways
 *
 * Returns the list of all registered payment gateways and their status.
 * Useful for admin dashboards to see which gateways are available.
 */
export async function GET() {
  try {
    const gateways = getAllGatewayInfo()
    const activeDefault = getActiveGatewayName()

    return NextResponse.json({
      defaultGateway: activeDefault,
      gateways: gateways.map((gw) => ({
        name: gw.name,
        displayName: gw.displayName,
        isActive: gw.isActive,
        supportedMethods: gw.supportedMethods,
        isDefault: gw.name === activeDefault,
      })),
    })
  } catch (error) {
    console.error('Error fetching gateway info:', error)
    return NextResponse.json({ error: 'Failed to fetch gateway info' }, { status: 500 })
  }
}
