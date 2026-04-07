export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center px-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Du är offline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Det gick inte att läsa in sidan. Kontrollera din internetanslutning och försök igen.
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Gå till startsidan
        </a>
      </div>
    </div>
  )
}
