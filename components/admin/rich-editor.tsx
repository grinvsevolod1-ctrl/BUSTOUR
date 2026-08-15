"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { useEffect, useState } from "react"
import {
  Bold,
  Braces,
  GalleryHorizontal,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Link,
  Minus,
  PlayCircle,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Undo2,
  Video,
} from "lucide-react"
import { plainCmsText } from "@/lib/cms-public-text"
import { cn } from "@/lib/utils"
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog"
import { ShortcodePickerDialog } from "@/components/admin/shortcode-picker-dialog"
import { emptyGridRow } from "@/components/admin/editor/media-helpers"
import {
  gridMediaInsertsBlocked,
  gridTextFormatsBlocked,
  selectionIsAtomMedia,
} from "@/components/admin/editor/editor-toolbar-context"
import { createRichEditorExtensions } from "@/components/admin/editor/shared-extensions"
import { SlashCommands, prefetchSlashShortcodes } from "@/components/admin/editor/slash-command"
import {
  readRichEditorVariant,
  writeRichEditorVariant,
  type RichEditorVariant,
} from "@/components/admin/editor/rich-editor-preference"
import type { UploadedFile } from "@/components/admin/media-uploader"
import "tippy.js/dist/tippy.css"

type ToolButtonProps = {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}

function ToolButton({ onClick, active, disabled, label, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-transparent text-admin-fg-muted transition-colors hover:border-admin-border hover:bg-admin-muted hover:text-admin-fg disabled:pointer-events-none disabled:opacity-40",
        active && "border-admin-border bg-admin-muted text-admin-fg",
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-admin-border" aria-hidden />
}

/** Stable ref — inline `{ placement: "top" }` re-triggers BubbleMenu updateOptions → render loop. */
const BLOCKS_BUBBLE_OPTIONS = { placement: "top" as const }

function useMediaToolbar(editor: Editor) {
  const [picker, setPicker] = useState<"image" | "video" | null>(null)
  const [shortcodesOpen, setShortcodesOpen] = useState(false)
  const [, setSel] = useState(0)

  useEffect(() => {
    let raf = 0
    const bump = () => {
      // Coalesce: BubbleMenu / tippy may emit meta-only txs on every paint.
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setSel((n) => n + 1)
      })
    }
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean; selectionSet: boolean } }) => {
      // Skip plugin/meta-only updates (BubbleMenu loop: render → dispatch → bump → render).
      if (!transaction.docChanged && !transaction.selectionSet) return
      bump()
    }
    editor.on("selectionUpdate", bump)
    editor.on("transaction", onTransaction)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      editor.off("selectionUpdate", bump)
      editor.off("transaction", onTransaction)
    }
  }, [editor])

  useEffect(() => {
    const onPick = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: "image" | "video" }>).detail
      if (detail?.type === "image" || detail?.type === "video") setPicker(detail.type)
    }
    const onShortcodes = () => setShortcodesOpen(true)
    window.addEventListener("bustour:rich-editor-pick", onPick)
    window.addEventListener("bustour:rich-editor-shortcodes", onShortcodes)
    return () => {
      window.removeEventListener("bustour:rich-editor-pick", onPick)
      window.removeEventListener("bustour:rich-editor-shortcodes", onShortcodes)
    }
  }, [])

  const mediaInsertsOff = gridMediaInsertsBlocked(editor)
  const textFormatsOff = gridTextFormatsBlocked(editor)

  const pickMedia = (file: UploadedFile) => {
    if (mediaInsertsOff) return
    if (file.type === "image") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: file.url, alt: file.alt || file.name, alignment: "center" },
        })
        .run()
    } else if (file.type === "video") {
      editor.chain().focus().setUploadedVideo({ src: file.url, alignment: "center" }).run()
    }
    setPicker(null)
  }

  const addGrid = () => {
    if (mediaInsertsOff) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: "mediaGrid",
        attrs: { cols: 3 },
        content: emptyGridRow(3),
      })
      .run()
  }

  const addYoutube = () => {
    if (mediaInsertsOff) return
    const url = window.prompt("Ссылка на YouTube-видео:")
    if (url) editor.commands.setYoutubeVideo({ src: url })
  }

  const addTable = () => {
    if (mediaInsertsOff) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return {
    picker,
    setPicker,
    shortcodesOpen,
    setShortcodesOpen,
    mediaInsertsOff,
    textFormatsOff,
    pickMedia,
    addGrid,
    addYoutube,
    addTable,
  }
}

