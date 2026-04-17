import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/resend"
import { resolveVariables, buildVariableData } from "@/lib/email-variables"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/outreach/[id]/send — send the email for an outreach
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  console.log(`[SEND] Starting send for outreach ${id}`)

  const session = await auth()
  if (!session?.user?.id) {
    console.log(`[SEND] FAIL: Not authenticated`)
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 })
  }

  console.log(`[SEND] User: ${session.user.id} (${session.user.name ?? "?"})`)

  const outreach = await prisma.outreach.findUnique({
    where: { id },
    include: {
      customer: {
        include: {
          contacts: { take: 1 },
        },
      },
    },
  })

  if (!outreach) {
    console.log(`[SEND] FAIL: Outreach ${id} not found`)
    return NextResponse.json({ error: "Outreach hittades inte" }, { status: 404 })
  }

  console.log(`[SEND] Outreach found:`, {
    type: outreach.type,
    emailStatus: outreach.emailStatus,
    subject: outreach.subject,
    recipients: outreach.recipients,
    body: outreach.body ? `${outreach.body.substring(0, 50)}...` : null,
    sendAt: outreach.sendAt,
    customerId: outreach.customerId,
    customerName: outreach.customer?.name,
  })

  if (outreach.type !== "EMAIL") {
    console.log(`[SEND] FAIL: Type is ${outreach.type}, not EMAIL`)
    return NextResponse.json({ error: "Bara EMAIL-outreach kan skickas" }, { status: 400 })
  }

  if (outreach.emailStatus) {
    console.log(`[SEND] Note: emailStatus is "${outreach.emailStatus}" — sending again anyway`)
  }

  // Parse recipients
  let recipients: string[] = []
  if (outreach.recipients) {
    try {
      recipients = JSON.parse(outreach.recipients)
    } catch {
      recipients = outreach.recipients.split(",").map((r) => r.trim()).filter(Boolean)
    }
  }

  console.log(`[SEND] Parsed recipients:`, recipients)

  if (recipients.length === 0) {
    console.log(`[SEND] FAIL: No recipients`)
    return NextResponse.json({ error: "Inga mottagare angivna" }, { status: 400 })
  }

  const subject = outreach.subject
  if (!subject) {
    console.log(`[SEND] FAIL: No subject`)
    return NextResponse.json({ error: "Ämnesrad saknas" }, { status: 400 })
  }

  const bodyText = outreach.body ?? ""

  // Resolve template variables
  const contact = outreach.customer?.contacts?.[0] ?? null
  const varData = buildVariableData(
    outreach.customer ?? { name: null, city: null, industry: null, orgNumber: null },
    contact,
  )
  const resolvedSubject = resolveVariables(subject, varData)
  const resolvedBody = resolveVariables(bodyText, varData)

  // Convert plain text body to basic HTML
  const htmlBody = resolvedBody
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `<p>${line}</p>`))
    .join("\n")

  // Determine if scheduled
  let scheduledAt: string | undefined
  if (outreach.sendAt) {
    const sendTime = new Date(outreach.sendAt)
    const maxTime = new Date()
    maxTime.setHours(maxTime.getHours() + 72)
    if (sendTime > maxTime) {
      console.log(`[SEND] FAIL: sendAt ${outreach.sendAt} is more than 72h in the future`)
      return NextResponse.json(
        { error: "Schemaläggning stöder max 72 timmar framåt" },
        { status: 400 },
      )
    }
    if (sendTime > new Date()) {
      scheduledAt = sendTime.toISOString()
    }
  }

  console.log(`[SEND] Sending email via Resend:`, {
    to: recipients,
    subject: resolvedSubject,
    scheduled: !!scheduledAt,
    scheduledAt: scheduledAt ?? null,
    fromEnv: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 8)}...` : "NOT SET",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "NOT SET",
      RESEND_FROM_NAME: process.env.RESEND_FROM_NAME ?? "NOT SET",
    },
  })

  try {
    const result = await sendEmail({
      to: recipients,
      subject: resolvedSubject,
      html: htmlBody,
      scheduledAt,
    })

    console.log(`[SEND] SUCCESS: messageId=${result.id}, scheduled=${!!scheduledAt}`)

    // Create OutboundEmail record
    await prisma.outboundEmail.create({
      data: {
        userId: session.user.id,
        outreachId: outreach.id,
        customerId: outreach.customerId,
        resendMessageId: result.id,
        to: JSON.stringify(recipients),
        subject: resolvedSubject,
        body: resolvedBody,
        status: scheduledAt ? "SCHEDULED" : "SENT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sentAt: scheduledAt ? null : new Date(),
      },
    })

    // Update outreach emailStatus
    await prisma.outreach.update({
      where: { id },
      data: {
        emailStatus: scheduledAt ? "scheduled" : "sent",
        status: "COMPLETED",
      },
    })

    return NextResponse.json({
      success: true,
      messageId: result.id,
      scheduled: !!scheduledAt,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Okänt fel vid sändning"
    console.error(`[SEND] ERROR:`, err)

    // Create failed OutboundEmail record
    await prisma.outboundEmail.create({
      data: {
        userId: session.user.id,
        outreachId: outreach.id,
        customerId: outreach.customerId,
        to: JSON.stringify(recipients),
        subject: resolvedSubject,
        body: resolvedBody,
        status: "FAILED",
        errorMessage,
      },
    })

    await prisma.outreach.update({
      where: { id },
      data: { emailStatus: "failed" },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
