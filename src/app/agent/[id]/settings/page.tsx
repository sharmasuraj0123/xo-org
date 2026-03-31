import { SiteHeader } from "@/components/site-header"
import { AGENTS } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function AgentDetailSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) notFound()

  return (
    <>
      <SiteHeader title="Settings" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Settings will appear here.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
