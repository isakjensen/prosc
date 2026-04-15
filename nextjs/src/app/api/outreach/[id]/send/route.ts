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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 })
  }

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
    return NextResponse.json({ error: "Outreach hittades inte" }, { status: 404 })
  }

  if (outreach.type !== "EMAIL") {
    return NextResponse.json({ error: "Bara EMAIL-outreach kan skickas" }, { status: 400 })
  }

  if (outreach.emailStatus && !["draft", "queued"].includes(outreach.emailStatus)) {
    return NextResponse.json(
      { error: "E-posten har redan skickats eller schemalagts" },
      { status: 400 },
    )
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

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Inga mottagare angivna" }, { status: 400 })
  }

  const subject = outreach.subject
  if (!subject) {
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
      return NextResponse.json(
        { error: "Schemaläggning stöder max 72 timmar framåt" },
        { status: 400 },
      )
    }
    if (sendTime > new Date()) {
      scheduledAt = sendTime.toISOString()
    }
  }

  try {
    const result = await sendEmail({
      to: recipients,
      subject: resolvedSubject,
      html: htmlBody,
      scheduledAt,
    })

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
