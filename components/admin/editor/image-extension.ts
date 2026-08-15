import Image from "@tiptap/extension-image"
import { mergeAttributes } from "@tiptap/core"
import {
  alignmentClass,
  mediaStyle,
  parseMediaAlignment,
  parseMediaWidth,
  type MediaAlignment,
} from "./media-helpers"
import { imageNodeView } from "./media-node-views"

export const SeoImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element: Element) => parseMediaWidth(element),
        renderHTML: (attributes: { width?: string | null }) => ({ width: attributes.width }),
      },
      height: {
        default: null,
        parseHTML: (element: Element) => element.getAttribute("height") || null,
        renderHTML: (attributes: { height?: string | null }) => ({ height: attributes.height }),
      },
      alignment: {
        default: "center" as MediaAlignment,
        parseHTML: (element: Element) => parseMediaAlignment(element),
        renderHTML: (attributes: { alignment?: MediaAlignment }) => ({ alignment: attributes.alignment }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, alignment, ...attributes } = HTMLAttributes
    return [
      "img",
      mergeAttributes(attributes, {
        class: `seo-media ${alignmentClass(alignment)}`,
        "data-align": alignment,
        style: mediaStyle(width, height),
      }),
    ]
  },

  parseHTML() {
    return [{ tag: "img[src]" }]
  },

  addNodeView() {
    return imageNodeView
  },
})
