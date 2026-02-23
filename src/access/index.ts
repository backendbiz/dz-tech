import type { Access, CollectionConfig } from 'payload'

/**
 * Allow anyone access - use sparingly and only for public data
 */
export const anyone: Access = () => true

/**
 * Only allow authenticated users
 */
export const authenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}

/**
 * Only allow admin users
 */
export const adminOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  return user.role === 'admin'
}

/**
 * Allow admin users or the user themselves (for user collections)
 */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true

  return {
    id: {
      equals: user.id,
    },
  }
}

/**
 * Allow admin users or users with specific roles
 */
export const hasRole = (...roles: string[]): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return roles.includes(user.role)
  }
}

/**
 * Published content is public, drafts are admin-only
 * For collections with a 'status' or '_status' field
 */
export const publishedOrAdmin: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true

  return {
    _status: {
      equals: 'published',
    },
  }
}

// Collection-level access control objects

/**
 * Full admin control - admin can do everything, others nothing
 */
export const adminFullControl: CollectionConfig['access'] = {
  read: adminOnly,
  create: adminOnly,
  update: adminOnly,
  delete: adminOnly,
}

/**
 * Allow public read but restrict write operations to admin
 * Useful for content like pages, services that should be viewable by anyone
 */
export const publicReadAdminWrite: CollectionConfig['access'] = {
  read: anyone,
  create: adminOnly,
  update: adminOnly,
  delete: adminOnly,
}

/**
 * Allow public read of published content, admin controls everything
 */
export const publishedReadAdminWrite: CollectionConfig['access'] = {
  read: publishedOrAdmin,
  create: adminOnly,
  update: adminOnly,
  delete: adminOnly,
}

/**
 * Authenticated users can read, only admin can write
 */
export const authenticatedReadAdminWrite: CollectionConfig['access'] = {
  read: authenticated,
  create: adminOnly,
  update: adminOnly,
  delete: adminOnly,
}
