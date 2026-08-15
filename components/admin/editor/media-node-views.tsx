"use client"

import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"
import { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube"
import { NodeSelection } from "@tiptap/pm/state"
import { Settings2 } from "lucide-react"
import { useState, type CSSProperties } from "react"
import { MediaControls } from "./media-controls"
import { alignmentClass, type MediaAlignment } from "./media-helpers"

function nodeStyle(width: string | null, height: string | null): CSSProperties {
  return {
    width: width || undefined,
    height: height || undefined,
  }
}

function attrDimension(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return `${value}px`
  if (typeof value === "string") return value
  return ""
}

function MediaNodeView({
  node,
  selected,
  view,
  getPos,
  updateAttributes,
  children,
}: NodeViewProps & { children: React.ReactNode }) {
  const [controlsOpen, setControlsOpen] = useState(false)
  const alignment = (node.attrs.alignment as MediaAlignment) || "center"
  const width = attrDimension(node.attrs.width)
  const height = attrDimension(node.attrs.height) || null
  const mediaName = node.type.name

  const selectMedia = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element) || target.closest("button, [data-media-controls]")) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const pos = getPos()
    if (typeof pos !== "number") return

    const selection = NodeSelection.create(view.state.doc, pos)
    if (!view.state.selection.eq(selection)) {
      view.dispatch(view.state.tr.setSelection(selection))
    }
  }

  return (
    <NodeViewWrapper
      className={`group relative seo-media ${alignmentClass(alignment)}`}
      style={nodeStyle(width, height)}
      onMouseDown={selectMedia}
    >
      {children}
      <button
        type="button"
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md border border-admin-border bg-white/90 text-admin-fg-muted opacity-0 shadow-sm transition-opacity hover:bg-white hover:text-admin-fg group-hover:opacity-100"
        style={{ opacity: selected || controlsOpen ? 1 : undefined }}
        aria-label="Настроить медиа"
        title="Настроить медиа"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setControlsOpen((open) => !open)}
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {controlsOpen ? (
        <div
          data-media-controls
          className="absolute right-0 top-10 z-20"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <MediaControls
            alignment={alignment}
            width={width}
            height={height}
            alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""}
            onAlign={(next) => updateAttributes({ alignment: next })}
            onWidth={(next) => updateAttributes({ width: next })}
            onHeight={
              mediaName === "youtube" || mediaName === "video" || mediaName === "image"
                ? (next) => updateAttributes({ height: next })
                : undefined
            }
            hasHeight={mediaName === "youtube" || mediaName === "video" || mediaName === "image"}
            hasYoutubePresets={mediaName === "youtube"}
            onAlt={
              mediaName === "image"
                ? (next) => updateAttributes({ alt: next || null })
                : undefined
            }
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  )
}

export function ImageNodeView(props: NodeViewProps) {
  return (
    <MediaNodeView {...props}>
      <img
        src={String(props.node.attrs.src ?? "")}
        alt={String(props.node.attrs.alt ?? "")}
        title={props.node.attrs.title ? String(props.node.attrs.title) : undefined}
        className="block h-auto w-full"
      />
    </MediaNodeView>
  )
}

export function VideoNodeView(props: NodeViewProps) {
  return (
    <MediaNodeView {...props}>
      <video
        src={String(props.node.attrs.src ?? "")}
        controls
        playsInline
        className="block h-auto w-full"
      />
    </MediaNodeView>
  )
}

export function YoutubeNodeView(props: NodeViewProps) {
  const src = String(props.node.attrs.src ?? "")
  const embedSrc =
    getEmbedUrlFromYoutubeUrl({
      url: src,
      nocookie: true,
      controls: true,
      allowFullscreen: true,
      startAt: typeof props.node.attrs.start === "number" ? props.node.attrs.start : 0,
    }) ?? src

  return (
    <MediaNodeView {...props}>
      <iframe
        src={embedSrc}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="block aspect-video h-auto w-full border-0"
      />
    </MediaNodeView>
  )
}

const mediaNodeViewOptions = {
  stopEvent: ({ event }: { event: Event }) => {
    const target = event.target
    if (!(target instanceof Element)) return false
    return Boolean(target.closest("img, video, iframe, button, [data-media-controls]"))
  },
  ignoreMutation: () => true,
}

export const imageNodeView = ReactNodeViewRenderer(ImageNodeView, mediaNodeViewOptions)
export const videoNodeView = ReactNodeViewRenderer(VideoNodeView, mediaNodeViewOptions)
export const youtubeNodeView = ReactNodeViewRenderer(YoutubeNodeView, mediaNodeViewOptions)
