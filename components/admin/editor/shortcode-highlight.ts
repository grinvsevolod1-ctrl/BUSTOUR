import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

const TOKEN = /\[[a-zA-Z0-9]+\]/g

/** Highlight `[Shortcode]` tokens in the editor (decoration only, not stored marks). */
export const ShortcodeHighlight = Extension.create({
  name: "shortcodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const out: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              TOKEN.lastIndex = 0
              let match: RegExpExecArray | null
              while ((match = TOKEN.exec(node.text))) {
                const from = pos + match.index
                const to = from + match[0].length
                out.push(
                  Decoration.inline(from, to, {
                    class: "shortcode-token",
                  }),
                )
              }
            })
            return DecorationSet.create(state.doc, out)
          },
        },
      }),
    ]
  },
})
