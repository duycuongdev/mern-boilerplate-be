import { pick } from 'lodash'

// Convert string to URL-friendly slug
export const slugify = (val) => {
  if (!val) return ''
  return String(val)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // remove leading/trailing hyphens (vd: 'dấu @#' -> 'dau-')
}

// Sanitize user object before returning to client (strip out sensitive fields like password hash)
export const pickUser = (user) => {
  if (!user) return {}
  return pick(user, [
    '_id',
    'email',
    'username',
    'displayName',
    'avatar',
    'role',
    'isActive',
    'createdAt',
    'updatedAt'
  ])
}

