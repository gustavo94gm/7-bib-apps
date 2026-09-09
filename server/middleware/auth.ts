import { auth } from '~~/lib/auth'
import { canAccess, canManageDatabase } from '~~/lib/access'

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/tickets' },
  { method: 'GET', path: '/api/categories' },
  { method: 'GET', path: '/api/graduations' },
  { method: 'GET', path: '/api/sections' },
]

const DATABASE_RESOURCES = ['categories', 'graduations', 'sections']

function isVisitorPath(path: string) {
  return path.startsWith('/api/visitors')
}

function isDatabaseWritePath(path: string, method: string) {
  if (method !== 'POST' && method !== 'DELETE') return false
  return DATABASE_RESOURCES.some((r) => path === `/api/${r}` || path.startsWith(`/api/${r}/`))
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

  if (!canAccess(role, isVisitorPath(path))) {
    throw createError({ statusCode: 403, message: 'Sem permissão' })
  }

  if (isDatabaseWritePath(path, event.method) && !canManageDatabase(role)) {
    throw createError({ statusCode: 403, message: 'Sem permissão' })
  }
})
