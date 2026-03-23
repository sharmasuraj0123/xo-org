"use client"

import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftIcon,
  BotIcon,
  GlobeIcon,
  KeyIcon,
  ShieldIcon,
  HashIcon,
} from "lucide-react"

const availableChannels = [
  "general",
  "engineering",
  "design",
  "product",
  "support",
  "sales",
  "marketing",
  "random",
]

export default function ConnectAgentPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Connect Agent" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Back + heading */}
            <div className="flex items-center gap-3">
              <Link href="/agents">
                <Button variant="outline" size="icon">
                  <ArrowLeftIcon className="size-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-lg font-semibold">Connect a New Agent</h2>
                <p className="text-sm text-muted-foreground">
                  Register an external agent by providing its endpoint and
                  credentials.
                </p>
              </div>
            </div>

            <div className="grid gap-6 @3xl/main:grid-cols-2">
              {/* Identity & Connection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BotIcon className="size-4 text-muted-foreground" />
                    <CardTitle>Identity</CardTitle>
                  </div>
                  <CardDescription>
                    Name and describe this agent so your team can identify it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      placeholder="e.g. Research Assistant"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="agent-description">Description</Label>
                    <Textarea
                      id="agent-description"
                      placeholder="What does this agent do?"
                      className="min-h-20 resize-none"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Connection Endpoint
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="agent-url">Agent URL</Label>
                    <Input
                      id="agent-url"
                      placeholder="https://api.example.com/agent"
                    />
                    <p className="text-xs text-muted-foreground">
                      The base URL where this agent is hosted. Must be
                      accessible from your network.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="api-key">
                      <KeyIcon className="size-3.5" />
                      API Key
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Role & Permissions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldIcon className="size-4 text-muted-foreground" />
                    <CardTitle>Role & Permissions</CardTitle>
                  </div>
                  <CardDescription>
                    Define the agent's role, model, and what it can access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select defaultValue="member">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Model Provider</Label>
                    <Select defaultValue="anthropic">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Model</Label>
                    <Select defaultValue="claude-sonnet">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-opus">Claude Opus</SelectItem>
                        <SelectItem value="claude-sonnet">
                          Claude Sonnet
                        </SelectItem>
                        <SelectItem value="claude-haiku">
                          Claude Haiku
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <HashIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Channel Access</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which channels this agent can read and respond in.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableChannels.map((channel) => (
                      <Badge
                        key={channel}
                        variant="outline"
                        className="cursor-pointer select-none hover:bg-primary hover:text-primary-foreground"
                      >
                        #{channel}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>System Instructions</CardTitle>
                <CardDescription>
                  Provide the system prompt or persona instructions this agent
                  should follow when responding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="You are a helpful research assistant that specializes in..."
                  className="min-h-32 resize-y"
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t px-6 py-4">
                <Link href="/agents">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button>Connect Agent</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
