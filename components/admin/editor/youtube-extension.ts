import Youtube, { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube"
import { mergeAttributes } from "@tiptap/core"
import {
  alignmentClass,
  mediaStyle,
  normalizeMediaWidth,
  parseMediaAlignment,
  parseMediaWidth,
  type MediaAlignment,
} from "./media-helpers"
import { youtubeNodeView } from "./media-node-views"

function coerceMediaDimension(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}px`
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = normalizeMediaWidth(trimmed)
    if (normalized) return normalized
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber) && asNumber > 0) return `${asNumber}px`
    return null
  }
  return null
}

function youtubeHost(element: Element): Element {
  return element.closest("[data-youtube-video]") ?? element
}

export const SeoYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: Element) => {
          const host = youtubeHost(element)
          return (
            parseMediaWidth(host) ??
            coerceMediaDimension(host.getAttribute("width") ?? element.getAttribute("width"))
          )
        },
        renderHTML: (attributes: { width?: string | number | null }) => {
          const width = coerceMediaDimension(attributes.width)
          return width ? { width } : {}
        },
      },
      height: {
        default: null,
        parseHTML: (element: Element) => {
          const host = youtubeHost(element)
          return coerceMediaDimension(host.getAttribute("height") ?? element.getAttribute("height"))
        },
        renderHTML: (attributes: { height?: string | number | null }) => {
          const height = coerceMediaDimension(attributes.height)
          return height ? { height } : {}
        },
      },
      alignment: {
        default: "center" as MediaAlignment,
        parseHTML: (element: Element) => parseMediaAlignment(youtubeHost(element)),
        renderHTML: (attributes: { alignment?: MediaAlignment }) => ({
          alignment: attributes.alignment,
        }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, alignment, src, start, ...rest } = HTMLAttributes
    const embedUrl = getEmbedUrlFromYoutubeUrl({
      url: src,
      allowFullscreen: this.options.allowFullscreen,
      autoplay: this.options.autoplay,
      ccLanguage: this.options.ccLanguage,
      ccLoadPolicy: this.options.ccLoadPolicy,
      controls: this.options.controls,
      disableKBcontrols: this.options.disableKBcontrols,
      enableIFrameApi: this.options.enableIFrameApi,
      endTime: this.options.endTime,
      interfaceLanguage: this.options.interfaceLanguage,
      ivLoadPolicy: this.options.ivLoadPolicy,
      loop: this.options.loop,
      modestBranding: this.options.modestBranding,
      nocookie: this.options.nocookie,
      origin: this.options.origin,
      playlist: this.options.playlist,
      progressBarColor: this.options.progressBarColor,
      startAt: start || 0,
      rel: this.options.rel,
    })

    return [
      "div",
      {
        "data-youtube-video": "",
        "data-align": alignment,
        class: `seo-media ${alignmentClass(alignment)}`,
        style: mediaStyle(coerceMediaDimension(width), coerceMediaDimension(height)),
      },
      [
        "iframe",
        mergeAttributes(this.options.HTMLAttributes, rest, {
          src: embedUrl,
          allowfullscreen: this.options.allowFullscreen,
          frameborder: "0",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        }),
      ],
    ]
  },

  addNodeView() {
    return youtubeNodeView
  },
})
