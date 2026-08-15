import assert from "node:assert/strict"
import {
  getDisplayEmails,
  getDisplayPhones,
  getEmergencyPhone,
  getOfficeHoursLabel,
  getPrimaryEmail,
  getPrimaryPhone,
  isValidContactEmail,
  splitContactValues,
  telHref,
} from "@/lib/contact-settings"
import { isPlaceholderSocialUrl, parseSocialLinks } from "@/lib/social-links"

assert.equal(telHref("+375 (29) 621-44-77"), "tel:+375296214477")

const multi = getDisplayPhones({
  "site.phone": "+375 29 000-00-00",
  "site.phones": "+375 (29) 111-11-11\n+375 (33) 222-22-22",
})
assert.deepEqual(multi, [
  { label: "+375 (29) 111-11-11", href: "tel:+375291111111" },
  { label: "+375 (33) 222-22-22", href: "tel:+375332222222" },
])
assert.equal(getPrimaryPhone({ "site.phone": "+375 44 333-33-33" })?.href, "tel:+375443333333")
assert.equal(getOfficeHoursLabel({}), "10:00–18:00")
assert.equal(getOfficeHoursLabel({ "site.hours": "9:00–17:00" }), "9:00–17:00")
assert.equal(getOfficeHoursLabel({ "site.hours": "  " }), "10:00–18:00")
assert.deepEqual(splitContactValues("one@example.com\r\ntwo@example.com\n"), ["one@example.com", "two@example.com"])
assert.equal(getEmergencyPhone({ "site.emergencyPhone": "+375 (44) 555-55-55" })?.href, "tel:+375445555555")

assert.equal(isValidContactEmail("bustourminsk@gmail.com"), true)
assert.equal(isValidContactEmail("bustourminsk@gmail.com1"), false)
assert.deepEqual(
  getDisplayEmails({ "site.email": "bustourminsk@gmail.com1", "site.emails": "bustourminsk@gmail.com" }),
  ["bustourminsk@gmail.com"],
)
assert.equal(getPrimaryEmail({ "site.email": "bustourminsk@gmail.com1" }), null)
assert.equal(getPrimaryEmail({ "site.email": "info@bastur.by" }), "info@bastur.by")

assert.equal(isPlaceholderSocialUrl("https://youtube.com/"), true)
assert.equal(isPlaceholderSocialUrl("https://www.instagram.com/bus_tour.by"), false)
const socials = parseSocialLinks({
  "social.links": "[]",
  "social.youtube": "https://youtube.com/",
  "social.telegram": "https://t.me/basturminsk",
  "social.instagram": "https://www.instagram.com/bus_tour.by",
  "social.viber": "viber://chat?number=375293446835",
})
assert.ok(!socials.some((s) => s.icon === "youtube"), "placeholder youtube must be hidden")
assert.ok(socials.some((s) => s.icon === "telegram"))

console.log("contact-settings.selfcheck: ok")
