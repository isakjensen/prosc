/* eslint-disable @next/next/no-img-element -- Table/list rows: next/image `fill` + nested sizing often collapses; <img> is reliable. */
import { resolveAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"

function getInitials(name?: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export function UserAvatar({
  src,
  name,
  className,
  inset = false,
  insetPaddingClassName = "p-[22%]",
}: {
  src?: string | null
  name?: string | null
  className?: string
  inset?: boolean
  insetPaddingClassName?: string
}) {
  const url = resolveAvatarUrl(src)

  if (!url) {
    return (
      <div
        className={cn(
          "rounded-full bg-brand-brown/10 dark:bg-zinc-700 flex items-center justify-center shrink-0",
          className,
        )}
      >
        <span className="text-[11px] font-semibold text-brand-brown dark:text-zinc-300 leading-none select-none">
          {getInitials(name)}
        </span>
      </div>
    )
  }

  if (!inset) {
    return (
      <img
        src={url}
        alt={name ? `Profilbild: ${name}` : "Profilbild"}
        className={cn(
          "rounded-full object-cover bg-gray-100 dark:bg-zinc-800",
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "box-border overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800",
        className,
      )}
    >
      <div className={cn("box-border h-full min-h-0 w-full min-w-0", insetPaddingClassName)}>
        <img
          src={url}
          alt={name ? `Profilbild: ${name}` : "Profilbild"}
          className="block h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  )
}
