import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"
import { listAdmins } from "@/lib/admins"
import { assignableRolesFor, canManageTargetRole, roleLabel } from "@/lib/admin-roles"
import { listAssignableRoleSlugs } from "@/lib/admin-role-catalog"
import {
  createAdminUserAction,
  deleteAdminUserAction,
  updateAdminUserAction,
} from "@/app/admin/user-actions"
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  let actor
  try {
    actor = await requireCapability("manage_users")
  } catch {
    redirect("/admin?error=forbidden")
  }
  const sp = await searchParams
  const users = await listAdmins()
  const catalogSlugs = await listAssignableRoleSlugs()
  const roleOptions = assignableRolesFor(actor.role).filter((r) => catalogSlugs.includes(r))


  return (
    <div className="space-y-6">
      <PageHeader
        title="Пользователи"
        description="Админы и менеджеры панели управления"
      />
      {sp.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {decodeURIComponent(sp.error)}
        </p>
      ) : null}
      {sp.notice === "created" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Пользователь создан
        </p>
      ) : null}
      {sp.notice === "saved" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Сохранено
        </p>
      ) : null}
      {sp.notice === "deleted" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Пользователь удалён (вход отключён)
        </p>
      ) : null}

      <FormSection id="users-create" title="Новый пользователь">
        <form action={createAdminUserAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1 block text-admin-fg-muted">Логин</span>
            <input name="username" required className="w-full rounded-md border border-admin-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-admin-fg-muted">Пароль</span>
            <input name="password" type="password" required minLength={6} className="w-full rounded-md border border-admin-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-admin-fg-muted">Роль</span>
            <select name="role" defaultValue="manager" className="w-full rounded-md border border-admin-border px-3 py-2">
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-md bg-admin-fg px-4 py-2 text-sm font-medium text-white">
              Создать
            </button>
          </div>
        </form>
      </FormSection>

      <FormSection id="users-list" title={`Список (${users.length})`}>
        {users.length === 0 ? (
          <EmptyState title="Нет пользователей" />
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
              {users.map((u) => {
                const isSelf = u.id === actor.id
                const canManage = isSelf || canManageTargetRole(actor.role, u.role)
                return (
                  <Tr key={u.id}>
                    <Td className="font-medium">
                      {u.username}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-admin-fg-muted">(вы)</span>
                      ) : null}
                    </Td>
                    <Td>{roleLabel(u.role)}</Td>
                    <Td actions>
                      {!canManage ? (
                        <span className="text-sm text-admin-fg-muted">Нет прав (выше по тиру)</span>
                      ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          <form action={updateAdminUserAction} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="id" value={u.id} />
                            {isSelf ? (
                              <span className="rounded-md border border-admin-border bg-admin-muted px-2 py-1 text-sm text-admin-fg-muted">
                                Роль: {roleLabel(u.role)}
                              </span>
                            ) : (
                              <select
                                name="role"
                                defaultValue={u.role}
                                className="rounded-md border border-admin-border px-2 py-1 text-sm"
                                aria-label={`Роль ${u.username}`}
                              >
                                {roleOptions.map((r) => (
                                  <option key={r} value={r}>
                                    {roleLabel(r)}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              name="password"
                              type="password"
                              placeholder="Новый пароль"
                              minLength={6}
                              className="w-36 rounded-md border border-admin-border px-2 py-1 text-sm"
                            />
                            <button
                              type="submit"
                              className="rounded-md border border-admin-border px-3 py-1 text-sm hover:bg-admin-muted"
                            >
                              Сохранить
                            </button>
                          </form>
                          {!isSelf ? (
                            <form action={deleteAdminUserAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                              >
                                Удалить
                              </button>
                            </form>
                          ) : null}
                        </div>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </TableWrap>
        )}
      </FormSection>
    </div>
  )
}