function ClassicToolbar({ editor }: { editor: Editor }) {
  const t = useMediaToolbar(editor)

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-0.5 border-b border-admin-border bg-white/95 p-1.5 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
      <ToolButton label="Жирный" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Курсив" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Зачёркнутый"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Ссылка"
        disabled={t.textFormatsOff}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run()
          } else {
            const url = window.prompt("Введите URL-ссылку:")
            if (url) editor.chain().focus().toggleLink({ href: url }).run()
          }
        }}
        active={editor.isActive("link")}
      >
        <Link className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton
        label="Заголовок 2"
        disabled={t.textFormatsOff}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Заголовок 3"
        disabled={t.textFormatsOff}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton
        label="Маркированный список"
        disabled={t.textFormatsOff}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Нумерованный список"
        disabled={t.textFormatsOff}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Цитата"
        disabled={t.textFormatsOff}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Разделитель"
        disabled={t.mediaInsertsOff}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton label="Шорткоды" onClick={() => t.setShortcodesOpen(true)} disabled={selectionIsAtomMedia(editor)}>
        <Braces className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Изображение" disabled={t.mediaInsertsOff} onClick={() => t.setPicker("image")}>
        <ImageIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Видео" disabled={t.mediaInsertsOff} onClick={() => t.setPicker("video")}>
        <Video className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="YouTube-видео" disabled={t.mediaInsertsOff} onClick={t.addYoutube}>
        <PlayCircle className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Сетка" disabled={t.mediaInsertsOff} onClick={t.addGrid}>
        <GalleryHorizontal className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Таблица" disabled={t.mediaInsertsOff} onClick={t.addTable}>
        <Table2 className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton label="Отменить" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Повторить" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>
      <MediaPickerDialog
        open={t.picker !== null}
        lockType={t.picker ?? undefined}
        onPick={t.pickMedia}
        onClose={() => t.setPicker(null)}
      />
      <ShortcodePickerDialog
        open={t.shortcodesOpen}
        onClose={() => t.setShortcodesOpen(false)}
        onPick={(token) => {
          editor.chain().focus().insertContent(token).run()
        }}
      />
    </div>
  )
}

function BlocksChrome({ editor }: { editor: Editor }) {
  const t = useMediaToolbar(editor)

  useEffect(() => {
    prefetchSlashShortcodes()
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-admin-border bg-admin-muted/40 px-1.5 py-1">
        <span className="mr-1 px-1 text-[11px] text-admin-fg-muted">Наберите / для блоков</span>
        <ToolButton label="Шорткоды" onClick={() => t.setShortcodesOpen(true)} disabled={selectionIsAtomMedia(editor)}>
          <Braces className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Изображение" disabled={t.mediaInsertsOff} onClick={() => t.setPicker("image")}>
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Видео" disabled={t.mediaInsertsOff} onClick={() => t.setPicker("video")}>
          <Video className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="YouTube-видео" disabled={t.mediaInsertsOff} onClick={t.addYoutube}>
          <PlayCircle className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Сетка" disabled={t.mediaInsertsOff} onClick={t.addGrid}>
          <GalleryHorizontal className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Таблица" disabled={t.mediaInsertsOff} onClick={t.addTable}>
          <Table2 className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Отменить" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Повторить" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </div>

      <BubbleMenu
        editor={editor}
        options={BLOCKS_BUBBLE_OPTIONS}
        className="flex items-center gap-0.5 rounded-lg border border-admin-border bg-white p-1 shadow-lg"
      >
        <ToolButton label="Жирный" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Курсив" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Зачёркнутый"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Ссылка"
          disabled={t.textFormatsOff}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run()
            } else {
              const url = window.prompt("Введите URL-ссылку:")
              if (url) editor.chain().focus().toggleLink({ href: url }).run()
            }
          }}
          active={editor.isActive("link")}
        >
          <Link className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Заголовок 2"
          disabled={t.textFormatsOff}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Заголовок 3"
          disabled={t.textFormatsOff}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Список"
          disabled={t.textFormatsOff}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Цитата"
          disabled={t.textFormatsOff}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </ToolButton>
      </BubbleMenu>

      <MediaPickerDialog
        open={t.picker !== null}
        lockType={t.picker ?? undefined}
        onPick={t.pickMedia}
        onClose={() => t.setPicker(null)}
      />
      <ShortcodePickerDialog
        open={t.shortcodesOpen}
        onClose={() => t.setShortcodesOpen(false)}
        onPick={(token) => {
          editor.chain().focus().insertContent(token).run()
        }}
      />
    </>
  )
}

function VariantSwitch({
  value,
  onChange,
}: {
  value: RichEditorVariant
  onChange: (next: RichEditorVariant) => void
}) {
  return (
    <div
      className="flex items-center gap-1 border-b border-admin-border bg-admin-muted/30 px-2 py-1"
      role="group"
      aria-label="Вариант редактора"
    >
      <button
        type="button"
        className={cn(
          "rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30",
          value === "classic" ? "bg-admin-fg text-white" : "text-admin-fg-muted hover:bg-white",
        )}
        onClick={() => onChange("classic")}
      >
        Редактор 1
      </button>
      <button
        type="button"
        className={cn(
          "rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30",
          value === "blocks" ? "bg-admin-fg text-white" : "text-admin-fg-muted hover:bg-white",
        )}
        onClick={() => onChange("blocks")}
      >
        Редактор 2
      </button>
      <span className="ml-auto text-[11px] text-admin-fg-muted">
        {value === "classic" ? "панель1" : "панель2"}
      </span>
    </div>
  )
}

