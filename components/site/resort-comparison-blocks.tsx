import { expandContentBlocks } from "@/lib/expand-content-blocks"
import type { ContentBlock } from "@/lib/types"
import { ResortComparisonBlocks as ResortComparisonBlocksClient } from "@/components/site/resort-comparison-table"

/** Server wrapper: expand shortcodes in resort table cells before client render. */
export async function ResortComparisonBlocks({
  blocks,
  sectionTitle,
}: {
  blocks: ContentBlock[]
  sectionTitle?: string
}) {
  const expanded = await expandContentBlocks(blocks)
  return <ResortComparisonBlocksClient blocks={expanded} sectionTitle={sectionTitle} />
}
