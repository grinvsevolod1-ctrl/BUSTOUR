"use client"

import { Extension } from "@tiptap/core"
import { ReactRenderer } from "@tiptap/react"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"
import tippy, { type Instance as TippyInstance } from "tippy.js"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react"
import {
  Braces,
  GalleryHorizontal,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  PlayCircle,
  Quote,
  Table2,
  Type,
} from "lucide-react"
import { getAllShortcodesAction } from "@/app/admin/shortcode-actions"
import { emptyGridRow } from "@/components/admin/editor/media-helpers"
import {
  keywordsFromShortcode,
  slashQueryMatches,
} from "@/components/admin/editor/slash-command-search"
import type { ShortcodeRow } from "@/lib/shortcodes"
import { cn } from "@/lib/utils"

export type SlashItem = {
  id: string
  title: string
  description: string
  keywords: string[]
  icon: ReactNode
  command: (props: { editor: import("@tiptap/react").Editor; range: { from: number; to: number } }) => void
}

let shortcodesCache: ShortcodeRow[] | null = null
let shortcodesPromise: Promise<ShortcodeRow[]> | null = null

async function loadShortcodes(): Promise<ShortcodeRow[]> {
  if (shortcodesCache) return shortcodesCache
  if (!shortcodesPromise) {
    shortcodesPromise = getAllShortcodesAction()
      .then((rows) => {
        shortcodesCache = rows
        return rows
      })
      .catch(() => {
        shortcodesPromise = null
        return [] as ShortcodeRow[]
      })
  }
  return shortcodesPromise
}

/** Prefetch when Editor 2 mounts so first `/` is fast. */
export function prefetchSlashShortcodes() {
  void loadShortcodes()
}

function openShortcodePicker() {
  window.dispatchEvent(new CustomEvent("bustour:rich-editor-shortcodes"))
}

function buildBuiltinItems(): SlashItem[] {
  return [
    {
      id: "text",
      title: "Текст",
      description: "Обычный абзац",
      keywords: ["text", "текст", "paragraph", "абзац", "p", "para"],
      icon: <Type className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run()
      },
    },
    {
      id: "h2",
      title: "Заголовок 2",
      description: "Крупный подзаголовок",
      keywords: ["h2", "heading", "heading2", "заголовок", "title"],
      icon: <Heading2 className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
    },
    {
      id: "h3",
      title: "Заголовок 3",
      description: "Средний подзаголовок",
      keywords: ["h3", "heading", "heading3", "заголовок", "subtitle"],
      icon: <Heading3 className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
      },
    },
    {
      id: "bullet",
      title: "Маркированный список",
      description: "Список с точками",
      keywords: ["bullet", "list", "ul", "список", "маркированный", "точки"],
      icon: <List className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      id: "ordered",
      title: "Нумерованный список",
      description: "Список с цифрами",
      keywords: ["ordered", "ol", "number", "нумерованный", "цифры", "список"],
      icon: <ListOrdered className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      id: "quote",
      title: "Цитата",
      description: "Выделенная цитата",
      keywords: ["quote", "blockquote", "цитата", "blockquote"],
      icon: <Quote className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      id: "hr",
      title: "Разделитель",
      description: "Горизонтальная линия",
      keywords: ["hr", "divider", "разделитель", "линия", "line", "horizontal"],
      icon: <Minus className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
    {
      id: "grid",
      title: "Сетка",
      description: "Сетка медиа и текста",
      keywords: ["grid", "сетка", "media grid", "columns", "колонки"],
      icon: <GalleryHorizontal className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "mediaGrid",
            attrs: { cols: 3 },
            content: emptyGridRow(3),
          })
          .run()
      },
    },
    {
      id: "table",
      title: "Таблица",
      description: "Таблица с форматированием в ячейках",
      keywords: ["table", "таблица", "grid", "ячейки", "cells"],
      icon: <Table2 className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
    {
      id: "image",
      title: "Изображение",
      description: "Вставить картинку",
      keywords: ["image", "img", "picture", "изображение", "картинка", "фото", "media", "медиа"],
      icon: <ImageIcon className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        window.dispatchEvent(new CustomEvent("bustour:rich-editor-pick", { detail: { type: "image" } }))
      },
    },
    {
      id: "video",
      title: "Видео",
      description: "Загрузить видео",
      keywords: ["video", "видео", "mp4", "media", "медиа"],
      icon: <PlayCircle className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        window.dispatchEvent(new CustomEvent("bustour:rich-editor-pick", { detail: { type: "video" } }))
      },
    },
    {
      id: "youtube",
      title: "YouTube",
      description: "Вставить ссылку YouTube",
      keywords: ["youtube", "yt", "ютуб", "you tube"],
      icon: <PlayCircle className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        const url = window.prompt("Ссылка на YouTube-видео:")
        if (url) editor.commands.setYoutubeVideo({ src: url })
      },
    },
    {
      id: "shortcodes-picker",
      title: "Шорткоды",
      description: "Открыть список шорткодов",
      keywords: ["shortcode", "shortcodes", "шорткод", "шорткоды", "token", "токен", "snippet"],
      icon: <Braces className="h-4 w-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        openShortcodePicker()
      },
    },
  ]
}

