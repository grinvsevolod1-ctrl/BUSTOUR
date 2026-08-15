import type { AdminSaveResult } from "@/lib/admin-save-state"

export type DraftContributor = {
  id: string
  label: string
  tabHash?: `#${string}`
  isDirty(): boolean
  validate?(): AdminSaveResult | Promise<AdminSaveResult>
  append?(formData: FormData): void | Promise<void>
  save?(): Promise<AdminSaveResult>
  commitBaseline(): void
  reset(): void
}

export class DraftRegistry {
  private readonly contributors = new Map<string, DraftContributor>()

  register(contributor: DraftContributor): () => void {
    if (contributor.append && contributor.save) {
      throw new Error(`Draft contributor "${contributor.id}" cannot define both append and save`)
    }

    this.contributors.set(contributor.id, contributor)
    return () => {
      if (this.contributors.get(contributor.id) === contributor) {
        this.contributors.delete(contributor.id)
      }
    }
  }

  snapshot(): DraftContributor[] {
    return [...this.contributors.values()]
  }
}
