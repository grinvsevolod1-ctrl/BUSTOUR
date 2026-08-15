"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"
import { Bold, Italic, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"

function ToolButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-6 w-6 place-items-center rounded border border-transparent text-admin-fg-muted hover:border-admin-border hover:bg-admin-muted hover:text-admin-fg",
        active && "border-admin-border bg-admin-muted text-admin-fg",
      )}
    >
      {children}
    </button>
  )
}

function MiniToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 border-b border-admin-border bg-admin-muted/40 px-1 py-0.5">
      <ToolButton
        label="Жирный"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3 w-3" />
      </ToolButton>
      <ToolButton
        label="Курсив"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3 w-3" />
      </ToolButton>
      <ToolButton
        label="Маркированный список"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3 w-3" />
      </ToolButton>
      <ToolButton
        label="Нумерованный список"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3 w-3" />
      </ToolButton>
    </div>
  )
}

/** Compact TipTap for resort comparison cells (bold/lists only — no media/tables). */
export function CellRichEditor({
  value,
  onChange,
  placeholder = "",
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose-editor px-2 py-1.5 text-xs focus:outline-none min-h-[56px]",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.isEmpty ? "" : ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.isEmpty ? "" : editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div className={cn("min-h-[60px] rounded border border-admin-border bg-white text-xs text-admin-fg-muted", className)}>
        …
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded border border-admin-border bg-white", className)}>
      <MiniToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
