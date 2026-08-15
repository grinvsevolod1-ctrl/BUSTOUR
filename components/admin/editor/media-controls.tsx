"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { normalizeMediaHeight, normalizeMediaWidth, type MediaAlignment } from "./media-helpers"
import { Lock, Unlock } from "lucide-react"

const DEFAULT_YOUTUBE_RATIO = 16 / 9

export type YoutubeSizePreset = { label: string; width: number; height: number }
const YOUTUBE_PRESETS: YoutubeSizePreset[] = [
  { label: "480p", width: 640, height: 360 },
  { label: "720p", width: 854, height: 480 },
  { label: "HD", width: 1280, height: 720 },
  { label: "FHD", width: 1920, height: 1080 },
]

export function MediaControls({
  alignment,
  width,
  height,
  alt,
  onAlign,
  onWidth,
  onHeight,
  onAlt,
  hasHeight,
  hasYoutubePresets,
}: {
  alignment: MediaAlignment
  width: string
  height?: string | null
  alt?: string | null
  onAlign: (alignment: MediaAlignment) => void
  onWidth: (width: string | null) => void
  onHeight?: (height: string | null) => void
  onAlt?: (alt: string) => void
  hasHeight?: boolean
  hasYoutubePresets?: boolean
}) {
  const [draftWidth, setDraftWidth] = useState(width)
  const [draftHeight, setDraftHeight] = useState(height ?? "")
  const [draftAlt, setDraftAlt] = useState(alt ?? "")
  const [lockRatio, setLockRatio] = useState(true)

  useEffect(() => {
    setDraftWidth(width)
  }, [width])

  useEffect(() => {
    setDraftHeight(height ?? "")
  }, [height])

  useEffect(() => {
    setDraftAlt(alt ?? "")
  }, [alt])

  function pxNumber(v: string): number | null {
    const m = v.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(px|%)$/)
    if (!m) return null
    const n = Number(m[1])
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }

  function commitWidth() {
    if (!draftWidth.trim()) {
      onWidth(null)
      if (hasHeight && lockRatio) {
        onHeight?.(null)
        setDraftHeight("")
      }
      return
    }
    const normalized = normalizeMediaWidth(draftWidth)
    if (!normalized) return
    setDraftWidth(normalized)
    onWidth(normalized)
    if (hasHeight && lockRatio && onHeight) {
      const w = pxNumber(normalized)
      if (w && normalized.endsWith("px")) {
        const h = Math.round(w / DEFAULT_YOUTUBE_RATIO)
        const next = `${h}px`
        setDraftHeight(next)
        onHeight(next)
      }
    }
  }

  function commitHeight() {
    if (!onHeight) return
    if (!draftHeight.trim()) {
      onHeight(null)
      if (lockRatio) {
        onWidth(null)
        setDraftWidth("")
      }
      return
    }
    const normalized = normalizeMediaHeight(draftHeight)
    if (!normalized) return
    setDraftHeight(normalized)
    onHeight(normalized)
    if (lockRatio) {
      const h = pxNumber(normalized)
      if (h) {
        const w = Math.round(h * DEFAULT_YOUTUBE_RATIO)
        const next = `${w}px`
        setDraftWidth(next)
        onWidth(next)
      }
    }
  }

  const wrapHint =
    alignment === "left"
      ? "Текст в следующем абзаце обтекает справа. Ширина ~50% обычно удобнее."
      : alignment === "right"
        ? "Текст в следующем абзаце обтекает слева. Ширина ~50% обычно удобнее."
        : null

  return (
    <div className="flex min-w-[18rem] flex-col gap-1.5 rounded-lg border border-admin-border bg-white p-1.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-1">
      {([
        ["left", "Слева (текст справа)"],
        ["center", "По центру"],
        ["right", "Справа (текст слева)"],
        ["full", "На всю ширину"],
      ] as [MediaAlignment, string][]).map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={cn(
            "rounded px-2 py-1 text-xs text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg",
            alignment === value && "bg-admin-muted text-admin-fg",
          )}
          onClick={() => onAlign(value)}
        >
          {label}
        </button>
      ))}
      <span className="mx-0.5 h-5 w-px bg-admin-border" aria-hidden />
      {[25, 50, 100].map((value) => (
        <button
          key={value}
          type="button"
          className="rounded px-2 py-1 text-xs text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
          onClick={() => {
            const next = `${value}%`
            setDraftWidth(next)
            onWidth(next)
            if (hasHeight && lockRatio && onHeight) {
              onHeight(null)
              setDraftHeight("")
            }
          }}
        >
          {value}%
        </button>
      ))}
      <input
        value={draftWidth}
        onChange={(event) => setDraftWidth(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitWidth()
          }
        }}
        onBlur={commitWidth}
        placeholder="320px / 50%"
        aria-label="Ширина медиа"
        className="h-7 w-24 rounded border border-admin-border px-2 text-xs text-admin-fg outline-none focus:border-admin-fg"
      />
      </div>

      {hasHeight ? (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded px-2 text-xs",
              lockRatio
                ? "bg-admin-muted text-admin-fg"
                : "text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg",
            )}
            onClick={() => setLockRatio((v) => !v)}
            title={lockRatio ? "Пропорции 16:9 зафиксированы" : "Изменять ширину и высоту независимо"}
          >
            {lockRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span className="font-mono">16:9</span>
          </button>
          <span className="mx-0.5 h-5 w-px bg-admin-border" aria-hidden />
          {hasYoutubePresets
            ? YOUTUBE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded px-2 py-1 text-xs text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
                  onClick={() => {
                    const w = `${preset.width}px`
                    const h = `${preset.height}px`
                    setDraftWidth(w)
                    setDraftHeight(h)
                    onWidth(w)
                    onHeight?.(h)
                  }}
                  title={`${preset.width} × ${preset.height}`}
                >
                  {preset.label}
                </button>
              ))
            : null}
          <input
            value={draftHeight}
            onChange={(event) => setDraftHeight(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitHeight()
              }
            }}
            onBlur={commitHeight}
            placeholder="Высота, px"
            aria-label="Высота медиа"
            className="h-7 w-24 rounded border border-admin-border px-2 text-xs text-admin-fg outline-none focus:border-admin-fg"
          />
        </div>
      ) : null}

      {wrapHint ? (
        <p className="px-1 text-[11px] leading-snug text-admin-fg-muted">{wrapHint}</p>
      ) : null}
      {onAlt ? (
        <input
          value={draftAlt}
          onChange={(event) => setDraftAlt(event.target.value)}
          onBlur={() => onAlt(draftAlt.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onAlt(draftAlt.trim())
            }
          }}
          placeholder="Alt изображения"
          aria-label="Alt изображения"
          className="h-7 w-full rounded border border-admin-border px-2 text-xs text-admin-fg outline-none focus:border-admin-fg"
        />
      ) : null}
    </div>
  )
}
