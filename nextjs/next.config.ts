import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['playwright'],
  async redirects() {
    return [
      {
        source: '/prospekts/:id',
        destination: '/customers/:id',
        permanent: false,
      },
      { source: '/kunder/ny', destination: '/customers/new', permanent: true },
      { source: '/offerter/ny', destination: '/quotes/new', permanent: true },
      { source: '/fakturor/ny', destination: '/invoices/new', permanent: true },
      { source: '/projekt/ny', destination: '/projects/new', permanent: true },
      { source: '/prospekts/ny', destination: '/prospects/new', permanent: true },
      { source: '/pipelines/ny', destination: '/pipelines/new', permanent: true },
      { source: '/kunder/:path*', destination: '/customers/:path*', permanent: true },
      { source: '/kontakter/:path*', destination: '/contacts/:path*', permanent: true },
      { source: '/offerter/:path*', destination: '/quotes/:path*', permanent: true },
      { source: '/fakturor/:path*', destination: '/invoices/:path*', permanent: true },
      { source: '/projekt/:path*', destination: '/projects/:path*', permanent: true },
      { source: '/avtal/:path*', destination: '/contracts/:path*', permanent: true },
      { source: '/anvandare/:path*', destination: '/users/:path*', permanent: true },
      { source: '/installningar', destination: '/settings', permanent: true },
      { source: '/kunskapsbas', destination: '/knowledge-base', permanent: true },
      { source: '/systemloggar', destination: '/system-logs', permanent: true },
      { source: '/uppgifter', destination: '/tasks', permanent: true },
      { source: '/moten', destination: '/meetings', permanent: true },
      { source: '/kalender', destination: '/calendar', permanent: true },
      { source: '/rapporter', destination: '/reports', permanent: true },
      { source: '/prospekts', destination: '/prospects', permanent: true },
      { source: '/profil', destination: '/profile', permanent: true },
      {
        source: '/api/kunder/:id/bolagsfakta/:path*',
        destination: '/api/customers/:id/company-facts/:path*',
        permanent: true,
      },
      {
        source: '/api/kunder/:id/flode/:path*',
        destination: '/api/customers/:id/flow/:path*',
        permanent: true,
      },
      { source: '/api/projekt/:id/ekonomi', destination: '/api/projects/:id/finance', permanent: true },
      {
        source: '/api/projekt/:id/lankar/:path*',
        destination: '/api/projects/:id/links/:path*',
        permanent: true,
      },
      {
        source: '/api/projekt/:id/kunder/:path*',
        destination: '/api/projects/:id/customers/:path*',
        permanent: true,
      },
      {
        source: '/api/offerter/:id/skapa-faktura',
        destination: '/api/quotes/:id/create-invoice',
        permanent: true,
      },
      {
        source: '/api/fakturor/:id/betalningar',
        destination: '/api/invoices/:id/payments',
        permanent: true,
      },
      {
        source: '/api/pipelines/:id/foretag/:path*',
        destination: '/api/pipelines/:id/companies/:path*',
        permanent: true,
      },
      {
        source: '/api/pipelines/:id/foretag',
        destination: '/api/pipelines/:id/companies',
        permanent: true,
      },
      {
        source: '/api/kommuner/:slug/branscher',
        destination: '/api/municipalities/:slug/industries',
        permanent: true,
      },
      { source: '/api/kunder/:path*', destination: '/api/customers/:path*', permanent: true },
      { source: '/api/kontakter/:path*', destination: '/api/contacts/:path*', permanent: true },
      { source: '/api/offerter/:path*', destination: '/api/quotes/:path*', permanent: true },
      { source: '/api/fakturor/:path*', destination: '/api/invoices/:path*', permanent: true },
      { source: '/api/projekt/:path*', destination: '/api/projects/:path*', permanent: true },
      { source: '/api/anvandare/:path*', destination: '/api/users/:path*', permanent: true },
      { source: '/api/installningar', destination: '/api/settings', permanent: true },
      { source: '/api/kunskapsbas', destination: '/api/knowledge-base', permanent: true },
      { source: '/api/profil', destination: '/api/profile', permanent: true },
      { source: '/api/prospekts', destination: '/api/prospects', permanent: true },
      { source: '/api/uppgifter', destination: '/api/tasks', permanent: true },
      { source: '/api/uppgifter/:path*', destination: '/api/tasks/:path*', permanent: true },
      { source: '/api/moten', destination: '/api/meetings', permanent: true },
      { source: '/api/moten/:path*', destination: '/api/meetings/:path*', permanent: true },
      { source: '/api/notifikationer', destination: '/api/notifications', permanent: true },
      { source: '/api/sok', destination: '/api/search', permanent: true },
      { source: '/api/bolagsfakta/:path*', destination: '/api/company-facts/:path*', permanent: true },
      { source: '/api/kommuner/:path*', destination: '/api/municipalities/:path*', permanent: true },
      { source: '/api/import/kunder', destination: '/api/import/customers', permanent: true },
      { source: '/api/export/kunder', destination: '/api/export/customers', permanent: true },
      { source: '/api/avtalsmallar', destination: '/api/contract-templates', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
