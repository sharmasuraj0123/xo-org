/**
 * OpenClaw Gateway WebSocket Client — V3 Protocol
 *
 * Implements the real Paperclip adapter protocol:
 *  - WebSocket persistent connection (ws:// or wss://)
 *  - ED25519 device authentication with challenge-response
 *  - V3 frame protocol (req/res/event)
 *  - Agent execution with streaming events
 *  - agent.wait for synchronous completion
 *  - Auto device pairing on first connect
 *  - Session key strategies (issue/fixed/run)
 */

import WebSocket from "ws"
import crypto from "node:crypto"

// ─── Protocol Constants ──────────────────────────────────────

const PROTOCOL_VERSION = 3
const DEFAULT_SCOPES = ["operator.admin", "operator.write", "operator.read"]
const DEFAULT_ROLE = "operator"
const DEFAULT_CLIENT_ID = "gateway-client"
const DEFAULT_CLIENT_MODE = "backend"
const DEFAULT_CLIENT_VERSION = "xo-org"
const MAX_PAYLOAD = 25 * 1024 * 1024 // 25MB

// ─── Frame Types ─────────────────────────────────────────────

interface GatewayRequestFrame {
  type: "req"
  id: string
  method: string
  params: unknown
}

interface GatewayResponseFrame {
  type: "res"
  id: string
  ok: boolean
  payload?: unknown
  status?: string
  error?: { code: string; message: string }
}

interface GatewayEventFrame {
  type: "event"
  event: string
  payload?: Record<string, unknown>
  seq?: number
}

type GatewayFrame = GatewayRequestFrame | GatewayResponseFrame | GatewayEventFrame

// ─── Config Types ────────────────────────────────────────────

export interface GatewayConfig {
  // Connection
  url: string
  headers?: Record<string, string>
  timeoutSec?: number               // Overall adapter timeout (min 120)
  waitTimeoutMs?: number             // agent.wait timeout override

  // Authentication
  authToken?: string                 // Shared gateway token
  password?: string                  // Gateway shared password
  deviceToken?: string               // Device-specific token
  disableDeviceAuth?: boolean        // Skip ED25519 device signing
  autoPairOnFirstConnect?: boolean   // Auto-approve device pairing (default true)
  privateKeyPem?: string             // ED25519 private key PEM

  // Client identity
  clientId?: string                  // "gateway-client" default
  clientMode?: string                // "backend" default
  clientVersion?: string             // "xo-org" default
  role?: string                      // "operator" default
  scopes?: string[]                  // ["operator.admin"] default
  deviceFamily?: string              // Device family metadata

  // Session routing
  sessionKeyStrategy?: "issue" | "fixed" | "run"
  sessionKey?: string                // Fixed key when strategy="fixed"

  // Payload
  payloadTemplate?: Record<string, unknown>  // Extra fields merged into agent request
  paperclipApiUrl?: string           // Override API URL advertised to agent
  workspaceRuntime?: Record<string, unknown> // Reserved workspace runtime metadata
}

export interface DeviceIdentity {
  deviceId: string
  publicKeyRawBase64Url: string
  privateKeyPem: string
  source: "configured" | "ephemeral"
}

export interface AgentEvent {
  runId: string
  stream: "assistant" | "error" | "lifecycle"
  data: Record<string, unknown>
  seq?: number
}

export interface ExecutionResult {
  exitCode: number
  signal: string | null
  timedOut: boolean
  provider?: string
  model?: string
  usage?: { inputTokens: number; outputTokens: number; cachedInputTokens?: number }
  costUsd?: number
  resultText?: string
  summary?: string
  resultJson?: Record<string, unknown>
  runtimeServices?: unknown[]
  sessionDisplayId?: string
  events: AgentEvent[]
  error?: string
}

// ─── Wake Payload Builder (Step 2) ──────────────────────────

export interface WakeContext {
  runId: string
  agentId: string
  agentName?: string
  companyId?: string
  taskId?: string
  issueId?: string
  issueIds?: string[]
  wakeReason?: string
  wakeCommentId?: string
  approvalId?: string
  approvalStatus?: string
  promptTemplate?: string
  workspace?: Record<string, unknown>
  workspaces?: Record<string, unknown>[]
}

