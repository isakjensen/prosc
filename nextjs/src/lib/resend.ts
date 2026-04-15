import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"
const FROM_NAME = process.env.RESEND_FROM_NAME ?? "CRM"

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  scheduledAt?: string // ISO 8601 date string, max 72h in the future
}

interface SendEmailResult {
  id: string
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    scheduledAt: params.scheduledAt,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return { id: data!.id }
}

interface BatchEmail {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  scheduledAt?: string
}

export async function sendBatchEmails(
  emails: BatchEmail[],
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = []

  // Resend batch API supports max 100 emails per call
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100)
    const { data, error } = await resend.batch.send(
      chunk.map((email) => ({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: email.html,
        replyTo: email.replyTo,
        scheduledAt: email.scheduledAt,
      })),
    )

    if (error) {
      throw new Error(`Resend batch error: ${error.message}`)
    }

    if (data) {
      results.push(...data.data.map((d) => ({ id: d.id })))
    }
  }

  return results
}
