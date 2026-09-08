import { auth } from '~~/lib/auth'
import { canAccess } from '~~/lib/access'

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/tickets' },
  { method: 'GET', path: '/api/categories' },
  { method: 'GET', path: '/api/graduations' },
  { method: 'GET', path: '/api/sections' },
]

function isVisitorPath(path: string) {
  return path.startsWith('/api/visitors')
}

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]

  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return

  if (PUBLIC_ROUTES.some((r) => r.method === event.method && r.path === path)) return

  const session = await auth.api.getSession({ headers: event.headers })
  const role = session?.user?.role

  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Não autenticado' })
  }

  if (canAccess(role, isVisitorPath(path))) return

  throw createError({ statusCode: 403, message: 'Sem permissão' })
})
