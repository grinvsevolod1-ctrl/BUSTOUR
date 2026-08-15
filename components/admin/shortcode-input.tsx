"use client"

import { useEffect, useRef, useState } from "react"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { EditorContent, useEditor } from "@tiptap/react"
import { ShortcodeHighlight } from "@/components/admin/editor/shortcode-highlight"
import { cn } from "@/lib/utils"

type ShortcodeInputProps = {
  id?: string
  name: string
  /** Accessible label — rendered as aria-label on the textbox. */
  label?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  form?: string
  multiline?: boolean
  rows?: number
  className?: string
}

function textDocument(value: string) {
  return {
    type: "doc",
    content: value.split("\n").map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : undefined,
    })),
  }
}

export function ShortcodeInput({
  id,
  name,
  label,
  defaultValue = "",
  placeholder,
  required,
  form,
  multiline = false,
  rows = 3,
  className,
}: ShortcodeInputProps) {
  const [value, setValue] = useState(defaultValue)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [Document, Paragraph, Text, ShortcodeHighlight],
    content: textDocument(defaultValue),
    editorProps: {
      attributes: {
        id: id ?? "",
        role: "textbox",
        "aria-multiline": String(multiline),
        "aria-label": label ?? "",
        "aria-required": String(Boolean(required)),
        "data-placeholder": placeholder ?? "",
        class: "outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (!multiline && event.key === "Enter") return true
        return false
      },
      handlePaste: (_view, event) => {
        if (multiline) return false
        const text = event.clipboardData?.getData("text/plain")
        if (!text || !/[\r\n]/.test(text)) return false
        editor?.commands.insertContent(text.replace(/[\r\n]+/g, " "))
        return true
      },
    },
    onUpdate: ({ editor }) => setValue(editor.getText({ blockSeparator: "\n" })),
  })

  useEffect(() => {
    if (editor && editor.getText({ blockSeparator: "\n" }) !== defaultValue) {
      editor.commands.setContent(textDocument(defaultValue), { emitUpdate: false })
      setValue(defaultValue)
    }
  }, [defaultValue, editor])

  // SlugField listens for DOM "input" on the value source; React controlled updates don't fire it.
  // Skip the mount pass: dispatching on initial value marked pristine admin forms
  // as dirty (false "unsaved changes" dialog on every tour page).
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const el = hiddenRef.current
    if (!el) return
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }, [value])

  return (
    <div
      className={cn(
        "shortcode-input w-full rounded-md border border-admin-border bg-white px-3 text-sm text-admin-fg transition-colors focus-within:border-admin-fg focus-within:ring-2 focus-within:ring-admin-ring",
        multiline
          ? "shortcode-input--multiline min-h-[80px] overflow-y-auto py-2"
          : "shortcode-input--single h-10 max-h-10 overflow-hidden py-0",
        className,
      )}
      style={multiline ? { minHeight: `${Math.max(rows, 2) * 1.5 + 1}rem` } : undefined}
    >
      <EditorContent editor={editor} />
      <input
        ref={hiddenRef}
        type="hidden"
        id={id ? `${id}__value` : undefined}
        name={name}
        value={value}
        form={form}
        required={required}
      />
    </div>
  )
}

/** Single-line shortcode field — fixed height (same as shortcode-textarea type). */
export function ShortcodeTextarea(props: Omit<ShortcodeInputProps, "multiline">) {
  return <ShortcodeInput {...props} multiline={false} />
}

/** Tall multiline shortcode field (default 8 rows). */
export function ShortcodeTextareaMultiline(props: Omit<ShortcodeInputProps, "multiline">) {
  return <ShortcodeInput {...props} multiline rows={props.rows ?? 8} />
}
