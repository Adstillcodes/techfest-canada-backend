// Resend reports some delivery failures in its returned `error` field rather
// than rejecting the promise. Surface those failures so callers cannot report
// successful submissions for messages Resend did not accept.
export function requireEmailDelivery(result, purpose) {
  if (result?.error) {
    const message = result.error.message || "unknown delivery error";
    throw new Error(`${purpose} email was not accepted by Resend: ${message}`);
  }
  if (!result?.data?.id) {
    throw new Error(`${purpose} email was not accepted by Resend`);
  }
  return result.data;
}
