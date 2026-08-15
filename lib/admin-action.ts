import "server-only"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { requireAdmin, requireCapability, type SessionAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { mapDbError } from "@/lib/db-errors"
import type { AdminCapability } from "@/lib/admin-roles"

/** A path to revalidate; use ["/", "layout"] to revalidate a whole layout subtree. */
export type RevalidateTarget = string | readonly [path: string, type: "layout" | "page"]

export type AuditInput = Omit<Parameters<typeof writeAudit>[0], "admin">

export type AdminActionOutcome<T> = {
  /** Written to admin_audit_log after the handler succeeds. */
  audit?: AuditInput
  /** Value returned to the caller; defaults to { ok: true }. */
  result?: T
  /** Extra paths to revalidate on top of options.revalidate. */
  revalidate?: readonly RevalidateTarget[]
}

export type AdminActionOptions = {
  /** When set, requires this capability instead of plain admin access. */
  capability?: AdminCapability
  /** Fallback error message passed to mapDbError when the handler throws. */
  errorMessage: string
  /** Paths revalidated after a successful run. */
  revalidate?: readonly RevalidateTarget[]
}

function revalidateTargets(targets: readonly RevalidateTarget[] | undefined) {
  for (const target of targets ?? []) {
    if (typeof target === "string") revalidatePath(target)
    else revalidatePath(target[0], target[1])
  }
}

/**
 * Shared wrapper for admin server actions. Handles the repeated
 * auth-check -> run -> audit -> revalidate -> error-mapping pipeline:
 *
 *   export async function deleteThingAction(formData: FormData) {
 *     return withAdminAction(
 *       { errorMessage: "Не удалось удалить", revalidate: ["/admin/things"] },
 *       async (admin) => {
 *         const id = Number(formData.get("id") || 0)
 *         if (id) await deleteThing(id)
 *         return { audit: { action: "thing_delete", entityType: "thing", entityId: id, summary: `Удалено #${id}` } }
 *       },
 *     )
 *   }
 *
 * redirect()/notFound() thrown inside the handler are re-thrown untouched
 * (unstable_rethrow), so redirects keep working. Handlers may also return
 * { result: { error } } for validation failures — audit/revalidate are then skipped.
 */
export async function withAdminAction<T = { ok: true }>(
  options: AdminActionOptions,
  handler: (admin: SessionAdmin) => Promise<AdminActionOutcome<T>>,
): Promise<T | { ok: true } | { error: string }> {
  const admin = options.capability ? await requireCapability(options.capability) : await requireAdmin()

  let outcome: AdminActionOutcome<T>
  try {
    outcome = await handler(admin)
  } catch (err) {
    unstable_rethrow(err)
    return { error: mapDbError(err, options.errorMessage) }
  }

  // Validation-style failures skip audit + revalidate.
  const result = outcome.result
  if (result && typeof result === "object" && "error" in (result as Record<string, unknown>)) {
    return result as T
  }

  if (outcome.audit) {
    await writeAudit({ admin, ...outcome.audit })
  }
  revalidateTargets(options.revalidate)
  revalidateTargets(outcome.revalidate)

  return result ?? ({ ok: true } as const)
}
