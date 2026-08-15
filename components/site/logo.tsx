import Link from "next/link"
import Image from "next/image"

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="БасТур — на главную">
      <Image
        src="/figma/logomark.svg"
        alt="Логотип БасТур"
        width={50}
        height={50}
        className="h-11 w-11 shrink-0 md:h-[50px] md:w-[50px]"
      />
      <span className="flex flex-col justify-center leading-none">
        <span className="text-xl font-bold uppercase tracking-tight text-ink md:text-2xl">
          БасТур
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink md:text-xs">
          Туристическая компания
        </span>
      </span>
    </Link>
  )
}
