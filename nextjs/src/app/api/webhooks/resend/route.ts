import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import crypto from "crypto"

// Resend webhook event types we care about
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained"

interface ResendWebhookPayload {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    to?: string[]
    bounce?: {
      message?: string
      type?: string
    }
  }
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  )
}

// POST /api/webhooks/resend — handle Resend webhook events
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  // Verify signature if secret is configured
  if (webhookSecret) {
    const signature = request.headers.get("resend-signature")
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: ResendWebhookPayload
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const resendMessageId = event.data?.email_id
  if (!resendMessageId) {
    return NextResponse.json({ ok: true })
  }

  // Find the OutboundEmail by resendMessageId
  const outboundEmail = await prisma.outboundEmail.findUnique({
    where: { resendMessageId },
  })

  if (!outboundEmail) {
    // Not a message we track — ignore
    return NextResponse.json({ ok: true })
  }

  const now = new Date()

  switch (event.type) {
    case "email.sent": {
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          status: "SENT",
          sentAt: outboundEmail.sentAt ?? now,
        },
      })
      if (outboundEmail.outreachId) {
        await prisma.outreach.update({
          where: { id: outboundEmail.outreachId },
          data: { emailStatus: "sent" },
        })
      }
      break
    }

    case "email.delivered": {
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
        },
      })
      if (outboundEmail.outreachId) {
        await prisma.outreach.update({
          where: { id: outboundEmail.outreachId },
          data: { emailStatus: "delivered" },
        })
      }
      break
    }

    case "email.opened": {
      const isFirstOpen = !outboundEmail.openedAt
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          status: "OPENED",
          openedAt: isFirstOpen ? now : outboundEmail.openedAt,
          openCount: { increment: 1 },
        },
      })
      if (outboundEmail.outreachId) {
        await prisma.outreach.update({
          where: { id: outboundEmail.outreachId },
          data: { emailStatus: "opened" },
        })
      }
      break
    }

    case "email.clicked": {
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          clickedAt: outboundEmail.clickedAt ?? now,
        },
      })
      break
    }

    case "email.bounced": {
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          status: "BOUNCED",
          bouncedAt: now,
          bounceType: event.data.bounce?.type ?? null,
          errorMessage: event.data.bounce?.message ?? null,
        },
      })
      if (outboundEmail.outreachId) {
        await prisma.outreach.update({
          where: { id: outboundEmail.outreachId },
          data: { emailStatus: "bounced" },
        })
      }
      break
    }

    case "email.complained": {
      // Treat complaints like bounces
      await prisma.outboundEmail.update({
        where: { id: outboundEmail.id },
        data: {
          status: "BOUNCED",
          bouncedAt: now,
          bounceType: "complaint",
        },
      })
      if (outboundEmail.outreachId) {
        await prisma.outreach.update({
          where: { id: outboundEmail.outreachId },
          data: { emailStatus: "bounced" },
        })
      }
      break
    }
  }

  return NextResponse.json({ ok: true })
}
