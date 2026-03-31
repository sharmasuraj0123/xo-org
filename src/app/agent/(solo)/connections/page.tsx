import { SiteHeader } from "@/components/site-header"

export default function AgentSoloConnectionsPage() {
  return (
    <>
      <SiteHeader title="Connections" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Connections will appear here.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
