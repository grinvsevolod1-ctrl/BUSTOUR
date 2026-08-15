import { getAdmin } from "@/lib/auth"
import { getStats } from "@/lib/queries"
import { AdminNav } from "@/components/admin/admin-nav"
import { deployEnvAdminLabel } from "@/lib/deploy-env"
import { SlowHostBanner } from "@/components/admin/slow-host-banner"
import { AdminDirtyProvider } from "@/components/admin/admin-dirty-provider"
import { redirect } from "next/navigation"

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const stats = await getStats()
  const deployLabel = deployEnvAdminLabel()

  return (
    <AdminDirtyProvider>
    <div className="flex min-h-screen flex-col bg-admin-bg text-admin-fg md:flex-row">
      <AdminNav
        username={admin.username}
        role={admin.role}
        newLeads={stats.newLeads}
        deployLabel={deployLabel}
      />
      <main className="w-full flex-1 p-4 md:p-8 lg:p-10">
        <SlowHostBanner />
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
    </AdminDirtyProvider>
  )
}
