export function getMethodColor(method: string | undefined) {
  if (!method) return 'neutral'
  const m = method.toUpperCase()
  if (m === 'GET') return 'info'
  if (m === 'POST') return 'success'
  if (m === 'PUT' || m === 'PATCH') return 'warning'
  if (m === 'DELETE') return 'error'
  return 'neutral'
}

export function getStatusColor(status: number | undefined) {
  if (status === undefined) return 'text-muted-foreground'
  if (status >= 200 && status < 300) return 'text-success'
  if (status >= 400) return 'text-error'
  if (status >= 300) return 'text-warning'
  return 'text-muted-foreground'
}
