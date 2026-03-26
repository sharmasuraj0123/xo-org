import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { AgentChannels } from "@/components/agent-channels"
import { SiteHeader } from "@/components/site-header"
import { AGENTS } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) notFound()

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <div className="px-4 lg:px-6">
              <AgentChannels />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
