// Backend URL configuration
// Supports:
// 1. localStorage override ('olu_backend_url') - allows instant connection without rebuilding
// 2. Build-time Vite env variable ('VITE_BACKEND_URL')
// 3. Defaults to empty string (relative paths for local proxy or same-domain deployment)

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('olu_backend_url');
    if (customUrl) return customUrl.trim().replace(/\/$/, '');
  }
  return (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/$/, '');
}

export function setBackendUrl(url: string) {
  if (typeof window !== 'undefined') {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed) {
      localStorage.setItem('olu_backend_url', trimmed);
    } else {
      localStorage.removeItem('olu_backend_url');
    }
  }
}
