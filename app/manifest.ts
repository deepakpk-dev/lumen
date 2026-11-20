import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumen',
    short_name: 'Lumen',
    description:
      'Track your cycle, fertility, pregnancy, postpartum recovery, or perimenopause. Your logs stay on this device by default.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f9',
    theme_color: '#832750',
    icons: [
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      {
        src: '/icon-maskable-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
    ],
  };
}
