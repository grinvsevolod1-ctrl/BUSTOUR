import { Send } from "lucide-react"
import type { SocialIconId } from "@/lib/social-links"
import { SOCIAL_CIRCLE_BG } from "@/lib/social-links"

function InstagramGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  )
}

function YoutubeGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
    </svg>
  )
}

export type SocialIconSize = "sm" | "md"

/** Single shared glyph for BOTH header and footer (consistent rendering). */
export function SocialIconGlyph({
  icon,
  className,
}: {
  icon: SocialIconId
  className?: string
}) {
  if (icon === "instagram") return <InstagramGlyph className={`h-full w-full shrink-0 object-contain ${className || ""}`} />
  if (icon === "youtube") return <YoutubeGlyph className={`h-full w-full shrink-0 object-contain ${className || ""}`} />
  if (icon === "viber") {
    return <img src="/figma/viber.svg" alt="" className={`h-full w-full shrink-0 object-contain ${className || ""}`} />
  }
  if (icon === "telegram") {
    return <img src="/figma/telegram.svg" alt="" className={`h-full w-full shrink-0 object-contain ${className || ""}`} />
  }
  return <Send className={`h-full w-full shrink-0 object-contain ${className || ""}`} aria-hidden />
}

export function socialCircleIconSize(size: SocialIconSize) {
  if (size === "sm") {
    return { wrapper: "h-8 w-8 md:h-10 md:w-10", glyph: "h-full w-full" }
  }
  return { wrapper: "h-10 w-10", glyph: "h-full w-full" }
}

export function socialCircleWrapperClass(
  icon: SocialIconId,
  size: SocialIconSize = "md",
): string {
  const { wrapper } = socialCircleIconSize(size)
  return `grid ${wrapper} place-items-center rounded-full text-white transition-opacity hover:opacity-85 ${SOCIAL_CIRCLE_BG[icon]}`
}
