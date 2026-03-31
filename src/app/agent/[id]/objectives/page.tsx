import { SiteHeader } from "@/components/site-header"
import { OKRDataTable } from "@/components/okr-data-table"
import { OBJECTIVES } from "@/lib/mock-data"
import { objectivesToOKRRows } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import { AGENTS } from "@/lib/mock-data"

export default async function AgentDetailObjectivesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) notFound()

  const agentObjectives = OBJECTIVES.filter((obj) => obj.aiOwner === id)
  const okrData = objectivesToOKRRows(agentObjectives)

  return (
    <>
      <SiteHeader title="Objectives" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <OKRDataTable data={okrData} />
          </div>
        </div>
      </div>
    </>
  )
}
