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
}

module.exports = withPWA(nextConfig)