export function buildWakeText(ctx: WakeContext): string {
  return [
    `You've been woken by Paperclip.`,
    ctx.wakeReason ? `Wake reason: ${ctx.wakeReason}` : null,
    ctx.taskId ? `Task: ${ctx.taskId}` : null,
    ctx.issueId ? `Issue: ${ctx.issueId}` : null,
    ``,
    `Workflow steps:`,
    `1. Check your current assignments`,
    `2. Pick the highest priority work`,
    `3. Checkout the relevant code/context`,
    `4. Do the work`,
    `5. Update your status when done`,
  ].filter(Boolean).join("\n")
}

export function buildPaperclipPayload(
  ctx: WakeContext,
  config: GatewayConfig
): Record<string, unknown> {
  return {
    runId: ctx.runId,
    companyId: ctx.companyId,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
    taskId: ctx.taskId,
    issueId: ctx.issueId,
    issueIds: ctx.issueIds,
    wakeReason: ctx.wakeReason,
    wakeCommentId: ctx.wakeCommentId,
    approvalId: ctx.approvalId,
    approvalStatus: ctx.approvalStatus,
    apiUrl: config.paperclipApiUrl,
    workspace: ctx.workspace,
    workspaces: ctx.workspaces,
    workspaceRuntime: config.workspaceRuntime,
  }
}

export function buildAgentParams(
  ctx: WakeContext,
  config: GatewayConfig,
  sessionKey: string
): Record<string, unknown> {
  const message = ctx.promptTemplate
    ? `${ctx.promptTemplate}\n\n${buildWakeText(ctx)}`
    : buildWakeText(ctx)

  return {
    ...(config.payloadTemplate ?? {}),
    message,
    sessionKey,
    idempotencyKey: ctx.runId,
    timeout: config.waitTimeoutMs ?? (config.timeoutSec ?? 120) * 1000,
    paperclip: buildPaperclipPayload(ctx, config),
  }
}

// ─── ED25519 Device Identity ─────────────────────────────────

export function resolveDeviceIdentity(config: GatewayConfig): DeviceIdentity {
  if (config.privateKeyPem) {
    // Use configured key
    const keyObj = crypto.createPrivateKey(config.privateKeyPem)
    const publicKey = crypto.createPublicKey(keyObj)
    const rawPublic = publicKey.export({ type: "spki", format: "der" })
    // ED25519 public key is last 32 bytes of SPKI DER
    const raw32 = rawPublic.subarray(rawPublic.length - 32)
    return {
      deviceId: crypto.randomUUID(),
      publicKeyRawBase64Url: raw32.toString("base64url"),
      privateKeyPem: config.privateKeyPem,
      source: "configured",
    }
  }

  // Generate ephemeral ED25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519")
  const rawPublic = publicKey.export({ type: "spki", format: "der" })
  const raw32 = rawPublic.subarray(rawPublic.length - 32)
  const pemPrivate = privateKey.export({ type: "pkcs8", format: "pem" }) as string

  return {
    deviceId: crypto.randomUUID(),
    publicKeyRawBase64Url: raw32.toString("base64url"),
    privateKeyPem: pemPrivate,
    source: "ephemeral",
  }
}

function signDevicePayload(
  nonce: string,
  identity: DeviceIdentity,
  config: GatewayConfig
): { signature: string; signedAt: number } {
  const signedAt = Date.now()
  const role = config.role ?? DEFAULT_ROLE
  const scopes = (config.scopes ?? DEFAULT_SCOPES).join(",")
  const clientId = config.clientId ?? DEFAULT_CLIENT_ID
  const clientMode = config.clientMode ?? DEFAULT_CLIENT_MODE
  const token = config.authToken ?? ""
  const platform = process.platform
  const deviceFamily = config.deviceFamily ?? ""

  // V3 pipe-delimited payload
  const payload = [
    "v3", identity.deviceId, clientId, clientMode, role, scopes,
    String(signedAt), token, nonce, platform, deviceFamily,
  ].join("|")

  const privateKey = crypto.createPrivateKey(identity.privateKeyPem)
  const sig = crypto.sign(null, Buffer.from(payload), privateKey)

  return {
    signature: sig.toString("base64url"),
    signedAt,
  }
}

