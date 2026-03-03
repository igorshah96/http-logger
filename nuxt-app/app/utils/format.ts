export function formatTime(timestamp: number | undefined) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

export function formatDateTime(timestamp: number | undefined) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  return date.toLocaleString();
}

