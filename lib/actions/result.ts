/** Shape returned by every server action (serialisable). */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Flattens a Zod error into { "field.path": "message" } (first message per field). */
export function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
