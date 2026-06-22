const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vauter</title>
</head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <span style="font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">Vauter</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                Vauter — Funeral Service Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:#0D6E68;color:#FFFFFF;text-decoration:none;
            font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;margin-top:24px;">
    ${label}
  </a>`
}

// ── Template — Demo Request (internal notification) ───────────────────────────

export interface DemoRequestData {
  name:        string
  funeralHome: string
  email:       string
  phone:       string
  staffCount:  string
  referral:    string
  submittedAt: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function demoRequestEmail(data: DemoRequestData): { subject: string; html: string } {
  const subject = `New Demo Request — ${data.funeralHome}`

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#0F172A;line-height:1.7;">
      <p style="margin:0 0 16px 0;">New demo request from the Vauter website.</p>
      <p style="margin:0;">
        <strong>Name:</strong> ${escapeHtml(data.name)}<br/>
        <strong>Funeral Home:</strong> ${escapeHtml(data.funeralHome)}<br/>
        <strong>Email:</strong> ${escapeHtml(data.email)}<br/>
        <strong>Phone:</strong> ${escapeHtml(data.phone)}<br/>
        <strong>Staff Count:</strong> ${escapeHtml(data.staffCount)}<br/>
        <strong>How they heard:</strong> ${escapeHtml(data.referral)}<br/>
        <strong>Submitted:</strong> ${escapeHtml(data.submittedAt)}
      </p>
    </div>`

  return { subject, html }
}

// ── Template A — Task Confirmed ───────────────────────────────────────────────

export interface TaskConfirmedData {
  taskTitle: string
  familyName: string
  serviceDate: string
  serviceId: string
  confirmedByName: string
  confirmedAt: string
  confirmationValue: string
}

export function taskConfirmedEmail(data: TaskConfirmedData): { subject: string; html: string } {
  const serviceUrl = `${BASE_URL}/services/${data.serviceId}`

  const subject = `✓ ${data.taskTitle} confirmed for ${data.familyName} service`

  const html = baseLayout(`
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;
              letter-spacing:0.05em;color:#0D6E68;">Task Confirmed</p>
    <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:700;color:#0F172A;line-height:1.3;">
      ${data.taskTitle}
    </h1>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;
                  padding:16px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 8px 0;font-size:13px;color:#065F46;">
            <strong>Confirmed by:</strong> ${data.confirmedByName}
          </p>
          <p style="margin:0 0 8px 0;font-size:13px;color:#065F46;">
            <strong>Time:</strong> ${data.confirmedAt}
          </p>
          <p style="margin:0;font-size:13px;color:#065F46;">
            <strong>Detail:</strong> ${data.confirmationValue}
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <tr>
        <td>
          <p style="margin:0 0 6px 0;font-size:13px;color:#475569;">
            <strong style="color:#0F172A;">Family:</strong> ${data.familyName}
          </p>
          <p style="margin:0;font-size:13px;color:#475569;">
            <strong style="color:#0F172A;">Service date:</strong> ${data.serviceDate}
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(serviceUrl, 'View service →')}
  `)

  return { subject, html }
}

// ── Template B — Task Assigned ───────────────────────────────────────────────

export interface TaskAssignedData {
  taskTitle:   string
  familyName:  string
  serviceId:   string
  actorName:   string
}

export function taskAssignedEmail(data: TaskAssignedData): { subject: string; html: string } {
  const serviceUrl = `${BASE_URL}/services/${data.serviceId}`
  const subject    = `You've been assigned a task — ${data.familyName}`

  const html = baseLayout(`
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;
              letter-spacing:0.05em;color:#0D6E68;">Task Assignment</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0F172A;line-height:1.3;">
      ${data.taskTitle}
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">
      <strong style="color:#0F172A;">${data.actorName}</strong> assigned you this task
      on the <strong style="color:#0F172A;">${data.familyName}</strong> service.
      Log in to Vauter to view it.
    </p>
    ${ctaButton(serviceUrl, 'View service →')}
  `)

  return { subject, html }
}

// ── Template C — Task Overdue ─────────────────────────────────────────────────

export interface TaskOverdueData {
  taskTitle: string
  familyName: string
  serviceDate: string
  daysUntilService: number
  location: string
  serviceId: string
}

export function taskOverdueEmail(data: TaskOverdueData): { subject: string; html: string } {
  const serviceUrl = `${BASE_URL}/services/${data.serviceId}`

  const subject = `⚠ Action needed: ${data.taskTitle} overdue for ${data.familyName} service`

  const daysLabel = data.daysUntilService === 0
    ? 'today'
    : data.daysUntilService === 1
      ? 'tomorrow'
      : `in ${data.daysUntilService} day${data.daysUntilService !== 1 ? 's' : ''}`

  const html = baseLayout(`
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;
              letter-spacing:0.05em;color:#EF4444;">Action Required</p>
    <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:700;color:#0F172A;line-height:1.3;">
      ${data.taskTitle}
    </h1>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;
                  padding:16px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;font-size:13px;color:#991B1B;">
            This task is overdue for the <strong>${data.familyName}</strong> service,
            which is <strong>${daysLabel}</strong>. Confirmation is needed immediately.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <tr>
        <td>
          <p style="margin:0 0 6px 0;font-size:13px;color:#475569;">
            <strong style="color:#0F172A;">Family:</strong> ${data.familyName}
          </p>
          <p style="margin:0 0 6px 0;font-size:13px;color:#475569;">
            <strong style="color:#0F172A;">Service date:</strong> ${data.serviceDate}
          </p>
          <p style="margin:0;font-size:13px;color:#475569;">
            <strong style="color:#0F172A;">Location:</strong> ${data.location}
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(serviceUrl, 'View service →')}
  `)

  return { subject, html }
}
