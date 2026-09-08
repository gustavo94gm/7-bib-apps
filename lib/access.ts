export function canAccess(role: string | undefined, isVisitorScope: boolean) {
  if (role === 'admin') return true
  return role === 'rp' && isVisitorScope
}
