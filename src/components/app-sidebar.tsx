"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { XOLogo } from "@/components/xo/logo"
import { LayoutDashboardIcon, TargetIcon, UsersIcon, Settings2Icon, CircleHelpIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, HashIcon, MoreHorizontalIcon, CommandIcon } from "lucide-react"

const data = {
  user: {
    name: "xo",
    email: "admin@xo.dev",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: <UsersIcon />,
    },
    {
      title: "Objectives",
      url: "/objectives",
      icon: <TargetIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
  documents: [
    {
      name: "Storage",
      url: "#",
      icon: <DatabaseIcon />,
    },
    {
      name: "Reports",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Docs",
      url: "#",
      icon: <FileIcon />,
    },
  ],
  channels: [
    {
      name: "general",
      url: "/channel/general",
      icon: <HashIcon />,
    },
    {
      name: "code-review",
      url: "/channel/code-review",
      icon: <HashIcon />,
    },
    {
      name: "design",
      url: "/channel/design",
      icon: <HashIcon />,
    },
    {
      name: "approvals",
      url: "/channel/approvals",
      icon: <HashIcon />,
    },
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <XOLogo size={20} />
              <span className="text-base font-semibold">XO Org</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarMenu>
            {data.channels.slice(0, 3).map((ch) => (
              <SidebarMenuItem key={ch.name}>
                <SidebarMenuButton render={<a href={ch.url} />}>
                  {ch.icon}
                  <span>{ch.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {data.channels.length > 3 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/70">
                  <MoreHorizontalIcon className="text-sidebar-foreground/70" />
                  <span>More</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden px-2 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
                tooltip="Command Palette"
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true, bubbles: true }))}
              >
                <CommandIcon className="size-4" />
                <span>Command</span>
                <kbd className="ml-auto inline-flex h-5 items-center gap-0.5 rounded border border-sidebar-border bg-sidebar-accent px-1.5 text-[10px] font-medium text-sidebar-foreground/50">
                  ⌘K
                </kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