// ─── Session Key Resolution ──────────────────────────────────

export function resolveSessionKey(
  config: GatewayConfig,
  context: { taskId?: string; issueId?: string; runId?: string }
): string {
  const strategy = config.sessionKeyStrategy ?? "issue"

  switch (strategy) {
    case "issue":
      return `paperclip:issue:${context.issueId ?? context.taskId ?? "default"}`
    case "fixed":
      return config.sessionKey ?? "paperclip"
    case "run":
      return `paperclip:run:${context.runId ?? crypto.randomUUID().slice(0, 8)}`
    default:
      return "paperclip"
  }
}

// ─── WebSocket Client ────────────────────────────────────────

export class GatewayWsClient {
  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, {
    resolve: (frame: GatewayResponseFrame) => void
    reject: (err: Error) => void
  }>()
  private eventHandlers: Array<(event: GatewayEventFrame) => void> = []
  private challengeNonce: string | null = null
  private challengeResolve: ((nonce: string) => void) | null = null

  constructor(private config: GatewayConfig) {}

  // ── Connect ────────────────────────────────────────────────

  async connect(connectTimeoutMs = 10_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.config.url
      const headers: Record<string, string> = { ...this.config.headers }
      if (this.config.authToken) {
        headers["x-openclaw-token"] = this.config.authToken
      }
      // Coder workspace proxy auth: pass session token via cookie or header
      const coderToken = process.env.CODER_SESSION_TOKEN
      if (coderToken) {
        headers["Cookie"] = `coder_session_token=${coderToken}`
      }

      const ws = new WebSocket(url, { headers, maxPayload: MAX_PAYLOAD, followRedirects: true })
      this.ws = ws

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error(`WebSocket connect timeout after ${connectTimeoutMs}ms`))
      }, connectTimeoutMs)

      ws.on("open", () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString()) as GatewayFrame
          this.handleFrame(frame)
        } catch { /* ignore malformed frames */ }
      })

      ws.on("error", (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      ws.on("close", () => {
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          pending.reject(new Error("WebSocket closed"))
        }
        this.pendingRequests.clear()
      })
    })
  }

  private handleFrame(frame: GatewayFrame) {
    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id)
      if (pending) {
        this.pendingRequests.delete(frame.id)
        pending.resolve(frame)
      }
    } else if (frame.type === "event") {
      if (frame.event === "connect.challenge" && frame.payload) {
        this.challengeNonce = frame.payload.nonce as string
        this.challengeResolve?.(this.challengeNonce)
      }
      for (const handler of this.eventHandlers) {
        handler(frame)
      }
    }
  }

  // ── Send Request ───────────────────────────────────────────

  async sendRequest(
    method: string,
    params: unknown,
    timeoutMs = 30_000
  ): Promise<GatewayResponseFrame> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }

    const id = crypto.randomUUID()
    const frame: GatewayRequestFrame = { type: "req", id, method, params }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request '${method}' timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(id, {
        resolve: (res) => { clearTimeout(timeout); resolve(res) },
        reject: (err) => { clearTimeout(timeout); reject(err) },
      })

      this.ws!.send(JSON.stringify(frame))
    })
  }

  // ── Wait for Challenge ─────────────────────────────────────

  async waitForChallenge(timeoutMs = 5000): Promise<string> {
    if (this.challengeNonce) return this.challengeNonce
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("connect.challenge event not received"))
      }, timeoutMs)
      this.challengeResolve = (nonce) => {
        clearTimeout(timeout)
        resolve(nonce)
      }
    })
  }

  // ── Event Subscription ─────────────────────────────────────

  onEvent(handler: (event: GatewayEventFrame) => void) {
    this.eventHandlers.push(handler)
  }

  // ── Close ──────────────────────────────────────────────────

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, "xo-org-complete")
    }
    this.ws = null
    this.eventHandlers = []
  }
}

