import { SiteHeader } from "@/components/site-header"
import { getAgentId } from "@/lib/mode"
import { AGENTS } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import { AgentChat } from "../../[id]/chat/agent-chat"

export default async function AgentSoloChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const agent = AGENTS.find((a) => a.id === getAgentId())
  if (!agent) notFound()

  return (
    <>
      <SiteHeader title="Chat" />
      <AgentChat agent={agent} sessionId={session} />
    </>
  )
}
