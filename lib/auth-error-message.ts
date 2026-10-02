/** Turns a Supabase auth error into a sentence a user can act on. */
export function authErrorMessage(error: { message: string; code?: string }) {
  const message = error.message.toLowerCase();

  if (
    error.code === "over_email_send_rate_limit" ||
    message.includes("rate limit")
  ) {
    return "Too many codes were sent to this email. Wait a few minutes, then try again.";
  }
  if (message.includes("for security purposes")) {
    return "Please wait a moment before asking for another code.";
  }
  if (
    error.code === "otp_expired" ||
    message.includes("expired or is invalid")
  ) {
    return "That code is wrong or has expired. Check it, or send a new one.";
  }
  if (message.includes("signups not allowed")) {
    return "No account found with this email. Try creating one instead.";
  }

  return error.message;
}
