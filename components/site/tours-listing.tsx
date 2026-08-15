"use client"

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import type { Tour } from "@/lib/data"
import type { Currency } from "@/lib/types"
import {
  ALL_PERIODS_LABEL,
  collectPeriodLabels,
  deserializeDepartureRange,
  nearestDeparture,
  serializeDepartureRange,
  tourMatchesDepartureRangeSelection,
  tourMatchesPeriod,
  type DepartureRange,
} from "@/lib/dates-table"
import { scrollToId } from "@/lib/scroll-to-id"
import { tourUrl } from "@/lib/tour-url"
import { Dropdown } from "./dropdown"
import { TourCard } from "./tour-card"
import { ToursSidebar } from "./tours-sidebar"
import { AviaSidebar } from "./avia-sidebar"
import type { AviaCountryEntry } from "@/lib/countries"
import { TitleUnderline } from "./title-underline"
import { DateRangePicker, type DateRangePickerValue } from "@/components/ui/date-range-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"

export const TOUR_SEARCH_RESULTS_ID = "tour-search-results"

const sortOptions = [
  { value: "default", label: "По популярности" },
  { value: "priceAsc", label: "Сначала дешёвые" },
  { value: "priceDesc", label: "Сначала дорогие" },
  { value: "nights", label: "По длительности" },
]

const busSortOptions = [
  { value: "nearest", label: "По ближайшей дате" },
  { value: "popularity", label: "По популярности" },
  { value: "priceAsc", label: "Сначала дешёвые" },
  { value: "priceDesc", label: "Сначала дорогие" },
  { value: "nights", label: "По длительности" },
]

const ALL_DESTINATIONS = "Все направления"
const ALL_TYPES = "Все типы туров"
const DATE_FROM_PARAM = "dateFrom"
const DATE_TO_PARAM = "dateTo"
const PRICE_FROM_PARAM = "priceFrom"
const PRICE_TO_PARAM = "priceTo"
const PRICE_DEBOUNCE_MS = 400

const PAGE_SIZE = 6

// Format a converted amount with its currency code (client-safe, mirrors lib/currencies).
function formatMoney(amount: number, code: string): string {
  const rounded = Math.round(amount * 100) / 100
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
  return `${str.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${code}`
}

