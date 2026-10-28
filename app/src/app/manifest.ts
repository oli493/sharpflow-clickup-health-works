import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sharpflow ClickUp Health',
    short_name: 'Sharpflow Health',
    description: 'Connect ClickUp and get an automated workspace health assessment.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F5F1',
    theme_color: '#173435',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  }
}
