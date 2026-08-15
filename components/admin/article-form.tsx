"use client"

import { useActionState, useContext } from "react"
import { Check } from "lucide-react"
import { saveArticleAction } from "@/app/admin/actions"
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_LABELS,
  type Article,
} from "@/lib/types"
import { Button, ButtonLink, Input, Label, Select, Textarea } from "@/components/admin/ui"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { SlugField } from "@/components/admin/slug-field"
import { useActionToast } from "@/components/admin/use-action-toast"
import { ShortcodeInput } from "@/components/admin/shortcode-input"
import {
  SEO_META_DESCRIPTION_HINT,
  SEO_META_DESCRIPTION_LABEL,
  SEO_META_SHORT_DESC_HINT,
  SEO_META_SHORT_DESC_LABEL,
} from "@/lib/admin-config"

export function ArticleForm({ article }: { article?: Article }) {
  const [state, action, pending] = useActionState(saveArticleAction, null)
  const pageSettingsFormContext = useContext(PageSettingsFormContext)
  const titleId = article ? "article-title" : "new-article-title"
  useActionToast(state, { successMessage: article ? "Статья сохранена" : "Статья создана" })

  return (
    <form id="article-base-form" action={action} className="space-y-4">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={titleId} required>Заголовок</Label>
          <ShortcodeInput id={titleId} name="title" label="Заголовок" defaultValue={article?.title} required />
        </div>
        <SlugField
          id="article-slug"
          nameSourceId={titleId}
          defaultValue={article?.slug}
          autoFromName={!article}
          placeholder="viza-v-litvu"
        />
        <div>
          <Label htmlFor="article-date" required>Дата</Label>
          <Input id="article-date" name="date" type="date" defaultValue={article?.date} required />
        </div>
        <div>
          <Label htmlFor="article-category">Категория</Label>
          <Select id="article-category" name="category" defaultValue={article?.category ?? "news"}>
            {ARTICLE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{ARTICLE_CATEGORY_LABELS[category]}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-4 border-t border-admin-border pt-4">
        <p className="text-sm font-semibold text-admin-fg">SEO и мета</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="article-meta-title" required>Title (SEO)</Label>
            <ShortcodeInput id="article-meta-title" name="metaTitle" defaultValue={article?.metaTitle} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="article-meta-description" required>{SEO_META_DESCRIPTION_LABEL}</Label>
            <ShortcodeInput id="article-meta-description" name="metaDescription" defaultValue={article?.metaDescription} rows={3} multiline required />
            <p className="mt-1 text-xs text-admin-fg-muted">{SEO_META_DESCRIPTION_HINT}</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="article-meta-short" required>{SEO_META_SHORT_DESC_LABEL}</Label>
            <ShortcodeInput id="article-meta-short" name="metaShortDesc" defaultValue={article?.metaShortDesc} rows={2} multiline required />
            <p className="mt-1 text-xs text-admin-fg-muted">{SEO_META_SHORT_DESC_HINT}</p>
          </div>
          <div className="sm:col-span-2">
            <SettingMediaField name="metaImage" label="Превью изображение" value={article?.metaImage ?? ""} required />
          </div>
        </div>
      </div>
      {state?.success ? (
        <span className="flex items-center gap-1 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" /> Сохранено
        </span>
      ) : null}
      {!pageSettingsFormContext ? (
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
          <ButtonLink href="/admin/articles" variant="secondary">Отмена</ButtonLink>
        </div>
      ) : null}
    </form>
  )
}