function EditorSurface({
  variant,
  name,
  defaultValue,
  placeholder,
  onChange,
  minHeight,
  required,
  form,
}: {
  variant: RichEditorVariant
  name: string
  defaultValue: string
  placeholder: string
  onChange?: (html: string) => void
  minHeight: string
  required: boolean
  form?: string
}) {
  const [html, setHtml] = useState(defaultValue)

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        ...createRichEditorExtensions({
          placeholder: variant === "blocks" ? "Введите «/» для команд…" : placeholder,
          withPlaceholder: variant === "blocks",
        }),
        ...(variant === "blocks" ? [SlashCommands] : []),
      ],
      content: defaultValue,
      editorProps: {
        attributes: {
          class: "prose-editor px-4 py-3 focus:outline-none",
          style: `min-height: ${minHeight}`,
          "data-placeholder": placeholder,
        },
      },
      onUpdate: ({ editor: ed }) => {
        const next = ed.isEmpty ? "" : ed.getHTML()
        setHtml(next)
        onChange?.(next)
      },
      onCreate: ({ editor: ed }) => {
        const next = ed.isEmpty ? "" : ed.getHTML()
        // TipTap can report empty briefly before content applies — don't wipe FormData.
        if (!next && defaultValue) return
        setHtml(next)
        // Deliberately NOT calling onChange here: initialization normalizes HTML
        // (e.g. attribute order), which is not a user edit. Propagating it marked
        // pristine forms as dirty and triggered false "unsaved changes" dialogs.
      },
    },
    [variant],
  )

  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? "" : editor.getHTML()
    if (defaultValue !== current) {
      editor.commands.setContent(defaultValue || "", { emitUpdate: false })
      setHtml(defaultValue)
    }
    // Only sync when remounting variant / external default — avoid fighting typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return (
    <>
      {editor && variant === "classic" ? <ClassicToolbar editor={editor} /> : null}
      {editor && variant === "blocks" ? <BlocksChrome editor={editor} /> : null}
      <EditorContent editor={editor} />
      <input
        type={required ? "text" : "hidden"}
        name={name}
        value={html}
        form={form}
        className={required ? "sr-only" : undefined}
        required={required}
        readOnly
      />
    </>
  )
}

export function RichEditor({
  name,
  defaultValue = "",
  placeholder = "Введите текст…",
  onChange,
  minHeight = "200px",
  required = false,
  form,
  collapseEmpty = false,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  onChange?: (html: string) => void
  minHeight?: string
  required?: boolean
  /** Associate hidden field with an external &lt;form id&gt; (portal forms). */
  form?: string
  /** Start as collapsed ~40px chrome (expand to full editor). */
  collapseEmpty?: boolean
}) {
  const [variant, setVariant] = useState<RichEditorVariant>("classic")
  const [ready, setReady] = useState(false)
  const [content, setContent] = useState(defaultValue)
  const [dirty, setDirty] = useState(false)
  const [expanded, setExpanded] = useState(!collapseEmpty)

  useEffect(() => {
    setVariant(readRichEditorVariant(name))
    setReady(true)
  }, [name])

  function switchVariant(next: RichEditorVariant) {
    setVariant(next)
    writeRichEditorVariant(name, next)
  }

  if (collapseEmpty && !expanded) {
    const preview = plainCmsText(content)
    return (
      <div>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-md border border-admin-border bg-white px-3 text-left transition-colors hover:bg-admin-muted"
          onClick={() => setExpanded(true)}
          aria-label={`Развернуть: ${preview || placeholder || "пустое поле"}`}
        >
          <span className="min-w-0 flex-1 truncate text-sm text-admin-fg-muted">
            {preview || placeholder || "Пусто — нажмите «Развернуть»"}
          </span>
          <span className="shrink-0 text-xs font-medium text-admin-fg-muted">+ Развернуть</span>
        </button>
        <input type="hidden" name={name} value={content} form={form} readOnly />
      </div>
    )
  }

  return (
    <div className="rounded-md border border-admin-border bg-white">
      {collapseEmpty ? (
        <div className="flex justify-end border-b border-admin-border px-2 py-1">
          <button type="button" className="text-xs text-admin-fg-muted hover:text-admin-fg" onClick={() => setExpanded(false)}>
            Свернуть
          </button>
        </div>
      ) : null}
      {ready ? <VariantSwitch value={variant} onChange={switchVariant} /> : null}
      {ready ? (
        <EditorSurface
          key={`${name}:${variant}`}
          variant={variant}
          name={name}
          defaultValue={content}
          placeholder={placeholder}
          minHeight={collapseEmpty ? "120px" : minHeight}
          required={required}
          form={form}
          onChange={(html) => {
            setDirty(true)
            setContent(html)
            onChange?.(html)
          }}
        />
      ) : (
        <>
          <div className="px-4 py-3 text-sm text-admin-fg-muted" style={{ minHeight: collapseEmpty ? "120px" : minHeight }}>
            Загрузка редактора…
          </div>
          <input type="hidden" name={name} value={content} form={form} readOnly />
        </>
      )}
      {dirty ? <input type="hidden" name={`__rich_dirty:${name}`} value="1" form={form} /> : null}
    </div>
  )
}
