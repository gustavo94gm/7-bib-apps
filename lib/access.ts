export function canAccess(role: string | undefined, isVisitorScope: boolean) {
  if (role === 'admin' || role === 'infor') return true
  return role === 'rp' && isVisitorScope
}

export function canManageDatabase(role: string | undefined) {
  return role === 'admin'
}
