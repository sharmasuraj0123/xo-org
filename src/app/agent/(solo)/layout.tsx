import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AgentSoloLayout({ children }: { children: React.ReactNode }) {
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
