import twilio from 'twilio'

export function buildSmsMessage({
  completedByName,
  taskTitle,
  familyName,
  serviceDate,
  confirmationValue,
}: {
  completedByName: string
  taskTitle: string
  familyName: string
  serviceDate: string
  confirmationValue: string
}): string {
  const detail = confirmationValue.slice(0, 80)
  return `${completedByName} confirmed '${taskTitle}' for the ${familyName} service (${serviceDate}). Detail: ${detail}`
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[sms] Missing Twilio env vars')
    return
  }

  const client = twilio(accountSid, authToken)
  await client.messages.create({
    from: fromNumber,
    to,
    body: message,
  })
}
