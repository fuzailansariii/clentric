// What the "Send?" confirm says. An email can't be recalled, so it names who gets it.

export function proposalSendDescription(
  title: string,
  recipient: string,
  extra?: string | null,
) {
  const name = title.trim() ? `"${title.trim()}"` : "This proposal";
  return [
    `${name} will be emailed to ${recipient} with a link to accept it. An email can't be unsent.`,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function invoiceSendDescription(email: string | null | undefined, name: string) {
  return email?.trim()
    ? `It will be emailed to ${email.trim()} with the PDF attached. An email can't be unsent.`
    : `${name} has no email, so it will be marked as sent and you deliver it yourself.`;
}
