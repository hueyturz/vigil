// TODO: Wire Twilio in v2. Install the SDK (already in package.json), then replace
// the stub below with:
//   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
//   await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to, body })
// and update sms_log status to 'sent' on success or 'failed' on error.

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

export async function sendSMS(_to: string, _message: string): Promise<void> {
  // await sendSMS(recipient.phone, message)  — Twilio stub, not called in v1
}
