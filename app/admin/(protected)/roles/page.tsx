import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"
import { listAdminRoleCatalog } from "@/lib/admin-role-catalog"
import { listInactiveAdmins } from "@/lib/admins"
import { roleLabel } from "@/lib/admin-roles"
import {
  createRoleAction,
  hideRoleAction,
  purgeRoleAction,
  restoreRoleAction,
  restoreHiddenUserAction,
  purgeHiddenUserAction,
} from "@/app/admin/role-actions"
import {
  PageHeader,
  FormSection,
  TableWrap,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
} from "@/components/admin/ui"

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  try {
    await requireCapability("manage_roles")
  } catch {
    redirect("/admin?error=forbidden")
  }

  const sp = await searchParams
  const roles = await listAdminRoleCatalog({ includeHidden: true })
  const visible = roles.filter((r) => !r.hidden)
  const hidden = roles.filter((r) => r.hidden)
  const inactiveUsers = await listInactiveAdmins()

  const notices: Record<string, string> = {
    hidden: "Роль скрыта",
    restored: "Роль восстановлена",
    purged: "Роль удалена навсегда",
    created: "Роль создана",
    user_restored: "Пользователь восстановлен",
    user_purged: "Пользователь удалён навсегда",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Роли"
        description="Менеджер ролей суперадмина: скрытие, восстановление и полное удаление"
      />

      {sp.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {decodeURIComponent(sp.error)}
        </p>
      ) : null}
      {sp.notice && notices[sp.notice] ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {notices[sp.notice]}
        </p>
      ) : null}

      <FormSection id="roles-active" title={`Активные роли (${visible.length})`}>
        {visible.length === 0 ? (
          <EmptyState title="Нет активных ролей" />
        ) : (
          <TableWrap>
            <Thead>
              <Tr>
                <Th>Slug</Th>
                <Th>Название</Th>
                <Th>Пользователи</Th>
                <Th actions>Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {visible.map((role) => (
                <Tr key={role.slug}>
                  <Td>
                    <code translate="no" className="rounded bg-admin-muted px-1.5 py-0.5 font-mono text-sm">
                      {role.slug}
                    </code>
                    {role.isSystem ? (
                      <span className="ml-2 text-xs text-admin-fg-muted">системная</span>
                    ) : null}
                  </Td>
                  <Td>{role.label}</Td>
                  <Td>{role.userCount}</Td>
                  <Td actions>
                    {role.slug === "superadmin" ? (
                      <span className="text-sm text-admin-fg-muted">Нельзя скрыть</span>
                    ) : (
                      <form action={hideRoleAction}>
                        <input type="hidden" name="slug" value={role.slug} />
                        <button
                          type="submit"
                          className="rounded-md border border-admin-border px-3 py-1 text-sm hover:bg-admin-muted"
                        >
                          Скрыть
                        </button>
                      </form>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        )}
      </FormSection>

      <FormSection id="roles-hidden" title={`Скрытые роли (${hidden.length})`}>
        {hidden.length === 0 ? (
          <EmptyState title="Нет скрытых ролей" description="Не показываются при назначении пользователям" />
        ) : (
          <TableWrap>
            <Thead>
              <Tr>
                <Th>Slug</Th>
                <Th>Название</Th>
                <Th>Пользователи</Th>
                <Th actions>Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {hidden.map((role) => (
                <Tr key={role.slug}>
                  <Td>
                    <code translate="no" className="rounded bg-admin-muted px-1.5 py-0.5 font-mono text-sm">
                      {role.slug}
                    </code>
                  </Td>
                  <Td>{role.label}</Td>
                  <Td>{role.userCount}</Td>
                  <Td actions>
                    <div className="flex flex-wrap gap-2">
                      <form action={restoreRoleAction}>
                        <input type="hidden" name="slug" value={role.slug} />
                        <button
                          type="submit"
                          className="rounded-md border border-admin-border px-3 py-1 text-sm hover:bg-admin-muted"
                        >
                          Восстановить
                        </button>
                      </form>
                      {!role.isSystem && role.userCount === 0 ? (
                        <form action={purgeRoleAction}>
                          <input type="hidden" name="slug" value={role.slug} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                          >
                            Удалить навсегда
                          </button>
                        </form>
                      ) : role.isSystem ? (
                        <span className="text-sm text-admin-fg-muted">Системную — только восстановить</span>
                      ) : (
                        <span className="text-sm text-admin-fg-muted">Есть пользователи</span>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        )}
      </FormSection>

      <FormSection id="roles-create" title="Новая роль (каталог)">
        <p className="mb-3 text-sm text-admin-fg-muted">
          Кастомная роль для каталога. Назначение прав как у менеджера; полное удаление — только после скрытия.
        </p>
        <form action={createRoleAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-admin-fg-muted">Slug</span>
            <input
              name="slug"
              required
              pattern="[a-z0-9_]+"
              placeholder="editor"
              className="w-full rounded-md border border-admin-border px-3 py-2 font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-admin-fg-muted">Название</span>
            <input name="label" required placeholder="Редактор" className="w-full rounded-md border border-admin-border px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-admin-fg px-4 py-2 text-sm font-medium text-white">
              Создать роль
            </button>
          </div>
        </form>
      </FormSection>

      <FormSection id="roles-hidden-users" title={`Скрытые пользователи (${inactiveUsers.length})`}>
        <p className="mb-3 text-sm text-admin-fg-muted">
          Soft-delete с экрана «Пользователи». Здесь можно восстановить вход или удалить запись навсегда.
        </p>
        {inactiveUsers.length === 0 ? (
          <EmptyState title="Нет скрытых пользователей" />
        ) : (
          <TableWrap>
            <Thead>
              <Tr>
                <Th>Логин</Th>
                <Th>Роль</Th>
                <Th actions>Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {inactiveUsers.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium">{u.username}</Td>
                  <Td>{roleLabel(u.role)}</Td>
                  <Td actions>
                    <div className="flex flex-wrap gap-2">
                      <form action={restoreHiddenUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-admin-border px-3 py-1 text-sm hover:bg-admin-muted"
                        >
                          Восстановить
                        </button>
                      </form>
                      <form action={purgeHiddenUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                        >
                          Удалить навсегда
                        </button>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        )}
      </FormSection>
    </div>
  )
}
