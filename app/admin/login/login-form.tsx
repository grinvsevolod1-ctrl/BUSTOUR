"use client"

import { useActionState } from "react"
import { loginAction } from "../actions"
import { Button, Input, Label } from "@/components/admin/ui"

export function LoginForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-admin-fg text-lg font-bold text-white">
          Б
        </span>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-admin-fg">Вход в панель</h1>
          <p className="text-sm text-admin-fg-muted">БасТур — администрирование</p>
        </div>
      </div>

      <form action={action} className="space-y-4 rounded-xl border border-admin-border bg-white p-6 shadow-sm">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {state?.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <div>
          <Label htmlFor="username">Логин</Label>
          <Input id="username" name="username" type="text" autoComplete="username" required autoFocus />
        </div>

        <div>
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Вход…" : "Войти"}
        </Button>
      </form>
    </div>
  )
}
