import { FeaturedTours } from "@/components/site/featured-tours"
import { ToursListing } from "@/components/site/tours-listing"
import { getCurrencies } from "@/lib/currencies-server"
import { expandPublicList } from "@/lib/expand-content-blocks"
import { getShortcodesDict } from "@/lib/shortcodes"
import type { ComponentProps } from "react"

/** Server boundary: expand `[Y]` etc. before client TourCard trees. */
export async function PublicFeaturedTours(props: ComponentProps<typeof FeaturedTours>) {
  const [tours, currencies] = await Promise.all([
    expandPublicList(props.tours),
    props.currencies ? Promise.resolve(props.currencies) : getCurrencies(),
  ])
  return <FeaturedTours {...props} tours={tours} currencies={currencies} />
}

export async function PublicToursListing(props: ComponentProps<typeof ToursListing>) {
  const [tours, shortcodesDict] = await Promise.all([
    expandPublicList(props.tours),
    getShortcodesDict(),
  ])
  return <ToursListing {...props} tours={tours} shortcodesDict={shortcodesDict} />
}
