import { describe, it, expect } from "vitest"
import { INTERNAL_ORIGIN, publicOrigin } from "@/lib/proxy-origin"

describe("INTERNAL_ORIGIN", () => {
  it("loopback по plain HTTP — иначе за nginx будет EPROTO", () => {
    expect(INTERNAL_ORIGIN).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })
})

describe("publicOrigin", () => {
  it("собирает origin из форвард-заголовков nginx", () => {
    const headers = new Headers({
      host: "testnetnext.top",
      "x-forwarded-proto": "https",
    })
    expect(publicOrigin(headers, "fallback:3000")).toBe("https://testnetnext.top")
  })

  it("без заголовков — fallback-хост и https", () => {
    expect(publicOrigin(new Headers(), "localhost:3000")).toBe("https://localhost:3000")
  })

  it("уважает http из X-Forwarded-Proto (dev за прокси)", () => {
    const headers = new Headers({ host: "dev.local", "x-forwarded-proto": "http" })
    expect(publicOrigin(headers, "x")).toBe("http://dev.local")
  })
})
