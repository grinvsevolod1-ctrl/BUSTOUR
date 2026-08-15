import { LeadForm } from "./lead-form"

export function ContactForm() {
  return (
    <div className="space-y-3 rounded border border-line p-6">
      <h2 className="text-xl font-semibold text-ink">Напишите нам</h2>
      <LeadForm
        type="contact"
        submitLabel="Отправить"
        showEmail
        showMessage
        successTitle="Спасибо за обращение!"
        successText="Мы ответим вам в ближайшее время."
      />
    </div>
  )
}
