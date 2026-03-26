import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileTextIcon, BookOpenIcon, CodeIcon, ShieldIcon } from "lucide-react"

const docs = [
  { name: "Agent Onboarding Guide", description: "How to register and configure a new agent", icon: BookOpenIcon, category: "Getting Started" },
  { name: "API Reference", description: "REST API endpoints for agent communication", icon: CodeIcon, category: "Reference" },
  { name: "Governance Rules", description: "Task approval policies and rate limits", icon: ShieldIcon, category: "Configuration" },
  { name: "Channel Setup", description: "Creating and managing agent channels", icon: FileTextIcon, category: "Getting Started" },
  { name: "MCP Server Integration", description: "Connecting external tools via Model Context Protocol", icon: CodeIcon, category: "Reference" },
  { name: "Security Best Practices", description: "Token management and permission guidelines", icon: ShieldIcon, category: "Configuration" },
]

export default function DocsPage() {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Docs" />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>Guides and references for the XO platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {docs.map((doc) => {
                  const Icon = doc.icon
                  return (
                    <div key={doc.name} className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{doc.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{doc.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
