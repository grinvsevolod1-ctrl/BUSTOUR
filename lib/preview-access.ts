import { getAdmin } from "@/lib/auth"
import {
  isPreviewFor,
  PREVIEW_QUERY,
  verifyPreviewToken,
  type PreviewEntityType,
  type PreviewTokenPayload,
} from "@/lib/preview-token"

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>

export type PreviewGateResult = "allow" | "unauthorized" | "forbidden"

function rawPreviewParam(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(PREVIEW_QUERY)
  }
  const value = searchParams[PREVIEW_QUERY]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function readPreviewToken(
  searchParams?: SearchParamsLike,
): Promise<string | null> {
  if (!searchParams) return null
  const resolved = await searchParams
  return rawPreviewParam(resolved)
}

/** Pure gate: valid HMAC preview token + admin session. */
export function gatePreviewAccess(input: {
  token: string | null | undefined
  type: PreviewEntityType
  id: number
  hasAdminSession: boolean
}): PreviewGateResult {
  if (!isPreviewFor(input.token, input.type, input.id)) return "forbidden"
  if (!input.hasAdminSession) return "unauthorized"
  return "allow"
}

export async function previewAllows(
  searchParams: SearchParamsLike | undefined,
  type: PreviewEntityType,
  id: number,
): Promise<boolean> {
  const token = await readPreviewToken(searchParams)
  const admin = await getAdmin()
  return gatePreviewAccess({ token, type, id, hasAdminSession: Boolean(admin) }) === "allow"
}

/** Preview payload only when token valid AND admin logged in. */
export async function readAuthorizedPreview(
  searchParams?: SearchParamsLike,
): Promise<PreviewTokenPayload | null> {
  const token = await readPreviewToken(searchParams)
  const payload = verifyPreviewToken(token)
  if (!payload) return null
  const admin = await getAdmin()
  if (!admin) return null
  return payload
}

export { verifyPreviewToken, PREVIEW_QUERY }
