import { SiteHeader } from "@/components/site-header"
import { GitHubConnector } from "@/components/xo/github-connector"
import { GmailConnector } from "@/components/xo/gmail-connector"
import { SlackConnector } from "@/components/xo/slack-connector"
import { StripeConnector } from "@/components/xo/stripe-connector"
import { VercelConnector } from "@/components/xo/vercel-connector"

export default function AgentSoloConnectionsPage() {
  return (
    <>
      <SiteHeader title="Connections" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Integrations</h2>
            <p className="text-sm text-muted-foreground">
              Connect external services to extend your agent&apos;s
              capabilities.
            </p>
          </div>

          <div className="grid gap-4 @xl/main:grid-cols-2">
            <GitHubConnector />
            <GmailConnector />
            <SlackConnector />
            <StripeConnector />
            <VercelConnector />
          </div>
        </div>
      </div>
    </>
  )
}
