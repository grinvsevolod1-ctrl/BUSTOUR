import type { Metadata } from "next"
import { AdminToaster } from "@/components/admin/admin-toaster"

export const metadata: Metadata = {
  title: "Админ — БасТур",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminToaster />
    </>
  )
}
