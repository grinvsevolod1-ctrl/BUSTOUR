"use client"

import { useState, useRef, useEffect, useId } from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type ComboboxOption = { id: number; name: string }

interface AdminComboboxProps {
  /** Field name submitted with the form (the text value) */
  name: string
  /** Options to show in the dropdown */
  options: ComboboxOption[]
  /** Controlled value (displayed text) */
  value: string
  valueId?: number
  valueIdName?: string
  /** Called when the user picks an existing option or types a new one */
  onChange: (value: string, id?: number) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  hint?: string
  /** When false, typing only filters existing options and cannot create values. */
  allowCreate?: boolean
  required?: boolean
  form?: string
}

export function AdminCombobox({
  name,
  options,
  value,
  valueId,
  valueIdName,
  onChange,
  placeholder = "Выберите или введите…",
  disabled = false,
  hint,
  allowCreate = true,
  required = false,
  form,
}: AdminComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes (e.g. when parent resets form)
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!allowCreate && query.trim() !== "") setQuery(value)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [allowCreate, value, query])

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))

  const exactMatch = options.some(
    (o) => o.name.trim().toLowerCase() === query.trim().toLowerCase(),
  )
  const showCreate = allowCreate && query.trim().length > 0 && !exactMatch

  function handleSelect(name: string, id?: number) {
    onChange(name, id)
    setQuery(name)
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setQuery(next)
    if (allowCreate) {
      onChange(next)
    } else if (next.trim() === "") {
      onChange("", undefined)
    }
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
      if (!allowCreate && query.trim() !== "") setQuery(value)
      inputRef.current?.blur()
    }
    if (e.key === "ArrowDown" && !open) {
      setOpen(true)
    }
  }

  const fieldBase =
    "w-full rounded-md border border-admin-border bg-white px-3 py-2 text-sm text-admin-fg placeholder:text-admin-fg-subtle transition-colors focus:border-admin-fg focus:outline-none focus:ring-2 focus:ring-admin-ring disabled:opacity-50"

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input carries the final submitted value */}
      <input type="hidden" name={name} value={allowCreate ? query : value} form={form} />
      {valueIdName ? <input type="hidden" name={valueIdName} value={valueId ?? ""} form={form} /> : null}

      {/* Visible input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (!allowCreate) {
              if (query.trim() !== "") setQuery(value)
              setOpen(false)
            }
          }}
          onKeyDown={handleKeyDown}
          required={required}
          className={cn(fieldBase, "pr-8")}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setOpen((v) => {
              const next = !v
              if (!next && !allowCreate && query.trim() !== "") setQuery(value)
              return next
            })
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-admin-fg-subtle hover:text-admin-fg"
          aria-label="Открыть список"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")}
          />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-admin-border bg-white py-1 shadow-lg"
        >
          {/* "Create new" row */}
          {showCreate && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onPointerDown={(e) => {
                e.preventDefault()
                handleSelect(query.trim())
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-admin-fg hover:bg-admin-muted"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-admin-fg-muted" />
              <span>
                Создать{" "}
                <span className="font-medium text-admin-fg">&ldquo;{query.trim()}&rdquo;</span>
              </span>
            </button>
          )}

          {/* Existing options */}
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-sm text-admin-fg-muted">Ничего не найдено</p>
          )}
          {filtered.map((opt) => {
            const selected = query.trim().toLowerCase() === opt.name.trim().toLowerCase()
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={selected}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleSelect(opt.name, opt.id)
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-admin-muted",
                  selected ? "bg-admin-muted/60 font-medium text-admin-fg" : "text-admin-fg",
                )}
              >
                <span>{opt.name}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-admin-fg-muted" />}
              </button>
            )
          })}
        </div>
      )}

      {hint && <p className="mt-1 text-xs text-admin-fg-subtle">{hint}</p>}
    </div>
  )
}
