import {
  Award,
  Wallet,
  ShieldCheck,
  Headphones,
  Calendar,
  Smile,
  MapPinned,
  Users,
  Star,
  Bus,
  Plane,
  Flame,
  Clock,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

const map: Record<string, LucideIcon> = {
  award: Award,
  wallet: Wallet,
  shield: ShieldCheck,
  headphones: Headphones,
  calendar: Calendar,
  smile: Smile,
  map: MapPinned,
  users: Users,
  star: Star,
  bus: Bus,
  plane: Plane,
  fire: Flame,
  clock: Clock,
  phone: Phone,
  sparkles: Sparkles,
}

// Names available to the admin when picking an icon for a block.
export const iconNames = Object.keys(map)

export function BlockIcon({
  name,
  className,
  strokeWidth = 1.75,
}: {
  name: string
  className?: string
  strokeWidth?: number
}) {
  const Icon = map[name] ?? Sparkles
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />
}
