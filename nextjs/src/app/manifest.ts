import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitrate CRM",
    short_name: "Bitrate CRM",
    description: "Bitrate CRM – affärssystem för svenska företag",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#593c34",
    lang: "sv",
    icons: [
      {
        src: "/bitrate-crm-favicon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/bitrate-crm-favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/bitrate-crm-favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
