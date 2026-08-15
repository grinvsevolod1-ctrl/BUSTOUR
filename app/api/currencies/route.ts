import { NextResponse } from "next/server"
import { getCurrencies } from "@/lib/currencies-server"

export async function GET() {
  return NextResponse.json({ currencies: await getCurrencies() })
}
