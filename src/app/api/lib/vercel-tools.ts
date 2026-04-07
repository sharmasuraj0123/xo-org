/**
 * Vercel tool operations for agents.
 */

import { vercelFetch } from "./vercel"
import { getAccessToken } from "./vercel-store"
import type { VercelToolName, VercelToolResult, VercelToolDefinition } from "./types"

export const VERCEL_TOOLS: VercelToolDefinition[] = [
  // ── Projects ───────────────────────────────────────────────
  {
    name: "vercel.projects.list",
    description: "List all projects in the connected account or team",
    params: {
      limit: { type: "number", required: false, description: "Max results (default 20)" },
    },
  },
  {
    name: "vercel.projects.get",
    description: "Get detailed info about a specific project including domains and settings",
    params: {
      idOrName: { type: "string", required: true, description: "Project ID or name" },
    },
  },
  // ── Deployments ────────────────────────────────────────────
  {
    name: "vercel.deployments.list",
    description: "List recent deployments, optionally filtered by project",
    params: {
      projectId: { type: "string", required: false, description: "Filter by project ID" },
      limit: { type: "number", required: false, description: "Max results (default 20)" },
      state: { type: "string", required: false, description: "Filter: BUILDING, READY, ERROR, QUEUED, CANCELED" },
    },
  },
  {
    name: "vercel.deployments.get",
    description: "Get detailed info about a specific deployment",
    params: {
      id: { type: "string", required: true, description: "Deployment ID" },
    },
  },
  {
    name: "vercel.deployments.create",
    description: "Trigger a new deployment from a Git source",
    params: {
      name: { type: "string", required: true, description: "Project name" },
      gitSource: { type: "object", required: true, description: "{ repo, ref, type } — e.g. { repo: 'org/repo', ref: 'main', type: 'github' }" },
    },
  },
  {
    name: "vercel.deployments.cancel",
    description: "Cancel a deployment that is currently building or queued",
    params: {
      id: { type: "string", required: true, description: "Deployment ID" },
    },
  },
  {
    name: "vercel.deployments.promote",
    description: "Promote a deployment to production (used for rollbacks)",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
      deploymentId: { type: "string", required: true, description: "Deployment ID to promote" },
    },
  },
  // ── Environment Variables ──────────────────────────────────
  {
    name: "vercel.env.list",
    description: "List environment variables for a project (keys and targets, values masked)",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
    },
  },
  {
    name: "vercel.env.create",
    description: "Create an environment variable for a project",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
      key: { type: "string", required: true, description: "Variable name" },
      value: { type: "string", required: true, description: "Variable value" },
      target: { type: "array", required: false, description: "Targets: ['production', 'preview', 'development'] (default: all)" },
      type: { type: "string", required: false, description: "Type: plain, encrypted, secret, system (default: encrypted)" },
    },
  },
  {
    name: "vercel.env.delete",
    description: "Delete an environment variable from a project",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
      envId: { type: "string", required: true, description: "Environment variable ID" },
    },
  },
  // ── Domains ────────────────────────────────────────────────
  {
    name: "vercel.domains.list",
    description: "List custom domains attached to a project",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
    },
  },
  {
    name: "vercel.domains.add",
    description: "Attach a custom domain to a project",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
      domain: { type: "string", required: true, description: "Domain name (e.g. app.example.com)" },
    },
  },
  {
    name: "vercel.domains.remove",
    description: "Remove a custom domain from a project",
    params: {
      projectId: { type: "string", required: true, description: "Project ID" },
      domain: { type: "string", required: true, description: "Domain name" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeVercelTool(
  tool: VercelToolName,
  params: Record<string, unknown>
): Promise<VercelToolResult> {
  const auth = await getAccessToken()
  if (!auth) return { tool, ok: false, error: "No active Vercel connection" }

  const { token, teamId } = auth

  try {
    switch (tool) {
      case "vercel.projects.list": return await execProjectsList(token, teamId, params)
      case "vercel.projects.get": return await execProjectsGet(token, teamId, params)
      case "vercel.deployments.list": return await execDeploymentsList(token, teamId, params)
      case "vercel.deployments.get": return await execDeploymentsGet(token, teamId, params)
      case "vercel.deployments.create": return await execDeploymentsCreate(token, teamId, params)
      case "vercel.deployments.cancel": return await execDeploymentsCancel(token, teamId, params)
      case "vercel.deployments.promote": return await execDeploymentsPromote(token, teamId, params)
      case "vercel.env.list": return await execEnvList(token, teamId, params)
      case "vercel.env.create": return await execEnvCreate(token, teamId, params)
      case "vercel.env.delete": return await execEnvDelete(token, teamId, params)
      case "vercel.domains.list": return await execDomainsList(token, teamId, params)
      case "vercel.domains.add": return await execDomainsAdd(token, teamId, params)
      case "vercel.domains.remove": return await execDomainsRemove(token, teamId, params)
      default: return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    return { tool, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function ok(tool: VercelToolName, data: unknown): VercelToolResult {
  return { tool, ok: true, data }
}

// ─── Projects ────────────────────────────────────────────────

async function execProjectsList(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const params: Record<string, string> = { limit: String(p.limit ?? 20) }
  const data = await vercelFetch(token, teamId, "/v9/projects", { params })
  const projects = (data.projects as Array<Record<string, unknown>>) ?? []
  return ok("vercel.projects.list", {
    projects: projects.map((pr) => ({
      id: pr.id, name: pr.name, framework: pr.framework,
      latestDeploymentUrl: (pr.targets as Record<string, unknown>)?.production
        ? `https://${((pr.targets as Record<string, unknown>).production as Record<string, unknown>)?.url}`
        : null,
      repo: pr.link ? `${(pr.link as Record<string, unknown>).org}/${(pr.link as Record<string, unknown>).repo}` : null,
      createdAt: pr.createdAt, updatedAt: pr.updatedAt,
    })),
  })
}

async function execProjectsGet(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v9/projects/${p.idOrName}`)
  return ok("vercel.projects.get", {
    id: data.id, name: data.name, framework: data.framework,
    nodeVersion: data.nodeVersion, buildCommand: data.buildCommand,
    outputDirectory: data.outputDirectory, rootDirectory: data.rootDirectory,
    repo: data.link ? `${(data.link as Record<string, unknown>).org}/${(data.link as Record<string, unknown>).repo}` : null,
    createdAt: data.createdAt,
  })
}

// ─── Deployments ─────────────────────────────────────────────

async function execDeploymentsList(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const params: Record<string, string> = { limit: String(p.limit ?? 20) }
  if (p.projectId) params.projectId = p.projectId as string
  if (p.state) params.state = p.state as string
  const data = await vercelFetch(token, teamId, "/v6/deployments", { params })
  const deployments = (data.deployments as Array<Record<string, unknown>>) ?? []
  return ok("vercel.deployments.list", {
    deployments: deployments.map((d) => ({
      uid: d.uid, name: d.name, url: d.url, state: d.state,
      created: d.created, buildingAt: d.buildingAt, ready: d.ready,
      source: d.source,
      meta: d.meta ? {
        githubCommitMessage: (d.meta as Record<string, unknown>).githubCommitMessage,
        githubCommitRef: (d.meta as Record<string, unknown>).githubCommitRef,
      } : null,
    })),
  })
}

async function execDeploymentsGet(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v13/deployments/${p.id}`)
  return ok("vercel.deployments.get", {
    id: data.id, name: data.name, url: data.url, state: data.readyState ?? data.state,
    created: data.createdAt, buildingAt: data.buildingAt, ready: data.ready,
    source: data.source, target: data.target,
    meta: data.meta,
    regions: data.regions,
  })
}

async function execDeploymentsCreate(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const body: Record<string, unknown> = {
    name: p.name,
    gitSource: p.gitSource,
  }
  const data = await vercelFetch(token, teamId, "/v13/deployments", { method: "POST", body })
  return ok("vercel.deployments.create", {
    id: data.id, url: data.url, state: data.readyState ?? "BUILDING",
  })
}

async function execDeploymentsCancel(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v12/deployments/${p.id}/cancel`, { method: "PATCH" })
  return ok("vercel.deployments.cancel", { id: data.id, state: data.readyState ?? "CANCELED" })
}

async function execDeploymentsPromote(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v10/projects/${p.projectId}/promote/${p.deploymentId}`, { method: "POST" })
  return ok("vercel.deployments.promote", { jobId: data.jobId, status: data.status })
}

// ─── Environment Variables ───────────────────────────────────

async function execEnvList(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v10/projects/${p.projectId}/env`)
  const envs = (data.envs as Array<Record<string, unknown>>) ?? []
  return ok("vercel.env.list", {
    envs: envs.map((e) => ({
      id: e.id, key: e.key, target: e.target, type: e.type,
      configurationId: e.configurationId, createdAt: e.createdAt,
      // Values are intentionally NOT returned for security
    })),
  })
}

async function execEnvCreate(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const body = {
    key: p.key,
    value: p.value,
    target: p.target ?? ["production", "preview", "development"],
    type: p.type ?? "encrypted",
  }
  const data = await vercelFetch(token, teamId, `/v10/projects/${p.projectId}/env`, { method: "POST", body })
  const created = data.created as Record<string, unknown> | undefined
  return ok("vercel.env.create", { id: created?.id, key: p.key, target: body.target })
}

async function execEnvDelete(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  await vercelFetch(token, teamId, `/v10/projects/${p.projectId}/env/${p.envId}`, { method: "DELETE" })
  return ok("vercel.env.delete", { deleted: true, envId: p.envId })
}

// ─── Domains ─────────────────────────────────────────────────

async function execDomainsList(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v9/projects/${p.projectId}/domains`)
  const domains = (data.domains as Array<Record<string, unknown>>) ?? []
  return ok("vercel.domains.list", {
    domains: domains.map((d) => ({
      name: d.name, redirect: d.redirect, redirectStatusCode: d.redirectStatusCode,
      verified: d.verified, createdAt: d.createdAt, updatedAt: d.updatedAt,
    })),
  })
}

async function execDomainsAdd(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  const data = await vercelFetch(token, teamId, `/v10/projects/${p.projectId}/domains`, {
    method: "POST", body: { name: p.domain },
  })
  return ok("vercel.domains.add", { name: data.name, verified: data.verified })
}

async function execDomainsRemove(token: string, teamId: string | null, p: Record<string, unknown>): Promise<VercelToolResult> {
  await vercelFetch(token, teamId, `/v9/projects/${p.projectId}/domains/${p.domain}`, { method: "DELETE" })
  return ok("vercel.domains.remove", { deleted: true, domain: p.domain })
}
