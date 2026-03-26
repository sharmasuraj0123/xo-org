import { SiteHeader } from "@/components/site-header"
import { AGENTS } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import { AgentChat } from "./agent-chat"

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const { id } = await params
  const { session } = await searchParams
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) notFound()

  return (
    <>
      <SiteHeader title="Chat" />
      <AgentChat agent={agent} sessionId={session} />
    </>
  )
}
