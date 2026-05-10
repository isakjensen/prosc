export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="page-hero pb-5">
        <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-zinc-700 mb-2" />
        <div className="h-7 w-52 rounded-md bg-gray-200 dark:bg-zinc-700 mb-1.5" />
        <div className="h-3.5 w-36 rounded-full bg-gray-100 dark:bg-zinc-800" />
      </div>
      <div className="panel-surface overflow-hidden">
        <div className="border-b border-gray-100 dark:border-zinc-800 px-6 py-4">
          <div className="h-4 w-32 rounded-full bg-gray-200 dark:bg-zinc-700" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div
                className="h-4 rounded-full bg-gray-100 dark:bg-zinc-800"
                style={{ width: `${30 + (i * 17) % 40}%` }}
              />
              <div className="ml-auto h-3.5 w-16 rounded-full bg-gray-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
