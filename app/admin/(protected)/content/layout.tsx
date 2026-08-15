import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"

export default async function AdminContentLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireCapability("manage_content")
  } catch {
    redirect("/admin?error=forbidden")
  }
  return children
}
