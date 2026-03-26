import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AGENTS } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) notFound()

  return (
    <SidebarProvider
      className="h-screen overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="overflow-y-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
