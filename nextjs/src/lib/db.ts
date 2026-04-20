import { PrismaClient } from "@prisma/client"
import { headers } from "next/headers"

const MUTATING_OPS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
])

/** Skip audit for these models (avoid recursion / noise). */
const SKIP_AUDIT_MODELS = new Set(["systemLog"])

const SENSITIVE_KEY_HINTS = [
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
  "credentials",
]

const DETAILS_MAX_LEN = 8000
const REDACT_MAX_DEPTH = 8

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  if (SENSITIVE_KEY_HINTS.some((h) => lower.includes(h))) return true
  return false
}

function redactForAudit(value: unknown, depth: number): unknown {
  if (depth > REDACT_MAX_DEPTH) return "[max depth]"
  if (value === null || value === undefined) return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value !== "object") return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redactForAudit(v, depth + 1))
  }
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (isSensitiveKey(k)) {
      out[k] = "[redacted]"
      continue
    }
    out[k] = redactForAudit(v, depth + 1)
  }
  return out
}

function extractEntityId(
  operation: string,
  args: Record<string, unknown>,
  result: unknown,
): string | null {
  const res = result as Record<string, unknown> | null
  if (res && typeof res.id === "string") {
    if (
      operation === "create" ||
      operation === "update" ||
      operation === "delete" ||
      operation === "upsert"
    ) {
      return res.id
    }
  }
  const where = args.where as Record<string, unknown> | undefined
  if (where && typeof where.id === "string") {
    return where.id
  }
  return null
}

function buildAuditMessage(model: string, operation: string, result: unknown): string {
  const res = result as { count?: number } | null
  const verbSv: Record<string, string> = {
    create: "Skapade",
    createMany: "Skapade flera",
    update: "Uppdaterade",
    updateMany: "Uppdaterade flera",
    upsert: "Skapade eller uppdaterade",
    delete: "Tog bort",
    deleteMany: "Tog bort flera",
  }
  const verb = verbSv[operation] ?? operation
  if (
    res &&
    typeof res.count === "number" &&
    (operation === "createMany" ||
      operation === "updateMany" ||
      operation === "deleteMany")
  ) {
    return `${verb} ${model} (${res.count} st)`
  }
  return `${verb} ${model}`
}

function serializeDetails(
  message: string,
  args: Record<string, unknown>,
): string | null {
  const payload = {
    message,
    args: redactForAudit(args, 0),
  }
  let text = JSON.stringify(payload)
  if (text.length > DETAILS_MAX_LEN) {
    const fallback = JSON.stringify({
      message,
      args: "[utelämnat — för stor payload]",
      truncated: true,
    })
    text =
      fallback.length > DETAILS_MAX_LEN
        ? JSON.stringify({ message, truncated: true })
        : fallback
  }
  return text
}

function createPrismaClient() {
  const base = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args)

          if (!MUTATING_OPS.has(operation)) return result
          if (SKIP_AUDIT_MODELS.has(model)) return result

          try {
            const { auth } = await import("@/lib/auth")
            const session = await auth()
            const userId = session?.user?.id
            if (!userId) return result

            let ipAddress: string | null = null
            let userAgent: string | null = null
            try {
              const h = await headers()
              ipAddress =
                h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                h.get("x-real-ip") ??
                null
              userAgent = h.get("user-agent") ?? null
            } catch {
              /* outside request context */
            }

            const argObj = args as Record<string, unknown>
            const action = `${model}.${operation}`
            const entityId = extractEntityId(operation, argObj, result)
            const message = buildAuditMessage(model, operation, result)
            const details = serializeDetails(message, argObj)

            await base.systemLog.create({
              data: {
                userId,
                action,
                entityType: model,
                entityId,
                details,
                ipAddress,
                userAgent,
              },
            })
          } catch (err) {
            console.error("[audit] Failed to write system log:", err)
          }

          return result
        },
      },
    },
  })
}

export type ExtendedPrisma = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrisma }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
