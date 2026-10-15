const ERROR_SELECTOR = '[aria-invalid="true"], .text-danger-600';

/**
 * After a failed save, bring the form's first error on screen. Runs a frame late
 * so errors set by hand (setError) have rendered; focuses it when it's a field.
 */
export function scrollToFirstError(formId: string) {
  requestAnimationFrame(() => {
    const target = document
      .getElementById(formId)
      ?.querySelector<HTMLElement>(ERROR_SELECTOR);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    if (target.matches("input, textarea, select, button")) {
      target.focus({ preventScroll: true });
    }
  });
}
