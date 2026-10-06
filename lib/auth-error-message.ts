export const INVITE_ONLY_MESSAGE =
  "Clentric is invite-only during the beta. Join the waitlist on our home page and we'll send you an invite.";

/** Messages for ?error= codes the auth callback redirects with. */
export const AUTH_REDIRECT_ERRORS: Record<string, string> = {
  invite_only: INVITE_ONLY_MESSAGE,
  auth_failed: "Sign-in didn't finish. Please try again.",
};

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
  if (message.includes("invite-only")) {
    return INVITE_ONLY_MESSAGE;
  }
  if (message.includes("signups not allowed")) {
    return "No account found with this email. Try creating one instead.";
  }

  return error.message;
}
