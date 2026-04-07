"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  GithubIcon,
  ExternalLinkIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  GitBranchIcon,
  LockIcon,
  GlobeIcon,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface Installation {
  installationId: number
  githubUsername: string
  avatarUrl: string | null
  repoScope: "all" | string[]
  status: "connected" | "disconnected" | "expired"
  connectedAt: number
  updatedAt: number
}

interface GitHubStatus {
  configured: boolean
  connected: boolean
  installation: Installation | null
}

interface Repo {
  id: number
  name: string
  fullName: string
  private: boolean
  description: string | null
  defaultBranch: string
  language: string | null
  url: string
}

// ─── Component ───────────────────────────────────────────────

export function GitHubConnector() {
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [repoCount, setRepoCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reposLoading, setReposLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showRepos, setShowRepos] = useState(false)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/github/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStatus(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchRepos = useCallback(() => {
    setReposLoading(true)
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setRepos(data.data.repos)
          setRepoCount(data.data.totalCount)
        }
      })
      .catch(() => {})
      .finally(() => setReposLoading(false))
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (status?.connected && showRepos && repos.length === 0) {
      fetchRepos()
    }
  }, [status, showRepos, repos.length, fetchRepos])

  const handleConnect = () => {
    window.location.href = "/api/github/connect?return_to=/org/connections"
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/github/disconnect", { method: "DELETE" })
      setStatus((prev) =>
        prev ? { ...prev, connected: false, installation: null } : null
      )
      setRepos([])
      setRepoCount(0)
      setShowRepos(false)
    } catch {
      // Ignore
    } finally {
      setDisconnecting(false)
    }
  }

  const handleManage = () => {
    if (status?.installation) {
      window.open(
        `https://github.com/settings/installations/${status.installation.installationId}`,
        "_blank"
      )
    }
  }

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <GithubIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>GitHub</CardTitle>
              <CardDescription>Loading connection status...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // ─── Not configured ─────────────────────────────────────────

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <GithubIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>GitHub</CardTitle>
              <CardDescription>
                GitHub App is not configured. Set GITHUB_APP_ID and
                GITHUB_APP_PRIVATE_KEY in your environment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Not Configured</Badge>
        </CardContent>
      </Card>
    )
  }

  // ─── Not connected ──────────────────────────────────────────

  if (!status.connected || !status.installation) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <GithubIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>GitHub</CardTitle>
              <CardDescription>
                Connect your GitHub account to give agents access to repos,
                issues, and pull requests.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <GithubIcon className="size-4" />
            Connect GitHub
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── Connected state ────────────────────────────────────────

  const inst = status.installation
  const connectedDate = new Date(inst.connectedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
            {inst.avatarUrl ? (
              <img
                src={inst.avatarUrl}
                alt={inst.githubUsername}
                className="size-10 rounded-lg"
              />
            ) : (
              <GithubIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>{inst.githubUsername}</CardTitle>
              <Badge
                variant="default"
                className="bg-primary/15 text-primary"
              >
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
            </div>
            <CardDescription>
              Connected {connectedDate} &middot;{" "}
              {inst.repoScope === "all"
                ? "All repositories"
                : `${(inst.repoScope as string[]).length} repositories`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleManage}>
            <ExternalLinkIcon className="size-3.5" />
            Manage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRepos((v) => !v)}
          >
            <GitBranchIcon className="size-3.5" />
            {showRepos ? "Hide Repos" : "View Repos"}
            {repoCount > 0 && (
              <span className="text-muted-foreground">({repoCount})</span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
          <div className="flex-1" />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <LoaderIcon className="size-3.5 animate-spin" />
            ) : (
              <XCircleIcon className="size-3.5" />
            )}
            Disconnect
          </Button>
        </div>

        {/* Repository list */}
        {showRepos && (
          <>
            <Separator />
            {reposLoading ? (
              <div className="flex items-center justify-center py-6">
                <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : repos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No repositories accessible.
              </p>
            ) : (
              <div className="flex flex-col gap-0">
                {repos.map((repo, i) => (
                  <div key={repo.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 py-2.5">
                      {repo.private ? (
                        <LockIcon className="size-3.5 text-amber-400/70 shrink-0" />
                      ) : (
                        <GlobeIcon className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex flex-1 flex-col min-w-0">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {repo.fullName}
                        </a>
                        <span className="text-xs text-muted-foreground truncate">
                          {repo.description ?? "No description"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {repo.language && (
                          <span className="text-xs text-muted-foreground">
                            {repo.language}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {repo.defaultBranch}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
