import { getTransferSchedules, getTransfers } from "@/lib/queries"
import { TransferScheduleEditor } from "@/components/admin/transfer-schedule-editor"
import { FormSection } from "@/components/admin/ui"

export default async function AdminSchedulesPage() {
  const transfers = await getTransfers()
  const schedules = await Promise.all(transfers.map(async (transfer) => [transfer.id, await getTransferSchedules(transfer.id)] as const))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Расписания</h1>
      <p className="text-sm text-admin-fg-muted">Быстрое редактирование расписаний всех трансферов. Данные хранятся в тех же таблицах, что и в редакторе трансфера.</p>
      {transfers.map((transfer) => {
        const rows = schedules.find(([id]) => id === transfer.id)?.[1] ?? []
        return (
          <FormSection id={`schedule-transfer-${transfer.id}`} key={transfer.id} title={`${transfer.title} — ${transfer.category === "airport" ? "Трансфер в аэропорты" : "Индивидуальный"}`}>
            <div className="space-y-4">
              <TransferScheduleEditor transferId={transfer.id} direction="outbound" schedules={rows.filter((s) => s.direction === "outbound")} />
              <TransferScheduleEditor transferId={transfer.id} direction="return" schedules={rows.filter((s) => s.direction === "return")} />
            </div>
          </FormSection>
        )
      })}
    </div>
  )
}
