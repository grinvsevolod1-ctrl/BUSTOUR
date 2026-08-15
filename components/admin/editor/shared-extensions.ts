import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { TableKit } from "@tiptap/extension-table"
import type { Extensions } from "@tiptap/core"
import { MediaGrid, MediaGridCell } from "@/components/admin/editor/media-grid-extension"
import { SeoImage } from "@/components/admin/editor/image-extension"
import { UploadedVideo } from "@/components/admin/editor/video-extension"
import { SeoYoutube } from "@/components/admin/editor/youtube-extension"
import { ShortcodeHighlight } from "@/components/admin/editor/shortcode-highlight"

export function createRichEditorExtensions(options?: {
  placeholder?: string
  withPlaceholder?: boolean
}): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({ link: false }),
    Link.configure({ openOnClick: false, autolink: true }),
    TableKit.configure({
      table: { resizable: false, HTMLAttributes: { class: "seo-table" } },
    }),
    SeoImage,
    UploadedVideo,
    MediaGridCell,
    MediaGrid,
    SeoYoutube.configure({ nocookie: true }),
    ShortcodeHighlight,
  ]

  if (options?.withPlaceholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder || "Введите «/» для команд…",
        emptyEditorClass: "is-editor-empty",
        emptyNodeClass: "is-empty",
      }),
    )
  }

  return extensions
}
