import type { ComponentType, SVGProps } from "react"
import {
  DollarSign,
  Euro,
  RussianRuble,
  PoundSterling,
  SwissFranc,
  JapaneseYen,
  TurkishLira,
  IndianRupee,
  Banknote,
} from "lucide-react"

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

/** BYN — official Belarusian ruble symbol (vector path from user asset). */
function BynIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 2.65 2.65"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="m.540018-.00017v1.76423h-.428397v.24908h.428397v.63252h1.03611c.28397 0 .48463-.03667.60255-.11007s.20665-.16768.26561-.28318c.06017-.11671.08992-.24213.08992-.37569 0-.16364-.04151-.30671-.12454-.42943-.08302-.12392-.19339-.2082-.33176-.2527-.13717-.0445-.32261-.06666-.55604-.06666h-.631486v-.81597h1.36633v-.31213h-1.71669zm.350366 1.42937h.467156c.23223 0 .39673.01207.49299.03617.09626.02406.17116.07285.22531.14625.05415.07339.08113.1649.08113.2744 0 .154-.04705.26923-.14211.34623-.09385.07701-.23535.11576-.42426.11576h-.700216v-.33487h.621156v-.24908h-.621156v-.33486z" />
    </svg>
  )
}

/** PLN — złoty "zł" glyph (no lucide icon exists; simple text-based vector). */
function PlnIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* z */}
      <path d="M3 9h7l-7 8h7" />
      {/* ł */}
      <path d="M17 4v16" />
      <path d="M14 13l6-3" />
    </svg>
  )
}

const ICONS: Record<string, ComponentType<IconProps>> = {
  BYN: BynIcon,
  BYR: BynIcon,
  USD: DollarSign,
  EUR: Euro,
  RUB: RussianRuble,
  RUR: RussianRuble,
  GBP: PoundSterling,
  CHF: SwissFranc,
  JPY: JapaneseYen,
  CNY: JapaneseYen,
  TRY: TurkishLira,
  INR: IndianRupee,
  PLN: PlnIcon,
}

/**
 * Vector icon for an ISO currency code. Unknown codes fall back to a generic
 * banknote glyph so the UI never renders an empty slot.
 */
export function CurrencyIcon({
  code,
  className = "h-4 w-4",
  ...props
}: { code: string } & IconProps) {
  const Icon = ICONS[code.trim().toUpperCase()] ?? Banknote
  return <Icon className={className} {...props} />
}

/** True when a dedicated vector icon exists for the code. */
export function hasCurrencyIcon(code: string): boolean {
  return code.trim().toUpperCase() in ICONS
}
