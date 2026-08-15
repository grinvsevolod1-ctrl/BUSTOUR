import { ChevronUp, ChevronDown } from "lucide-react"

/** Up/down forms for admin table reorder (same pattern as BlockRow). */
export function SortOrderButtons({
  action,
  id,
  isFirst,
  isLast,
}: {
  action: (formData: FormData) => void | Promise<void>
  id: number
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex flex-col">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <button
          type="submit"
          disabled={isFirst}
          aria-label="Выше"
          className="grid h-5 w-6 place-items-center rounded text-admin-fg-subtle transition-colors hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <button
          type="submit"
          disabled={isLast}
          aria-label="Ниже"
          className="grid h-5 w-6 place-items-center rounded text-admin-fg-subtle transition-colors hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
