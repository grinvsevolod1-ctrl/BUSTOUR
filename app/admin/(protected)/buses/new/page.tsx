import { BusBaseForm } from "@/components/admin/bus-base-form"

export default function NewBusPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Новый автобус</h1>
      <BusBaseForm />
    </div>
  )
}
