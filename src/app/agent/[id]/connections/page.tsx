import { SiteHeader } from "@/components/site-header"
import { GitHubConnector } from "@/components/xo/github-connector"
import { GmailConnector } from "@/components/xo/gmail-connector"
import { SlackConnector } from "@/components/xo/slack-connector"
import { StripeConnector } from "@/components/xo/stripe-connector"
import { VercelConnector } from "@/components/xo/vercel-connector"
import { RcloneConnector } from "@/components/xo/rclone-connector"
import { McpConnector } from "@/components/xo/mcp-connector"
import { AGENTS } from "@/lib/mock-data"
import { getAgent } from "@/app/api/lib/bridge"
import { notFound } from "next/navigation"

export default async function AgentDetailConnectionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = AGENTS.find((a) => a.id === id) ?? getAgent(id)
  if (!agent) notFound()

  return (
    <>
      <SiteHeader title="Connections" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Integrations</h2>
            <p className="text-sm text-muted-foreground">
              External services available to {agent.name}.
            </p>
          </div>

          <div className="grid gap-4 @xl/main:grid-cols-2">
            <GitHubConnector />
            <GmailConnector />
            <SlackConnector />
            <StripeConnector />
            <VercelConnector />
            <RcloneConnector />
            <McpConnector />
          </div>
        </div>
      </div>
    </>
  )
}
