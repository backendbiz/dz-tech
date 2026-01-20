import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

export const revalidate: CollectionAfterChangeHook = ({ doc, req, operation }) => {
  req.payload.logger.info(`Revalidating path...`)

  revalidatePath('/', 'layout')

  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  req.payload.logger.info(`Revalidating global...`)

  revalidatePath('/', 'layout')

  return doc
}