// ─── Connection Handshake ────────────────────────────────────

export async function connectToGateway(
  config: GatewayConfig
): Promise<GatewayWsClient> {
  // Step 1: Validate URL
  const url = config.url
  if (!url) throw new Error("openclaw_gateway_url_missing")
  let parsed: URL
  try { parsed = new URL(url) } catch { throw new Error("openclaw_gateway_url_invalid") }
  if (!["ws:", "wss:"].includes(parsed.protocol)) {
    throw new Error("openclaw_gateway_url_protocol: must be ws:// or wss://")
  }

  const connectTimeout = Math.min(15_000, (config.timeoutSec ?? 120) * 1000) || 10_000

  // Step 2: Connect WebSocket
  const client = new GatewayWsClient(config)
  await client.connect(connectTimeout)

  // Step 3: Wait for challenge nonce
  const nonce = await client.waitForChallenge(5000)

  // Step 4: Build connect params
  const connectParams: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: {
      id: config.clientId ?? DEFAULT_CLIENT_ID,
      version: config.clientVersion ?? DEFAULT_CLIENT_VERSION,
      platform: process.platform,
      mode: config.clientMode ?? DEFAULT_CLIENT_MODE,
      deviceFamily: config.deviceFamily,
    },
    role: config.role ?? DEFAULT_ROLE,
    scopes: config.scopes ?? DEFAULT_SCOPES,
    auth: {} as Record<string, unknown>,
  }

  // Auth credentials
  const auth = connectParams.auth as Record<string, unknown>
  if (config.authToken) auth.token = config.authToken
  if (config.deviceToken) auth.deviceToken = config.deviceToken
  if (config.password) auth.password = config.password

  // Step 5: Device authentication (ED25519)
  if (!config.disableDeviceAuth) {
    const identity = resolveDeviceIdentity(config)
    const { signature, signedAt } = signDevicePayload(nonce, identity, config)

    connectParams.device = {
      id: identity.deviceId,
      publicKey: identity.publicKeyRawBase64Url,
      signature,
      signedAt,
      nonce,
    }
  }

  // Step 6: Send connect request
  const res = await client.sendRequest("connect", connectParams, connectTimeout)

  if (!res.ok) {
    const errorCode = res.error?.code ?? "unknown"

    // Handle pairing required
    if (errorCode === "pairing_required" && config.autoPairOnFirstConnect !== false) {
      // Auto-pair flow: close, pair, reconnect
      client.close()
      await autoApproveDevicePairing(config, res)
      // Retry connection
      return connectToGateway({ ...config, autoPairOnFirstConnect: false })
    }

    client.close()
    throw new Error(`Gateway connect failed: ${res.error?.message ?? errorCode}`)
  }

  return client
}

// ─── Auto Device Pairing ─────────────────────────────────────

async function autoApproveDevicePairing(
  config: GatewayConfig,
  errorRes: GatewayResponseFrame
): Promise<void> {
  // Extract pairing request ID from error
  const payload = errorRes.payload as Record<string, unknown> | undefined
  const requestId = payload?.pairingRequestId as string | undefined

  // Open a new connection with pairing scope
  const pairingConfig: GatewayConfig = {
    ...config,
    scopes: ["operator.pairing"],
    disableDeviceAuth: true,
    autoPairOnFirstConnect: false,
  }

  const client = new GatewayWsClient(pairingConfig)
  await client.connect(10_000)
  const nonce = await client.waitForChallenge(5000)

  // Connect with auth credentials (no device auth for pairing)
  const connectParams: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: { id: DEFAULT_CLIENT_ID, version: DEFAULT_CLIENT_VERSION, platform: process.platform, mode: DEFAULT_CLIENT_MODE },
    role: DEFAULT_ROLE,
    scopes: ["operator.pairing"],
    auth: {} as Record<string, unknown>,
  }
  const auth = connectParams.auth as Record<string, unknown>
  if (config.authToken) auth.token = config.authToken
  if (config.password) auth.password = config.password

  const connectRes = await client.sendRequest("connect", connectParams, 10_000)
  if (!connectRes.ok) {
    client.close()
    throw new Error(`Pairing connect failed: ${connectRes.error?.message}`)
  }

  let pairId = requestId
  if (!pairId) {
    // List pending pairing requests
    const listRes = await client.sendRequest("device.pair.list", {}, 5000)
    if (listRes.ok && listRes.payload) {
      const requests = (listRes.payload as Record<string, unknown>).requests as Array<Record<string, unknown>> | undefined
      if (requests?.length) {
        pairId = requests[requests.length - 1].id as string
      }
    }
  }

  if (pairId) {
    await client.sendRequest("device.pair.approve", { requestId: pairId }, 5000)
  }

  client.close()
}

