import { redirect } from "next/navigation"
import { getMode } from "@/lib/mode"

export default function RootPage() {
  redirect(getMode() === "agent" ? "/agent" : "/org")
}