function shortcodeToItem(row: ShortcodeRow): SlashItem {
  const token = `[${row.name}]`
  return {
    id: `sc:${row.id}:${row.name}`,
    title: token,
    description: row.description?.trim() || row.value,
    keywords: keywordsFromShortcode(row),
    icon: <Braces className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent(token).run()
    },
  }
}

function itemMatches(item: SlashItem, query: string): boolean {
  return slashQueryMatches(query, [item.title, item.description, item.id, ...item.keywords])
}

export async function resolveSlashItems(query: string): Promise<SlashItem[]> {
  const q = query.trim()
  const builtins = buildBuiltinItems().filter((item) => itemMatches(item, q))
  const rows = await loadShortcodes()
  const shortcodeItems = rows.map(shortcodeToItem).filter((item) => itemMatches(item, q))

  if (!q) {
    return builtins
  }

  // Shortcode hits first (e.g. /current_year), then block commands (/text).
  return [...shortcodeItems, ...builtins]
}

type MenuProps = {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

type MenuHandle = {
  onKeyDown: (props: { event: globalThis.KeyboardEvent }) => boolean
}

function confirmSlashKey(key: string): boolean {
  return key === "Enter" || key === "Tab"
}

const SlashMenu = forwardRef<MenuHandle, MenuProps>(function SlashMenu({ items, command }, ref) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [items])

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-slash-index="${selected}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((i) => (i + items.length - 1) % Math.max(items.length, 1))
        return true
      }
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % Math.max(items.length, 1))
        return true
      }
      if (confirmSlashKey(event.key)) {
        event.preventDefault()
        const item = items[selected]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (!items.length) {
    return (
      <div className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-fg-muted shadow-lg">
        Ничего не найдено
      </div>
    )
  }

  return (
    <div className="z-50 max-h-72 w-80 overflow-auto rounded-lg border border-admin-border bg-white p-1 shadow-lg">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          data-slash-index={index}
          className={cn(
            "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-admin-muted",
            index === selected && "bg-admin-muted",
          )}
          onClick={() => command(item)}
        >
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded border border-admin-border bg-white text-admin-fg-muted">
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-admin-fg" translate="no">
              {item.title}
            </span>
            <span className="block text-xs text-admin-fg-muted">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
})

/** Keep slash menu inside the viewport (flip above caret when near bottom). */
function slashTippyOptions(getRect: () => DOMRect, content: Element) {
  return {
    getReferenceClientRect: getRect,
    appendTo: () => document.body,
    content,
    showOnCreate: true,
    interactive: true,
    trigger: "manual" as const,
    placement: "bottom-start" as const,
    offset: [0, 6] as [number, number],
    maxWidth: "none" as const,
    zIndex: 60,
    popperOptions: {
      strategy: "fixed" as const,
      modifiers: [
        {
          name: "flip",
          options: {
            fallbackPlacements: ["top-start", "bottom-end", "top-end"],
            padding: 8,
          },
        },
        {
          name: "preventOverflow",
          options: {
            altAxis: true,
            tether: false,
            padding: 8,
            boundary: "viewport",
          },
        },
      ],
    },
  }
}

const suggestion: Omit<SuggestionOptions, "editor"> = {
  char: "/",
  allowSpaces: false,
  startOfLine: false,
  items: ({ query }) => resolveSlashItems(query),
  render: () => {
    let component: ReactRenderer<MenuHandle> | null = null
    let popup: TippyInstance[] | null = null

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashMenu, {
          props: {
            items: props.items,
            command: (item: SlashItem) => props.command(item),
          },
          editor: props.editor,
        })

        if (!props.clientRect) return

        popup = tippy("body", slashTippyOptions(props.clientRect as () => DOMRect, component.element))
      },
      onUpdate: (props) => {
        component?.updateProps({
          items: props.items,
          command: (item: SlashItem) => props.command(item),
        })
        if (!popup?.[0] || !props.clientRect) return
        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        })
        // Recalc after async item list / height change so flip stays valid.
        requestAnimationFrame(() => {
          popup?.[0]?.popperInstance?.update()
        })
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide()
          return true
        }
        return component?.ref?.onKeyDown(props) ?? false
      },
      onExit: () => {
        popup?.[0]?.destroy()
        component?.destroy()
        popup = null
        component = null
      },
    }
  },
  command: ({ editor, range, props }) => {
    const item = props as SlashItem
    item.command({ editor, range })
  },
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {} as Partial<SuggestionOptions>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestion,
        ...this.options.suggestion,
      }),
    ]
  },
})
