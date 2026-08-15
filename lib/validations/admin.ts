import { z } from "zod"

/** URL slug: lowercase latin, digits, hyphens, underscores; 1–120 chars. */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "Укажите slug")
  .max(120, "Slug слишком длинный")
  .regex(/^[a-z0-9_]+(?:[-_][a-z0-9_]+)*$/, "Slug: только a-z, 0-9, дефис и _")

export const categorySchema = z.enum(["bus", "avia", "hot"])

export const tourSaveSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "Заполните название").max(200),
  description: z.string().trim().min(1, "Заполните описание"),
  priceAmount: z.coerce.number().finite().min(0, "Цена не может быть отрицательной"),
  image: z.string().trim().min(1, "Добавьте обложку тура"),
  seoTitle: z.string().trim().max(200),
  seoHtml: z.string().trim().max(100000),
})

export const busSaveSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "Заполните название").max(200),
})

export const articleSaveSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "Заполните заголовок").max(200),
  date: z.string().trim().min(1, "Заполните дату"),
  metaTitle: z.string().trim().min(1, "Заполните Title (SEO)").max(200),
  metaDescription: z.string().trim().min(1, "Заполните Meta description"),
  metaShortDesc: z.string().trim().min(1, "Заполните превью описание"),
  metaImage: z.string().trim().min(1, "Заполните превью изображение"),
})

export const destinationPageSettingsSchema = z.object({
  metaTitle: z.string().trim().min(1, "Заполните Title (SEO)").max(200, "Title (SEO) слишком длинный"),
  metaDescription: z.string().trim().min(1, "Заполните описание для поиска"),
  metaShortDesc: z.string().trim().min(1, "Заполните превью описание"),
  metaImage: z.string().trim().min(1, "Добавьте превью изображение"),
  h1: z.string().trim().min(3, "Заголовок H1 должен содержать минимум 3 символа"),
  intro: z.string().trim().min(12, "Вводный абзац должен содержать минимум 12 символов"),
})

export const citySaveSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1, "Заполните название").max(200),
  category: categorySchema,
  country: z.string().trim().min(1, "Укажите страну — по ней город группируется в сайдбаре"),
})

export const countrySaveSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1, "Заполните название").max(200),
  category: categorySchema,
})

export const staffSaveSchema = z.object({
  name: z.string().trim().min(1, "Заполните имя сотрудника").max(200),
  position: z.string().trim().min(1, "Заполните должность").max(200),
  phone: z
    .string()
    .trim()
    .max(64)
    .refine(
      (v) => !v || /^[+\d\s()-]+$/.test(v),
      "Некорректный номер телефона — допустимы цифры, +, пробелы, скобки и дефис",
    ),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некорректный email"),
  photo: z.string().trim().max(500),
  sortOrder: z.coerce.number().int().min(0).max(99999).default(0),
})

export const adminUserCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Имя пользователя минимум 3 символа")
    .max(64, "Имя пользователя максимум 64 символа")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Имя пользователя может содержать только латинские буквы, цифры и символы . _ -",
    ),
  password: z
    .string()
    .min(8, "Пароль минимум 8 символов")
    .max(128, "Пароль максимум 128 символов"),
  role: z.string().trim().min(1, "Выберите роль"),
  active: z.enum(["true", "false"]).default("true"),
})

export const adminUserUpdateSchema = z
  .object({
    password: z
      .string()
      .max(128, "Пароль максимум 128 символов")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v))
      .refine(
        (v) => v == null || v.length >= 8,
        "Пароль минимум 8 символов (оставьте пустым, чтобы не менять)",
      ),
    role: z.string().trim().optional(),
  })
  .refine((v) => v.password == null || v.password.length >= 8, {
    message: "Пароль минимум 8 символов",
    path: ["password"],
  })

export const transferSaveSchema = z.object({
  slug: slugSchema,
  category: z.enum(["airport", "individual"]),
  title: z.string().trim().min(1, "Заполните название").max(200),
  intro: z.string(),
  priceRoundTrip: z.coerce.number().finite().min(0, "Цена не может быть отрицательной"),
  priceOneWay: z.coerce.number().finite().min(0, "Цена не может быть отрицательной"),
  image: z.string().trim(),
})

export const transferScheduleRowSchema = z.object({
  departureTime: z.string().trim(),
  arrival: z.string().trim(),
  note: z.string().trim(),
  bookingHref: z.string().trim(),
})

export const transferSchedulesSaveSchema = z.object({
  transferId: z.coerce.number().int().positive("Некорректное расписание"),
  direction: z.enum(["outbound", "return"]),
  rows: z.array(transferScheduleRowSchema),
})

export const shortcodeNameSchema = z
  .string()
  .trim()
  .min(1, "Укажите имя шорткода")
  .max(64, "Имя слишком длинное")
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Имя шорткода может содержать только буквы и цифры, без пробелов и скобок",
  )

export const shortcodeSaveSchema = z.object({
  name: shortcodeNameSchema,
  value: z.string().min(1, "Укажите значение"),
  description: z.string().trim().max(200).optional().nullable(),
})

export function zodFirstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Проверьте заполнение полей"
}
