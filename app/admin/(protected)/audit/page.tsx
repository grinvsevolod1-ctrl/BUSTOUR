import Link from "next/link"
import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"
import { listAdmins } from "@/lib/admins"
import {
  DEFAULT_AUDIT_RETENTION_DAYS,
  distinctAuditActions,
  distinctAuditEntityTypes,
  getAuditLogById,
  getAuditRetentionDays,
  listAuditLogs,
  maybePurgeExpiredAuditLogs,
} from "@/lib/admin-audit"
import { runAuditPurgeAction, saveAuditRetentionAction } from "@/app/admin/audit-actions"
import { PageHeader, FormSection, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/admin/ui"

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString("ru-RU")
  } catch {
    return String(ts)
  }
}

function prettyJson(raw: string) {
  if (!raw) return "—"
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function toDateInputValue(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    adminId?: string
    entityType?: string
    action?: string
    from?: string
    to?: string
    id?: string
  }>
}) {
  try {
    await requireCapability("view_audit")
  } catch {
    redirect("/admin?error=forbidden")
  }
  const sp = await searchParams
  const detailId = Number(sp.id || 0)
  const retentionDays = await getAuditRetentionDays()
  await maybePurgeExpiredAuditLogs()

  const defaultFromMs = Date.now() - retentionDays * 86_400_000
  const fromMs = sp.from ? Date.parse(sp.from) : defaultFromMs
  const fromValue = sp.from || toDateInputValue(defaultFromMs)

  const [users, actions, entityTypes, rows, detail] = await Promise.all([
    listAdmins({ includeInactive: true }),
    distinctAuditActions(),
    distinctAuditEntityTypes(),
    listAuditLogs({
      adminId: sp.adminId ? Number(sp.adminId) : undefined,
      entityType: sp.entityType || undefined,
      action: sp.action || undefined,
      from: Number.isFinite(fromMs) ? fromMs : defaultFromMs,
      to: sp.to ? Date.parse(sp.to) + 86_400_000 - 1 : undefined,
      limit: 200,
    }),
    detailId > 0 ? getAuditLogById(detailId) : Promise.resolve(null),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал действий"
        description={`Хранение: ${retentionDays} дн. (по умолчанию ${DEFAULT_AUDIT_RETENTION_DAYS}). Записи старше срока удаляются автоматически. Покрытие — не все сущности (см. анализ).`}
      />

      <FormSection id="audit-retention" title="Хранение">
        <div className="flex flex-wrap items-end gap-3">
          <form action={saveAuditRetentionAction} className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-admin-fg-muted">Срок, дней</span>
              <input
                type="number"
                name="days"
                min={1}
                max={3650}
                defaultValue={retentionDays}
                className="w-28 rounded-md border border-admin-border px-2 py-1.5"
              />
            </label>
            <button type="submit" className="rounded-md bg-admin-fg px-3 py-1.5 text-sm text-white">
              Сохранить срок
            </button>
          </form>
          <form action={runAuditPurgeAction}>
            <button
              type="submit"
              className="rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
            >
              Очистить старше срока сейчас
            </button>
          </form>
        </div>
      </FormSection>

      <FormSection id="audit-filters" title="Фильтры">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="text-sm">
            <span className="mb-1 block text-admin-fg-muted">Пользователь</span>
            <select name="adminId" defaultValue={sp.adminId || ""} className="rounded-md border border-admin-border px-2 py-1.5">
              <option value="">Все</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-admin-fg-muted">Сущность</span>
            <select name="entityType" defaultValue={sp.entityType || ""} className="rounded-md border border-admin-border px-2 py-1.5">
              <option value="">Все</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-admin-fg-muted">Действие</span>
            <select name="action" defaultValue={sp.action || ""} className="rounded-md border border-admin-border px-2 py-1.5">
              <option value="">Все</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-admin-fg-muted">С</span>
            <input type="date" name="from" defaultValue={fromValue} className="rounded-md border border-admin-border px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-admin-fg-muted">По</span>
            <input type="date" name="to" defaultValue={sp.to || ""} className="rounded-md border border-admin-border px-2 py-1.5" />
          </label>
          <button type="submit" className="rounded-md bg-admin-fg px-3 py-1.5 text-sm text-white">
            Применить
          </button>
          <Link href="/admin/audit" className="rounded-md border border-admin-border px-3 py-1.5 text-sm">
            Сбросить
          </Link>
        </form>
      </FormSection>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <FormSection id="audit-rows" title={`Записи (${rows.length})`}>
          {rows.length === 0 ? (
            <EmptyState title="Пока пусто" />
          ) : (
            <TableWrap>
              <Thead>
                <Tr>
                  <Th>Время</Th>
                  <Th>Кто</Th>
                  <Th>Действие</Th>
                  <Th>Сущность</Th>
                  <Th>Кратко</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap text-xs">{fmt(r.createdAt)}</Td>
                    <Td>{r.username || "—"}</Td>
                    <Td>
                      <Link href={`/admin/audit?id=${r.id}`} className="text-sm font-medium underline-offset-2 hover:underline">
                        {r.action}
                      </Link>
                    </Td>
                    <Td className="text-xs">
                      {r.entityType}
                      {r.entityId ? ` #${r.entityId}` : ""}
                    </Td>
                    <Td className="max-w-xs truncate text-sm">{r.summary}</Td>
                  </Tr>
                ))}
              </Tbody>
            </TableWrap>
          )}
        </FormSection>

        <FormSection id="audit-detail" title="Детали">
          {!detail ? (
            <p className="text-sm text-admin-fg-muted">Выберите запись (клик по действию)</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-admin-fg-muted">ID:</span> {detail.id}
              </p>
              <p>
                <span className="text-admin-fg-muted">Время:</span> {fmt(detail.createdAt)}
              </p>
              <p>
                <span className="text-admin-fg-muted">Кто:</span> {detail.username || "—"}
              </p>
              <p>
                <span className="text-admin-fg-muted">Действие:</span> {detail.action}
              </p>
              <p>
                <span className="text-admin-fg-muted">Сущность:</span> {detail.entityType}{" "}
                {detail.entityId ? `#${detail.entityId}` : ""}
              </p>
              <p>{detail.summary}</p>
              <div>
                <p className="mb-1 font-medium">before</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-admin-muted p-2 text-xs">{prettyJson(detail.beforeJson)}</pre>
              </div>
              <div>
                <p className="mb-1 font-medium">after</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-admin-muted p-2 text-xs">{prettyJson(detail.afterJson)}</pre>
              </div>
              <div>
                <p className="mb-1 font-medium">meta</p>
                <pre className="max-h-32 overflow-auto rounded-md bg-admin-muted p-2 text-xs">{prettyJson(detail.metaJson)}</pre>
              </div>
            </div>
          )}
        </FormSection>
      </div>
    </div>
  )
}
