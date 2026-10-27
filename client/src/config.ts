// Backend URL configuration
// If VITE_BACKEND_URL is set (e.g. deployed frontend on Vercel connecting to Render/Railway backend),
// it will route API and WebSockets to that remote host. Otherwise, it defaults to relative paths for local proxy.
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
