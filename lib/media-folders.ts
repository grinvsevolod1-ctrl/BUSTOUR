/** Flat media folders (no nesting). `root` = unfiled (folder_id IS NULL). */

export type MediaFolder = {
  id: string
  name: string
  createdAt: number
}

/** Query param → SQL fragment. `all` = no folder filter; `root` = null; else exact id. */
export function folderFilterSql(
  folder: string | undefined | null,
): { sql: string; args: string[] } | null {
  if (folder == null || folder === "" || folder === "all") return null
  if (folder === "root") return { sql: "folder_id IS NULL", args: [] }
  return { sql: "folder_id = ?", args: [folder] }
}

export function normalizeFolderName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ")
  if (!name || name.length > 80) return null
  return name
}
