/* eslint-disable @next/next/no-img-element -- Table/list rows: next/image `fill` + nested sizing often collapses; <img> is reliable. */
import { resolveAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"

/**
 * Inset avatars use a padded block wrapper (not flex). `max-h-full` on a flex child often resolves to 0, so the image never paints inside `flex items-center justify-center`.
 */
export function UserAvatar({
  src,
  name,
  className,
  /** When true, adds inset padding so the graphic sits smaller inside the circle (good for bold/full-bleed artwork). */
  inset = true,
  /** Tailwind padding on the inset ring (smaller % = larger artwork in the circle). Default `p-[22%]`. */
  insetPaddingClassName = "p-[22%]",
}: {
  src?: string | null
  name?: string | null
  className?: string
  inset?: boolean
  insetPaddingClassName?: string
}) {
  const url = resolveAvatarUrl(src)
  const alt = name ? `Profilbild: ${name}` : "Profilbild"

  if (!inset) {
    return (
      <img
        src={url}
        alt={alt}
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
      <div
        className={cn(
          "box-border h-full min-h-0 w-full min-w-0",
          insetPaddingClassName,
        )}
      >
        <img
          src={url}
          alt={alt}
          className="block h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  )
}
