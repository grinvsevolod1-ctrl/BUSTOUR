import { Node, mergeAttributes } from "@tiptap/core"
import {
  alignmentClass,
  mediaStyle,
  parseMediaAlignment,
  parseMediaWidth,
  type MediaAlignment,
} from "./media-helpers"
import { videoNodeView } from "./media-node-views"

export type UploadedVideoAttributes = {
  src: string
  width?: string | null
  height?: string | null
  alignment?: MediaAlignment
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uploadedVideo: {
      setUploadedVideo: (attributes: UploadedVideoAttributes) => ReturnType
    }
  }
}

export const UploadedVideo = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
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

  parseHTML() {
    return [{ tag: "video[src]" }]
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, alignment, ...attributes } = HTMLAttributes
    return [
      "video",
      mergeAttributes(attributes, {
        controls: true,
        class: `seo-media ${alignmentClass(alignment)}`,
        "data-align": alignment,
        style: mediaStyle(width, height),
      }),
    ]
  },

  addCommands() {
    return {
      setUploadedVideo:
        (attributes: UploadedVideoAttributes) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
    }
  },

  addNodeView() {
    return videoNodeView
  },
})
