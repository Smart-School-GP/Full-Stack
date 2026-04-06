/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2?|eot|ttf|otf)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'staticAssets',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 86400,
        },
      },
    },
  ],
})

const nextConfig = {
  reactStrictMode: true,
  // Required for Docker multi-stage builds with standalone output
  output: 'standalone',
  // FullCalendar v6 ships as CJS and needs to be transpiled by Next.js
  transpilePackages: [
    '@fullcalendar/core',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
    '@fullcalendar/react',
  ],
}

module.exports = withPWA(nextConfig)
