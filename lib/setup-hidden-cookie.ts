// "Get set up" panel visibility, kept in a cookie rather than the database.
// The value is the user's id, so a second account on the same browser still
// sees its own panel. A cookie (not localStorage) lets the server read it,
// so a hidden panel never flashes in before disappearing.
export const SETUP_HIDDEN_COOKIE = "clentric_setup_hidden";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Browser only: remember that this user hid the panel. */
export function setSetupHiddenCookie(userId: string) {
  document.cookie = `${SETUP_HIDDEN_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** Browser only: forget it, so the panel shows again. */
export function clearSetupHiddenCookie() {
  document.cookie = `${SETUP_HIDDEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