// ─── Agent Execution (Full Pipeline) ─────────────────────────

/**
 * Execute a full agent run through the OpenClaw Gateway.
 *
 * Implements all 9 steps from the deep dive:
 *  1. Validate config
 *  2. Build payloads (wakePayload, paperclipEnv, wakeText, agentParams)
 *  3. Resolve device identity (ED25519)
 *  4. WebSocket connection + challenge handshake
 *  5. Send agent request
 *  6. Stream agent events (real-time)
 *  7. Wait for completion (agent.wait)
 *  8. Assemble result (priority chain)
 *  9. Cleanup (close WebSocket)
 */
export async function executeAgent(
  config: GatewayConfig,
  ctx: WakeContext,
  onEvent?: (event: AgentEvent) => void,
  onLog?: (stream: "stdout" | "stderr", chunk: string) => void
): Promise<ExecutionResult> {
  const events: AgentEvent[] = []
  const assistantChunks: string[] = []
  let lifecycleError: string | null = null
  let agentMeta: Record<string, unknown> = {}

  let client: GatewayWsClient | null = null

  try {
    // ── Step 1: Validate config ──────────────────────────────
    // (done in connectToGateway: url_missing, url_invalid, url_protocol)

    // ── Step 2: Build payloads ───────────────────────────────
    const sessionKey = resolveSessionKey(config, {
      taskId: ctx.taskId,
      issueId: ctx.issueId,
      runId: ctx.runId,
    })
    const agentParams = buildAgentParams(ctx, config, sessionKey)

    onLog?.("stdout", `[openclaw-gateway] run=${ctx.runId} session=${sessionKey} wake=${ctx.wakeReason ?? "manual"}`)

    // ── Step 3-4: Connect + ED25519 handshake ────────────────
    client = await connectToGateway(config)
    onLog?.("stdout", `[openclaw-gateway] connected to ${config.url}`)

    // ── Step 5+6: Subscribe to events + send agent request ───
    client.onEvent((frame) => {
      if (frame.event !== "agent") return
      const p = frame.payload
      if (!p) return

      // Filter by runId
      const eventRunId = p.runId as string
      if (eventRunId && eventRunId !== ctx.runId) return

      const stream = (p.stream as "assistant" | "error" | "lifecycle") ?? "assistant"
      const data = (p.data as Record<string, unknown>) ?? {}

      const agentEvent: AgentEvent = {
        runId: ctx.runId,
        stream,
        data,
        seq: frame.seq,
      }

      events.push(agentEvent)
      onEvent?.(agentEvent)

      // Log to stdout (matches Paperclip's onLog pattern)
      onLog?.("stdout", `[openclaw-gateway:event] run=${ctx.runId} stream=${stream} data=${JSON.stringify(data)}`)

      // Collect assistant text deltas
      if (stream === "assistant") {
        const delta = data.delta as string
        const text = data.text as string
        if (delta) assistantChunks.push(delta)
        else if (text) assistantChunks.push(text)
      }

      // Track lifecycle errors (error/failed/cancelled)
      if (stream === "lifecycle" || stream === "error") {
        const phase = data.phase as string
        if (["error", "failed", "cancelled"].includes(phase ?? "")) {
          lifecycleError = (data.message as string) ?? phase
        }
      }
    })

    // Send agent request (expectFinal: true — waits for final "ok" not just "accepted")
    const agentTimeout = (config.timeoutSec ?? 120) * 1000
    const agentRes = await client.sendRequest("agent", agentParams, agentTimeout)

    if (!agentRes.ok) {
      return {
        exitCode: 1, signal: null, timedOut: false, events,
        error: `openclaw_gateway_agent_error: ${agentRes.error?.message ?? "unknown"}`,
      }
    }

    // ── Step 7: Wait for completion if status is "accepted" ──
    let acceptedPayload = agentRes.payload as Record<string, unknown> | undefined
    let latestResultPayload: Record<string, unknown> | undefined
    const status = agentRes.status ?? (acceptedPayload?.status as string)

    // Store meta from initial response
    if (acceptedPayload?.meta) agentMeta = acceptedPayload.meta as Record<string, unknown>

    if (status === "accepted") {
      const waitTimeout = config.waitTimeoutMs ?? agentTimeout
      onLog?.("stdout", `[openclaw-gateway] status=accepted, sending agent.wait timeout=${waitTimeout}ms`)

      const waitRes = await client.sendRequest("agent.wait", {
        runId: ctx.runId,
        timeout: waitTimeout,
      }, waitTimeout + 5000) // Extra buffer for network

      if (!waitRes.ok) {
        const waitError = waitRes.error?.code ?? "unknown"
        return {
          exitCode: 1, signal: null,
          timedOut: waitError.includes("timeout"),
          events,
          error: `openclaw_gateway_wait_${waitError}`,
        }
      }

      const waitStatus = waitRes.status ?? ((waitRes.payload as Record<string, unknown>)?.status as string)

      if (waitStatus === "timeout") {
        return { exitCode: 1, signal: null, timedOut: true, events, error: "openclaw_gateway_wait_timeout" }
      }
      if (waitStatus === "error") {
        return { exitCode: 1, signal: null, timedOut: false, events, error: "openclaw_gateway_wait_error" }
      }
      if (waitStatus !== "ok" && waitStatus !== undefined) {
        return { exitCode: 1, signal: null, timedOut: false, events, error: `openclaw_gateway_wait_status_unexpected: ${waitStatus}` }
      }

      latestResultPayload = waitRes.payload as Record<string, unknown> | undefined
      if (latestResultPayload?.meta) agentMeta = { ...agentMeta, ...(latestResultPayload.meta as Record<string, unknown>) }
    }

    // ── Step 8: Assemble result (priority chain) ─────────────
    const usage = agentMeta.usage as Record<string, number> | undefined

    // Result text priority chain from deep dive:
    //  1. assistantChunks[] (collected from stream events)
    //  2. acceptedPayload.result.payloads[].text
    //  3. acceptedPayload.text or .summary
    //  4. latestResultPayload.result.payloads[].text
    //  5. latestResultPayload.text or .summary
    //  6. null
    let resultText: string | null = null

    if (assistantChunks.length > 0) {
      resultText = assistantChunks.join("") // Priority 1
    }
    if (!resultText && acceptedPayload) {
      const payloads = (acceptedPayload.result as Record<string, unknown>)?.payloads as Array<Record<string, unknown>> | undefined
      resultText = payloads?.map((p) => p.text).filter(Boolean).join("\n") ?? null // Priority 2
      if (!resultText) {
        resultText = (acceptedPayload.text as string) ?? (acceptedPayload.summary as string) ?? null // Priority 3
      }
    }
    if (!resultText && latestResultPayload) {
      const payloads = (latestResultPayload.result as Record<string, unknown>)?.payloads as Array<Record<string, unknown>> | undefined
      resultText = payloads?.map((p) => p.text).filter(Boolean).join("\n") ?? null // Priority 4
      if (!resultText) {
        resultText = (latestResultPayload.text as string) ?? (latestResultPayload.summary as string) ?? null // Priority 5
      }
    }

    if (lifecycleError && !resultText) {
      resultText = lifecycleError
    }

    const summary = (latestResultPayload?.result as Record<string, unknown>)?.summary as string
      ?? (acceptedPayload?.result as Record<string, unknown>)?.summary as string
      ?? undefined

    onLog?.("stdout", `[openclaw-gateway] completed exitCode=${lifecycleError ? 1 : 0} events=${events.length} tokens=${(usage?.in ?? 0) + (usage?.out ?? 0)}`)

    return {
      exitCode: lifecycleError ? 1 : 0,
      signal: null,
      timedOut: false,
      provider: agentMeta.provider as string,
      model: agentMeta.model as string,
      usage: usage ? {
        inputTokens: usage.in ?? usage.inputTokens ?? 0,
        outputTokens: usage.out ?? usage.outputTokens ?? 0,
        cachedInputTokens: usage.cached ?? usage.cachedInputTokens,
      } : undefined,
      costUsd: agentMeta.costUsd as number,
      resultText: resultText ?? undefined,
      summary,
      resultJson: latestResultPayload ?? acceptedPayload,
      runtimeServices: agentMeta.runtimeServices as unknown[],
      events,
      error: lifecycleError ?? undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    onLog?.("stderr", `[openclaw-gateway] error: ${msg}`)
    return {
      exitCode: 1, signal: null,
      timedOut: msg.includes("timeout"),
      events,
      error: msg,
    }
  } finally {
    // ── Step 9: Cleanup ──────────────────────────────────────
    client?.close()
    onLog?.("stdout", `[openclaw-gateway] WebSocket closed (xo-org-complete)`)
  }
}

// ─── Probe Gateway (Test Environment) ────────────────────────

export async function probeGateway(config: GatewayConfig): Promise<{
  status: "ok" | "challenge_only" | "failed"
  latencyMs: number
  error?: string
}> {
  const start = Date.now()
  try {
    // Single connection: connect, receive challenge, send auth, check response
    const probeConfig = { ...config, disableDeviceAuth: true, autoPairOnFirstConnect: false }
    const client = new GatewayWsClient(probeConfig)
    await client.connect(3000)

    await client.waitForChallenge(3000)

    // Build and send connect request on the same connection
    const connectParams: Record<string, unknown> = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: probeConfig.clientId ?? DEFAULT_CLIENT_ID,
        version: probeConfig.clientVersion ?? DEFAULT_CLIENT_VERSION,
        platform: process.platform,
        mode: probeConfig.clientMode ?? DEFAULT_CLIENT_MODE,
      },
      role: probeConfig.role ?? DEFAULT_ROLE,
      scopes: probeConfig.scopes ?? DEFAULT_SCOPES,
      auth: {} as Record<string, unknown>,
    }
    const auth = connectParams.auth as Record<string, unknown>
    if (probeConfig.authToken) auth.token = probeConfig.authToken
    if (probeConfig.password) auth.password = probeConfig.password

    const res = await client.sendRequest("connect", connectParams, 5000)
    client.close()

    if (res.ok) {
      return { status: "ok", latencyMs: Date.now() - start }
    }

    // Token accepted but device pairing required — token is valid
    const errorCode = res.error?.code ?? ""
    if (errorCode.includes("pairing") || errorCode.includes("device")) {
      return { status: "ok", latencyMs: Date.now() - start }
    }

    return { status: "challenge_only", latencyMs: Date.now() - start, error: `auth rejected: ${res.error?.code ?? "unknown"} — ${res.error?.message ?? ""}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Challenge timeout but connection succeeded means gateway is reachable
    // and likely requires device auth — treat as OK
    if (msg.includes("challenge event not received")) {
      return { status: "ok", latencyMs: Date.now() - start }
    }
    return {
      status: "failed",
      latencyMs: Date.now() - start,
      error: msg,
    }
  }
}

// ─── Payload Template Interpolation ──────────────────────────

export function interpolatePayload(
  template: Record<string, unknown>,
  context: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
        return context[path] ?? `{{${path}}}`
      })
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = interpolatePayload(value as Record<string, unknown>, context)
    } else {
      result[key] = value
    }
  }
  return result
}