type SlugMaps = { countrySlugById: Record<number, string>; citySlugById: Record<number, string> }

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`)))
}

function departureRangeFromSearch(params: URLSearchParams): DepartureRange {
  const from = params.get(DATE_FROM_PARAM)
  const to = params.get(DATE_TO_PARAM)
  if (!isIsoDate(from) && !isIsoDate(to)) return { kind: "any" }
  return { kind: "custom", start: isIsoDate(from) ? from : "", end: isIsoDate(to) ? to : "" }
}

function searchPrice(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function ToursListing({
  tours,
  category,
  initialCountries = [],
  currencies = [],
  tourTypes = [],
  header,
  beforeSearchContent,
  callUs,
  faq,
  citiesByCountry = {},
  activeCitySlug,
  cityBasePath = "/avtobusnye-tury",
  countrySlugs = {},
  countryBasePath,
  visibleCountryNames,
  seoContent,
  slugMaps,
  aviaMode,
  aviaCountries,
  aviaActiveCountrySlug,
  aviaActiveCitySlug,
  shortcodesDict = {},
  sectionTitle,
  sectionDescription,
  defaultSort,
  hideResultsHeading = "0",
}: {
  tours: Tour[]
  category: "bus" | "avia" | "hot"
  initialCountries?: string[]
  initialNights?: string
  initialMeal?: string
  currencies?: Currency[]
  tourTypes?: string[]
  header?: React.ReactNode
  /** CMS sections ordered before the bus search/filter area. */
  beforeSearchContent?: React.ReactNode
  callUs?: React.ReactNode
  faq?: React.ReactNode
  citiesByCountry?: Record<string, { slug: string; name: string }[]>
  activeCitySlug?: string
  cityBasePath?: string
  countrySlugs?: Record<string, string>
  countryBasePath?: string
  /** When set, sidebar/filter countries are intersected with this allowlist (hidden countries omitted). */
  visibleCountryNames?: string[]
  seoContent?: React.ReactNode
  slugMaps?: SlugMaps
  // When true, renders AviaSidebar with country+city list from DB instead of ToursSidebar
  aviaMode?: boolean
  aviaCountries?: AviaCountryEntry[]
  aviaActiveCountrySlug?: string
  aviaActiveCitySlug?: string
  shortcodesDict?: Record<string, string>
  /** CMS: custom section H2 over the listing. */
  sectionTitle?: string
  /** CMS: short intro paragraph under the section title. */
  sectionDescription?: string
  /** CMS: default sort value on first load (e.g. "nearest" / "default" / "priceAsc"). */
  defaultSort?: string
  /** CMS: "1" — hide the inner «Результаты поиска» H2 above cards. */
  hideResultsHeading?: "0" | "1" | string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const latestSearchParams = useRef(searchParams)
  useEffect(() => {
    latestSearchParams.current = searchParams
  }, [searchParams])

  // P1: For bus tours (!aviaMode), show ALL countries whose CMS visibility is on (visibleCountryNames),
  // regardless of active tour count — so empty countries/cities still appear in sidebar + filter dropdown.
  // Preserve CMS order from visibleCountryNames; append any countries with tours not yet listed.
  const countryOptions = useMemo(() => {
    const fromTours = new Set(tours.map((t) => t.country).filter(Boolean))
    if (visibleCountryNames?.length) {
      const ordered = [...visibleCountryNames]
      for (const name of fromTours) {
        if (!ordered.includes(name)) ordered.push(name)
      }
      return ordered
    }
    return Array.from(fromTours).sort((a, b) => a.localeCompare(b, "ru"))
  }, [tours, visibleCountryNames])

  const destinationOptions = useMemo(
    () => [ALL_DESTINATIONS, ...countryOptions],
    [countryOptions],
  )

  const typeOptions = useMemo(() => [ALL_TYPES, ...tourTypes], [tourTypes])

  const periodOptions = useMemo(
    () => [ALL_PERIODS_LABEL, ...collectPeriodLabels(tours.map((t) => t.datesTable))],
    [tours],
  )

  // «Тип тура» — отдельный фильтр только для автобусных туров.
  const showTypeFilter = category === "bus"

  // Currency list (base first) with codes for the selector.
  const currencyList = currencies.length ? currencies : [{ id: 0, code: "BYN", label: "BYN", symbol: "Br", rate: 1, isBase: true, sortOrder: 0 }]
  const baseCurrency = currencyList.find((c) => c.isBase) ?? currencyList[0]
  const currencyCodes = currencyList.map((c) => c.code)
  const maxBasePrice = Math.max(0, ...tours.map((t) => t.priceAmount || 0))

  const [destination, setDestination] = useState(initialCountries[0] ?? ALL_DESTINATIONS)
  const [type, setType] = useState(ALL_TYPES)
  const [period, setPeriod] = useState(ALL_PERIODS_LABEL)
  // Legacy `period` (concrete date-range labels) kept for avia sidebar path.
  const [departureRangeSer, setDepartureRangeSer] = useState<string>(() =>
    serializeDepartureRange(departureRangeFromSearch(searchParams)),
  )
  const [currency, setCurrency] = useState(baseCurrency.code)
  const initialSortOptions = aviaMode ? sortOptions : busSortOptions
  const initialSortValid = defaultSort && initialSortOptions.some((o) => o.value === defaultSort)
  const [sort, setSort] = useState<string>(
    initialSortValid ? defaultSort! : aviaMode ? "default" : "nearest",
  )
  const [page, setPage] = useState(1)
  const [announce, setAnnounce] = useState("")
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  const departureRange: DepartureRange = useMemo(
    () => deserializeDepartureRange(departureRangeSer),
    [departureRangeSer],
  )
  const effectiveSortOptions = aviaMode ? sortOptions : busSortOptions

  const activeCurrency = currencyList.find((c) => c.code === currency) ?? baseCurrency
  const priceBounds = useMemo(() => {
    const max = Math.max(1, Math.ceil(maxBasePrice * activeCurrency.rate))
    return { min: 0, max }
  }, [activeCurrency.rate, maxBasePrice])
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const from = searchPrice(searchParams.get(PRICE_FROM_PARAM))
    const to = searchPrice(searchParams.get(PRICE_TO_PARAM))
    const max = Math.max(1, Math.ceil(maxBasePrice * activeCurrency.rate))
    return [clamp(from ?? 0, 0, max), clamp(to ?? max, 0, max)]
  })
  const previousCurrencyRate = useRef(activeCurrency.rate)

  const filtered = useMemo(() => {
    // Skip tours without country+city URL — TourCard renders null for those.
    let list = tours.filter((t) =>
      tourUrl({
        tourSlug: t.slug,
        countrySlug: slugMaps?.countrySlugById[t.countryId] ?? t.countrySlug,
        citySlug: slugMaps?.citySlugById[t.arrivalCityId] ?? t.citySlug,
      }),
    )

    if (destination !== ALL_DESTINATIONS) {
      list = list.filter((t) => t.country === destination)
    }

    if (showTypeFilter && type !== ALL_TYPES) {
      list = list.filter((t) => t.tourType === type)
    }

    // P2: Bus mode uses the rich departure range; legacy avia uses the concrete date-range labels.
    if (aviaMode) {
      if (period !== ALL_PERIODS_LABEL) {
        list = list.filter((t) => tourMatchesPeriod(t.datesTable, period))
      }
    } else {
      list = list.filter((t) => tourMatchesDepartureRangeSelection(t.datesTable, departureRange))
    }

    if (priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max) {
      list = list.filter((t) => {
        const v = Math.round((t.priceAmount || 0) * activeCurrency.rate)
        return v >= priceRange[0] && v <= priceRange[1]
      })
    }

    if (sort === "priceAsc") list = [...list].sort((a, b) => a.priceAmount - b.priceAmount)
    else if (sort === "priceDesc") list = [...list].sort((a, b) => b.priceAmount - a.priceAmount)
    else if (sort === "nights") list = [...list].sort((a, b) => b.nights - a.nights)
    else if (sort === "popularity") list = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    else if (sort === "default" && !aviaMode) {
      // P3: Bus tours default — sort by nearest upcoming departure date (early -> late).
      list = [...list].sort((a, b) => {
        const da = nearestDeparture(a.datesTable)
        const db = nearestDeparture(b.datesTable)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      })
    }

    return list
  }, [tours, destination, type, period, priceRange, priceBounds, sort, showTypeFilter, slugMaps, aviaMode, departureRange, activeCurrency.rate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice(0, currentPage * PAGE_SIZE)

  function selectDestination(value: string) {
    setDestination(value)
    setPage(1)
  }

  function reset() {
    setDestination(ALL_DESTINATIONS)
    setType(ALL_TYPES)
    setPeriod(ALL_PERIODS_LABEL)
    updateDepartureRange({ kind: "any" })
    updatePriceRange([priceBounds.min, priceBounds.max])
    setPage(1)
  }

  function setDepartureRange(r: DepartureRange) {
    setDepartureRangeSer(serializeDepartureRange(r))
    setPage(1)
  }

  function updateDepartureRange(r: DepartureRange) {
    setDepartureRange(r)
    const params = new URLSearchParams(latestSearchParams.current.toString())
    if (r.kind === "custom") {
      if (r.start) params.set(DATE_FROM_PARAM, r.start)
      else params.delete(DATE_FROM_PARAM)
      if (r.end) params.set(DATE_TO_PARAM, r.end)
      else params.delete(DATE_TO_PARAM)
    } else {
      params.delete(DATE_FROM_PARAM)
      params.delete(DATE_TO_PARAM)
    }
    const query = params.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function updatePriceRange(next: [number, number]) {
    const from = clamp(Math.min(next[0], next[1]), priceBounds.min, priceBounds.max)
    const to = clamp(Math.max(next[0], next[1]), priceBounds.min, priceBounds.max)
    setPriceRange([from, to])
    setPage(1)
  }

  useEffect(() => {
    const oldRate = previousCurrencyRate.current
    if (oldRate === activeCurrency.rate) return
    previousCurrencyRate.current = activeCurrency.rate
    setPriceRange(([from, to]) => [
      clamp((from / oldRate) * activeCurrency.rate, priceBounds.min, priceBounds.max),
      clamp((to / oldRate) * activeCurrency.rate, priceBounds.min, priceBounds.max),
    ])
  }, [activeCurrency.rate, priceBounds.min, priceBounds.max])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(latestSearchParams.current.toString())
      if (priceRange[0] <= priceBounds.min) params.delete(PRICE_FROM_PARAM)
      else params.set(PRICE_FROM_PARAM, String(priceRange[0]))
      if (priceRange[1] >= priceBounds.max) params.delete(PRICE_TO_PARAM)
      else params.set(PRICE_TO_PARAM, String(priceRange[1]))
      const query = params.toString()
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
    }, PRICE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [pathname, priceBounds.max, priceBounds.min, priceRange])

  function onFind() {
    setPage(1)
    const count = filtered.length
    setAnnounce(
      count > 0
        ? `Найдено ${count} ${count === 1 ? "тур" : count < 5 ? "тура" : "туров"}`
        : "По выбранным фильтрам туров не найдено.",
    )
    requestAnimationFrame(() => {
      scrollToId(TOUR_SEARCH_RESULTS_ID)
      resultsHeadingRef.current?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {aviaMode ? (
        <AviaSidebar
          countries={aviaCountries ?? []}
          activeCountrySlug={aviaActiveCountrySlug}
          activeCitySlug={aviaActiveCitySlug}
          onCountrySelect={selectDestination}
          shortcodesDict={shortcodesDict}
        />
      ) : (
        <ToursSidebar
          options={countryOptions}
          value={destination}
          onSelect={selectDestination}
          citiesByCountry={citiesByCountry}
          activeCitySlug={activeCitySlug}
          cityBasePath={cityBasePath}
          countrySlugs={countrySlugs}
          countryBasePath={countryBasePath}
          shortcodesDict={shortcodesDict}
        />
      )}

      <div className="min-w-0 flex-1 space-y-6">
        {sectionTitle ? (
          <TitleUnderline>{sectionTitle}</TitleUnderline>
        ) : null}
        {sectionDescription ? (
          <div
            className="whitespace-pre-wrap text-base leading-relaxed text-ink-muted"
            dangerouslySetInnerHTML={{ __html: sectionDescription }}
          />
        ) : null}
        {header != null ? <Fragment key="tours-header">{header}</Fragment> : null}
        {!aviaMode && beforeSearchContent != null ? (
          <Fragment key="tours-before-search">{beforeSearchContent}</Fragment>
        ) : null}

        {aviaMode ? (
          <Fragment key="tours-avia-stack">
            {callUs}
            {seoContent}
            {faq}
          </Fragment>
        ) : (
          <Fragment key="tours-bus-stack">
            {/* Filter bar */}
            <div className="flex flex-col items-stretch gap-4 rounded bg-cyan-accent p-6 md:flex-row md:flex-wrap md:items-end">
              <label className="flex min-w-[180px] flex-1 flex-col gap-2">
                <span className="text-base text-white">Куда</span>
                <Dropdown
                  value={destination}
                  options={destinationOptions}
                  onChange={selectDestination}
                  ariaLabel="Направление"
                  buttonClassName="h-[52px] rounded bg-white px-4 text-base"
                />
              </label>

              {showTypeFilter && (
                <label className="flex min-w-[180px] flex-1 flex-col gap-2">
                  <span className="text-base text-white">Тип тура</span>
                  <Dropdown
                    value={type}
                    options={typeOptions}
                    onChange={(v) => {
                      setType(v)
                      setPage(1)
                    }}
                    ariaLabel="Тип тура"
                    buttonClassName="h-[52px] rounded bg-white px-4 text-base"
                  />
                </label>
              )}

              {aviaMode ? (
                <label className="flex min-w-[180px] flex-1 flex-col gap-2">
                  <span className="text-base text-white">Период выезда</span>
                  <Dropdown
                    value={periodOptions.includes(period) ? period : ALL_PERIODS_LABEL}
                    options={periodOptions}
                    onChange={(v) => {
                      setPeriod(v)
                      setPage(1)
                    }}
                    ariaLabel="Период выезда"
                    buttonClassName="h-[52px] rounded bg-white px-4 text-base"
                  />
                </label>
              ) : (
                <BusDeparturePicker
                  value={departureRange}
                  onChange={updateDepartureRange}
                />
              )}

              <div className="flex min-w-[240px] flex-1 flex-col gap-2">
                <span className="flex items-center gap-2 text-base text-white">
                  Стоимость в
                  {currencyCodes.length > 1 ? (
                    <Dropdown
                      value={currency}
                      options={currencyCodes}
                      onChange={setCurrency}
                      ariaLabel="Валюта"
                      buttonClassName="rounded bg-white/[0.18] px-1.5 py-1 hover:bg-white/25"
                      valueClassName="text-[11px] font-extrabold uppercase text-white"
                      chevronClassName="h-5 w-5 text-white"
                      menuClassName="left-0 w-auto"
                    />
                  ) : (
                    <span className="rounded bg-white/20 px-2 py-1 text-[11px] font-extrabold text-white">{currency}</span>
                  )}
                </span>
                <PriceRangePicker
                  value={priceRange}
                  bounds={priceBounds}
                  currencyCode={activeCurrency.code}
                  currencySymbol={activeCurrency.symbol || activeCurrency.code}
                  onChange={updatePriceRange}
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={reset} className="text-base text-white underline underline-offset-2">
                  Очистить фильтр
                </button>
                <button
                  type="button"
                  onClick={onFind}
                  className="h-[52px] rounded bg-brand px-8 text-xl font-extrabold text-brand-foreground transition-colors hover:bg-brand-dark"
                >
                  НАЙТИ
                </button>
              </div>
            </div>

            {callUs}

            {/* Results */}
            <div id={TOUR_SEARCH_RESULTS_ID} className="scroll-mt-24 space-y-6">
              <p className="sr-only" aria-live="polite" aria-atomic="true">
                {announce}
              </p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                {hideResultsHeading !== "1" ? (
                  <TitleUnderline tabIndex={-1} headingRef={resultsHeadingRef}>
                    Результаты поиска
                  </TitleUnderline>
                ) : (
                  <div className="sr-only" ref={resultsHeadingRef as any} tabIndex={-1}>
                    Результаты поиска
                  </div>
                )}
                <label className="flex shrink-0 items-center gap-2">
                  <span className="text-sm text-ink-muted">Сортировка:</span>
                  <span className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="appearance-none rounded border border-line bg-white py-2 pl-3 pr-9 text-sm text-ink"
                    >
                      {effectiveSortOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                  </span>
                </label>
              </div>

              {visible.length ? (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((tour) => (
                      <TourCard
                        key={tour.slug}
                        tour={tour}
                        currencies={currencyList}
                        currencyCode={activeCurrency.code}
                        countrySlug={slugMaps?.countrySlugById[tour.countryId]}
                        citySlug={slugMaps?.citySlugById[tour.arrivalCityId]}
                        isBusTour={category === "bus"}
                      />
                    ))}
                  </div>

                  {currentPage < totalPages && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setPage(currentPage + 1)}
                        className="rounded border border-brand px-6 py-3 text-base font-medium text-ink transition-colors hover:bg-cream lg:border-line"
                      >
                        Показать ещё ({filtered.length - visible.length})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded border border-line p-8 text-center text-ink-muted">
                  {destination !== ALL_DESTINATIONS
                    ? "Пока нет опубликованных туров для этого направления."
                    : "По выбранным фильтрам туров не найдено."}
                </p>
              )}
            </div>

            {seoContent != null ? <Fragment key="tours-seo">{seoContent}</Fragment> : null}

            {faq}
          </Fragment>
        )}
      </div>
    </div>
  )
}

type BusDeparturePickerProps = {
  value: DepartureRange
  onChange: (r: DepartureRange) => void
}

function formatPrice(value: number): string {
  return Math.round(value).toLocaleString("ru-RU")
}

function PriceRangePicker({
  value,
  bounds,
  currencyCode,
  currencySymbol,
  onChange,
}: {
  value: [number, number]
  bounds: { min: number; max: number }
  currencyCode: string
  currencySymbol: string
  onChange: (value: [number, number]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isAny = value[0] <= bounds.min && value[1] >= bounds.max
  const label = isAny ? "Любая цена" : `${formatPrice(value[0])} - ${formatPrice(value[1])} ${currencyCode} / чел.`

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function setFrom(raw: string) {
    const next = clamp(Number.parseInt(raw || "0", 10), bounds.min, value[1])
    onChange([next, value[1]])
  }

  function setTo(raw: string) {
    const next = clamp(Number.parseInt(raw || "0", 10), value[0], bounds.max)
    onChange([value[0], next])
  }

  return (
    <Popover>
      <div ref={ref} className="flex flex-col gap-1">
        <PopoverTrigger>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Стоимость"
            aria-expanded={open}
            className="flex h-[52px] w-full items-center justify-between rounded bg-white px-4 text-left text-base text-ink"
          >
            <span className={isAny ? "text-ink-muted" : "text-ink"}>{label}</span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </PopoverTrigger>

        {open ? (
          <PopoverContent className="md:w-[360px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">Диапазон стоимости</span>
                <span className="rounded bg-cream px-2 py-1 text-xs font-bold text-ink">{currencySymbol}</span>
              </div>

              <Slider
                value={value}
                min={bounds.min}
                max={bounds.max}
                step={1}
                minStepsBetweenThumbs={1}
                onValueChange={(next) => onChange([next[0] ?? bounds.min, next[1] ?? bounds.max])}
              />

              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1 text-xs font-medium text-ink-muted">
                  От
                  <input
                    type="number"
                    inputMode="numeric"
                    value={value[0]}
                    min={bounds.min}
                    max={value[1]}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 h-11 w-full rounded border border-line px-3 text-base text-ink outline-none focus:border-brand"
                  />
                </label>
                <label className="min-w-0 flex-1 text-xs font-medium text-ink-muted">
                  До
                  <input
                    type="number"
                    inputMode="numeric"
                    value={value[1]}
                    min={value[0]}
                    max={bounds.max}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1 h-11 w-full rounded border border-line px-3 text-base text-ink outline-none focus:border-brand"
                  />
                </label>
              </div>

            </div>
          </PopoverContent>
        ) : null}
      </div>
    </Popover>
  )
}

function BusDeparturePicker({ value, onChange }: BusDeparturePickerProps) {
  const start = value.kind === "custom" ? value.start : ""
  const end = value.kind === "custom" ? value.end : ""

  function pick(next: DateRangePickerValue) {
    onChange(next.start ? { kind: "custom", start: next.start, end: next.end } : { kind: "any" })
  }

  return (
    <div className="flex min-w-[260px] flex-1 flex-col gap-2">
      <span className="text-base text-white">Период выезда</span>
      <DateRangePicker value={{ start, end }} onChange={pick} />
    </div>
  )
}
