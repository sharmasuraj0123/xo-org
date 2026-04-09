import { NextResponse } from "next/server"
import { testEnvironment } from "../../../lib/openclaw-adapter"
import type { OpenClawConfig } from "../../../lib/openclaw-gateway"

/**
 * POST /api/openclaw/agents/test-environment
 *
 * Test webhook connectivity:
 *  1. Validate URL format (http:// or https://)
 *  2. Send probe request to webhook endpoint
 *  3. Report: "pass" | "warn" | "fail"
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* use defaults */ }

  const { url, webhookAuthHeader, customHeaders, method } = body as {
    url?: string
    webhookAuthHeader?: string
    customHeaders?: Record<string, string>
    method?: string
  }

  const webhookUrl = url || process.env.OPENCLAW_GATEWAY_URL || ""
  const envToken = process.env.OPENCLAW_GATEWAY_TOKEN || ""

  const config: OpenClawConfig = {
    url: webhookUrl,
    webhookAuthHeader: webhookAuthHeader || (envToken ? `Bearer ${envToken}` : undefined),
    customHeaders,
    method,
  }

  const result = await testEnvironment(config)

  return NextResponse.json({
    ok: true,
    data: result,
  })
}
