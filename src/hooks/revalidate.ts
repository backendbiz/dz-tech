import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

export const revalidate: CollectionAfterChangeHook = ({ doc, req, operation }) => {
  req.payload.logger.info(`Revalidating path...`)

  try {
    revalidatePath('/', 'layout')
  } catch (error) {
    req.payload.logger.warn(`Revalidate failed (likely running in script): ${error}`)
  }

  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  req.payload.logger.info(`Revalidating global...`)

  try {
    revalidatePath('/', 'layout')
  } catch (error) {
    req.payload.logger.warn(`Revalidate failed (likely running in script): ${error}`)
  }

  return doc
}
