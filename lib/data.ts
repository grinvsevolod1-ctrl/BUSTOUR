export type { Tour } from "@/lib/types"

export const navItems = [
  { label: "Горящие туры", href: "/hot/", icon: "fire" },
  { label: "Авиатуры", href: "/aviatury/" },
  { label: "Автобусные туры", href: "/avtobusnye-tury/" },
  { label: "Аренда автобусов", href: "/bus-rental" },
  {
    label: "Компания",
    href: "/company",
    children: [
      { label: "Отзывы", href: "/testimonials" },
      { label: "Сотрудники", href: "/company/staff" },
      { label: "Лицензии и сертификаты", href: "/company/licenses" },
    ],
  },
  {
    label: "Полезная информация",
    href: "/info",
    children: [
      { label: "Трансферы", href: "/info/transfers" },
      { label: "Памятки туристу", href: "/info/memos" },
      { label: "Туристический словарь", href: "/info/dictionary" },
    ],
  },
  { label: "Контакты", href: "/contacts" },
]
